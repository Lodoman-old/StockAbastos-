-- Tipos de tarima (catálogo)
CREATE TABLE IF NOT EXISTS tarimas_tipos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    cantidad_cajas INTEGER NOT NULL CHECK (cantidad_cajas > 0),
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tarimas individuales (sub-lotes)
CREATE TABLE IF NOT EXISTS tarimas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lote_id UUID NOT NULL REFERENCES lotes(id),
    producto_id UUID NOT NULL REFERENCES productos(id),
    tarima_tipo_id UUID NOT NULL REFERENCES tarimas_tipos(id),
    numero_tarima INTEGER NOT NULL,
    peso_kg NUMERIC(12,4),
    codigo_qr VARCHAR(50) UNIQUE NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE'
        CHECK (estado IN ('PENDIENTE','RECIBIDA','EN_TRANSITO','ENTREGADA','VENDIDA','MERMA')),
    bodega_id UUID REFERENCES bodegas(id),
    fecha_caducidad DATE,
    recibida_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(lote_id, producto_id, tarima_tipo_id, numero_tarima)
);

CREATE INDEX IF NOT EXISTS idx_tarimas_lote ON tarimas(lote_id);
CREATE INDEX IF NOT EXISTS idx_tarimas_qr ON tarimas(codigo_qr);
CREATE INDEX IF NOT EXISTS idx_tarimas_estado ON tarimas(estado);
CREATE INDEX IF NOT EXISTS idx_tarimas_bodega ON tarimas(bodega_id);
