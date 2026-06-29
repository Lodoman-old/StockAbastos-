BEGIN;

-- Tablas faltantes que no estaban en migraciones anteriores

CREATE TABLE IF NOT EXISTS clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(200) NOT NULL,
    telefono VARCHAR(20),
    direccion TEXT,
    limite_credito NUMERIC(12,2) DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS compras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    folio VARCHAR(50),
    proveedor VARCHAR(200),
    total NUMERIC(12,2),
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS compra_detalles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    compra_id UUID NOT NULL REFERENCES compras(id) ON DELETE CASCADE,
    producto_id UUID NOT NULL REFERENCES productos(id),
    lote_id UUID REFERENCES lotes(id),
    precio_compra NUMERIC(12,2)
);

CREATE TABLE IF NOT EXISTS configuracion (
    clave VARCHAR(100) PRIMARY KEY,
    valor TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gastos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    concepto VARCHAR(300) NOT NULL,
    monto NUMERIC(12,2) NOT NULL,
    categoria VARCHAR(100),
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mostrador_stock (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    producto_id UUID NOT NULL REFERENCES productos(id),
    cantidad_kg NUMERIC(12,4),
    cantidad_piezas INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_mostrador_stock_producto ON mostrador_stock(producto_id);

CREATE TABLE IF NOT EXISTS pagos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venta_id UUID NOT NULL REFERENCES ventas(id),
    monto NUMERIC(12,2) NOT NULL CHECK (monto > 0),
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pagos_venta ON pagos(venta_id);

CREATE TABLE IF NOT EXISTS precios_diarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    producto_id UUID NOT NULL REFERENCES productos(id),
    precio_kg NUMERIC(12,2) NOT NULL,
    precio_caja NUMERIC(12,2),
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    precio_mayoreo_kg NUMERIC(12,2),
    precio_caja_sellada NUMERIC(12,2),
    precio_menudeo_kg NUMERIC(12,2),
    precio_unidad NUMERIC(12,2),
    UNIQUE (producto_id, fecha)
);

CREATE TABLE IF NOT EXISTS prestamo_cajas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venta_id UUID NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
    cliente_id UUID REFERENCES clientes(id),
    producto_id UUID REFERENCES productos(id),
    cantidad_cajas INTEGER NOT NULL CHECK (cantidad_cajas > 0),
    cajas_devueltas INTEGER NOT NULL DEFAULT 0 CHECK (cajas_devueltas >= 0),
    deposito_por_caja NUMERIC(10,2) DEFAULT 0,
    fecha_prestamo DATE NOT NULL DEFAULT CURRENT_DATE,
    fecha_devolucion DATE,
    notas TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tarimas_tipos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(100) NOT NULL,
    cantidad_cajas INTEGER NOT NULL CHECK (cantidad_cajas >= 0),
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Permisos de prestamo_cajas (de 008_cajas.sql)
INSERT INTO permisos (id, clave, nombre, descripcion)
VALUES ('e0000000-0000-0000-0000-000000000018', 'ver_prestamo_cajas', 'Ver Préstamo Cajas', 'Gestión de préstamo y devolución de cajas')
ON CONFLICT (clave) DO NOTHING;

INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT 'd0000000-0000-0000-0000-000000000001', id FROM permisos WHERE clave = 'ver_prestamo_cajas'
ON CONFLICT DO NOTHING;

INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT 'd0000000-0000-0000-0000-000000000002', id FROM permisos WHERE clave = 'ver_prestamo_cajas'
ON CONFLICT DO NOTHING;

-- De 008_cajas.sql
ALTER TABLE lotes ADD COLUMN IF NOT EXISTS peso_estimado_kg NUMERIC(10,4);

-- De 016_precio_compra_unidades.sql
ALTER TABLE compra_detalles ADD COLUMN IF NOT EXISTS cantidad_unidades INTEGER;
ALTER TABLE compra_detalles ADD COLUMN IF NOT EXISTS precio_compra NUMERIC(12,2);

-- De 020_cleanup.sql
ALTER TABLE compra_detalles DROP COLUMN IF EXISTS cantidad_kg;
ALTER TABLE compra_detalles DROP COLUMN IF EXISTS precio_kg;
ALTER TABLE compra_detalles DROP COLUMN IF EXISTS subtotal;

-- De 026_precios_diarios_modalidades.sql ya se incluyeron arriba

COMMIT;
