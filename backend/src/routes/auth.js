import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { pool } from '../config/db.js'
import { verificarToken, bloquearCambioPendiente, obtenerPermisos } from '../middlewares/auth.js'
import {
  limitadorLogin,
  limitadorRegistro,
  limitadorRecuperacionCodigos,
} from '../middlewares/limitadores.js'
import { proteccionRegistro } from '../middlewares/honeypot.js'
import { enviarBienvenidaRegistro } from '../services/invitaciones.js'
import {
  faltaSecretoRecuperacion,
  hmacCodigo,
  compararHmac,
  generarCodigo,
  minutosVigencia,
  intentosMaximos,
  esperaCorreo,
  registrarSolicitudCorreo,
  superadoLimiteIp,
  registrarSolicitudIp,
  enviarCodigoRecuperacion,
} from '../services/recuperacion.js'
import { leerIdentificacion, validarMayoriaEdad } from '../utils/documentos.js'

const router = Router()

const correoValido = (correo) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)

const crearToken = (usuario) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('Falta JWT_SECRET en el archivo .env del backend')
  }
  return jwt.sign(
    { id: usuario.id_usuario, rol: usuario.rol },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  )
}

// Datos del usuario que sí se pueden enviar al navegador (nunca la contraseña)
const datosPublicos = (usuario) => ({
  id: usuario.id_usuario,
  nombre: `${usuario.nombres} ${usuario.apellidos}`.trim(),
  email: usuario.correo,
  rol: usuario.rol,
})

// POST /api/auth/register  -> siempre crea un usuario con rol Cliente.
// En el registro público TODOS los campos son obligatorios (nombre,
// correo, teléfono, contraseña, tipo/número de documento y fecha de
// nacimiento, que además debe cumplir la mayoría de edad). La obligatoriedad
// es solo de este flujo: las columnas de usuario siguen admitiendo nulos
// por los usuarios antiguos.
const telefonoValido = (telefono) => /^[0-9]+$/.test(telefono) && telefono.length <= 10

