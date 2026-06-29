-- Hacer lote_id nullable en venta_detalles (para ventas de menudeo sin lote)
ALTER TABLE venta_detalles ALTER COLUMN lote_id DROP NOT NULL;
