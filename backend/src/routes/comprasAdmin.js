import { Router } from 'express'
import { pool } from '../config/db.js'
import {
  verificarToken,
  bloquearCambioPendiente,
  requierePrivilegio,
} from '../middlewares/auth.js'
import {
  ErrorHttp,
  ESTADOS_COMPRA,
  ESTADO_BORRADOR,
  ESTADO_CONFIRMADA,
  ESTADO_PARCIAL,
  ESTADO_RECIBIDA,
  ESTADO_CERRADA_FALTANTES,
  ESTADO_ANULADA,
  ESTADOS_TERMINALES,
  ESTADOS_CON_RECEPCION,
  ESTADOS_ANULABLES,
  redondear,
  idPositivo,
  enteroPositivo,
  montoPositivo,
  montoNoNegativo,
  normalizarFecha,
  normalizarClaveIdempotencia,
  textoLargoOpcional,
  calcularEstadoPago,
  calcularPendientes,
  recalcularCostoFinal,
  resumenPagoCompra,
  saldoDisponibleProveedor,
  generarExcedenteCompra,
  obtenerCompraDetallada,
} from '../services/compras.js'

const router = Router()

// Todas las rutas exigen sesión y que no haya cambio de contraseña pendiente.
router.use(verificarToken, bloquearCambioPendiente)

const MAX_LINEAS = 200

const responderError = (res, error, mensaje) => {
  console.error('[postgres] operación:', mensaje)
  console.error('[postgres] detalle:', {
    code: error?.code,
    message: error?.message,
    detail: error?.detail,
    hint: error?.hint,
    position: error?.position,
    internalQuery: error?.internalQuery,
    routine: error?.routine,
  })
  console.error(error?.stack)

  if (error instanceof ErrorHttp || error.status) {
    return res.status(error.status || 400).json({ error: error.message })
  }
  if (error.code === '23505') {
    return res.status(409).json({ error: 'La operación entra en conflicto con un registro existente' })
  }
  if (error.code === '23503') {
    return res.status(409).json({ error: 'El registro está siendo usado por otro registro relacionado' })
  }
  if (error.code === '23514') {
    return res.status(400).json({
      error: 'Uno de los valores enviados no está permitido por el esquema',
    })
  }
  if (error.code === '22P02') {
    return res.status(400).json({ error: 'Uno de los datos tiene un formato inválido' })
  }
  console.error(mensaje, error.message)
  return res.status(500).json({ error: mensaje })
}

const codigoTemporal = () =>
  `T${Date.now().toString(36).slice(-5)}${Math.random().toString(36).slice(2, 4)}`

const arregloLineas = (body) => {
  if (Array.isArray(body.items)) return body.items
  if (Array.isArray(body.detalles)) return body.detalles
  if (Array.isArray(body.lineas)) return body.lineas
  return null
}

// ------------------------------------------------------------------
// Líneas de una compra (crear / editar)
// ------------------------------------------------------------------
const leerLineasCompra = (body) => {
  const crudo = arregloLineas(body)
  if (!crudo || crudo.length === 0) {
    throw new ErrorHttp(400, 'La compra debe incluir al menos una línea')
  }
  if (crudo.length > MAX_LINEAS) {
    throw new ErrorHttp(400, `La compra no puede tener más de ${MAX_LINEAS} líneas`)
  }

  const vistas = new Set()
  return crudo.map((item, indice) => {
    const idVariante = idPositivo(
      item?.id_variante ?? item?.idVariante,
      `El id_variante de la línea ${indice + 1}`
    )
    const cantidad = enteroPositivo(
      item?.cantidad_solicitada ?? item?.cantidad,
      `La cantidad de la línea ${indice + 1}`
    )
    const costoUnitario = montoNoNegativo(
      item?.costo_unitario ?? item?.costo,
      `El costo unitario de la línea ${indice + 1}`
    )

    if (vistas.has(idVariante)) {
      throw new ErrorHttp(400, 'Hay variantes repetidas en la compra')
    }
    vistas.add(idVariante)

    return { id_variante: idVariante, cantidad_solicitada: cantidad, costo_unitario: costoUnitario }
  })
}

const leerLineasRecepcion = (body) => {
  const crudo = arregloLineas(body)
  if (!crudo || crudo.length === 0) {
    throw new ErrorHttp(400, 'La recepción debe incluir al menos una línea')
  }
  if (crudo.length > MAX_LINEAS) {
    throw new ErrorHttp(400, `La recepción no puede tener más de ${MAX_LINEAS} líneas`)
  }

  const vistas = new Set()
  return crudo.map((item, indice) => {
    const idDetalle = idPositivo(
      item?.id_detalle ?? item?.id_detalle_compra ?? item?.idDetalle,
      `El id_detalle de la línea ${indice + 1}`
    )
    const cantidad = enteroPositivo(
      item?.cantidad_recibida ?? item?.cantidad,
      `La cantidad recibida de la línea ${indice + 1}`
    )
    let idVariante = null
    if (item?.id_variante !== undefined && item?.id_variante !== null && item?.id_variante !== '') {
      idVariante = idPositivo(item.id_variante, `El id_variante de la línea ${indice + 1}`)
    }

    if (vistas.has(idDetalle)) {
      throw new ErrorHttp(400, 'Hay líneas de recepción repetidas para el mismo detalle')
    }
    vistas.add(idDetalle)

    return { id_detalle: idDetalle, id_variante: idVariante, cantidad_recibida: cantidad }
  })
}

const leerCancelaciones = (body) => {
  const crudo = arregloLineas(body)
  if (!crudo || crudo.length === 0) return null

  const vistas = new Set()
  return crudo.map((item, indice) => {
    const idDetalle = idPositivo(
      item?.id_detalle ?? item?.id_detalle_compra ?? item?.idDetalle,
      `El id_detalle de la línea ${indice + 1}`
    )
    const cantidad = Number(item?.cantidad_cancelada ?? item?.cantidad)
    if (!Number.isInteger(cantidad) || cantidad < 0 || cantidad > 1000000) {
      throw new ErrorHttp(
        400,
        `La cantidad cancelada de la línea ${indice + 1} debe ser un entero entre 0 y 1000000`
      )
    }
    const motivo = textoLargoOpcional(
      item?.motivo ?? item?.motivo_cancelacion,
      300,
      `El motivo de la línea ${indice + 1}`
    )

    if (vistas.has(idDetalle)) {
      throw new ErrorHttp(400, 'Hay líneas de cancelación repetidas para el mismo detalle')
    }
    vistas.add(idDetalle)

    return { id_detalle: idDetalle, cantidad_cancelada: cantidad, motivo }
  })
}

