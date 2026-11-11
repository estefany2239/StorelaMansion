import { pool } from '../config/db.js'

// ============================================================
// SERVICIO DE COMPRAS
//
// Concentra las reglas que comparten varias rutas:
//   - cálculo de pendientes por línea (solicitado - recibido - cancelado);
//   - recálculo del costo final a partir de lo efectivamente recibido;
//   - estado de pago calculado (no existe columna estado_pago);
//   - saldo a favor del proveedor calculado desde el historial de
//     movimiento_saldo_proveedor;
//   - generación idempotente del excedente de una compra terminal.
//
// No crea tablas ni columnas: usa exclusivamente las seis tablas que ya
// existen en la base de datos.
// ============================================================

export class ErrorHttp extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

export const ESTADO_BORRADOR = 'Borrador'
export const ESTADO_CONFIRMADA = 'Confirmada'
export const ESTADO_PARCIAL = 'Parcialmente recibida'
export const ESTADO_RECIBIDA = 'Recibida'
export const ESTADO_CERRADA_FALTANTES = 'Cerrada con faltantes'
export const ESTADO_ANULADA = 'Anulada'

export const ESTADOS_COMPRA = [
  ESTADO_BORRADOR,
  ESTADO_CONFIRMADA,
  ESTADO_PARCIAL,
  ESTADO_RECIBIDA,
  ESTADO_CERRADA_FALTANTES,
  ESTADO_ANULADA,
]

// Estados terminales: ya no admiten recepciones ni nuevas cancelaciones.
export const ESTADOS_TERMINALES = [ESTADO_RECIBIDA, ESTADO_CERRADA_FALTANTES]

// Estados que admiten una recepción parcial.
export const ESTADOS_CON_RECEPCION = [ESTADO_CONFIRMADA, ESTADO_PARCIAL]

// Estados que admiten edición de líneas.
export const ESTADOS_EDITABLES = [ESTADO_BORRADOR]

// Estados que admiten anulación sin mercancía recibida.
export const ESTADOS_ANULABLES = [ESTADO_BORRADOR, ESTADO_CONFIRMADA]

export const redondear = (valor) => Math.round((Number(valor) || 0) * 100) / 100

// ------------------------------------------------------------------
// Normalización y validación de datos
// ------------------------------------------------------------------

export const normalizarNombre = (valor) =>
  String(valor ?? '').trim().replace(/\s+/g, ' ')

export const textoOpcional = (valor, maximo, campo = 'campo') => {
  if (valor === undefined || valor === null) return null
  const texto = String(valor).trim().replace(/\s+/g, ' ')
  if (!texto) return null
  if (texto.length > maximo) {
    throw new ErrorHttp(400, `${campo} no puede superar los ${maximo} caracteres`)
  }
  return texto
}

export const textoLargoOpcional = (valor, maximo, campo = 'campo') => {
  if (valor === undefined || valor === null) return null
  const texto = String(valor).trim()
  if (!texto) return null
  if (texto.length > maximo) {
    throw new ErrorHttp(400, `${campo} no puede superar los ${maximo} caracteres`)
  }
  return texto
}

export const idPositivo = (valor, campo = 'id') => {
  const numero = Number(valor)
  if (!Number.isInteger(numero) || numero <= 0 || numero > 2147483647) {
    throw new ErrorHttp(400, `${campo} inválido`)
  }
  return numero
}

export const enteroPositivo = (valor, campo = 'cantidad') => {
  const numero = Number(valor)
  if (!Number.isInteger(numero) || numero <= 0) {
    throw new ErrorHttp(400, `${campo} debe ser un entero mayor que cero`)
  }
  if (numero > 1000000) {
    throw new ErrorHttp(400, `${campo} no puede superar 1000000`)
  }
  return numero
}

