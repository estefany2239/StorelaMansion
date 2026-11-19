-- =========================================================
-- Migración: costo de envío calculado por el backend
--
-- Convención del proyecto: SQL idempotente para ejecutar a mano
-- en Neon (no hay runner de migraciones).
--
-- costo_envio:
--   NULL  -> costo por confirmar
--   0     -> sin costo de envío
--   > 0   -> tarifa definida
--
-- costo_envio_pendiente:
--   true  -> la tarifa todavía no está definida
--   false -> costo definido o sin costo
--
-- Los pedidos históricos quedan con costo_envio NULL y
-- costo_envio_pendiente FALSE; su visualización no cambia.
-- No se elimina ni se modifica ninguna columna existente.
-- =========================================================

ALTER TABLE pedido ADD COLUMN IF NOT EXISTS costo_envio numeric(12,2);
ALTER TABLE pedido ADD COLUMN IF NOT EXISTS costo_envio_pendiente boolean DEFAULT false;
