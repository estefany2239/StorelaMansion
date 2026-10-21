import { Router } from 'express'
import bcrypt from 'bcryptjs'
import crypto from 'node:crypto'
import { pool } from '../db.js'
import { verificarToken, bloquearCambioPendiente, requierePrivilegio } from '../middlewares/auth.js'
import { leerIdentificacion } from '../utils/documentos.js'
import { generarClaveTemporal, enviarInvitacion } from '../services/invitaciones.js'

const router = Router()

router.use(verificarToken, bloquearCambioPendiente)

// accesoWeb: TRUE = la persona conoce/recibió su contraseña (puede entrar);
// FALSE = ficha sin acceso: nadie conoce la contraseña y hay que invitarla.
// invitacionEnviada y cambioContrasenaPendiente permiten verlo en la tabla.
const SELECT_CLIENTE = `
  SELECT u.id_usuario AS id,
         TRIM(u.nombres || ' ' || u.apellidos) AS nombre,
         u.correo, u.telefono, u.direccion,
         u.tipo_documento, u.documento,
         TO_CHAR(u.fecha_nacimiento, 'YYYY-MM-DD') AS fecha_nacimiento,
         CASE WHEN u.estado THEN 'Activo' ELSE 'Inactivo' END AS estado,
         TO_CHAR(u.created_at, 'YYYY-MM-DD') AS fecha,
         (SELECT COUNT(*) FROM pedido p WHERE p.id_usuario = u.id_usuario)::int AS pedidos,
         u.acceso_web AS "accesoWeb",
         u.invitacion_enviada AS "invitacionEnviada",
         u.cambio_contrasena_obligatorio AS "cambioContrasenaPendiente"
  FROM usuario u
  JOIN rol r ON r.id_rol = u.id_rol
`

const correoValido = (correo) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)
const nombreValido = (nombre) =>
  /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(nombre) && nombre.length <= 20
const telefonoValido = (telefono) => /^[0-9]+$/.test(telefono) && telefono.length <= 10

// Mismo correo de otra persona: 409 con un mensaje distinto según lo que ya
// exista. Si es una CUENTA REAL (acceso_web = TRUE) no se crea otro registro
// ni se manda invitación: esa persona entra con su contraseña. Si es una
// ficha sin acceso, se avisa que ya existe el registro.
const responderCorreoRepetido = async (res, correo, idExcluido = null) => {
  const parametros = idExcluido ? [correo, idExcluido] : [correo]
  const { rows } = await pool.query(
    `SELECT acceso_web FROM usuario
     WHERE LOWER(correo) = $1${idExcluido ? ' AND id_usuario <> $2' : ''}`,
    parametros
  )
  if (rows[0]?.acceso_web) {
    return res.status(409).json({
      error: 'Este correo ya tiene una cuenta; el cliente puede entrar con su contraseña',
      codigo: 'CORREO_CUENTA_REAL',
    })
  }
  return res.status(409).json({ error: 'Ya existe un registro con este correo.' })
}

const validarCliente = (body) => {
  const nombre = String(body.nombre || '').trim()
  const correo = String(body.correo || '').trim().toLowerCase()
  const telefono = String(body.telefono || '').trim()
  const direccion = String(body.direccion || '').trim()
  const errores = {}

  if (!nombre) {
    errores.nombre = 'El nombre es obligatorio.'
  } else if (!nombreValido(nombre)) {
    errores.nombre = 'El nombre solo puede contener letras y espacios (máx. 20).'
  }

  if (!correo) {
    errores.correo = 'El correo es obligatorio.'
  } else if (!correoValido(correo)) {
    errores.correo = 'El correo no es válido.'
  }

  if (!telefono) {
    errores.telefono = 'El teléfono es obligatorio.'
  } else if (!telefonoValido(telefono)) {
    errores.telefono = 'El teléfono solo puede contener dígitos (máx. 10).'
  }

  if (!direccion) {
    errores.direccion = 'La dirección es obligatoria.'
  }

  // Tipo de documento, número y fecha de nacimiento (opcionales, pero si
  // llega uno de los del documento debe ir con su par y con formato válido).
  const identificacion = leerIdentificacion(body)

  return {
    nombre,
    correo,
    telefono,
    direccion,
    tipoDocumento: identificacion.tipo,
    documento: identificacion.documento,
    fechaNacimiento: identificacion.fechaNacimiento,
    errores: { ...errores, ...identificacion.errores }
  }
}

const idCliente = (req) => Number.parseInt(req.params.id, 10)

