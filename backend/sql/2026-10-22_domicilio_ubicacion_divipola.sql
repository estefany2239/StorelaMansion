-- =========================================================
-- Migración: ubicación estructurada en la tabla domicilio
-- Catálogo DANE DIVIPOLA (departamento / municipio) + barrio
-- y datos del destinatario del checkout.
--
-- Convención del proyecto: SQL idempotente para ejecutar a mano
-- en Neon (no hay runner de migraciones). Se puede aplicar más
-- de una vez sin error ni pérdida de datos.
--
-- Los pedidos históricos conservan su texto original en
-- direccion_entrega y estas columnas quedan NULL; el frontend
-- y el backend usan ese texto como fallback.
--
-- Tipos y longitudes iguales a los ya aplicados en Neon.
-- Sin datos sensibles ni DML.
-- =========================================================

ALTER TABLE domicilio ADD COLUMN IF NOT EXISTS departamento varchar(100);
ALTER TABLE domicilio ADD COLUMN IF NOT EXISTS municipio varchar(100);
ALTER TABLE domicilio ADD COLUMN IF NOT EXISTS barrio varchar(100);
ALTER TABLE domicilio ADD COLUMN IF NOT EXISTS nombre_destinatario varchar(100);
ALTER TABLE domicilio ADD COLUMN IF NOT EXISTS telefono_destinatario varchar(15);
