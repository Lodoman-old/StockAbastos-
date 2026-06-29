-- Revertir EN_TRANSITO sin bodega_destino_id a RECIBIDA
-- para que puedan re-asignarse
UPDATE tarimas SET estado = 'RECIBIDA', bodega_destino_id = NULL, updated_at = NOW()
WHERE estado = 'EN_TRANSITO' AND bodega_destino_id IS NULL;
