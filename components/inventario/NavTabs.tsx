"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useInventario } from "@/lib/inventario/store";

export function NavTabs() {
  const pathname = usePathname();
  const {
    productos,
    movimientos,
    metricas,
    metricasFiados,
    categoriasDetalle,
    abrirModalCategoria,
  } = useInventario();

  const links = [
    {
      href: "/",
      label: "Resumen general",
      badge: null,
      alerta: false,
    },
    {
      href: "/productos",
      label: "Catálogo de productos",
      badge: productos.length,
      alerta: false,
    },
    {
      href: "/clientes-fijos",
      label: "Clientes fijos (Fiados)",
      badge: metricasFiados.totalRegistrosPendientes > 0 ? metricasFiados.totalRegistrosPendientes : null,
      alerta: metricasFiados.totalRegistrosPendientes > 0,
      badgeColor: "badge-danger",
    },
    {
      href: "/movimientos",
      label: "Salidas y movimientos",
      badge: movimientos.length,
      alerta: false,
    },
    {
      href: "/alertas",
      label: "Alertas de reposición",
      badge: metricas.totalAlertas > 0 ? metricas.totalAlertas : null,
      alerta: metricas.totalAlertas > 0,
      badgeColor: "badge-warning",
    },
  ];

  return (
    <nav className="border-b border-border flex items-center gap-2 sm:gap-6 text-sm font-semibold overflow-x-auto">
      {links.map((item) => {
        const activo = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`pb-3 -mb-px flex items-center gap-2 border-b-2 whitespace-nowrap transition-colors ${
              activo
                ? item.badgeColor === "badge-danger"
                  ? "border-danger text-danger font-bold"
                  : item.alerta
                  ? "border-warning text-warning font-bold"
                  : "border-primary text-primary font-bold"
                : "border-transparent text-ink-muted hover:text-ink"
            }`}
          >
            {item.label}
            {item.badge !== null && (
              <span
                className={`badge text-[11px] py-0.5 px-2 ${
                  item.badgeColor ? item.badgeColor : item.alerta ? "badge-warning" : ""
                }`}
              >
                {item.badge}
              </span>
            )}
          </Link>
        );
      })}

      {/* Acceso directo a Categorías */}
      <button
        type="button"
        onClick={() => abrirModalCategoria()}
        className="pb-3 -mb-px flex items-center gap-1.5 border-b-2 border-transparent text-ink-muted hover:text-ink hover:border-border whitespace-nowrap transition-colors sm:ml-auto text-xs"
        title="Gestionar y agregar categorías"
      >
        <span>🏷️ Categorías</span>
        <span className="badge badge-accent text-[10px] py-0 px-1.5">
          {categoriasDetalle.length}
        </span>
      </button>
    </nav>
  );
}
