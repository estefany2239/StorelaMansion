import { Router } from 'express'
import { pool } from '../db.js'
import { verificarToken, soloRoles, bloquearCambioPendiente } from '../middlewares/auth.js'

const router = Router()

// Todo este módulo es solo para administradores (mismo middleware que productos)
router.use(verificarToken, bloquearCambioPendiente, soloRoles('Administrador'))

const GENEROS_VALIDOS = ['hombre', 'mujer']

const SELECT_FILA = `
  SELECT c.codigo AS id, c.id_categoria AS "idInterno", c.nombre, c.descripcion,
         COALESCE(c.generos, '{}') AS generos,
         COALESCE(c.imagen, '') AS imagen,
         c.orden, c.created_at AS "creadoEn",
         CASE WHEN c.estado THEN 'Activo' ELSE 'Inactivo' END AS estado,
         (SELECT COUNT(*)::int FROM producto p WHERE p.id_categoria = c.id_categoria) AS productos
    FROM categoria c`

const responderError = (res, error, mensaje) => {
  console.error(mensaje, error.message)
  res.status(500).json({ error: mensaje })
}

// Limpia y valida lo que llega del formulario
const leerCuerpo = (body) => {
  const nombre = String(body.nombre || '').trim()
  const descripcion = String(body.descripcion || '').trim()
  const imagen = String(body.imagen || '').trim()
  const generos = Array.isArray(body.generos)
    ? [...new Set(body.generos.map((g) => String(g).trim().toLowerCase()).filter(Boolean))]
    : []

  let error = null
  if (!nombre) error = 'El nombre es obligatorio'
  else if (nombre.length > 20) error = 'El nombre no puede superar los 20 caracteres'
  else if (descripcion.length > 200) error = 'La descripción no puede superar los 200 caracteres'
  else if (generos.length === 0) error = 'Selecciona al menos un género'
  else if (generos.some((g) => !GENEROS_VALIDOS.includes(g))) error = 'El género no es válido'
  else if (imagen.length > 300) error = 'La imagen no puede superar los 300 caracteres'

  return { datos: { nombre, descripcion, imagen, generos }, error }
}

// Genera un id de texto estable a partir del nombre (solo para categorías nuevas)
const generarCodigo = (nombre) => {
  const base = nombre
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 27)
  return base || 'categoria'
}

// Asegura que el código no choque con uno existente
const codigoDisponible = async (db, base) => {
  let codigo = base
  let n = 1
  while (true) {
    const { rowCount } = await db.query(
      'SELECT 1 FROM categoria WHERE LOWER(codigo) = LOWER($1)',
      [codigo]
    )
    if (rowCount === 0) return codigo
    n += 1
    codigo = `${base.slice(0, 25)}-${n}`
  }
}

// ¿Existe otra categoría con el mismo nombre (sin importar mayúsculas)?
const nombreDuplicado = async (db, nombre, codigoExcluir = null) => {
  const { rowCount } = await db.query(
    `SELECT 1 FROM categoria
      WHERE LOWER(nombre) = LOWER($1)
        AND ($2::text IS NULL OR LOWER(codigo) IS DISTINCT FROM LOWER($2))`,
    [nombre, codigoExcluir]
  )
  return rowCount > 0
}

const leerId = (req) => String(req.params.id || '').trim()

const filaPorCodigo = async (db, codigo) => {
  const { rows } = await db.query(`${SELECT_FILA} WHERE LOWER(c.codigo) = LOWER($1)`, [codigo])
  return rows[0]
}

// GET /api/admin/categorias -> todas (activas e inactivas)
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(`${SELECT_FILA} ORDER BY c.orden, c.nombre`)
    res.json(rows)
  } catch (error) {
    responderError(res, error, 'No se pudieron cargar las categorías')
  }
})

// POST /api/admin/categorias -> crea una categoría
router.post('/', async (req, res) => {
  const { datos, error } = leerCuerpo(req.body)
  if (error) return res.status(400).json({ error })

  const db = await pool.connect()
  try {
    await db.query('BEGIN')

    if (await nombreDuplicado(db, datos.nombre)) {
      await db.query('ROLLBACK')
      return res.status(400).json({ error: 'Ya existe una categoría con ese nombre' })
    }

    const codigo = await codigoDisponible(db, generarCodigo(datos.nombre))
    const { rows } = await db.query(
      `INSERT INTO categoria (codigo, nombre, descripcion, generos, imagen, estado)
       VALUES ($1, $2, $3, $4, $5, TRUE)
       RETURNING id_categoria`,
      [codigo, datos.nombre, datos.descripcion || null, datos.generos, datos.imagen || null]
    )

    await db.query('COMMIT')
    res.status(201).json(await filaPorCodigo(pool, codigo))
  } catch (err) {
    await db.query('ROLLBACK').catch(() => {})
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Ya existe una categoría con ese nombre' })
    }
    responderError(res, err, 'No se pudo crear la categoría')
  } finally {
    db.release()
  }
})

