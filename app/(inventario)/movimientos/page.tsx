"use client";

import { TablaMovimientos } from "@/components/inventario/TablaMovimientos";

export default function PaginaMovimientos() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
        <div>
          <span className="eyebrow">Salidas, Entradas y Auditoría</span>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-ink">
            Gestión de salidas e historial de movimientos
          </h2>
          <p className="text-xs text-ink-muted">
            Consulta y modifica cualquier salida registrada (producto, cantidad, precio, cliente, fecha, nota y estado: Vendido, Fiado o Ya pago).
          </p>
        </div>
      </div>

      <TablaMovimientos />
    </div>
  );
}
