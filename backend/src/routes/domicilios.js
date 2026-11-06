import { Router } from 'express'
import { pool } from '../config/db.js'
import {
  verificarToken,
  bloquearCambioPendiente,
  requierePrivilegio,
} from '../middlewares/auth.js'
import { cambiarEstadoPedido, ErrorHttp } from '../services/estadosPedido.js'
import { recalcularVenta } from '../services/abonos.js'
import { validarDireccion } from '../utils/ubicaciones.js'
import { METODOS_ENVIO } from '../utils/envios.js'

const router = Router()

// Todos los endpoints exigen token y que no haya un cambio de contraseÃ±a
// pendiente; cada ruta aÃ±ade su permiso Domicilios:*.
router.use(verificarToken, bloquearCambioPendiente)

const CODIGO_DOMICILIO = "('DOM-' || LPAD(d.id_domicilio::text, 5, '0'))"

// Status del domicilio que cierran el registro: no se actualizan ni avanzan.
const DOMICILIOS_CERRADOS = ['Entregado', 'Cancelado']

const FROM_DOMICILIO = `
  FROM domicilio d
  JOIN pedido p ON p.id_pedido = d.id_pedido
  JOIN usuario u ON u.id_usuario = p.id_usuario
`

const SELECT_DOMICILIO = `
  SELECT d.id_domicilio AS id,
         ${CODIGO_DOMICILIO} AS codigo,
         d.id_pedido,
         p.estado AS estado_pedido,
         d.metodo_envio,
         TRIM(u.nombres || ' ' || u.apellidos) AS cliente,
         COALESCE(d.nombre_destinatario, '') AS destinatario,
         COALESCE(d.telefono_destinatario, u.telefono) AS telefono,
         COALESCE(d.direccion_entrega, '') AS direccion,
         COALESCE(d.barrio, '') AS barrio,
         COALESCE(d.municipio, '') AS municipio,
         COALESCE(d.departamento, '') AS departamento,
         d.responsable,
         p.costo_envio::float8 AS costo_envio,
         p.costo_envio_pendiente,
         p.total::float8 AS total_pedido,
         TO_CHAR(d.fecha_programada, 'YYYY-MM-DD') AS fecha_programada,
         TO_CHAR(d.fecha_entrega, 'YYYY-MM-DD') AS fecha_entrega,
         d.observaciones,
         d.estado,
         TO_CHAR(p.fecha, 'YYYY-MM-DD') AS fecha_pedido
`

// Productos del pedido: mismo criterio que el detalle de Pedidos.
const SELECT_ITEMS = `
  SELECT dp.id_pedido,
         dp.id_variante,
         p.nombre,
         t.nombre AS talla,
         c.nombre AS color,
         dp.cantidad,
         dp.precio_unitario::float8 AS precio_unitario
  FROM detalle_pedido dp
  JOIN producto_variante pv ON pv.id_variante = dp.id_variante
  JOIN producto p ON p.id_producto = pv.id_producto
  LEFT JOIN talla t ON t.id_talla = pv.id_talla
  LEFT JOIN color c ON c.id_color = pv.id_color
`

const idDeParametro = (valor) => {
  const id = Number.parseInt(valor, 10)
  if (Number.isNaN(id)) {
    throw new ErrorHttp(400, 'Identificador invÃ¡lido')
  }
  return id
}

const fechaValida = (fecha) =>
  /^\d{4}-\d{2}-\d{2}$/.test(String(fecha || '')) && !Number.isNaN(Date.parse(fecha))

const obtenerDomicilioPorId = async (id) => {
  const { rows } = await pool.query(
    `${SELECT_DOMICILIO} ${FROM_DOMICILIO} WHERE d.id_domicilio = $1`,
    [id]
  )
  if (rows.length === 0) return null
  const domicilio = rows[0]
  const { rows: items } = await pool.query(
    `${SELECT_ITEMS} WHERE dp.id_pedido = $1 ORDER BY dp.id_detalle`,
    [domicilio.id_pedido]
  )
  return { ...domicilio, items }
}

