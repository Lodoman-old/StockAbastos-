BEGIN;

ALTER TABLE lotes ADD COLUMN IF NOT EXISTS peso_estimado_kg NUMERIC(10,4);
COMMENT ON COLUMN lotes.peso_estimado_kg IS 'Peso por caja de este lote; si es NULL usa el del producto';

CREATE TABLE IF NOT EXISTS prestamo_cajas (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venta_id        UUID NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
    cliente_id      UUID REFERENCES clientes(id),
    producto_id     UUID REFERENCES productos(id),
    cantidad_cajas  INTEGER NOT NULL CHECK (cantidad_cajas > 0),
    cajas_devueltas INTEGER NOT NULL DEFAULT 0 CHECK (cajas_devueltas >= 0),
    deposito_por_caja NUMERIC(10,2) DEFAULT 0,
    fecha_prestamo  DATE NOT NULL DEFAULT CURRENT_DATE,
    fecha_devolucion DATE,
    notas           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO permisos (id, clave, nombre, descripcion)
VALUES ('e0000000-0000-0000-0000-000000000018', 'ver_prestamo_cajas', 'Ver Préstamo Cajas', 'Gestión de préstamo y devolución de cajas')
ON CONFLICT (clave) DO NOTHING;

INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT 'd0000000-0000-0000-0000-000000000001', id FROM permisos WHERE clave = 'ver_prestamo_cajas'
ON CONFLICT DO NOTHING;

INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT 'd0000000-0000-0000-0000-000000000002', id FROM permisos WHERE clave = 'ver_prestamo_cajas'
ON CONFLICT DO NOTHING;

COMMIT;
