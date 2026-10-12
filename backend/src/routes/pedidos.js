import { Router } from 'express'
import { pool } from '../db.js'
import { verificarToken, soloRoles } from '../middlewares/auth.js'

const router = Router()

// Todos los endpoints exigen token
router.use(verificarToken)

// Estados permitidos para los pedidos (coherentes con el panel admin).
// `estado` en la tabla pedido es varchar sin CHECK, por eso se valida aquí.
const ESTADOS = ['Registrado', 'En preparación', 'Despachado', 'Entregado', 'Cancelado']
const ESTADO_INICIAL = 'Registrado'
const ESTADO_CANCELADO = 'Cancelado'
const ESTADO_ENTREGADO = 'Entregado'

const METODOS = ['Efectivo', 'Transferencia', 'Crédito']
const BANCOS = ['Nequi', 'Bancolombia']

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
         (SELECT metodo FROM pago WHERE id_pedido = p.id_pedido ORDER BY id_pago LIMIT 1) AS metodo_pago,
         (SELECT monto::float8 FROM pago WHERE id_pedido = p.id_pedido ORDER BY id_pago LIMIT 1) AS monto_pagado,
         (SELECT direccion_entrega FROM domicilio WHERE id_pedido = p.id_pedido ORDER BY id_domicilio LIMIT 1) AS direccion
  FROM pedido p
  JOIN usuario u ON u.id_usuario = p.id_usuario
`

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

const obtenerPedidoPorId = async (id) => {
  const { rows } = await pool.query(`${SELECT_PEDIDO} WHERE p.id_pedido = $1`, [id])
  if (rows.length === 0) return null
  const [pedido] = await adjuntarItems(rows)
  return pedido
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
    throw new ErrorHttp(400, 'Método de pago inválido. Usa: Efectivo, Transferencia o Crédito')
  }

  if (metodo === 'Transferencia') {
    const banco = String(body.banco || body.transferencia_banco || '').trim()
    if (!BANCOS.includes(banco)) {
      throw new ErrorHttp(400, 'Para transferencia indica el banco: Nequi o Bancolombia')
    }
    return { metodo_pago: metodo, metodo_guardado: `Transferencia - ${banco}` }
  }

  return { metodo_pago: metodo, metodo_guardado: metodo }
}

// POST / -> crea un pedido (solo Cliente). El precio lo calcula el backend.
router.post('/', soloRoles('Cliente'), async (req, res) => {
  const client = await pool.connect()

  try {
    const cantidades = normalizarItems(req.body.items)
    const { metodo_pago, metodo_guardado } = normalizarPago(req.body)

    const direccion = String(req.body.direccion || '').trim()
    if (!direccion) {
      throw new ErrorHttp(400, 'La dirección de entrega es obligatoria')
    }

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

    // Crédito deja saldo pendiente (monto 0); el resto registra el pago completo.
    const monto = metodo_pago === 'Crédito' ? 0 : total
    await client.query(
      `INSERT INTO pago (id_pedido, metodo, monto)
       VALUES ($1, $2, $3)`,
      [idPedido, metodo_guardado, monto]
    )

    await client.query(
      `INSERT INTO domicilio (id_pedido, direccion_entrega, estado)
       VALUES ($1, $2, $3)`,
      [idPedido, direccion, 'Pendiente']
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
    const pedidos = await adjuntarItems(rows)
    res.json(pedidos)
  } catch (error) {
    console.error('Error en GET /api/pedidos/mis:', error.message)
    res.status(500).json({ error: 'No se pudieron cargar tus pedidos' })
  }
})

// GET / -> lista de pedidos (Administrador y Vendedor)
router.get('/', soloRoles('Administrador', 'Vendedor'), async (req, res) => {
  try {
    const { rows } = await pool.query(`${SELECT_PEDIDO} ORDER BY p.id_pedido DESC`)
    res.json(rows)
  } catch (error) {
    console.error('Error en GET /api/pedidos:', error.message)
    res.status(500).json({ error: 'No se pudieron cargar los pedidos' })
  }
})

// GET /:id -> detalle (Administrador, Vendedor y el Cliente dueño)
router.get('/:id', soloRoles('Administrador', 'Vendedor', 'Cliente'), async (req, res) => {
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

    res.json(pedido)
  } catch (error) {
    console.error('Error en GET /api/pedidos/:id:', error.message)
    res.status(500).json({ error: 'No se pudo cargar el pedido' })
  }
})

// PATCH /:id/estado -> cambia el estado (Administrador y Vendedor)
router.patch('/:id/estado', soloRoles('Administrador', 'Vendedor'), async (req, res) => {
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
      'SELECT id_pedido, estado FROM pedido WHERE id_pedido = $1 FOR UPDATE',
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
