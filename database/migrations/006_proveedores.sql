CREATE TABLE IF NOT EXISTS proveedores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(200) NOT NULL,
    contacto VARCHAR(200) DEFAULT '',
    telefono VARCHAR(50) DEFAULT '',
    email VARCHAR(200) DEFAULT '',
    direccion TEXT DEFAULT '',
    rfc VARCHAR(20) DEFAULT '',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO proveedores (nombre, contacto, telefono) VALUES
('Proveedor General', 'Contacto General', '555-0000')
ON CONFLICT DO NOTHING;