// ------------------------------------------------------------------
// Validaciones compartidas
// ------------------------------------------------------------------
const validarProveedorActivo = async (db, idProveedor) => {
  const { rows } = await db.query(
    'SELECT id_proveedor, nombre, estado FROM proveedor WHERE id_proveedor = $1',
    [idProveedor]
  )
  if (rows.length === 0) throw new ErrorHttp(404, 'Proveedor no encontrado')
  if (!rows[0].estado) throw new ErrorHttp(409, 'El proveedor está inactivo')
  return rows[0]
}

const validarVariantes = async (db, lineas) => {
  const ids = [...new Set(lineas.map((l) => l.id_variante))].sort((a, b) => a - b)
  const { rows } = await db.query(
    `SELECT pv.id_variante, p.nombre, p.estado AS producto_activo
       FROM producto_variante pv
       JOIN producto p ON p.id_producto = pv.id_producto
      WHERE pv.id_variante = ANY($1::int[])
      ORDER BY pv.id_variante`,
    [ids]
  )

  const encontradas = new Set(rows.map((r) => r.id_variante))
  const faltantes = ids.filter((id) => !encontradas.has(id))
  if (faltantes.length > 0) {
    throw new ErrorHttp(400, `Las variantes ${faltantes.join(', ')} no existen`)
  }

  const inactivas = rows.filter((r) => !r.producto_activo)
  if (inactivas.length > 0) {
    const nombres = inactivas.map((r) => `"${r.nombre}"`).join(', ')
    throw new ErrorHttp(409, `El producto ${nombres} está inactivo`)
  }

  return rows
}

const calcularCostoOriginal = (lineas) => {
  const total = redondear(
    lineas.reduce((s, l) => s + l.cantidad_solicitada * l.costo_unitario, 0)
  )
  if (total > 9999999999.99) {
    throw new ErrorHttp(400, 'El costo total de la compra excede el máximo permitido')
  }
  return total
}

// ------------------------------------------------------------------
// GET /variantes -> variantes de productos activos para el formulario.
// Se declara antes de /:id para que Express no lo trate como un id.
// ------------------------------------------------------------------
router.get('/variantes', requierePrivilegio('Compras', 'Crear'), async (req, res) => {
  try {
    const q = String(req.query.q ?? '').trim()
    const limite = Math.min(
      100,
      Math.max(1, Number.parseInt(req.query.limite, 10) || 50)
    )

    const valores = []
    let filtro = ''
    if (q) {
      valores.push(`%${q}%`)
      filtro = `AND (p.nombre ILIKE $1 OR p.codigo ILIKE $1
                    OR COALESCE(t.nombre, '') ILIKE $1
                    OR COALESCE(c.nombre, '') ILIKE $1)`
    }
    valores.push(limite)

    const { rows } = await pool.query(
      `SELECT pv.id_variante,
              p.id_producto,
              p.codigo,
              p.nombre AS producto,
              p.precio::float8 AS precio,
              t.id_talla,
              t.nombre AS talla,
              c.id_color,
              c.nombre AS color,
              pv.stock
         FROM producto_variante pv
         JOIN producto p ON p.id_producto = pv.id_producto AND p.estado = TRUE
         LEFT JOIN talla t ON t.id_talla = pv.id_talla
         LEFT JOIN color c ON c.id_color = pv.id_color
        WHERE TRUE ${filtro}
        ORDER BY p.nombre, t.nombre NULLS LAST, c.nombre NULLS LAST, pv.id_variante
        LIMIT $${valores.length}`,
      valores
    )

    res.json(rows)
  } catch (error) {
    responderError(res, error, 'No se pudieron cargar las variantes')
  }
})

