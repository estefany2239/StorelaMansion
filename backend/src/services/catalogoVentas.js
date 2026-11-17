import { pool } from '../config/db.js'

const SIN_ESPACIOS_SQL = (columna) =>
  `LOWER(REGEXP_REPLACE(COALESCE(${columna}, ''), '\\s+', '', 'g'))`

export const buscarProductosVenta = async (texto) => {
  const patron = String(texto || '').replace(/\s+/g, '').toLowerCase()
  if (patron.length < 2) return []
  const { rows } = await pool.query(
    `SELECT p.id_producto AS id,
            p.id_producto,
            p.nombre,
            p.codigo,
            p.precio::float8 AS precio,
            SUM(pv.stock)::int AS stock_total,
            COUNT(*)::int AS variantes_disponibles
       FROM producto p
       JOIN producto_variante pv
         ON pv.id_producto = p.id_producto AND pv.stock > 0
      WHERE p.estado = TRUE
        AND (
          STRPOS(${SIN_ESPACIOS_SQL('p.nombre')}, $1) > 0
          OR STRPOS(${SIN_ESPACIOS_SQL('p.codigo')}, $1) > 0
        )
      GROUP BY p.id_producto, p.nombre, p.codigo, p.precio
      ORDER BY p.nombre
      LIMIT 15`,
    [patron]
  )
  return rows
}

export const tallasProductoVenta = async (idProducto) => {
  const { rows } = await pool.query(
    `SELECT t.id_talla AS id,
            t.id_talla,
            COALESCE(t.nombre, 'Sin talla') AS nombre,
            COALESCE(SUM(pv.stock), 0)::int AS stock,
            (COALESCE(SUM(pv.stock), 0) > 0) AS disponible
       FROM producto_variante pv
       JOIN producto p
         ON p.id_producto = pv.id_producto AND p.estado = TRUE
       LEFT JOIN talla t ON t.id_talla = pv.id_talla
      WHERE pv.id_producto = $1
      GROUP BY t.id_talla, t.nombre
      ORDER BY t.nombre NULLS LAST, t.id_talla`,
    [idProducto]
  )
  return rows
}

export const coloresProductoVenta = async (idProducto, idTalla) => {
  const { rows } = await pool.query(
    `SELECT co.id_color AS id,
            co.id_color,
            co.nombre,
            co.codigo_hex,
            SUM(pv.stock)::int AS stock
       FROM producto_variante pv
       JOIN producto p
         ON p.id_producto = pv.id_producto AND p.estado = TRUE
       JOIN color co ON co.id_color = pv.id_color
      WHERE pv.id_producto = $1
        AND pv.id_talla IS NOT DISTINCT FROM $2::int
        AND pv.stock > 0
      GROUP BY co.id_color, co.nombre, co.codigo_hex
      ORDER BY co.nombre`,
    [idProducto, idTalla]
  )
  return rows
}

export const varianteProductoVenta = async (idProducto, idTalla, idColor) => {
  const { rows } = await pool.query(
    `SELECT pv.id_variante,
            pv.stock,
            p.precio::float8 AS precio,
            pv.imagen,
            pv.id_producto,
            pv.id_talla,
            pv.id_color
       FROM producto_variante pv
       JOIN producto p
         ON p.id_producto = pv.id_producto AND p.estado = TRUE
      WHERE pv.id_producto = $1
        AND pv.id_talla IS NOT DISTINCT FROM $2::int
        AND pv.id_color = $3
      ORDER BY pv.id_variante
      LIMIT 1`,
    [idProducto, idTalla, idColor]
  )
  return rows[0] || null
}

export const clientesPanelVenta = async () => {
  const { rows } = await pool.query(
    `SELECT u.id_usuario AS id,
            TRIM(u.nombres || ' ' || u.apellidos) AS nombre,
            u.telefono,
            u.direccion
       FROM usuario u
       JOIN rol r ON r.id_rol = u.id_rol
      WHERE r.nombre = 'Cliente' AND u.estado = TRUE
      ORDER BY nombre`
  )
  return rows
}