export const montoPositivo = (valor, campo = 'monto') => {
  if (valor === undefined || valor === null || String(valor).trim() === '') {
    throw new ErrorHttp(400, `${campo} es obligatorio`)
  }
  const numero = Number(valor)
  if (!Number.isFinite(numero) || numero <= 0) {
    throw new ErrorHttp(400, `${campo} debe ser un monto positivo`)
  }
  if (numero > 999999999) {
    throw new ErrorHttp(400, `${campo} excede el máximo permitido (999999999)`)
  }
  const redondeado = redondear(numero)
  if (redondeado <= 0) {
    throw new ErrorHttp(400, `${campo} debe ser un monto positivo`)
  }
  return redondeado
}

export const montoNoNegativo = (valor, campo = 'costo unitario') => {
  if (valor === undefined || valor === null || String(valor).trim() === '') {
    throw new ErrorHttp(400, `${campo} es obligatorio`)
  }
  const numero = Number(valor)
  if (!Number.isFinite(numero) || numero < 0) {
    throw new ErrorHttp(400, `${campo} debe ser un monto igual o mayor que cero`)
  }
  if (numero > 999999999) {
    throw new ErrorHttp(400, `${campo} excede el máximo permitido (999999999)`)
  }
  return redondear(numero)
}

export const normalizarFecha = (valor, campo = 'fecha') => {
  if (valor === undefined || valor === null || String(valor).trim() === '') return null
  const fecha = String(valor).trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    throw new ErrorHttp(400, `${campo} debe tener el formato YYYY-MM-DD`)
  }
  const prueba = new Date(`${fecha}T00:00:00Z`)
  if (Number.isNaN(prueba.getTime()) || prueba.toISOString().slice(0, 10) !== fecha) {
    throw new ErrorHttp(400, `${campo} no es una fecha válida`)
  }
  return fecha
}

export const normalizarClaveIdempotencia = (
  valor,
  campo = 'clave_idempotencia',
  obligatoria = false
) => {
  if (valor === undefined || valor === null || String(valor).trim() === '') {
    if (obligatoria) {
      throw new ErrorHttp(
        400,
        `${campo} es obligatoria para esta operación. Envíela en el body ` +
          '(clave_idempotencia) o en el encabezado Idempotency-Key.'
      )
    }
    return null
  }
  const clave = String(valor).trim()
  if (clave.length > 60) {
    throw new ErrorHttp(400, `${campo} no puede superar los 60 caracteres`)
  }
  // El separador '~' se reserva para claves internas (excedentes y claves
  // derivadas de aplicaciones con varios movimientos de origen).
  if (!/^[A-Za-z0-9._:-]+$/.test(clave)) {
    throw new ErrorHttp(
      400,
      `${campo} solo admite letras, números, punto, guion, guion bajo y dos puntos`
    )
  }
  return clave
}

// ------------------------------------------------------------------
// Estado de pago (calculado, nunca almacenado)
// ------------------------------------------------------------------

export const calcularEstadoPago = (costoFinal, valorCubierto) => {
  const costo = redondear(costoFinal)
  const cubierto = redondear(valorCubierto)

  if (costo <= 0) return 'Pagada'
  if (cubierto <= 0) return 'Pendiente'
  if (cubierto >= costo) return 'Pagada'
  return 'Parcialmente pagada'
}

// ------------------------------------------------------------------
// Consultas de apoyo
// ------------------------------------------------------------------

