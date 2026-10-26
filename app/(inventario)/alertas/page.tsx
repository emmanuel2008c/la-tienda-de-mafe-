"use client";

import { TablaProductos } from "@/components/inventario/TablaProductos";
import { useInventario } from "@/lib/inventario/store";

export default function PaginaAlertas() {
  const { metricas } = useInventario();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="eyebrow">Reposición Crítica</span>
            {metricas.totalAlertas > 0 && (
              <span className="badge badge-warning text-[10px]">
                {metricas.totalAlertas} {metricas.totalAlertas === 1 ? "artículo" : "artículos"}
              </span>
            )}
          </div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-ink">
            Alertas de stock mínimo y agotados
          </h2>
          <p className="text-xs text-ink-muted">
            Artículos cuyas existencias actuales han caído por debajo o igual al stock mínimo configurado.
          </p>
        </div>
      </div>

      {/* Renderiza únicamente los productos que requieren reposición */}
      <TablaProductos soloAlertas={true} />
    </div>
  );
}
