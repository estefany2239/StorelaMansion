import { Router } from 'express'
import { pool } from '../config/db.js'
import { verificarToken, bloquearCambioPendiente, requierePrivilegio } from '../middlewares/auth.js'

const router = Router()

// Todo el módulo exige contraseña propia; la autorización por permiso va por ruta.
router.use(verificarToken, bloquearCambioPendiente)

// Los roles del sistema son intocables: no se pueden editar,
// desactivar ni eliminar (ni siquiera con una petición directa
// a la API que no venga del interruptor del panel).
const ROLES_PROTEGIDOS = ['Administrador', 'Cliente']

const responderError = (res, error, mensaje) => {
  console.error(mensaje, error.message)
  res.status(500).json({ error: mensaje })
}

const leerId = (req) => {
  const id = Number.parseInt(req.params.id, 10)
  return Number.isInteger(id) && id > 0 ? id : null
}

const leerNombre = (body) => String(body.nombre || '').trim()

const esProtegido = (rol) =>
  Boolean(rol && ROLES_PROTEGIDOS.includes(rol.nombre))

// ¿Existe otro rol con el mismo nombre sin distinguir mayúsculas?
const nombreDuplicado = async (db, nombre, idExcluir = null) => {
  const { rowCount } = await db.query(
    `SELECT 1 FROM rol
      WHERE LOWER(nombre) = LOWER($1)
        AND ($2::int IS NULL OR id_rol <> $2)`,
    [nombre, idExcluir]
  )
  return rowCount > 0
}

const contarUsuarios = async (db, idRol) => {
  const { rows } = await db.query(
    'SELECT COUNT(*)::int AS total FROM usuario WHERE id_rol = $1',
    [idRol]
  )
  return rows[0].total
}

// Valida y normaliza la lista de permisos. Deben existir en la tabla `permiso`,
// por lo que "Cambiar estado" solo pasa si existe (Ventas y Pedidos).
const normalizarPermisos = async (db, valor) => {
  if (!Array.isArray(valor)) {
    return { permisos: [], error: 'Los permisos deben ser una lista' }
  }
  const unicos = [...new Set(valor.map((p) => String(p).trim()).filter(Boolean))]
  if (unicos.length === 0) {
    return { permisos: [], error: null }
  }

  const { rows } = await db.query(
    'SELECT nombre FROM permiso WHERE nombre = ANY($1::text[])',
    [unicos]
  )
  const existentes = new Set(rows.map((r) => r.nombre))
  const inexistentes = unicos.filter((p) => !existentes.has(p))
  if (inexistentes.length > 0) {
    return { permisos: [], error: `Permisos inválidos: ${inexistentes.join(', ')}` }
  }

  return { permisos: unicos, error: null }
}

// Reemplaza TODOS los permisos del rol dentro de una transacción.
const reemplazarPermisos = async (db, idRol, permisos) => {
  await db.query('DELETE FROM rol_permiso WHERE id_rol = $1', [idRol])
  if (permisos.length === 0) return
  await db.query(
    `INSERT INTO rol_permiso (id_rol, id_permiso)
     SELECT $1, p.id_permiso FROM permiso p WHERE p.nombre = ANY($2::text[])`,
    [idRol, permisos]
  )
}

const SELECT_ROL = `
  SELECT r.id_rol AS id, r.nombre,
         CASE WHEN r.estado THEN 'Activo' ELSE 'Inactivo' END AS estado,
         (SELECT COUNT(*)::int FROM usuario u WHERE u.id_rol = r.id_rol) AS usuarios,
         COALESCE(
           (SELECT ARRAY_AGG(p.nombre ORDER BY p.nombre)
              FROM rol_permiso rp
              JOIN permiso p ON p.id_permiso = rp.id_permiso
             WHERE rp.id_rol = r.id_rol),
           '{}'
         ) AS permisos
    FROM rol r`

const obtenerRol = async (db, id) => {
  const { rows } = await db.query(`${SELECT_ROL} WHERE r.id_rol = $1`, [id])
  return rows[0]
}

