import { pool } from '../config/db.js'

// Error con código HTTP para responder desde los catch de las rutas.
class ErrorHttp extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

// El módulo Abonos solo aplica a pedidos cuyo método empiece por
// "Contra entrega"; los de Transferencia pagan el 100 % y no entran.
export const esContraEntrega = (metodo) =>
  String(metodo || '').trim().startsWith('Contra entrega')

// Saldo REAL pendiente (total menos lo abonado). El llamador debe tener
// bloqueado el pedido con FOR UPDATE en la misma transacción para que el
// resultado sea fiable frente a abonos simultáneos.
export const saldoPendiente = async (db, idPedido) => {
  const { rows } = await db.query(
    `SELECT (p.total - COALESCE(
               (SELECT SUM(monto) FROM pago WHERE id_pedido = p.id_pedido), 0
             ))::float8 AS saldo
       FROM pedido p
      WHERE p.id_pedido = $1`,
    [idPedido]
  )
  return Number(rows[0]?.saldo || 0)
}

// Tras cada pago, en la MISMA transacción: la venta queda 'Pagada' (con
// fecha_pago) solo cuando el saldo llega a 0; 'Pendiente' en otro caso.
export const recalcularVenta = async (db, idPedido) => {
  const saldo = await saldoPendiente(db, idPedido)
  const { rows } = await db.query(
    `UPDATE venta
        SET estado_pago = CASE WHEN $2 <= 0 THEN 'Pagada' ELSE 'Pendiente' END,
            fecha_pago  = CASE WHEN $2 <= 0 THEN COALESCE(fecha_pago, CURRENT_DATE)
                               ELSE NULL END
      WHERE id_pedido = $1
      RETURNING estado_pago, TO_CHAR(fecha_pago, 'YYYY-MM-DD') AS fecha_pago`,
    [idPedido, saldo]
  )
  return { saldo, venta: rows[0] || null }
}

// Única puerta de escritura de abonos: inserta el pago y recalcula el estado
// de la venta, siempre dentro de la transacción (db) del llamador, que debe
// haber bloqueado el pedido con FOR UPDATE antes de llegar aquí.
export const registrar = async (
  db,
  { idPedido, registradoPor = null, monto, metodo, observacion = null,
    referencia = null, idComprobante = null, claveIdempotencia = null }
) => {
  let { rows } = await db.query(
    `INSERT INTO pago
        (id_pedido, metodo, monto, registrado_por, observacion, referencia,
         id_comprobante, clave_idempotencia)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (clave_idempotencia) WHERE clave_idempotencia IS NOT NULL
     DO NOTHING
     RETURNING id_pago AS id, id_pedido, metodo, monto::float8 AS monto,
               TO_CHAR(fecha, 'YYYY-MM-DD') AS fecha, registrado_en,
               registrado_por, observacion, referencia, id_comprobante,
               clave_idempotencia`,
    [idPedido, metodo, monto, registradoPor, observacion, referencia,
     idComprobante, claveIdempotencia]
  )

  // Carrera de idempotencia: otra transacción insertó primero la misma clave.
  if (rows.length === 0) {
    if (!claveIdempotencia) {
      throw new ErrorHttp(409, 'No se pudo registrar el abono por una operación simultánea')
    }
    const { rows: existentes } = await db.query(
      `SELECT id_pago AS id, id_pedido, metodo, monto::float8 AS monto,
              TO_CHAR(fecha, 'YYYY-MM-DD') AS fecha, registrado_en,
              registrado_por, observacion, referencia, id_comprobante,
              clave_idempotencia
         FROM pago
        WHERE clave_idempotencia = $1`,
      [claveIdempotencia]
    )
    if (!existentes[0] || existentes[0].id_pedido !== idPedido) {
      throw new ErrorHttp(409, 'La clave de idempotencia ya fue usada en otro pedido')
    }
    rows = existentes
  }

  const estado = await recalcularVenta(db, idPedido)
  return { abono: rows[0], saldo: estado.saldo, venta: estado.venta }
}

// Busca el pago inmutable correspondiente a una clave de idempotencia.
export const abonoPorClave = async (db, claveIdempotencia) => {
  const { rows } = await db.query(
    `SELECT id_pago AS id, id_pedido, metodo, monto::float8 AS monto,
            TO_CHAR(fecha, 'YYYY-MM-DD') AS fecha, registrado_en,
            registrado_por, observacion, referencia, id_comprobante,
            clave_idempotencia
       FROM pago
      WHERE clave_idempotencia = $1`,
    [claveIdempotencia]
  )
  return rows[0] || null
}

// Monto mínimo vigente de configuracion_abonos.
export const montoMinimo = async (db) => {
  const { rows } = await db.query(
    'SELECT monto_minimo::float8 AS monto_minimo FROM configuracion_abonos WHERE id = 1'
  )
  return Number(rows[0]?.monto_minimo ?? 1)
}
