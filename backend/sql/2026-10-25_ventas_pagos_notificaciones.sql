-- =========================================================
-- Migración: ventas vinculadas a pedidos, pagos y notificaciones
--
-- PRERREQUISITO OBLIGATORIO:
--   Ejecutar antes backend/sql/2026-10-23_comprobante_pago.sql
--   (esta migración asume que comprobante_pago ya existe y
--   solo completa/ajusta lo que falte; no vuelve a crearla).
--
-- Convención del proyecto: SQL idempotente para ejecutar a mano
-- en Neon (no hay runner de migraciones). Se puede ejecutar más
-- de una vez sin duplicar columnas, restricciones ni índices.
--
-- Esta migración NO borra filas, NO borra historial y NO toca stock.
-- =========================================================

BEGIN;

-- ---------------------------------------------------------
-- 0) Prerrequisito: comprobante_pago debe existir.
-- ---------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.comprobante_pago') IS NULL THEN
    RAISE EXCEPTION
      'Falta la tabla comprobante_pago. Ejecuta primero backend/sql/2026-10-23_comprobante_pago.sql';
  END IF;
END $$;

-- ---------------------------------------------------------
-- 1) venta: vínculo con pedido, origen, estado de pago y método
-- ---------------------------------------------------------

ALTER TABLE venta
  ADD COLUMN IF NOT EXISTS id_pedido INTEGER;

ALTER TABLE venta
  ADD COLUMN IF NOT EXISTS origen VARCHAR(20) NOT NULL DEFAULT 'Mostrador';

ALTER TABLE venta
  ADD COLUMN IF NOT EXISTS estado_pago VARCHAR(20) NOT NULL DEFAULT 'Pendiente';

ALTER TABLE venta
  ADD COLUMN IF NOT EXISTS fecha_pago TIMESTAMP;

ALTER TABLE venta
  ALTER COLUMN id_vendedor DROP NOT NULL;

ALTER TABLE venta
  ALTER COLUMN metodo_pago TYPE VARCHAR(60);

ALTER TABLE venta
  ALTER COLUMN metodo_pago SET NOT NULL;

-- Las ventas de mostrador existentes ya estaban pagadas al momento
-- de la venta. Las ventas creadas por el backfill tienen id_pedido
-- y, por tanto, no entran en esta actualización.
UPDATE venta
SET estado_pago = 'Pagada',
    fecha_pago = COALESCE(fecha_pago, creado_en)
WHERE id_pedido IS NULL
  AND estado_pago = 'Pendiente'
  AND fecha_pago IS NULL;

