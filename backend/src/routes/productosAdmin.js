import { Router } from 'express'
import { pool } from '../db.js'
import { verificarToken, soloRoles } from '../middlewares/auth.js'

const router = Router()

// Todo este módulo es solo para administradores
router.use(verificarToken, soloRoles('Administrador'))

// Cada fila del panel es una variante (producto + talla + color)
const SELECT_FILAS = `
  SELECT v.id_variante AS id, p.id_producto, p.nombre,
         c.nombre AS categoria, p.genero,
         t.nombre AS talla, co.nombre AS color,
         p.precio::float8 AS precio, v.stock,
         CASE WHEN p.estado THEN 'Activo' ELSE 'Inactivo' END AS estado,
         v.imagen
  FROM producto_variante v
  JOIN producto p ON p.id_producto = v.id_producto
  LEFT JOIN categoria c ON c.id_categoria = p.id_categoria
  LEFT JOIN talla t ON t.id_talla = v.id_talla
  LEFT JOIN color co ON co.id_color = v.id_color`

const GENEROS = ['hombre', 'mujer', 'unisex']

const responderError = (res, error, mensaje) => {
  console.error(mensaje, error.message)
  res.status(500).json({ error: mensaje })
}

// Busca el id de una categoría, talla o color por su nombre (tabla y columna son fijas, no vienen del usuario)
const idPorNombre = async (db, tabla, columnaId, nombre) => {
  const { rows } = await db.query(
    `SELECT MIN(${columnaId}) AS id FROM ${tabla} WHERE nombre = $1`,
    [nombre]
  )
  return rows[0].id
}

// Valida y limpia lo que llega del formulario
const leerCuerpo = (body) => {
  const datos = {
    nombre: String(body.nombre || '').trim(),
    categoria: String(body.categoria || '').trim(),
    genero: String(body.genero || '').trim().toLowerCase(),
    talla: String(body.talla || '').trim(),
    color: String(body.color || '').trim(),
    precio: Number(body.precio),
    stock: Number(body.stock),
    activo: body.estado !== 'Inactivo',
    imagen: String(body.imagen || '').trim() || null,
  }

  let error = null
  if (!datos.nombre) error = 'El nombre es obligatorio'
  else if (datos.nombre.length > 150) error = 'El nombre no puede superar los 150 caracteres'
  else if (!datos.categoria) error = 'Selecciona una categoría'
  else if (!datos.talla) error = 'Selecciona una talla'
  else if (!datos.color) error = 'Selecciona un color'
  else if (!Number.isFinite(datos.precio) || datos.precio < 0) error = 'El precio no es válido'
  else if (!Number.isInteger(datos.stock) || datos.stock < 0) error = 'El stock no es válido'
  else if (datos.genero && !GENEROS.includes(datos.genero)) error = 'El género no es válido'

  datos.genero = datos.genero || null
  return { datos, error }
}

// Busca los ids de categoría, talla y color; si alguno no existe, devuelve el error
const resolverIds = async (db, datos) => {
  const idCategoria = await idPorNombre(db, 'categoria', 'id_categoria', datos.categoria)
  const idTalla = await idPorNombre(db, 'talla', 'id_talla', datos.talla)
  const idColor = await idPorNombre(db, 'color', 'id_color', datos.color)

  if (!idCategoria) return { error: 'La categoría no existe' }
  if (!idTalla) return { error: 'La talla no existe' }
  if (!idColor) return { error: 'El color no existe' }
  return { idCategoria, idTalla, idColor }
}

const leerId = (req) => {
  const id = Number(req.params.id)
  return Number.isInteger(id) && id > 0 ? id : null
}

// GET /api/admin/productos/catalogos -> opciones para los selects del formulario
router.get('/catalogos', async (req, res) => {
  try {
    const [categorias, tallas, colores] = await Promise.all([
      pool.query('SELECT DISTINCT nombre FROM categoria WHERE estado = TRUE ORDER BY nombre'),
      pool.query('SELECT nombre, MIN(id_talla) AS orden FROM talla WHERE estado = TRUE GROUP BY nombre ORDER BY orden'),
      pool.query('SELECT DISTINCT nombre FROM color WHERE estado = TRUE ORDER BY nombre'),
    ])
    res.json({
      categorias: categorias.rows.map((f) => f.nombre),
      tallas: tallas.rows.map((f) => f.nombre),
      colores: colores.rows.map((f) => f.nombre),
    })
  } catch (error) {
    responderError(res, error, 'No se pudieron cargar las opciones')
  }
})

// GET /api/admin/productos -> todas las variantes (activas e inactivas)
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(`${SELECT_FILAS} ORDER BY v.id_variante`)
    res.json(rows)
  } catch (error) {
    responderError(res, error, 'No se pudieron cargar los productos')
  }
})

