import { Router } from 'express'
import { pool } from '../config/db.js'
import { verificarToken, bloquearCambioPendiente, requierePrivilegio } from '../middlewares/auth.js'

const router = Router()

// Todas las rutas exigen token y que no haya un cambio de contraseña pendiente
router.use(verificarToken, bloquearCambioPendiente)

const METODOS = ['Efectivo', 'Transferencia']
const ESTADO_COMPLETADA = 'Completada'
const ESTADO_ANULADA = 'Anulada'

// Error con código HTTP para responder desde los catch.
class ErrorHttp extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

const SELECT_VENTA = `
  SELECT v.id_venta AS id,
         ('V-' || LPAD(v.id_venta::text, 5, '0')) AS codigo,
         v.id_cliente,
         v.nombre_cliente AS cliente,
         COALESCE(
           NULLIF(TRIM(v.nombre_cliente), ''),
           NULLIF(TRIM(uc.nombres || ' ' || uc.apellidos), '')
         ) AS cliente_nombre,
         uc.correo AS cliente_correo,
         COALESCE(d.telefono_destinatario, uc.telefono) AS cliente_telefono,
         CASE
           WHEN d.metodo_envio = 'Recoger en tienda' THEN NULL
           ELSE NULLIF(
             TRIM(CONCAT_WS(', ',
               NULLIF(TRIM(d.direccion_entrega), ''),
               NULLIF(TRIM(d.barrio), ''),
               NULLIF(TRIM(d.municipio), ''),
               NULLIF(TRIM(d.departamento), '')
             )),
             ''
           )
         END AS cliente_direccion,
         d.metodo_envio,
         TO_CHAR(v.fecha, 'YYYY-MM-DD') AS fecha,
         v.metodo_pago,
         v.estado,
         v.total::float8 AS total,
         pe.subtotal::float8 AS subtotal,
         pe.descuento::float8 AS descuento,
         pe.iva::float8 AS iva,
         pe.costo_envio::float8 AS costo_envio,
         v.id_vendedor,
         TRIM(u.nombres || ' ' || u.apellidos) AS vendedor,
         v.origen,
         v.estado_pago,
         TO_CHAR(v.fecha_pago, 'YYYY-MM-DD') AS fecha_pago,
         v.id_pedido,
         v.id_pedido AS numero_pedido,
         ab.monto_abonado,
         GREATEST(v.total - ab.monto_abonado, 0)::float8 AS saldo_pendiente,
         ab.abonos
   FROM venta v
   LEFT JOIN usuario u ON u.id_usuario = v.id_vendedor
   LEFT JOIN pedido pe ON pe.id_pedido = v.id_pedido
   LEFT JOIN usuario uc ON uc.id_usuario = COALESCE(v.id_cliente, pe.id_usuario)
   LEFT JOIN LATERAL (
     SELECT d.direccion_entrega, d.barrio, d.municipio, d.departamento,
            d.metodo_envio, d.telefono_destinatario
       FROM domicilio d
      WHERE d.id_pedido = v.id_pedido
      ORDER BY d.id_domicilio
      LIMIT 1
   ) d ON TRUE
   LEFT JOIN LATERAL (
     SELECT COALESCE(SUM(pa.monto), 0)::float8 AS monto_abonado,
            COALESCE(
              JSON_AGG(
                JSON_BUILD_OBJECT(
                  'id', pa.id_pago,
                  'monto', pa.monto::float8,
                  'metodo', pa.metodo,
                  'fecha', TO_CHAR(pa.fecha, 'YYYY-MM-DD'),
                  'url', pa.url
                )
                ORDER BY pa.id_pago
              ) FILTER (WHERE pa.id_pago IS NOT NULL),
              '[]'::json
            ) AS abonos
       FROM pago pa
      WHERE pa.id_pedido = v.id_pedido
   ) ab ON TRUE
`

