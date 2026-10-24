import { Router } from 'express'
import { pool } from '../config/db.js'
import { verificarToken, soloRoles, bloquearCambioPendiente, requierePrivilegio } from '../middlewares/auth.js'
import {
  validarNombreCompleto,
  validarTelefonoEntrega,
  validarBarrio,
  validarDireccion,
} from '../utils/ubicaciones.js'
import {
  METODOS_ENVIO,
  calcularCostoEnvio,
  metodosEnvioPermitidos,
  validarUbicacionCodigos,
} from '../utils/envios.js'

const router = Router()

// Todos los endpoints exigen token y que no haya un cambio de contraseña pendiente
router.use(verificarToken, bloquearCambioPendiente)

// Estados permitidos para los pedidos (coherentes con el panel admin).
// `estado` en la tabla pedido es varchar sin CHECK, por eso se valida aquí.
const ESTADOS = ['Registrado', 'En preparación', 'Despachado', 'Entregado', 'Cancelado']
const ESTADO_INICIAL = 'Registrado'
const ESTADO_CANCELADO = 'Cancelado'
const ESTADO_ENTREGADO = 'Entregado'

// Efectivo ya no se acepta en pedidos nuevos (las ventas de mostrador no
// cambian: su lista vive en routes/ventas.js y su CHECK de la tabla venta se
// mantiene intacto). Crédito también se retiró del checkout: la lista de
// abajo es solo para pedidos NUEVOS; los pagos históricos con "Crédito" en
// la tabla pago siguen consultándose sin problema (esa columna no tiene CHECK).
const METODOS = ['Transferencia', 'Contra entrega']
const BANCOS = ['Nequi', 'Bancolombia', 'QR']

const ESTADO_PAGO_PENDIENTE = 'Pendiente de verificación'
const ESTADO_PAGO_CONFIRMADO = 'Pago confirmado'
const ESTADO_PAGO_RECHAZADO = 'Pago rechazado'
const ESTADO_PAGO_NO_APLICA = 'No aplica'

// Error con código HTTP para responder desde los catch.
// `campo` (opcional) permite que el frontend muestre el mensaje bajo el
// input correcto, igual que hace auth.js con sus rechazos.
class ErrorHttp extends Error {
  constructor(status, message, campo) {
    super(message)
    this.status = status
    this.campo = campo
  }
}

const SELECT_PEDIDO = `
  SELECT p.id_pedido AS id,
         p.id_usuario,
         TO_CHAR(p.fecha, 'YYYY-MM-DD') AS fecha,
         p.subtotal::float8 AS subtotal,
         p.descuento::float8 AS descuento,
         p.iva::float8 AS iva,
         p.total::float8 AS total,
         p.costo_envio::float8 AS costo_envio,
         p.costo_envio_pendiente,
         p.estado,
         TRIM(u.nombres || ' ' || u.apellidos) AS cliente,
         u.correo AS cliente_correo,
         u.tipo_documento,
         u.documento,
         u.telefono,
         COALESCE(
           p.metodo_pago,
           (SELECT metodo FROM pago WHERE id_pedido = p.id_pedido ORDER BY id_pago LIMIT 1)
         ) AS metodo_pago,
         COALESCE(p.estado_pago, 'No aplica') AS estado_pago,
         (SELECT COALESCE(SUM(monto), 0)::float8 FROM pago WHERE id_pedido = p.id_pedido) AS monto_pagado,
         (p.total - (SELECT COALESCE(SUM(monto), 0) FROM pago WHERE id_pedido = p.id_pedido))::float8 AS saldo,
         (SELECT direccion_entrega FROM domicilio WHERE id_pedido = p.id_pedido ORDER BY id_domicilio LIMIT 1) AS direccion,
         (SELECT metodo_envio FROM domicilio WHERE id_pedido = p.id_pedido ORDER BY id_domicilio LIMIT 1) AS metodo_envio,
         (SELECT departamento FROM domicilio WHERE id_pedido = p.id_pedido ORDER BY id_domicilio LIMIT 1) AS departamento,
         (SELECT municipio FROM domicilio WHERE id_pedido = p.id_pedido ORDER BY id_domicilio LIMIT 1) AS municipio,
         (SELECT barrio FROM domicilio WHERE id_pedido = p.id_pedido ORDER BY id_domicilio LIMIT 1) AS barrio,
         (SELECT nombre_destinatario FROM domicilio WHERE id_pedido = p.id_pedido ORDER BY id_domicilio LIMIT 1) AS nombre_destinatario,
         (SELECT telefono_destinatario FROM domicilio WHERE id_pedido = p.id_pedido ORDER BY id_domicilio LIMIT 1) AS telefono_destinatario
  FROM pedido p
  JOIN usuario u ON u.id_usuario = p.id_usuario
`

