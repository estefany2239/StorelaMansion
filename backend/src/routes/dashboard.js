import { Router } from 'express'
import { pool } from '../config/db.js'
import { verificarToken, bloquearCambioPendiente, requierePrivilegio } from '../middlewares/auth.js'

const router = Router()

// Todo el módulo está protegido; la autorización por permiso se aplica en cada ruta
router.use(verificarToken, bloquearCambioPendiente)

// Mismo umbral de "stock bajo" que productosAdmin (STOCK_MINIMO = 3)
const STOCK_MINIMO = 3

const responderError = (res, error, mensaje) => {
  console.error(mensaje, error.message)
  res.status(500).json({ error: mensaje })
}

// Valida un parámetro de fecha en formato YYYY-MM-DD (fecha de calendario real).
// Devuelve null si es válido o un mensaje si no.
const errorFecha = (valor, campo) => {
  if (!valor) return `El parámetro "${campo}" es obligatorio (formato YYYY-MM-DD)`
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    return `El parámetro "${campo}" no tiene un formato válido: usa YYYY-MM-DD`
  }
  const fecha = new Date(`${valor}T00:00:00Z`)
  const [anio, mes, dia] = valor.split('-').map(Number)
  if (
    Number.isNaN(fecha.getTime()) ||
    fecha.getUTCFullYear() !== anio ||
    fecha.getUTCMonth() + 1 !== mes ||
    fecha.getUTCDate() !== dia
  ) {
    return `El parámetro "${campo}" no es una fecha real: usa un día que exista en el calendario`
  }
  return null
}

const ESTADOS_PEDIDO = ['Registrado', 'En preparación', 'Despachado', 'Entregado', 'Cancelado']

// Clasifica el texto libre de venta.metodo_pago en grupos del dashboard.
// El orden importa: 'Contra entrega - Abono 50% - QR' debe caer en
// Contra entrega aunque también mencione métodos electrónicos.
const CLAVE_GRUPO_METODO = `
  CASE
    WHEN LOWER(v.metodo_pago) LIKE '%contra entrega%'
      OR LOWER(v.metodo_pago) LIKE '%contraentrega%'
      OR LOWER(v.metodo_pago) LIKE '%contrapago%'
    THEN 'Contra entrega'
    WHEN LOWER(v.metodo_pago) LIKE '%efectivo%'
    THEN 'Efectivo'
    WHEN LOWER(v.metodo_pago) LIKE '%transferencia%'
      OR LOWER(v.metodo_pago) LIKE '%bancolombia%'
      OR LOWER(v.metodo_pago) LIKE '%daviplata%'
      OR LOWER(v.metodo_pago) LIKE '%nequi%'
      OR LOWER(v.metodo_pago) LIKE '%qr%'
    THEN 'Transferencia'
    ELSE 'Otros'
  END`

