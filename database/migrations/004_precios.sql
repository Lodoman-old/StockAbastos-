BEGIN;

ALTER TABLE productos ADD COLUMN IF NOT EXISTS precio_por_kg NUMERIC(12,2);
ALTER TABLE productos ADD COLUMN IF NOT EXISTS precio_por_caja NUMERIC(12,2);

UPDATE productos SET
    precio_por_kg = 15.00,
    precio_por_caja = peso_estimado_kg * 12.00
WHERE precio_por_kg IS NULL;

COMMIT;
