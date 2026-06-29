BEGIN;

-- ============================================================
-- Ubicaciones (physical addresses with multiple cold rooms)
-- ============================================================
CREATE TABLE IF NOT EXISTS ubicaciones (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre          VARCHAR(100) NOT NULL UNIQUE,
    direccion       VARCHAR(255),
    activa          BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

ALTER TABLE bodegas ADD COLUMN IF NOT EXISTS ubicacion_id UUID REFERENCES ubicaciones(id);

-- ============================================================
-- Roles & Permisos
-- ============================================================
CREATE TABLE IF NOT EXISTS roles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre          VARCHAR(50)  NOT NULL UNIQUE,
    descripcion     VARCHAR(255),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS permisos (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clave           VARCHAR(50)  NOT NULL UNIQUE,
    nombre          VARCHAR(100) NOT NULL,
    descripcion     VARCHAR(255),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rol_permisos (
    rol_id      UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permiso_id  UUID NOT NULL REFERENCES permisos(id) ON DELETE CASCADE,
    PRIMARY KEY (rol_id, permiso_id)
);

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS rol_id UUID REFERENCES roles(id);

-- ============================================================
-- Seed Ubicaciones
-- ============================================================
INSERT INTO ubicaciones (id, nombre, direccion) VALUES
    ('f0000000-0000-0000-0000-000000000001', 'Mostrador', 'Mostrador principal del mercado'),
    ('f0000000-0000-0000-0000-000000000002', 'Bodega Central', 'Calle Principal #123, Col. Centro')
ON CONFLICT (id) DO NOTHING;

-- Link existing bodegas to ubicaciones
UPDATE bodegas SET ubicacion_id = 'f0000000-0000-0000-0000-000000000001' WHERE codigo = 'BOD-A-01';
UPDATE bodegas SET ubicacion_id = 'f0000000-0000-0000-0000-000000000002' WHERE codigo IN ('BOD-B-01', 'BOD-B-02', 'BOD-B-03');

-- ============================================================
-- Seed Permisos
-- ============================================================
INSERT INTO permisos (id, clave, nombre, descripcion) VALUES
    ('e0000000-0000-0000-0000-000000000001', 'ver_dashboard',       'Ver Dashboard',        'Acceso al panel principal'),
    ('e0000000-0000-0000-0000-000000000002', 'ver_productos',       'Ver Productos',        'Catálogo de productos'),
    ('e0000000-0000-0000-0000-000000000003', 'ver_bodegas',         'Ver Bodegas',          'Ver bodegas y su contenido'),
    ('e0000000-0000-0000-0000-000000000004', 'ver_ubicaciones',     'Ver Ubicaciones',      'Gestionar ubicaciones físicas'),
    ('e0000000-0000-0000-0000-000000000005', 'ver_lotes',           'Ver Lotes',            'Inventario por lotes'),
    ('e0000000-0000-0000-0000-000000000006', 'ver_traspasos',       'Ver Traspasos',        'Transferencias entre bodegas'),
    ('e0000000-0000-0000-0000-000000000007', 'ver_ventas',          'Ver Ventas',           'Registro de ventas y POS'),
    ('e0000000-0000-0000-0000-000000000008', 'ver_reportes',        'Ver Reportes',         'Reportes y estadísticas'),
    ('e0000000-0000-0000-0000-000000000009', 'ver_sync',            'Ver Sync',             'Monitor de sincronización'),
    ('e0000000-0000-0000-0000-000000000010', 'gestionar_roles',     'Gestionar Roles',      'Crear y editar roles de usuario'),
    ('e0000000-0000-0000-0000-000000000011', 'gestionar_usuarios',  'Gestionar Usuarios',   'Administrar cuentas de usuario'),
    ('e0000000-0000-0000-0000-000000000012', 'escanear_qr',         'Escanear QR',          'Escaneo de códigos QR en móvil'),
    ('e0000000-0000-0000-0000-000000000013', 'registrar_venta',     'Registrar Venta',      'Realizar ventas en POS'),
    ('e0000000-0000-0000-0000-000000000014', 'crear_traspaso',      'Crear Traspaso',       'Generar transferencias'),
    ('e0000000-0000-0000-0000-000000000015', 'recibir_mercancia',   'Recibir Mercancía',    'Registrar llegada de productos'),
    ('e0000000-0000-0000-0000-000000000016', 'ajustar_inventario',  'Ajustar Inventario',   'Realizar ajustes de stock')
ON CONFLICT (clave) DO NOTHING;

-- ============================================================
-- Seed Roles
-- ============================================================
INSERT INTO roles (id, nombre, descripcion) VALUES
    ('d0000000-0000-0000-0000-000000000001', 'admin',      'Acceso total al sistema'),
    ('d0000000-0000-0000-0000-000000000002', 'supervisor', 'Supervisor con acceso a gestión excepto roles/usuarios'),
    ('d0000000-0000-0000-0000-000000000003', 'operario',   'Operario de almacén: escaneo, traspasos, recepción'),
    ('d0000000-0000-0000-0000-000000000004', 'cajero',     'Cajero: ventas y consulta de inventario')
ON CONFLICT (id) DO NOTHING;

-- Admin: all permissions
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT 'd0000000-0000-0000-0000-000000000001', id FROM permisos
ON CONFLICT DO NOTHING;

-- Supervisor: all except gestionar_roles, gestionar_usuarios
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT 'd0000000-0000-0000-0000-000000000002', id FROM permisos
WHERE clave NOT IN ('gestionar_roles', 'gestionar_usuarios')
ON CONFLICT DO NOTHING;

-- Operario: warehouse operations
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT 'd0000000-0000-0000-0000-000000000003', id FROM permisos
WHERE clave IN ('ver_dashboard', 'ver_bodegas', 'ver_lotes', 'ver_traspasos',
                'escanear_qr', 'crear_traspaso', 'recibir_mercancia', 'ajustar_inventario',
                'ver_ubicaciones')
ON CONFLICT DO NOTHING;

-- Cajero: sales + inventory view
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT 'd0000000-0000-0000-0000-000000000004', id FROM permisos
WHERE clave IN ('ver_dashboard', 'ver_productos', 'ver_bodegas', 'ver_lotes',
                'ver_ventas', 'registrar_venta', 'escanear_qr')
ON CONFLICT DO NOTHING;

-- ============================================================
-- Migrate existing usuarios to new rol_id
-- ============================================================
UPDATE usuarios SET rol_id = 'd0000000-0000-0000-0000-000000000001' WHERE rol = 'admin' AND rol_id IS NULL;
UPDATE usuarios SET rol_id = 'd0000000-0000-0000-0000-000000000003' WHERE rol = 'operario' AND rol_id IS NULL;
UPDATE usuarios SET rol_id = 'd0000000-0000-0000-0000-000000000002' WHERE rol = 'supervisor' AND rol_id IS NULL;

COMMIT;
