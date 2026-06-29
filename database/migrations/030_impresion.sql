BEGIN;

CREATE TABLE impresoras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(100) NOT NULL,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('ticket', 'etiqueta')),
    direccion_ip VARCHAR(45) NOT NULL,
    puerto INTEGER NOT NULL DEFAULT 9100,
    activa BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE cola_impresion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    impresora_id UUID NOT NULL REFERENCES impresoras(id) ON DELETE CASCADE,
    tipo_comando VARCHAR(20) NOT NULL DEFAULT 'raw',
    contenido TEXT NOT NULL,
    nombre_archivo VARCHAR(255),
    estado VARCHAR(20) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'enviado', 'error')),
    error_msg TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sent_at TIMESTAMPTZ
);

CREATE INDEX idx_cola_impresion_estado ON cola_impresion(estado);
CREATE INDEX idx_cola_impresion_created ON cola_impresion(created_at DESC);

COMMIT;