// PUT /api/admin/categorias/:id -> edita nombre, descripción, géneros, imagen y orden
router.put('/:id', async (req, res) => {
  const codigo = leerId(req)
  if (!codigo) return res.status(400).json({ error: 'Id inválido' })

  const { datos, error } = leerCuerpo(req.body)
  if (error) return res.status(400).json({ error })

  const db = await pool.connect()
  try {
    await db.query('BEGIN')

    const actual = await db.query(
      'SELECT id_categoria FROM categoria WHERE LOWER(codigo) = LOWER($1)',
      [codigo]
    )
    if (actual.rowCount === 0) {
      await db.query('ROLLBACK')
      return res.status(404).json({ error: 'Categoría no encontrada' })
    }

    if (await nombreDuplicado(db, datos.nombre, codigo)) {
      await db.query('ROLLBACK')
      return res.status(400).json({ error: 'Ya existe una categoría con ese nombre' })
    }

    const orden = Number.isInteger(Number(req.body.orden)) ? Number(req.body.orden) : null

    await db.query(
      `UPDATE categoria
          SET nombre = $1,
              descripcion = $2,
              generos = $3,
              imagen = $4,
              orden = COALESCE($5, orden)
        WHERE id_categoria = $6`,
      [datos.nombre, datos.descripcion || null, datos.generos, datos.imagen || null, orden, actual.rows[0].id_categoria]
    )

    await db.query('COMMIT')
    res.json(await filaPorCodigo(pool, codigo))
  } catch (err) {
    await db.query('ROLLBACK').catch(() => {})
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Ya existe una categoría con ese nombre' })
    }
    responderError(res, err, 'No se pudo actualizar la categoría')
  } finally {
    db.release()
  }
})

// PATCH /api/admin/categorias/:id/estado -> activa o desactiva (body: { estado })
router.patch('/:id/estado', async (req, res) => {
  const codigo = leerId(req)
  if (!codigo) return res.status(400).json({ error: 'Id inválido' })

  const estado = req.body.estado
  if (estado !== 'Activo' && estado !== 'Inactivo') {
    return res.status(400).json({ error: 'El estado no es válido' })
  }

  try {
    const resultado = await pool.query(
      'UPDATE categoria SET estado = $1 WHERE LOWER(codigo) = LOWER($2)',
      [estado === 'Activo', codigo]
    )
    if (resultado.rowCount === 0) {
      return res.status(404).json({ error: 'Categoría no encontrada' })
    }
    res.json(await filaPorCodigo(pool, codigo))
  } catch (error) {
    responderError(res, error, 'No se pudo cambiar el estado')
  }
})

// DELETE /api/admin/categorias/:id -> elimina SOLO si no tiene productos
router.delete('/:id', async (req, res) => {
  const codigo = leerId(req)
  if (!codigo) return res.status(400).json({ error: 'Id inválido' })

  const db = await pool.connect()
  try {
    await db.query('BEGIN')

    const categoria = await db.query(
      'SELECT id_categoria FROM categoria WHERE LOWER(codigo) = LOWER($1)',
      [codigo]
    )
    if (categoria.rowCount === 0) {
      await db.query('ROLLBACK')
      return res.status(404).json({ error: 'Categoría no encontrada' })
    }

    const idCategoria = categoria.rows[0].id_categoria
    const productos = await db.query(
      'SELECT COUNT(*)::int AS total FROM producto WHERE id_categoria = $1',
      [idCategoria]
    )
    if (productos.rows[0].total > 0) {
      await db.query('ROLLBACK')
      return res.status(409).json({
        error: 'No se puede eliminar: esta categoría tiene productos asociados. Puedes desactivarla.',
      })
    }

    await db.query('DELETE FROM categoria WHERE id_categoria = $1', [idCategoria])
    await db.query('COMMIT')
    res.json({ ok: true })
  } catch (err) {
    await db.query('ROLLBACK').catch(() => {})
    responderError(res, err, 'No se pudo eliminar la categoría')
  } finally {
    db.release()
  }
})

export default router