// GET /api/admin/roles -> lista de roles con sus permisos y cantidad de usuarios
router.get('/', requierePrivilegio('Roles', 'Consultar'), async (req, res) => {
  try {
    const { rows } = await pool.query(`${SELECT_ROL} ORDER BY r.id_rol DESC`)
    res.json(rows)
  } catch (error) {
    responderError(res, error, 'No se pudieron cargar los roles')
  }
})

// GET /api/admin/roles/permisos -> catálogo de módulos y privilegios disponibles
router.get('/permisos', requierePrivilegio('Roles', 'Consultar'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT nombre FROM permiso WHERE estado = TRUE ORDER BY nombre'
    )
    const permisos = rows.map((r) => r.nombre)

    const modulos = {}
    for (const nombre of permisos) {
      const [modulo, privilegio] = nombre.split(':')
      if (!modulo || !privilegio) continue
      if (!modulos[modulo]) modulos[modulo] = []
      modulos[modulo].push(privilegio)
    }

    res.json({
      modulos: Object.entries(modulos).map(([nombre, privilegios]) => ({
        nombre,
        privilegios,
      })),
      permisos,
    })
  } catch (error) {
    responderError(res, error, 'No se pudo cargar el catálogo de permisos')
  }
})

// GET /api/admin/roles/:id -> detalle de un rol
router.get('/:id', requierePrivilegio('Roles', 'Consultar'), async (req, res) => {
  try {
    const id = leerId(req)
    if (!id) return res.status(400).json({ error: 'Id inválido' })

    const rol = await obtenerRol(pool, id)
    if (!rol) return res.status(404).json({ error: 'Rol no encontrado' })
    res.json(rol)
  } catch (error) {
    responderError(res, error, 'No se pudo cargar el rol')
  }
})

// POST /api/admin/roles -> crea un rol con nombre y permisos
router.post('/', requierePrivilegio('Roles', 'Crear'), async (req, res) => {
  const nombre = leerNombre(req.body)
  if (!nombre) return res.status(400).json({ error: 'El nombre es obligatorio' })
  if (nombre.length > 50) {
    return res.status(400).json({ error: 'El nombre no puede superar los 50 caracteres' })
  }

  const db = await pool.connect()
  try {
    await db.query('BEGIN')

    if (await nombreDuplicado(db, nombre)) {
      await db.query('ROLLBACK')
      return res.status(409).json({ error: 'Ya existe un rol con ese nombre' })
    }

    const { permisos, error } = await normalizarPermisos(db, req.body.permisos)
    if (error) {
      await db.query('ROLLBACK')
      return res.status(400).json({ error })
    }

    const { rows } = await db.query(
      'INSERT INTO rol (nombre, estado) VALUES ($1, TRUE) RETURNING id_rol',
      [nombre]
    )
    await reemplazarPermisos(db, rows[0].id_rol, permisos)

    await db.query('COMMIT')
    res.status(201).json(await obtenerRol(pool, rows[0].id_rol))
  } catch (err) {
    await db.query('ROLLBACK').catch(() => {})
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Ya existe un rol con ese nombre' })
    }
    responderError(res, err, 'No se pudo crear el rol')
  } finally {
    db.release()
  }
})

// PUT /api/admin/roles/:id -> actualiza nombre y permisos
router.put('/:id', requierePrivilegio('Roles', 'Actualizar'), async (req, res) => {
  const id = leerId(req)
  if (!id) return res.status(400).json({ error: 'Id inválido' })

  const nombre = leerNombre(req.body)
  if (!nombre) return res.status(400).json({ error: 'El nombre es obligatorio' })
  if (nombre.length > 50) {
    return res.status(400).json({ error: 'El nombre no puede superar los 50 caracteres' })
  }

  const db = await pool.connect()
  try {
    await db.query('BEGIN')

    const { rows } = await db.query('SELECT id_rol, nombre FROM rol WHERE id_rol = $1', [id])
    if (rows.length === 0) {
      await db.query('ROLLBACK')
      return res.status(404).json({ error: 'Rol no encontrado' })
    }
    if (esProtegido(rows[0])) {
      await db.query('ROLLBACK')
      return res.status(403).json({ error: `El rol ${rows[0].nombre} no se puede editar: es un rol del sistema` })
    }

    if (await nombreDuplicado(db, nombre, id)) {
      await db.query('ROLLBACK')
      return res.status(409).json({ error: 'Ya existe un rol con ese nombre' })
    }

    const { permisos, error } = await normalizarPermisos(db, req.body.permisos)
    if (error) {
      await db.query('ROLLBACK')
      return res.status(400).json({ error })
    }

    await db.query('UPDATE rol SET nombre = $1 WHERE id_rol = $2', [nombre, id])
    await reemplazarPermisos(db, id, permisos)

    await db.query('COMMIT')
    res.json(await obtenerRol(pool, id))
  } catch (err) {
    await db.query('ROLLBACK').catch(() => {})
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Ya existe un rol con ese nombre' })
    }
    responderError(res, err, 'No se pudo actualizar el rol')
  } finally {
    db.release()
  }
})