router.post('/register', limitadorRegistro, proteccionRegistro, async (req, res) => {
  const {
    tipo: tipoDocumento,
    documento,
    fechaNacimiento,
    errores: erroresIdentificacion
  } = leerIdentificacion(req.body)

  // Cada rechazo lleva `campo` (nombre de columna/atributo en
  // snake_case) para que el navegador muestre el mensaje bajo el input
  // correspondiente sin revelar datos de otras cuentas.
  const rechazar = (error, campo) => res.status(400).json({ error, campo })

  try {
    const nombre = String(req.body.nombre || '').trim()
    const correo = String(req.body.correo || '').trim().toLowerCase()
    const contrasena = String(req.body.contrasena || '')
    const telefono = String(req.body.telefono || '').trim()

    if (!nombre) {
      return rechazar('El nombre es obligatorio', 'nombre')
    }
    if (nombre.length > 100) {
      return rechazar('El nombre no puede superar los 100 caracteres', 'nombre')
    }
    if (!correoValido(correo)) {
      return rechazar('El correo no es válido', 'correo')
    }
    if (!telefono) {
      return rechazar('El teléfono es obligatorio.', 'telefono')
    }
    if (!telefonoValido(telefono)) {
      return rechazar('El teléfono solo puede contener dígitos (máx. 10).', 'telefono')
    }
    if (contrasena.length < 8) {
      return rechazar('La contraseña debe tener al menos 8 caracteres', 'contrasena')
    }
    if (Object.keys(erroresIdentificacion).length > 0) {
      const [campo, error] = Object.entries(erroresIdentificacion)[0]
      return rechazar(error, campo)
    }
    if (!tipoDocumento) {
      return rechazar('Debes elegir el tipo de documento.', 'tipo_documento')
    }
    if (!documento) {
      return rechazar('El número de documento es obligatorio.', 'documento')
    }
    if (!fechaNacimiento) {
      return rechazar('La fecha de nacimiento es obligatoria.', 'fecha_nacimiento')
    }

    // Misma regla 18+ que en el formulario: no se puede saltar
    // manipulando la petición.
    const errorEdad = validarMayoriaEdad(fechaNacimiento)
    if (errorEdad) {
      return rechazar(errorEdad, 'fecha_nacimiento')
    }

    const existe = await pool.query(
      'SELECT 1 FROM usuario WHERE LOWER(correo) = $1',
      [correo]
    )
    if (existe.rowCount > 0) {
      return res.status(409).json({
        error:
          'Este correo ya está registrado. Revisa la invitación o pide que te la reenvíen; si ya tienes tu contraseña, inicia sesión.',
        campo: 'correo',
      })
    }

    if (documento) {
      const docExiste = await pool.query(
        'SELECT 1 FROM usuario WHERE documento = $1',
        [documento]
      )
      if (docExiste.rowCount > 0) {
        return res.status(409).json({
          error: 'Este documento ya está registrado',
          campo: 'documento',
        })
      }
    }

    const rol = await pool.query("SELECT MIN(id_rol) AS id FROM rol WHERE nombre = 'Cliente'")
    if (!rol.rows[0].id) {
      throw new Error("Falta el rol 'Cliente' en la tabla rol")
    }

    const [nombres, ...resto] = nombre.split(/\s+/)
    const apellidos = resto.join(' ')
    const hash = await bcrypt.hash(contrasena, 10)

    // Quien se registra por su cuenta sí conoce su contraseña:
    // acceso_web = TRUE (cuenta real, no ficha de panel).
    const { rows } = await pool.query(
      `INSERT INTO usuario (nombres, apellidos, correo, contrasena, telefono, id_rol,
                            tipo_documento, documento, fecha_nacimiento, acceso_web)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE)
       RETURNING id_usuario`,
      [nombres, apellidos, correo, hash, telefono, rol.rows[0].id,
       tipoDocumento, documento, fechaNacimiento]
    )

    // La cuenta ya quedó confirmada en la base. El correo de bienvenida
    // se dispara sin esperar su resultado: si el proveedor falla, la
    // cuenta se conserva y el motivo queda solo en el log del servidor.
    void enviarBienvenidaRegistro({ nombre, para: correo })

    res.status(201).json({ id: rows[0].id_usuario, mensaje: 'Cuenta creada con éxito' })
  } catch (error) {
    if (error.code === '23505') {
      if (documento) {
        const docExiste = await pool.query(
          'SELECT 1 FROM usuario WHERE documento = $1',
          [documento]
        )
        if (docExiste.rowCount > 0) {
          return res.status(409).json({
            error: 'Este documento ya está registrado',
            campo: 'documento',
          })
        }
      }
      return res.status(409).json({
        error:
          'Este correo ya está registrado. Revisa la invitación o pide que te la reenvíen; si ya tienes tu contraseña, inicia sesión.',
        campo: 'correo',
      })
    }
    console.error('Error en /api/auth/register:', error.message)
    res.status(500).json({ error: 'No se pudo crear la cuenta' })
  }
})

