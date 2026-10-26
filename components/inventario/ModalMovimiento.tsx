"use client";

import { useEffect, useId, useMemo, useState } from "react";
import type {
  NuevoMovimiento,
  NuevoProducto,
  Producto,
  TipoMovimiento,
} from "@/lib/inventario/types";

export function ModalMovimiento({
  productoIdInicial,
  productos,
  categorias = [],
  onCerrar,
  onGuardar,
  onGuardarNuevoProducto,
}: {
  productoIdInicial: string;
  productos: Producto[];
  categorias?: string[];
  onCerrar: () => void;
  onGuardar: (m: NuevoMovimiento) => Promise<void>;
  onGuardarNuevoProducto?: (datos: {
    producto: NuevoProducto;
    tipo: TipoMovimiento;
    cantidad: number;
    nota?: string;
  }) => Promise<void>;
}) {
  // Modo: si no hay productos, por defecto es "nuevo"
  const sinProductos = productos.length === 0;
  const [esNuevoProducto, setEsNuevoProducto] = useState(sinProductos);

  // ID de producto seleccionado
  const [productoId, setProductoId] = useState(() => {
    if (productoIdInicial && productos.some((p) => p.id === productoIdInicial)) {
      return productoIdInicial;
    }
    return productos[0]?.id || "";
  });

  useEffect(() => {
    if (sinProductos) {
      setEsNuevoProducto(true);
    } else if (productoIdInicial && productos.some((p) => p.id === productoIdInicial)) {
      setProductoId(productoIdInicial);
      setEsNuevoProducto(false);
    } else if (!productoId && productos.length > 0) {
      setProductoId(productos[0].id);
    }
  }, [productoIdInicial, productos, productoId, sinProductos]);

  // Campos para movimiento de producto existente
  const [tipo, setTipo] = useState<TipoMovimiento>("entrada");
  const [cantidadStr, setCantidadStr] = useState("1");
  const [nota, setNota] = useState("");

  // Campos para nuevo producto inline
  const [nombreNuevo, setNombreNuevo] = useState("");
  const [categoriaNueva, setCategoriaNueva] = useState(categorias[0] || "General");
  const [otraCategoria, setOtraCategoria] = useState("");
  const [precioVentaStr, setPrecioVentaStr] = useState("");
  const [precioCostoStr, setPrecioCostoStr] = useState("");
  const [stockMinimoStr, setStockMinimoStr] = useState("5");

  const [guardando, setGuardando] = useState(false);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  const productoSel = useMemo(
    () => productos.find((p) => p.id === productoId) || productos[0],
    [productos, productoId]
  );

  const cantidad = parseInt(cantidadStr, 10) || 0;

  // Cálculo del stock previsto
  const stockResultante = useMemo(() => {
    if (!productoSel) return cantidad;
    if (tipo === "entrada") return productoSel.stock + cantidad;
    if (tipo === "salida") return Math.max(0, productoSel.stock - cantidad);
    return cantidad; // ajuste directo
  }, [productoSel, tipo, cantidad]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorLocal(null);

    if (cantidad <= 0 && tipo !== "ajuste") {
      setErrorLocal("La cantidad debe ser un número entero mayor que 0");
      return;
    }

    setGuardando(true);

    try {
      if (esNuevoProducto || sinProductos) {
        // Validación de nuevo producto
        const nombreFinal = nombreNuevo.trim();
        if (!nombreFinal) {
          setErrorLocal("Por favor, ingresa el nombre del nuevo producto");
          setGuardando(false);
          return;
        }

        const catFinal =
          categoriaNueva === "__otra__"
            ? otraCategoria.trim() || "General"
            : categoriaNueva || "General";

        const pVenta = precioVentaStr ? parseFloat(precioVentaStr.toString().replace(/,/g, ".")) : undefined;
        const pCosto = precioCostoStr ? parseFloat(precioCostoStr.toString().replace(/,/g, ".")) : undefined;
        const sMin = stockMinimoStr ? parseInt(stockMinimoStr, 10) : 5;

        if (onGuardarNuevoProducto) {
          await onGuardarNuevoProducto({
            producto: {
              nombre: nombreFinal,
              sku: `SKU-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
              categoria: catFinal,
              precio: pVenta ?? 0,
              costo: pCosto ?? 0,
              stock: 0,
              stock_minimo: isNaN(sMin) ? 5 : sMin,
            },
            tipo: "entrada",
            cantidad,
            nota: nota.trim() || `Entrada inicial: ${nombreFinal}`,
          });
        }
      } else {
        // Movimiento en producto existente
        const prodIdFinal = productoId || productoSel?.id;
        if (!prodIdFinal) {
          setErrorLocal("Por favor, selecciona un producto");
          setGuardando(false);
          return;
        }

        if (tipo === "salida" && productoSel && cantidad > productoSel.stock) {
          setErrorLocal(
            `Stock insuficiente: solo hay ${productoSel.stock} unidades disponibles en inventario.`
          );
          setGuardando(false);
          return;
        }

        await onGuardar({
          producto_id: prodIdFinal,
          tipo,
          cantidad,
          nota: nota.trim() || undefined,
        });
      }
    } catch (err) {
      setErrorLocal(err instanceof Error ? err.message : "Error al registrar movimiento");
      setGuardando(false);
    }
  };

  const idSelect = useId();
  const idCant = useId();
  const idNota = useId();
  const idNombre = useId();
  const idCat = useId();
  const idPVenta = useId();
  const idPCosto = useId();
  const idSMin = useId();

  return (
    <div className="modal-backdrop" onClick={onCerrar}>
      <div
        className="modal-card max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Header del Modal */}
          <div className="flex items-center justify-between border-b border-border pb-3.5">
            <div>
              <span className="eyebrow">Control de existencias</span>
              <h2 className="text-xl font-serif font-bold text-ink">Registrar movimiento</h2>
            </div>
            <button
              type="button"
              onClick={onCerrar}
              className="text-ink-muted hover:text-ink text-xl font-bold p-1 transition-colors"
              title="Cerrar ventana"
            >
              ✕
            </button>
          </div>

          {/* Mensaje de error si ocurre */}
          {errorLocal && (
            <div className="p-3 text-xs rounded-lg bg-danger-light text-danger border border-danger/30 flex items-center gap-2">
              <span>⚠️</span>
              <span>{errorLocal}</span>
            </div>
          )}

          {/* Banner si el catálogo está vacío */}
          {sinProductos ? (
            <div className="p-3.5 rounded-xl bg-accent-light/50 border border-accent/20 text-xs text-ink space-y-1">
              <div className="font-semibold text-accent flex items-center gap-1.5">
                <span>✨</span>
                <span>Primer movimiento de inventario</span>
              </div>
              <p className="text-ink-muted text-[11px] leading-relaxed">
                Aún no tienes productos en tu catálogo. Ingresa los datos de tu artículo y registra
                su entrada inicial de stock.
              </p>
            </div>
          ) : (
            /* Selector rápido de tipo de transacción cuando ya hay productos */
            <div>
              <label className="label">Tipo de transacción</label>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: "entrada", label: "+ Entrada (Compra)", cls: "btn-primary" },
                    { id: "salida", label: "− Salida (Venta)", cls: "btn-danger" },
                    { id: "ajuste", label: "= Ajuste (Conteo)", cls: "btn-warning" },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setTipo(t.id);
                      if (esNuevoProducto && t.id !== "entrada") {
                        setEsNuevoProducto(false);
                      }
                    }}
                    className={`btn btn-sm text-xs font-semibold ${
                      tipo === t.id ? t.cls : "btn-outline"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Selección de producto (o nuevo producto) */}
          {!sinProductos && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor={idSelect} className="label mb-0">
                  Producto a registrar
                </label>
                <button
                  type="button"
                  onClick={() => setEsNuevoProducto(!esNuevoProducto)}
                  className="text-xs text-accent hover:underline font-semibold"
                >
                  {esNuevoProducto ? "← Elegir producto existente" : "+ Crear nuevo producto aquí"}
                </button>
              </div>

              {!esNuevoProducto ? (
                <select
                  id={idSelect}
                  className="select"
                  value={productoId || productoSel?.id || ""}
                  onChange={(e) => {
                    if (e.target.value === "__nuevo__") {
                      setEsNuevoProducto(true);
                    } else {
                      setProductoId(e.target.value);
                    }
                  }}
                >
                  {productos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} · SKU: {p.sku || "S/N"} (Stock actual: {p.stock} uds)
                    </option>
                  ))}
                  <option value="__nuevo__">+ Registrar otro producto nuevo...</option>
                </select>
              ) : null}
            </div>
          )}

          {/* Campos si es nuevo producto (o catálogo vacío) */}
          {(esNuevoProducto || sinProductos) && (
            <div className="space-y-3.5 p-4 rounded-xl bg-secondary-light/40 border border-border">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-ink uppercase tracking-wider">
                  Datos del nuevo producto
                </span>
                {!sinProductos && (
                  <button
                    type="button"
                    onClick={() => setEsNuevoProducto(false)}
                    className="text-xs text-ink-muted hover:text-ink"
                  >
                    Volver a lista
                  </button>
                )}
              </div>

              <div>
                <label htmlFor={idNombre} className="label">
                  Nombre del artículo *
                </label>
                <input
                  id={idNombre}
                  type="text"
                  required
                  placeholder="Ej: Leche Colanta 1L, Blusa Seda, Tornillo 2''..."
                  className="input"
                  value={nombreNuevo}
                  onChange={(e) => setNombreNuevo(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor={idCat} className="label">
                    Categoría
                  </label>
                  <select
                    id={idCat}
                    className="select text-sm"
                    value={categoriaNueva}
                    onChange={(e) => setCategoriaNueva(e.target.value)}
                  >
                    {categorias.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                    <option value="__otra__">+ Nueva categoría...</option>
                  </select>
                </div>

                {categoriaNueva === "__otra__" && (
                  <div>
                    <label className="label">Escribe el nombre:</label>
                    <input
                      type="text"
                      className="input text-sm"
                      placeholder="Ej: Lácteos, Ferretería..."
                      value={otraCategoria}
                      onChange={(e) => setOtraCategoria(e.target.value)}
                    />
                  </div>
                )}

                <div>
                  <label htmlFor={idSMin} className="label">
                    Alerta de stock mín.
                  </label>
                  <input
                    id={idSMin}
                    type="number"
                    min="0"
                    className="input text-sm"
                    value={stockMinimoStr}
                    onChange={(e) => setStockMinimoStr(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor={idPVenta} className="label">
                    Precio de venta ($)
                  </label>
                  <input
                    id={idPVenta}
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0"
                    className="input text-sm"
                    value={precioVentaStr}
                    onChange={(e) => setPrecioVentaStr(e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor={idPCosto} className="label">
                    Precio de costo ($)
                  </label>
                  <input
                    id={idPCosto}
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0"
                    className="input text-sm"
                    value={precioCostoStr}
                    onChange={(e) => setPrecioCostoStr(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Cantidad y Preview de Stock */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label htmlFor={idCant} className="label mb-0">
                  {tipo === "ajuste"
                    ? "Nuevo conteo real"
                    : esNuevoProducto || sinProductos
                    ? "Cantidad inicial recibida"
                    : "Cantidad de unidades"}
                </label>
              </div>

              <div className="flex items-center gap-1.5">
                <input
                  id={idCant}
                  type="number"
                  min={tipo === "ajuste" ? "0" : "1"}
                  step="1"
                  required
                  className="input font-semibold text-base"
                  value={cantidadStr}
                  onChange={(e) => setCantidadStr(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setCantidadStr(String(Math.max(1, (parseInt(cantidadStr, 10) || 0) + 1)))}
                  className="btn btn-outline btn-sm px-2.5 h-10"
                  title="Sumar 1"
                >
                  +1
                </button>
                <button
                  type="button"
                  onClick={() => setCantidadStr(String(Math.max(1, (parseInt(cantidadStr, 10) || 0) + 5)))}
                  className="btn btn-outline btn-sm px-2.5 h-10"
                  title="Sumar 5"
                >
                  +5
                </button>
              </div>
            </div>

            {/* Tarjeta de pronóstico de inventario */}
            <div className="p-3 rounded-xl bg-surface border border-border shadow-warm-xs text-xs space-y-1">
              <span className="text-ink-muted text-[11px] block">Existencia resultante prevista:</span>
              <div className="text-base font-bold text-ink flex items-center gap-2">
                {!esNuevoProducto && !sinProductos ? (
                  <>
                    <span className="text-ink-muted">{productoSel?.stock ?? 0}</span>
                    <span className="text-ink-muted font-normal">→</span>
                    <span
                      className={
                        tipo === "salida"
                          ? "text-danger font-extrabold"
                          : tipo === "ajuste"
                          ? "text-warning font-extrabold"
                          : "text-primary font-extrabold"
                      }
                    >
                      {stockResultante} uds
                    </span>
                  </>
                ) : (
                  <span className="text-primary font-extrabold">
                    +{cantidad} uds disponibles
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Nota o motivo */}
          <div>
            <label htmlFor={idNota} className="label">
              Nota o motivo (opcional)
            </label>
            <input
              id={idNota}
              type="text"
              className="input text-sm"
              placeholder={
                tipo === "entrada"
                  ? "Ej: Factura de proveedor, reposición de bodega..."
                  : tipo === "salida"
                  ? "Ej: Venta en mostrador, despacho a domicilio..."
                  : "Ej: Conteo físico mensual, merma..."
              }
              value={nota}
              onChange={(e) => setNota(e.target.value)}
            />
          </div>

          {/* Botones de acción */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onCerrar}
              className="btn btn-ghost btn-sm"
              disabled={guardando}
            >
              Cancelar
            </button>
            <button
              id="btn-confirmar-movimiento"
              type="submit"
              disabled={guardando}
              className="btn btn-primary btn-sm sm:btn-md font-semibold flex items-center gap-2 shadow-warm-sm"
            >
              {guardando ? (
                <>
                  <span className="inline-block animate-spin">⏳</span>
                  <span>Registrando movimiento…</span>
                </>
              ) : (
                <>
                  <span>⇅</span>
                  <span>
                    {esNuevoProducto || sinProductos
                      ? "Registrar producto y movimiento"
                      : "Registrar movimiento"}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