// GET /api/admin/dashboard?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
// Por defecto: mes actual (del 1 al último día del mes en curso).
// Requiere el permiso Dashboard:Consultar.
router.get('/', requierePrivilegio('Dashboard', 'Consultar'), async (req, res) => {
  const hoy = new Date()
  const primerDia = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), 1))
    .toISOString()
    .slice(0, 10)
  const ultimoDia = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth() + 1, 0))
    .toISOString()
    .slice(0, 10)

  const desde = String(req.query.desde || '').trim() || primerDia
  const hasta = String(req.query.hasta || '').trim() || ultimoDia

  const errorDesde = errorFecha(desde, 'desde')
  if (errorDesde) return res.status(400).json({ error: errorDesde })
  const errorHasta = errorFecha(hasta, 'hasta')
  if (errorHasta) return res.status(400).json({ error: errorHasta })
  if (desde > hasta) {
    return res
      .status(400)
      .json({ error: 'La fecha "desde" no puede ser posterior a la fecha "hasta"' })
  }

  try {
    const [ingresos, porDia, estados, abonos, domicilios, topProductos, inventario, metodos, clientes] =
      await Promise.all([
        // 1) Ingresos del rango y cantidad de ventas pagadas: SOLO ventas
        //    'Completada' con estado_pago 'Pagada'.
        pool.query(
          `SELECT COALESCE(SUM(v.total), 0)::float8 AS total,
                  COUNT(*)::int AS cantidad
             FROM venta v
            WHERE v.estado = 'Completada'
              AND v.estado_pago = 'Pagada'
              AND v.fecha >= $1::date
              AND v.fecha < ($2::date + INTERVAL '1 day')`,
          [desde, hasta]
        ),

        // 2) Ventas por día del rango: solo PAGADAS y NO anuladas
        //    (serie completa con días en cero).
        pool.query(
          `WITH dias AS (
             SELECT GENERATE_SERIES($1::date, $2::date, INTERVAL '1 day')::date AS dia
           ),
           ventas AS (
             SELECT v.fecha::date AS dia,
                    COUNT(*)::int AS cantidad,
                    COALESCE(SUM(v.total), 0)::float8 AS total
               FROM venta v
              WHERE v.estado <> 'Anulada'
                AND v.estado_pago = 'Pagada'
                AND v.fecha >= $1::date
                AND v.fecha < ($2::date + INTERVAL '1 day')
              GROUP BY v.fecha::date
           )
           SELECT TO_CHAR(d.dia, 'YYYY-MM-DD') AS fecha,
                  COALESCE(a.cantidad, 0)::int AS cantidad,
                  COALESCE(a.total, 0)::float8 AS total
             FROM dias d
             LEFT JOIN ventas a ON a.dia = d.dia
            ORDER BY d.dia`,
          [desde, hasta]
        ),

        // 3) Pedidos por estado dentro del rango (todas las categorías
        //    presentes aunque queden en cero) y total de pedidos.
        pool.query(
          `WITH conteo AS (
             SELECT p.estado, COUNT(*)::int AS cantidad
               FROM pedido p
              WHERE p.fecha >= $1::date
                AND p.fecha < ($2::date + INTERVAL '1 day')
              GROUP BY p.estado
           ), estados AS (
             SELECT UNNEST($3::text[]) AS estado
           )
           SELECT e.estado,
                  COALESCE(c.cantidad, 0)::int AS cantidad
             FROM estados e
             LEFT JOIN conteo c ON c.estado = e.estado`,
          [desde, hasta, ESTADOS_PEDIDO]
        ),

        // 4) Saldo pendiente de abonos desde la vista pedido_abonos:
        //    contra entrega no cancelados (igual que el panel de abonos).
        pool.query(
          `SELECT COALESCE(SUM(a.saldo_pendiente) FILTER (WHERE a.saldo_pendiente > 0), 0)::float8 AS total_saldo_pendiente,
                  COUNT(*) FILTER (WHERE a.saldo_pendiente > 0)::int AS pedidos_con_saldo
             FROM pedido_abonos a
            WHERE a.es_contra_entrega IS TRUE
              AND a.estado_pedido <> 'Cancelado'`
        ),

        // 5) Domicilios Pendientes y En camino.
        pool.query(
          `SELECT COUNT(*) FILTER (WHERE d.estado = 'Pendiente')::int AS pendientes,
                  COUNT(*) FILTER (WHERE d.estado = 'En camino')::int AS en_camino
             FROM domicilio d`
        ),

        // 6) Top 5 productos más vendidos del rango: suma de detalle_venta
        //    de ventas pagadas y no anuladas.
        pool.query(
          `SELECT p.codigo, p.nombre,
                  COALESCE(SUM(dv.cantidad), 0)::int AS cantidad
             FROM detalle_venta dv
             JOIN venta v ON v.id_venta = dv.id_venta
             JOIN producto_variante pv ON pv.id_variante = dv.id_variante
             JOIN producto p ON p.id_producto = pv.id_producto
            WHERE v.estado <> 'Anulada'
              AND v.estado_pago = 'Pagada'
              AND v.fecha >= $1::date
              AND v.fecha < ($2::date + INTERVAL '1 day')
            GROUP BY p.id_producto, p.codigo, p.nombre
            ORDER BY cantidad DESC, p.nombre
            LIMIT 5`,
          [desde, hasta]
        ),

        // 7) Inventario: variantes disponibles / bajo stock (misma regla
        //    del umbral que productosAdmin) / agotadas.
        pool.query(
          `SELECT COUNT(*) FILTER (WHERE pv.stock > $1)::int AS disponible,
                  COUNT(*) FILTER (WHERE pv.stock > 0 AND pv.stock <= $1)::int AS bajo,
                  COUNT(*) FILTER (WHERE pv.stock = 0)::int AS agotado
             FROM producto_variante pv`,
          [STOCK_MINIMO]
        ),

        // 8) Métodos de pago de las ventas pagadas del rango. Los textos se
        //    guardan largos ('Contra entrega - Abono 50% - QR'): se agrupan
        //    en Efectivo / Transferencia / Contra entrega / Otros.
        pool.query(
          `SELECT ${CLAVE_GRUPO_METODO} AS grupo,
                  COUNT(*)::int AS cantidad,
                  COALESCE(SUM(v.total), 0)::float8 AS total
             FROM venta v
            WHERE v.estado <> 'Anulada'
              AND v.estado_pago = 'Pagada'
              AND v.fecha >= $1::date
              AND v.fecha < ($2::date + INTERVAL '1 day')
            GROUP BY 1`,
          [desde, hasta]
        ),

        // 9) Total de clientes activos.
        pool.query(
          `SELECT COUNT(*)::int AS total
             FROM usuario u
             JOIN rol r ON r.id_rol = u.id_rol
            WHERE r.nombre = 'Cliente'
              AND u.estado = TRUE`
        ),
      ])

    const estadosPedido = Object.fromEntries(ESTADOS_PEDIDO.map((estado) => [estado, 0]))
    for (const fila of estados.rows) {
      estadosPedido[fila.estado] = fila.cantidad
    }

    const gruposPago = {
      efectivo: { cantidad: 0, total: 0 },
      transferencia: { cantidad: 0, total: 0 },
      contraEntrega: { cantidad: 0, total: 0 },
      otros: { cantidad: 0, total: 0 },
    }
    for (const fila of metodos.rows) {
      const clave = {
        Efectivo: 'efectivo',
        Transferencia: 'transferencia',
        'Contra entrega': 'contraEntrega',
        Otros: 'otros',
      }[fila.grupo] || 'otros'
      gruposPago[clave].cantidad = fila.cantidad
      gruposPago[clave].total = fila.total
    }

    res.json({
      rango: { desde, hasta },
      ingresos: {
        total: ingresos.rows[0].total,
        cantidad: ingresos.rows[0].cantidad,
      },
      ventasPorDia: porDia.rows,
      pedidos: {
        estados: estadosPedido,
        total: ESTADOS_PEDIDO.reduce((suma, estado) => suma + estadosPedido[estado], 0),
      },
      abonos: {
        saldoPendiente: abonos.rows[0].total_saldo_pendiente,
        pedidosConSaldo: abonos.rows[0].pedidos_con_saldo,
      },
      domicilios: {
        pendientes: domicilios.rows[0].pendientes,
        enCamino: domicilios.rows[0].en_camino,
      },
      productosTop: topProductos.rows,
      inventario: {
        disponible: inventario.rows[0].disponible,
        bajo: inventario.rows[0].bajo,
        agotado: inventario.rows[0].agotado,
      },
      metodosPago: gruposPago,
      clientesActivos: clientes.rows[0].total,
    })
  } catch (error) {
    responderError(res, error, 'No se pudo cargar el dashboard')
  }
})

export default router

