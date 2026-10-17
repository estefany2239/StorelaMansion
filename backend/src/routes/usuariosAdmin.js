import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { pool } from '../db.js'
import { verificarToken, soloRoles } from '../middlewares/auth.js'

const router = Router()

// Todo este módulo es solo para administradores
router.use(verificarToken, soloRoles('Administrador'))

// Nunca se devuelve la contraseña
const SELECT_FILAS = `
  SELECT u.id_usuario AS id,
         TRIM(u.nombres || ' ' || u.apellidos) AS nombre,
         u.correo, u.telefono, u.direccion,
         r.nombre AS rol,
         CASE WHEN u.estado THEN 'Activo' ELSE 'Inactivo' END AS estado,
         TO_CHAR(u.created_at, 'YYYY-MM-DD') AS fecha
  FROM usuario u
  LEFT JOIN rol r ON r.id_rol = u.id_rol`

const correoValido = (correo) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)

const responderError = (res, error, mensaje) => {
  console.error(mensaje, error.message)
  res.status(500).json({ error: mensaje })
}

const leerId = (req) => {
  const id = Number(req.params.id)
  return Number.isInteger(id) && id > 0 ? id : null
}

// Valida y limpia lo que llega del formulario
// En usuarios nuevos la contraseña es obligatoria; al editar es opcional
const leerCuerpo = (body, { esNuevo }) => {
  const datos = {
    nombre: String(body.nombre || '').trim().replace(/\s+/g, ' '),
    correo: String(body.correo || '').trim().toLowerCase(),
    telefono: String(body.telefono || '').trim() || null,
    direccion: String(body.direccion || '').trim() || null,
    rol: String(body.rol || '').trim(),
    activo: body.estado !== 'Inactivo',
    contrasena: String(body.contrasena || ''),
  }

  let error = null
  if (!datos.nombre) error = 'El nombre es obligatorio'
  else if (datos.nombre.length > 100) error = 'El nombre no puede superar los 100 caracteres'
  else if (!correoValido(datos.correo)) error = 'El correo no es válido'
  else if (datos.telefono && datos.telefono.length > 30) error = 'El teléfono es demasiado largo'
  else if (datos.direccion && datos.direccion.length > 255) error = 'La dirección es demasiado larga'
  else if (!datos.rol) error = 'Selecciona un rol'
  else if (esNuevo && !datos.contrasena) error = 'Ingresa una contraseña para el usuario'
  else if (datos.contrasena && datos.contrasena.length < 8) error = 'La contraseña debe tener al menos 8 caracteres'

  return { datos, error }
}

const separarNombre = (nombre) => {
  const [nombres, ...resto] = nombre.split(' ')
  return { nombres, apellidos: resto.join(' ') }
}

// Evita que alguien se bloquee a sí mismo o que la tienda se quede sin administradores
const validarCambio = async (req, idObjetivo, nuevoRol, nuevoActivo) => {
  const { rows } = await pool.query(
    `SELECT r.nombre AS rol, u.estado
     FROM usuario u LEFT JOIN rol r ON r.id_rol = u.id_rol
     WHERE u.id_usuario = $1`,
    [idObjetivo]
  )
  if (rows.length === 0) return { status: 404, error: 'Usuario no encontrado' }

  const eraAdminActivo = rows[0].rol === 'Administrador' && rows[0].estado
  const seguiraAdminActivo = nuevoRol === 'Administrador' && nuevoActivo

  if (eraAdminActivo && !seguiraAdminActivo) {
    if (idObjetivo === req.usuario.id) {
      return { status: 400, error: 'No puedes quitarte tu propio acceso de administrador' }
    }
    const otros = await pool.query(
      `SELECT COUNT(*)::int AS n
       FROM usuario u JOIN rol r ON r.id_rol = u.id_rol
       WHERE r.nombre = 'Administrador' AND u.estado = TRUE AND u.id_usuario <> $1`,
      [idObjetivo]
    )
    if (otros.rows[0].n === 0) {
      return { status: 400, error: 'Debe quedar al menos un administrador activo' }
    }
  }
  return {}
}

// GET /api/admin/usuarios/roles -> opciones para el select de roles
router.get('/roles', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT nombre, MIN(id_rol) AS orden FROM rol WHERE estado = TRUE GROUP BY nombre ORDER BY orden'
    )
    res.json({ roles: rows.map((f) => f.nombre) })
  } catch (error) {
    responderError(res, error, 'No se pudieron cargar los roles')
  }
})

// GET /api/admin/usuarios -> todos los usuarios (clientes, vendedores y administradores)
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(`${SELECT_FILAS} ORDER BY u.id_usuario`)
    res.json(rows)
  } catch (error) {
    responderError(res, error, 'No se pudieron cargar los usuarios')
  }
})

