import { Router } from 'express'
import { pool } from '../config/db.js'
import { verificarToken, bloquearCambioPendiente, requierePrivilegio } from '../middlewares/auth.js'

const router = Router()

// Todas las rutas exigen token y que no haya un cambio de contraseña pendiente
router.use(verificarToken, bloquearCambioPendiente)

const METODOS = ['Efectivo', 'Transferencia', 'Crédito']
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
         TO_CHAR(v.fecha, 'YYYY-MM-DD') AS fecha,
         v.metodo_pago,
         v.estado,
         v.total::float8 AS total,
         v.id_vendedor,
         TRIM(u.nombres || ' ' || u.apellidos) AS vendedor,
         v.origen,
         v.estado_pago,
         TO_CHAR(v.fecha_pago, 'YYYY-MM-DD') AS fecha_pago,
         v.id_pedido,
         v.id_pedido AS numero_pedido
   FROM venta v
   LEFT JOIN usuario u ON u.id_usuario = v.id_vendedor
`

const SELECT_DETALLE = `
  SELECT dv.id_venta,
         dv.id_variante,
         p.nombre,
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

// GET /variantes -> variantes activas con stock > 0 (para el formulario de
// venta, sin necesidad de permisos de Productos).
router.get('/variantes', requierePrivilegio('Ventas', 'Crear'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT pv.id_variante, p.nombre, t.nombre AS talla, c.nombre AS color,
              p.precio::float8 AS precio, pv.stock
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
      throw new ErrorHttp(400, 'Método de pago inválido. Usa: Efectivo, Transferencia o Crédito')
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

    // Devuelve el stock de cada línea en la misma transacción.
    const { rows: detalles } = await client.query(
      'SELECT id_variante, cantidad FROM detalle_venta WHERE id_venta = $1 ORDER BY id_variante',
      [id]
    )
    for (const detalle of detalles) {
      await client.query(
        'UPDATE producto_variante SET stock = stock + $1 WHERE id_variante = $2',
        [detalle.cantidad, detalle.id_variante]
      )
    }

    await client.query('UPDATE venta SET estado = $1 WHERE id_venta = $2', [ESTADO_ANULADA, id])
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
