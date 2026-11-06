import { pool } from '../config/db.js'
import {
  esContraEntrega,
  saldoPendiente,
  recalcularVenta,
  registrar,
} from './abonos.js'

// Estados permitidos para los pedidos (coherentes con el panel admin).
// `estado` en la tabla pedido es varchar sin CHECK, por eso se valida aquí.
export const ESTADOS = ['Registrado', 'En preparación', 'Despachado', 'Entregado', 'Cancelado']
export const ESTADO_INICIAL = 'Registrado'
export const ESTADO_EN_PREPARACION = 'En preparación'
export const ESTADO_DESPACHADO = 'Despachado'
export const ESTADO_CANCELADO = 'Cancelado'
export const ESTADO_ENTREGADO = 'Entregado'

const SIGUIENTE_ESTADO = {
  [ESTADO_INICIAL]: ESTADO_EN_PREPARACION,
  [ESTADO_EN_PREPARACION]: ESTADO_DESPACHADO,
  [ESTADO_DESPACHADO]: ESTADO_ENTREGADO,
}

// Error con código HTTP para responder desde los catch.
// `campo` (opcional) permite que el frontend muestre el mensaje bajo el
// input correcto, igual que hace auth.js con sus rechazos.
export class ErrorHttp extends Error {
  constructor(status, message, campo) {
    super(message)
    this.status = status
    this.campo = campo
  }
}

// Cambia el estado de un pedido en UNA transacción: bloquea el pedido
// (FOR UPDATE), valida la transición, y al cancelar devuelve el stock y
// anula la venta; al entregar cobra el saldo real contra entrega y
// recalcula la venta (pago, comprobantes, abonos y stock nunca se tocan
// fuera de aquí). Sincroniza el domicilio en dos vías en la MISMA
// transacción: Despachado -> domicilio 'En camino'; Entregado ->
// 'Entregado' con fecha_entrega; Cancelado -> 'Cancelado'.
// Lanza ErrorHttp con su status ante cualquier rechazo.
// Si se pasa `db` (transacción del llamador, p.ej. Domicilios), la usa sin
// abrir BEGIN/COMMIT propios; si no, abre y gestiona su propia conexión.
export async function cambiarEstadoPedido({ db = null, id, estado, registradoPor }) {
  const propio = !db
  const client = propio ? await pool.connect() : db
  try {
    if (propio) await client.query('BEGIN')

    const { rows } = await client.query(
      `SELECT p.id_pedido, p.estado, p.total, p.estado_pago,
              COALESCE(
                p.metodo_pago,
                (SELECT metodo FROM pago WHERE id_pedido = p.id_pedido ORDER BY id_pago LIMIT 1)
              ) AS metodo_pago
         FROM pedido p
        WHERE p.id_pedido = $1
        FOR UPDATE`,
      [id]
    )
    const pedido = rows[0]

    if (!pedido) {
      await client.query('ROLLBACK')
      throw new ErrorHttp(404, 'Pedido no encontrado')
    }
    if (pedido.estado === ESTADO_ENTREGADO) {
      await client.query('ROLLBACK')
      throw new ErrorHttp(409, 'Un pedido Entregado no se puede modificar')
    }
    if (pedido.estado === ESTADO_CANCELADO) {
      await client.query('ROLLBACK')
      throw new ErrorHttp(409, 'El pedido ya está cancelado')
    }

    if (estado !== ESTADO_CANCELADO) {
      const siguiente = SIGUIENTE_ESTADO[pedido.estado]
      if (siguiente !== estado) {
        await client.query('ROLLBACK')
        throw new ErrorHttp(
          409,
          siguiente
            ? `Transición inválida de "${pedido.estado}" a "${estado}". El siguiente estado permitido es "${siguiente}".`
            : `Transición inválida desde "${pedido.estado}".`
        )
      }

      if (estado === ESTADO_EN_PREPARACION) {
        const estadoPago = pedido.estado_pago || 'No aplica'
        const metodo = String(pedido.metodo_pago || '')
        const contraEntrega = metodo.startsWith('Contra entrega')
        const pagoValidado = estadoPago === 'Pago confirmado' || estadoPago === 'No aplica'

        if (!contraEntrega && !pagoValidado) {
          await client.query('ROLLBACK')
          throw new ErrorHttp(409, `No se puede pasar a "${ESTADO_EN_PREPARACION}": el pago debe estar confirmado.`)
        }
      }
    }

    // Al cancelar se devuelve el stock en la misma transacción.
    if (estado === ESTADO_CANCELADO) {
      const { rows: detalles } = await client.query(
        'SELECT id_variante, cantidad FROM detalle_pedido WHERE id_pedido = $1',
        [id]
      )
      for (const detalle of detalles) {
        await client.query(
          'UPDATE producto_variante SET stock = stock + $1 WHERE id_variante = $2',
          [detalle.cantidad, detalle.id_variante]
        )
      }

      // La venta asociada queda anulada sin volver a tocar el stock.
      await client.query(
        `UPDATE venta
            SET estado = 'Anulada'
          WHERE id_pedido = $1
            AND estado <> 'Anulada'`,
        [id]
      )
    }

    // Contra entrega: al entregar se cobra el saldo REAL pendiente (total
    // menos lo abonado) en la MISMA transacción, con el método
    // "Contra entrega - Saldo"; si ya es 0 no se crea nada. Luego
    // recalcularVenta deja la venta Pagada/Pendiente según el saldo. Otros
    // métodos (Transferencia; históricamente Crédito) no registran nada aquí.
    if (estado === ESTADO_ENTREGADO) {
      const { rows: pagosRows } = await client.query(
        'SELECT metodo FROM pago WHERE id_pedido = $1 ORDER BY id_pago LIMIT 1',
        [id]
      )
      const esCE = esContraEntrega(pedido.metodo_pago || pagosRows[0]?.metodo || '')

      if (esCE) {
        const saldoAlEntregar = await saldoPendiente(client, id)
        if (saldoAlEntregar > 0) {
          await registrar(client, {
            idPedido: id,
            registradoPor,
            monto: saldoAlEntregar,
            metodo: 'Contra entrega - Saldo',
            observacion: 'Saldo al entregar',
          })
        }
        await recalcularVenta(client, id)
      }
    }

    await client.query('UPDATE pedido SET estado = $1 WHERE id_pedido = $2', [estado, id])

    // Sincronización en dos vías con el domicilio (el pedido solo cambia
    // de estado aquí): un domicilio Cancelado no se vuelve a tocar.
    const ESTADOS_DOMICILIO = {
      [ESTADO_DESPACHADO]: 'En camino',
      [ESTADO_ENTREGADO]: 'Entregado',
      [ESTADO_CANCELADO]: 'Cancelado',
    }
    const estadoDomicilio = ESTADOS_DOMICILIO[estado]
    if (estadoDomicilio) {
      const esEntregado = estadoDomicilio === 'Entregado'
      await client.query(
        `UPDATE domicilio
            SET estado = $2,
                fecha_entrega = CASE
                  WHEN $3 THEN COALESCE(fecha_entrega, CURRENT_DATE)
                  ELSE fecha_entrega
                END,
                actualizado_en = now()
          WHERE id_pedido = $1
            AND estado <> 'Cancelado'`,
        [id, estadoDomicilio, esEntregado]
      )
    }

    if (propio) await client.query('COMMIT')
  } catch (error) {
    if (propio) await client.query('ROLLBACK').catch(() => {})
    throw error
  } finally {
    if (propio) client.release()
  }
}
