-- =========================================================
-- Backfill: crea la venta de los pedidos históricos que no la tengan.
--
-- NO se ejecuta automáticamente.
-- Ejecutar DESPUÉS de:
--   backend/sql/2026-10-23_comprobante_pago.sql
--   backend/sql/2026-10-25_ventas_pagos_notificaciones.sql
--
-- Idempotente: se puede ejecutar más de una vez.
-- No duplica ventas, no descuenta ni devuelve stock y no modifica
-- los pedidos existentes.
--
-- Reglas:
--   - origen = 'Tienda virtual'
--   - estado = 'Anulada' si pedido.estado = 'Cancelado'; si no, 'Completada'
--   - estado_pago = 'Pagada' si pedido.estado_pago = 'Pago confirmado' O
--     pedido.estado = 'Entregado'; si no, 'Pendiente'
--   - fecha_pago = fecha del pedido cuando queda 'Pagada'; si no, NULL
--   - id_vendedor = NULL (venta originada por el cliente)
--   - metodo_pago: se copia pedido.metodo_pago tal cual; si es NULL,
--     el primer pago registrado; si tampoco hay, 'Sin definir'
-- =========================================================

BEGIN;

-- Verificación explícita del prerrequisito.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'venta'
      AND column_name = 'id_pedido'
  ) THEN
    RAISE EXCEPTION
      'Falta venta.id_pedido. Ejecuta primero backend/sql/2026-10-25_ventas_pagos_notificaciones.sql';
  END IF;
END $$;

WITH pendientes AS (
  SELECT
    p.id_pedido,
    p.id_usuario,
    p.fecha,
    p.estado,
    p.estado_pago,
    p.total,
    COALESCE(p.metodo_pago, m.metodo, 'Sin definir') AS metodo_base,
    (p.estado_pago = 'Pago confirmado' OR p.estado = 'Entregado') AS pagada,
    COALESCE(
      NULLIF(
        btrim(
          TRIM(COALESCE(u.nombres, '') || ' ' || COALESCE(u.apellidos, ''))
        ),
        ''
      ),
      'Cliente sin nombre'
    ) AS nombre_cliente
  FROM pedido p
  LEFT JOIN usuario u
    ON u.id_usuario = p.id_usuario
  LEFT JOIN LATERAL (
    SELECT pg.metodo
    FROM pago pg
    WHERE pg.id_pedido = p.id_pedido
    ORDER BY pg.id_pago
    LIMIT 1
  ) m ON TRUE
  WHERE NOT EXISTS (
    SELECT 1
    FROM venta v
    WHERE v.id_pedido = p.id_pedido
  )
)
INSERT INTO venta (
  id_pedido,
  id_cliente,
  nombre_cliente,
  id_vendedor,
  fecha,
  metodo_pago,
  estado,
  total,
  origen,
  estado_pago,
  fecha_pago
)
SELECT
  id_pedido,
  id_usuario,
  LEFT(nombre_cliente, 100),
  NULL,
  fecha,
  metodo_base,
  CASE
    WHEN estado = 'Cancelado' THEN 'Anulada'
    ELSE 'Completada'
  END,
  total,
  'Tienda virtual',
  CASE
    WHEN pagada THEN 'Pagada'
    ELSE 'Pendiente'
  END,
  CASE
    WHEN pagada THEN fecha::timestamp
    ELSE NULL
  END
FROM pendientes
ON CONFLICT DO NOTHING;

-- Copia las líneas de detalle_pedido a detalle_venta para las ventas
-- de tienda virtual que todavía no tengan detalle. Es idempotente y
-- no toca el stock.
INSERT INTO detalle_venta (
  id_venta,
  id_variante,
  cantidad,
  precio_unitario
)
SELECT
  v.id_venta,
  dp.id_variante,
  dp.cantidad,
  dp.precio_unitario
FROM venta v
JOIN detalle_pedido dp
  ON dp.id_pedido = v.id_pedido
WHERE v.origen = 'Tienda virtual'
  AND v.id_pedido IS NOT NULL
  AND dp.cantidad > 0
  AND dp.precio_unitario >= 0
  AND NOT EXISTS (
    SELECT 1
    FROM detalle_venta dv
    WHERE dv.id_venta = v.id_venta
  )
ON CONFLICT DO NOTHING;

COMMIT;
