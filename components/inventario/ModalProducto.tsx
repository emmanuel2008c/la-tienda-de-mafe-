"use client";

import { useId, useState } from "react";
import type { NuevoProducto, Producto } from "@/lib/inventario/types";

export function ModalProducto({
  producto,
  categoriasExistentes,
  categoriaInicial,
  onCerrar,
  onGuardar,
}: {
  producto: Producto | null;
  categoriasExistentes: string[];
  categoriaInicial?: string;
  onCerrar: () => void;
  onGuardar: (p: NuevoProducto) => Promise<void>;
}) {
  const esEdicion = !!producto;

  const [nombre, setNombre] = useState(producto?.nombre ?? "");
  const [sku, setSku] = useState(producto?.sku ?? "");
  const [categoria, setCategoria] = useState(
    producto?.categoria ?? categoriaInicial ?? (categoriasExistentes[0] || "__nueva__")
  );
  const [otraCategoria, setOtraCategoria] = useState("");
  const [precio, setPrecio] = useState(producto?.precio?.toString() ?? "0");
  const [costo, setCosto] = useState(producto?.costo?.toString() ?? "0");
  const [stock, setStock] = useState(producto?.stock?.toString() ?? "0");
  const [stockMinimo, setStockMinimo] = useState(producto?.stock_minimo?.toString() ?? "5");

  const [guardando, setGuardando] = useState(false);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  const idNombre = useId();
  const idSku = useId();
  const idCat = useId();
  const idOtraCat = useId();
  const idPrecio = useId();
  const idCosto = useId();
  const idStock = useId();
  const idMin = useId();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorLocal(null);

    const nombreLimpio = nombre.trim();
    if (!nombreLimpio) {
      setErrorLocal("El nombre del producto es obligatorio");
      return;
    }

    const catFinal = categoria === "__nueva__" ? otraCategoria.trim() : categoria;
    if (!catFinal) {
      setErrorLocal("Indica una categoría válida");
      return;
    }

    const pNum = parseFloat(precio) || 0;
    const cNum = parseFloat(costo) || 0;
    const sNum = parseInt(stock, 10) || 0;
    const mNum = parseInt(stockMinimo, 10) || 0;

    if (pNum < 0 || cNum < 0 || sNum < 0 || mNum < 0) {
      setErrorLocal("Los valores numéricos no pueden ser negativos");
      return;
    }

    try {
      setGuardando(true);
      await onGuardar({
        nombre: nombreLimpio,
        sku: sku.trim() || `SKU-${Math.floor(100 + Math.random() * 900)}`,
        categoria: catFinal,
        precio: pNum,
        costo: cNum,
        stock: sNum,
        stock_minimo: mNum,
      });
    } catch (err) {
      setErrorLocal(err instanceof Error ? err.message : "Error al guardar producto");
      setGuardando(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onCerrar}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <span className="eyebrow">{esEdicion ? "Editar artículo" : "Nuevo artículo"}</span>
              <h2 className="text-xl font-serif font-bold text-ink">
                {esEdicion ? producto.nombre : "Añadir al catálogo"}
              </h2>
            </div>
            <button
              type="button"
              onClick={onCerrar}
              className="text-ink-muted hover:text-ink text-xl font-bold p-1"
            >
              ✕
            </button>
          </div>

          {errorLocal && (
            <div className="p-3 text-xs rounded-lg bg-danger-light text-danger">
              {errorLocal}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label htmlFor={idNombre} className="label">
                Nombre del producto
              </label>
              <input
                id={idNombre}
                type="text"
                required
                className="input"
                placeholder="Ej: Vela de lavanda"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor={idSku} className="label">
                SKU / Código
              </label>
              <input
                id={idSku}
                type="text"
                className="input font-mono text-xs uppercase"
                placeholder="VEL-001"
                value={sku}
                onChange={(e) => setSku(e.target.value.toUpperCase())}
              />
            </div>
          </div>

          {/* Categoría */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor={idCat} className="label mb-0">
                Categoría
              </label>
              {categoriasExistentes.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setCategoria("__nueva__");
                    setTimeout(() => document.getElementById(idOtraCat)?.focus(), 50);
                  }}
                  className="text-xs text-primary font-semibold hover:underline"
                >
                  + Crear nueva categoría
                </button>
              )}
            </div>
            {categoriasExistentes.length > 0 ? (
              <select
                id={idCat}
                className="select"
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
              >
                {categoriasExistentes.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
                <option value="__nueva__">+ Crear nueva categoría…</option>
              </select>
            ) : (
              <p className="text-xs text-ink-muted">
                Aún no has creado categorías. Define la primera categoría para tu tienda aquí abajo:
              </p>
            )}
          </div>

          {categoria === "__nueva__" && (
            <div className="p-3 rounded-lg bg-secondary-light/60 border border-border space-y-2">
              <label htmlFor={idOtraCat} className="label text-xs">
                Escribe el nombre de la nueva categoría *
              </label>
              <div className="flex gap-2">
                <input
                  id={idOtraCat}
                  type="text"
                  required
                  autoFocus
                  className="input text-sm h-9 flex-1"
                  placeholder="Ej: Joyería, Papelería, Cosméticos..."
                  value={otraCategoria}
                  onChange={(e) => setOtraCategoria(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Precios */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor={idPrecio} className="label">
                Precio de venta (COP)
              </label>
              <input
                id={idPrecio}
                type="number"
                min="0"
                step="500"
                required
                className="input"
                value={precio}
                onChange={(e) => setPrecio(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor={idCosto} className="label">
                Costo unitario (COP)
              </label>
              <input
                id={idCosto}
                type="number"
                min="0"
                step="500"
                required
                className="input"
                value={costo}
                onChange={(e) => setCosto(e.target.value)}
              />
            </div>
          </div>

          {/* Stock */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor={idStock} className="label">
                Stock actual
              </label>
              <input
                id={idStock}
                type="number"
                min="0"
                step="1"
                required
                className="input"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor={idMin} className="label">
                Stock mínimo de alerta
              </label>
              <input
                id={idMin}
                type="number"
                min="0"
                step="1"
                required
                className="input"
                value={stockMinimo}
                onChange={(e) => setStockMinimo(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
            <button type="button" onClick={onCerrar} className="btn btn-ghost btn-sm">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="btn btn-primary btn-sm"
            >
              {guardando ? "Guardando…" : esEdicion ? "Guardar cambios" : "Crear producto"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
