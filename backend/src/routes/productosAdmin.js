import { Router } from 'express'
import { pool } from '../db.js'
import { verificarToken, bloquearCambioPendiente, requierePrivilegio } from '../middlewares/auth.js'

const router = Router()

// Todo este módulo está protegido; la autorización por permiso se aplica en cada ruta
router.use(verificarToken, bloquearCambioPendiente)

// Cada fila del panel es una variante (producto + talla + color)
const SELECT_FILAS = `
  SELECT v.id_variante AS id, p.id_producto, p.codigo, p.nombre,
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

const TALLAS_LETRA = ['XS', 'S', 'M', 'L', 'XL', 'XXL']

// Tipo de una talla deducido de su nombre: numérica si es un número
// (por ejemplo 36 o 38.5), de letra si es XS, S, M, L, XL o XXL.
const tipoTalla = (nombre) => {
  const valor = String(nombre || '').trim()
  if (/^\d+(\.\d+)?$/.test(valor)) return 'numerica'
  if (TALLAS_LETRA.includes(valor.toUpperCase())) return 'letra'
  return 'otra'
}

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

// Categoría completa por su nombre (incluye tipo_talla)
const categoriaPorNombre = async (db, nombre) => {
  const { rows } = await db.query(
    `SELECT id_categoria, COALESCE(tipo_talla, '') AS tipo_talla
       FROM categoria WHERE nombre = $1
       ORDER BY id_categoria LIMIT 1`,
    [nombre]
  )
  return rows[0] || null
}

// Valida la talla contra el tipo_talla de la categoría:
//   'numerica' solo tallas numéricas; 'letra' solo XS, S, M, L, XL o XXL;
//   'ninguna' no admite talla (se guarda id_talla NULL).
// Categorías sin tipo definido solo exigen que la talla exista.
const validarTallaCategoria = (tipoCategoria, talla) => {
  const valor = String(talla || '').trim()

  if (tipoCategoria === 'ninguna') {
    return valor
      ? 'Esta categoría no lleva talla: no se debe enviar ninguna'
      : null
  }

  if (!valor) return 'Selecciona una talla'

  if (tipoCategoria === 'numerica' && tipoTalla(valor) !== 'numerica') {
    return `La categoría es de tallas numéricas: "${valor}" no es una talla válida (usa, por ejemplo, 36 o 38.5)`
  }

  if (tipoCategoria === 'letra' && tipoTalla(valor) !== 'letra') {
    return `La categoría es de tallas de letra: "${valor}" no es una talla válida (usa XS, S, M, L, XL o XXL)`
  }

  return null
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
  else if (!datos.color) error = 'Selecciona un color'
  else if (!Number.isFinite(datos.precio) || datos.precio < 0) error = 'El precio no es válido'
  else if (!Number.isInteger(datos.stock) || datos.stock < 0) error = 'El stock no es válido'
  else if (datos.genero && !GENEROS.includes(datos.genero)) error = 'El género no es válido'

  // La talla no se valida aquí: es obligatoria solo si la categoría tiene
  // tipo_talla distinto de 'ninguna' (se resuelve en resolverIds).
  datos.genero = datos.genero || null
  return { datos, error }
}

// Regla de género por categoría: una categoría de un solo género (p. ej.
// Sudaderas o Vestidos) solo admite ese género. "unisex" solo se admite en
// categorías que permiten hombre y mujer. Si no se especifica género se
// permite (compatibilidad con productos antiguos).
const validarGeneroCategoria = async (db, idCategoria, genero) => {
  const generoSolicitado = String(genero || '').trim().toLowerCase()
  if (!generoSolicitado) return null

  const { rows } = await db.query(
    `SELECT nombre, COALESCE(generos, '{}') AS generos
       FROM categoria WHERE id_categoria = $1`,
    [idCategoria]
  )
  const categoria = rows[0]
  if (!categoria) return 'La categoría no existe'

  const permitidos = (categoria.generos || []).map((g) => String(g).toLowerCase())
  const permitido =
    generoSolicitado === 'unisex'
      ? permitidos.includes('hombre') && permitidos.includes('mujer')
      : permitidos.includes(generoSolicitado)

  if (permitido) return null
  return `La categoría ${categoria.nombre} no permite el género "${generoSolicitado}"${
    permitidos.length ? ` (solo ${permitidos.join(' y ')})` : ''
  }.`
}

// Busca los ids de categoría, talla y color; valida la talla contra el
// tipo de la categoría; si algo no existe o no corresponde, devuelve el error.
const resolverIds = async (db, datos) => {
  const categoria = await categoriaPorNombre(db, datos.categoria)
  const idColor = await idPorNombre(db, 'color', 'id_color', datos.color)

  if (!categoria) return { error: 'La categoría no existe' }
  if (!idColor) return { error: 'El color no existe' }

  const errorTalla = validarTallaCategoria(categoria.tipo_talla, datos.talla)
  if (errorTalla) return { error: errorTalla }

  let idTalla = null
  if (datos.talla) {
    idTalla = await idPorNombre(db, 'talla', 'id_talla', datos.talla)
    if (!idTalla) return { error: 'La talla no existe' }
  }

  return { idCategoria: categoria.id_categoria, idTalla, idColor }
}

const leerId = (req) => {
  const id = Number(req.params.id)
  return Number.isInteger(id) && id > 0 ? id : null
}

// GET /api/admin/productos/catalogos -> opciones para los selects del formulario
router.get('/catalogos', requierePrivilegio('Productos', 'Consultar'), async (req, res) => {
  try {
    const [categorias, tallas, colores] = await Promise.all([
      pool.query(
        `SELECT codigo, nombre, COALESCE(generos, '{}') AS generos,
                COALESCE(tipo_talla, '') AS tipo_talla
           FROM categoria WHERE estado = TRUE ORDER BY orden, nombre`
      ),
      pool.query('SELECT nombre, MIN(id_talla) AS orden FROM talla WHERE estado = TRUE GROUP BY nombre ORDER BY orden'),
      pool.query('SELECT DISTINCT nombre FROM color WHERE estado = TRUE ORDER BY nombre'),
    ])
    res.json({
      categorias: categorias.rows.map((f) => ({
        id: f.codigo,
        nombre: f.nombre,
        generos: f.generos,
        tipoTalla: f.tipo_talla || null,
      })),
      // Cada talla lleva su tipo deducido del nombre (numérica o letra)
      // para que el formulario filtre según la categoría elegida.
      tallas: tallas.rows.map((f) => ({ nombre: f.nombre, tipo: tipoTalla(f.nombre) })),
      colores: colores.rows.map((f) => f.nombre),
    })
  } catch (error) {
    responderError(res, error, 'No se pudieron cargar las opciones')
  }
})

// GET /api/admin/productos -> todas las variantes (activas e inactivas)
router.get('/', requierePrivilegio('Productos', 'Consultar'), async (req, res) => {
  try {
    const { rows } = await pool.query(`${SELECT_FILAS} ORDER BY v.id_variante`)
    res.json(rows)
  } catch (error) {
    responderError(res, error, 'No se pudieron cargar los productos')
  }
})

// POST /api/admin/productos -> crea el producto y su variante
router.post('/', requierePrivilegio('Productos', 'Crear'), async (req, res) => {
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

    const errorGenero = await validarGeneroCategoria(db, ids.idCategoria, datos.genero)
    if (errorGenero) {
      await db.query('ROLLBACK')
      return res.status(400).json({ error: errorGenero })
    }

    // El código se genera en el servidor dentro de la misma transacción:
    // 'PROD-' + id del producto con relleno de 6 dígitos. No se acepta del
    // formulario y en editar no se puede cambiar.
    const producto = await db.query(
      `WITH nuevo AS (
         INSERT INTO producto (nombre, precio, id_categoria, genero, estado)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id_producto
       )
       UPDATE producto p
          SET codigo = 'PROD-' || LPAD(p.id_producto::text, 6, '0')
         FROM nuevo
        WHERE p.id_producto = nuevo.id_producto
        RETURNING p.id_producto`,
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
router.put('/:id', requierePrivilegio('Productos', 'Actualizar'), async (req, res) => {
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

    const errorGenero = await validarGeneroCategoria(db, ids.idCategoria, datos.genero)
    if (errorGenero) {
      await db.query('ROLLBACK')
      return res.status(400).json({ error: errorGenero })
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
router.patch('/:id/estado', requierePrivilegio('Productos', 'Cambiar estado'), async (req, res) => {
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
router.delete('/:id', requierePrivilegio('Productos', 'Eliminar'), async (req, res) => {
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
