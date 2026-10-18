import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { pool } from '../db.js'
import { verificarToken, bloquearCambioPendiente } from '../middlewares/auth.js'

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

// POST /api/auth/register  -> siempre crea un usuario con rol Cliente
router.post('/register', async (req, res) => {
  try {
    const nombre = String(req.body.nombre || '').trim()
    const correo = String(req.body.correo || '').trim().toLowerCase()
    const contrasena = String(req.body.contrasena || '')

    if (!nombre) {
      return res.status(400).json({ error: 'El nombre es obligatorio' })
    }
    if (!correoValido(correo)) {
      return res.status(400).json({ error: 'El correo no es válido' })
    }
    if (contrasena.length < 8) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' })
    }

    const existe = await pool.query(
      'SELECT 1 FROM usuario WHERE LOWER(correo) = $1',
      [correo]
    )
    if (existe.rowCount > 0) {
      return res.status(409).json({ error: 'Este correo ya está registrado' })
    }

    const rol = await pool.query("SELECT MIN(id_rol) AS id FROM rol WHERE nombre = 'Cliente'")
    if (!rol.rows[0].id) {
      throw new Error("Falta el rol 'Cliente' en la tabla rol")
    }

    const [nombres, ...resto] = nombre.split(/\s+/)
    const apellidos = resto.join(' ')
    const hash = await bcrypt.hash(contrasena, 10)

    const { rows } = await pool.query(
      `INSERT INTO usuario (nombres, apellidos, correo, contrasena, id_rol)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id_usuario`,
      [nombres, apellidos, correo, hash, rol.rows[0].id]
    )

    res.status(201).json({ id: rows[0].id_usuario, mensaje: 'Cuenta creada con éxito' })
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Este correo ya está registrado' })
    }
    console.error('Error en /api/auth/register:', error.message)
    res.status(500).json({ error: 'No se pudo crear la cuenta' })
  }
})

// POST /api/auth/login  -> devuelve un token y los datos del usuario.
// Si la cuenta tiene una contraseña temporal pendiente (invitación), se
// marca con cambioContrasena: el navegador debe mostrar "Establecer nueva
// contraseña" y no dejar pasar al panel hasta que la cambie.
router.post('/login', async (req, res) => {
  try {
    const correo = String(req.body.correo || '').trim().toLowerCase()
    const contrasena = String(req.body.contrasena || '')

    const { rows } = await pool.query(
      `SELECT u.id_usuario, u.nombres, u.apellidos, u.correo, u.contrasena, u.estado,
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
      return res.json({
        token: crearToken(usuario),
        usuario: { ...datosPublicos(usuario), cambioContrasena: true },
      })
    }

    res.json({ token: crearToken(usuario), usuario: datosPublicos(usuario) })
  } catch (error) {
    console.error('Error en /api/auth/login:', error.message)
    res.status(500).json({ error: 'No se pudo iniciar sesión' })
  }
})

// GET /api/auth/perfil -> datos del usuario autenticado. Ruta privada:
// queda bloqueada mientras haya un cambio de contraseña pendiente.
router.get('/perfil', verificarToken, bloquearCambioPendiente, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.id_usuario, u.nombres, u.apellidos, u.correo, r.nombre AS rol
       FROM usuario u
       LEFT JOIN rol r ON r.id_rol = u.id_rol
       WHERE u.id_usuario = $1`,
      [req.usuario.id]
    )
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' })
    }
    res.json(datosPublicos(rows[0]))
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
           contrasena_temporal_vencimiento = NULL
       WHERE id_usuario = $2`,
      [hash, usuario.id_usuario]
    )

    res.json({ mensaje: 'Contraseña actualizada', usuario: datosPublicos(usuario) })
  } catch (error) {
    console.error('Error en /api/auth/cambiar-contrasena:', error.message)
    res.status(500).json({ error: 'No se pudo cambiar la contraseña' })
  }
})

export default router