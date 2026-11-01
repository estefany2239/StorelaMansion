import { Router } from 'express'
import { pool } from '../config/db.js'
import {
  verificarToken,
  soloRoles,
  bloquearCambioPendiente,
  requierePrivilegio,
  requierePrivilegioAlguno,
} from '../middlewares/auth.js'
import {
  esContraEntrega,
  saldoPendiente,
  montoMinimo,
  recalcularVenta,
  registrar,
  abonoPorClave,
} from '../services/abonos.js'
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
import multer from 'multer'
import {
  guardar as guardarComprobante,
  leer as leerComprobantes,
  leerParaRevision,
  marcarAprobado,
  marcarRechazado,
  resumen as resumenComprobantes,
  detectarTipoComprobante,
  MAX_BYTES_COMPROBANTE,
  MAX_INTENTOS_COMPROBANTE,
} from '../services/comprobantes.js'
import {
  enviarCorreo,
  plantillaPagoAprobado,
  plantillaPagoRechazado,
} from '../services/correos.js'

const router = Router()

// Todos los endpoints exigen token y que no haya un cambio de contraseña pendiente
router.use(verificarToken, bloquearCambioPendiente)

// Estados permitidos para los pedidos (coherentes con el panel admin).
// `estado` en la tabla pedido es varchar sin CHECK, por eso se valida aquí.
const ESTADOS = ['Registrado', 'En preparación', 'Despachado', 'Entregado', 'Cancelado']
const ESTADO_INICIAL = 'Registrado'
const ESTADO_EN_PREPARACION = 'En preparación'
const ESTADO_DESPACHADO = 'Despachado'
const ESTADO_CANCELADO = 'Cancelado'
const ESTADO_ENTREGADO = 'Entregado'

const SIGUIENTE_ESTADO = {
  [ESTADO_INICIAL]: ESTADO_EN_PREPARACION,
  [ESTADO_EN_PREPARACION]: ESTADO_DESPACHADO,
  [ESTADO_DESPACHADO]: ESTADO_ENTREGADO,
}

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

// Envía el correo de la decisión DESPUÉS del COMMIT y deja constancia en
// notificacion_correo. La fila se reserva antes del envío con el UNIQUE
// (id_comprobante, tipo): si ya existe, no se vuelve a enviar. Un fallo de
// Brevo se guarda como Fallido con su error y NUNCA revierte la decisión.
const notificarDecisionComprobante = async ({
  tipo,
  idPedido,
  idComprobante,
  motivo = null,
}) => {
  const { rows } = await pool.query(
    `SELECT p.id_pedido, u.correo,
            TRIM(u.nombres || ' ' || u.apellidos) AS nombre
       FROM pedido p
       JOIN usuario u ON u.id_usuario = p.id_usuario
      WHERE p.id_pedido = $1`,
    [idPedido]
  )
  const datos = rows[0]
  if (!datos?.correo) return false

  const plantilla =
    tipo === 'pago_aprobado'
      ? plantillaPagoAprobado({
          nombre: datos.nombre,
          numeroPedido: datos.id_pedido,
        })
      : plantillaPagoRechazado({
          nombre: datos.nombre,
          numeroPedido: datos.id_pedido,
          motivo,
        })

  const reserva = await pool.query(
    `INSERT INTO notificacion_correo
       (id_pedido, id_comprobante, tipo, destinatario, estado, error)
     VALUES ($1, $2, $3, $4, 'Fallido', 'Envío no completado')
     ON CONFLICT (id_comprobante, tipo) DO NOTHING
     RETURNING id`,
    [idPedido, idComprobante, tipo, datos.correo]
  )

  if (reserva.rows.length === 0) return false
  const idNotificacion = reserva.rows[0].id

  try {
    await enviarCorreo({
      para: datos.correo,
      asunto: plantilla.asunto,
      html: plantilla.html,
      texto: plantilla.texto,
    })
    await pool.query(
      `UPDATE notificacion_correo
          SET estado = 'Enviado', error = NULL, enviado_en = now()
        WHERE id = $1`,
      [idNotificacion]
    )
    return true
  } catch (error) {
    await pool
      .query(
        `UPDATE notificacion_correo SET estado = 'Fallido', error = $2 WHERE id = $1`,
        [idNotificacion, String(error.message || 'Error al enviar el correo').slice(0, 2000)]
      )
      .catch(() => {})
    return false
  }
}

