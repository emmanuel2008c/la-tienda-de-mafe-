"use client";

import { TablaMovimientos } from "@/components/inventario/TablaMovimientos";

export default function PaginaMovimientos() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
        <div>
          <span className="eyebrow">Historial y Auditoría</span>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-ink">
            Historial de movimientos de stock
          </h2>
          <p className="text-xs text-ink-muted">
            Registro cronológico de entradas de mercancía, salidas por venta y ajustes por conteo físico.
          </p>
        </div>
      </div>

      <TablaMovimientos />
    </div>
  );
}