// ------------------------------------------------------------------
// GET / -> lista paginada con filtros
// ------------------------------------------------------------------
router.get('/', requierePrivilegio('Compras', 'Consultar'), async (req, res) => {
  try {
    const pagina = Math.max(1, Number.parseInt(req.query.pagina, 10) || 1)
    const limite = Math.min(
      100,
      Math.max(
        1,
        Number.parseInt(req.query.limite ?? req.query.porPagina, 10) || 20
      )
    )

    const condiciones = []
    const valores = []

    const idProveedor = req.query.id_proveedor ?? req.query.proveedor
    if (idProveedor !== undefined && String(idProveedor).trim() !== '') {
      valores.push(idPositivo(idProveedor, 'El id del proveedor'))
      condiciones.push(`c.id_proveedor = $${valores.length}`)
    }

    const estado = String(req.query.estado ?? '').trim()
    if (estado) {
      const estados = estado
        .split(',')
        .map((e) => e.trim())
        .filter(Boolean)
      const invalido = estados.find((e) => !ESTADOS_COMPRA.includes(e))
      if (invalido) {
        return res.status(400).json({
          error: `Estado inválido: "${invalido}". Usa: ${ESTADOS_COMPRA.join(', ')}`,
        })
      }
      valores.push(estados)
      condiciones.push(`c.estado = ANY($${valores.length}::text[])`)
    }

    const desde = normalizarFecha(req.query.desde, 'La fecha desde')
    if (desde) {
      valores.push(desde)
      condiciones.push(`c.fecha >= $${valores.length}::date`)
    }

    const hasta = normalizarFecha(req.query.hasta, 'La fecha hasta')
    if (hasta) {
      valores.push(hasta)
      condiciones.push(`c.fecha <= $${valores.length}::date`)
    }

    const q = String(req.query.q ?? '').trim()
    if (q) {
      valores.push(`%${q}%`)
      condiciones.push(
        `(c.codigo ILIKE $${valores.length}
          OR p.nombre ILIKE $${valores.length}
          OR p.documento ILIKE $${valores.length}
          OR COALESCE(c.observaciones, '') ILIKE $${valores.length})`
      )
    }

    const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : ''
    const from = `
      FROM compra c
      JOIN proveedor p ON p.id_proveedor = c.id_proveedor
      LEFT JOIN usuario u ON u.id_usuario = c.registrado_por
      ${where}
    `

    const { rows: conteo } = await pool.query(
      `SELECT COUNT(*)::int AS total ${from}`,
      valores
    )
    const total = conteo[0]?.total || 0

    const { rows } = await pool.query(
      `SELECT c.id_compra AS id,
              c.codigo,
              c.id_proveedor,
              p.nombre AS proveedor,
              TO_CHAR(c.fecha, 'YYYY-MM-DD') AS fecha,
              c.estado,
              c.costo_original::float8 AS costo_original,
              c.costo_final::float8 AS costo_final,
              c.valor_pagado::float8 AS valor_pagado,
              c.observaciones,
              c.creado_en,
              c.actualizado_en,
              c.cerrado_en,
              TRIM(u.nombres || ' ' || u.apellidos) AS registrado_por_nombre,
              COALESCE((
                SELECT SUM(dc.cantidad_solicitada)
                  FROM detalle_compra dc
                 WHERE dc.id_compra = c.id_compra
              ), 0)::int AS total_solicitado,
              COALESCE((
                SELECT SUM(dr.cantidad_recibida)
                  FROM detalle_recepcion dr
                 WHERE dr.id_compra = c.id_compra
              ), 0)::int AS total_recibido,
              COALESCE((
                SELECT SUM(dc.cantidad_cancelada)
                  FROM detalle_compra dc
                 WHERE dc.id_compra = c.id_compra
              ), 0)::int AS total_cancelado,
              COALESCE((
                SELECT SUM(m.monto)
                  FROM movimiento_saldo_proveedor m
                 WHERE m.tipo = 'APLICADO' AND m.id_compra_destino = c.id_compra
              ), 0)::float8 AS saldo_aplicado
         ${from}
         ORDER BY c.id_compra DESC
         LIMIT $${valores.length + 1} OFFSET $${valores.length + 2}`,
      [...valores, limite, (pagina - 1) * limite]
    )

    const data = rows.map((fila) => {
      const costoFinal = redondear(fila.costo_final)
      const cubierto = redondear(fila.valor_pagado + fila.saldo_aplicado)
      const saldoPendiente = Math.max(0, redondear(costoFinal - cubierto))
      const pendientesUnidades = Math.max(
        0,
        fila.total_solicitado - fila.total_recibido - fila.total_cancelado
      )
      return {
        ...fila,
        total_pendiente: pendientesUnidades,
        valor_cubierto: cubierto,
        saldo_pendiente: saldoPendiente,
        estado_pago: calcularEstadoPago(costoFinal, cubierto),
      }
    })

    res.json({
      data,
      paginacion: {
        pagina,
        limite,
        total,
        paginas: Math.max(1, Math.ceil(total / limite)),
      },
    })
  } catch (error) {
    responderError(res, error, 'No se pudieron cargar las compras')
  }
})

// ------------------------------------------------------------------
// GET /:id -> detalle completo
// ------------------------------------------------------------------
router.get('/:id', requierePrivilegio('Compras', 'Consultar'), async (req, res) => {
  try {
    const id = idPositivo(req.params.id, 'El id de la compra')
    const compra = await obtenerCompraDetallada(pool, id)
    if (!compra) return res.status(404).json({ error: 'Compra no encontrada' })
    res.json(compra)
  } catch (error) {
    responderError(res, error, 'No se pudo cargar la compra')
  }
})

// ------------------------------------------------------------------
// POST / -> crear compra en Borrador. No toca el inventario.
// ------------------------------------------------------------------
router.post('/', requierePrivilegio('Compras', 'Crear'), async (req, res) => {
  const db = await pool.connect()
  try {
    const lineas = leerLineasCompra(req.body)
    const idProveedor = idPositivo(req.body.id_proveedor, 'El id del proveedor')
    const fecha = normalizarFecha(req.body.fecha, 'La fecha')
    const observaciones = textoLargoOpcional(req.body.observaciones, 1000, 'Las observaciones')
    const costoOriginal = calcularCostoOriginal(lineas)

    await db.query('BEGIN')

    await validarProveedorActivo(db, idProveedor)
    await validarVariantes(db, lineas)

    const { rows: compraRows } = await db.query(
      `INSERT INTO compra
         (codigo, id_proveedor, registrado_por, fecha, estado,
          costo_original, costo_final, valor_pagado, observaciones,
          creado_en, actualizado_en)
       VALUES ($1, $2, $3, COALESCE($4::date, CURRENT_DATE), $5, $6, $6, 0, $7,
               now(), now())
       RETURNING id_compra`,
      [
        codigoTemporal(),
        idProveedor,
        req.usuario.id,
        fecha,
        ESTADO_BORRADOR,
        costoOriginal,
        observaciones,
      ]
    )
    const idCompra = compraRows[0].id_compra

    for (const linea of lineas) {
      await db.query(
        `INSERT INTO detalle_compra
           (id_compra, id_variante, cantidad_solicitada, cantidad_cancelada,
            costo_unitario)
         VALUES ($1, $2, $3, 0, $4)`,
        [idCompra, linea.id_variante, linea.cantidad_solicitada, linea.costo_unitario]
      )
    }

    await db.query(
      `UPDATE compra
          SET codigo = 'C-' || LPAD(id_compra::text, 6, '0'),
              actualizado_en = now()
        WHERE id_compra = $1`,
      [idCompra]
    )

    await db.query('COMMIT')

    const compra = await obtenerCompraDetallada(pool, idCompra)
    res.status(201).json(compra)
  } catch (error) {
    await db.query('ROLLBACK').catch(() => {})
    responderError(res, error, 'No se pudo crear la compra')
  } finally {
    db.release()
  }
})

