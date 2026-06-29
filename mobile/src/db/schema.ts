export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS productos (
    id              TEXT PRIMARY KEY,
    sku             TEXT NOT NULL,
    nombre          TEXT NOT NULL,
    unidad_compra   TEXT NOT NULL,
    unidad_venta    TEXT NOT NULL,
    peso_estimado_kg REAL,
    activo          INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS lotes_snapshot (
    id                  TEXT PRIMARY KEY,
    codigo_lote         TEXT NOT NULL,
    producto_id         TEXT NOT NULL,
    producto_nombre     TEXT,
    bodega_id           TEXT NOT NULL,
    cantidad_actual_kg  REAL NOT NULL,
    estado              TEXT NOT NULL,
    fecha_caducidad     TEXT,
    FOREIGN KEY (producto_id) REFERENCES productos(id)
);

CREATE TABLE IF NOT EXISTS bodegas (
    id              TEXT PRIMARY KEY,
    codigo          TEXT NOT NULL,
    nombre          TEXT NOT NULL,
    ubicacion       TEXT NOT NULL,
    activa          INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS sync_queue (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_uuid      TEXT NOT NULL,
    tipo_operacion  TEXT NOT NULL,
    lote_id         TEXT NOT NULL,
    codigo_lote     TEXT NOT NULL,
    cantidad_kg     REAL NOT NULL,
    bodega_origen_id TEXT,
    bodega_destino_id TEXT,
    timestamp       TEXT NOT NULL,
    procesado       INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS traspasos_local (
    id                  TEXT PRIMARY KEY,
    folio               TEXT NOT NULL,
    bodega_origen_id    TEXT NOT NULL,
    bodega_destino_id   TEXT NOT NULL,
    estado              TEXT NOT NULL DEFAULT 'PENDIENTE',
    batch_uuid          TEXT NOT NULL,
    snapshot_version    INTEGER NOT NULL DEFAULT 0,
    created_at          TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sync_metadata (
    key   TEXT PRIMARY KEY,
    value TEXT
);

CREATE INDEX IF NOT EXISTS idx_sync_queue_batch ON sync_queue(batch_uuid);
CREATE INDEX IF NOT EXISTS idx_sync_queue_procesado ON sync_queue(procesado);
CREATE INDEX IF NOT EXISTS idx_lotes_bodega ON lotes_snapshot(bodega_id);
`;
