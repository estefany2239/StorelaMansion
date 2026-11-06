-- =========================================================
-- PROPUESTA: clave de idempotencia para ventas de mostrador
--
-- NO APLICADA. Este archivo solo documenta el SQL necesario para
-- protegerse también contra reintentos de red o dobles envíos que
-- el navegador no logre evitar (el bloqueo del botón cubre el doble
-- clic normal, pero no un reenvío automático de la petición).
--
-- La columna queda opcional: las ventas existentes y las que crea
-- el flujo de pedidos de la tienda conservan clave_idempotencia NULL.
-- =========================================================

BEGIN;

ALTER TABLE venta
  ADD COLUMN IF NOT EXISTS clave_idempotencia VARCHAR(80);

-- Índice único parcial: solo las ventas nuevas de mostrador que envíen
-- una clave participan. Un segundo POST con la misma clave choca aquí.
CREATE UNIQUE INDEX IF NOT EXISTS venta_clave_idempotencia_ux
  ON venta (clave_idempotencia)
  WHERE clave_idempotencia IS NOT NULL;

COMMIT;

-- Uso previsto en POST /api/ventas (cuando se apruebe la migración):
--   1. El frontend genera una clave por apertura del formulario
--      (por ejemplo crypto.randomUUID()) y la reenvía en el body.
--   2. El backend inserta la clave junto con la venta.
--   3. Si PostgreSQL responde 23505 (unique_violation), se busca la
--      venta existente por clave y se responde con esa venta (200),
--      sin volver a descontar stock.
