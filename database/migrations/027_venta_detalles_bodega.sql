ALTER TABLE venta_detalles ADD COLUMN IF NOT EXISTS bodega_id UUID REFERENCES bodegas(id);
