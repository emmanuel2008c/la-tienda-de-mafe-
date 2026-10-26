"use client";

import { StatCard } from "@/components/ui/Card";
import { moneda, numero } from "@/lib/inventario/format";
import { useInventario } from "@/lib/inventario/store";

export function KpiCards() {
  const { metricas, movimientos, cargando } = useInventario();

  return (
    <section aria-label="Tarjetas de resumen de inventario">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total productos */}
        <StatCard
          title="Total productos"
          value={numero(metricas.totalSkus)}
          description="Ver catálogo completo"
          href="/productos"
          tone="default"
          loading={cargando}
        />

        {/* Valor en venta */}
        <StatCard
          title="Valor en venta"
          value={moneda(metricas.valorVenta)}
          description={`Costo base: ${cargando ? "—" : moneda(metricas.valorCosto)}`}
          tone="primary"
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

        {/* Movimientos */}
        <StatCard
          title="Movimientos"
          value={numero(movimientos.length)}
          description="Ver historial de transacciones"
          href="/movimientos"
          tone="default"
          loading={cargando}
        />
      </div>
    </section>
  );
}
