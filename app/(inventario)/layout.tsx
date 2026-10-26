"use client";

import { HeaderInventario } from "@/components/inventario/Header";
import { KpiCards } from "@/components/inventario/KpiCards";
import { ModalGlobalContainer } from "@/components/inventario/ModalGlobalContainer";
import { NavTabs } from "@/components/inventario/NavTabs";
import { useInventario } from "@/lib/inventario/store";

export default function InventarioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { error } = useInventario();

  return (
    <div className="min-h-screen bg-background text-ink flex flex-col">
      {/* 1. Cabecera boutique persistente */}
      <HeaderInventario />

      {/* 2. Cuerpo con layout anidado */}
      <main className="mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8 flex-1">
        {/* Banner de estado de conexión si aplica */}
        {error && (
          <div className="p-3.5 rounded-xl border border-warning/40 bg-amber-50/80 text-amber-900 flex items-center justify-between gap-4 text-xs shadow-warm-xs">
            <div className="flex items-center gap-2">
              <span className="text-base">💡</span>
              <p>
                <strong>Aviso:</strong> {error}
              </p>
            </div>
          </div>
        )}

        {/* 3. Tarjetas de resumen (KPIs) separadas y persistentes */}
        <KpiCards />

        {/* 4. Barra de pestañas anidadas (Resumen, Productos, Movimientos, Alertas) */}
        <NavTabs />

        {/* 5. Vista secundaria específica enrutada */}
        <section className="pt-2">{children}</section>
      </main>

      {/* 6. Despachador global de modales (abiertos desde cualquier vista) */}
      <ModalGlobalContainer />

      {/* 7. Pie de página boutique */}
      <footer className="border-t border-border mt-12 py-6 text-center text-xs text-ink-muted">
        你好 · Sistema de inventario artesanal y boutique · 2026
      </footer>
    </div>
  );
}