// PATCH /api/admin/roles/:id/estado -> activa o inactiva
router.patch('/:id/estado', requierePrivilegio('Roles', 'Cambiar estado'), async (req, res) => {
  const id = leerId(req)
  if (!id) return res.status(400).json({ error: 'Id inválido' })

  const entrada = req.body.estado
  let activo
  if (entrada === true || entrada === 'Activo') activo = true
  else if (entrada === false || entrada === 'Inactivo') activo = false
  else return res.status(400).json({ error: 'El estado no es válido' })

  const db = await pool.connect()
  try {
    await db.query('BEGIN')

    const { rows } = await db.query('SELECT id_rol, nombre FROM rol WHERE id_rol = $1', [id])
    const rol = rows[0]
    if (!rol) {
      await db.query('ROLLBACK')
      return res.status(404).json({ error: 'Rol no encontrado' })
    }
    if (esProtegido(rol)) {
      await db.query('ROLLBACK')
      return res.status(403).json({ error: `El rol ${rol.nombre} no se puede desactivar: es un rol del sistema` })
    }
    if (!activo) {
      const usuarios = await contarUsuarios(db, id)
      if (usuarios > 0) {
        await db.query('ROLLBACK')
        return res.status(409).json({
          error: 'No se puede desactivar un rol con usuarios asignados.',
        })
      }
    }

    await db.query('UPDATE rol SET estado = $1 WHERE id_rol = $2', [activo, id])
    await db.query('COMMIT')
    res.json(await obtenerRol(pool, id))
  } catch (err) {
    await db.query('ROLLBACK').catch(() => {})
    responderError(res, err, 'No se pudo cambiar el estado del rol')
  } finally {
    db.release()
  }
})

// DELETE /api/admin/roles/:id -> elimina el rol (con sus permisos)
router.delete('/:id', requierePrivilegio('Roles', 'Eliminar'), async (req, res) => {
  const id = leerId(req)
  if (!id) return res.status(400).json({ error: 'Id inválido' })

  const db = await pool.connect()
  try {
    await db.query('BEGIN')

    const { rows } = await db.query('SELECT id_rol, nombre FROM rol WHERE id_rol = $1', [id])
    const rol = rows[0]
    if (!rol) {
      await db.query('ROLLBACK')
      return res.status(404).json({ error: 'Rol no encontrado' })
    }
    if (esProtegido(rol)) {
      await db.query('ROLLBACK')
      return res.status(403).json({ error: `El rol ${rol.nombre} no se puede eliminar: es un rol del sistema` })
    }

    const usuarios = await contarUsuarios(db, id)
    if (usuarios > 0) {
      await db.query('ROLLBACK')
      return res.status(409).json({ error: 'No se puede eliminar un rol con usuarios asignados.' })
    }

    await db.query('DELETE FROM rol_permiso WHERE id_rol = $1', [id])
    await db.query('DELETE FROM rol WHERE id_rol = $1', [id])

    await db.query('COMMIT')
    res.json({ ok: true })
  } catch (err) {
    await db.query('ROLLBACK').catch(() => {})
    if (err.code === '23503') {
      return res.status(409).json({ error: 'No se puede eliminar un rol con usuarios asignados.' })
    }
    responderError(res, err, 'No se pudo eliminar el rol')
  } finally {
    db.release()
  }
})

export default router