// POST /api/auth/login  -> devuelve un token y los datos del usuario.
// Si la cuenta tiene una contraseña temporal pendiente (invitación), se
// marca con cambioContrasena: el navegador debe mostrar "Establecer nueva
// contraseña" y no dejar pasar al panel hasta que la cambie.
router.post('/login', limitadorLogin, async (req, res) => {
  try {
    const correo = String(req.body.correo || '').trim().toLowerCase()
    const contrasena = String(req.body.contrasena || '')

    const { rows } = await pool.query(
      `SELECT u.id_usuario, u.id_rol, u.nombres, u.apellidos, u.correo, u.contrasena, u.estado,
              u.cambio_contrasena_obligatorio, u.contrasena_temporal_vencimiento,
              r.nombre AS rol
       FROM usuario u
       LEFT JOIN rol r ON r.id_rol = u.id_rol
       WHERE LOWER(u.correo) = $1`,
      [correo]
    )
    const usuario = rows[0]

    // Mismo mensaje si el correo no existe o la contraseña está mal
    const coincide = usuario && (await bcrypt.compare(contrasena, usuario.contrasena))
    if (!coincide) {
      return res.status(401).json({ error: 'Correo o contraseña incorrectos' })
    }
    if (!usuario.estado) {
      return res.status(403).json({ error: 'Tu cuenta está inactiva' })
    }

    if (usuario.cambio_contrasena_obligatorio) {
      const vencimiento = usuario.contrasena_temporal_vencimiento
        ? new Date(usuario.contrasena_temporal_vencimiento)
        : null
      if (vencimiento && vencimiento.getTime() < Date.now()) {
        return res.status(403).json({
          error: 'Tu contraseña temporal venció. Pide al administrador que te envíe una nueva invitación.',
        })
      }
      const permisos = await obtenerPermisos(usuario.id_usuario)
      return res.json({
        token: crearToken(usuario),
        usuario: { ...datosPublicos(usuario), cambioContrasena: true, permisos },
      })
    }

    const permisos = await obtenerPermisos(usuario.id_usuario)
    res.json({ token: crearToken(usuario), usuario: { ...datosPublicos(usuario), permisos } })
  } catch (error) {
    console.error('Error en /api/auth/login:', error.message)
    res.status(500).json({ error: 'No se pudo iniciar sesión' })
  }
})

