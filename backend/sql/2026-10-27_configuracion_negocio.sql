-- =========================================================
-- Configuración del negocio para los comprobantes de venta
--
-- NO APLICADA. Ejecutar a mano en Neon cuando se autorice.
-- Convención del proyecto: SQL idempotente, sin datos inventados.
--
-- La tabla admite una sola fila (id_configuracion = 1). Todos los
-- datos comerciales nacen NULL; el nombre visible del PDF usa el
-- valor de esta fila y, si está vacío, "Store La Mansión".
-- =========================================================

BEGIN;

CREATE TABLE IF NOT EXISTS configuracion_negocio (
  id_configuracion SMALLINT PRIMARY KEY DEFAULT 1,
  nombre VARCHAR(150) NULL,
  nit VARCHAR(30) NULL,
  direccion VARCHAR(255) NULL,
  telefono VARCHAR(30) NULL,
  correo VARCHAR(150) NULL,
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT configuracion_negocio_fila_unica
    CHECK (id_configuracion = 1)
);

INSERT INTO configuracion_negocio (id_configuracion)
VALUES (1)
ON CONFLICT (id_configuracion) DO NOTHING;

COMMIT;

-- Carga de datos reales (sustituir los valores entre comillas):
--
-- UPDATE configuracion_negocio
-- SET nombre = 'Store La Mansión',
--     nit = 'NIT REAL',
--     direccion = 'DIRECCIÓN REAL',
--     telefono = 'TELÉFONO REAL',
--     correo = 'CORREO REAL',
--     actualizado_en = NOW()
-- WHERE id_configuracion = 1;