// ------------------------------------------------------------------
// PUT /:id -> editar solo compras en Borrador. Recalcula costo original.
// ------------------------------------------------------------------
router.put('/:id', requierePrivilegio('Compras', 'Actualizar'), async (req, res) => {
  const db = await pool.connect()

  try {
    const id = idPositivo(req.params.id, 'El id de la compra')
    const lineas = leerLineasCompra(req.body)
    const idProveedor = idPositivo(req.body.id_proveedor, 'El id del proveedor')
    const fecha = normalizarFecha(req.body.fecha, 'La fecha')
    const observaciones = textoLargoOpcional(req.body.observaciones, 1000, 'Las observaciones')
    const costoOriginal = calcularCostoOriginal(lineas)

    await db.query('BEGIN')

    const { rows: compras } = await db.query(
      'SELECT id_compra, estado FROM compra WHERE id_compra = $1 FOR UPDATE',
      [id]
    )
    if (compras.length === 0) {
      await db.query('ROLLBACK')
      return res.status(404).json({ error: 'Compra no encontrada' })
    }
    if (compras[0].estado !== ESTADO_BORRADOR) {
      await db.query('ROLLBACK')
      return res.status(409).json({ error: 'Solo se puede editar una compra en Borrador' })
    }

    const { rows: recepciones } = await db.query(
      'SELECT 1 FROM recepcion_compra WHERE id_compra = $1 LIMIT 1',
      [id]
    )
    if (recepciones.length > 0) {
      await db.query('ROLLBACK')
      return res.status(409).json({ error: 'La compra ya tiene recepciones y no se puede editar' })
    }

    await validarProveedorActivo(db, idProveedor)
    await validarVariantes(db, lineas)

    await db.query(
      `UPDATE compra
          SET id_proveedor = $1,
              fecha = COALESCE($2::date, fecha),
              observaciones = $3,
              costo_original = $4,
              costo_final = $4,
              actualizado_en = now()
        WHERE id_compra = $5`,
      [idProveedor, fecha, observaciones, costoOriginal, id]
    )

    await db.query('DELETE FROM detalle_compra WHERE id_compra = $1', [id])

    for (const linea of lineas) {
      await db.query(
        `INSERT INTO detalle_compra
           (id_compra, id_variante, cantidad_solicitada, cantidad_cancelada,
            costo_unitario)
         VALUES ($1, $2, $3, 0, $4)`,
        [id, linea.id_variante, linea.cantidad_solicitada, linea.costo_unitario]
      )
    }

    await db.query('COMMIT')

    const compra = await obtenerCompraDetallada(pool, id)
    res.json(compra)
  } catch (error) {
    await db.query('ROLLBACK').catch(() => {})
    responderError(res, error, 'No se pudo actualizar la compra')
  } finally {
    db.release()
  }
})

// ------------------------------------------------------------------
// POST /:id/confirmar -> Borrador a Confirmada. No toca inventario.
// ------------------------------------------------------------------
router.post(
  '/:id/confirmar',
  requierePrivilegio('Compras', 'Confirmar'),
  async (req, res) => {
    const db = await pool.connect()

    try {
      const id = idPositivo(req.params.id, 'El id de la compra')
      await db.query('BEGIN')

      const { rows } = await db.query(
        'SELECT id_compra, id_proveedor, estado FROM compra WHERE id_compra = $1 FOR UPDATE',
        [id]
      )
      if (rows.length === 0) {
        await db.query('ROLLBACK')
        return res.status(404).json({ error: 'Compra no encontrada' })
      }
      if (rows[0].estado !== ESTADO_BORRADOR) {
        await db.query('ROLLBACK')
        return res.status(409).json({ error: 'Solo se puede confirmar una compra en Borrador' })
      }

      const { rows: lineas } = await db.query(
        'SELECT COUNT(*)::int AS total FROM detalle_compra WHERE id_compra = $1',
        [id]
      )
      if (lineas[0].total === 0) {
        await db.query('ROLLBACK')
        return res.status(409).json({ error: 'La compra no tiene líneas para confirmar' })
      }

      await validarProveedorActivo(db, rows[0].id_proveedor)

      await db.query(
        `UPDATE compra
            SET estado = $1, actualizado_en = now()
          WHERE id_compra = $2`,
        [ESTADO_CONFIRMADA, id]
      )

      await db.query('COMMIT')

      const compra = await obtenerCompraDetallada(pool, id)
      res.json(compra)
    } catch (error) {
      await db.query('ROLLBACK').catch(() => {})
      responderError(res, error, 'No se pudo confirmar la compra')
    } finally {
      db.release()
    }
  }
)