// POST /api/admin/productos -> crea el producto y su variante
router.post('/', async (req, res) => {
  const { datos, error } = leerCuerpo(req.body)
  if (error) return res.status(400).json({ error })

  const db = await pool.connect()
  try {
    await db.query('BEGIN')

    const ids = await resolverIds(db, datos)
    if (ids.error) {
      await db.query('ROLLBACK')
      return res.status(400).json({ error: ids.error })
    }

    const producto = await db.query(
      `INSERT INTO producto (nombre, precio, id_categoria, genero, estado)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id_producto`,
      [datos.nombre, datos.precio, ids.idCategoria, datos.genero, datos.activo]
    )
    const variante = await db.query(
      `INSERT INTO producto_variante (id_producto, id_talla, id_color, stock, imagen)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id_variante`,
      [producto.rows[0].id_producto, ids.idTalla, ids.idColor, datos.stock, datos.imagen]
    )

    await db.query('COMMIT')

    const fila = await pool.query(`${SELECT_FILAS} WHERE v.id_variante = $1`, [
      variante.rows[0].id_variante,
    ])
    res.status(201).json(fila.rows[0])
  } catch (err) {
    await db.query('ROLLBACK').catch(() => {})
    responderError(res, err, 'No se pudo crear el producto')
  } finally {
    db.release()
  }
})

// PUT /api/admin/productos/:id -> actualiza el producto y su variante
router.put('/:id', async (req, res) => {
  const id = leerId(req)
  if (!id) return res.status(400).json({ error: 'Id inválido' })

  const { datos, error } = leerCuerpo(req.body)
  if (error) return res.status(400).json({ error })

  const db = await pool.connect()
  try {
    await db.query('BEGIN')

    const actual = await db.query(
      'SELECT id_producto FROM producto_variante WHERE id_variante = $1',
      [id]
    )
    if (actual.rowCount === 0) {
      await db.query('ROLLBACK')
      return res.status(404).json({ error: 'Producto no encontrado' })
    }

    const ids = await resolverIds(db, datos)
    if (ids.error) {
      await db.query('ROLLBACK')
      return res.status(400).json({ error: ids.error })
    }

    await db.query(
      `UPDATE producto
       SET nombre = $1, precio = $2, id_categoria = $3, genero = $4, estado = $5
       WHERE id_producto = $6`,
      [datos.nombre, datos.precio, ids.idCategoria, datos.genero, datos.activo, actual.rows[0].id_producto]
    )
    await db.query(
      `UPDATE producto_variante
       SET id_talla = $1, id_color = $2, stock = $3, imagen = $4
       WHERE id_variante = $5`,
      [ids.idTalla, ids.idColor, datos.stock, datos.imagen, id]
    )

    await db.query('COMMIT')

    const fila = await pool.query(`${SELECT_FILAS} WHERE v.id_variante = $1`, [id])
    res.json(fila.rows[0])
  } catch (err) {
    await db.query('ROLLBACK').catch(() => {})
    responderError(res, err, 'No se pudo actualizar el producto')
  } finally {
    db.release()
  }
})

// PATCH /api/admin/productos/:id/estado -> activa o desactiva (body: { estado: 'Activo' | 'Inactivo' })
router.patch('/:id/estado', async (req, res) => {
  const id = leerId(req)
  if (!id) return res.status(400).json({ error: 'Id inválido' })

  const estado = req.body.estado
  if (estado !== 'Activo' && estado !== 'Inactivo') {
    return res.status(400).json({ error: 'El estado no es válido' })
  }

  try {
    const resultado = await pool.query(
      `UPDATE producto SET estado = $1
       WHERE id_producto = (SELECT id_producto FROM producto_variante WHERE id_variante = $2)`,
      [estado === 'Activo', id]
    )
    if (resultado.rowCount === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' })
    }

    const fila = await pool.query(`${SELECT_FILAS} WHERE v.id_variante = $1`, [id])
    res.json(fila.rows[0])
  } catch (error) {
    responderError(res, error, 'No se pudo cambiar el estado')
  }
})

// DELETE /api/admin/productos/:id -> elimina la variante (y el producto si se queda sin variantes)
router.delete('/:id', async (req, res) => {
  const id = leerId(req)
  if (!id) return res.status(400).json({ error: 'Id inválido' })

  const db = await pool.connect()
  try {
    await db.query('BEGIN')

    const variante = await db.query(
      'DELETE FROM producto_variante WHERE id_variante = $1 RETURNING id_producto',
      [id]
    )
    if (variante.rowCount === 0) {
      await db.query('ROLLBACK')
      return res.status(404).json({ error: 'Producto no encontrado' })
    }

    await db.query(
      `DELETE FROM producto AS p
       WHERE p.id_producto = $1
         AND NOT EXISTS (SELECT 1 FROM producto_variante x WHERE x.id_producto = p.id_producto)`,
      [variante.rows[0].id_producto]
    )

    await db.query('COMMIT')
    res.json({ ok: true })
  } catch (err) {
    await db.query('ROLLBACK').catch(() => {})
    if (err.code === '23503') {
      return res.status(409).json({
        error: 'No se puede eliminar: este producto tiene pedidos asociados. Puedes desactivarlo.',
      })
    }
    responderError(res, err, 'No se pudo eliminar el producto')
  } finally {
    db.release()
  }
})

export default router