const subidaComprobante = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES_COMPROBANTE, files: 1 },
})

const recibirComprobante = (req, res, next) => {
  subidaComprobante.single('comprobante')(req, res, (error) => {
    if (!error) return next()

    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
          error: 'El comprobante supera el tamaño máximo de 2 MB',
        })
      }
      if (error.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({
          error: 'Campo de archivo inesperado. Envía el comprobante en el campo "comprobante"',
        })
      }
      return res.status(400).json({
        error: 'No se pudo procesar el comprobante adjunto',
      })
    }

    console.error('Error al recibir el comprobante:', error.message)
    res.status(400).json({ error: 'No se pudo procesar el comprobante adjunto' })
  })
}

const autorizarConsultaComprobantes = async (req, res, next) => {
  const id = Number.parseInt(req.params.id, 10)
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: 'Identificador inválido' })
  }

  try {
    const { rows } = await pool.query(
      'SELECT id_usuario FROM pedido WHERE id_pedido = $1',
      [id]
    )
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Pedido no encontrado' })
    }

    if (req.usuario?.rol === 'Cliente') {
      if (rows[0].id_usuario !== req.usuario.id) {
        return res.status(403).json({ error: 'No tienes permisos para acceder a este recurso' })
      }
      return next()
    }

    return requierePrivilegio('Pedidos', 'Consultar')(req, res, next)
  } catch (error) {
    console.error('Error al autorizar comprobantes:', error.message)
    res.status(500).json({ error: 'No se pudieron verificar los permisos' })
  }
}

