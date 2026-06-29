import React, { useEffect, useState } from "react";
import { IonList, IonItem, IonLabel, IonButton, IonInput, IonSelect, IonSelectOption, IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonContent, IonPage, IonText } from "@ionic/react";
import { get, post } from "../services/api";

export function Compras() {
    const [compras, setCompras] = useState<any[]>([]);
    const [productos, setProductos] = useState<any[]>([]);
    const [bodegas, setBodegas] = useState<any[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [proveedor, setProveedor] = useState("");
    const [fecha, setFecha] = useState(new Date().toISOString().substring(0, 10));
    const [items, setItems] = useState<Array<{ producto_id: string; producto_nombre: string; unidad_venta: string; cantidad_kg: string; precio_kg: string; cantidad_unidades: string; precio_compra: string; bodega_id: string; fecha_caducidad: string }>>([]);

    const load = () => Promise.all([get("/compras").then(setCompras), get("/productos").then(setProductos), get("/bodegas").then(setBodegas)]).catch(() => {});
    useEffect(() => { load(); }, []);

    const addItem = () => setItems([...items, { producto_id: "", producto_nombre: "", unidad_venta: "", cantidad_kg: "", precio_kg: "", cantidad_unidades: "", precio_compra: "", bodega_id: "", fecha_caducidad: "" }]);
    const updateItem = (i: number, field: string, value: string) => {
        const n = [...items];
        (n[i] as any)[field] = value;
        if (field === "producto_id") {
            const p = productos.find(p => p.id === value);
            n[i].producto_nombre = p?.nombre || "";
            n[i].unidad_venta = p?.unidad_venta || "";
        }
        setItems(n);
    };
    const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));

    const save = async () => {
        const valid = items.every(i => {
            if (!i.producto_id || !i.bodega_id) return false;
            if (i.unidad_venta === "PIEZA") return i.cantidad_unidades && i.precio_compra;
            return i.cantidad_kg && i.precio_kg;
        });
        if (!items.length || !valid) return alert("Completa todos los campos");
        try {
            await post("/compras", {
                proveedor: proveedor || undefined, fecha,
                lotes: items.map(i => ({
                    producto_id: i.producto_id,
                    ...(i.unidad_venta === "PIEZA"
                        ? { cantidad_unidades: parseInt(i.cantidad_unidades), precio_compra: parseFloat(i.precio_compra) }
                        : { cantidad_kg: parseFloat(i.cantidad_kg), precio_kg: parseFloat(i.precio_kg) }),
                    bodega_id: i.bodega_id,
                    fecha_caducidad: i.fecha_caducidad || undefined,
                })),
            });
            setShowModal(false); setItems([]); setProveedor(""); load();
        } catch (e: any) { alert("Error: " + e.message); }
    };

    return (
        <IonPage>
            <IonContent className="ion-padding">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <h2 style={{ margin: 0 }}>Compras</h2>
                    <IonButton onClick={() => { setShowModal(true); addItem(); }}>+ Nueva</IonButton>
                </div>

                <IonModal isOpen={showModal} onDidDismiss={() => setShowModal(false)}>
                    <IonHeader>
                        <IonToolbar><IonTitle>Nueva Compra</IonTitle><IonButtons slot="end"><IonButton onClick={() => setShowModal(false)}>Cerrar</IonButton></IonButtons></IonToolbar>
                    </IonHeader>
                    <IonContent className="ion-padding">
                        <IonList>
                            <IonItem><IonLabel position="stacked">Proveedor</IonLabel><IonInput value={proveedor} onIonChange={e => setProveedor(e.detail.value || "")} /></IonItem>
                            <IonItem><IonLabel position="stacked">Fecha</IonLabel><IonInput type="date" value={fecha} onIonChange={e => setFecha(e.detail.value || "")} /></IonItem>
                        </IonList>
                        <IonText color="medium"><p style={{ padding: "0 16px" }}>Productos</p></IonText>
                        {items.map((item, i) => {
                            const pieza = item.unidad_venta === "PIEZA";
                            return (
                                <div key={i} style={{ border: "1px solid #ddd", borderRadius: 8, margin: "0 16px 8px", padding: 8 }}>
                                    <IonItem>
                                        <IonLabel position="stacked">Producto</IonLabel>
                                        <IonSelect value={item.producto_id} onIonChange={e => updateItem(i, "producto_id", e.detail.value)}>
                                            <IonSelectOption value="">Seleccionar</IonSelectOption>
                                            {productos.map(p => <IonSelectOption key={p.id} value={p.id}>{p.nombre}</IonSelectOption>)}
                                        </IonSelect>
                                    </IonItem>
                                    <div style={{ display: "flex", gap: 8 }}>
                                        {pieza ? (
                                            <>
                                                <IonItem style={{ flex: 1 }}><IonLabel position="stacked">Cantidad (pz)</IonLabel><IonInput type="number" value={item.cantidad_unidades} onIonChange={e => updateItem(i, "cantidad_unidades", e.detail.value || "")} /></IonItem>
                                                <IonItem style={{ flex: 1 }}><IonLabel position="stacked">$/pz</IonLabel><IonInput type="number" value={item.precio_compra} onIonChange={e => updateItem(i, "precio_compra", e.detail.value || "")} /></IonItem>
                                            </>
                                        ) : (
                                            <>
                                                <IonItem style={{ flex: 1 }}><IonLabel position="stacked">Kg</IonLabel><IonInput type="number" value={item.cantidad_kg} onIonChange={e => updateItem(i, "cantidad_kg", e.detail.value || "")} /></IonItem>
                                                <IonItem style={{ flex: 1 }}><IonLabel position="stacked">$/kg</IonLabel><IonInput type="number" value={item.precio_kg} onIonChange={e => updateItem(i, "precio_kg", e.detail.value || "")} /></IonItem>
                                            </>
                                        )}
                                    </div>
                                    <IonItem>
                                        <IonLabel position="stacked">Bodega</IonLabel>
                                        <IonSelect value={item.bodega_id} onIonChange={e => updateItem(i, "bodega_id", e.detail.value)}>
                                            <IonSelectOption value="">Seleccionar</IonSelectOption>
                                            {bodegas.map(b => <IonSelectOption key={b.id} value={b.id}>{b.nombre}</IonSelectOption>)}
                                        </IonSelect>
                                    </IonItem>
                                    <IonItem><IonLabel position="stacked">Caducidad</IonLabel><IonInput type="date" value={item.fecha_caducidad} onIonChange={e => updateItem(i, "fecha_caducidad", e.detail.value || "")} /></IonItem>
                                    <IonButton color="danger" size="small" onClick={() => removeItem(i)}>Quitar</IonButton>
                                </div>
                            );
                        })}
                        <IonButton fill="outline" expand="block" onClick={addItem} className="ion-margin">+ Agregar producto</IonButton>
                        <IonButton expand="block" onClick={save} disabled={!items.length}>Guardar Compra</IonButton>
                    </IonContent>
                </IonModal>

                <IonList>
                    {compras.map(c => (
                        <IonItem key={c.id}>
                            <IonLabel>
                                <h3>{c.proveedor || "Sin proveedor"} — ${parseFloat(c.total || 0).toFixed(2)}</h3>
                                <p>{new Date(c.fecha).toLocaleDateString()} — {c.detalles?.length || 0} producto(s)</p>
                            </IonLabel>
                        </IonItem>
                    ))}
                    {!compras.length && <IonItem><IonLabel className="ion-text-center">Sin compras</IonLabel></IonItem>}
                </IonList>
            </IonContent>
        </IonPage>
    );
}