const SELECT_DETALLE = `
  SELECT dv.id_venta,
         dv.id_variante,
         p.nombre,
         p.codigo,
         t.nombre AS talla,
         c.nombre AS color,
         dv.cantidad,
         dv.precio_unitario::float8 AS precio_unitario,
         (dv.cantidad * dv.precio_unitario)::float8 AS subtotal
  FROM detalle_venta dv
  JOIN producto_variante pv ON pv.id_variante = dv.id_variante
  JOIN producto p ON p.id_producto = pv.id_producto
  LEFT JOIN talla t ON t.id_talla = pv.id_talla
  LEFT JOIN color c ON c.id_color = pv.id_color
`

// Agrega la lista de productos a cada venta (una sola consulta).
const adjuntarItems = async (ventas) => {
  if (ventas.length === 0) return ventas

  const ids = ventas.map((v) => v.id)
  const { rows } = await pool.query(
    `${SELECT_DETALLE} WHERE dv.id_venta = ANY($1::int[]) ORDER BY dv.id_venta, dv.id_detalle`,
    [ids]
  )

  const porVenta = new Map()
  for (const fila of rows) {
    if (!porVenta.has(fila.id_venta)) porVenta.set(fila.id_venta, [])
    porVenta.get(fila.id_venta).push({
      id_variante: fila.id_variante,
      nombre: fila.nombre,
      codigo: fila.codigo,
      talla: fila.talla,
      color: fila.color,
      cantidad: fila.cantidad,
      precio_unitario: fila.precio_unitario,
      subtotal: fila.subtotal,
    })
  }

  return ventas.map((v) => ({ ...v, productos: porVenta.get(v.id) || [] }))
}

const obtenerVentaPorId = async (id) => {
  const { rows } = await pool.query(`${SELECT_VENTA} WHERE v.id_venta = $1`, [id])
  if (rows.length === 0) return null
  const [venta] = await adjuntarItems(rows)
  return venta
}

const normalizarItems = (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new ErrorHttp(400, 'La venta debe incluir al menos un producto')
  }

  const cantidades = new Map()
  for (const item of items) {
    const idVariante = Number(item?.id_variante)
    const cantidad = Number(item?.cantidad)

    if (!Number.isInteger(idVariante) || idVariante <= 0) {
      throw new ErrorHttp(400, 'Cada item debe tener un id_variante válido')
    }
    if (!Number.isInteger(cantidad) || cantidad <= 0) {
      throw new ErrorHttp(400, 'La cantidad de cada producto debe ser un entero positivo')
    }

    cantidades.set(idVariante, (cantidades.get(idVariante) || 0) + cantidad)
  }

  return cantidades
}

const normalizarFecha = (valor) => {
  if (valor === undefined || valor === null || String(valor).trim() === '') return null

  const fecha = String(valor).trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    throw new ErrorHttp(400, 'La fecha debe tener el formato YYYY-MM-DD')
  }
  return fecha
}

// Entero positivo a partir de un parámetro de ruta o query, o null.
const idPositivo = (valor) => {
  if (valor === undefined || valor === null || String(valor).trim() === '') return null
  const id = Number(String(valor).trim())
  return Number.isInteger(id) && id > 0 ? id : null
}

// Comparación de búsqueda: minúsculas y sin espacios en ambos lados.
const SIN_ESPACIOS_SQL = (columna) =>
  `LOWER(REGEXP_REPLACE(COALESCE(${columna}, ''), '\\s+', '', 'g'))`

// GET /variantes -> variantes activas con stock > 0 (para el formulario de
// venta, sin necesidad de permisos de Productos).
router.get('/variantes', requierePrivilegio('Ventas', 'Crear'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT pv.id_variante, p.nombre, t.nombre AS talla, c.nombre AS color,
              p.precio::float8 AS precio, pv.stock, pv.imagen
       FROM producto_variante pv
       JOIN producto p ON p.id_producto = pv.id_producto
       LEFT JOIN talla t ON t.id_talla = pv.id_talla
       LEFT JOIN color c ON c.id_color = pv.id_color
       WHERE p.estado = TRUE AND pv.stock > 0
       ORDER BY p.nombre, t.nombre, c.nombre`
    )
    res.json(rows)
  } catch (error) {
    console.error('Error en GET /api/ventas/variantes:', error.message)
    res.status(500).json({ error: 'No se pudieron cargar las variantes' })
  }
})

// GET /clientes -> usuarios activos con rol Cliente (para el formulario de
// venta, sin necesidad de permisos de Clientes).
router.get('/clientes', requierePrivilegio('Ventas', 'Crear'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.id_usuario AS id, TRIM(u.nombres || ' ' || u.apellidos) AS nombre
       FROM usuario u
       JOIN rol r ON r.id_rol = u.id_rol
       WHERE r.nombre = 'Cliente' AND u.estado = TRUE
       ORDER BY nombre`
    )
    res.json(rows)
  } catch (error) {
    console.error('Error en GET /api/ventas/clientes:', error.message)
    res.status(500).json({ error: 'No se pudieron cargar los clientes' })
  }
})