// Historial de abonos de un pedido: el Cliente solo ve los suyos; el personal
// basta con Abonos:Consultar o Pedidos:Consultar.
const autorizarAbonosPedido = async (req, res, next) => {
  const id = Number.parseInt(req.params.id, 10)
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: 'Identificador inválido' })
  }

  try {
    if (req.usuario?.rol !== 'Cliente') {
      return requierePrivilegioAlguno('Abonos:Consultar', 'Pedidos:Consultar')(req, res, next)
    }

    const { rows } = await pool.query(
      'SELECT id_usuario FROM pedido WHERE id_pedido = $1',
      [id]
    )
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Pedido no encontrado' })
    }
    if (rows[0].id_usuario !== req.usuario.id) {
      return res.status(403).json({ error: 'No tienes permisos para acceder a este recurso' })
    }
    return next()
  } catch (error) {
    console.error('Error al autorizar abonos:', error.message)
    res.status(500).json({ error: 'No se pudieron verificar los permisos' })
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
      if (cantidad > variante.stock) {
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

    // La venta del pedido se crea en la MISMA transacción. El stock ya se
    // descontó arriba con el pedido: aquí no se vuelve a tocar.
    const { rows: ventaRows } = await client.query(
      `INSERT INTO venta (id_pedido, id_cliente, nombre_cliente, id_vendedor,
                          fecha, metodo_pago, estado, total, origen,
                          estado_pago, fecha_pago)
       SELECT p.id_pedido,
              p.id_usuario,
              TRIM(u.nombres || ' ' || u.apellidos),
              NULL,
              p.fecha,
              p.metodo_pago,
              'Completada',
              p.total,
              'Tienda virtual',
              'Pendiente',
              NULL
         FROM pedido p
         JOIN usuario u ON u.id_usuario = p.id_usuario
        WHERE p.id_pedido = $1
       ON CONFLICT (id_pedido) DO NOTHING
       RETURNING id_venta`,
      [idPedido]
    )

    if (ventaRows.length > 0) {
      await client.query(
        `INSERT INTO detalle_venta (id_venta, id_variante, cantidad, precio_unitario)
         SELECT $1, id_variante, cantidad, precio_unitario
           FROM detalle_pedido
          WHERE id_pedido = $2`,
        [ventaRows[0].id_venta, idPedido]
      )
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
    const monto = esContraEntrega(pedido.metodo_pago)
      ? Math.round(total * 0.5)
      : total

    // Toda escritura de abonos pasa por services/abonos.js: inserta el pago y
    // recalcula venta.estado_pago en la misma transacción (pedido ya
    // bloqueado con FOR UPDATE arriba).
    await registrar(client, {
      idPedido: id,
      registradoPor: req.usuario?.id || null,
      monto,
      metodo: pedido.metodo_pago,
    })
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

router.post(
  '/:id/comprobantes',
  soloRoles('Cliente'),
  recibirComprobante,
  async (req, res) => {
    const id = Number.parseInt(req.params.id, 10)
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'Identificador inválido' })
    }

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      const { rows } = await client.query(
        `SELECT id_pedido, id_usuario, estado
           FROM pedido
          WHERE id_pedido = $1
          FOR UPDATE`,
        [id]
      )
      const pedido = rows[0]

      if (!pedido) {
        throw new ErrorHttp(404, 'Pedido no encontrado')
      }
      if (pedido.id_usuario !== req.usuario.id) {
        throw new ErrorHttp(403, 'No tienes permisos para acceder a este recurso')
      }
      if (pedido.estado === ESTADO_CANCELADO) {
        throw new ErrorHttp(409, 'El pedido está cancelado')
      }
      if (pedido.estado !== ESTADO_INICIAL) {
        throw new ErrorHttp(409, 'Solo se puede subir el comprobante a un pedido Registrado')
      }

      const resumen = await resumenComprobantes(id, client)

      if (resumen.pendiente) {
        throw new ErrorHttp(409, 'Ya existe un comprobante pendiente de revisión para este pedido')
      }
      if (resumen.aprobado) {
        throw new ErrorHttp(409, 'El pago de este pedido ya fue aprobado')
      }
      if (resumen.intentos >= MAX_INTENTOS_COMPROBANTE) {
        throw new ErrorHttp(409, 'Se alcanzó el máximo de 3 intentos para este pedido')
      }

      if (!req.file) {
        throw new ErrorHttp(400, 'Adjunta el comprobante en el campo "comprobante"')
      }
      if (!req.file.size) {
        throw new ErrorHttp(400, 'El archivo está vacío')
      }
      if (req.file.size > MAX_BYTES_COMPROBANTE) {
        throw new ErrorHttp(413, 'El comprobante supera el tamaño máximo de 2 MB')
      }

      const tipoMime = detectarTipoComprobante(req.file.buffer)
      if (!tipoMime) {
        throw new ErrorHttp(
          400,
          'El comprobante debe ser una imagen JPEG, PNG o WEBP, o un PDF válido'
        )
      }

      const comprobante = await guardarComprobante(
        {
          idPedido: id,
          subidoPor: req.usuario.id,
          contenido: req.file.buffer,
          tipoMime,
          nombreOriginal: req.file.originalname,
          intento: resumen.siguiente_intento,
        },
        client
      )

      await client.query(
        'UPDATE pedido SET estado_pago = $1 WHERE id_pedido = $2',
        [ESTADO_PAGO_PENDIENTE, id]
      )

      await client.query('COMMIT')
      res.status(201).json(comprobante)
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {})
      if (error.status) {
        return res.status(error.status).json({ error: error.message })
      }
      if (error.code === '23505') {
        return res.status(409).json({
          error: 'Ya existe un comprobante pendiente o aprobado para este pedido',
        })
      }
      console.error('Error en POST /api/pedidos/:id/comprobantes:', error.message)
      res.status(500).json({ error: 'No se pudo guardar el comprobante' })
    } finally {
      client.release()
    }
  }
)

