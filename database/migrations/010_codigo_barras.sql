BEGIN;

ALTER TABLE productos ADD COLUMN IF NOT EXISTS codigo_de_barras VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_productos_codigo_barras ON productos (codigo_de_barras);

COMMIT;