// ------------------------------------------------------------------
// POST /:id/recepciones -> recepción total o parcial. ÚNICO proceso que
// incrementa producto_variante.stock.
// ------------------------------------------------------------------
router.post(
  '/:id/recepciones',
  requierePrivilegio('Compras', 'Registrar recepcion'),
  async (req, res) => {
    const db = await pool.connect()

    try {
      const id = idPositivo(req.params.id, 'El id de la compra')
      const lineas = leerLineasRecepcion(req.body)
      const clave = normalizarClaveIdempotencia(
        req.body.clave_idempotencia ?? req.get('Idempotency-Key'),
        'La clave de idempotencia',
        true
      )
      const fechaRecepcion = normalizarFecha(
        req.body.fecha_recepcion,
        'La fecha de recepción'
      )
      const observaciones = textoLargoOpcional(
        req.body.observaciones,
        1000,
        'Las observaciones'
      )

      await db.query('BEGIN')

      // La clave es obligatoria (la columna real es NOT NULL + UNIQUE).
      // El bloqueo serializa reintentos concurrentes incluso antes de que el
      // índice único de la base rechace una segunda inserción.
      await db.query('SELECT pg_advisory_xact_lock(hashtext($1::text)::bigint)', [clave])

      // 1) Bloquear la compra: serializa recepciones concurrentes.
      const { rows: compras } = await db.query(
        `SELECT id_compra, id_proveedor, codigo, estado
           FROM compra
          WHERE id_compra = $1
          FOR UPDATE`,
        [id]
      )
      if (compras.length === 0) {
        await db.query('ROLLBACK')
        return res.status(404).json({ error: 'Compra no encontrada' })
      }
      const compra = compras[0]

      // Idempotencia obligatoria: se comprueba ANTES del estado para que
      // reintentar una recepción que ya dejó la compra en Recibida devuelva
      // la misma recepción sin volver a tocar el stock.
      const { rows: previas } = await db.query(
        `SELECT id_recepcion, id_compra
           FROM recepcion_compra
          WHERE clave_idempotencia = $1`,
        [clave]
      )
      if (previas.length > 0) {
        if (previas[0].id_compra !== id) {
          await db.query('ROLLBACK')
          return res.status(409).json({
            error: 'La clave de idempotencia ya fue usada en otra compra',
          })
        }
        await db.query('COMMIT')
        const detalle = await obtenerCompraDetallada(pool, id)
        return res.status(201).json({
          ...detalle,
          recepcion_idempotente: true,
          id_recepcion: previas[0].id_recepcion,
          excedente_generado: 0,
        })
      }

      if (!ESTADOS_CON_RECEPCION.includes(compra.estado)) {
        await db.query('ROLLBACK')
        return res.status(409).json({
          error: `La compra está en estado "${compra.estado}" y no admite recepciones`,
        })
      }

      // 2) Cantidades pendientes reales (calculadas desde la base).
      const pendientes = await calcularPendientes(db, id)
      if (pendientes.length === 0) {
        await db.query('ROLLBACK')
        return res.status(409).json({ error: 'La compra no tiene líneas' })
      }
      const porDetalle = new Map(pendientes.map((d) => [d.id_detalle, d]))

      // 3) Validar cada línea contra lo pendiente antes de escribir nada.
      for (const linea of lineas) {
        const detalle = porDetalle.get(linea.id_detalle)
        if (!detalle) {
          await db.query('ROLLBACK')
          return res.status(400).json({
            error: `El detalle ${linea.id_detalle} no pertenece a la compra`,
          })
        }
        if (linea.id_variante && linea.id_variante !== detalle.id_variante) {
          await db.query('ROLLBACK')
          return res.status(400).json({
            error: `La variante ${linea.id_variante} no corresponde al detalle ${linea.id_detalle}`,
          })
        }
        if (linea.cantidad_recibida > detalle.cantidad_pendiente) {
          await db.query('ROLLBACK')
          return res.status(409).json({
            error:
              `No se puede recibir ${linea.cantidad_recibida} del detalle ${linea.id_detalle}: ` +
              `solo quedan ${detalle.cantidad_pendiente} unidades pendientes`,
          })
        }
      }

      // 4) Bloquear las variantes que se van a actualizar, en orden de id.
      const idsVariantes = [
        ...new Set(lineas.map((l) => porDetalle.get(l.id_detalle).id_variante)),
      ].sort((a, b) => a - b)
      const { rows: variantes } = await db.query(
        `SELECT id_variante, stock
           FROM producto_variante
          WHERE id_variante = ANY($1::int[])
          ORDER BY id_variante
          FOR UPDATE`,
        [idsVariantes]
      )
      if (variantes.length !== idsVariantes.length) {
        await db.query('ROLLBACK')
        return res.status(409).json({ error: 'Una variante de la compra ya no existe' })
      }

      // 5) Registrar la recepción.
      const { rows: recepcionRows } = await db.query(
        `INSERT INTO recepcion_compra
           (id_compra, recibido_por, fecha_recepcion, clave_idempotencia,
            observaciones, creado_en)
         VALUES ($1, $2, COALESCE($3::date, CURRENT_DATE), $4, $5, now())
         RETURNING id_recepcion`,
        [id, req.usuario.id, fechaRecepcion, clave, observaciones]
      )
      const idRecepcion = recepcionRows[0].id_recepcion

      // 6) Detalle de la recepción + incremento de stock EXCLUSIVAMENTE por
      // las unidades recibidas.
      for (const linea of lineas) {
        const detalle = porDetalle.get(linea.id_detalle)
        await db.query(
          `INSERT INTO detalle_recepcion
             (id_recepcion, id_compra, id_detalle, cantidad_recibida)
           VALUES ($1, $2, $3, $4)`,
          [idRecepcion, id, linea.id_detalle, linea.cantidad_recibida]
        )
        await db.query(
          'UPDATE producto_variante SET stock = stock + $1 WHERE id_variante = $2',
          [linea.cantidad_recibida, detalle.id_variante]
        )
      }

      // 7) Costo final desde todas las unidades recibidas.
      await recalcularCostoFinal(db, id)

      // 8) Estado según lo que quede pendiente.
      const despues = await calcularPendientes(db, id)
      const totalPendiente = despues.reduce((s, d) => s + Number(d.cantidad_pendiente), 0)
      const nuevoEstado = totalPendiente === 0 ? ESTADO_RECIBIDA : ESTADO_PARCIAL

      await db.query(
        `UPDATE compra
            SET estado = $1::varchar,
                cerrado_en = CASE
                    WHEN $1::varchar = $2::varchar
                    THEN COALESCE(cerrado_en, now())
                    ELSE cerrado_en
                END,
                actualizado_en = now()
          WHERE id_compra = $3`,
        [nuevoEstado, ESTADO_RECIBIDA, id]
      )

      // 9) Si la compra quedó terminal, generar el excedente una sola vez.
      const excedente = await generarExcedenteCompra(db, id, req.usuario.id)

      await db.query('COMMIT')

      const detalle = await obtenerCompraDetallada(pool, id)
      res.status(201).json({
        ...detalle,
        recepcion_idempotente: false,
        id_recepcion: idRecepcion,
        excedente_generado: excedente,
      })
    } catch (error) {
      await db.query('ROLLBACK').catch(() => {})
      responderError(res, error, 'No se pudo registrar la recepción')
    } finally {
      db.release()
    }
  }
)