const obtenerClientePorId = async (id) => {
  const { rows } = await pool.query(
    `${SELECT_CLIENTE} WHERE u.id_usuario = $1 AND r.nombre = 'Cliente'`,
    [id]
  )
  return rows[0]
}

router.get('/', requierePrivilegio('Clientes', 'Consultar'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `${SELECT_CLIENTE} WHERE r.nombre = 'Cliente' ORDER BY u.id_usuario`
    )

    res.json(rows)
  } catch (error) {
    console.error(error.message)
    res.status(500).json({ error: 'No se pudieron cargar los clientes' })
  }
})

router.post('/', requierePrivilegio('Clientes', 'Crear'), async (req, res) => {
  const {
    nombre, correo, telefono, direccion,
    tipoDocumento, documento, fechaNacimiento, errores
  } = validarCliente(req.body)
  if (Object.keys(errores).length > 0) {
    return res.status(400).json({ error: Object.values(errores)[0] })
  }

  try {
    const existe = await pool.query(
      'SELECT 1 FROM usuario WHERE LOWER(correo) = $1',
      [correo]
    )
    if (existe.rowCount > 0) {
      return await responderCorreoRepetido(res, correo)
    }

    if (documento) {
      const docExistente = await pool.query(
        'SELECT 1 FROM usuario WHERE documento = $1',
        [documento]
      )
      if (docExistente.rowCount > 0) {
        return res.status(409).json({
          error: 'Ya existe un cliente con este número de documento.',
          codigo: 'DOCUMENTO_DUPLICADO',
        })
      }
    }

    const rol = await pool.query("SELECT MIN(id_rol) AS id FROM rol WHERE nombre = 'Cliente'")
    if (!rol.rows[0].id) {
      throw new Error("Falta el rol 'Cliente' en la tabla rol")
    }

    const [nombres, ...resto] = nombre.split(/\s+/)
    const apellidos = resto.join(' ')

    // "Invitar por correo" (opt-in): solo si el administrador lo pidió. La
    // clave temporal la genera SIEMPRE el backend, vive únicamente en el
    // correo y nunca se recibe en el cuerpo ni se devuelve en la respuesta.
    const invitar = req.body.invitar === true
    let hash
    let vencimiento = null
    let contrasenaTemporal = null

    if (invitar) {
      const generada = await generarClaveTemporal()
      hash = generada.hash
      vencimiento = generada.vencimiento
      contrasenaTemporal = generada.contrasenaTemporal
    } else {
      // Ficha: se guarda un hash que nadie conoce, así el cliente no puede
      // entrar hasta que le mandemos una invitación con clave temporal.
      hash = await bcrypt.hash(crypto.randomBytes(12).toString('base64url'), 10)
    }

    const { rows } = await pool.query(
      `INSERT INTO usuario (nombres, apellidos, correo, contrasena, telefono, direccion,
                            id_rol, estado, tipo_documento, documento, fecha_nacimiento,
                            acceso_web, cambio_contrasena_obligatorio, contrasena_temporal_vencimiento,
                            invitacion_enviada)
       VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, $8, $9, $10, $11, $12, $13, FALSE)
       RETURNING id_usuario`,
      [nombres, apellidos, correo, hash, telefono, direccion, rol.rows[0].id,
       tipoDocumento, documento, fechaNacimiento, invitar, invitar, vencimiento]
    )
    const idCliente = rows[0].id_usuario

    // Invitación por correo (real con Brevo; simulada sin BREVO_API_KEY).
    // Si el envío falla, el cliente YA existe en ficha: el administrador puede
    // reenviar la invitación desde la tabla de clientes más tarde.
    const invitacion = invitar
      ? await enviarInvitacion({
          tipo: 'cliente',
          idUsuario: idCliente,
          para: correo,
          nombre,
          contrasenaTemporal,
          vencimiento,
        })
      : null

    const cliente = await obtenerClientePorId(idCliente)
    res.status(201).json({
      ...cliente,
      ...(invitacion
        ? { invitacionEnviada: invitacion.ok, modoCorreo: invitacion.modo }
        : {}),
    })
  } catch (error) {
    if (error.code === '23505') {
      if (documento) {
        const docExistente = await pool.query(
          'SELECT 1 FROM usuario WHERE documento = $1',
          [documento]
        )
        if (docExistente.rowCount > 0) {
          return res.status(409).json({
            error: 'Ya existe un cliente con este número de documento.',
            codigo: 'DOCUMENTO_DUPLICADO',
          })
        }
      }
      return await responderCorreoRepetido(res, correo)
    }
    console.error(error.message)
    res.status(500).json({ error: 'No se pudo crear el cliente' })
  }
})

