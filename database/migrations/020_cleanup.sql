-- Limpieza del flujo anterior (kg/pieza, traspasos manuales)
-- Nos quedamos solo con el flujo de tarimas

-- 1. Eliminar columnas obsoletas de lotes (peso y cantidades ahora van por tarima)
ALTER TABLE lotes DROP COLUMN IF EXISTS cantidad_recibida_kg;
ALTER TABLE lotes DROP COLUMN IF EXISTS cantidad_actual_kg;
ALTER TABLE lotes DROP COLUMN IF EXISTS peso_estimado_kg;

-- 2. Simplificar compra_detalles: solo lo necesario para tarimas
ALTER TABLE compra_detalles DROP COLUMN IF EXISTS cantidad_kg;
ALTER TABLE compra_detalles DROP COLUMN IF EXISTS precio_kg;
ALTER TABLE compra_detalles DROP COLUMN IF EXISTS cantidad_unidades;
ALTER TABLE compra_detalles DROP COLUMN IF EXISTS subtotal;

-- 3. Eliminar tablas de traspasos (reemplazado por traspaso de tarimas)
DROP TABLE IF EXISTS traspaso_detalles CASCADE;
DROP TABLE IF EXISTS traspasos CASCADE;

-- 4. Eliminar función y secuencia de código de lote anterior
DROP FUNCTION IF EXISTS generar_codigo_lote() CASCADE;
DROP SEQUENCE IF EXISTS seq_codigo_lote;
