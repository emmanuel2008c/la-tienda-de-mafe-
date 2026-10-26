"use client";

import { StatCard } from "@/components/ui/Card";
import { moneda, numero } from "@/lib/inventario/format";
import { useInventario } from "@/lib/inventario/store";

export function KpiCards() {
  const { metricas, metricasVentas, cargando } = useInventario();

  return (
    <section aria-label="Tarjetas de resumen de inventario y ventas">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Ventas de Hoy (Día) */}
        <StatCard
          title="Ventas de hoy"
          value={cargando ? "—" : moneda(metricasVentas.totalVentasHoy)}
          description={
            <span className="flex items-center gap-1 font-medium text-ink">
              <span>📦</span>
              <span>{numero(metricasVentas.articulosVendidosHoy)} artículos vendidos</span>
            </span>
          }
          badge={
            metricasVentas.articulosVendidosHoy > 0
              ? `${metricasVentas.articulosVendidosHoy} hoy`
              : undefined
          }
          href="/movimientos"
          tone="primary"
          loading={cargando}
        />

        {/* Ventas de la Semana */}
        <StatCard
          title="Ventas de la semana"
          value={cargando ? "—" : moneda(metricasVentas.totalVentasSemana)}
          description={
            <span className="flex items-center gap-1 font-medium text-ink">
              <span>📅</span>
              <span>{numero(metricasVentas.articulosVendidosSemana)} artículos en semana</span>
            </span>
          }
          badge={
            metricasVentas.articulosVendidosSemana > 0
              ? `${metricasVentas.articulosVendidosSemana} semana`
              : undefined
          }
          href="/movimientos"
          tone="accent"
          loading={cargando}
        />

        {/* Total productos en inventario */}
        <StatCard
          title="Total productos"
          value={numero(metricas.totalSkus)}
          description={`Valor stock: ${cargando ? "—" : moneda(metricas.valorVenta)}`}
          href="/productos"
          tone="default"
          loading={cargando}
        />

        {/* Alertas de stock */}
        <StatCard
          title="Alertas de stock"
          value={numero(metricas.totalAlertas)}
          description={`${metricas.agotados} agotados · ${metricas.bajos} stock bajo`}
          badge={metricas.totalAlertas > 0 ? "Atención" : undefined}
          href="/alertas"
          tone="warning"
          loading={cargando}
        />
      </div>
    </section>
  );
}
