"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { cantidadTexto, fechaCorta, moneda, numero, tipoMeta } from "@/lib/inventario/format";
import { useInventario } from "@/lib/inventario/store";
import type { Producto, TipoMovimiento } from "@/lib/inventario/types";

export function TablaMovimientos({ limite }: { limite?: number }) {
  const { movimientos, productos, abrirModalMovimiento, metricasVentas, cargando } = useInventario();
  const [filtroTipoMov, setFiltroTipoMov] = useState<string>("todos");

  const productoPorId = useMemo(() => {
    const map = new Map<string, Producto>();
    for (const p of productos) map.set(p.id, p);
    return map;
  }, [productos]);

  const movimientosFiltrados = useMemo(() => {
    let list = movimientos;
    if (filtroTipoMov !== "todos") {
      list = list.filter((m) => m.tipo === filtroTipoMov);
    }
    if (limite && limite > 0) {
      list = list.slice(0, limite);
    }
    return list;
  }, [movimientos, filtroTipoMov, limite]);

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-surface p-4 rounded-xl border border-border shadow-warm-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-ink-muted uppercase">Filtrar:</span>
          {(["todos", "entrada", "salida", "ajuste"] as const).map((tipo) => (
            <button
              key={tipo}
              type="button"
              onClick={() => setFiltroTipoMov(tipo)}
              className={`btn btn-sm ${filtroTipoMov === tipo ? "btn-primary" : "btn-ghost"}`}
            >
              {tipo === "todos" ? "Todos" : tipoMeta[tipo as TipoMovimiento].etiqueta}
            </button>
          ))}
        </div>

        <button
          id="btn-tabla-movimiento"
          type="button"
          onClick={() => abrirModalMovimiento(productos[0]?.id ?? "")}
          className="btn btn-primary btn-sm flex items-center gap-1.5"
          title="Registrar nuevo movimiento de stock"
        >
          <span>⇅</span>
          <span>Registrar movimiento</span>
        </button>

        {filtroTipoMov === "salida" && (
          <div className="w-full flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-primary-light/40 border border-primary/20 text-xs mt-1">
            <span className="font-semibold text-primary flex items-center gap-1.5">
              <span>🛍️</span>
              <span>
                Vendido hoy: {moneda(metricasVentas.totalVentasHoy)} (
                {numero(metricasVentas.articulosVendidosHoy)} artículos)
              </span>
            </span>
            <span className="text-ink-muted">
              Vendido esta semana:{" "}
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
                <th className="px-5 py-3.5">Fecha</th>
                <th className="px-4 py-3.5">Tipo</th>
                <th className="px-4 py-3.5">Producto</th>
                <th className="px-4 py-3.5 text-right">Cantidad</th>
                <th className="px-4 py-3.5 text-right">Stock resultante</th>
                <th className="px-5 py-3.5">Nota / Motivo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {cargando ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-ink-muted">
                    Cargando movimientos…
                  </td>
                </tr>
              ) : movimientosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-ink-muted">
                    No hay movimientos registrados con este filtro.
                  </td>
                </tr>
              ) : (
                movimientosFiltrados.map((m) => {
                  const meta = tipoMeta[m.tipo];
                  const prod = productoPorId.get(m.producto_id);

                  return (
                    <tr key={m.id} className="hover:bg-secondary-light/30 transition-colors">
                      <td className="px-5 py-3.5 text-xs text-ink-muted whitespace-nowrap">
                        {fechaCorta(m.created_at)}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className={meta.badge}>{meta.etiqueta}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-ink">
                          {prod?.nombre ?? "Producto eliminado"}
                        </div>
                        {prod && (
                          <div className="text-xs text-ink-muted font-mono">{prod.sku}</div>
                        )}
                      </td>
                      <td className={`px-4 py-3.5 text-right font-bold ${meta.texto}`}>
                        {cantidadTexto(m)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-xs font-semibold">
                        {numero(m.stock_resultante)} uds
                      </td>
                      <td className="px-5 py-3.5 text-xs text-ink-muted">
                        {m.nota || "—"}
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
