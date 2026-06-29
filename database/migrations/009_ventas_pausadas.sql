BEGIN;

CREATE TABLE IF NOT EXISTS ventas_pausadas (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id      UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    datos_json      JSONB NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO permisos (id, clave, nombre, descripcion)
VALUES ('e0000000-0000-0000-0000-000000000019', 'pausar_ventas', 'Pausar/Reanudar Ventas', 'Permite pausar una venta en curso y reanudarla después')
ON CONFLICT (clave) DO NOTHING;

INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT 'd0000000-0000-0000-0000-000000000001', id FROM permisos WHERE clave = 'pausar_ventas'
ON CONFLICT DO NOTHING;

INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT 'd0000000-0000-0000-0000-000000000002', id FROM permisos WHERE clave = 'pausar_ventas'
ON CONFLICT DO NOTHING;

COMMIT;