// Líneas de la compra con lo recibido y lo pendiente, calculado siempre
// desde la base y no desde el body.
export const calcularPendientes = async (db, idCompra) => {
  const { rows } = await db.query(
    `SELECT dc.id_detalle,
            dc.id_variante,
            dc.cantidad_solicitada,
            COALESCE(dc.cantidad_cancelada, 0) AS cantidad_cancelada,
            dc.costo_unitario::float8 AS costo_unitario,
            COALESCE(SUM(dr.cantidad_recibida), 0)::int AS cantidad_recibida,
            GREATEST(
              dc.cantidad_solicitada - COALESCE(dc.cantidad_cancelada, 0) -
              COALESCE(SUM(dr.cantidad_recibida), 0),
              0
            )::int AS cantidad_pendiente
       FROM detalle_compra dc
       LEFT JOIN detalle_recepcion dr ON dr.id_detalle = dc.id_detalle
      WHERE dc.id_compra = $1
      GROUP BY dc.id_detalle, dc.id_variante, dc.cantidad_solicitada,
               dc.cantidad_cancelada, dc.costo_unitario
      ORDER BY dc.id_detalle`,
    [idCompra]
  )
  return rows
}

// Costo final = suma de (unidades recibidas * costo unitario) de todas las
// recepciones. El costo original se conserva intacto.
export const recalcularCostoFinal = async (db, idCompra) => {
  const { rows } = await db.query(
    `UPDATE compra c
        SET costo_final = COALESCE((
              SELECT SUM(dr.cantidad_recibida * dc.costo_unitario)
                FROM detalle_recepcion dr
                JOIN detalle_compra dc ON dc.id_detalle = dr.id_detalle
               WHERE dc.id_compra = c.id_compra
            ), 0),
            actualizado_en = now()
      WHERE c.id_compra = $1
      RETURNING c.costo_original::float8 AS costo_original,
                c.costo_final::float8 AS costo_final,
                c.valor_pagado::float8 AS valor_pagado`,
    [idCompra]
  )
  return rows[0] || null
}

// Saldo aplicado a una compra concreta (movimientos APLICADO cuyo destino
// es esa compra).
export const saldoAplicadoCompra = async (db, idCompra) => {
  const { rows } = await db.query(
    `SELECT COALESCE(SUM(monto), 0)::float8 AS saldo_aplicado
       FROM movimiento_saldo_proveedor
      WHERE tipo = 'APLICADO' AND id_compra_destino = $1`,
    [idCompra]
  )
  return redondear(rows[0]?.saldo_aplicado)
}

// Saldo disponible de un proveedor calculado desde el historial:
//   GENERADO suma, APLICADO resta.
export const saldoDisponibleProveedor = async (db, idProveedor) => {
  const { rows } = await db.query(
    `SELECT COALESCE(SUM(
              CASE WHEN tipo = 'GENERADO' THEN monto
                   WHEN tipo = 'APLICADO' THEN -monto
                   ELSE 0 END
            ), 0)::float8 AS saldo_disponible
       FROM movimiento_saldo_proveedor
      WHERE id_proveedor = $1`,
    [idProveedor]
  )
  return redondear(rows[0]?.saldo_disponible)
}

// Resumen de pago de una compra: valor pagado + saldo aplicado contra el
// costo final. No existe columna estado_pago: se calcula aquí.
export const resumenPagoCompra = async (db, compra) => {
  const saldoAplicado = await saldoAplicadoCompra(db, compra.id_compra)
  const valorPagado = redondear(compra.valor_pagado)
  const costoFinal = redondear(compra.costo_final)
  const valorCubierto = redondear(valorPagado + saldoAplicado)
  const saldoPendiente = Math.max(0, redondear(costoFinal - valorCubierto))

  return {
    costo_original: redondear(compra.costo_original),
    costo_final: costoFinal,
    valor_pagado: valorPagado,
    saldo_aplicado: saldoAplicado,
    valor_cubierto: valorCubierto,
    saldo_pendiente: saldoPendiente,
    estado_pago: calcularEstadoPago(costoFinal, valorCubierto),
  }
}

// ------------------------------------------------------------------
// Excedente (saldo a favor) de una compra terminal
// ------------------------------------------------------------------