// POST /:id/comprobantes/:idc/aprobar -> confirma el pago del pedido y deja
// la venta Pagada (salvo Contra entrega, que se cobra al entregar).
router.post(
  '/:id/comprobantes/:idc/aprobar',
  requierePrivilegio('Pedidos', 'Actualizar'),
  async (req, res) => {
    const id = Number.parseInt(req.params.id, 10)
    const idc = Number.parseInt(req.params.idc, 10)
    if (Number.isNaN(id) || Number.isNaN(idc)) {
      return res.status(400).json({ error: 'Identificador inválido' })
    }

    const client = await pool.connect()
    let comprobanteRevisado = null
    try {
      await client.query('BEGIN')

      const { rows } = await client.query(
        `SELECT id_pedido, estado, total, estado_pago, metodo_pago
           FROM pedido
          WHERE id_pedido = $1
          FOR UPDATE`,
        [id]
      )
      const pedido = rows[0]

      if (!pedido) {
        throw new ErrorHttp(404, 'Pedido no encontrado')
      }
      if (pedido.estado === ESTADO_CANCELADO) {
        throw new ErrorHttp(409, 'El pedido está cancelado')
      }

      const comprobante = await leerParaRevision(id, idc, client)
      if (!comprobante) {
        throw new ErrorHttp(404, 'Comprobante no encontrado')
      }
      if (comprobante.estado !== 'Pendiente') {
        throw new ErrorHttp(409, 'El comprobante ya fue revisado')
      }

      comprobanteRevisado = await marcarAprobado(id, idc, req.usuario.id, client)
      if (!comprobanteRevisado) {
        throw new ErrorHttp(409, 'El comprobante ya fue revisado')
      }

      await client.query(
        `UPDATE pedido
            SET estado_pago = $1,
                estado = CASE WHEN estado = $2 THEN $3 ELSE estado END
          WHERE id_pedido = $4`,
        [ESTADO_PAGO_CONFIRMADO, ESTADO_INICIAL, ESTADO_EN_PREPARACION, id]
      )

      // Contra entrega: el PRIMER abono (50 % redondeado a pesos) se calcula
      // SIEMPRE en el servidor, con id_comprobante; nunca con un valor que
      // mande el cliente. Se registra solo si no hay pagos previos para no
      // superar el saldo. La venta queda Pagada cuando el saldo llegue a 0
      // (recalcularVenta, al registrarse el abono o al entregarse).
      if (esContraEntrega(pedido.metodo_pago)) {
        const saldoAlAprobar = await saldoPendiente(client, id)
        if (saldoAlAprobar > 0) {
          await registrar(client, {
            idPedido: id,
            registradoPor: req.usuario.id,
            monto: Math.min(Math.round(Number(pedido.total) * 0.5), saldoAlAprobar),
            metodo: pedido.metodo_pago,
            observacion: 'Abono parcial',
            idComprobante: idc,
          })
        }
      } else {
        await client.query(
          `UPDATE venta
              SET estado_pago = 'Pagada',
                  fecha_pago = COALESCE(fecha_pago, CURRENT_DATE)
            WHERE id_pedido = $1
              AND estado_pago <> 'Pagada'`,
          [id]
        )
      }

      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {})
      if (error.status) {
        return res.status(error.status).json({ error: error.message })
      }
      console.error('Error en POST /api/pedidos/:id/comprobantes/:idc/aprobar:', error.message)
      return res.status(500).json({ error: 'No se pudo aprobar el comprobante' })
    } finally {
      client.release()
    }

    // A partir de aquí la decisión ya está confirmada: un fallo del correo
    // solo se informa y queda registrado, nunca revierte la aprobación.
    let correoEnviado = false
    try {
      correoEnviado = await notificarDecisionComprobante({
        tipo: 'pago_aprobado',
        idPedido: id,
        idComprobante: idc,
      })
    } catch (error) {
      console.error('Error al registrar la notificación de pago aprobado:', error.message)
    }

    try {
      const actualizado = await obtenerPedidoPorId(id)
      const comprobanteActualizado = await leerComprobantes(id, { idComprobante: idc })
      return res.json({
        ...actualizado,
        comprobante: comprobanteActualizado,
        correo_enviado: correoEnviado,
      })
    } catch (error) {
      console.error('Error al cargar el pedido tras aprobar el comprobante:', error.message)
      return res.json({
        id,
        comprobante: comprobanteRevisado,
        correo_enviado: correoEnviado,
      })
    }
  }
)