const SELECT_PAGOS = `
  SELECT id_pedido, id_pago, metodo, monto::float8 AS monto,
         TO_CHAR(fecha, 'YYYY-MM-DD') AS fecha, url
  FROM pago
`

// El banco viaja dentro del texto del método ("Transferencia - Nequi",
// "Contra entrega - Abono 50% - Nequi"); aquí se separa para mostrarlo
// como campo propio.
const bancoDeMetodo = (metodo) => {
  const texto = String(metodo || '')
  if (texto.includes('Nequi')) return 'Nequi'
  if (texto.includes('Bancolombia')) return 'Bancolombia'
  if (texto.includes('QR')) return 'QR'
  return null
}

const SELECT_DETALLE = `
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

// Agrega la lista de productos a cada pedido (una sola consulta).
const adjuntarItems = async (pedidos) => {
  if (pedidos.length === 0) return pedidos

  const ids = pedidos.map((p) => p.id)
  const { rows } = await pool.query(
    `${SELECT_DETALLE} WHERE dp.id_pedido = ANY($1::int[]) ORDER BY dp.id_detalle`,
    [ids]
  )

  const porPedido = new Map()
  for (const fila of rows) {
    if (!porPedido.has(fila.id_pedido)) porPedido.set(fila.id_pedido, [])
    porPedido.get(fila.id_pedido).push({
      id_variante: fila.id_variante,
      nombre: fila.nombre,
      talla: fila.talla,
      color: fila.color,
      cantidad: fila.cantidad,
      precio_unitario: fila.precio_unitario,
    })
  }

  return pedidos.map((p) => ({ ...p, items: porPedido.get(p.id) || [] }))
}

// Agrega el historial completo de pagos a cada pedido (una sola consulta).
const adjuntarPagos = async (pedidos) => {
  if (pedidos.length === 0) return pedidos

  const ids = pedidos.map((p) => p.id)
  const { rows } = await pool.query(
    `${SELECT_PAGOS} WHERE id_pedido = ANY($1::int[]) ORDER BY id_pago`,
    [ids]
  )

  const porPedido = new Map()
  for (const fila of rows) {
    if (!porPedido.has(fila.id_pedido)) porPedido.set(fila.id_pedido, [])
    porPedido.get(fila.id_pedido).push({
      id: fila.id_pago,
      fecha: fila.fecha,
      metodo: fila.metodo,
      banco: bancoDeMetodo(fila.metodo),
      monto: fila.monto,
      url: fila.url,
    })
  }

  return pedidos.map((p) => ({ ...p, pagos: porPedido.get(p.id) || [] }))
}

// Quita los datos personales de documento/teléfono: solo se entregan a quien
// tenga el privilegio Pedidos:Consultar (el Cliente nunca lo tiene).
const sinDatosDocumento = (pedido) => {
  const { tipo_documento, documento, telefono, ...resto } = pedido
  return resto
}

const obtenerPedidoPorId = async (id) => {
  const { rows } = await pool.query(`${SELECT_PEDIDO} WHERE p.id_pedido = $1`, [id])
  if (rows.length === 0) return null
  const conItems = await adjuntarItems(rows)
  const conPagos = await adjuntarPagos(conItems)
  return conPagos[0]
}

const normalizarItems = (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new ErrorHttp(400, 'El pedido debe incluir al menos un producto')
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

const normalizarPago = (body) => {
  const metodo = String(body.metodo_pago || '').trim()

  // Crédito se retiró del checkout: se rechaza con mensaje propio para que
  // no se pueda crear un pedido nuevo con ese valor (ni siquiera manipulando
  // la petición). Los pedidos históricos solo se leen, nunca se validan aquí.
  if (metodo === 'Crédito') {
    throw new ErrorHttp(400, 'Este método de pago ya no está disponible')
  }

  if (!METODOS.includes(metodo)) {
    throw new ErrorHttp(400, 'Método de pago inválido. Usa: Transferencia o Contra entrega')
  }

  if (metodo === 'Transferencia') {
    const banco = String(body.banco || body.transferencia_banco || '').trim()
    if (!BANCOS.includes(banco)) {
      throw new ErrorHttp(400, 'Para transferencia indica el medio de pago: QR')
    }
    return { metodo_pago: metodo, metodo_guardado: `Transferencia - ${banco}` }
  }

  // Contra entrega cobra el abono del 50 % por transferencia, con las mismas
  // instrucciones y el mismo banco que una transferencia normal.
  if (metodo === 'Contra entrega') {
    const banco = String(body.banco || body.transferencia_banco || '').trim()
    if (!BANCOS.includes(banco)) {
      throw new ErrorHttp(400, 'Para contra entrega indica el medio del abono: QR')
    }
    return { metodo_pago: metodo, metodo_guardado: `Contra entrega - Abono 50% - ${banco}` }
  }

  return { metodo_pago: metodo, metodo_guardado: metodo }
}

const normalizarEnvio = (body) => {
  const metodo = String(body.metodo_envio || 'Domicilio').trim()

  if (!METODOS_ENVIO.includes(metodo)) {
    throw new ErrorHttp(400, `Método de envío inválido. Usa: ${METODOS_ENVIO.join(' o ')}`)
  }

  return metodo
}

// Valida todos los datos de entrega y devuelve lo que se persiste.
// La zona se decide SOLO por el código DANE del municipio: dentro del Valle
// de Aburrá se permite Domicilio o Recoger en tienda; fuera, solo
// Transportadora. Nunca se acepta la combinación enviada por el frontend sin
// volver a comprobarla aquí.
const validarEntrega = (body, metodoEnvio) => {
  const nombre = String(body.nombre_entrega || '').trim()
  const telefono = String(body.telefono_entrega || '').trim()

  const errorNombre = validarNombreCompleto(nombre)
  if (errorNombre) throw new ErrorHttp(400, errorNombre, 'nombre_entrega')

  const errorTelefono = validarTelefonoEntrega(telefono)
  if (errorTelefono) throw new ErrorHttp(400, errorTelefono, 'telefono_entrega')

  const ubicacion = validarUbicacionCodigos(
    body.departamento_codigo,
    body.municipio_codigo
  )
  if (ubicacion.error) {
    throw new ErrorHttp(400, ubicacion.error, ubicacion.campo)
  }

  const permitidos = metodosEnvioPermitidos(ubicacion.codigoMunicipio)
  if (!permitidos.includes(metodoEnvio)) {
    const mensaje = permitidos.includes('Transportadora')
      ? 'Para municipios fuera del Valle de Aburrá el envío solo está disponible por Transportadora.'
      : 'Transportadora solo aplica fuera del Valle de Aburrá. Dentro del Valle elige Domicilio o Recoger en tienda.'
    throw new ErrorHttp(400, mensaje, 'metodo_envio')
  }

  const entrega = {
    nombreDestinatario: nombre,
    telefonoDestinatario: telefono,
    departamento: ubicacion.departamento,
    municipio: ubicacion.municipio,
  }

  if (metodoEnvio === 'Recoger en tienda') {
    // Se conserva la ubicación para validar la zona, pero no se pide
    // dirección ni barrio de entrega.
    return {
      ...entrega,
      direccion: 'Recoger en tienda',
      barrio: null,
    }
  }

  const direccion = String(body.direccion || '').trim()
  const errorDireccion = validarDireccion(direccion)
  if (errorDireccion) throw new ErrorHttp(400, errorDireccion, 'direccion')

  // Domicilio local exige barrio. En Transportadora el barrio es opcional
  // (la dirección nacional puede no incluirlo).
  let barrio = null
  if (metodoEnvio === 'Domicilio') {
    const errorBarrio = validarBarrio(body.barrio)
    if (errorBarrio) throw new ErrorHttp(400, errorBarrio, 'barrio')
    barrio = String(body.barrio).trim()
  }

  return {
    ...entrega,
    direccion,
    barrio,
  }
}

// POST / -> crea un pedido (solo Cliente). El precio lo calcula el backend.
router.post('/', soloRoles('Cliente'), async (req, res) => {
  const client = await pool.connect()

  try {
    const cantidades = normalizarItems(req.body.items)
    const { metodo_guardado } = normalizarPago(req.body)
    const metodoEnvio = normalizarEnvio(req.body)
    const entrega = validarEntrega(req.body, metodoEnvio)

    const ids = [...cantidades.keys()].sort((a, b) => a - b)

    await client.query('BEGIN')

    // Bloquea las variantes para evitar carreras de stock.
    const { rows: variantes } = await client.query(
      `SELECT pv.id_variante, pv.stock, p.precio::float8 AS precio,
              p.estado AS activo, p.nombre
       FROM producto_variante pv
       JOIN producto p ON p.id_producto = pv.id_producto
       WHERE pv.id_variante = ANY($1::int[])
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

    const subtotal = ids.reduce(
      (acumulado, id) => acumulado + mapa.get(id).precio * cantidades.get(id),
      0
    )

    // El costo de envío también lo calcula el backend. Si la tarifa está
    // pendiente se guarda NULL + pendiente=true y el total no inventa un
    // valor de envío.
    const { costo: costoEnvio, pendiente: costoEnvioPendiente } =
      calcularCostoEnvio(metodoEnvio)
    const total = subtotal + (costoEnvioPendiente ? 0 : costoEnvio)

    const { rows: pedidoRows } = await client.query(
      `INSERT INTO pedido (id_usuario, subtotal, descuento, iva, total,
                           costo_envio, costo_envio_pendiente, estado,
                           metodo_pago, estado_pago)
       VALUES ($1, $2, 0, 0, $3, $4, $5, $6, $7, $8)
       RETURNING id_pedido`,
      [
        req.usuario.id,
        subtotal,
        total,
        costoEnvioPendiente ? null : costoEnvio,
        costoEnvioPendiente,
        ESTADO_INICIAL,
        metodo_guardado,
        ESTADO_PAGO_PENDIENTE,
      ]
    )
    const idPedido = pedidoRows[0].id_pedido

    for (const id of ids) {
      const variante = mapa.get(id)
      const cantidad = cantidades.get(id)

      await client.query(
        `INSERT INTO detalle_pedido (id_pedido, id_variante, cantidad, precio_unitario)
         VALUES ($1, $2, $3, $4)`,
        [idPedido, id, cantidad, variante.precio]
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

    // El pago NO se registra aquí: el pedido nace en "Pendiente de
    // verificación" y la tienda lo confirma o rechaza desde el admin.

    await client.query(
      `INSERT INTO domicilio (id_pedido, direccion_entrega, metodo_envio, estado,
                              departamento, municipio, barrio,
                              nombre_destinatario, telefono_destinatario)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [idPedido, entrega.direccion, metodoEnvio, 'Pendiente',
       entrega.departamento, entrega.municipio, entrega.barrio,
       entrega.nombreDestinatario, entrega.telefonoDestinatario]
    )

    await client.query('COMMIT')

    const pedido = await obtenerPedidoPorId(idPedido)
    res.status(201).json(pedido)
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    if (error.status) {
      // Incluye `campo` cuando existe para que el frontend muestre el
      // mensaje bajo el input correcto (mismo patrón que auth.js).
      const detalle = error.campo ? { error: error.message, campo: error.campo } : { error: error.message }
      return res.status(error.status).json(detalle)
    }
    console.error('Error en POST /api/pedidos:', error.message)
    res.status(500).json({ error: 'No se pudo crear el pedido' })
  } finally {
    client.release()
  }
})

// POST /:id/pago/confirmar -> registra el pago y confirma la verificación.
// El monto depende del método guardado al crear el pedido: total para
// Transferencia y abono del 50 % para Contra entrega.
router.post('/:id/pago/confirmar', requierePrivilegio('Pedidos', 'Cambiar estado'), async (req, res) => {
  const id = Number.parseInt(req.params.id, 10)
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: 'Identificador inválido' })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const { rows } = await client.query(
      `SELECT id_pedido, estado, total, metodo_pago, estado_pago
         FROM pedido
        WHERE id_pedido = $1
        FOR UPDATE`,
      [id]
    )
    const pedido = rows[0]

    if (!pedido) {
      await client.query('ROLLBACK')
      return res.status(404).json({ error: 'Pedido no encontrado' })
    }
    if (pedido.estado === ESTADO_CANCELADO) {
      await client.query('ROLLBACK')
      return res.status(409).json({ error: 'El pedido está cancelado' })
    }

    const estadoPago = pedido.estado_pago || ESTADO_PAGO_NO_APLICA
    if (estadoPago === ESTADO_PAGO_CONFIRMADO) {
      await client.query('ROLLBACK')
      return res.status(409).json({ error: 'El pago ya está confirmado' })
    }
    if (estadoPago !== ESTADO_PAGO_PENDIENTE && estadoPago !== ESTADO_PAGO_RECHAZADO) {
      await client.query('ROLLBACK')
      return res.status(409).json({ error: 'El pedido no tiene un pago pendiente de verificación' })
    }
    if (!pedido.metodo_pago) {
      await client.query('ROLLBACK')
      return res.status(409).json({ error: 'El pedido no tiene un método de pago registrado' })
    }

    const { rows: pagosRows } = await client.query(
      'SELECT 1 FROM pago WHERE id_pedido = $1 LIMIT 1',
      [id]
    )
    if (pagosRows.length > 0) {
      await client.query('ROLLBACK')
      return res.status(409).json({ error: 'El pedido ya tiene pagos registrados' })
    }

    const total = Number(pedido.total)
    const monto = String(pedido.metodo_pago).startsWith('Contra entrega')
      ? Math.round(total * 0.5)
      : total

    await client.query(
      `INSERT INTO pago (id_pedido, metodo, monto)
       VALUES ($1, $2, $3)`,
      [id, pedido.metodo_pago, monto]
    )
    await client.query(
      'UPDATE pedido SET estado_pago = $1 WHERE id_pedido = $2',
      [ESTADO_PAGO_CONFIRMADO, id]
    )

    await client.query('COMMIT')

    const actualizado = await obtenerPedidoPorId(id)
    res.json(actualizado)
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    if (error.status) {
      return res.status(error.status).json({ error: error.message })
    }
    console.error('Error en POST /api/pedidos/:id/pago/confirmar:', error.message)
    res.status(500).json({ error: 'No se pudo confirmar el pago' })
  } finally {
    client.release()
  }
})

// POST /:id/pago/rechazar -> deja constancia del rechazo sin registrar pago.
router.post('/:id/pago/rechazar', requierePrivilegio('Pedidos', 'Cambiar estado'), async (req, res) => {
  const id = Number.parseInt(req.params.id, 10)
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: 'Identificador inválido' })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const { rows } = await client.query(
      `SELECT id_pedido, estado, estado_pago
         FROM pedido
        WHERE id_pedido = $1
        FOR UPDATE`,
      [id]
    )
    const pedido = rows[0]

    if (!pedido) {
      await client.query('ROLLBACK')
      return res.status(404).json({ error: 'Pedido no encontrado' })
    }
    if (pedido.estado === ESTADO_CANCELADO) {
      await client.query('ROLLBACK')
      return res.status(409).json({ error: 'El pedido está cancelado' })
    }

    const estadoPago = pedido.estado_pago || ESTADO_PAGO_NO_APLICA
    if (estadoPago !== ESTADO_PAGO_PENDIENTE) {
      await client.query('ROLLBACK')
      return res.status(409).json({ error: 'El pago no está pendiente de verificación' })
    }

    await client.query(
      'UPDATE pedido SET estado_pago = $1 WHERE id_pedido = $2',
      [ESTADO_PAGO_RECHAZADO, id]
    )

    await client.query('COMMIT')

    const actualizado = await obtenerPedidoPorId(id)
    res.json(actualizado)
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    if (error.status) {
      return res.status(error.status).json({ error: error.message })
    }
    console.error('Error en POST /api/pedidos/:id/pago/rechazar:', error.message)
    res.status(500).json({ error: 'No se pudo rechazar el pago' })
  } finally {
    client.release()
  }
})

// GET /mis -> pedidos del cliente autenticado (solo Cliente)
router.get('/mis', soloRoles('Cliente'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `${SELECT_PEDIDO} WHERE p.id_usuario = $1 ORDER BY p.id_pedido DESC`,
      [req.usuario.id]
    )
    const conItems = await adjuntarItems(rows)
    const conPagos = await adjuntarPagos(conItems)
    res.json(conPagos.map(sinDatosDocumento))
  } catch (error) {
    console.error('Error en GET /api/pedidos/mis:', error.message)
    res.status(500).json({ error: 'No se pudieron cargar tus pedidos' })
  }
})

// GET / -> lista de pedidos (requiere Pedidos:Consultar)
router.get('/', requierePrivilegio('Pedidos', 'Consultar'), async (req, res) => {
  try {
    const { rows } = await pool.query(`${SELECT_PEDIDO} ORDER BY p.id_pedido DESC`)
    const conItems = await adjuntarItems(rows)
    const conPagos = await adjuntarPagos(conItems)
    res.json(conPagos)
  } catch (error) {
    console.error('Error en GET /api/pedidos:', error.message)
    res.status(500).json({ error: 'No se pudieron cargar los pedidos' })
  }
})

// GET /:id -> detalle. El Cliente solo ve los suyos; el personal necesita Pedidos:Consultar.
const autorizarDetalle = (req, res, next) => {
  if (req.usuario?.rol === 'Cliente') return next()
  return requierePrivilegio('Pedidos', 'Consultar')(req, res, next)
}
router.get('/:id', soloRoles('Administrador', 'Vendedor', 'Cliente'), autorizarDetalle, async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10)
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'Identificador inválido' })
    }

    const pedido = await obtenerPedidoPorId(id)
    if (!pedido) {
      return res.status(404).json({ error: 'Pedido no encontrado' })
    }

    if (req.usuario.rol === 'Cliente' && pedido.id_usuario !== req.usuario.id) {
      return res.status(403).json({ error: 'No tienes permisos para acceder a este recurso' })
    }

    // documento/teléfono solo para quien tenga Pedidos:Consultar.
    res.json(req.usuario.rol === 'Cliente' ? sinDatosDocumento(pedido) : pedido)
  } catch (error) {
    console.error('Error en GET /api/pedidos/:id:', error.message)
    res.status(500).json({ error: 'No se pudo cargar el pedido' })
  }
})

// PATCH /:id/estado -> cambia el estado (requiere Pedidos:Cambiar estado)
router.patch('/:id/estado', requierePrivilegio('Pedidos', 'Cambiar estado'), async (req, res) => {
  const id = Number.parseInt(req.params.id, 10)
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: 'Identificador inválido' })
  }

  const estado = String(req.body.estado || '').trim()
  if (!ESTADOS.includes(estado)) {
    return res.status(400).json({
      error: `Estado inválido. Usa: ${ESTADOS.join(', ')}`,
    })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const { rows } = await client.query(
      'SELECT id_pedido, estado, total FROM pedido WHERE id_pedido = $1 FOR UPDATE',
      [id]
    )
    const pedido = rows[0]

    if (!pedido) {
      await client.query('ROLLBACK')
      return res.status(404).json({ error: 'Pedido no encontrado' })
    }
    if (pedido.estado === ESTADO_ENTREGADO) {
      await client.query('ROLLBACK')
      return res.status(409).json({ error: 'Un pedido Entregado no se puede modificar' })
    }
    if (pedido.estado === ESTADO_CANCELADO) {
      await client.query('ROLLBACK')
      return res.status(409).json({ error: 'El pedido ya está cancelado' })
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
    }

    // Contra entrega: al entregar se cobra el saldo restante en la MISMA
    // transacción, con el método "Contra entrega - Saldo" (sin banco). El
    // saldo se calcula con una consulta hecha después del bloqueo FOR UPDATE
    // de arriba. Otros métodos (Transferencia; históricamente Crédito) no
    // registran nada aquí.
    if (estado === ESTADO_ENTREGADO) {
      const { rows: pagosRows } = await client.query(
        'SELECT metodo FROM pago WHERE id_pedido = $1 ORDER BY id_pago LIMIT 1',
        [id]
      )
      const primerMetodo = String(pagosRows[0]?.metodo || '')

      if (primerMetodo.startsWith('Contra entrega')) {
        const { rows: saldoRows } = await client.query(
          `SELECT (p.total - COALESCE(
                     (SELECT SUM(monto) FROM pago WHERE id_pedido = p.id_pedido), 0
                   ))::float8 AS saldo
             FROM pedido p
            WHERE p.id_pedido = $1`,
          [id]
        )
        const saldo = Number(saldoRows[0]?.saldo || 0)

        if (saldo > 0) {
          await client.query(
            'INSERT INTO pago (id_pedido, metodo, monto) VALUES ($1, $2, $3)',
            [id, 'Contra entrega - Saldo', saldo]
          )
        }
      }
    }

    await client.query('UPDATE pedido SET estado = $1 WHERE id_pedido = $2', [estado, id])
    await client.query('COMMIT')

    const actualizado = await obtenerPedidoPorId(id)
    res.json(actualizado)
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    if (error.status) {
      return res.status(error.status).json({ error: error.message })
    }
    console.error('Error en PATCH /api/pedidos/:id/estado:', error.message)
    res.status(500).json({ error: 'No se pudo cambiar el estado del pedido' })
  } finally {
    client.release()
  }
})

export default router