// Genera un movimiento GENERADO por la diferencia entre lo que la compra
// tiene cubierto (pagos + saldo aplicado) y su costo final, descontando lo
// que ya se hubiera generado antes por esa misma compra.
//
// Es idempotente: si se llama dos veces, la segunda no inserta nada. Si más
// adelante entra un pago adicional, solo genera la diferencia nueva.
//
// El llamador debe tener la compra bloqueada con FOR UPDATE. Aquí se bloquea
// además la fila del proveedor para serializar los cambios de saldo entre
// compras del mismo proveedor.
export const generarExcedenteCompra = async (db, idCompra, registradoPor = null) => {
  const { rows: compras } = await db.query(
    `SELECT id_compra, id_proveedor, codigo, estado,
            costo_final::float8 AS costo_final,
            valor_pagado::float8 AS valor_pagado
       FROM compra
      WHERE id_compra = $1`,
    [idCompra]
  )
  const compra = compras[0]
  if (!compra) return 0
  if (!ESTADOS_TERMINALES.includes(compra.estado)) return 0

  await db.query('SELECT id_proveedor FROM proveedor WHERE id_proveedor = $1 FOR UPDATE', [
    compra.id_proveedor,
  ])

  const saldoAplicado = await saldoAplicadoCompra(db, idCompra)

  const { rows: generados } = await db.query(
    `SELECT COALESCE(SUM(monto), 0)::float8 AS generado
       FROM movimiento_saldo_proveedor
      WHERE tipo = 'GENERADO' AND id_compra_origen = $1`,
    [idCompra]
  )
  const yaGenerado = redondear(generados[0]?.generado)

  const cubierto = redondear(compra.valor_pagado + saldoAplicado)
  const excedenteTotal = Math.max(0, redondear(cubierto - compra.costo_final))
  const diferencia = redondear(excedenteTotal - yaGenerado)

  if (diferencia <= 0) return 0

  // clave_idempotencia es NOT NULL y UNIQUE en la tabla real. Se construye
  // una clave interna determinística con la compra de origen y el excedente
  // acumulado (en centavos). El separador '~' no está permitido en las claves
  // que envía el cliente, así que no puede colisionar con una clave externa.
  const claveGenerado = `sys~excedente~${idCompra}~${Math.round(excedenteTotal * 100)}`

  await db.query(
    `INSERT INTO movimiento_saldo_proveedor
       (id_proveedor, id_compra_origen, id_compra_destino,
        id_movimiento_origen, tipo, monto, registrado_por,
        clave_idempotencia, observaciones, creado_en)
     VALUES ($1, $2, NULL, NULL, 'GENERADO', $3, $4, $5, $6, now())`,
    [
      compra.id_proveedor,
      idCompra,
      diferencia,
      registradoPor,
      claveGenerado,
      `Excedente generado por la compra ${compra.codigo || idCompra}`,
    ]
  )

  return diferencia
}

// ------------------------------------------------------------------
// Detalle completo de una compra
// ------------------------------------------------------------------

