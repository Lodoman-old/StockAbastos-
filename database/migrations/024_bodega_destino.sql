-- Columna para asignación de traspaso pendiente
ALTER TABLE tarimas ADD COLUMN IF NOT EXISTS bodega_destino_id UUID REFERENCES bodegas(id);
CREATE INDEX IF NOT EXISTS idx_tarimas_bodega_destino ON tarimas(bodega_destino_id);
