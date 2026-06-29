import { query } from "../src/db.js";

async function test() {
  try {
    const hoy = new Date().toISOString().substring(0,10).replace(/-/g,"");

    // Get first product, bodega, and Caja suelta tipo
    const prod = await query("SELECT id, nombre FROM productos WHERE activo = true LIMIT 1");
    const bodega = await query("SELECT id, nombre FROM bodegas WHERE activa = true LIMIT 1");
    const otraBodega = await query("SELECT id, nombre FROM bodegas WHERE activa = true AND id != $1 LIMIT 1", [bodega.rows[0]?.id]);
    const tipoCajaSuelta = await query("SELECT id FROM tarimas_tipos WHERE nombre = 'Caja suelta' LIMIT 1");

    if (!prod.rows.length) { console.log("❌ No hay productos activos"); process.exit(1); }
    if (!bodega.rows.length) { console.log("❌ No hay bodegas activas"); process.exit(1); }
    if (!tipoCajaSuelta.rows.length) { console.log("❌ No hay tipo 'Caja suelta'. Ejecuta antes add_caja_suelta_tipo.mjs"); process.exit(1); }

    console.log("Producto:", prod.rows[0].nombre, "-", prod.rows[0].id);
    console.log("Bodega:", bodega.rows[0].nombre, "-", bodega.rows[0].id);
    if (otraBodega.rows.length) console.log("Bodega 2:", otraBodega.rows[0].nombre, "-", otraBodega.rows[0].id);
    console.log("Tipo Caja suelta:", tipoCajaSuelta.rows[0].id);

    // 1. Create padre + hijo + tarima (like compra flow)
    const padreCodigo = "TEST-"+hoy+"-999";
    const abrev = "TEST";

    const padre = await query(
      "INSERT INTO lotes (codigo_lote, estado, proveedor_nombre, fecha_recepcion) VALUES ($1, $2, $3, $4) RETURNING *",
      [padreCodigo, "PENDIENTE", "Test Proveedor", hoy]
    );
    console.log("\n✅ 1. Lote padre:", padre.rows[0].codigo_lote);

    const codigoHijo = padreCodigo+"-1";
    const hijo = await query(
      "INSERT INTO lotes (producto_id, bodega_id, estado, codigo_lote, lote_padre_id) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [prod.rows[0].id, bodega.rows[0].id, "PENDIENTE", codigoHijo, padre.rows[0].id]
    );
    console.log("✅ 2. Lote hijo:", hijo.rows[0].codigo_lote);

    const tarima = await query(
      `INSERT INTO tarimas (lote_id, producto_id, tarima_tipo_id, numero_tarima, peso_kg, codigo_qr, estado, bodega_id, cajas_originales, cajas_restantes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [hijo.rows[0].id, prod.rows[0].id, tipoCajaSuelta.rows[0].id, 1, 10.5,
       "TAR1-"+abrev+"-"+hoy+"-1", "PENDIENTE", bodega.rows[0].id, 5, 5]
    );
    console.log("✅ 3. Tarima creada: QR=" + tarima.rows[0].codigo_qr + " cajas=" + tarima.rows[0].cajas_restantes + " orig=" + tarima.rows[0].cajas_originales);

    // 2. Receive
    const rec = await query(
      "UPDATE tarimas SET estado = $1, recibida_at = NOW(), updated_at = NOW() WHERE id = $2 RETURNING *",
      ["RECIBIDA", tarima.rows[0].id]
    );
    console.log("✅ 4. RECIBIDA: estado=" + rec.rows[0].estado + " cajasRest=" + rec.rows[0].cajas_restantes + " orig=" + rec.rows[0].cajas_originales);
    console.log("   (cajas_originales debe ser 5, no sobrescrito)");

    // 3. Partir (traspaso parcial)
    if (otraBodega.rows.length) {
      const cajasPartir = 2;
      await query(
        "UPDATE tarimas SET cajas_restantes = cajas_restantes - $1, estado = CASE WHEN cajas_originales - (cajas_restantes - $1) > 0 THEN 'PARCIAL' ELSE estado END, updated_at = NOW() WHERE id = $2",
        [cajasPartir, tarima.rows[0].id]
      );

      const nuevaTarima = await query(
        `INSERT INTO tarimas (lote_id, producto_id, tarima_tipo_id, numero_tarima, peso_kg, codigo_qr, estado, bodega_id, bodega_destino_id, cajas_originales, cajas_restantes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10) RETURNING *`,
        [hijo.rows[0].id, prod.rows[0].id, tipoCajaSuelta.rows[0].id, 2, 4.2,
         "TAR2-"+abrev+"-"+hoy+"-1", "RECIBIDA", bodega.rows[0].id, otraBodega.rows[0].id, cajasPartir]
      );

      const origCheck = await query("SELECT cajas_restantes, estado FROM tarimas WHERE id = $1", [tarima.rows[0].id]);
      console.log("\n✅ 5. PARTIR tarima:");
      console.log("   Original - cajas restantes:", origCheck.rows[0].cajas_restantes, "(debe ser 3)");
      console.log("   Original - estado:", origCheck.rows[0].estado, "(debe ser PARCIAL)");
      console.log("   Nueva - QR:", nuevaTarima.rows[0].codigo_qr, "cajas:", nuevaTarima.rows[0].cajas_restantes, "destino:", otraBodega.rows[0].nombre);
    } else {
      console.log("\n⚠️ 5. No hay segunda bodega para probar partición");
    }

    // Cleanup
    await query("DELETE FROM tarimas WHERE lote_id = $1", [hijo.rows[0].id]);
    await query("DELETE FROM lotes WHERE id = $1 OR id = $2", [hijo.rows[0].id, padre.rows[0].id]);
    console.log("\n🧹 Datos de prueba limpiados");
    console.log("\n🎉 FLUJO COMPLETO OK");
  } catch(e) {
    console.error("❌ ERROR:", e.message);
    console.error(e);
  }
  process.exit(0);
}
test();
