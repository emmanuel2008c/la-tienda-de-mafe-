"use client";

import { useId, useMemo, useState } from "react";
import { estadoSalidaMeta, moneda, obtenerEstadoSalida } from "@/lib/inventario/format";
import type {
  CambiosSalida,
  EstadoSalida,
  Movimiento,
  Producto,
} from "@/lib/inventario/types";

function aDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export function ModalEditarSalida({
  movimiento,
  estadoPredefinido,
  productos,
  onCerrar,
  onGuardar,
  onEliminar,
}: {
  movimiento: Movimiento;
  estadoPredefinido?: EstadoSalida;
  productos: Producto[];
  onCerrar: () => void;
  onGuardar: (id: string, cambios: CambiosSalida) => Promise<void>;
  onEliminar: (id: string) => Promise<void>;
}) {
  const prodOriginal = useMemo(
    () => productos.find((p) => p.id === movimiento.producto_id),
    [productos, movimiento.producto_id]
  );

  const fechaOriginalLocal = useMemo(
    () => aDatetimeLocal(movimiento.created_at),
    [movimiento.created_at]
  );

  const [estadoSalida, setEstadoSalida] = useState<EstadoSalida>(
    () => estadoPredefinido ?? obtenerEstadoSalida(movimiento)
  );
  const [productoId, setProductoId] = useState<string>(
    () => prodOriginal?.id ?? productos[0]?.id ?? movimiento.producto_id
  );
  const [cantidadStr, setCantidadStr] = useState<string>(() => String(movimiento.cantidad));
  const [precioUnitarioStr, setPrecioUnitarioStr] = useState<string>(() =>
    String(movimiento.precio_unitario ?? prodOriginal?.precio ?? 0)
  );
  const [clienteNombre, setClienteNombre] = useState<string>(() => {
    if (movimiento.cliente_nombre) return movimiento.cliente_nombre;
    if (movimiento.nota?.toLowerCase().startsWith("fiado a cliente:")) {
      return movimiento.nota.slice("fiado a cliente:".length).trim();
    }
    return "";
  });
  const [clienteContacto, setClienteContacto] = useState<string>(
    () => movimiento.cliente_contacto ?? ""
  );
  const [fechaLocal, setFechaLocal] = useState<string>(fechaOriginalLocal);
  const [nota, setNota] = useState<string>(() => movimiento.nota ?? "");

  const [guardando, setGuardando] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  const productoSel = useMemo(
    () => productos.find((p) => p.id === productoId) ?? prodOriginal ?? productos[0],
    [productos, productoId, prodOriginal]
  );

  const cantidad = parseInt(cantidadStr, 10) || 0;
  const precioUnitario =
    precioUnitarioStr.trim() === ""
      ? 0
      : parseFloat(precioUnitarioStr.toString().replace(/,/g, ".")) || 0;
  const valorTotal = useMemo(() => cantidad * precioUnitario, [cantidad, precioUnitario]);

  const mismoProducto = productoSel?.id === movimiento.producto_id;
  const stockMaximoDisponible = useMemo(() => {
    if (!productoSel) return 0;
    return mismoProducto ? productoSel.stock + movimiento.cantidad : productoSel.stock;
  }, [productoSel, mismoProducto, movimiento.cantidad]);

  const stockNuevoPrevisto = useMemo(() => {
    if (!productoSel) return 0;
    return stockMaximoDisponible - cantidad;
  }, [productoSel, stockMaximoDisponible, cantidad]);

  const diferenciaUnidades = cantidad - movimiento.cantidad;

  const handleSelectProducto = (nuevoId: string) => {
    setProductoId(nuevoId);
    const nuevoProd = productos.find((p) => p.id === nuevoId);
    if (nuevoProd) {
      if (nuevoId === movimiento.producto_id && movimiento.precio_unitario !== undefined) {
        setPrecioUnitarioStr(String(movimiento.precio_unitario));
      } else {
        setPrecioUnitarioStr(String(nuevoProd.precio));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorLocal(null);

    if (!productoSel) {
      setErrorLocal("Selecciona un producto válido del catálogo.");
      return;
    }

    if (cantidad <= 0) {
      setErrorLocal("La cantidad de la salida debe ser mayor que 0.");
      return;
    }

    if (precioUnitario < 0) {
      setErrorLocal("El precio unitario no puede ser negativo.");
      return;
    }

    if (cantidad > stockMaximoDisponible) {
      setErrorLocal(
        `Stock insuficiente en "${productoSel.nombre}": máximo disponible ${stockMaximoDisponible} unidades.`
      );
      return;
    }

    if (estadoSalida === "fiado" && !clienteNombre.trim()) {
      setErrorLocal("Por favor ingresa el nombre del cliente cuando la salida es Fiado.");
      return;
    }

    let fechaIsoFinal = movimiento.created_at;
    if (fechaLocal && fechaLocal !== fechaOriginalLocal) {
      const parsed = new Date(fechaLocal);
      if (!Number.isNaN(parsed.getTime())) {
        fechaIsoFinal = parsed.toISOString();
      }
    }

    try {
      setGuardando(true);
      await onGuardar(movimiento.id, {
        producto_id: productoSel.id,
        cantidad,
        precio_unitario: precioUnitario,
        estado_salida: estadoSalida,
        cliente_nombre: clienteNombre.trim() || undefined,
        cliente_contacto: clienteContacto.trim() || undefined,
        nota: nota.trim() || undefined,
        created_at: fechaIsoFinal,
      });
    } catch (err) {
      setErrorLocal(err instanceof Error ? err.message : "Error al actualizar la salida");
      setGuardando(false);
    }
  };

  const handleEliminar = async () => {
    const nombreProd = prodOriginal?.nombre ?? "este producto";
    if (
      !confirm(
        `¿Deseas eliminar esta salida de ${movimiento.cantidad} uds de "${nombreProd}"? Las unidades se devolverán automáticamente al stock disponible.`
      )
    ) {
      return;
    }
    try {
      setEliminando(true);
      await onEliminar(movimiento.id);
    } catch (err) {
      setErrorLocal(err instanceof Error ? err.message : "Error al eliminar la salida");
      setEliminando(false);
    }
  };

  const idProd = useId();
  const idCant = useId();
  const idPrecio = useId();
  const idCliente = useId();
  const idContacto = useId();
  const idFecha = useId();
  const idNota = useId();

  return (
    <div className="modal-backdrop" onClick={onCerrar}>
      <div
        className="modal-card max-w-xl overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Encabezado */}
          <div className="flex items-center justify-between border-b border-border pb-3.5">
            <div>
              <span className="eyebrow">Edición completa de salida</span>
              <h2 className="text-xl font-serif font-bold text-ink">
                Modificar salida registrada
              </h2>
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

          {errorLocal && (
            <div className="p-3 text-xs rounded-lg bg-danger-light text-danger border border-danger/30 flex items-center gap-2">
              <span>⚠️</span>
              <span>{errorLocal}</span>
            </div>
          )}

          {/* 1. Estado de la salida: Vendido / Fiado / Ya pago */}
          <div className="space-y-2">
            <label className="label mb-0">Estado de la salida *</label>
            <div className="grid grid-cols-3 gap-2.5">
              {(["vendido", "fiado", "ya_pago"] as const).map((est) => {
                const meta = estadoSalidaMeta[est];
                const activo = estadoSalida === est;
                return (
                  <button
                    key={est}
                    type="button"
                    onClick={() => setEstadoSalida(est)}
                    className={`p-2.5 rounded-xl border text-left transition-all flex flex-col gap-1 ${
                      activo
                        ? est === "fiado"
                          ? "border-danger bg-danger-light/60 shadow-warm-sm ring-1 ring-danger"
                          : est === "ya_pago"
                          ? "border-accent bg-accent-light/80 shadow-warm-sm ring-1 ring-accent"
                          : "border-primary bg-primary-light/80 shadow-warm-sm ring-1 ring-primary"
                        : "border-border bg-surface hover:border-accent"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-sm font-bold text-ink flex items-center gap-1.5">
                        <span>{meta.icono}</span>
                        <span>{meta.etiqueta}</span>
                      </span>
                      {activo && (
                        <span className="text-[10px] font-extrabold uppercase text-primary">
                          ●
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-ink-muted leading-tight">
                      {meta.descripcion}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Producto de la salida */}
          <div>
            <label htmlFor={idProd} className="label">
              Producto *
            </label>
            <select
              id={idProd}
              className="select"
              value={productoSel?.id ?? ""}
              onChange={(e) => handleSelectProducto(e.target.value)}
            >
              {productos.map((p) => {
                const esOriginal = p.id === movimiento.producto_id;
                const disp = esOriginal ? p.stock + movimiento.cantidad : p.stock;
                return (
                  <option key={p.id} value={p.id}>
                    {p.nombre} · {moneda(p.precio)} (Stock actual: {p.stock} uds
                    {esOriginal ? ` · máx. editable: ${disp} uds` : ""})
                  </option>
                );
              })}
            </select>
          </div>

          {/* 3. Cantidad, Precio Unitario y Valor Total */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor={idCant} className="label">
                Cantidad de unidades *
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    setCantidadStr(String(Math.max(1, (parseInt(cantidadStr, 10) || 1) - 1)))
                  }
                  className="btn btn-outline btn-sm px-2.5 h-11"
                  title="Restar 1"
                >
                  −1
                </button>
                <input
                  id={idCant}
                  type="number"
                  min="1"
                  max={Math.max(1, stockMaximoDisponible)}
                  step="1"
                  required
                  className="input font-semibold text-base text-center"
                  value={cantidadStr}
                  onChange={(e) => setCantidadStr(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() =>
                    setCantidadStr(String(Math.max(1, (parseInt(cantidadStr, 10) || 0) + 1)))
                  }
                  className="btn btn-outline btn-sm px-2.5 h-11"
                  title="Sumar 1"
                >
                  +1
                </button>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor={idPrecio} className="label mb-0">
                  Precio unitario ($) *
                </label>
                {productoSel && precioUnitario !== productoSel.precio && (
                  <button
                    type="button"
                    onClick={() => setPrecioUnitarioStr(String(productoSel.precio))}
                    className="text-[11px] text-primary hover:underline font-semibold"
                  >
                    Usar catálogo ({moneda(productoSel.precio)})
                  </button>
                )}
              </div>
              <input
                id={idPrecio}
                type="number"
                min="0"
                step="any"
                required
                className="input font-semibold"
                value={precioUnitarioStr}
                onChange={(e) => setPrecioUnitarioStr(e.target.value)}
              />
            </div>
          </div>

          {/* Resumen de Total y Reconciliación de Stock */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-secondary-light/50 border border-border text-xs">
            <div className="space-y-0.5">
              <span className="text-ink-muted uppercase font-semibold text-[10px] block">
                Valor total de la salida
              </span>
              <span
                className={`text-xl font-serif font-bold block ${
                  estadoSalida === "fiado" ? "text-danger" : "text-primary"
                }`}
              >
                {moneda(valorTotal)}
              </span>
              <span className="text-[11px] text-ink-muted">
                {cantidad} {cantidad === 1 ? "unidad" : "unidades"} × {moneda(precioUnitario)}
              </span>
            </div>

            <div className="space-y-1 sm:border-l sm:border-border sm:pl-3">
              <span className="text-ink-muted uppercase font-semibold text-[10px] block">
                Ajuste automático de stock
              </span>
              {mismoProducto ? (
                <>
                  <div className="text-sm font-bold text-ink flex items-center gap-1.5">
                    <span>{productoSel?.stock ?? 0} uds</span>
                    <span className="text-ink-muted font-normal">→</span>
                    <span
                      className={
                        stockNuevoPrevisto < 0
                          ? "text-danger"
                          : diferenciaUnidades > 0
                          ? "text-warning"
                          : "text-primary"
                      }
                    >
                      {stockNuevoPrevisto} uds
                    </span>
                  </div>
                  <span className="text-[11px] text-ink-muted block">
                    {diferenciaUnidades === 0
                      ? `Sin cambio en unidades (${movimiento.cantidad} uds)`
                      : diferenciaUnidades > 0
                      ? `Se descuentan ${diferenciaUnidades} uds adicionales`
                      : `Se devuelven +${Math.abs(diferenciaUnidades)} uds al inventario`}
                  </span>
                </>
              ) : (
                <div className="text-[11px] text-ink space-y-0.5 leading-snug">
                  {prodOriginal && (
                    <div>
                      ↩ <strong>{prodOriginal.nombre}:</strong> +{movimiento.cantidad} uds
                      devueltas ({prodOriginal.stock + movimiento.cantidad} uds)
                    </div>
                  )}
                  {productoSel && (
                    <div>
                      ↪ <strong>{productoSel.nombre}:</strong> −{cantidad} uds ({stockNuevoPrevisto}{" "}
                      uds)
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 4. Datos del Cliente (requerido si es Fiado, opcional en Vendido / Ya pago) */}
          <div
            className={`p-3.5 rounded-xl border space-y-3 transition-colors ${
              estadoSalida === "fiado"
                ? "bg-danger-light/25 border-danger/30"
                : "bg-surface border-border"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-ink uppercase tracking-wider">
                Datos del cliente{" "}
                {estadoSalida === "fiado" ? "(Obligatorio para Fiado)" : "(Opcional)"}
              </span>
              {estadoSalida === "fiado" && (
                <span className="badge badge-danger text-[10px]">Sincroniza con Fiados</span>
              )}
              {estadoSalida === "ya_pago" && movimiento.fiado_id && (
                <span className="badge badge-primary text-[10px]">Marca deuda como pagada</span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor={idCliente} className="label text-xs">
                  Nombre del cliente {estadoSalida === "fiado" ? "*" : ""}
                </label>
                <input
                  id={idCliente}
                  type="text"
                  required={estadoSalida === "fiado"}
                  className="input text-sm h-10"
                  placeholder="Ej: Doña Carmen, Carlos..."
                  value={clienteNombre}
                  onChange={(e) => setClienteNombre(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor={idContacto} className="label text-xs">
                  Teléfono / Contacto
                </label>
                <input
                  id={idContacto}
                  type="tel"
                  className="input text-sm h-10"
                  placeholder="Ej: 310 123 4567"
                  value={clienteContacto}
                  onChange={(e) => setClienteContacto(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* 5. Fecha y Nota / Motivo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor={idFecha} className="label">
                Fecha y hora de la salida
              </label>
              <input
                id={idFecha}
                type="datetime-local"
                className="input text-sm"
                value={fechaLocal}
                onChange={(e) => setFechaLocal(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor={idNota} className="label">
                Nota / Método de pago / Motivo
              </label>
              <input
                id={idNota}
                type="text"
                className="input text-sm"
                placeholder="Ej: Pago Nequi, efectivo, abona viernes..."
                value={nota}
                onChange={(e) => setNota(e.target.value)}
              />
            </div>
          </div>

          {/* Acciones */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border">
            <button
              type="button"
              onClick={handleEliminar}
              disabled={guardando || eliminando}
              className="btn btn-ghost btn-sm text-danger hover:bg-danger-light text-xs px-3"
              title="Anular esta salida y devolver las unidades al stock"
            >
              {eliminando ? "Eliminando…" : "🗑️ Eliminar salida"}
            </button>

            <div className="flex items-center gap-2.5 ml-auto">
              <button
                type="button"
                onClick={onCerrar}
                disabled={guardando || eliminando}
                className="btn btn-ghost btn-sm"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guardando || eliminando}
                className="btn btn-primary btn-sm font-semibold shadow-warm-sm"
              >
                {guardando ? "Guardando cambios…" : "Guardar cambios"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

