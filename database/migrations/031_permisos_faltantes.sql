BEGIN;

INSERT INTO permisos (clave, nombre, descripcion) VALUES
    ('ver_clientes', 'Ver Clientes', 'Acceso a la gestión de clientes'),
    ('ver_compras', 'Ver Compras', 'Acceso a compras, proveedores y recepción'),
    ('ver_gastos', 'Ver Gastos', 'Acceso al registro de gastos'),
    ('ver_ganancias', 'Ver Ganancias', 'Acceso al reporte de ganancias'),
    ('gestionar_configuracion', 'Gestionar Configuración', 'Configuración del sistema e impresoras')
ON CONFLICT (clave) DO NOTHING;

-- Asignar los nuevos permisos al rol admin
DO $$
DECLARE
    admin_id UUID;
    p RECORD;
BEGIN
    SELECT id INTO admin_id FROM roles WHERE nombre = 'admin';
    IF admin_id IS NOT NULL THEN
        FOR p IN SELECT id FROM permisos WHERE clave IN ('ver_clientes', 'ver_compras', 'ver_gastos', 'ver_ganancias', 'gestionar_configuracion') LOOP
            INSERT INTO rol_permisos (rol_id, permiso_id) VALUES (admin_id, p.id) ON CONFLICT DO NOTHING;
        END LOOP;
    END IF;
END $$;

-- Asignar ver_clientes, ver_compras, ver_gastos, ver_ganancias al rol supervisor
DO $$
DECLARE
    sup_id UUID;
    p RECORD;
BEGIN
    SELECT id INTO sup_id FROM roles WHERE nombre = 'supervisor';
    IF sup_id IS NOT NULL THEN
        FOR p IN SELECT id FROM permisos WHERE clave IN ('ver_clientes', 'ver_compras', 'ver_gastos', 'ver_ganancias') LOOP
            INSERT INTO rol_permisos (rol_id, permiso_id) VALUES (sup_id, p.id) ON CONFLICT DO NOTHING;
        END LOOP;
    END IF;
END $$;

COMMIT;
