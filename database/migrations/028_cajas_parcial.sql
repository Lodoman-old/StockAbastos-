-- Add cajas tracking columns
ALTER TABLE tarimas ADD COLUMN IF NOT EXISTS cajas_originales DECIMAL(10,2) NOT NULL DEFAULT 1;
ALTER TABLE tarimas ADD COLUMN IF NOT EXISTS cajas_restantes DECIMAL(10,2) NOT NULL DEFAULT 1;

-- Backfill from tarimas_tipos
UPDATE tarimas t
SET cajas_originales = COALESCE(tt.cantidad_cajas, 1),
    cajas_restantes  = COALESCE(tt.cantidad_cajas, 1)
FROM tarimas_tipos tt
WHERE t.tarima_tipo_id = tt.id
  AND (t.cajas_originales IS NULL OR t.cajas_originales = 1);

UPDATE tarimas SET cajas_originales = 1, cajas_restantes = 1
WHERE cajas_originales IS NULL;

-- Add PARCIAL to estado_tarima check constraint
ALTER TABLE tarimas DROP CONSTRAINT IF EXISTS tarimas_estado_check;
ALTER TABLE tarimas ADD CONSTRAINT tarimas_estado_check
  CHECK (estado IN ('PENDIENTE','RECIBIDA','PARCIAL','EN_TRANSITO','VENDIDA','MERMA'));