-- El CHECK de metodo_pago se elimina: la validación de los métodos
-- de las ventas manuales vive en el código. No se vuelve a crear.
ALTER TABLE venta
  DROP CONSTRAINT IF EXISTS venta_metodo_pago_check;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'venta_origen_check'
      AND conrelid = 'venta'::regclass
  ) THEN
    ALTER TABLE venta
      ADD CONSTRAINT venta_origen_check
      CHECK (origen IN ('Tienda virtual', 'Mostrador'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'venta_estado_pago_check'
      AND conrelid = 'venta'::regclass
  ) THEN
    ALTER TABLE venta
      ADD CONSTRAINT venta_estado_pago_check
      CHECK (estado_pago IN ('Pendiente', 'Pagada'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'venta_id_pedido_fkey'
      AND conrelid = 'venta'::regclass
  ) THEN
    ALTER TABLE venta
      ADD CONSTRAINT venta_id_pedido_fkey
      FOREIGN KEY (id_pedido) REFERENCES pedido(id_pedido);
  END IF;
END $$;

-- ---------------------------------------------------------
-- 2) comprobante_pago: completa la tabla existente sin duplicarla
-- ---------------------------------------------------------

ALTER TABLE comprobante_pago
  ADD COLUMN IF NOT EXISTS estado VARCHAR(20) NOT NULL DEFAULT 'Pendiente';

ALTER TABLE comprobante_pago
  ADD COLUMN IF NOT EXISTS motivo_rechazo TEXT;

ALTER TABLE comprobante_pago
  ADD COLUMN IF NOT EXISTS revisado_por INTEGER
    REFERENCES usuario(id_usuario) ON DELETE SET NULL;

ALTER TABLE comprobante_pago
  ADD COLUMN IF NOT EXISTS revisado_en TIMESTAMPTZ;

-- El contenido pasa a ser opcional para permitir una migración
-- futura a almacenamiento externo (solo referencia_externa).
ALTER TABLE comprobante_pago
  ADD COLUMN IF NOT EXISTS contenido BYTEA;

ALTER TABLE comprobante_pago
  ALTER COLUMN contenido DROP NOT NULL;

ALTER TABLE comprobante_pago
  ADD COLUMN IF NOT EXISTS ubicacion_almacenamiento VARCHAR(20)
    NOT NULL DEFAULT 'neon';

ALTER TABLE comprobante_pago
  ADD COLUMN IF NOT EXISTS referencia_externa TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'comprobante_pago_estado_check'
      AND conrelid = 'comprobante_pago'::regclass
  ) THEN
    ALTER TABLE comprobante_pago
      ADD CONSTRAINT comprobante_pago_estado_check
      CHECK (estado IN ('Pendiente', 'Aprobado', 'Rechazado'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'comprobante_pago_rechazo_check'
      AND conrelid = 'comprobante_pago'::regclass
  ) THEN
    ALTER TABLE comprobante_pago
      ADD CONSTRAINT comprobante_pago_rechazo_check
      CHECK (
        estado <> 'Rechazado'
        OR (motivo_rechazo IS NOT NULL AND btrim(motivo_rechazo) <> '')
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'comprobante_pago_revisado_por_fkey'
      AND conrelid = 'comprobante_pago'::regclass
  ) THEN
    ALTER TABLE comprobante_pago
      ADD CONSTRAINT comprobante_pago_revisado_por_fkey
      FOREIGN KEY (revisado_por)
      REFERENCES usuario(id_usuario) ON DELETE SET NULL;
  END IF;
END $$;

-- ---------------------------------------------------------
-- 3) notificacion_correo
-- ---------------------------------------------------------

CREATE TABLE IF NOT EXISTS notificacion_correo (
  id BIGSERIAL PRIMARY KEY,
  id_pedido INTEGER NOT NULL
    REFERENCES pedido(id_pedido) ON DELETE CASCADE,
  id_comprobante BIGINT
    REFERENCES comprobante_pago(id_comprobante) ON DELETE SET NULL,
  tipo VARCHAR(20) NOT NULL,
  destinatario VARCHAR(254) NOT NULL,
  estado VARCHAR(20) NOT NULL,
  error TEXT,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  enviado_en TIMESTAMPTZ,
  CONSTRAINT notificacion_correo_tipo_check
    CHECK (tipo IN ('pago_aprobado', 'pago_rechazado')),
  CONSTRAINT notificacion_correo_estado_check
    CHECK (estado IN ('Enviado', 'Fallido')),
  CONSTRAINT notificacion_correo_comprobante_tipo_key
    UNIQUE (id_comprobante, tipo)
);

-- ---------------------------------------------------------
-- 4) Índices necesarios
-- ---------------------------------------------------------

-- Un pedido solo puede tener una venta (varias ventas sin pedido
-- siguen permitidas porque id_pedido queda NULL).
CREATE UNIQUE INDEX IF NOT EXISTS ux_venta_id_pedido
  ON venta (id_pedido);

CREATE INDEX IF NOT EXISTS idx_venta_estado_pago
  ON venta (estado_pago);

CREATE INDEX IF NOT EXISTS idx_venta_origen
  ON venta (origen);

CREATE INDEX IF NOT EXISTS idx_comprobante_pago_estado
  ON comprobante_pago (estado, creado_en DESC);

CREATE INDEX IF NOT EXISTS idx_comprobante_pago_revisado_por
  ON comprobante_pago (revisado_por);

CREATE INDEX IF NOT EXISTS idx_notificacion_correo_pedido
  ON notificacion_correo (id_pedido, creado_en DESC);

CREATE INDEX IF NOT EXISTS idx_notificacion_correo_comprobante
  ON notificacion_correo (id_comprobante);

CREATE INDEX IF NOT EXISTS idx_notificacion_correo_estado
  ON notificacion_correo (estado, creado_en DESC);

COMMIT;
