-- Nuevo estado para lotes que ya no tienen inventario activo
ALTER TYPE estado_lote ADD VALUE IF NOT EXISTS 'COMPLETADO' AFTER 'VENDIDO';
