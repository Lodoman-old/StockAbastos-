-- Revertir tarimas que quedaron EN_TRANSITO por error del flujo anterior
-- Las regresa a RECIBIDA y limpia su bodega_destino_id
UPDATE tarimas SET estado = 'RECIBIDA', updated_at = NOW()
WHERE estado = 'EN_TRANSITO' AND recibida_at IS NOT NULL;
