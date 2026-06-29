BEGIN;

ALTER TABLE productos ADD COLUMN IF NOT EXISTS precio_por_unidad NUMERIC(12,2);
ALTER TABLE venta_detalles ADD COLUMN IF NOT EXISTS cantidad_unidades INTEGER CHECK (cantidad_unidades IS NULL OR cantidad_unidades > 0);

COMMIT;
