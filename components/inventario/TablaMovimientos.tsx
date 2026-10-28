"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import {
  cantidadTexto,
  estadoSalidaMeta,
  fechaCorta,
  moneda,
  numero,
  obtenerEstadoSalida,
  tipoMeta,
} from "@/lib/inventario/format";
import { useInventario } from "@/lib/inventario/store";
import type {
  EstadoSalida,
  Movimiento,
  Producto,
  TipoMovimiento,
} from "@/lib/inventario/types";

export function TablaMovimientos({
  limite,
  tipoInicial = "todos",
}: {
  limite?: number;
  tipoInicial?: "todos" | TipoMovimiento;
}) {
  const {
    movimientos,
    productos,
    abrirModalMovimiento,
    abrirModalEditarSalida,
    actualizarSalida,
    eliminarSalida,
    metricasVentas,
    cargando,
    avisar,
  } = useInventario();

  const [filtroTipoMov, setFiltroTipoMov] = useState<"todos" | TipoMovimiento>(tipoInicial);
  const [filtroEstadoSalida, setFiltroEstadoSalida] = useState<"todos" | EstadoSalida>("todos");
  const [busqueda, setBusqueda] = useState("");
  const [actualizandoId, setActualizandoId] = useState<string | null>(null);

  const productoPorId = useMemo(() => {
    const map = new Map<string, Producto>();
    for (const p of productos) map.set(p.id, p);
    return map;
  }, [productos]);

  const conteoSalidasPorEstado = useMemo(() => {
    let vendido = 0;
    let fiado = 0;
    let ya_pago = 0;
    for (const m of movimientos) {
      if (m.tipo !== "salida") continue;
      const est = obtenerEstadoSalida(m);
      if (est === "vendido") vendido++;
      else if (est === "fiado") fiado++;
      else if (est === "ya_pago") ya_pago++;
    }
    return { vendido, fiado, ya_pago, total: vendido + fiado + ya_pago };
  }, [movimientos]);

  const movimientosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    let list = movimientos.filter((m) => {
      if (filtroTipoMov !== "todos" && m.tipo !== filtroTipoMov) {
        return false;
      }
      if (filtroEstadoSalida !== "todos") {
        if (m.tipo !== "salida") return false;
        if (obtenerEstadoSalida(m) !== filtroEstadoSalida) return false;
      }
      if (q) {
        const prod = productoPorId.get(m.producto_id);
        const coincideProd =
          prod?.nombre.toLowerCase().includes(q) || prod?.sku.toLowerCase().includes(q);
        const coincideCliente =
          m.cliente_nombre?.toLowerCase().includes(q) ||
          m.cliente_contacto?.toLowerCase().includes(q);
        const coincideNota = m.nota?.toLowerCase().includes(q);
        if (!coincideProd && !coincideCliente && !coincideNota) {
          return false;
        }
      }
      return true;
    });

    if (limite && limite > 0) {
      list = list.slice(0, limite);
    }
    return list;
  }, [movimientos, filtroTipoMov, filtroEstadoSalida, busqueda, productoPorId, limite]);

  const handleCambioRapidoEstado = async (m: Movimiento, nuevoEstado: EstadoSalida) => {
    const estadoActual = obtenerEstadoSalida(m);
    if (nuevoEstado === estadoActual) return;

    const prod = productoPorId.get(m.producto_id);
    if (!prod) {
      abrirModalEditarSalida(m, nuevoEstado);
      return;
    }

    const clienteActual =
      m.cliente_nombre?.trim() ||
      (m.nota?.toLowerCase().startsWith("fiado a cliente:")
        ? m.nota.slice("fiado a cliente:".length).trim()
        : "");

    // Si pasa a "fiado" y aún no tiene cliente asignado, abrir el modal con "Fiado" preseleccionado
    if (nuevoEstado === "fiado" && !clienteActual) {
      abrirModalEditarSalida(m, "fiado");
      return;
    }

    try {
      setActualizandoId(m.id);
      await actualizarSalida(m.id, {
        producto_id: m.producto_id,
        cantidad: m.cantidad,
        precio_unitario: m.precio_unitario ?? prod.precio,
        estado_salida: nuevoEstado,
        cliente_nombre: clienteActual || undefined,
        cliente_contacto: m.cliente_contacto ?? undefined,
        nota: m.nota ?? undefined,
        created_at: m.created_at,
      });
      avisar(`Estado de salida cambiado a "${estadoSalidaMeta[nuevoEstado].etiqueta}"`);
    } catch (err) {
      avisar(err instanceof Error ? err.message : "Error al actualizar estado", "error");
    } finally {
      setActualizandoId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Barra de filtros, búsqueda y acciones */}
      <div className="bg-surface p-4 rounded-xl border border-border shadow-warm-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Filtro por tipo de movimiento */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-ink-muted uppercase mr-1">Tipo:</span>
            {(["todos", "salida", "entrada", "ajuste"] as const).map((tipo) => (
              <button
                key={tipo}
                type="button"
                onClick={() => {
                  setFiltroTipoMov(tipo);
                  if (tipo !== "todos" && tipo !== "salida") {
                    setFiltroEstadoSalida("todos");
                  }
                }}
                className={`btn btn-sm ${
                  filtroTipoMov === tipo
                    ? tipo === "salida"
                      ? "btn-danger"
                      : "btn-primary"
                    : "btn-ghost"
                }`}
              >
                {tipo === "todos"
                  ? "Todos"
                  : tipo === "salida"
                  ? `Salidas (${conteoSalidasPorEstado.total})`
                  : tipoMeta[tipo].etiqueta}
              </button>
            ))}
          </div>

          {/* Botones de registro */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => abrirModalMovimiento(productos[0]?.id ?? "", "salida")}
              className="btn btn-danger btn-sm flex items-center gap-1.5"
              title="Registrar nueva salida (Vendido, Fiado o Ya pago)"
            >
              <span>−</span>
              <span>Registrar salida</span>
            </button>
            <button
              id="btn-tabla-movimiento"
              type="button"
              onClick={() => abrirModalMovimiento(productos[0]?.id ?? "", "entrada")}
              className="btn btn-outline btn-sm flex items-center gap-1.5"
              title="Registrar entrada o ajuste de stock"
            >
              <span>⇅</span>
              <span>Entrada / Ajuste</span>
            </button>
          </div>
        </div>

        {/* Segunda fila: Buscador y filtro por estado de salida (Vendido / Fiado / Ya pago) */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/70">
          <div className="flex-1 min-w-[210px] max-w-md">
            <input
              type="search"
              className="input input-pill text-xs h-9"
              placeholder="Buscar por producto, SKU, cliente o nota…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>

          {(filtroTipoMov === "todos" || filtroTipoMov === "salida") && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-semibold text-ink-muted uppercase mr-1">
                Estado salida:
              </span>
              {(["todos", "vendido", "fiado", "ya_pago"] as const).map((est) => {
                const activo = filtroEstadoSalida === est;
                const etiqueta =
                  est === "todos"
                    ? "Todos"
                    : `${estadoSalidaMeta[est].icono} ${estadoSalidaMeta[est].etiqueta} (${conteoSalidasPorEstado[est]})`;

                return (
                  <button
                    key={est}
                    type="button"
                    onClick={() => {
                      setFiltroEstadoSalida(est);
                      if (est !== "todos" && filtroTipoMov !== "salida") {
                        setFiltroTipoMov("salida");
                      }
                    }}
                    className={`btn btn-sm h-8 px-3 text-xs ${
                      activo
                        ? est === "fiado"
                          ? "btn-danger"
                          : est === "ya_pago"
                          ? "btn-secondary"
                          : "btn-primary"
                        : "btn-ghost"
                    }`}
                  >
                    {etiqueta}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {filtroTipoMov === "salida" && (
          <div className="w-full flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-primary-light/40 border border-primary/20 text-xs">
            <span className="font-semibold text-primary flex items-center gap-1.5">
              <span>🛍️</span>
              <span>
                Salidas hoy: {moneda(metricasVentas.totalVentasHoy)} (
                {numero(metricasVentas.articulosVendidosHoy)} artículos)
              </span>
            </span>
            <span className="text-ink-muted">
              Acumulado semana:{" "}
              <strong className="text-ink">{moneda(metricasVentas.totalVentasSemana)}</strong> (
              {numero(metricasVentas.articulosVendidosSemana)} artículos)
            </span>
          </div>
        )}
      </div>

      {/* Tabla con Card reusable */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-secondary-light/60 text-ink-muted font-semibold border-b border-border text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3.5">Fecha</th>
                <th className="px-3 py-3.5">Tipo</th>
                <th className="px-3 py-3.5">Estado</th>
                <th className="px-4 py-3.5">Producto / Cliente</th>
                <th className="px-3 py-3.5 text-right">Cantidad</th>
                <th className="px-4 py-3.5 text-right">Valor salida</th>
                <th className="px-3 py-3.5 text-right">Stock final</th>
                <th className="px-4 py-3.5">Nota / Motivo</th>
                <th className="px-4 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {cargando ? (
                <tr>
                  <td colSpan={9} className="px-5 py-12 text-center text-ink-muted">
                    Cargando movimientos…
                  </td>
                </tr>
              ) : movimientosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-12 text-center space-y-2 text-ink-muted">
                    <p>No hay movimientos o salidas registrados con este filtro.</p>
                    {(filtroTipoMov !== "todos" ||
                      filtroEstadoSalida !== "todos" ||
                      busqueda.trim() !== "") && (
                      <button
                        type="button"
                        onClick={() => {
                          setFiltroTipoMov("todos");
                          setFiltroEstadoSalida("todos");
                          setBusqueda("");
                        }}
                        className="btn btn-ghost btn-sm text-xs"
                      >
                        Limpiar filtros
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                movimientosFiltrados.map((m) => {
                  const meta = tipoMeta[m.tipo];
                  const prod = productoPorId.get(m.producto_id);
                  const esSalida = m.tipo === "salida";
                  const estadoSal = esSalida ? obtenerEstadoSalida(m) : null;
                  const precioUnit = esSalida ? (m.precio_unitario ?? prod?.precio ?? 0) : 0;
                  const totalSalida = esSalida ? m.cantidad * precioUnit : 0;
                  const clienteMostrar =
                    m.cliente_nombre ||
                    (m.nota?.toLowerCase().startsWith("fiado a cliente:")
                      ? m.nota.slice("fiado a cliente:".length).trim()
                      : null);

                  return (
                    <tr
                      key={m.id}
                      className={`hover:bg-secondary-light/30 transition-colors ${
                        estadoSal === "fiado" ? "bg-danger-light/10" : ""
                      }`}
                    >
                      {/* Fecha */}
                      <td className="px-4 py-3.5 text-xs text-ink-muted whitespace-nowrap">
                        {fechaCorta(m.created_at)}
                      </td>

                      {/* Tipo */}
                      <td className="px-3 py-3.5 whitespace-nowrap">
                        <span className={meta.badge}>{meta.etiqueta}</span>
                      </td>

                      {/* Estado (interactivo para salidas: Vendido / Fiado / Ya pago) */}
                      <td className="px-3 py-3.5 whitespace-nowrap">
                        {esSalida && estadoSal ? (
                          <select
                            aria-label="Cambiar estado de la salida"
                            disabled={actualizandoId === m.id}
                            value={estadoSal}
                            onChange={(e) =>
                              void handleCambioRapidoEstado(m, e.target.value as EstadoSalida)
                            }
                            className={`text-xs font-bold rounded-full px-2.5 py-1 border cursor-pointer focus:outline-none transition-colors ${
                              estadoSal === "fiado"
                                ? "bg-danger-light text-danger border-danger/40"
                                : estadoSal === "ya_pago"
                                ? "bg-accent-light text-ink border-accent"
                                : "bg-primary-light text-primary border-primary/30"
                            }`}
                            title="Cambiar estado rápido (Vendido, Fiado o Ya pago)"
                          >
                            <option value="vendido">🛍️ Vendido</option>
                            <option value="fiado">📝 Fiado</option>
                            <option value="ya_pago">✓ Ya pago</option>
                          </select>
                        ) : (
                          <span className="text-xs text-ink-muted">—</span>
                        )}
                      </td>

                      {/* Producto y Cliente */}
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-ink">
                          {prod?.nombre ?? "Producto eliminado"}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-0.5">
                          {prod && (
                            <span className="text-[11px] text-ink-muted font-mono">
                              {prod.sku}
                            </span>
                          )}
                          {clienteMostrar && (
                            <span className="text-[11px] font-medium text-ink bg-secondary-light/70 px-2 py-0.5 rounded-full">
                              👤 {clienteMostrar}
                              {m.cliente_contacto ? ` · ${m.cliente_contacto}` : ""}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Cantidad */}
                      <td className={`px-3 py-3.5 text-right font-bold whitespace-nowrap ${meta.texto}`}>
                        {cantidadTexto(m)}
                      </td>

                      {/* Valor salida */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        {esSalida ? (
                          <div>
                            <div
                              className={`font-serif font-bold text-sm ${
                                estadoSal === "fiado" ? "text-danger" : "text-ink"
                              }`}
                            >
                              {moneda(totalSalida)}
                            </div>
                            <div className="text-[10px] text-ink-muted">
                              {moneda(precioUnit)} c/u
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-ink-muted">—</span>
                        )}
                      </td>

                      {/* Stock resultante */}
                      <td className="px-3 py-3.5 text-right font-mono text-xs font-semibold whitespace-nowrap">
                        {numero(m.stock_resultante)} uds
                      </td>

                      {/* Nota */}
                      <td className="px-4 py-3.5 text-xs text-ink-muted max-w-[200px] truncate" title={m.nota || ""}>
                        {m.nota || "—"}
                      </td>

                      {/* Acciones */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        {esSalida ? (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => abrirModalEditarSalida(m)}
                              className="btn btn-outline btn-sm h-8 px-2.5 text-xs font-semibold"
                              title="Modificar todos los aspectos de esta salida"
                            >
                              ✏️ Editar
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                const nombreProd = prod?.nombre ?? "este producto";
                                if (
                                  confirm(
                                    `¿Deseas eliminar esta salida de ${m.cantidad} uds de "${nombreProd}"? Las unidades se devolverán al stock.`
                                  )
                                ) {
                                  try {
                                    await eliminarSalida(m.id);
                                    avisar("Salida eliminada y stock restaurado");
                                  } catch (err) {
                                    avisar(
                                      err instanceof Error ? err.message : "Error al eliminar",
                                      "error"
                                    );
                                  }
                                }
                              }}
                              className="btn btn-ghost btn-sm h-8 px-2 text-danger hover:bg-danger-light"
                              title="Eliminar salida y devolver stock"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-ink-muted">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
