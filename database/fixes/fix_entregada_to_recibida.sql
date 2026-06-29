-- Cambiar tarimas con estado ENTREGADA a RECIBIDA
UPDATE tarimas SET estado = 'RECIBIDA', updated_at = NOW()
WHERE estado = 'ENTREGADA';
