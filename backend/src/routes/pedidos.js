import { Router } from 'express'
import { pool } from '../db.js'
import { verificarToken, soloRoles, bloquearCambioPendiente, requierePrivilegio } from '../middlewares/auth.js'

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
// mantiene intacto).
const METODOS = ['Transferencia', 'Crédito', 'Contra entrega']
const BANCOS = ['Nequi', 'Bancolombia']
const METODOS_ENVIO = ['Domicilio', 'Recoger en tienda']

// Error con código HTTP para responder desde los catch.
class ErrorHttp extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
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
         p.estado,
         TRIM(u.nombres || ' ' || u.apellidos) AS cliente,
         u.correo AS cliente_correo,
         u.tipo_documento,
         u.documento,
         u.telefono,
         (SELECT metodo FROM pago WHERE id_pedido = p.id_pedido ORDER BY id_pago LIMIT 1) AS metodo_pago,
         (SELECT COALESCE(SUM(monto), 0)::float8 FROM pago WHERE id_pedido = p.id_pedido) AS monto_pagado,
         (p.total - (SELECT COALESCE(SUM(monto), 0) FROM pago WHERE id_pedido = p.id_pedido))::float8 AS saldo,
         (SELECT direccion_entrega FROM domicilio WHERE id_pedido = p.id_pedido ORDER BY id_domicilio LIMIT 1) AS direccion,
         (SELECT metodo_envio FROM domicilio WHERE id_pedido = p.id_pedido ORDER BY id_domicilio LIMIT 1) AS metodo_envio
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

  if (!METODOS.includes(metodo)) {
    throw new ErrorHttp(400, 'Método de pago inválido. Usa: Transferencia, Crédito o Contra entrega')
  }

  if (metodo === 'Transferencia') {
    const banco = String(body.banco || body.transferencia_banco || '').trim()
    if (!BANCOS.includes(banco)) {
      throw new ErrorHttp(400, 'Para transferencia indica el banco: Nequi o Bancolombia')
    }
    return { metodo_pago: metodo, metodo_guardado: `Transferencia - ${banco}` }
  }

  // Contra entrega cobra el abono del 50 % por transferencia, con las mismas
  // instrucciones y el mismo banco que una transferencia normal.
  if (metodo === 'Contra entrega') {
    const banco = String(body.banco || body.transferencia_banco || '').trim()
    if (!BANCOS.includes(banco)) {
      throw new ErrorHttp(400, 'Para contra entrega indica el banco del abono: Nequi o Bancolombia')
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

// Texto que se guarda en domicilio.direccion_entrega (varchar 255).
// Con "Recoger en tienda" el destino es ese texto + nombre y teléfono del
// checkout; con "Domicilio" se recibe ya construido desde el frontend.
const construirDestino = (body, metodoEnvio) => {
  if (metodoEnvio === 'Recoger en tienda') {
    const nombre = String(body.nombre_entrega || '').trim()
    const telefono = String(body.telefono_entrega || '').trim()

    let texto = 'Recoger en tienda'
    if (nombre) texto += ` | Nombre: ${nombre}`
    if (telefono) texto += ` | Teléfono: ${telefono}`

    return texto.slice(0, 255)
  }

  const direccion = String(body.direccion || '').trim()
  if (!direccion) {
    throw new ErrorHttp(400, 'La dirección de entrega es obligatoria')
  }
  if (direccion.length > 255) {
    throw new ErrorHttp(400, 'Los datos de entrega superan el máximo permitido (255 caracteres)')
  }

  return direccion
}

// POST / -> crea un pedido (solo Cliente). El precio lo calcula el backend.
router.post('/', soloRoles('Cliente'), async (req, res) => {
  const client = await pool.connect()

  try {
    const cantidades = normalizarItems(req.body.items)
    const { metodo_pago, metodo_guardado } = normalizarPago(req.body)
    const metodoEnvio = normalizarEnvio(req.body)
    const direccion = construirDestino(req.body, metodoEnvio)

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

    const total = ids.reduce(
      (acumulado, id) => acumulado + mapa.get(id).precio * cantidades.get(id),
      0
    )

    const { rows: pedidoRows } = await client.query(
      `INSERT INTO pedido (id_usuario, subtotal, descuento, iva, total, estado)
       VALUES ($1, $2, 0, 0, $3, $4)
       RETURNING id_pedido`,
      [req.usuario.id, total, total, ESTADO_INICIAL]
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

    // Crédito deja saldo pendiente (monto 0); Contra entrega cobra el abono
    // del 50 % redondeado; el resto registra el pago completo.
    const monto =
      metodo_pago === 'Crédito'
        ? 0
        : metodo_pago === 'Contra entrega'
          ? Math.round(total * 0.5)
          : total
    await client.query(
      `INSERT INTO pago (id_pedido, metodo, monto)
       VALUES ($1, $2, $3)`,
      [idPedido, metodo_guardado, monto]
    )

    await client.query(
      `INSERT INTO domicilio (id_pedido, direccion_entrega, metodo_envio, estado)
       VALUES ($1, $2, $3, $4)`,
      [idPedido, direccion, metodoEnvio, 'Pendiente']
    )

    await client.query('COMMIT')

    const pedido = await obtenerPedidoPorId(idPedido)
    res.status(201).json(pedido)
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    if (error.status) {
      return res.status(error.status).json({ error: error.message })
    }
    console.error('Error en POST /api/pedidos:', error.message)
    res.status(500).json({ error: 'No se pudo crear el pedido' })
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
    // de arriba. Crédito no registra nada aquí (queda como hasta ahora).
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