// ------------------------------------------------------------------
// POST /:id/cerrar -> cancelar unidades pendientes y cerrar con faltantes.
// ------------------------------------------------------------------
router.post('/:id/cerrar', requierePrivilegio('Compras', 'Cerrar'), async (req, res) => {
  const db = await pool.connect()

  try {
    const id = idPositivo(req.params.id, 'El id de la compra')
    const cancelaciones = leerCancelaciones(req.body)
    const motivoGlobal = textoLargoOpcional(req.body.motivo, 300, 'El motivo')

    await db.query('BEGIN')

    const { rows: compras } = await db.query(
      `SELECT id_compra, id_proveedor, codigo, estado
         FROM compra
        WHERE id_compra = $1
        FOR UPDATE`,
      [id]
    )
    if (compras.length === 0) {
      await db.query('ROLLBACK')
      return res.status(404).json({ error: 'Compra no encontrada' })
    }
    if (!ESTADOS_CON_RECEPCION.includes(compras[0].estado)) {
      await db.query('ROLLBACK')
      return res.status(409).json({
        error: `La compra está en estado "${compras[0].estado}" y no se puede cerrar`,
      })
    }

    const { rows: recepciones } = await db.query(
      'SELECT COUNT(*)::int AS total FROM recepcion_compra WHERE id_compra = $1',
      [id]
    )
    if (recepciones[0].total === 0) {
      await db.query('ROLLBACK')
      return res.status(409).json({
        error: 'Debe existir al menos una recepción parcial antes de cerrar con faltantes',
      })
    }

    const pendientes = await calcularPendientes(db, id)
    const conPendiente = pendientes.filter((d) => Number(d.cantidad_pendiente) > 0)

    // Si ya no hay faltantes, el estado correcto es Recibida, no "Cerrada
    // con faltantes".
    if (conPendiente.length === 0) {
      await db.query(
        `UPDATE compra
            SET estado = $1,
                cerrado_en = COALESCE(cerrado_en, now()),
                actualizado_en = now()
          WHERE id_compra = $2`,
        [ESTADO_RECIBIDA, id]
      )
      const excedente = await generarExcedenteCompra(db, id, req.usuario.id)
      await db.query('COMMIT')

      const detalle = await obtenerCompraDetallada(pool, id)
      return res.json({
        ...detalle,
        excedente_generado: excedente,
        mensaje: 'Todas las unidades fueron recibidas: la compra quedó en Recibida',
      })
    }

    // Normalizar el mapa de cancelaciones recibidas.
    const mapaCancelaciones = new Map()
    if (cancelaciones && cancelaciones.length > 0) {
      const idsPendientes = new Set(conPendiente.map((d) => d.id_detalle))
      for (const item of cancelaciones) {
        if (!idsPendientes.has(item.id_detalle)) {
          await db.query('ROLLBACK')
          return res.status(400).json({
            error: `El detalle ${item.id_detalle} no tiene unidades pendientes por cancelar`,
          })
        }
        mapaCancelaciones.set(item.id_detalle, item)
      }
    }

    // Cada detalle pendiente debe quedar resuelto: si el cliente envía
    // líneas, deben cubrir exactamente lo pendiente; si no envía, se
    // cancelan todas las unidades pendientes.
    for (const detalle of conPendiente) {
      const solicitada = mapaCancelaciones.get(detalle.id_detalle)
      const cantidad = cancelaciones
        ? (solicitada?.cantidad_cancelada ?? 0)
        : detalle.cantidad_pendiente

      if (cantidad > detalle.cantidad_pendiente) {
        await db.query('ROLLBACK')
        return res.status(400).json({
          error:
            `La cantidad cancelada del detalle ${detalle.id_detalle} no puede superar ` +
            `las ${detalle.cantidad_pendiente} unidades pendientes`,
        })
      }
      if (cantidad < detalle.cantidad_pendiente) {
        await db.query('ROLLBACK')
        return res.status(400).json({
          error:
            `Quedan ${detalle.cantidad_pendiente - cantidad} unidades pendientes en el ` +
            `detalle ${detalle.id_detalle}; el cierre debe resolverlas todas`,
        })
      }

      const motivo =
        solicitada?.motivo || motivoGlobal || 'Cierre con faltantes'

      await db.query(
        `UPDATE detalle_compra
            SET cantidad_cancelada = COALESCE(cantidad_cancelada, 0) + $1,
                motivo_cancelacion = $2
          WHERE id_detalle = $3 AND id_compra = $4`,
        [cantidad, motivo, detalle.id_detalle, id]
      )
    }

    // Verificación final: no debe quedar ninguna unidad pendiente.
    const despues = await calcularPendientes(db, id)
    const restantes = despues.reduce((s, d) => s + Number(d.cantidad_pendiente), 0)
    if (restantes > 0) {
      await db.query('ROLLBACK')
      return res.status(409).json({
        error: 'El cierre dejó unidades pendientes sin resolver',
      })
    }

    // Costo final según unidades efectivamente recibidas.
    await recalcularCostoFinal(db, id)

    await db.query(
      `UPDATE compra
          SET estado = $1,
              cerrado_en = now(),
              actualizado_en = now()
        WHERE id_compra = $2`,
      [ESTADO_CERRADA_FALTANTES, id]
    )

    const excedente = await generarExcedenteCompra(db, id, req.usuario.id)

    await db.query('COMMIT')

    const detalle = await obtenerCompraDetallada(pool, id)
    res.json({ ...detalle, excedente_generado: excedente })
  } catch (error) {
    await db.query('ROLLBACK').catch(() => {})
    responderError(res, error, 'No se pudo cerrar la compra')
  } finally {
    db.release()
  }
})

// ------------------------------------------------------------------
// POST /:id/anular -> Borrador/Confirmada sin unidades recibidas.
// No borra historial ni toca inventario.
// ------------------------------------------------------------------
router.post('/:id/anular', requierePrivilegio('Compras', 'Anular'), async (req, res) => {
  const db = await pool.connect()

  try {
    const id = idPositivo(req.params.id, 'El id de la compra')
    await db.query('BEGIN')

    const { rows } = await db.query(
      `SELECT id_compra, estado, valor_pagado::float8 AS valor_pagado
         FROM compra
        WHERE id_compra = $1
        FOR UPDATE`,
      [id]
    )
    if (rows.length === 0) {
      await db.query('ROLLBACK')
      return res.status(404).json({ error: 'Compra no encontrada' })
    }
    if (!ESTADOS_ANULABLES.includes(rows[0].estado)) {
      await db.query('ROLLBACK')
      return res.status(409).json({
        error: 'Solo se puede anular una compra en Borrador o Confirmada',
      })
    }

    const { rows: recibidas } = await db.query(
      `SELECT COALESCE(SUM(cantidad_recibida), 0)::int AS total
         FROM detalle_recepcion
        WHERE id_compra = $1`,
      [id]
    )
    if (recibidas[0].total > 0) {
      await db.query('ROLLBACK')
      return res.status(409).json({
        error: 'No se puede anular una compra con mercancía recibida',
      })
    }

    // Protección de dinero: si ya hay pagos o saldo aplicado, anular dejaría
    // esos valores sin destino. Se rechaza y se conserva el historial.
    if (Number(rows[0].valor_pagado) > 0) {
      await db.query('ROLLBACK')
      return res.status(409).json({
        error: 'No se puede anular una compra con pagos registrados',
      })
    }

    const { rows: aplicados } = await db.query(
      `SELECT COALESCE(SUM(monto), 0)::float8 AS total
         FROM movimiento_saldo_proveedor
        WHERE tipo = 'APLICADO' AND id_compra_destino = $1`,
      [id]
    )
    if (Number(aplicados[0].total) > 0) {
      await db.query('ROLLBACK')
      return res.status(409).json({
        error: 'No se puede anular una compra con saldo a favor aplicado',
      })
    }

    await db.query(
      `UPDATE compra
          SET estado = $1, actualizado_en = now()
        WHERE id_compra = $2`,
      [ESTADO_ANULADA, id]
    )

    await db.query('COMMIT')

    const compra = await obtenerCompraDetallada(pool, id)
    res.json(compra)
  } catch (error) {
    await db.query('ROLLBACK').catch(() => {})
    responderError(res, error, 'No se pudo anular la compra')
  } finally {
    db.release()
  }
})

