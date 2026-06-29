-- Remodelar productos: nuevos precios y modalidades de venta
-- Bodega mostrador virtual para menudeo

-- 1. Nuevas columnas de precio y modalidad
ALTER TABLE productos ADD COLUMN IF NOT EXISTS precio_mayoreo_kg    NUMERIC(12,2);
ALTER TABLE productos ADD COLUMN IF NOT EXISTS precio_menudeo_kg    NUMERIC(12,2);
ALTER TABLE productos ADD COLUMN IF NOT EXISTS precio_caja_sellada  NUMERIC(12,2);
ALTER TABLE productos ADD COLUMN IF NOT EXISTS peso_caja_sellada_kg NUMERIC(10,4);
ALTER TABLE productos ADD COLUMN IF NOT EXISTS destare_kg           NUMERIC(10,4) DEFAULT 2.0;

ALTER TABLE productos ADD COLUMN IF NOT EXISTS modalidad_caja_pesada   BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS modalidad_caja_sellada  BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS modalidad_kilo_suelto   BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS modalidad_unidad        BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Eliminar columnas obsoletas
ALTER TABLE productos DROP COLUMN IF EXISTS unidad_venta;
ALTER TABLE productos DROP COLUMN IF EXISTS peso_estimado_kg;
ALTER TABLE productos DROP COLUMN IF EXISTS precio_por_kg;
ALTER TABLE productos DROP COLUMN IF EXISTS precio_por_caja;

-- 3. Columna es_mostrador en bodegas
ALTER TABLE bodegas ADD COLUMN IF NOT EXISTS es_mostrador BOOLEAN NOT NULL DEFAULT FALSE;

-- 4. Tabla de stock del mostrador (inventario virtual para menudeo)
CREATE TABLE IF NOT EXISTS mostrador_stock (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    producto_id     UUID         NOT NULL REFERENCES productos(id),
    cantidad_kg     NUMERIC(12,4),
    cantidad_piezas INTEGER      DEFAULT 0,
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_mostrador_stock_producto ON mostrador_stock(producto_id);
