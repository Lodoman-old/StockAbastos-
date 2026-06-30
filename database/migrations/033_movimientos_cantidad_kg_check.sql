BEGIN;

ALTER TABLE movimientos DROP CONSTRAINT IF EXISTS movimientos_cantidad_kg_check;
ALTER TABLE movimientos ADD CHECK (cantidad_kg >= 0);

COMMIT;