// GET / -> listar (lo nuevo primero); bsqueda y paginacin.
router.get('/', requierePrivilegio('Domicilios', 'Consultar'), async (req, res) => {
  const pagina = Math.max(1, Number.parseInt(req.query.pagina, 10) || 1)
  const porPagina = Math.min(
    50,
    Math.max(1, Number.parseInt(req.query.porPagina, 10) || 10)
  )

  const params = []
  let filtro = ''
  const busqueda = String(req.query.q || '').trim()
  if (busqueda) {
    params.push(`%${busqueda}%`)
    filtro = `
      WHERE (${CODIGO_DOMICILIO} ILIKE $1
             OR d.id_pedido::text ILIKE $1
             OR TRIM(u.nombres || ' ' || u.apellidos) ILIKE $1
             OR COALESCE(d.direccion_entrega, '') ILIKE $1
             OR COALESCE(d.municipio, '') ILIKE $1
             OR COALESCE(d.telefono_destinatario, '') ILIKE $1)`
  }

  try {
    const { rows: conteo } = await pool.query(
      `SELECT COUNT(*)::int AS total ${FROM_DOMICILIO} ${filtro}`,
      params
    )
    const total = conteo[0]?.total || 0

    params.push(porPagina, (pagina - 1) * porPagina)
    const { rows } = await pool.query(
      `${SELECT_DOMICILIO} ${FROM_DOMICILIO} ${filtro}
        ORDER BY d.id_domicilio DESC
        LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    )

    res.json({
      domicilios: rows,
      total,
      pagina,
      porPagina,
      totalPaginas: Math.max(1, Math.ceil(total / porPagina)),
    })
  } catch (error) {
    console.error('Error en GET /api/domicilios:', error.message)
    res.status(500).json({ error: 'No se pudieron cargar los domicilios' })
  }
})

// GET /:id -> detalle con los productos del pedido.
router.get('/:id', requierePrivilegio('Domicilios', 'Consultar'), async (req, res) => {
  try {
    const id = idDeParametro(req.params.id)
    const domicilio = await obtenerDomicilioPorId(id)
    if (!domicilio) {
      return res.status(404).json({ error: 'Domicilio no encontrado' })
    }
    res.json(domicilio)
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message })
    }
    console.error('Error en GET /api/domicilios/:id:', error.message)
    res.status(500).json({ error: 'No se pudo cargar el domicilio' })
  }
})

// PATCH /:id -> datos de entrega (Domicilios:Actualizar). No editable si
// el domicilio ya est Entregado o Cancelado.
router.patch('/:id', requierePrivilegio('Domicilios', 'Actualizar'), async (req, res) => {
  let id
  try {
    id = idDeParametro(req.params.id)
  } catch (error) {
    return res.status(error.status).json({ error: error.message })
  }

  const cambios = {}
  if (Object.prototype.hasOwnProperty.call(req.body, 'responsable')) {
    const responsable = String(req.body.responsable || '').trim()
    if (!responsable || responsable.length > 20) {
      return res.status(400).json({
        error:
          'El responsable debe tener entre 1 y 20 caracteres',
        campo: 'responsable',
      })
    }
    cambios.responsable = responsable
  }
  if (Object.prototype.hasOwnProperty.call(req.body, 'fecha_programada')) {
    const fecha = String(req.body.fecha_programada || '').trim()
    if (!fechaValida(fecha)) {
      return res.status(400).json({
        error: 'La fecha programada debe tener el formato YYYY-MM-DD',
        campo: 'fecha_programada',
      })
    }
    cambios.fecha_programada = fecha
  }
  if (Object.prototype.hasOwnProperty.call(req.body, 'observaciones')) {
    const observaciones = String(req.body.observaciones || '').trim()
    if (observaciones.length > 500) {
      return res.status(400).json({
        error: 'Las observaciones no pueden superar los 500 caracteres',
        campo: 'observaciones',
      })
    }
    cambios.observaciones = observaciones
  }

  if (Object.keys(cambios).length === 0) {
    return res
      .status(400)
      .json({ error: 'Enva responsable, fecha_programada u observaciones para actualizar' })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const { rows } = await client.query(
      `SELECT id_domicilio, id_pedido, estado
         FROM domicilio
        WHERE id_domicilio = $1
        FOR UPDATE`,
      [id]
    )
    const domicilio = rows[0]
    if (!domicilio) {
      await client.query('ROLLBACK')
      return res.status(404).json({ error: 'Domicilio no encontrado' })
    }
    if (DOMICILIOS_CERRADOS.includes(domicilio.estado)) {
      await client.query('ROLLBACK')
      return res.status(409).json({
        error: `Un domicilio en estado "${domicilio.estado}" no se puede modificar`,
      })
    }

    const campos = Object.keys(cambios)
    const colocaciones = campos.map(
      (campo, i) => `${campo} = $${i + 1}`
    )
    await client.query(
      `UPDATE domicilio
          SET ${colocaciones.join(', ')}, actualizado_en = now()
        WHERE id_domicilio = $${campos.length + 1}`,
      [...campos.map((campo) => cambios[campo]), id]
    )

    await client.query('COMMIT')

    const actualizado = await obtenerDomicilioPorId(id)
    res.json(actualizado)
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    console.error('Error en PATCH /api/domicilios/:id:', error.message)
    res.status(500).json({ error: 'No se pudo actualizar el domicilio' })
  } finally {
    client.release()
  }
})

// PATCH /:id/estado -> avanza el domicilio (Domicilios:Cambiar estado).
// Solo Pendiente -> En camino (exige responsable y despacha el pedido con
// la funciÃ³n compartida, que debe estar En preparaciÃ³n) y En camino ->
// Entregado. Sin retrocesos ni saltos: cualquier otra cosa es 409.
router.patch('/:id/estado', requierePrivilegio('Domicilios', 'Cambiar estado'), async (req, res) => {
  let id
  try {
    id = idDeParametro(req.params.id)
  } catch (error) {
    return res.status(error.status).json({ error: error.message })
  }

  const destino = String(req.body.estado || '').trim()
  if (destino !== 'En camino' && destino !== 'Entregado') {
    return res.status(409).json({
      error: 'Estado invÃ¡lido para un domicilio. Solo puede avanzar a "En camino" o "Entregado"',
    })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const { rows } = await client.query(
      `SELECT id_domicilio, id_pedido, estado, responsable, actualizado_en
         FROM domicilio
        WHERE id_domicilio = $1
        FOR UPDATE`,
      [id]
    )
    const domicilio = rows[0]
    if (!domicilio) {
      await client.query('ROLLBACK')
      return res.status(404).json({ error: 'Domicilio no encontrado' })
    }
    if (DOMICILIOS_CERRADOS.includes(domicilio.estado)) {
      await client.query('ROLLBACK')
      return res.status(409).json({
        error: `Un domicilio en estado "${domicilio.estado}" no se puede modificar`,
      })
    }

    // Sin retrocesos ni saltos.
    if (destino === 'En camino' && domicilio.estado !== 'Pendiente') {
      await client.query('ROLLBACK')
      return res.status(409).json({
        error: `Solo se puede pasar a "En camino" desde "Pendiente" (estado actual: "${domicilio.estado}")`,
      })
    }
    if (destino === 'Entregado' && domicilio.estado !== 'En camino') {
      await client.query('ROLLBACK')
      return res.status(409).json({
        error: `Solo se puede pasar a "Entregado" desde "En camino" (estado actual: "${domicilio.estado}")`,
      })
    }

    // La entrega en ruta exige responsable (del cuerpo o ya registrado).
    if (destino === 'En camino') {
      const responsable = String(req.body.responsable ?? domicilio.responsable ?? '').trim()
      if (!responsable || responsable.length > 20) {
        await client.query('ROLLBACK')
        return res.status(409).json({
          error: 'El domicilio necesita un responsable (mÃ¡ximo 20 caracteres) para pasar a "En camino"',
          campo: 'responsable',
        })
      }
      await client.query(
        `UPDATE domicilio
            SET responsable = $1, actualizado_en = now()
          WHERE id_domicilio = $2`,
        [responsable, id]
      )
    }

    // La funciÃ³n compartida despacha el pedido (exige En preparaciÃ³n ->
    // Despachado) o lo entrega (Despachado -> Entregado, con el cobro del
    // saldo contra entrega), y sincroniza el domicilio en la MISMA
    // transacciÃ³n. Cualquier rechazo llega como ErrorHttp con su status.
    await cambiarEstadoPedido({
      db: client,
      id: domicilio.id_pedido,
      estado: destino === 'En camino' ? 'Despachado' : 'Entregado',
      registradoPor: req.usuario.id,
    })

    await client.query('COMMIT')

    const actualizado = await obtenerDomicilioPorId(id)
    res.json(actualizado)
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    if (error.status) {
      return res.status(error.status).json({ error: error.message })
    }
    console.error('Error en PATCH /api/domicilios/:id/estado:', error.message)
    res.status(500).json({ error: 'No se pudo cambiar el estado del domicilio' })
  } finally {
    client.release()
  }
})

// POST / -> registra un domicilio SOLO para un pedido existente que aÃºn
// no tenga fila (pedidos histÃ³ricos), con los datos de entrega derivados
// del pedido y su cliente. No hay DELETE: se cancela cancelando el pedido.
router.post('/', requierePrivilegio('Domicilios', 'Crear'), async (req, res) => {
  const idPedido = Number.parseInt(req.body?.id_pedido, 10)
  if (Number.isNaN(idPedido)) {
    return res.status(400).json({ error: 'Identificador invÃ¡lido', campo: 'id_pedido' })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const { rows } = await client.query(
      `SELECT p.id_pedido, p.estado, p.metodo_pago,
              u.id_usuario,
              TRIM(u.nombres || ' ' || u.apellidos) AS cliente,
              u.telefono
         FROM pedido p
         JOIN usuario u ON u.id_usuario = p.id_usuario
        WHERE p.id_pedido = $1
        FOR UPDATE OF p`,
      [idPedido]
    )
    const pedido = rows[0]
    if (!pedido) {
      await client.query('ROLLBACK')
      return res.status(404).json({ error: 'Pedido no encontrado' })
    }

    const { rows: existentes } = await client.query(
      'SELECT 1 FROM domicilio WHERE id_pedido = $1 LIMIT 1',
      [idPedido]
    )
    if (existentes.length > 0) {
      await client.query('ROLLBACK')
      return res.status(409).json({
        error: 'El pedido ya tiene un domicilio registrado',
      })
    }

    const metodoEnvio = String(req.body?.metodo_envio || '').trim()
    if (metodoEnvio && !METODOS_ENVIO.includes(metodoEnvio)) {
      await client.query('ROLLBACK')
      return res.status(400).json({
        error: `MÃ©todo de envÃ­o invÃ¡lido. Usa: ${METODOS_ENVIO.join(' o ')}`,
        campo: 'metodo_envio',
      })
    }

    let direccion = 'Recoger en tienda'
    if (metodoEnvio !== 'Recoger en tienda') {
      const candidata = String(req.body?.direccion || '').trim()
      const errorDireccion = validarDireccion(candidata)
      if (errorDireccion) {
        await client.query('ROLLBACK')
        return res.status(400).json({ error: errorDireccion, campo: 'direccion' })
      }
      direccion = candidata
    }

    await client.query(
      `INSERT INTO domicilio
         (id_pedido, direccion_entrega, metodo_envio, estado,
          departamento, municipio, barrio,
          nombre_destinatario, telefono_destinatario)
       VALUES ($1, $2, $3, 'Pendiente', NULL, NULL, NULL, $4, $5)`,
      [
        idPedido,
        direccion,
        metodoEnvio || 'Domicilio',
        pedido.cliente,
        pedido.telefono || null,
      ]
    )

    await client.query('COMMIT')

    const domicilios = await pool.query(
      'SELECT id_domicilio FROM domicilio WHERE id_pedido = $1 ORDER BY id_domicilio',
      [idPedido]
    )
    const creado = await obtenerDomicilioPorId(
      domicilios.rows[domicilios.rows.length - 1].id_domicilio
    )
    return res.status(201).json(creado)
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    if (error.status) {
      return res.status(error.status).json({ error: error.message })
    }
    console.error('Error en POST /api/domicilios:', error.message)
    res.status(500).json({ error: 'No se pudo registrar el domicilio' })
  } finally {
    client.release()
  }
})

// PATCH /:id/costo-envio -> define el costo de envÃ­o (Domicilios:Actualizar)
// SOLO mientras pedido.costo_envio_pendiente sea true, en UNA transacciÃ³n
// con FOR UPDATE. pedido.total = subtotal - descuento + iva + costo_envio;
// se actualizan pedido.total y venta.total y se recalcula saldo / estado
// de pago con services/abonos.js. Rechaza si el nuevo total queda por
// debajo de lo ya abonado y no permite cambiarlo otra vez.
router.patch('/:id/costo-envio', requierePrivilegio('Domicilios', 'Actualizar'), async (req, res) => {
  let id
  try {
    id = idDeParametro(req.params.id)
  } catch (error) {
    return res.status(error.status).json({ error: error.message })
  }

  const crudo = Number(req.body?.costo)
  if (!Number.isFinite(crudo) || crudo < 0 || crudo > 999999999) {
    return res.status(400).json({
      error: 'El costo de envío debe ser un monto entre 0 y 999999999',
      campo: 'costo',
    })
  }
  const costo = Math.round(crudo * 100) / 100

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const { rows } = await client.query(
      `SELECT id_pedido, estado, subtotal::float8 AS subtotal,
              descuento::float8 AS descuento, iva::float8 AS iva,
              total::float8 AS total, costo_envio::float8 AS costo_envio,
              costo_envio_pendiente, metodo_pago
         FROM pedido
        WHERE id_pedido = (SELECT id_pedido FROM domicilio WHERE id_domicilio = $1)
          AND id_pedido IS NOT NULL
        FOR UPDATE`,
      [id]
    )
    const pedido = rows[0]
    if (!pedido) {
      await client.query('ROLLBACK')
      return res.status(404).json({ error: 'Domicilio no encontrado' })
    }
    if (pedido.estado === 'Cancelado') {
      await client.query('ROLLBACK')
      return res.status(409).json({ error: 'Un pedido cancelado no admite cambios de costo de envío' })
    }
    if (!pedido.costo_envio_pendiente) {
      await client.query('ROLLBACK')
      return res.status(409).json({ error: 'El costo de envío ya está definido y no se puede cambiar' })
    }

    // El total se compone as (pedidos nuevos: descuento=iva=0).
    const nuevoTotal =
      Math.round((pedido.subtotal - pedido.descuento + pedido.iva + costo) * 100) / 100

    const { rows: abonado } = await client.query(
      `SELECT COALESCE(SUM(monto), 0)::float8 AS monto
         FROM pago
        WHERE id_pedido = $1`,
      [pedido.id_pedido]
    )
    const montoAbonado = abonado[0]?.monto || 0
    if (nuevoTotal < montoAbonado) {
      await client.query('ROLLBACK')
      return res.status(409).json({
        error: `El nuevo total ($${nuevoTotal}) no puede quedar por debajo de lo ya abonado ($${montoAbonado})`,
      })
    }

    await client.query(
      `UPDATE pedido
          SET costo_envio = $1, costo_envio_pendiente = FALSE, total = $2
        WHERE id_pedido = $3`,
      [costo, nuevoTotal, pedido.id_pedido]
    )
    await client.query(
      `UPDATE venta
          SET total = $1
        WHERE id_pedido = $2
          AND estado <> 'Anulada'`,
      [nuevoTotal, pedido.id_pedido]
    )

    const estadoVenta = await recalcularVenta(client, pedido.id_pedido)

    await client.query('COMMIT')

    const detalle = await obtenerDomicilioPorId(id)
    res.json({
      domicilio: detalle,
      pedido: {
        id: pedido.id_pedido,
        subtotal: pedido.subtotal,
        descuento: pedido.descuento,
        iva: pedido.iva,
        costo_envio: costo,
        costo_envio_pendiente: false,
        total: nuevoTotal,
      },
      venta: estadoVenta.venta,
      saldo_pendiente: estadoVenta.saldo,
    })
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    if (error.status) {
      return res.status(error.status).json({ error: error.message })
    }
    console.error('Error en PATCH /api/domicilios/:id/costo-envio:', error.message)
    res.status(500).json({ error: 'No se pudo definir el costo de envío' })
  } finally {
    client.release()
  }
})

export default router
