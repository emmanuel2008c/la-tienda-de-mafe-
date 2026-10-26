"use client";

import { TablaProductos } from "@/components/inventario/TablaProductos";

export default function PaginaProductos() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
        <div>
          <span className="eyebrow">Inventario</span>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-ink">
            Catálogo completo de productos
          </h2>
          <p className="text-xs text-ink-muted">
            Gestiona precios, costos, referencias SKU y niveles de stock de cada artículo.
          </p>
        </div>
      </div>

      <TablaProductos />
    </div>
  );
}
