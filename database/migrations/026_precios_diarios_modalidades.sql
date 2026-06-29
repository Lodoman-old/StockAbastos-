-- Add new pricing columns to precios_diarios for modalidad-based pricing
ALTER TABLE precios_diarios ADD COLUMN IF NOT EXISTS precio_mayoreo_kg NUMERIC(12,2);
ALTER TABLE precios_diarios ADD COLUMN IF NOT EXISTS precio_caja_sellada NUMERIC(12,2);
ALTER TABLE precios_diarios ADD COLUMN IF NOT EXISTS precio_menudeo_kg NUMERIC(12,2);
ALTER TABLE precios_diarios ADD COLUMN IF NOT EXISTS precio_unidad NUMERIC(12,2);
