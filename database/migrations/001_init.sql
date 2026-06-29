-- ============================================================
-- STOCK ABASTOS - Migración Inicial
-- Versión: 001
-- Fecha: 2026-06-18
-- ============================================================

BEGIN;

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE estado_lote AS ENUM (
    'RECIBIDO',
    'DISPONIBLE',
    'APARTADO',
    'TRANSITO',
    'VENDIDO',
    'MERMA'
);

CREATE TYPE tipo_movimiento AS ENUM (
    'ENTRADA',
    'TRASPASO_SALIDA',
    'TRASPASO_ENTRADA',
    'VENTA',
    'MERMA',
    'AJUSTE'
);

CREATE TYPE estado_traspaso AS ENUM (
    'PENDIENTE',
    'EN_CURSO',
    'COMPLETADO',
    'CONFLICTO'
);

CREATE TYPE estado_batch AS ENUM (
    'PENDIENTE',
    'PROCESANDO',
    'CONFIRMADO',
    'RECHAZADO'
);

-- ============================================================
-- TABLAS CATÁLOGO
-- ============================================================

CREATE TABLE bodegas (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo          VARCHAR(20)  NOT NULL UNIQUE,
    nombre          VARCHAR(100) NOT NULL,
    ubicacion       VARCHAR(50)  NOT NULL CHECK (ubicacion IN ('A', 'B')),
    activa          BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE productos (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku             VARCHAR(50)  NOT NULL UNIQUE,
    nombre          VARCHAR(200) NOT NULL,
    unidad_compra   VARCHAR(10)  NOT NULL CHECK (unidad_compra IN ('CAJA', 'KILO')),
    unidad_venta    VARCHAR(10)  NOT NULL CHECK (unidad_venta IN ('CAJA', 'KILO', 'PIEZA')),
    peso_estimado_kg NUMERIC(10,4),
    activo          BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ============================================================
-- LOTES
-- ============================================================

CREATE TABLE lotes (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_lote         VARCHAR(50)  NOT NULL UNIQUE,
    producto_id         UUID         NOT NULL REFERENCES productos(id),
    bodega_id           UUID         NOT NULL REFERENCES bodegas(id),
    estado              estado_lote  NOT NULL DEFAULT 'RECIBIDO',
    cantidad_recibida_kg NUMERIC(12,4) NOT NULL CHECK (cantidad_recibida_kg > 0),
    cantidad_actual_kg   NUMERIC(12,4) NOT NULL CHECK (cantidad_actual_kg >= 0),
    factura_proveedor   VARCHAR(100),
    proveedor_nombre    VARCHAR(200),
    fecha_recepcion     DATE         NOT NULL DEFAULT CURRENT_DATE,
    fecha_caducidad     DATE,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_cantidad CHECK (cantidad_actual_kg <= cantidad_recibida_kg)
);

CREATE INDEX idx_lotes_estado    ON lotes(estado);
CREATE INDEX idx_lotes_bodega    ON lotes(bodega_id);
CREATE INDEX idx_lotes_producto  ON lotes(producto_id);
CREATE INDEX idx_lotes_caducidad ON lotes(fecha_caducidad ASC NULLS LAST);

-- ============================================================
-- STOCK POR BODEGA (vista materializada + tabla para writes)
-- ============================================================

CREATE TABLE stock_bodega (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bodega_id       UUID         NOT NULL REFERENCES bodegas(id),
    producto_id     UUID         NOT NULL REFERENCES productos(id),
    cantidad_kg     NUMERIC(12,4) NOT NULL DEFAULT 0 CHECK (cantidad_kg >= 0),
    cantidad_cajas  INTEGER      NOT NULL DEFAULT 0 CHECK (cantidad_cajas >= 0),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE(bodega_id, producto_id)
);

CREATE INDEX idx_stock_bodega ON stock_bodega(bodega_id, producto_id);

-- ============================================================
-- MOVIMIENTOS
-- ============================================================

CREATE TABLE movimientos (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lote_id           UUID           NOT NULL REFERENCES lotes(id),
    tipo              tipo_movimiento NOT NULL,
    bodega_origen_id  UUID           REFERENCES bodegas(id),
    bodega_destino_id UUID           REFERENCES bodegas(id),
    cantidad_kg       NUMERIC(12,4)  NOT NULL CHECK (cantidad_kg > 0),
    cantidad_cajas    INTEGER        CHECK (cantidad_cajas IS NULL OR cantidad_cajas >= 0),
    referencia        VARCHAR(100),
    observaciones     TEXT,
    created_at        TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_movimientos_lote ON movimientos(lote_id);
CREATE INDEX idx_movimientos_fecha ON movimientos(created_at DESC);

-- ============================================================
-- TRASPASOS
-- ============================================================

CREATE TABLE traspasos (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    folio               VARCHAR(50)  NOT NULL UNIQUE,
    bodega_origen_id    UUID         NOT NULL REFERENCES bodegas(id),
    bodega_destino_id   UUID         NOT NULL REFERENCES bodegas(id),
    estado              estado_traspaso NOT NULL DEFAULT 'PENDIENTE',
    operario_id         VARCHAR(100),
    sincronizado        BOOLEAN      NOT NULL DEFAULT FALSE,
    batch_uuid          UUID,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    completed_at        TIMESTAMPTZ
);

CREATE TABLE traspaso_detalles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    traspaso_id     UUID           NOT NULL REFERENCES traspasos(id) ON DELETE CASCADE,
    lote_id         UUID           NOT NULL REFERENCES lotes(id),
    cantidad_kg     NUMERIC(12,4)  NOT NULL CHECK (cantidad_kg > 0),
    cantidad_cajas  INTEGER        CHECK (cantidad_cajas IS NULL OR cantidad_cajas >= 0),
    escaneado       BOOLEAN        NOT NULL DEFAULT FALSE,
    UNIQUE(traspaso_id, lote_id)
);

-- ============================================================
-- VENTAS
-- ============================================================

CREATE TABLE ventas (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    folio           VARCHAR(50)  NOT NULL UNIQUE,
    bodega_id       UUID         NOT NULL REFERENCES bodegas(id),
    total_kg        NUMERIC(12,4),
    total_cajas     INTEGER,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE venta_detalles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venta_id        UUID           NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
    lote_id         UUID           NOT NULL REFERENCES lotes(id),
    producto_id     UUID           NOT NULL REFERENCES productos(id),
    cantidad_kg     NUMERIC(12,4)  CHECK (cantidad_kg IS NULL OR cantidad_kg > 0),
    cantidad_cajas  INTEGER        CHECK (cantidad_cajas IS NULL OR cantidad_cajas >= 0),
    precio_unitario NUMERIC(12,2),
    subtotal        NUMERIC(12,2)
);

-- ============================================================
-- CONTROL DE SINCRONIZACIÓN OFFLINE
-- ============================================================

CREATE TABLE sync_batches (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispositivo_id  VARCHAR(100) NOT NULL,
    batch_uuid      UUID         NOT NULL,
    operacion       VARCHAR(50)  NOT NULL,
    referencia_id   UUID,
    snapshot_version INTEGER     NOT NULL DEFAULT 0,
    payload         JSONB        NOT NULL,
    estado          estado_batch NOT NULL DEFAULT 'PENDIENTE',
    conflictos      JSONB,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    processed_at    TIMESTAMPTZ,
    UNIQUE(batch_uuid)
);

CREATE INDEX idx_sync_estado         ON sync_batches(estado);
CREATE INDEX idx_sync_dispositivo    ON sync_batches(dispositivo_id);
CREATE INDEX idx_sync_created        ON sync_batches(created_at DESC);

-- ============================================================
-- SNAPSHOT LOG (para control de versiones)
-- ============================================================

CREATE TABLE sync_snapshots (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version         INTEGER      NOT NULL,
    bodega_id       UUID         NOT NULL REFERENCES bodegas(id),
    generado_por    VARCHAR(100),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_snapshot_version ON sync_snapshots(version DESC);

-- ============================================================
-- FUNCIONES
-- ============================================================

CREATE OR REPLACE FUNCTION generar_codigo_lote()
RETURNS TRIGGER AS $$
DECLARE
    seq INTEGER;
    fecha_str VARCHAR(8);
BEGIN
    fecha_str := TO_CHAR(NEW.fecha_recepcion, 'YYYYMMDD');
    seq := nextval('seq_codigo_lote');
    NEW.codigo_lote := 'LTO-' || fecha_str || '-' || LPAD(seq::TEXT, 4, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE IF NOT EXISTS seq_codigo_lote START 1;

CREATE TRIGGER trg_generar_codigo_lote
    BEFORE INSERT ON lotes
    FOR EACH ROW
    WHEN (NEW.codigo_lote IS NULL)
    EXECUTE FUNCTION generar_codigo_lote();

-- Función PEPS
CREATE OR REPLACE FUNCTION obtener_lote_peps(
    p_producto_id UUID,
    p_bodega_id UUID,
    p_cantidad_requerida NUMERIC
) RETURNS TABLE(
    lote_id UUID,
    codigo_lote VARCHAR,
    disponible_kg NUMERIC,
    fecha_caducidad DATE
) LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT  l.id, l.codigo_lote, l.cantidad_actual_kg, l.fecha_caducidad
    FROM    lotes l
    WHERE   l.producto_id = p_producto_id
      AND   l.bodega_id   = p_bodega_id
      AND   l.estado IN ('DISPONIBLE')
      AND   l.cantidad_actual_kg > 0
    ORDER BY l.fecha_caducidad ASC NULLS LAST,
             l.created_at ASC
    LIMIT   1;
END;
$$;

COMMIT;