router.put('/:id', requierePrivilegio('Clientes', 'Actualizar'), async (req, res) => {
  const id = idCliente(req)
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: 'Identificador inválido' })
  }

  const {
    nombre, correo, telefono, direccion,
    tipoDocumento, documento, fechaNacimiento, errores
  } = validarCliente(req.body)
  if (Object.keys(errores).length > 0) {
    return res.status(400).json({ error: Object.values(errores)[0] })
  }

  try {
    const existente = await obtenerClientePorId(id)
    if (!existente) {
      return res.status(404).json({ error: 'Cliente no encontrado' })
    }

    const duplicado = await pool.query(
      'SELECT 1 FROM usuario WHERE LOWER(correo) = $1 AND id_usuario <> $2',
      [correo, id]
    )
    if (duplicado.rowCount > 0) {
      return await responderCorreoRepetido(res, correo, id)
    }

    if (documento) {
      const docDuplicado = await pool.query(
        'SELECT 1 FROM usuario WHERE documento = $1 AND id_usuario <> $2',
        [documento, id]
      )
      if (docDuplicado.rowCount > 0) {
        return res.status(409).json({
          error: 'Ya existe un cliente con este número de documento.'
        })
      }
    }

    const [nombres, ...resto] = nombre.split(/\s+/)
    const apellidos = resto.join(' ')

    await pool.query(
      `UPDATE usuario
       SET nombres = $1, apellidos = $2, correo = $3, telefono = $4, direccion = $5,
           tipo_documento = $6, documento = $7, fecha_nacimiento = $8
       WHERE id_usuario = $9`,
      [nombres, apellidos, correo, telefono, direccion,
       tipoDocumento, documento, fechaNacimiento, id]
    )

    const cliente = await obtenerClientePorId(id)
    res.json(cliente)
  } catch (error) {
    if (error.code === '23505') {
      if (documento) {
        const docDuplicado = await pool.query(
          'SELECT 1 FROM usuario WHERE documento = $1 AND id_usuario <> $2',
          [documento, id]
        )
        if (docDuplicado.rowCount > 0) {
          return res.status(409).json({
            error: 'Ya existe un cliente con este número de documento.',
            codigo: 'DOCUMENTO_DUPLICADO',
          })
        }
      }
      return await responderCorreoRepetido(res, correo, id)
    }
    console.error(error.message)
    res.status(500).json({ error: 'No se pudo actualizar el cliente' })
  }
})

router.patch('/:id/estado', requierePrivilegio('Clientes', 'Cambiar estado'), async (req, res) => {
  try {
    const id = idCliente(req)
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'Identificador inválido' })
    }

    const existente = await obtenerClientePorId(id)
    if (!existente) {
      return res.status(404).json({ error: 'Cliente no encontrado' })
    }

    await pool.query(
      'UPDATE usuario SET estado = NOT estado WHERE id_usuario = $1',
      [id]
    )

    const cliente = await obtenerClientePorId(id)
    res.json(cliente)
  } catch (error) {
    console.error(error.message)
    res.status(500).json({ error: 'No se pudo cambiar el estado del cliente' })
  }
})

router.delete('/:id', requierePrivilegio('Clientes', 'Eliminar'), async (req, res) => {
  try {
    const id = idCliente(req)
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'Identificador inválido' })
    }

    const cliente = await obtenerClientePorId(id)
    if (!cliente) {
      return res.status(404).json({ error: 'Cliente no encontrado' })
    }

    if (cliente.estado === 'Activo') {
      return res.status(409).json({
        error: 'No se puede eliminar un cliente activo. Primero cambia su estado a Inactivo.'
      })
    }

    const pedidos = await pool.query(
      'SELECT COUNT(*)::int AS total FROM pedido WHERE id_usuario = $1',
      [id]
    )
    if (pedidos.rows[0].total > 0) {
      return res.status(409).json({
        error: 'No se puede eliminar un cliente con pedidos asociados.'
      })
    }

    await pool.query('DELETE FROM usuario WHERE id_usuario = $1', [id])
    res.json({ mensaje: 'Cliente eliminado correctamente' })
  } catch (error) {
    console.error(error.message)
    res.status(500).json({ error: 'No se pudo eliminar el cliente' })
  }
})

export default router