export const obtenerCompraDetallada = async (db, idCompra) => {
  const { rows } = await db.query(
    `SELECT c.id_compra AS id,
            c.codigo,
            c.id_proveedor,
            c.registrado_por,
            TO_CHAR(c.fecha, 'YYYY-MM-DD') AS fecha,
            c.estado,
            c.costo_original::float8 AS costo_original,
            c.costo_final::float8 AS costo_final,
            c.valor_pagado::float8 AS valor_pagado,
            c.observaciones,
            c.creado_en,
            c.actualizado_en,
            c.cerrado_en,
            p.nombre AS proveedor_nombre,
            p.tipo_documento,
            p.documento,
            p.contacto,
            p.telefono,
            p.correo,
            p.direccion,
            p.ciudad,
            p.estado AS proveedor_estado,
            TRIM(u.nombres || ' ' || u.apellidos) AS registrado_por_nombre
       FROM compra c
       JOIN proveedor p ON p.id_proveedor = c.id_proveedor
       LEFT JOIN usuario u ON u.id_usuario = c.registrado_por
      WHERE c.id_compra = $1`,
    [idCompra]
  )
  if (rows.length === 0) return null

  const {
    proveedor_nombre,
    tipo_documento,
    documento,
    contacto,
    telefono,
    correo,
    direccion,
    ciudad,
    proveedor_estado,
    ...compra
  } = rows[0]

  const { rows: detalles } = await db.query(
    `SELECT dc.id_detalle,
            dc.id_variante,
            dc.cantidad_solicitada,
            COALESCE(dc.cantidad_cancelada, 0) AS cantidad_cancelada,
            dc.costo_unitario::float8 AS costo_unitario,
            dc.motivo_cancelacion,
            p.nombre AS producto,
            p.codigo,
            t.nombre AS talla,
            c.nombre AS color,
            COALESCE(SUM(dr.cantidad_recibida), 0)::int AS cantidad_recibida,
            GREATEST(
              dc.cantidad_solicitada - COALESCE(dc.cantidad_cancelada, 0) -
              COALESCE(SUM(dr.cantidad_recibida), 0),
              0
            )::int AS cantidad_pendiente,
            (dc.cantidad_solicitada * dc.costo_unitario)::float8 AS subtotal_solicitado,
            (COALESCE(SUM(dr.cantidad_recibida), 0) * dc.costo_unitario)::float8 AS subtotal_recibido
       FROM detalle_compra dc
       JOIN producto_variante pv ON pv.id_variante = dc.id_variante
       JOIN producto p ON p.id_producto = pv.id_producto
       LEFT JOIN talla t ON t.id_talla = pv.id_talla
       LEFT JOIN color c ON c.id_color = pv.id_color
       LEFT JOIN detalle_recepcion dr ON dr.id_detalle = dc.id_detalle
      WHERE dc.id_compra = $1
      GROUP BY dc.id_detalle, dc.id_variante, dc.cantidad_solicitada,
               dc.cantidad_cancelada, dc.costo_unitario, dc.motivo_cancelacion,
               p.nombre, p.codigo, t.nombre, c.nombre
      ORDER BY dc.id_detalle`,
    [idCompra]
  )

  const { rows: recepciones } = await db.query(
    `SELECT r.id_recepcion,
            r.id_compra,
            r.recibido_por,
            TO_CHAR(r.fecha_recepcion, 'YYYY-MM-DD') AS fecha_recepcion,
            r.clave_idempotencia,
            r.observaciones,
            r.creado_en,
            TRIM(u.nombres || ' ' || u.apellidos) AS recibido_por_nombre
       FROM recepcion_compra r
       LEFT JOIN usuario u ON u.id_usuario = r.recibido_por
      WHERE r.id_compra = $1
      ORDER BY r.id_recepcion`,
    [idCompra]
  )

  let lineasRecepcion = []
  if (recepciones.length > 0) {
    const ids = recepciones.map((r) => r.id_recepcion)
    const { rows } = await db.query(
      `SELECT dr.id_detalle_recepcion,
              dr.id_recepcion,
              dr.id_detalle,
              dr.cantidad_recibida,
              dc.id_variante,
              p.nombre AS producto,
              t.nombre AS talla,
              c.nombre AS color
         FROM detalle_recepcion dr
         JOIN detalle_compra dc ON dc.id_detalle = dr.id_detalle
         JOIN producto_variante pv ON pv.id_variante = dc.id_variante
         JOIN producto p ON p.id_producto = pv.id_producto
         LEFT JOIN talla t ON t.id_talla = pv.id_talla
         LEFT JOIN color c ON c.id_color = pv.id_color
        WHERE dr.id_recepcion = ANY($1::int[])
        ORDER BY dr.id_detalle_recepcion`,
      [ids]
    )
    lineasRecepcion = rows
  }

  const porRecepcion = new Map()
  for (const linea of lineasRecepcion) {
    if (!porRecepcion.has(linea.id_recepcion)) porRecepcion.set(linea.id_recepcion, [])
    porRecepcion.get(linea.id_recepcion).push(linea)
  }

  const { rows: movimientos } = await db.query(
    `SELECT m.id_movimiento,
            m.id_proveedor,
            m.id_compra_origen,
            m.id_compra_destino,
            m.id_movimiento_origen,
            m.tipo,
            m.monto::float8 AS monto,
            m.registrado_por,
            m.clave_idempotencia,
            m.observaciones,
            m.creado_en,
            co.codigo AS compra_origen_codigo,
            cd.codigo AS compra_destino_codigo,
            TRIM(u.nombres || ' ' || u.apellidos) AS registrado_por_nombre
       FROM movimiento_saldo_proveedor m
       LEFT JOIN compra co ON co.id_compra = m.id_compra_origen
       LEFT JOIN compra cd ON cd.id_compra = m.id_compra_destino
       LEFT JOIN usuario u ON u.id_usuario = m.registrado_por
      WHERE m.id_compra_origen = $1::integer
          OR m.id_compra_destino = $1::integer
      ORDER BY m.id_movimiento`,
    [idCompra]
  )

  const saldoAplicado = await saldoAplicadoCompra(db, idCompra)
  const valorPagado = redondear(compra.valor_pagado)
  const costoFinal = redondear(compra.costo_final)
  const valorCubierto = redondear(valorPagado + saldoAplicado)
  const saldoPendiente = Math.max(0, redondear(costoFinal - valorCubierto))
  const saldoDisponible = await saldoDisponibleProveedor(db, compra.id_proveedor)

  // Saldo a favor que todavía queda de esta compra: lo que generó menos lo
  // que ya se aplicó a otras compras.
  let generado = 0
  let consumido = 0
  for (const movimiento of movimientos) {
    if (movimiento.tipo === 'GENERADO' && movimiento.id_compra_origen === idCompra) {
      generado += Number(movimiento.monto)
    }
    if (movimiento.tipo === 'APLICADO' && movimiento.id_compra_origen === idCompra) {
      consumido += Number(movimiento.monto)
    }
  }
  const saldoAFavorRelacionado = Math.max(0, redondear(generado - consumido))

  const totalSolicitado = detalles.reduce((s, d) => s + Number(d.cantidad_solicitada), 0)
  const totalRecibido = detalles.reduce((s, d) => s + Number(d.cantidad_recibida), 0)
  const totalCancelado = detalles.reduce((s, d) => s + Number(d.cantidad_cancelada), 0)
  const totalPendiente = detalles.reduce((s, d) => s + Number(d.cantidad_pendiente), 0)

  return {
    ...compra,
    proveedor: {
      id: compra.id_proveedor,
      nombre: proveedor_nombre,
      tipo_documento,
      documento,
      contacto,
      telefono,
      correo,
      direccion,
      ciudad,
      estado: proveedor_estado,
    },
    detalles,
    recepciones: recepciones.map((recepcion) => ({
      ...recepcion,
      detalles: porRecepcion.get(recepcion.id_recepcion) || [],
    })),
    movimientos_saldo: movimientos,
    resumen: {
      costo_original: redondear(compra.costo_original),
      costo_final: costoFinal,
      valor_pagado: valorPagado,
      saldo_aplicado: saldoAplicado,
      valor_cubierto: valorCubierto,
      saldo_pendiente: saldoPendiente,
      estado_pago: calcularEstadoPago(costoFinal, valorCubierto),
      saldo_disponible_proveedor: saldoDisponible,
      saldo_a_favor_relacionado: saldoAFavorRelacionado,
      total_solicitado: totalSolicitado,
      total_recibido: totalRecibido,
      total_cancelado: totalCancelado,
      total_pendiente: totalPendiente,
      lineas: detalles.length,
    },
  }
}

// Reexporta el pool para que las rutas no tengan que importarlo dos veces.
export { pool }
