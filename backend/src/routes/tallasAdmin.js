import { Router } from 'express'
import { pool } from '../db.js'
import { verificarToken, bloquearCambioPendiente, requierePrivilegio } from '../middlewares/auth.js'

const router = Router()

// Todo este módulo está protegido; la autorización por permiso se aplica en cada ruta
router.use(verificarToken, bloquearCambioPendiente)

const SELECT_FILA = `
  SELECT t.id_talla AS id, t.nombre,
         CASE WHEN t.estado THEN 'Activo' ELSE 'Inactivo' END AS estado,
         (SELECT COUNT(*) > 0 FROM producto_variante v WHERE v.id_talla = t.id_talla) AS "enUso"
    FROM talla t`

const responderError = (res, error, mensaje) => {
  console.error(mensaje, error.message)
  res.status(500).json({ error: mensaje })
}

// Limpia y valida lo que llega del formulario
const leerCuerpo = (body) => {
  const nombre = String(body.nombre || '').trim()

  let error = null
  if (!nombre) error = 'El nombre es obligatorio'
  else if (nombre.length > 10) error = 'El nombre no puede superar los 10 caracteres'

  return { datos: { nombre }, error }
}

// ¿Existe otra talla con el mismo nombre (sin importar mayúsculas)?
const nombreDuplicado = async (db, nombre, idExcluir = null) => {
  const { rowCount } = await db.query(
    `SELECT 1 FROM talla
      WHERE LOWER(nombre) = LOWER($1)
        AND ($2::int IS NULL OR id_talla <> $2)`,
    [nombre, idExcluir]
  )
  return rowCount > 0
}

const leerId = (req) => {
  const id = Number(req.params.id)
  return Number.isInteger(id) && id > 0 ? id : null
}

const filaPorId = async (db, id) => {
  const { rows } = await db.query(`${SELECT_FILA} WHERE t.id_talla = $1`, [id])
  return rows[0]
}

// GET /api/admin/tallas -> todas (activas e inactivas)
router.get('/', requierePrivilegio('Tallas', 'Consultar'), async (req, res) => {
  try {
    const { rows } = await pool.query(`${SELECT_FILA} ORDER BY t.id_talla`)
    res.json(rows)
  } catch (error) {
    responderError(res, error, 'No se pudieron cargar las tallas')
  }
})

// POST /api/admin/tallas -> crea una talla
router.post('/', requierePrivilegio('Tallas', 'Crear'), async (req, res) => {
  const { datos, error } = leerCuerpo(req.body)
  if (error) return res.status(400).json({ error })

  const db = await pool.connect()
  try {
    await db.query('BEGIN')

    if (await nombreDuplicado(db, datos.nombre)) {
      await db.query('ROLLBACK')
      return res.status(409).json({ error: 'Ya existe una talla con ese nombre' })
    }

    const { rows } = await db.query(
      'INSERT INTO talla (nombre, estado) VALUES ($1, TRUE) RETURNING id_talla',
      [datos.nombre]
    )

    await db.query('COMMIT')
    res.status(201).json(await filaPorId(pool, rows[0].id_talla))
  } catch (err) {
    await db.query('ROLLBACK').catch(() => {})
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Ya existe una talla con ese nombre' })
    }
    responderError(res, err, 'No se pudo crear la talla')
  } finally {
    db.release()
  }
})

// PUT /api/admin/tallas/:id -> edita el nombre
router.put('/:id', requierePrivilegio('Tallas', 'Actualizar'), async (req, res) => {
  const id = leerId(req)
  if (!id) return res.status(400).json({ error: 'Id inválido' })

  const { datos, error } = leerCuerpo(req.body)
  if (error) return res.status(400).json({ error })

  const db = await pool.connect()
  try {
    await db.query('BEGIN')

    const actual = await db.query('SELECT id_talla FROM talla WHERE id_talla = $1', [id])
    if (actual.rowCount === 0) {
      await db.query('ROLLBACK')
      return res.status(404).json({ error: 'Talla no encontrada' })
    }

    if (await nombreDuplicado(db, datos.nombre, id)) {
      await db.query('ROLLBACK')
      return res.status(409).json({ error: 'Ya existe una talla con ese nombre' })
    }

    await db.query('UPDATE talla SET nombre = $1 WHERE id_talla = $2', [datos.nombre, id])

    await db.query('COMMIT')
    res.json(await filaPorId(pool, id))
  } catch (err) {
    await db.query('ROLLBACK').catch(() => {})
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Ya existe una talla con ese nombre' })
    }
    responderError(res, err, 'No se pudo actualizar la talla')
  } finally {
    db.release()
  }
})

// PATCH /api/admin/tallas/:id/estado -> activa o desactiva (body: { estado })
router.patch('/:id/estado', requierePrivilegio('Tallas', 'Actualizar'), async (req, res) => {
  const id = leerId(req)
  if (!id) return res.status(400).json({ error: 'Id inválido' })

  const estado = req.body.estado
  if (estado !== 'Activo' && estado !== 'Inactivo') {
    return res.status(400).json({ error: 'El estado no es válido' })
  }

  try {
    const resultado = await pool.query('UPDATE talla SET estado = $1 WHERE id_talla = $2', [
      estado === 'Activo',
      id,
    ])
    if (resultado.rowCount === 0) {
      return res.status(404).json({ error: 'Talla no encontrada' })
    }
    res.json(await filaPorId(pool, id))
  } catch (error) {
    responderError(res, error, 'No se pudo cambiar el estado')
  }
})

// DELETE /api/admin/tallas/:id -> elimina SOLO si no está en uso
router.delete('/:id', requierePrivilegio('Tallas', 'Eliminar'), async (req, res) => {
  const id = leerId(req)
  if (!id) return res.status(400).json({ error: 'Id inválido' })

  const db = await pool.connect()
  try {
    await db.query('BEGIN')

    const actual = await db.query('SELECT id_talla FROM talla WHERE id_talla = $1', [id])
    if (actual.rowCount === 0) {
      await db.query('ROLLBACK')
      return res.status(404).json({ error: 'Talla no encontrada' })
    }

    const uso = await db.query(
      'SELECT COUNT(*)::int AS total FROM producto_variante WHERE id_talla = $1',
      [id]
    )
    if (uso.rows[0].total > 0) {
      await db.query('ROLLBACK')
      return res.status(409).json({
        error: 'No se puede eliminar: esta talla está en uso por productos existentes. Puedes desactivarla.',
      })
    }

    await db.query('DELETE FROM talla WHERE id_talla = $1', [id])
    await db.query('COMMIT')
    res.json({ ok: true })
  } catch (err) {
    await db.query('ROLLBACK').catch(() => {})
    if (err.code === '23503') {
      return res.status(409).json({
        error: 'No se puede eliminar: esta talla está en uso por productos existentes. Puedes desactivarla.',
      })
    }
    responderError(res, err, 'No se pudo eliminar la talla')
  } finally {
    db.release()
  }
})

export default router
