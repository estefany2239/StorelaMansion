import { Router } from 'express'
import bcrypt from 'bcryptjs'
import crypto from 'node:crypto'
import { pool } from '../db.js'
import { verificarToken, soloRoles } from '../middlewares/auth.js'

const router = Router()

router.use(verificarToken, soloRoles('Administrador', 'Vendedor'))

const SELECT_CLIENTE = `
  SELECT u.id_usuario AS id,
         TRIM(u.nombres || ' ' || u.apellidos) AS nombre,
         u.correo, u.telefono, u.direccion,
         CASE WHEN u.estado THEN 'Activo' ELSE 'Inactivo' END AS estado,
         TO_CHAR(u.created_at, 'YYYY-MM-DD') AS fecha,
         (SELECT COUNT(*) FROM pedido p WHERE p.id_usuario = u.id_usuario)::int AS pedidos
  FROM usuario u
  JOIN rol r ON r.id_rol = u.id_rol
`

const correoValido = (correo) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)
const nombreValido = (nombre) =>
  /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(nombre) && nombre.length <= 20
const telefonoValido = (telefono) => /^[0-9]+$/.test(telefono) && telefono.length <= 10

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

  return { nombre, correo, telefono, direccion, errores }
}

const idCliente = (req) => Number.parseInt(req.params.id, 10)

const obtenerClientePorId = async (id) => {
  const { rows } = await pool.query(
    `${SELECT_CLIENTE} WHERE u.id_usuario = $1 AND r.nombre = 'Cliente'`,
    [id]
  )
  return rows[0]
}

// GET / -> lista de clientes
router.get('/', async (req, res) => {
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

// POST / -> crea un cliente
router.post('/', async (req, res) => {
  try {
    const { nombre, correo, telefono, direccion, errores } = validarCliente(req.body)
    if (Object.keys(errores).length > 0) {
      return res.status(400).json({ error: Object.values(errores)[0] })
    }

    const existe = await pool.query(
      'SELECT 1 FROM usuario WHERE LOWER(correo) = $1',
      [correo]
    )
    if (existe.rowCount > 0) {
      return res.status(409).json({ error: 'Ya existe un registro con este correo.' })
    }

    const rol = await pool.query("SELECT MIN(id_rol) AS id FROM rol WHERE nombre = 'Cliente'")
    if (!rol.rows[0].id) {
      throw new Error("Falta el rol 'Cliente' en la tabla rol")
    }

    const [nombres, ...resto] = nombre.split(/\s+/)
    const apellidos = resto.join(' ')
    const contrasenaTemporal = crypto.randomBytes(12).toString('base64url')
    const hash = await bcrypt.hash(contrasenaTemporal, 10)

    const { rows } = await pool.query(
      `INSERT INTO usuario (nombres, apellidos, correo, contrasena, telefono, direccion, id_rol, estado)
       VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)
       RETURNING id_usuario`,
      [nombres, apellidos, correo, hash, telefono, direccion, rol.rows[0].id]
    )

    const cliente = await obtenerClientePorId(rows[0].id_usuario)
    res.status(201).json(cliente)
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Ya existe un registro con este correo.' })
    }
    console.error(error.message)
    res.status(500).json({ error: 'No se pudo crear el cliente' })
  }
})

// PUT /:id -> actualiza nombre, correo, teléfono y dirección
router.put('/:id', async (req, res) => {
  try {
    const id = idCliente(req)
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'Identificador inválido' })
    }

    const existente = await obtenerClientePorId(id)
    if (!existente) {
      return res.status(404).json({ error: 'Cliente no encontrado' })
    }

    const { nombre, correo, telefono, direccion, errores } = validarCliente(req.body)
    if (Object.keys(errores).length > 0) {
      return res.status(400).json({ error: Object.values(errores)[0] })
    }

    const duplicado = await pool.query(
      'SELECT 1 FROM usuario WHERE LOWER(correo) = $1 AND id_usuario <> $2',
      [correo, id]
    )
    if (duplicado.rowCount > 0) {
      return res.status(409).json({ error: 'Ya existe un registro con este correo.' })
    }

    const [nombres, ...resto] = nombre.split(/\s+/)
    const apellidos = resto.join(' ')

    await pool.query(
      `UPDATE usuario
       SET nombres = $1, apellidos = $2, correo = $3, telefono = $4, direccion = $5
       WHERE id_usuario = $6`,
      [nombres, apellidos, correo, telefono, direccion, id]
    )

    const cliente = await obtenerClientePorId(id)
    res.json(cliente)
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Ya existe un registro con este correo.' })
    }
    console.error(error.message)
    res.status(500).json({ error: 'No se pudo actualizar el cliente' })
  }
})

// PATCH /:id/estado -> alterna el estado del cliente
router.patch('/:id/estado', async (req, res) => {
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

// DELETE /:id -> solo Administrador y solo si el cliente está Inactivo y sin pedidos
router.delete('/:id', soloRoles('Administrador'), async (req, res) => {
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
