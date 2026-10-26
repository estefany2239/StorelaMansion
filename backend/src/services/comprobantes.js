import { pool } from '../config/db.js'

export const MAX_BYTES_COMPROBANTE = 2 * 1024 * 1024
export const MAX_INTENTOS_COMPROBANTE = 3

export const detectarTipoComprobante = (contenido) => {
  if (!Buffer.isBuffer(contenido) || contenido.length === 0) return null

  if (
    contenido.length >= 3 &&
    contenido[0] === 0xff &&
    contenido[1] === 0xd8 &&
    contenido[2] === 0xff
  ) {
    return 'image/jpeg'
  }

  if (
    contenido.length >= 8 &&
    contenido[0] === 0x89 &&
    contenido[1] === 0x50 &&
    contenido[2] === 0x4e &&
    contenido[3] === 0x47 &&
    contenido[4] === 0x0d &&
    contenido[5] === 0x0a &&
    contenido[6] === 0x1a &&
    contenido[7] === 0x0a
  ) {
    return 'image/png'
  }

  if (
    contenido.length >= 12 &&
    contenido.subarray(0, 4).toString('ascii') === 'RIFF' &&
    contenido.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp'
  }

  if (
    contenido.length >= 5 &&
    contenido.subarray(0, 5).toString('ascii') === '%PDF-'
  ) {
    return 'application/pdf'
  }

  return null
}

const sanearNombre = (nombre) => {
  const base = String(nombre ?? '').split(/[\\/]/).pop() || 'comprobante'
  const limpio = base
    .normalize('NFKC')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/[^A-Za-z0-9 ._()\-]/g, '_')
    .replace(/\s+/g, ' ')
    .replace(/^\.+/, '')
    .trim()

  return (limpio || 'comprobante').slice(0, 255)
}

const COLUMNAS_HISTORIAL = `
  c.id_comprobante AS id,
  c.id_pedido,
  c.subido_por,
  c.tipo_mime,
  c.tamano_bytes,
  c.nombre_original,
  c.estado,
  c.motivo_rechazo,
  c.intento,
  c.creado_en AS fecha_carga,
  c.revisado_por AS revisor_id,
  COALESCE(TRIM(r.nombres || ' ' || r.apellidos), NULL) AS revisor,
  c.revisado_en AS fecha_revision,
  c.ubicacion_almacenamiento,
  c.referencia_externa
`

export async function guardar(
  {
    idPedido,
    subidoPor,
    contenido,
    tipoMime,
    nombreOriginal,
    intento,
  },
  db = pool
) {
  const { rows } = await db.query(
    `INSERT INTO comprobante_pago
       (id_pedido, subido_por, contenido, tipo_mime, tamano_bytes,
        nombre_original, estado, intento, ubicacion_almacenamiento,
        referencia_externa)
     VALUES ($1, $2, $3, $4, $5, $6, 'Pendiente', $7, 'neon', NULL)
     RETURNING id_comprobante AS id, id_pedido, subido_por, tipo_mime,
               tamano_bytes, nombre_original, estado, motivo_rechazo,
               revisado_por AS revisor_id, revisado_en AS fecha_revision,
               creado_en AS fecha_carga, intento,
               ubicacion_almacenamiento, referencia_externa`,
    [
      idPedido,
      subidoPor,
      contenido,
      tipoMime,
      contenido.length,
      sanearNombre(nombreOriginal),
      intento,
    ]
  )

  return rows[0]
}

export async function leer(
  idPedido,
  { idComprobante = null, incluirContenido = false } = {},
  db = pool
) {
  const contenido = incluirContenido ? ', c.contenido' : ''
  const base = `
    SELECT ${COLUMNAS_HISTORIAL}${contenido}
      FROM comprobante_pago c
      LEFT JOIN usuario r ON r.id_usuario = c.revisado_por
     WHERE c.id_pedido = $1
  `

  if (idComprobante !== null && idComprobante !== undefined) {
    const { rows } = await db.query(
      `${base} AND c.id_comprobante = $2 LIMIT 1`,
      [idPedido, idComprobante]
    )
    return rows[0] || null
  }

  const { rows } = await db.query(
    `${base} ORDER BY c.creado_en DESC, c.id_comprobante DESC`,
    [idPedido]
  )
  return rows
}

export async function resumen(idPedido, db = pool) {
  const { rows } = await db.query(
    `SELECT COUNT(*)::int AS intentos,
            COALESCE(MAX(intento), 0)::int AS intento_maximo,
            COALESCE(BOOL_OR(estado = 'Pendiente'), FALSE) AS pendiente,
            COALESCE(BOOL_OR(estado = 'Aprobado'), FALSE) AS aprobado
       FROM comprobante_pago
      WHERE id_pedido = $1`,
    [idPedido]
  )

  const fila = rows[0]
  return {
    intentos: fila.intentos,
    intento_maximo: fila.intento_maximo,
    siguiente_intento: fila.intento_maximo + 1,
    pendiente: fila.pendiente,
    aprobado: fila.aprobado,
  }
}

// Lee un comprobante del pedido bloqueándolo para revisión. La fila queda
// bloqueada hasta que la transacción termine, así dos revisiones simultáneas
// no pueden decidir sobre el mismo comprobante.
export async function leerParaRevision(idPedido, idComprobante, db = pool) {
  const { rows } = await db.query(
    `SELECT c.id_comprobante AS id,
            c.id_pedido,
            c.estado,
            c.motivo_rechazo,
            c.intento,
            c.creado_en AS fecha_carga
       FROM comprobante_pago c
      WHERE c.id_pedido = $1 AND c.id_comprobante = $2
      FOR UPDATE`,
    [idPedido, idComprobante]
  )
  return rows[0] || null
}

export async function marcarAprobado(idPedido, idComprobante, revisadoPor, db = pool) {
  const { rows } = await db.query(
    `UPDATE comprobante_pago
        SET estado = 'Aprobado',
            motivo_rechazo = NULL,
            revisado_por = $3,
            revisado_en = now()
      WHERE id_pedido = $1
        AND id_comprobante = $2
        AND estado = 'Pendiente'
      RETURNING id_comprobante AS id, id_pedido, estado,
                revisado_por AS revisor_id, revisado_en AS fecha_revision`,
    [idPedido, idComprobante, revisadoPor]
  )
  return rows[0] || null
}

export async function marcarRechazado(
  idPedido,
  idComprobante,
  revisadoPor,
  motivo,
  db = pool
) {
  const { rows } = await db.query(
    `UPDATE comprobante_pago
        SET estado = 'Rechazado',
            motivo_rechazo = $4,
            revisado_por = $3,
            revisado_en = now()
      WHERE id_pedido = $1
        AND id_comprobante = $2
        AND estado = 'Pendiente'
      RETURNING id_comprobante AS id, id_pedido, estado, motivo_rechazo,
                revisado_por AS revisor_id, revisado_en AS fecha_revision`,
    [idPedido, idComprobante, revisadoPor, motivo]
  )
  return rows[0] || null
}

export async function borrar(idComprobante, db = pool) {
  const { rowCount } = await db.query(
    'DELETE FROM comprobante_pago WHERE id_comprobante = $1',
    [idComprobante]
  )
  return rowCount > 0
}