// POST /api/admin/usuarios -> crea un usuario con el rol elegido
router.post('/', async (req, res) => {
  const { datos, error } = leerCuerpo(req.body, { esNuevo: true })
  if (error) return res.status(400).json({ error })

  try {
    const rol = await pool.query('SELECT MIN(id_rol) AS id FROM rol WHERE nombre = $1', [datos.rol])
    if (!rol.rows[0].id) return res.status(400).json({ error: 'El rol no existe' })

    const existe = await pool.query('SELECT 1 FROM usuario WHERE LOWER(correo) = $1', [datos.correo])
    if (existe.rowCount > 0) {
      return res.status(409).json({ error: 'Este correo ya está registrado' })
    }

    const { nombres, apellidos } = separarNombre(datos.nombre)
    const hash = await bcrypt.hash(datos.contrasena, 10)

    const { rows } = await pool.query(
      `INSERT INTO usuario (nombres, apellidos, correo, contrasena, telefono, direccion, id_rol, estado)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id_usuario`,
      [nombres, apellidos, datos.correo, hash, datos.telefono, datos.direccion, rol.rows[0].id, datos.activo]
    )

    const fila = await pool.query(`${SELECT_FILAS} WHERE u.id_usuario = $1`, [rows[0].id_usuario])
    res.status(201).json(fila.rows[0])
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Este correo ya está registrado' })
    }
    responderError(res, err, 'No se pudo crear el usuario')
  }
})

// PUT /api/admin/usuarios/:id -> actualiza los datos (la contraseña solo cambia si se envía una nueva)
router.put('/:id', async (req, res) => {
  const id = leerId(req)
  if (!id) return res.status(400).json({ error: 'Id inválido' })

  const { datos, error } = leerCuerpo(req.body, { esNuevo: false })
  if (error) return res.status(400).json({ error })

  try {
    const rol = await pool.query('SELECT MIN(id_rol) AS id FROM rol WHERE nombre = $1', [datos.rol])
    if (!rol.rows[0].id) return res.status(400).json({ error: 'El rol no existe' })

    const guardia = await validarCambio(req, id, datos.rol, datos.activo)
    if (guardia.error) return res.status(guardia.status).json({ error: guardia.error })

    const repetido = await pool.query(
      'SELECT 1 FROM usuario WHERE LOWER(correo) = $1 AND id_usuario <> $2',
      [datos.correo, id]
    )
    if (repetido.rowCount > 0) {
      return res.status(409).json({ error: 'Este correo ya está registrado' })
    }

    const { nombres, apellidos } = separarNombre(datos.nombre)
    const hash = datos.contrasena ? await bcrypt.hash(datos.contrasena, 10) : null

    await pool.query(
      `UPDATE usuario
       SET nombres = $1, apellidos = $2, correo = $3, telefono = $4, direccion = $5,
           id_rol = $6, estado = $7, contrasena = COALESCE($8, contrasena)
       WHERE id_usuario = $9`,
      [nombres, apellidos, datos.correo, datos.telefono, datos.direccion, rol.rows[0].id, datos.activo, hash, id]
    )

    const fila = await pool.query(`${SELECT_FILAS} WHERE u.id_usuario = $1`, [id])
    res.json(fila.rows[0])
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Este correo ya está registrado' })
    }
    responderError(res, err, 'No se pudo actualizar el usuario')
  }
})

// PATCH /api/admin/usuarios/:id/estado -> activa o desactiva (body: { estado: 'Activo' | 'Inactivo' })
router.patch('/:id/estado', async (req, res) => {
  const id = leerId(req)
  if (!id) return res.status(400).json({ error: 'Id inválido' })

  const estado = req.body.estado
  if (estado !== 'Activo' && estado !== 'Inactivo') {
    return res.status(400).json({ error: 'El estado no es válido' })
  }

  try {
    const actual = await pool.query(
      'SELECT r.nombre AS rol FROM usuario u LEFT JOIN rol r ON r.id_rol = u.id_rol WHERE u.id_usuario = $1',
      [id]
    )
    if (actual.rowCount === 0) return res.status(404).json({ error: 'Usuario no encontrado' })

    const guardia = await validarCambio(req, id, actual.rows[0].rol, estado === 'Activo')
    if (guardia.error) return res.status(guardia.status).json({ error: guardia.error })

    await pool.query('UPDATE usuario SET estado = $1 WHERE id_usuario = $2', [estado === 'Activo', id])

    const fila = await pool.query(`${SELECT_FILAS} WHERE u.id_usuario = $1`, [id])
    res.json(fila.rows[0])
  } catch (error) {
    responderError(res, error, 'No se pudo cambiar el estado')
  }
})

// DELETE /api/admin/usuarios/:id -> elimina el usuario (si no tiene pedidos)
router.delete('/:id', async (req, res) => {
  const id = leerId(req)
  if (!id) return res.status(400).json({ error: 'Id inválido' })

  try {
    const guardia = await validarCambio(req, id, null, false)
    if (guardia.error) return res.status(guardia.status).json({ error: guardia.error })

    await pool.query('DELETE FROM usuario WHERE id_usuario = $1', [id])
    res.json({ ok: true })
  } catch (err) {
    if (err.code === '23503') {
      return res.status(409).json({
        error: 'No se puede eliminar: este usuario tiene pedidos asociados. Puedes desactivarlo.',
      })
    }
    responderError(res, err, 'No se pudo eliminar el usuario')
  }
})

export default router