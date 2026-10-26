"use client";

import { useId, useMemo, useState } from "react";
import { moneda } from "@/lib/inventario/format";
import { useInventario } from "@/lib/inventario/store";

export function ModalFiado({ onCerrar }: { onCerrar: () => void }) {
  const { productos, crearFiado, avisar } = useInventario();

  const [clienteNombre, setClienteNombre] = useState("");
  const [clienteContacto, setClienteContacto] = useState("");
  const [productoModo, setProductoModo] = useState<"catalogo" | "manual">("catalogo");
  const [productoId, setProductoId] = useState(productos[0]?.id || "");
  const [productoManual, setProductoManual] = useState("");
  const [cantidadStr, setCantidadStr] = useState("1");
  const [valorUnitarioStr, setValorUnitarioStr] = useState(
    productos[0]?.precio?.toString() || "0"
  );
  const [descontarStock, setDescontarStock] = useState(true);
  const [nota, setNota] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  const productoSeleccionado = productos.find((p) => p.id === productoId);

  // Al cambiar el producto del catálogo, actualizar el precio unitario
  const handleSelectProducto = (id: string) => {
    setProductoId(id);
    const prod = productos.find((p) => p.id === id);
    if (prod) {
      setValorUnitarioStr(prod.precio.toString());
    }
  };

  const cantidad = parseInt(cantidadStr, 10) || 0;
  const valorUnitario = parseFloat(valorUnitarioStr) || 0;
  const valorTotal = useMemo(() => cantidad * valorUnitario, [cantidad, valorUnitario]);

  const idCliente = useId();
  const idTel = useId();
  const idProdSelect = useId();
  const idProdManual = useId();
  const idCant = useId();
  const idValor = useId();
  const idDesc = useId();
  const idNota = useId();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorLocal(null);

    const cNom = clienteNombre.trim();
    if (!cNom) {
      setErrorLocal("El nombre del cliente es obligatorio");
      return;
    }

    const pNom =
      productoModo === "catalogo"
        ? productoSeleccionado?.nombre || "Producto"
        : productoManual.trim();

    if (!pNom) {
      setErrorLocal("Indica el nombre del producto fiado");
      return;
    }

    if (cantidad <= 0) {
      setErrorLocal("La cantidad debe ser mayor que cero");
      return;
    }

    if (valorUnitario < 0) {
      setErrorLocal("El valor del producto no puede ser negativo");
      return;
    }

    if (
      descontarStock &&
      productoModo === "catalogo" &&
      productoSeleccionado &&
      cantidad > productoSeleccionado.stock
    ) {
      setErrorLocal(
        `No hay suficiente stock en inventario (disponibles: ${productoSeleccionado.stock} uds)`
      );
      return;
    }

    try {
      setGuardando(true);
      await crearFiado({
        cliente_nombre: cNom,
        cliente_contacto: clienteContacto.trim() || undefined,
        producto_id: productoModo === "catalogo" ? productoId : undefined,
        producto_nombre: pNom,
        cantidad,
        valor_unitario: valorUnitario,
        valor_total: valorTotal,
        estado: "pendiente",
        nota: nota.trim() || undefined,
        descontarStock: descontarStock && productoModo === "catalogo",
      });
      avisar(`Se registró el fiado para "${cNom}" por ${moneda(valorTotal)}`);
      onCerrar();
    } catch (err) {
      setErrorLocal(err instanceof Error ? err.message : "Error al registrar fiado");
      setGuardando(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onCerrar}>
      <div className="modal-card max-w-lg" onClick={(e) => e.stopPropagation()}>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <span className="eyebrow">Clientes Fijos</span>
              <h2 className="text-xl font-serif font-bold text-ink">Registrar producto fiado</h2>
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

          {/* Datos del Cliente */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor={idCliente} className="label">
                Nombre del cliente *
              </label>
              <input
                id={idCliente}
                type="text"
                required
                className="input"
                placeholder="Ej: Doña Carmen, Carlos..."
                value={clienteNombre}
                onChange={(e) => setClienteNombre(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor={idTel} className="label">
                Teléfono / Celular (opcional)
              </label>
              <input
                id={idTel}
                type="tel"
                className="input"
                placeholder="Ej: 310 123 4567"
                value={clienteContacto}
                onChange={(e) => setClienteContacto(e.target.value)}
              />
            </div>
          </div>

          {/* Selector de producto */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="label mb-0">Producto fiado *</label>
              <div className="flex gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setProductoModo("catalogo")}
                  className={`px-2 py-0.5 rounded ${
                    productoModo === "catalogo"
                      ? "bg-primary text-white font-semibold"
                      : "text-ink-muted hover:text-ink"
                  }`}
                >
                  Del catálogo
                </button>
                <button
                  type="button"
                  onClick={() => setProductoModo("manual")}
                  className={`px-2 py-0.5 rounded ${
                    productoModo === "manual"
                      ? "bg-primary text-white font-semibold"
                      : "text-ink-muted hover:text-ink"
                  }`}
                >
                  Personalizado
                </button>
              </div>
            </div>

            {productoModo === "catalogo" ? (
              <div>
                <select
                  id={idProdSelect}
                  className="select"
                  value={productoId}
                  onChange={(e) => handleSelectProducto(e.target.value)}
                >
                  {productos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} — {moneda(p.precio)} (Stock: {p.stock})
                    </option>
                  ))}
                </select>
                {productoSeleccionado && (
                  <p className="helper-text">
                    Stock actual disponible: {productoSeleccionado.stock} unidades
                  </p>
                )}
              </div>
            ) : (
              <div>
                <input
                  id={idProdManual}
                  type="text"
                  required
                  className="input"
                  placeholder="Nombre del producto o servicio fiado"
                  value={productoManual}
                  onChange={(e) => setProductoManual(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Cantidad y Valor Unitario */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor={idCant} className="label">
                Cantidad de productos *
              </label>
              <input
                id={idCant}
                type="number"
                min="1"
                step="1"
                required
                className="input"
                value={cantidadStr}
                onChange={(e) => setCantidadStr(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor={idValor} className="label">
                Valor unitario (COP) *
              </label>
              <input
                id={idValor}
                type="number"
                min="0"
                step="500"
                required
                className="input"
                value={valorUnitarioStr}
                onChange={(e) => setValorUnitarioStr(e.target.value)}
              />
            </div>
          </div>

          {/* Total calculado y Descontar de stock */}
          <div className="p-3.5 rounded-xl bg-secondary-light/60 border border-border flex items-center justify-between">
            <span className="text-xs font-semibold text-ink-muted uppercase">
              Total de la deuda:
            </span>
            <span className="text-xl font-serif font-bold text-danger">
              {moneda(valorTotal)}
            </span>
          </div>

          {productoModo === "catalogo" && (
            <label htmlFor={idDesc} className="flex items-center gap-2.5 text-xs text-ink cursor-pointer">
              <input
                id={idDesc}
                type="checkbox"
                className="checkbox"
                checked={descontarStock}
                onChange={(e) => setDescontarStock(e.target.checked)}
              />
              <span>Descontar automáticamente {cantidad || 0} unidades del inventario de stock</span>
            </label>
          )}

          {/* Nota */}
          <div>
            <label htmlFor={idNota} className="label">
              Nota o compromiso de pago (opcional)
            </label>
            <input
              id={idNota}
              type="text"
              className="input"
              placeholder="Ej: Paga la próxima semana, abona la mitad el sábado..."
              value={nota}
              onChange={(e) => setNota(e.target.value)}
            />
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
              {guardando ? "Registrando…" : "Guardar fiado"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