// ------------------------------------------------------------------
// POST /:id/pago -> acumula valor_pagado. No hay tabla de pagos.
// ------------------------------------------------------------------
router.post(
  '/:id/pago',
  requierePrivilegio('Compras', 'Registrar pago'),
  async (req, res) => {
    const db = await pool.connect()
    try {
      const id = idPositivo(req.params.id, 'El id de la compra')
      const monto = montoPositivo(req.body.monto, 'El monto del pago')
      await db.query('BEGIN')

      const { rows } = await db.query(
        `SELECT id_compra, id_proveedor, estado,
                costo_original::float8 AS costo_original,
                costo_final::float8 AS costo_final,
                valor_pagado::float8 AS valor_pagado
           FROM compra
          WHERE id_compra = $1
          FOR UPDATE`,
        [id]
      )
      if (rows.length === 0) {
        await db.query('ROLLBACK')
        return res.status(404).json({ error: 'Compra no encontrada' })
      }
      if (rows[0].estado === ESTADO_ANULADA) {
        await db.query('ROLLBACK')
        return res.status(409).json({ error: 'Una compra anulada no admite pagos' })
      }

      const nuevoValorPagado = redondear(Number(rows[0].valor_pagado || 0) + monto)
      if (nuevoValorPagado > 9999999999.99) {
        await db.query('ROLLBACK')
        return res.status(400).json({
          error: 'El valor pagado acumulado excede el máximo permitido',
        })
      }

      const { rows: actualizada } = await db.query(
        `UPDATE compra
            SET valor_pagado = COALESCE(valor_pagado, 0) + $1,
                actualizado_en = now()
          WHERE id_compra = $2
          RETURNING id_compra, estado,
                    costo_original::float8 AS costo_original,
                    costo_final::float8 AS costo_final,
                    valor_pagado::float8 AS valor_pagado`,
        [monto, id]
      )

      let excedente = 0
      if (ESTADOS_TERMINALES.includes(actualizada[0].estado)) {
        excedente = await generarExcedenteCompra(db, id, req.usuario.id)
      }

      const resumen = await resumenPagoCompra(db, actualizada[0])

      await db.query('COMMIT')

      res.status(201).json({
        id_compra: id,
        monto_registrado: monto,
        ...resumen,
        saldo_disponible_proveedor: await saldoDisponibleProveedor(pool, rows[0].id_proveedor),
        excedente_generado: excedente,
      })
    } catch (error) {
      await db.query('ROLLBACK').catch(() => {})
      responderError(res, error, 'No se pudo registrar el pago')
    } finally {
      db.release()
    }
  }
)

