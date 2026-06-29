BEGIN;

ALTER TABLE ubicaciones ADD COLUMN IF NOT EXISTS es_venta_principal BOOLEAN NOT NULL DEFAULT FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_ubicacion_principal_unique
    ON ubicaciones (es_venta_principal) WHERE es_venta_principal = TRUE;

UPDATE ubicaciones SET es_venta_principal = TRUE WHERE id = 'f0000000-0000-0000-0000-000000000001';

COMMIT;