// POST /:id/comprobantes/:idc/rechazar -> deja el pedido Registrado y el pago
// rechazado, sin tocar stock ni cancelar nada. El cliente puede subir otro.
router.post(
  '/:id/comprobantes/:idc/rechazar',
  requierePrivilegio('Pedidos', 'Actualizar'),
  async (req, res) => {
    const id = Number.parseInt(req.params.id, 10)
    const idc = Number.parseInt(req.params.idc, 10)
    if (Number.isNaN(id) || Number.isNaN(idc)) {
      return res.status(400).json({ error: 'Identificador inválido' })
    }

    const motivo = String(req.body?.motivo || '').trim()
    if (motivo.length < 5 || motivo.length > 300) {
      return res.status(400).json({
        error: 'El motivo del rechazo debe tener entre 5 y 300 caracteres',
        campo: 'motivo',
      })
    }

    const client = await pool.connect()
    let comprobanteRevisado = null
    try {
      await client.query('BEGIN')

      const { rows } = await client.query(
        `SELECT id_pedido, estado, estado_pago, metodo_pago
           FROM pedido
          WHERE id_pedido = $1
          FOR UPDATE`,
        [id]
      )
      const pedido = rows[0]

      if (!pedido) {
        throw new ErrorHttp(404, 'Pedido no encontrado')
      }
      if (pedido.estado === ESTADO_CANCELADO) {
        throw new ErrorHttp(409, 'El pedido está cancelado')
      }

      const comprobante = await leerParaRevision(id, idc, client)
      if (!comprobante) {
        throw new ErrorHttp(404, 'Comprobante no encontrado')
      }
      if (comprobante.estado !== 'Pendiente') {
        throw new ErrorHttp(409, 'El comprobante ya fue revisado')
      }

      comprobanteRevisado = await marcarRechazado(id, idc, req.usuario.id, motivo, client)
      if (!comprobanteRevisado) {
        throw new ErrorHttp(409, 'El comprobante ya fue revisado')
      }

      await client.query(
        'UPDATE pedido SET estado_pago = $1 WHERE id_pedido = $2',
        [ESTADO_PAGO_RECHAZADO, id]
      )

      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {})
      if (error.status) {
        return res.status(error.status).json({ error: error.message })
      }
      console.error('Error en POST /api/pedidos/:id/comprobantes/:idc/rechazar:', error.message)
      return res.status(500).json({ error: 'No se pudo rechazar el comprobante' })
    } finally {
      client.release()
    }

    let correoEnviado = false
    try {
      correoEnviado = await notificarDecisionComprobante({
        tipo: 'pago_rechazado',
        idPedido: id,
        idComprobante: idc,
        motivo,
      })
    } catch (error) {
      console.error('Error al registrar la notificación de pago rechazado:', error.message)
    }

    try {
      const actualizado = await obtenerPedidoPorId(id)
      const comprobanteActualizado = await leerComprobantes(id, { idComprobante: idc })
      return res.json({
        ...actualizado,
        comprobante: comprobanteActualizado,
        correo_enviado: correoEnviado,
      })
    } catch (error) {
      console.error('Error al cargar el pedido tras rechazar el comprobante:', error.message)
      return res.json({
        id,
        comprobante: comprobanteRevisado,
        correo_enviado: correoEnviado,
      })
    }
  }
)

router.get(
  '/:id/comprobantes',
  autorizarConsultaComprobantes,
  async (req, res) => {
    const id = Number.parseInt(req.params.id, 10)

    try {
      const historial = await leerComprobantes(id)
      res.json(historial)
    } catch (error) {
      console.error('Error en GET /api/pedidos/:id/comprobantes:', error.message)
      res.status(500).json({ error: 'No se pudo cargar el historial de comprobantes' })
    }
  }
)