// ------------------------------------------------------------------
// POST /:id/aplicar-saldo -> consume saldo a favor del mismo proveedor.
// ------------------------------------------------------------------
router.post(
  '/:id/aplicar-saldo',
  requierePrivilegio('Compras', 'Aplicar saldo'),
  async (req, res) => {
    const db = await pool.connect()
    try {
      const id = idPositivo(req.params.id, 'El id de la compra')
      const monto = montoPositivo(req.body.monto, 'El monto a aplicar')
      const clave = normalizarClaveIdempotencia(
        req.body.clave_idempotencia ?? req.get('Idempotency-Key'),
        'La clave de idempotencia',
        true
      )
      let idMovimientoSugerido = null
      if (
        req.body.id_movimiento_origen !== undefined &&
        req.body.id_movimiento_origen !== null &&
        String(req.body.id_movimiento_origen).trim() !== ''
      ) {
        idMovimientoSugerido = idPositivo(
          req.body.id_movimiento_origen,
          'El id del movimiento de saldo'
        )
      }
      const observaciones = textoLargoOpcional(
        req.body.observaciones,
        500,
        'Las observaciones'
      )

      await db.query('BEGIN')

      // La clave es obligatoria (la columna real es NOT NULL + UNIQUE).
      // Serializa reintentos con la misma clave incluso entre proveedores
      // distintos, antes de bloquear compra y proveedor.
      await db.query('SELECT pg_advisory_xact_lock(hashtext($1::text)::bigint)', [clave])

      // Bloquear la compra destino primero (mismo orden que recepción).
      const { rows: compras } = await db.query(
        `SELECT id_compra, id_proveedor, codigo, estado,
                costo_original::float8 AS costo_original,
                costo_final::float8 AS costo_final,
                valor_pagado::float8 AS valor_pagado
           FROM compra
          WHERE id_compra = $1
          FOR UPDATE`,
        [id]
      )
      if (compras.length === 0) {
        await db.query('ROLLBACK')
        return res.status(404).json({ error: 'Compra no encontrada' })
      }
      const compra = compras[0]
      if (compra.estado === ESTADO_ANULADA) {
        await db.query('ROLLBACK')
        return res.status(409).json({ error: 'Una compra anulada no admite saldo a favor' })
      }

      // Bloquear al proveedor para serializar todas las mutaciones de saldo.
      await db.query('SELECT id_proveedor FROM proveedor WHERE id_proveedor = $1 FOR UPDATE', [
        compra.id_proveedor,
      ])

      // Idempotencia obligatoria: si la clave ya se usó, devolver el
      // resultado anterior sin consumir saldo otra vez. Las claves derivadas
      // de aplicaciones con varios movimientos usan el separador '~', que
      // está reservado y no puede aparecer en una clave enviada por el cliente.
      const { rows: existentes } = await db.query(
        `SELECT id_movimiento, monto::float8 AS monto, id_compra_destino
           FROM movimiento_saldo_proveedor
          WHERE tipo = 'APLICADO'
            AND (clave_idempotencia = $1
                 OR LEFT(clave_idempotencia, LENGTH($1) + 1) = $1 || '~')
          ORDER BY id_movimiento`,
        [clave]
      )
      if (existentes.length > 0) {
        if (existentes.some((m) => m.id_compra_destino !== id)) {
          await db.query('ROLLBACK')
          return res.status(409).json({
            error: 'La clave de idempotencia ya fue usada en otra compra',
          })
        }
        const aplicado = redondear(existentes.reduce((s, m) => s + Number(m.monto), 0))
        const resumen = await resumenPagoCompra(db, compra)
        await db.query('COMMIT')
        return res.status(201).json({
          id_compra: id,
          monto_solicitado: monto,
          monto_aplicado: aplicado,
          idempotente: true,
          ...resumen,
          saldo_disponible_proveedor: await saldoDisponibleProveedor(
            pool,
            compra.id_proveedor
          ),
          excedente_generado: 0,
        })
      }

      // Bloquear todos los movimientos GENERADO del proveedor.
      const { rows: generados } = await db.query(
        `SELECT id_movimiento, id_compra_origen, monto::float8 AS monto
           FROM movimiento_saldo_proveedor
          WHERE id_proveedor = $1 AND tipo = 'GENERADO'
          ORDER BY id_movimiento
          FOR UPDATE`,
        [compra.id_proveedor]
      )

      // Cuánto se ha aplicado ya de cada movimiento de origen.
      const { rows: consumos } = await db.query(
        `SELECT id_movimiento_origen, COALESCE(SUM(monto), 0)::float8 AS aplicado
           FROM movimiento_saldo_proveedor
          WHERE id_proveedor = $1
            AND tipo = 'APLICADO'
            AND id_movimiento_origen IS NOT NULL
          GROUP BY id_movimiento_origen`,
        [compra.id_proveedor]
      )
      const aplicadoPorMovimiento = new Map(
        consumos.map((c) => [c.id_movimiento_origen, Number(c.aplicado)])
      )

      const disponibles = generados
        .map((m) => ({
          ...m,
          disponible: redondear(Number(m.monto) - (aplicadoPorMovimiento.get(m.id_movimiento) || 0)),
        }))
        .filter((m) => m.disponible > 0)

      if (idMovimientoSugerido !== null) {
        const sugerido = disponibles.find((m) => m.id_movimiento === idMovimientoSugerido)
        if (!sugerido) {
          // Distinguir entre un movimiento de otro proveedor y uno ya agotado.
          const { rows: ajeno } = await db.query(
            'SELECT id_proveedor FROM movimiento_saldo_proveedor WHERE id_movimiento = $1',
            [idMovimientoSugerido]
          )
          await db.query('ROLLBACK')
          if (ajeno.length === 0 || ajeno[0].id_proveedor !== compra.id_proveedor) {
            return res.status(400).json({
              error: 'El movimiento de saldo no pertenece al proveedor de la compra',
            })
          }
          return res.status(409).json({
            error: 'El movimiento de saldo ya no tiene saldo disponible',
          })
        }
      }

      const candidatos = idMovimientoSugerido !== null
        ? disponibles.filter((m) => m.id_movimiento === idMovimientoSugerido)
        : disponibles

      // Un movimiento no puede aplicarse a la misma compra que lo generó.
      const utilizables = candidatos.filter((m) => m.id_compra_origen !== id)
      if (idMovimientoSugerido !== null && utilizables.length === 0) {
        await db.query('ROLLBACK')
        return res.status(400).json({
          error: 'El movimiento de saldo pertenece a la misma compra y no puede aplicarse a sí misma',
        })
      }

      const totalDisponible = redondear(
        utilizables.reduce((s, m) => s + m.disponible, 0)
      )
      if (monto > totalDisponible) {
        await db.query('ROLLBACK')
        return res.status(409).json({
          error: `Saldo insuficiente. Disponible: ${totalDisponible}`,
        })
      }

      let restante = monto
      let aplicado = 0
      let indice = 0
      for (const movimiento of utilizables) {
        if (restante <= 0) break
        const tomar = redondear(Math.min(restante, movimiento.disponible))
        if (tomar <= 0) continue

        // La primera fila conserva la clave base; las siguientes llevan un
        // sufijo interno único por movimiento de origen ('~' está reservado).
        const claveMovimiento = indice === 0 ? clave : `${clave}~${indice}`
        await db.query(
          `INSERT INTO movimiento_saldo_proveedor
             (id_proveedor, id_compra_origen, id_compra_destino,
              id_movimiento_origen, tipo, monto, registrado_por,
              clave_idempotencia, observaciones, creado_en)
           VALUES ($1, $2, $3, $4, 'APLICADO', $5, $6, $7, $8, now())`,
          [
            compra.id_proveedor,
            movimiento.id_compra_origen,
            id,
            movimiento.id_movimiento,
            tomar,
            req.usuario.id,
            claveMovimiento,
            observaciones ||
              `Saldo a favor aplicado a la compra ${compra.codigo || id}`,
          ]
        )

        restante = redondear(restante - tomar)
        aplicado = redondear(aplicado + tomar)
        indice += 1
      }

      if (restante > 0) {
        await db.query('ROLLBACK')
        return res.status(409).json({
          error: `Saldo insuficiente. Disponible: ${totalDisponible}`,
        })
      }

      // Aplicar saldo también puede producir excedente en una compra
      // terminal; la función solo inserta la diferencia no generada.
      let excedente = 0
      if (ESTADOS_TERMINALES.includes(compra.estado)) {
        excedente = await generarExcedenteCompra(db, id, req.usuario.id)
      }

      const { rows: actualizada } = await db.query(
        `SELECT id_compra, id_proveedor, estado,
                costo_original::float8 AS costo_original,
                costo_final::float8 AS costo_final,
                valor_pagado::float8 AS valor_pagado
           FROM compra
          WHERE id_compra = $1`,
        [id]
      )
      const resumen = await resumenPagoCompra(db, actualizada[0])

      await db.query('COMMIT')

      res.status(201).json({
        id_compra: id,
        monto_solicitado: monto,
        monto_aplicado: aplicado,
        idempotente: false,
        ...resumen,
        saldo_disponible_proveedor: await saldoDisponibleProveedor(
          pool,
          compra.id_proveedor
        ),
        excedente_generado: excedente,
      })
    } catch (error) {
      await db.query('ROLLBACK').catch(() => {})
      responderError(res, error, 'No se pudo aplicar el saldo a favor')
    } finally {
      db.release()
    }
  }
)

export default router
