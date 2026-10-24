import { Router } from 'express'
import { pool } from '../config/db.js'
import { verificarToken, bloquearCambioPendiente, requierePrivilegio } from '../middlewares/auth.js'

const router = Router()

// Todo este módulo está protegido; la autorización por permiso se aplica en cada ruta
router.use(verificarToken, bloquearCambioPendiente)

const SELECT_FILA = `
  SELECT c.id_color AS id, c.nombre, c.codigo_hex,
         CASE WHEN c.estado THEN 'Activo' ELSE 'Inactivo' END AS estado,
         (SELECT COUNT(*) > 0 FROM producto_variante v WHERE v.id_color = c.id_color) AS "enUso"
    FROM color c`

const HEX_VALIDO = /^#[0-9A-Fa-f]{6}$/

const responderError = (res, error, mensaje) => {
  console.error(mensaje, error.message)
  res.status(500).json({ error: mensaje })
}

// Limpia y valida lo que llega del formulario
const leerCuerpo = (body) => {
  const nombre = String(body.nombre || '').trim()
  const codigoHex = String(body.codigo_hex || body.codigoHex || '').trim()

  let error = null
  if (!nombre) error = 'El nombre es obligatorio'
  else if (nombre.length > 30) error = 'El nombre no puede superar los 30 caracteres'
  else if (!codigoHex) error = 'El código hexadecimal es obligatorio'
  else if (!HEX_VALIDO.test(codigoHex)) error = 'El código hexadecimal debe tener el formato #RRGGBB'

  return { datos: { nombre, codigoHex }, error }
}

// ¿Existe otro color con el mismo nombre (sin importar mayúsculas)?
const nombreDuplicado = async (db, nombre, idExcluir = null) => {
  const { rowCount } = await db.query(
    `SELECT 1 FROM color
      WHERE LOWER(nombre) = LOWER($1)
        AND ($2::int IS NULL OR id_color <> $2)`,
    [nombre, idExcluir]
  )
  return rowCount > 0
}

const leerId = (req) => {
  const id = Number(req.params.id)
  return Number.isInteger(id) && id > 0 ? id : null
}

const filaPorId = async (db, id) => {
  const { rows } = await db.query(`${SELECT_FILA} WHERE c.id_color = $1`, [id])
  return rows[0]
}

// GET /api/admin/colores -> todos (activos e inactivos)
router.get('/', requierePrivilegio('Colores', 'Consultar'), async (req, res) => {
  try {
    const { rows } = await pool.query(`${SELECT_FILA} ORDER BY c.id_color`)
    res.json(rows)
  } catch (error) {
    responderError(res, error, 'No se pudieron cargar los colores')
  }
})

// POST /api/admin/colores -> crea un color
router.post('/', requierePrivilegio('Colores', 'Crear'), async (req, res) => {
  const { datos, error } = leerCuerpo(req.body)
  if (error) return res.status(400).json({ error })

  const db = await pool.connect()
  try {
    await db.query('BEGIN')

    if (await nombreDuplicado(db, datos.nombre)) {
      await db.query('ROLLBACK')
      return res.status(409).json({ error: 'Ya existe un color con ese nombre' })
    }

    const { rows } = await db.query(
      'INSERT INTO color (nombre, codigo_hex, estado) VALUES ($1, $2, TRUE) RETURNING id_color',
      [datos.nombre, datos.codigoHex]
    )

    await db.query('COMMIT')
    res.status(201).json(await filaPorId(pool, rows[0].id_color))
  } catch (err) {
    await db.query('ROLLBACK').catch(() => {})
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Ya existe un color con ese nombre' })
    }
    responderError(res, err, 'No se pudo crear el color')
  } finally {
    db.release()
  }
})

// PUT /api/admin/colores/:id -> edita nombre y código hexadecimal
router.put('/:id', requierePrivilegio('Colores', 'Actualizar'), async (req, res) => {
  const id = leerId(req)
  if (!id) return res.status(400).json({ error: 'Id inválido' })

  const { datos, error } = leerCuerpo(req.body)
  if (error) return res.status(400).json({ error })

  const db = await pool.connect()
  try {
    await db.query('BEGIN')

    const actual = await db.query('SELECT id_color FROM color WHERE id_color = $1', [id])
    if (actual.rowCount === 0) {
      await db.query('ROLLBACK')
      return res.status(404).json({ error: 'Color no encontrado' })
    }

    if (await nombreDuplicado(db, datos.nombre, id)) {
      await db.query('ROLLBACK')
      return res.status(409).json({ error: 'Ya existe un color con ese nombre' })
    }

    await db.query('UPDATE color SET nombre = $1, codigo_hex = $2 WHERE id_color = $3', [
      datos.nombre,
      datos.codigoHex,
      id,
    ])

    await db.query('COMMIT')
    res.json(await filaPorId(pool, id))
  } catch (err) {
    await db.query('ROLLBACK').catch(() => {})
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Ya existe un color con ese nombre' })
    }
    responderError(res, err, 'No se pudo actualizar el color')
  } finally {
    db.release()
  }
})

// PATCH /api/admin/colores/:id/estado -> activa o desactiva (body: { estado })
router.patch('/:id/estado', requierePrivilegio('Colores', 'Actualizar'), async (req, res) => {
  const id = leerId(req)
  if (!id) return res.status(400).json({ error: 'Id inválido' })

  const estado = req.body.estado
  if (estado !== 'Activo' && estado !== 'Inactivo') {
    return res.status(400).json({ error: 'El estado no es válido' })
  }

  try {
    const resultado = await pool.query('UPDATE color SET estado = $1 WHERE id_color = $2', [
      estado === 'Activo',
      id,
    ])
    if (resultado.rowCount === 0) {
      return res.status(404).json({ error: 'Color no encontrado' })
    }
    res.json(await filaPorId(pool, id))
  } catch (error) {
    responderError(res, error, 'No se pudo cambiar el estado')
  }
})

// DELETE /api/admin/colores/:id -> elimina SOLO si no está en uso
router.delete('/:id', requierePrivilegio('Colores', 'Eliminar'), async (req, res) => {
  const id = leerId(req)
  if (!id) return res.status(400).json({ error: 'Id inválido' })

  const db = await pool.connect()
  try {
    await db.query('BEGIN')

    const actual = await db.query('SELECT id_color FROM color WHERE id_color = $1', [id])
    if (actual.rowCount === 0) {
      await db.query('ROLLBACK')
      return res.status(404).json({ error: 'Color no encontrado' })
    }

    const uso = await db.query(
      'SELECT COUNT(*)::int AS total FROM producto_variante WHERE id_color = $1',
      [id]
    )
    if (uso.rows[0].total > 0) {
      await db.query('ROLLBACK')
      return res.status(409).json({
        error: 'No se puede eliminar: este color está en uso por productos existentes. Puedes desactivarlo.',
      })
    }

    await db.query('DELETE FROM color WHERE id_color = $1', [id])
    await db.query('COMMIT')
    res.json({ ok: true })
  } catch (err) {
    await db.query('ROLLBACK').catch(() => {})
    if (err.code === '23503') {
      return res.status(409).json({
        error: 'No se puede eliminar: este color está en uso por productos existentes. Puedes desactivarlo.',
      })
    }
    responderError(res, err, 'No se pudo eliminar el color')
  } finally {
    db.release()
  }
})

export default router