router.get(
  '/:id/comprobantes/:idc/archivo',
  autorizarConsultaComprobantes,
  async (req, res) => {
    const id = Number.parseInt(req.params.id, 10)
    const idc = Number.parseInt(req.params.idc, 10)
    if (Number.isNaN(idc)) {
      return res.status(400).json({ error: 'Identificador inválido' })
    }

    try {
      const archivo = await leerComprobantes(id, {
        idComprobante: idc,
        incluirContenido: true,
      })

      if (!archivo || !archivo.contenido) {
        return res.status(404).json({ error: 'Comprobante no encontrado' })
      }

      const nombre = String(archivo.nombre_original || 'comprobante').replace(/["\\]/g, '_')
      res.set({
        'Content-Type': archivo.tipo_mime,
        'Content-Disposition': `inline; filename="${nombre}"`,
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'private, no-store',
      })
      res.send(archivo.contenido)
    } catch (error) {
      console.error('Error en GET /api/pedidos/:id/comprobantes/:idc/archivo:', error.message)
      res.status(500).json({ error: 'No se pudo cargar el comprobante' })
    }
  }
)

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

    if (estado !== ESTADO_CANCELADO) {
      const siguiente = SIGUIENTE_ESTADO[pedido.estado]
      if (siguiente !== estado) {
        await client.query('ROLLBACK')
        return res.status(409).json({
          error: siguiente
            ? `Transición inválida de "${pedido.estado}" a "${estado}". El siguiente estado permitido es "${siguiente}".`
            : `Transición inválida desde "${pedido.estado}".`,
        })
      }

      if (estado === ESTADO_EN_PREPARACION) {
        const estadoPago = pedido.estado_pago || ESTADO_PAGO_NO_APLICA
        const metodo = String(pedido.metodo_pago || '')
        const contraEntrega = metodo.startsWith('Contra entrega')
        const pagoValidado =
          estadoPago === ESTADO_PAGO_CONFIRMADO || estadoPago === ESTADO_PAGO_NO_APLICA

        if (!contraEntrega && !pagoValidado) {
          await client.query('ROLLBACK')
          return res.status(409).json({
            error: `No se puede pasar a "${ESTADO_EN_PREPARACION}": el pago debe estar confirmado.`,
          })
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
      const esCE = esContraEntrega(
        pedido.metodo_pago || pagosRows[0]?.metodo || ''
      )

      if (esCE) {
        const saldoAlEntregar = await saldoPendiente(client, id)
        if (saldoAlEntregar > 0) {
          await registrar(client, {
            idPedido: id,
            registradoPor: req.usuario.id,
            monto: saldoAlEntregar,
            metodo: 'Contra entrega - Saldo',
            observacion: 'Saldo al entregar',
          })
        }
        await recalcularVenta(client, id)
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

// GET /:id/abonos -> historial inmutable de pagos (el más reciente primero)
// y totales. Cliente: solo los suyos. Personal: Abonos:Consultar o
// Pedidos:Consultar. No existen rutas para editar ni borrar pagos.
router.get('/:id/abonos', autorizarAbonosPedido, async (req, res) => {
  const id = Number.parseInt(req.params.id, 10)
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: 'Identificador inválido' })
  }

  try {
    const { rows: abonos } = await pool.query(
      `SELECT pa.id_pago AS id,
              TO_CHAR(pa.fecha, 'YYYY-MM-DD') AS fecha,
              TO_CHAR(pa.registrado_en, 'YYYY-MM-DD HH24:MI:SS') AS fecha_hora,
              pa.registrado_en,
              pa.metodo,
              pa.monto::float8 AS monto,
              pa.referencia,
              pa.id_comprobante,
              pa.observacion,
              TRIM(ru.nombres || ' ' || ru.apellidos) AS usuario
         FROM pago pa
         LEFT JOIN usuario ru ON ru.id_usuario = pa.registrado_por
        WHERE pa.id_pedido = $1
        ORDER BY pa.registrado_en DESC, pa.id_pago DESC`,
      [id]
    )

    const { rows: totalesRows } = await pool.query(
      `SELECT total::float8 AS total,
              total_abonado::float8 AS total_abonado,
              saldo_pendiente::float8 AS saldo_pendiente,
              porcentaje_pagado,
              estado_monto,
              cantidad_pagos
         FROM pedido_abonos
        WHERE id_pedido = $1`,
      [id]
    )
    let totales = totalesRows[0]

    if (!totales || !totales.total) {
      const { rows: existe } = await pool.query(
        'SELECT 1 FROM pedido WHERE id_pedido = $1',
        [id]
      )
      if (existe.length === 0) {
        return res.status(404).json({ error: 'Pedido no encontrado' })
      }
      const { rows: fallback } = await pool.query(
        `SELECT total::float8 AS total,
                COALESCE((SELECT SUM(monto) FROM pago WHERE id_pedido = p.id_pedido), 0)::float8
                  AS total_abonado
           FROM pedido p
          WHERE p.id_pedido = $1`,
        [id]
      )
      const saldo = Number(fallback[0].total) - Number(fallback[0].total_abonado)
      totales = {
        total: Number(fallback[0].total),
        total_abonado: Number(fallback[0].total_abonado),
        saldo_pendiente: saldo,
        porcentaje_pagado:
          Number(fallback[0].total) > 0
            ? Math.round((Number(fallback[0].total_abonado) / Number(fallback[0].total)) * 100)
            : 0,
        estado_monto: saldo <= 0 ? 'Pagado' : 'Abono parcial',
        cantidad_pagos: abonos.length,
      }
    }

    res.json({ abonos, totales })
  } catch (error) {
    console.error('Error en GET /api/pedidos/:id/abonos:', error.message)
    res.status(500).json({ error: 'No se pudo cargar el historial de abonos' })
  }
})

// POST /:id/abonos -> registra un abono nuevo (Abonos:Crear). Solo pedidos de
// contra entrega no cancelados. En UNA transacción: bloquea el pedido con
// FOR UPDATE, valida monto (positivo, >= mínimo y <= saldo) y escribe a
// través de services/abonos.js, que además recalcula venta.estado_pago.
// El historial es inmutable: esta es la única forma de crear abonos.
router.post('/:id/abonos', requierePrivilegio('Abonos', 'Crear'), async (req, res) => {
  const id = Number.parseInt(req.params.id, 10)
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: 'Identificador inválido' })
  }

  try {
    const crudo = Number(req.body?.monto)
    if (!Number.isFinite(crudo) || crudo <= 0) {
      return res.status(400).json({
        error: 'El abono debe ser un monto positivo',
        campo: 'monto',
      })
    }
    if (crudo > 999999999) {
      return res.status(400).json({
        error: 'El abono excede el máximo permitido (999999999)',
        campo: 'monto',
      })
    }
    const monto = Math.round(crudo * 100) / 100

    const metodo = String(req.body?.metodo || '').trim()
    if (!['Efectivo', 'Transferencia'].includes(metodo)) {
      return res.status(400).json({
        error: 'El método del abono debe ser Efectivo o Transferencia',
        campo: 'metodo',
      })
    }

    const referencia = String(req.body?.referencia || '').trim().slice(0, 100) || null
    const observacion = String(req.body?.observacion || '').trim().slice(0, 500) || null
    const clave = String(req.body?.clave_idempotencia || '').trim().slice(0, 80) || null

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      const { rows } = await client.query(
        `SELECT id_pedido, estado, metodo_pago
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
        return res.status(409).json({ error: 'Un pedido cancelado no admite abonos' })
      }
      if (!esContraEntrega(pedido.metodo_pago)) {
        await client.query('ROLLBACK')
        return res.status(400).json({
          error: 'Los abonos solo aplican a pedidos de contra entrega; los de transferencia pagan el 100 %',
        })
      }

      // Idempotencia: repetir la misma clave devuelve el mismo resultado sin
      // duplicar (el pago es inmutable; solo se vuelve a leer y responder).
      if (clave) {
        const previo = await abonoPorClave(client, clave)
        if (previo) {
          if (previo.id_pedido !== id) {
            await client.query('ROLLBACK')
            return res.status(409).json({ error: 'La clave de idempotencia ya fue usada en otro pedido' })
          }
          const saldo = await saldoPendiente(client, id)
          const { rows: ventaRows } = await client.query(
            `SELECT estado_pago, TO_CHAR(fecha_pago, 'YYYY-MM-DD') AS fecha_pago
               FROM venta WHERE id_pedido = $1`,
            [id]
          )
          const { rows: estadoRows } = await client.query(
            `SELECT total::float8 AS total, total_abonado::float8 AS total_abonado,
                    saldo_pendiente::float8 AS saldo_pendiente,
                    porcentaje_pagado, estado_monto
               FROM pedido_abonos WHERE id_pedido = $1`,
            [id]
          )
          await client.query('COMMIT')
          return res.status(201).json({
            abono: previo,
            pedido: estadoRows[0] || null,
            venta: ventaRows[0] || null,
            saldo_pendiente: saldo,
          })
        }
      }

      const saldoActual = await saldoPendiente(client, id)
      const minimo = await montoMinimo(client)
      if (monto < minimo) {
        await client.query('ROLLBACK')
        return res.status(400).json({
          error: `El abono debe ser mayor o igual a $${minimo}`,
          campo: 'monto',
        })
      }
      if (monto > saldoActual) {
        await client.query('ROLLBACK')
        return res.status(400).json({
          error: 'El abono no puede superar el saldo pendiente del pedido',
          campo: 'monto',
        })
      }

      const registrado = await registrar(client, {
        idPedido: id,
        registradoPor: req.usuario.id,
        monto,
        metodo,
        observacion,
        referencia,
        claveIdempotencia: clave,
      })
      await client.query('COMMIT')

      const { rows: estadoRows } = await pool.query(
        `SELECT total::float8 AS total, total_abonado::float8 AS total_abonado,
                saldo_pendiente::float8 AS saldo_pendiente,
                porcentaje_pagado, estado_monto
           FROM pedido_abonos WHERE id_pedido = $1`,
        [id]
      )
      return res.status(201).json({
        abono: registrado.abono,
        pedido: estadoRows[0] || null,
        venta: registrado.venta,
        saldo_pendiente: registrado.saldo,
      })
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {})
      throw error
    } finally {
      client.release()
    }
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message })
    }
    console.error('Error en POST /api/pedidos/:id/abonos:', error.message)
    res.status(500).json({ error: 'No se pudo registrar el abono' })
  }
})

export default router
