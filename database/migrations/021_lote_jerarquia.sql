-- Jerarquía de lotes: lote padre (compra) → lotes hijos (productos) → tarimas

-- Añadir estados PENDIENTE y TRASPASADO al enum
ALTER TYPE estado_lote ADD VALUE IF NOT EXISTS 'PENDIENTE' BEFORE 'RECIBIDO';
ALTER TYPE estado_lote ADD VALUE IF NOT EXISTS 'TRASPASADO' AFTER 'TRANSITO';

-- Permitir NULL en producto_id y bodega_id para lotes padre
ALTER TABLE lotes ALTER COLUMN producto_id DROP NOT NULL;
ALTER TABLE lotes ALTER COLUMN bodega_id DROP NOT NULL;

-- Columna padre (autoreferencia)
ALTER TABLE lotes ADD COLUMN IF NOT EXISTS lote_padre_id UUID REFERENCES lotes(id);
CREATE INDEX IF NOT EXISTS idx_lotes_padre ON lotes(lote_padre_id);

-- Trigger para updated_at automático
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_lotes_updated_at ON lotes;
CREATE TRIGGER trg_lotes_updated_at
    BEFORE UPDATE ON lotes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
