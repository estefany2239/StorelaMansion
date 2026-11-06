-- =========================================================
-- Migración: estado de verificación del pago del pedido
--
-- Convención del proyecto: SQL idempotente para ejecutar a mano
-- en Neon (no hay runner de migraciones).
--
-- No elimina columnas, filas ni restricciones existentes.
-- No modifica la tabla pago: los pagos históricos quedan intactos.
--
-- Valores de pedido.estado_pago:
--   Pendiente de verificación -> pedido nuevo aún no confirmado por la tienda
--   Pago confirmado           -> la tienda confirmó el pago (total o abono)
--   Pago rechazado            -> la tienda rechazó el pago
--   No aplica                 -> pedidos históricos sin verificación
--
-- Un estado_pago NULL se trata como "No aplica" en el código.
-- Los pedidos históricos quedan todos en "No aplica": son anteriores
-- al flujo de verificación y conservan intactos sus pagos.
-- =========================================================

BEGIN;

-- 1) Nueva columna de estado de pago.
ALTER TABLE pedido
  ADD COLUMN IF NOT EXISTS estado_pago varchar(30);

-- 2) Nueva columna para conservar el método elegido mientras el pago
--    está pendiente. Es necesaria para saber si al aprobar se registra
--    el total (Transferencia) o el abono del 50 % (Contra entrega).
ALTER TABLE pedido
  ADD COLUMN IF NOT EXISTS metodo_pago varchar(50);

-- 3) Todos los pedidos existentes quedan como "No aplica".
UPDATE pedido
SET estado_pago = 'No aplica'
WHERE estado_pago IS NULL;

-- 4) Valores permitidos (idempotente, sin borrar restricciones existentes).
--    Un CHECK acepta NULL implícitamente: no se agrega NOT NULL ni DEFAULT.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'pedido_estado_pago_check'
      AND conrelid = 'pedido'::regclass
  ) THEN
    ALTER TABLE pedido
      ADD CONSTRAINT pedido_estado_pago_check
      CHECK (estado_pago IN (
        'Pendiente de verificación',
        'Pago confirmado',
        'Pago rechazado',
        'No aplica'
      ));
  END IF;
END $$;

COMMIT;
