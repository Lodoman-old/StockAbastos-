DO $$ BEGIN
  ALTER TABLE venta_detalles ALTER COLUMN cantidad_cajas TYPE numeric(10,2);
EXCEPTION WHEN OTHERS THEN
  -- column may have existing integer data, cast via using
  ALTER TABLE venta_detalles ALTER COLUMN cantidad_cajas TYPE numeric(10,2) USING cantidad_cajas::numeric;
END $$;
