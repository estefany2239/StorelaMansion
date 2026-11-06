import { Router } from 'express'
import { pool } from '../config/db.js'
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

// Nombre tal como se guarda: sin espacios al inicio/final y con los espacios
// internos colapsados a uno solo.
const normalizarNombre = (nombre) => String(nombre || '').trim().replace(/\s+/g, ' ')

// Comparación de nombres: además de mayúsculas/minúsculas y espacios, ignora
// las tildes (la diéresis y la ñ se normalizan a su letra base) para que
// "Camiseta básica" y "camiseta  BASICA " cuenten como el mismo nombre.
const ACENTOS = 'áàäâãçéèëêíìïîñóòöôõúùüûýÿ'
const SIN_ACENTOS = 'aaaaaceeeeiiiinooooouuuuyy'
const NOMBRE_CLAVE_SQL = (expresion) =>
  `translate(lower(regexp_replace(btrim(${expresion}), '\\s+', ' ', 'g')), '${ACENTOS}', '${SIN_ACENTOS}')`

// Busca otro producto con el mismo nombre normalizado. En edición se excluye
// el producto que se está actualizando (idProductoExcluir).
const existeNombreDuplicado = async (db, nombre, idProductoExcluir = null) => {
  const { rows } = await db.query(
    `SELECT 1
       FROM producto
      WHERE ${NOMBRE_CLAVE_SQL('nombre')} = ${NOMBRE_CLAVE_SQL('$1')}
        AND ($2::int IS NULL OR id_producto <> $2)
      LIMIT 1`,
    [nombre, idProductoExcluir]
  )
  return rows.length > 0
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
    nombre: normalizarNombre(body.nombre),
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
    const { rows } = await pool.query(
      `${SELECT_FILAS} ORDER BY p.id_producto DESC, v.id_variante ASC`
    )
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

    // Validación dentro de la transacción para no crear un producto con un
    // nombre que ya existe (comparación normalizada, sin distinguir mayúsculas).
    if (await existeNombreDuplicado(db, datos.nombre)) {
      await db.query('ROLLBACK')
      return res.status(409).json({ error: 'Ya existe un producto con ese nombre' })
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

    // El código se genera en el servidor dentro de la misma transacción:
    // 'PROD-' + id del producto con relleno de 6 dígitos. No se acepta del
    // formulario y en editar no se puede cambiar. Va en dos pasos porque un
    // UPDATE en la misma CTE no ve la fila recién insertada (mismo snapshot).
    const producto = await db.query(
      `INSERT INTO producto (nombre, precio, id_categoria, genero, estado)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id_producto`,
      [datos.nombre, datos.precio, ids.idCategoria, datos.genero, datos.activo]
    )
    const idProducto = producto.rows[0].id_producto
    await db.query(
      `UPDATE producto
          SET codigo = 'PROD-' || LPAD(id_producto::text, 6, '0')
        WHERE id_producto = $1`,
      [idProducto]
    )
    const variante = await db.query(
      `INSERT INTO producto_variante (id_producto, id_talla, id_color, stock, imagen)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id_variante`,
      [idProducto, ids.idTalla, ids.idColor, datos.stock, datos.imagen]
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

    // Se excluye el mismo producto: guardar sin cambiar el nombre es válido.
    if (
         (await nombreCambio(db, actual.rows[0].id_producto, datos.nombre)) &&
         (await existeNombreDuplicado(db, datos.nombre, actual.rows[0].id_producto))
       ) {
      await db.query('ROLLBACK')
      return res.status(409).json({ error: 'Ya existe un producto con ese nombre' })
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
      `SELECT id_producto
         FROM producto_variante
        WHERE id_variante = $1
        FOR UPDATE`,
      [id]
    )
    if (variante.rowCount === 0) {
      await db.query('ROLLBACK')
      return res.status(404).json({ error: 'Producto no encontrado' })
    }

    const usos = await db.query(
      `SELECT 1 FROM detalle_pedido WHERE id_variante = $1
       UNION ALL
       SELECT 1 FROM detalle_venta WHERE id_variante = $1
       LIMIT 1`,
      [id]
    )
    if (usos.rowCount > 0) {
      await db.query('ROLLBACK')
      return res.status(409).json({
        error: 'No se puede eliminar: esta variante tiene pedidos o ventas asociados. Puedes dejarla en stock 0 o desactivar el producto.',
      })
    }

    await db.query('DELETE FROM producto_variante WHERE id_variante = $1', [id])

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

// ─── Producto con varias variantes ───────────────────────────────────────────
// El color es del producto: todas sus variantes comparten el mismo color.
// Body: { nombre, categoria, genero, precio, estado, imagen, color,
//         variantes: [ { talla, stock, id_variante? } ] }
// En categorías con tipo_talla 'ninguna': una sola variante sin talla
// (también se acepta { stock, id_variante? }).
// Se mantiene compatibilidad con el formato anterior de un solo bloque
// colores: [ { color, tallas: [...] } ] / [ { color, stock } ].

const MAX_VARIANTES = 60

// true si el nombre normalizado es distinto al guardado
const nombreCambio = async (db, idProducto, nombre) => {
  const { rows } = await db.query(
    `SELECT ${NOMBRE_CLAVE_SQL('nombre')} <> ${NOMBRE_CLAVE_SQL('$2')} AS cambio
       FROM producto WHERE id_producto = $1`,
    [idProducto, nombre]
  )
  return rows.length === 0 ? true : rows[0].cambio
}

const leerCuerpoCompleto = (body) => {
  const colores = Array.isArray(body.colores) ? body.colores : []
  const filasDirectas = Array.isArray(body.variantes)
    ? body.variantes
    : Array.isArray(body.tallas)
      ? body.tallas
      : null

  // Formato nuevo: color único en el producto. Formato anterior: un solo
  // bloque dentro de colores.
  const color = String(body.color || colores[0]?.color || '').trim()
  let variantes = filasDirectas
  let stockGeneral = body.stock
  let idVarianteGeneral = body.id_variante

  if (!variantes && colores.length > 0) {
    const bloque = colores[0]
    variantes = Array.isArray(bloque?.tallas) ? bloque.tallas : null
    if (stockGeneral === undefined) stockGeneral = bloque?.stock
    if (idVarianteGeneral === undefined) idVarianteGeneral = bloque?.id_variante
  }

  const datos = {
    nombre: normalizarNombre(body.nombre),
    categoria: String(body.categoria || '').trim(),
    genero: String(body.genero || '').trim().toLowerCase() || null,
    precio: Number(body.precio),
    activo: body.estado !== 'Inactivo',
    imagen: String(body.imagen || '').trim() || null,
    color,
    variantes,
    stockGeneral,
    idVarianteGeneral,
  }
  if (!datos.nombre) return { error: 'El nombre es obligatorio' }
  if (datos.nombre.length > 150) return { error: 'El nombre no puede superar los 150 caracteres' }
  if (!datos.categoria) return { error: 'Selecciona una categoría' }
  if (!Number.isFinite(datos.precio) || datos.precio < 0) return { error: 'El precio no es válido' }
  if (datos.genero && !GENEROS.includes(datos.genero)) return { error: 'El género no es válido' }
  if (colores.length > 1) return { error: 'Un producto solo puede tener un color' }
  if (!datos.color) return { error: 'Selecciona un color' }
  return { datos }
}

// Convierte las variantes en una lista plana y las valida contra la categoría
const armarVariantes = async (db, datos, tipoCategoria) => {
  const idColor = await idPorNombre(db, 'color', 'id_color', datos.color)
  if (!idColor) return { error: `El color "${datos.color}" no existe` }

  let filas = datos.variantes
  if (tipoCategoria === 'ninguna') {
    // Sin talla: una sola variante con el stock general, aunque el cliente
    // omita el arreglo de variantes y envíe el stock en la raíz.
    if (!Array.isArray(filas) || filas.length === 0) {
      if (datos.stockGeneral === undefined) {
        return { error: 'Indica el stock general del producto' }
      }
      filas = [{ stock: datos.stockGeneral, id_variante: datos.idVarianteGeneral }]
    }
    if (filas.length !== 1) {
      return { error: 'Esta categoría no lleva talla: debe tener una sola variante con stock general' }
    }
  }

  if (!Array.isArray(filas) || filas.length === 0) {
    return { error: 'Agrega al menos una talla' }
  }

  const variantes = []
  const vistas = new Set()

  for (const fila of filas) {
    if (tipoCategoria === 'ninguna' && String(fila?.talla || '').trim()) {
      return { error: 'Esta categoría no lleva talla: no se debe enviar ninguna' }
    }
    const talla = tipoCategoria === 'ninguna' ? '' : String(fila?.talla || '').trim()
    const errorTalla = validarTallaCategoria(tipoCategoria, talla)
    if (errorTalla) return { error: errorTalla }

    const stock = Number(fila?.stock)
    if (!Number.isInteger(stock) || stock < 0) return { error: 'El stock no es válido' }

    let idTalla = null
    if (talla) {
      idTalla = await idPorNombre(db, 'talla', 'id_talla', talla)
      if (!idTalla) return { error: `La talla "${talla}" no existe` }
    }

    const clave = `${idTalla || 0}-${idColor}`
    if (vistas.has(clave)) return { error: 'Hay combinaciones de talla y color repetidas' }
    vistas.add(clave)

    let idVariante = null
    if (fila?.id_variante !== undefined && fila?.id_variante !== null && fila?.id_variante !== '') {
      idVariante = Number(fila.id_variante)
      if (!Number.isInteger(idVariante) || idVariante <= 0) return { error: 'Id de variante inválido' }
    }
    variantes.push({ idVariante, idTalla, idColor, stock })
  }

  if (variantes.length > MAX_VARIANTES) {
    return { error: `Máximo ${MAX_VARIANTES} variantes por producto` }
  }
  return { variantes }
}

// POST /api/admin/productos/completo -> 1 producto con todas sus variantes
router.post('/completo', requierePrivilegio('Productos', 'Crear'), async (req, res) => {
  const { datos, error } = leerCuerpoCompleto(req.body)
  if (error) return res.status(400).json({ error })

  const db = await pool.connect()
  try {
    await db.query('BEGIN')

    if (await existeNombreDuplicado(db, datos.nombre)) {
      await db.query('ROLLBACK')
      return res.status(409).json({ error: 'Ya existe un producto con ese nombre' })
    }

    const categoria = await categoriaPorNombre(db, datos.categoria)
    if (!categoria) {
      await db.query('ROLLBACK')
      return res.status(400).json({ error: 'La categoría no existe' })
    }

    const errorGenero = await validarGeneroCategoria(db, categoria.id_categoria, datos.genero)
    if (errorGenero) {
      await db.query('ROLLBACK')
      return res.status(400).json({ error: errorGenero })
    }

    const armado = await armarVariantes(db, datos, categoria.tipo_talla)
    if (armado.error) {
      await db.query('ROLLBACK')
      return res.status(400).json({ error: armado.error })
    }

    const producto = await db.query(
      `INSERT INTO producto (nombre, precio, id_categoria, genero, estado)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id_producto`,
      [datos.nombre, datos.precio, categoria.id_categoria, datos.genero, datos.activo]
    )
    const idProducto = producto.rows[0].id_producto
    await db.query(
      `UPDATE producto
          SET codigo = 'PROD-' || LPAD(id_producto::text, 6, '0')
        WHERE id_producto = $1`,
      [idProducto]
    )

    for (const v of armado.variantes) {
      await db.query(
        `INSERT INTO producto_variante (id_producto, id_talla, id_color, stock, imagen)
         VALUES ($1, $2, $3, $4, $5)`,
        [idProducto, v.idTalla, v.idColor, v.stock, datos.imagen]
      )
    }

    await db.query('COMMIT')

    const filas = await pool.query(
      `${SELECT_FILAS} WHERE v.id_producto = $1 ORDER BY v.id_variante`,
      [idProducto]
    )
    res.status(201).json({ id_producto: idProducto, variantes: filas.rows })
  } catch (err) {
    await db.query('ROLLBACK').catch(() => {})
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Hay variantes repetidas en el producto' })
    }
    responderError(res, err, 'No se pudo crear el producto')
  } finally {
    db.release()
  }
})

// GET /api/admin/productos/producto/:idProducto -> producto con todas sus variantes
router.get('/producto/:idProducto', requierePrivilegio('Productos', 'Consultar'), async (req, res) => {
  const idProducto = Number(req.params.idProducto)
  if (!Number.isInteger(idProducto) || idProducto <= 0) {
    return res.status(400).json({ error: 'Id inválido' })
  }

  try {
    const { rows } = await pool.query(
      `${SELECT_FILAS} WHERE p.id_producto = $1 ORDER BY v.id_variante`,
      [idProducto]
    )
    if (rows.length === 0) return res.status(404).json({ error: 'Producto no encontrado' })

    const base = rows[0]
    res.json({
      id_producto: base.id_producto,
      codigo: base.codigo,
      nombre: base.nombre,
      categoria: base.categoria,
      genero: base.genero,
      precio: base.precio,
      estado: base.estado,
      color: (rows.find((r) => r.color) || {}).color || null,
      imagen: (rows.find((r) => r.imagen) || {}).imagen || null,
      variantes: rows.map((r) => ({
        id_variante: r.id,
        talla: r.talla,
        color: r.color,
        stock: r.stock,
        imagen: r.imagen,
      })),
    })
  } catch (error) {
    responderError(res, error, 'No se pudo cargar el producto')
  }
})

// PUT /api/admin/productos/producto/:idProducto/completo -> actualiza el producto
// y las variantes enviadas: edita las existentes y agrega las nuevas. Las
// variantes omitidas se conservan tal como están.
router.put('/producto/:idProducto/completo', requierePrivilegio('Productos', 'Actualizar'), async (req, res) => {
  const idProducto = Number(req.params.idProducto)
  if (!Number.isInteger(idProducto) || idProducto <= 0) {
    return res.status(400).json({ error: 'Id inválido' })
  }

  const { datos, error } = leerCuerpoCompleto(req.body)
  if (error) return res.status(400).json({ error })

  const db = await pool.connect()
  try {
    await db.query('BEGIN')

    const actual = await db.query(
      'SELECT id_producto FROM producto WHERE id_producto = $1 FOR UPDATE',
      [idProducto]
    )
    if (actual.rowCount === 0) {
      await db.query('ROLLBACK')
      return res.status(404).json({ error: 'Producto no encontrado' })
    }

    if (
      (await nombreCambio(db, idProducto, datos.nombre)) &&
      (await existeNombreDuplicado(db, datos.nombre, idProducto))
    ) {
      await db.query('ROLLBACK')
      return res.status(409).json({ error: 'Ya existe un producto con ese nombre' })
    }

    const categoria = await categoriaPorNombre(db, datos.categoria)
    if (!categoria) {
      await db.query('ROLLBACK')
      return res.status(400).json({ error: 'La categoría no existe' })
    }

    const errorGenero = await validarGeneroCategoria(db, categoria.id_categoria, datos.genero)
    if (errorGenero) {
      await db.query('ROLLBACK')
      return res.status(400).json({ error: errorGenero })
    }

    const armado = await armarVariantes(db, datos, categoria.tipo_talla)
    if (armado.error) {
      await db.query('ROLLBACK')
      return res.status(400).json({ error: armado.error })
    }

    await db.query(
      `UPDATE producto
          SET nombre = $1, precio = $2, id_categoria = $3, genero = $4, estado = $5
        WHERE id_producto = $6`,
      [datos.nombre, datos.precio, categoria.id_categoria, datos.genero, datos.activo, idProducto]
    )

    const existentes = await db.query(
      `SELECT id_variante, id_talla, id_color
         FROM producto_variante
        WHERE id_producto = $1
        FOR UPDATE`,
      [idProducto]
    )
    const idsExistentes = new Set(existentes.rows.map((r) => r.id_variante))
    const porCombinacion = new Map(
      existentes.rows.map((r) => [`${r.id_talla || 0}-${r.id_color || 0}`, r.id_variante])
    )
    const reclamadas = new Set()

    // Variantes que traen su id: deben pertenecer a este producto
    for (const v of armado.variantes) {
      if (!v.idVariante) continue
      if (!idsExistentes.has(v.idVariante)) {
        await db.query('ROLLBACK')
        return res.status(400).json({ error: 'Una variante no pertenece a este producto' })
      }
      if (reclamadas.has(v.idVariante)) {
        await db.query('ROLLBACK')
        return res.status(400).json({ error: 'Hay variantes repetidas en la petición' })
      }
      reclamadas.add(v.idVariante)
    }
    // Variantes sin id: si ya existe esa talla y color, se actualiza en vez de duplicar
    for (const v of armado.variantes) {
      if (v.idVariante) continue
      const idExistente = porCombinacion.get(`${v.idTalla || 0}-${v.idColor}`)
      if (idExistente && !reclamadas.has(idExistente)) {
        v.idVariante = idExistente
        reclamadas.add(idExistente)
      }
    }

    // Las variantes que no vienen en el cuerpo no se borran ni se modifican:
    // conservan su talla, color y stock actuales.

    for (const v of armado.variantes) {
      if (v.idVariante) {
        await db.query(
          `UPDATE producto_variante
              SET id_talla = $1, id_color = $2, stock = $3, imagen = $4
            WHERE id_variante = $5 AND id_producto = $6`,
          [v.idTalla, v.idColor, v.stock, datos.imagen, v.idVariante, idProducto]
        )
      } else {
        await db.query(
          `INSERT INTO producto_variante (id_producto, id_talla, id_color, stock, imagen)
           VALUES ($1, $2, $3, $4, $5)`,
          [idProducto, v.idTalla, v.idColor, v.stock, datos.imagen]
        )
      }
    }

    await db.query('COMMIT')

    const filas = await pool.query(
      `${SELECT_FILAS} WHERE v.id_producto = $1 ORDER BY v.id_variante`,
      [idProducto]
    )
    res.json({ id_producto: idProducto, variantes: filas.rows })
  } catch (err) {
    await db.query('ROLLBACK').catch(() => {})
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Hay variantes repetidas en el producto' })
    }
    responderError(res, err, 'No se pudo actualizar el producto')
  } finally {
    db.release()
  }
})
export default router
