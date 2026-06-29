BEGIN;

CREATE TABLE IF NOT EXISTS cortes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fecha DATE NOT NULL UNIQUE,
    total_ventas INT DEFAULT 0,
    total_ingresos NUMERIC(12,2) DEFAULT 0,
    total_kg NUMERIC(12,3) DEFAULT 0,
    ventas_contado INT DEFAULT 0,
    total_contado NUMERIC(12,2) DEFAULT 0,
    ventas_credito INT DEFAULT 0,
    total_credito NUMERIC(12,2) DEFAULT 0,
    total_gastos NUMERIC(12,2) DEFAULT 0,
    saldo_final NUMERIC(12,2) DEFAULT 0,
    cerrado_por UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    cerrado_at TIMESTAMPTZ
);

INSERT INTO permisos (id, clave, nombre, descripcion)
VALUES ('e0000000-0000-0000-0000-000000000017', 'ver_cortes', 'Ver Corte de Caja', 'Cierre diario y corte de caja')
ON CONFLICT (clave) DO NOTHING;

INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT 'd0000000-0000-0000-0000-000000000001', id FROM permisos WHERE clave = 'ver_cortes'
ON CONFLICT DO NOTHING;

INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT 'd0000000-0000-0000-0000-000000000002', id FROM permisos WHERE clave = 'ver_cortes'
ON CONFLICT DO NOTHING;

COMMIT;
