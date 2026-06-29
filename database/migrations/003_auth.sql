BEGIN;

CREATE TYPE rol_usuario AS ENUM ('admin', 'operario', 'supervisor');

CREATE TABLE usuarios (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(200) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    nombre          VARCHAR(100) NOT NULL,
    rol             rol_usuario NOT NULL DEFAULT 'operario',
    bodega_id       UUID REFERENCES bodegas(id),
    activo          BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO usuarios (email, password_hash, nombre, rol) VALUES
    ('admin@stockabastos.com', '$2b$10$8K1p/a0dL1LXMIgoEDFrwOfMQkfAjkMBcGmF1mGm1mGm1mGm1mGm', 'Admin', 'admin'),
    ('operario1@stockabastos.com', '$2b$10$8K1p/a0dL1LXMIgoEDFrwOfMQkfAjkMBcGmF1mGm1mGm1mGm1mGm', 'Carlos López', 'operario'),
    ('operario2@stockabastos.com', '$2b$10$8K1p/a0dL1LXMIgoEDFrwOfMQkfAjkMBcGmF1mGm1mGm1mGm1mGm', 'María García', 'operario');

COMMIT;