// GET / -> lista de ventas (requiere Ventas:Consultar). Quien tenga el
// permiso ve todas las ventas.
router.get('/', requierePrivilegio('Ventas', 'Consultar'), async (req, res) => {
  try {
    const { rows } = await pool.query(`${SELECT_VENTA} ORDER BY v.id_venta DESC`)
    res.json(rows)
  } catch (error) {
    console.error('Error en GET /api/ventas:', error.message)
    res.status(500).json({ error: 'No se pudieron cargar las ventas' })
  }
})

// GET /resumen -> indicadores de ventas (Ventas:Consultar). Declarado ANTES
// de /:id para que Express no lo interprete como un identificador.
router.get('/resumen', requierePrivilegio('Ventas', 'Consultar'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS total_ventas,
              COUNT(*) FILTER (
                WHERE estado <> 'Anulada' AND estado_pago = 'Pagada'
              )::int AS pagadas,
              COUNT(*) FILTER (
                WHERE estado <> 'Anulada' AND estado_pago = 'Pendiente'
              )::int AS pendientes,
              COUNT(*) FILTER (WHERE estado = 'Anulada')::int AS canceladas,
              COALESCE(SUM(total) FILTER (
                WHERE estado <> 'Anulada' AND estado_pago = 'Pagada'
              ), 0)::float8 AS valor_total_pagadas
         FROM venta`
    )
    res.json(rows[0])
  } catch (error) {
    console.error('Error en GET /api/ventas/resumen:', error.message)
    res.status(500).json({ error: 'No se pudo cargar el resumen de ventas' })
  }
})

// ============================================================
// SELECCIÓN DE PRODUCTOS POR PASOS PARA REGISTRAR UNA VENTA
// Todos exigen Ventas:Crear y van ANTES de /:id para que Express
// no interprete "productos" como un id de venta.
// Columnas reales de producto: nombre y codigo (no existe referencia).
// ============================================================

// GET /productos?q= -> productos activos con al menos una variante con stock.
// Busca por nombre o código, sin distinguir mayúsculas ni espacios.
router.get('/productos', requierePrivilegio('Ventas', 'Crear'), async (req, res) => {
  try {
    const texto = String(req.query.q ?? '').trim()
    const patron = texto.replace(/\s+/g, '').toLowerCase()

    if (patron.length < 2) {
      return res.json([])
    }

    const { rows } = await pool.query(
      `SELECT p.id_producto AS id,
              p.id_producto,
              p.nombre,
              p.codigo,
              p.precio::float8 AS precio,
              SUM(pv.stock)::int AS stock_total,
              COUNT(*)::int AS variantes_disponibles
         FROM producto p
         JOIN producto_variante pv
           ON pv.id_producto = p.id_producto AND pv.stock > 0
        WHERE p.estado = TRUE
          AND (
            STRPOS(${SIN_ESPACIOS_SQL('p.nombre')}, $1) > 0
            OR STRPOS(${SIN_ESPACIOS_SQL('p.codigo')}, $1) > 0
          )
        GROUP BY p.id_producto, p.nombre, p.codigo, p.precio
        ORDER BY p.nombre
        LIMIT 15`,
      [patron]
    )

    res.json(rows)
  } catch (error) {
    console.error('Error en GET /api/ventas/productos:', error.message)
    res.status(500).json({ error: 'No se pudieron buscar los productos' })
  }
})

// GET /productos/:id/tallas -> tallas del producto con stock total. Las
// tallas sin existencias se devuelven con disponible=false.
router.get('/productos/:id/tallas', requierePrivilegio('Ventas', 'Crear'), async (req, res) => {
  const idProducto = idPositivo(req.params.id)
  if (idProducto === null) {
    return res.status(400).json({ error: 'El id del producto no es válido' })
  }

  try {
    const { rows } = await pool.query(
      `SELECT t.id_talla AS id,
              t.id_talla,
              COALESCE(t.nombre, 'Sin talla') AS nombre,
              COALESCE(SUM(pv.stock), 0)::int AS stock,
              (COALESCE(SUM(pv.stock), 0) > 0) AS disponible
         FROM producto_variante pv
         JOIN producto p
           ON p.id_producto = pv.id_producto AND p.estado = TRUE
         LEFT JOIN talla t ON t.id_talla = pv.id_talla
        WHERE pv.id_producto = $1
        GROUP BY t.id_talla, t.nombre
        ORDER BY t.nombre NULLS LAST, t.id_talla`,
      [idProducto]
    )

    res.json(rows)
  } catch (error) {
    console.error('Error en GET /api/ventas/productos/:id/tallas:', error.message)
    res.status(500).json({ error: 'No se pudieron cargar las tallas del producto' })
  }
})

// GET /productos/:id/colores?talla=ID -> solo colores con stock > 0 para la
// combinación producto + talla.
router.get('/productos/:id/colores', requierePrivilegio('Ventas', 'Crear'), async (req, res) => {
  const idProducto = idPositivo(req.params.id)
  const idTalla = idPositivo(req.query.talla)

  if (idProducto === null) {
    return res.status(400).json({ error: 'El id del producto no es válido' })
  }
  if (idTalla === null) {
    return res.status(400).json({ error: 'La talla es obligatoria y debe ser válida' })
  }

  try {
    const { rows } = await pool.query(
      `SELECT co.id_color AS id,
              co.id_color,
              co.nombre,
              co.codigo_hex,
              SUM(pv.stock)::int AS stock
         FROM producto_variante pv
         JOIN producto p
           ON p.id_producto = pv.id_producto AND p.estado = TRUE
         JOIN color co ON co.id_color = pv.id_color
        WHERE pv.id_producto = $1
          AND pv.id_talla = $2
          AND pv.stock > 0
        GROUP BY co.id_color, co.nombre, co.codigo_hex
        ORDER BY co.nombre`,
      [idProducto, idTalla]
    )

    res.json(rows)
  } catch (error) {
    console.error('Error en GET /api/ventas/productos/:id/colores:', error.message)
    res.status(500).json({ error: 'No se pudieron cargar los colores del producto' })
  }
})

// GET /productos/:id/variante?talla=ID&color=ID -> variante exacta con su
// stock real, precio e imagen.
router.get('/productos/:id/variante', requierePrivilegio('Ventas', 'Crear'), async (req, res) => {
  const idProducto = idPositivo(req.params.id)
  const idTalla = idPositivo(req.query.talla)
  const idColor = idPositivo(req.query.color)

  if (idProducto === null) {
    return res.status(400).json({ error: 'El id del producto no es válido' })
  }
  if (idTalla === null || idColor === null) {
    return res.status(400).json({ error: 'La talla y el color son obligatorios y deben ser válidos' })
  }

  try {
    const { rows } = await pool.query(
      `SELECT pv.id_variante,
              pv.stock,
              p.precio::float8 AS precio,
              pv.imagen,
              pv.id_producto,
              pv.id_talla,
              pv.id_color
         FROM producto_variante pv
         JOIN producto p
           ON p.id_producto = pv.id_producto AND p.estado = TRUE
        WHERE pv.id_producto = $1
          AND pv.id_talla = $2
          AND pv.id_color = $3
        ORDER BY pv.id_variante
        LIMIT 1`,
      [idProducto, idTalla, idColor]
    )

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Variante no encontrada' })
    }

    res.json(rows[0])
  } catch (error) {
    console.error('Error en GET /api/ventas/productos/:id/variante:', error.message)
    res.status(500).json({ error: 'No se pudo cargar la variante' })
  }
})

// GET /:id -> detalle de una venta con sus productos (Ventas:Consultar)
router.get('/:id', requierePrivilegio('Ventas', 'Consultar'), async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10)
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'Identificador inválido' })
    }

    const venta = await obtenerVentaPorId(id)
    if (!venta) {
      return res.status(404).json({ error: 'Venta no encontrada' })
    }

    res.json(venta)
  } catch (error) {
    console.error('Error en GET /api/ventas/:id:', error.message)
    res.status(500).json({ error: 'No se pudo cargar la venta' })
  }
})

// POST / -> crea una venta en el mostrador (requiere Ventas:Crear). El precio
// lo toma siempre de producto.precio, nunca del body. En UNA transacción:
// valida stock (bloqueando variantes con FOR UPDATE), inserta venta + detalle,
// descuenta stock y calcula el total.
router.post('/', requierePrivilegio('Ventas', 'Crear'), async (req, res) => {
  const client = await pool.connect()

  try {
    const cantidades = normalizarItems(req.body.items)

    const metodo = String(req.body.metodo_pago || '').trim()
    if (!METODOS.includes(metodo)) {
      throw new ErrorHttp(400, 'Método de pago inválido. Usa: Efectivo o Transferencia')
    }

    const fecha = normalizarFecha(req.body.fecha)

    let idCliente = null
    let nombreCliente = String(req.body.nombre_cliente || '').trim()

    if (req.body.id_cliente !== undefined && req.body.id_cliente !== null && String(req.body.id_cliente).trim() !== '') {
      idCliente = Number(req.body.id_cliente)
      if (!Number.isInteger(idCliente) || idCliente <= 0) {
        throw new ErrorHttp(400, 'El id_cliente debe ser un identificador válido')
      }
    }

    const ids = [...cantidades.keys()].sort((a, b) => a - b)

    await client.query('BEGIN')

    // Si el cliente viene de la lista de usuarios, el nombre se toma de la BD.
    if (idCliente !== null) {
      const { rows } = await client.query(
        `SELECT TRIM(u.nombres || ' ' || u.apellidos) AS nombre
         FROM usuario u
         JOIN rol r ON r.id_rol = u.id_rol
         WHERE u.id_usuario = $1 AND r.nombre = 'Cliente' AND u.estado = TRUE`,
        [idCliente]
      )
      if (rows.length === 0) {
        throw new ErrorHttp(400, 'El cliente seleccionado no existe o no está activo')
      }
      nombreCliente = rows[0].nombre
    }

    if (!nombreCliente) {
      throw new ErrorHttp(400, 'El nombre del cliente es obligatorio')
    }

    // Bloquea las variantes para evitar carreras de stock (siempre en orden
    // de id para uniformizar el orden de bloqueo entre transacciones).
    const { rows: variantes } = await client.query(
      `SELECT pv.id_variante, pv.stock, p.precio::float8 AS precio,
              p.estado AS activo, p.nombre
       FROM producto_variante pv
       JOIN producto p ON p.id_producto = pv.id_producto
       WHERE pv.id_variante = ANY($1::int[])
       ORDER BY pv.id_variante
       FOR UPDATE OF pv`,
      [ids]
    )

    const mapa = new Map(variantes.map((v) => [v.id_variante, v]))

    for (const id of ids) {
      const variante = mapa.get(id)
      const cantidad = cantidades.get(id)

      if (!variante) {
        throw new ErrorHttp(400, `La variante ${id} no existe`)
      }
      if (!variante.activo) {
        throw new ErrorHttp(409, `El producto "${variante.nombre}" no está disponible`)
      }
      if (variante.stock < cantidad) {
        throw new ErrorHttp(409, `Stock insuficiente para "${variante.nombre}" (disponible: ${variante.stock})`)
      }
    }

    const total = ids.reduce(
      (acumulado, id) => acumulado + mapa.get(id).precio * cantidades.get(id),
      0
    )

    const { rows: ventaRows } = await client.query(
      `INSERT INTO venta (id_cliente, nombre_cliente, id_vendedor, fecha, metodo_pago,
                          estado, total, origen, estado_pago, fecha_pago)
       VALUES ($1, $2, $3, COALESCE($4::date, CURRENT_DATE), $5, $6, $7,
               'Mostrador', 'Pagada', CURRENT_DATE)
       RETURNING id_venta`,
      [idCliente, nombreCliente, req.usuario.id, fecha, metodo, ESTADO_COMPLETADA, total]
    )
    const idVenta = ventaRows[0].id_venta

    for (const id of ids) {
      const variante = mapa.get(id)
      const cantidad = cantidades.get(id)

      await client.query(
        `INSERT INTO detalle_venta (id_venta, id_variante, cantidad, precio_unitario)
         VALUES ($1, $2, $3, $4)`,
        [idVenta, id, cantidad, variante.precio]
      )

      const actualizado = await client.query(
        `UPDATE producto_variante
         SET stock = stock - $1
         WHERE id_variante = $2 AND stock >= $1`,
        [cantidad, id]
      )
      if (actualizado.rowCount === 0) {
        throw new ErrorHttp(409, `Stock insuficiente para "${variante.nombre}"`)
      }
    }

    await client.query('COMMIT')

    const venta = await obtenerVentaPorId(idVenta)
    res.status(201).json(venta)
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    if (error.status) {
      return res.status(error.status).json({ error: error.message })
    }
    console.error('Error en POST /api/ventas:', error.message)
    res.status(500).json({ error: 'No se pudo registrar la venta' })
  } finally {
    client.release()
  }
})

// PATCH /:id/estado -> solo permite pasar de 'Completada' a 'Anulada'
// (requiere Ventas:Cambiar estado). En la misma transacción devuelve el stock
// de cada línea del detalle.
router.patch('/:id/estado', requierePrivilegio('Ventas', 'Cambiar estado'), async (req, res) => {
  const id = Number.parseInt(req.params.id, 10)
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: 'Identificador inválido' })
  }

  const estado = String(req.body.estado || '').trim()
  if (estado !== ESTADO_ANULADA) {
    return res.status(400).json({ error: `Solo se permite cambiar el estado a '${ESTADO_ANULADA}'` })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const { rows } = await client.query(
      'SELECT id_venta, estado, id_pedido FROM venta WHERE id_venta = $1 FOR UPDATE',
      [id]
    )
    const venta = rows[0]

    if (!venta) {
      await client.query('ROLLBACK')
      return res.status(404).json({ error: 'Venta no encontrada' })
    }
    if (venta.id_pedido !== null) {
      await client.query('ROLLBACK')
      return res.status(409).json({
        error: 'Esta venta pertenece a un pedido; se gestiona cancelando el pedido',
      })
    }
    if (venta.estado === ESTADO_ANULADA) {
      await client.query('ROLLBACK')
      return res.status(409).json({ error: 'La venta ya está anulada' })
    }

    const { rows: detalles } = await client.query(
      'SELECT id_variante, cantidad FROM detalle_venta WHERE id_venta = $1 ORDER BY id_variante',
      [id]
    )

    // La transición se hace con condición: aunque dos peticiones lleguen a la
    // vez, solo la que cambia el estado devuelve stock. La otra afecta 0 filas
    // y se revierte, de modo que el inventario se restaura una sola vez.
    const { rows: anulada } = await client.query(
      `UPDATE venta
       SET estado = $1
       WHERE id_venta = $2 AND estado = $3
       RETURNING id_venta`,
      [ESTADO_ANULADA, id, ESTADO_COMPLETADA]
    )
    if (anulada.length === 0) {
      await client.query('ROLLBACK')
      return res.status(409).json({ error: 'La venta ya no está completada' })
    }

    // Devuelve el stock de cada línea en la misma transacción.
    for (const detalle of detalles) {
      await client.query(
        'UPDATE producto_variante SET stock = stock + $1 WHERE id_variante = $2',
        [detalle.cantidad, detalle.id_variante]
      )
    }

    await client.query('COMMIT')

    const actualizada = await obtenerVentaPorId(id)
    res.json(actualizada)
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    if (error.status) {
      return res.status(error.status).json({ error: error.message })
    }
    console.error('Error en PATCH /api/ventas/:id/estado:', error.message)
    res.status(500).json({ error: 'No se pudo cambiar el estado de la venta' })
  } finally {
    client.release()
  }
})

export default router