// GET /api/auth/perfil -> datos del usuario autenticado. Ruta privada:
// queda bloqueada mientras haya un cambio de contraseña pendiente.
// Además de los datos de sesión incluye teléfono y documento (con su
// tipo), que usa la tarjeta "Datos personales" de Configuración.
router.get('/perfil', verificarToken, bloquearCambioPendiente, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.id_usuario, u.nombres, u.apellidos, u.correo, u.telefono,
              u.tipo_documento, u.documento, r.nombre AS rol
         FROM usuario u
         LEFT JOIN rol r ON r.id_rol = u.id_rol
        WHERE u.id_usuario = $1`,
      [req.usuario.id]
    )
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' })
    }
    const permisos = await obtenerPermisos(rows[0].id_usuario)
    res.json({
      ...datosPublicos(rows[0]),
      telefono: rows[0].telefono,
      tipoDocumento: rows[0].tipo_documento,
      documento: rows[0].documento,
      permisos,
    })
  } catch (error) {
    console.error('Error en /api/auth/perfil:', error.message)
    res.status(500).json({ error: 'No se pudo cargar el perfil' })
  }
})

// POST /api/auth/cambiar-contrasena -> cualquier usuario autenticado puede
// cambiar su contraseña; con la contraseña temporal se quitan las banderas
// de invitación y queda libre para entrar al panel.
router.post('/cambiar-contrasena', verificarToken, async (req, res) => {
  try {
    const contrasenaActual = String(req.body.contrasenaActual || '')
    const contrasenaNueva = String(req.body.contrasenaNueva || '')

    if (!contrasenaActual) {
      return res.status(400).json({ error: 'Ingresa tu contraseña actual' })
    }
    if (contrasenaNueva.length < 8) {
      return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 8 caracteres' })
    }
    if (contrasenaNueva === contrasenaActual) {
      return res.status(400).json({ error: 'La contraseña nueva debe ser diferente de la actual' })
    }

    const { rows } = await pool.query(
      `SELECT u.id_usuario, u.nombres, u.apellidos, u.correo, u.contrasena, u.estado,
              r.nombre AS rol
       FROM usuario u
       LEFT JOIN rol r ON r.id_rol = u.id_rol
       WHERE u.id_usuario = $1`,
      [req.usuario.id]
    )
    const usuario = rows[0]
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' })
    }

    const coincide = await bcrypt.compare(contrasenaActual, usuario.contrasena)
    if (!coincide) {
      return res.status(401).json({ error: 'La contraseña actual no es correcta' })
    }

    const hash = await bcrypt.hash(contrasenaNueva, 10)
    await pool.query(
      `UPDATE usuario
       SET contrasena = $1, cambio_contrasena_obligatorio = FALSE,
           contrasena_temporal_vencimiento = NULL, acceso_web = TRUE
       WHERE id_usuario = $2`,
      [hash, usuario.id_usuario]
    )

    res.json({ mensaje: 'Contraseña actualizada', usuario: datosPublicos(usuario) })
  } catch (error) {
    console.error('Error en /api/auth/cambiar-contrasena:', error.message)
    res.status(500).json({ error: 'No se pudo cambiar la contraseña' })
  }
})

const mensajeRecuperacionGenerico =
  'Si el correo está registrado, recibirás un código de verificación.'
const mensajeCodigoInvalido = 'El código es incorrecto o ha expirado.'
const mensajeServicioNoDisponible =
  'No se pudo procesar la solicitud. Intenta más tarde.'

const falloRecuperacion = (res) => {
  console.warn(
    'Recuperación de contraseña deshabilitada: falta RECUPERACION_HMAC_SECRETO en el archivo .env del backend'
  )
  return res.status(500).json({ error: mensajeServicioNoDisponible })
}

router.post('/recuperar/solicitar', async (req, res) => {
  try {
    const correo = String(req.body.correo || '').trim().toLowerCase()
    if (!correoValido(correo)) {
      return res.status(400).json({ error: 'El correo no es válido', campo: 'correo' })
    }
    if (faltaSecretoRecuperacion()) {
      return falloRecuperacion(res)
    }

    const ip = req.ip
    if (superadoLimiteIp(ip)) {
      return res
        .status(429)
        .json({ error: 'Demasiadas solicitudes de recuperación. Intenta más tarde.' })
    }
    if (esperaCorreo(correo) > 0) {
      return res
        .status(429)
        .json({ error: 'Espera un momento antes de solicitar otro código.' })
    }

    registrarSolicitudIp(ip)
    registrarSolicitudCorreo(correo)

    const { rows } = await pool.query(
      'SELECT id_usuario, nombres, apellidos FROM usuario WHERE LOWER(correo) = $1 AND estado = TRUE',
      [correo]
    )
    const usuario = rows[0]

    if (usuario) {
      const minutos = minutosVigencia()
      const codigo = generarCodigo()
      const hash = hmacCodigo(codigo)
      const vencimiento = new Date(Date.now() + minutos * 60 * 1000)

      await pool.query(
        'UPDATE recuperacion_contrasena SET usado = TRUE WHERE id_usuario = $1 AND usado = FALSE',
        [usuario.id_usuario]
      )
      await pool.query(
        `INSERT INTO recuperacion_contrasena (id_usuario, codigo_hash, vencimiento)
         VALUES ($1, $2, $3)`,
        [usuario.id_usuario, hash, vencimiento]
      )

      await enviarCodigoRecuperacion({
        nombre: `${usuario.nombres || ''} ${usuario.apellidos || ''}`.trim(),
        para: correo,
        codigo,
        minutos,
      })
    }

    res.json({ mensaje: mensajeRecuperacionGenerico })
  } catch (error) {
    console.error('Error en /api/auth/recuperar/solicitar:', error.message)
    res.status(500).json({ error: mensajeServicioNoDisponible })
  }
})

router.post('/recuperar/verificar', limitadorRecuperacionCodigos, async (req, res) => {
  try {
    const correo = String(req.body.correo || '').trim().toLowerCase()
    const codigo = String(req.body.codigo || '').trim()
    if (!correoValido(correo)) {
      return res.status(400).json({ error: 'El correo no es válido', campo: 'correo' })
    }
    if (!/^\d{6}$/.test(codigo)) {
      return res.status(400).json({ error: 'El código debe tener 6 dígitos', campo: 'codigo' })
    }
    if (faltaSecretoRecuperacion()) {
      return falloRecuperacion(res)
    }

    const hashCalculado = hmacCodigo(codigo)

    const { rows } = await pool.query(
      'SELECT id_usuario FROM usuario WHERE LOWER(correo) = $1 AND estado = TRUE',
      [correo]
    )
    const usuario = rows[0]

    let registro = null
    if (usuario) {
      const resultado = await pool.query(
        `SELECT id_recuperacion, id_usuario, codigo_hash, vencimiento, usado, intentos
           FROM recuperacion_contrasena
          WHERE id_usuario = $1 AND usado = FALSE
          ORDER BY creado_en DESC
          LIMIT 1`,
        [usuario.id_usuario]
      )
      registro = resultado.rows[0] || null
    }

    const coincide = Boolean(registro) && compararHmac(hashCalculado, registro.codigo_hash)

    if (!registro || registro.usado) {
      return res.status(400).json({ error: mensajeCodigoInvalido })
    }

    if (new Date(registro.vencimiento).getTime() < Date.now()) {
      await pool.query('UPDATE recuperacion_contrasena SET usado = TRUE WHERE id_usuario = $1', [
        registro.id_usuario,
      ])
      return res.status(400).json({ error: mensajeCodigoInvalido })
    }

    if (registro.intentos >= intentosMaximos()) {
      await pool.query('UPDATE recuperacion_contrasena SET usado = TRUE WHERE id_recuperacion = $1', [
        registro.id_recuperacion,
      ])
      return res
        .status(400)
        .json({ error: 'Has superado el número de intentos. Solicita un código nuevo.' })
    }

    await pool.query(
      'UPDATE recuperacion_contrasena SET intentos = intentos + 1 WHERE id_recuperacion = $1',
      [registro.id_recuperacion]
    )

    if (!coincide) {
      return res.status(400).json({ error: mensajeCodigoInvalido })
    }

    await pool.query('UPDATE recuperacion_contrasena SET usado = TRUE WHERE id_recuperacion = $1', [
      registro.id_recuperacion,
    ])

    const token = jwt.sign(
      { id: usuario.id_usuario, proposito: 'recuperacion' },
      process.env.JWT_SECRET,
      { expiresIn: '10m' }
    )

    res.json({ token, mensaje: 'Código verificado' })
  } catch (error) {
    console.error('Error en /api/auth/recuperar/verificar:', error.message)
    res.status(500).json({ error: mensajeServicioNoDisponible })
  }
})

router.post('/recuperar/restablecer', limitadorRecuperacionCodigos, async (req, res) => {
  try {
    const token = String(req.body.token || '')
    const contrasena = String(req.body.contrasena || '')
    if (contrasena.length < 8) {
      return res
        .status(400)
        .json({ error: 'La contraseña debe tener al menos 8 caracteres', campo: 'contrasena' })
    }

    let payload = null
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET)
    } catch {
      payload = null
    }
    if (!payload || payload.proposito !== 'recuperacion') {
      return res
        .status(400)
        .json({ error: 'La sesión de recuperación expiró. Solicita un código nuevo.' })
    }

    const hash = await bcrypt.hash(contrasena, 10)
    const resultado = await pool.query(
      `UPDATE usuario
          SET contrasena = $1, cambio_contrasena_obligatorio = FALSE,
              contrasena_temporal_vencimiento = NULL, acceso_web = TRUE
        WHERE id_usuario = $2 AND estado = TRUE`,
      [hash, payload.id]
    )
    if (resultado.rowCount === 0) {
      return res
        .status(400)
        .json({ error: 'La sesión de recuperación expiró. Solicita un código nuevo.' })
    }

    res.json({ mensaje: 'Contraseña actualizada. Ya puedes iniciar sesión.' })
  } catch (error) {
    console.error('Error en /api/auth/recuperar/restablecer:', error.message)
    res.status(500).json({ error: mensajeServicioNoDisponible })
  }
})

export default router