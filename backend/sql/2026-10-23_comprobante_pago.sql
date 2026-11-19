-- =========================================================
-- Migración: comprobantes de pago de pedidos
--
-- Convención del proyecto: SQL idempotente para ejecutar a mano
-- en Neon (no hay runner de migraciones).
--
-- Esta migración NO modifica pedido, pago ni ninguna tabla existente.
-- Solo crea la tabla nueva comprobante_pago y sus índices.
--
-- Decisiones acordadas:
--   - Archivo guardado en Neon como BYTEA (no hay disco en Render).
--   - Tamaño máximo por archivo: 2 MB (2 * 1024 * 1024 = 2097152 bytes).
--   - Tipos permitidos, validados también en el backend por contenido:
--       image/jpeg, image/png, image/webp, application/pdf
--   - Máximo 3 intentos de subida por pedido.
--   - Un solo comprobante Pendiente y uno solo Aprobado por pedido.
--   - El stock del pedido NO se toca en esta migración.
--   - Los pedidos históricos y sus pagos quedan intactos.
--
-- La fila en pago se sigue creando únicamente al aprobar el comprobante.
-- =========================================================

BEGIN;

CREATE TABLE IF NOT EXISTS comprobante_pago (
  id_comprobante BIGSERIAL PRIMARY KEY,
  id_pedido      INTEGER NOT NULL
                 REFERENCES pedido(id_pedido) ON DELETE CASCADE,
  subido_por     INTEGER
                 REFERENCES usuario(id_usuario) ON DELETE SET NULL,
  contenido      BYTEA NOT NULL,
  tipo_mime      VARCHAR(50) NOT NULL,
  tamano_bytes   INTEGER NOT NULL,
  nombre_original VARCHAR(255),
  estado         VARCHAR(20) NOT NULL DEFAULT 'Pendiente',
  motivo_rechazo TEXT,
  revisado_por   INTEGER
                 REFERENCES usuario(id_usuario) ON DELETE SET NULL,
  revisado_en    TIMESTAMPTZ,
  creado_en      TIMESTAMPTZ NOT NULL DEFAULT now(),
  intento        SMALLINT NOT NULL DEFAULT 1,
  CONSTRAINT comprobante_pago_estado_check
    CHECK (estado IN ('Pendiente', 'Aprobado', 'Rechazado')),
  CONSTRAINT comprobante_pago_tipo_check
    CHECK (tipo_mime IN (
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf'
    )),
  CONSTRAINT comprobante_pago_tamano_check
    CHECK (tamano_bytes > 0 AND tamano_bytes <= 2097152),
  CONSTRAINT comprobante_pago_tamano_real_check
    CHECK (tamano_bytes = octet_length(contenido)),
  CONSTRAINT comprobante_pago_intento_check
    CHECK (intento BETWEEN 1 AND 3),
  CONSTRAINT comprobante_pago_rechazo_check
    CHECK (
      estado <> 'Rechazado'
      OR (motivo_rechazo IS NOT NULL AND btrim(motivo_rechazo) <> '')
    )
);

-- Historial de comprobantes de un pedido, del más reciente al más antiguo.
CREATE INDEX IF NOT EXISTS idx_comprobante_pago_pedido
  ON comprobante_pago (id_pedido, creado_en DESC);

-- Un solo comprobante pendiente por pedido (evita dobles envíos en paralelo).
CREATE UNIQUE INDEX IF NOT EXISTS ux_comprobante_pago_pendiente
  ON comprobante_pago (id_pedido)
  WHERE estado = 'Pendiente';

-- Un solo comprobante aprobado por pedido (refuerza "no aprobar dos veces").
CREATE UNIQUE INDEX IF NOT EXISTS ux_comprobante_pago_aprobado
  ON comprobante_pago (id_pedido)
  WHERE estado = 'Aprobado';

-- El intento es único dentro del pedido: 1, 2 o 3.
CREATE UNIQUE INDEX IF NOT EXISTS ux_comprobante_pago_intento
  ON comprobante_pago (id_pedido, intento);

COMMENT ON TABLE comprobante_pago IS
  'Comprobantes privados de pago. El archivo vive en BYTEA; nunca se sirve con URL pública.';
COMMENT ON COLUMN comprobante_pago.contenido IS
  'Contenido binario del comprobante. Validado por magic bytes y tamaño en el backend.';
COMMENT ON COLUMN comprobante_pago.nombre_original IS
  'Nombre original saneado, solo informativo para la descarga.';
COMMENT ON COLUMN comprobante_pago.estado IS
  'Pendiente, Aprobado o Rechazado. La fila en pago se crea solo al aprobar.';
COMMENT ON COLUMN comprobante_pago.motivo_rechazo IS
  'Obligatorio cuando estado = Rechazado. Se escapa en el correo al cliente.';
COMMENT ON COLUMN comprobante_pago.intento IS
  'Número de intento de subida del pedido: 1 a 3.';

COMMIT;
