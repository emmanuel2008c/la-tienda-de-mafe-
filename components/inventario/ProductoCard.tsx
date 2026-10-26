"use client";

import { Card } from "@/components/ui/Card";
import { estadoMeta, estadoStock, moneda, numero } from "@/lib/inventario/format";
import { useInventario } from "@/lib/inventario/store";
import type { Producto } from "@/lib/inventario/types";

export function ProductoCard({ producto }: { producto: Producto }) {
  const { abrirModalProducto, abrirModalMovimiento, eliminarProducto, avisar } = useInventario();

  const st = estadoStock(producto);
  const meta = estadoMeta[st];
  const pct =
    producto.stock_minimo > 0
      ? Math.min(100, Math.round((producto.stock / (producto.stock_minimo * 2)) * 100))
      : producto.stock > 0
      ? 100
      : 0;

  return (
    <Card
      variant={st === "agotado" ? "danger" : st === "bajo" ? "warning" : "default"}
      className="p-5 flex flex-col justify-between space-y-4 hover:shadow-warm transition-all"
    >
      {/* Cabecera de la tarjeta */}
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <span className="badge badge-accent text-[11px]">{producto.categoria}</span>
          <span className={meta.badge}>{meta.etiqueta}</span>
        </div>

        <div>
          <h4 className="font-serif font-bold text-lg text-ink leading-snug">
            {producto.nombre}
          </h4>
          <span className="text-xs font-mono text-ink-muted">{producto.sku}</span>
        </div>
      </div>

      {/* Precios y Costos */}
      <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-secondary-light/40 border border-border text-xs">
        <div>
          <span className="text-ink-muted block text-[10px] uppercase">Precio venta</span>
          <span className="font-bold text-sm text-ink">{moneda(producto.precio)}</span>
        </div>
        <div>
          <span className="text-ink-muted block text-[10px] uppercase">Costo unitario</span>
          <span className="font-medium text-xs text-ink-muted">{moneda(producto.costo)}</span>
        </div>
      </div>

      {/* Barra de progreso de stock */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs font-semibold">
          <span>{numero(producto.stock)} unidades</span>
          <span className="text-ink-muted font-normal text-[11px]">
            Mín. {producto.stock_minimo}
          </span>
        </div>
        <div className={meta.barra}>
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Acciones de la tarjeta */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-border">
        <button
          type="button"
          onClick={() => abrirModalMovimiento(producto.id)}
          className="btn btn-outline btn-sm flex-1 text-xs h-8"
          title="Registrar movimiento (entrada, salida o ajuste)"
        >
          ⇅ Movimiento
        </button>
        <button
          type="button"
          onClick={() => abrirModalProducto(producto)}
          className="btn btn-ghost btn-sm text-xs h-8 px-2.5"
          title="Editar producto"
        >
          Editar
        </button>
        <button
          type="button"
          onClick={async () => {
            if (
              confirm(
                `¿Deseas eliminar "${producto.nombre}"? Se borrará también su historial.`
              )
            ) {
              try {
                await eliminarProducto(producto.id);
                avisar("Producto eliminado");
              } catch (e) {
                avisar(e instanceof Error ? e.message : "Error al eliminar", "error");
              }
            }
          }}
          className="btn btn-ghost btn-sm text-xs h-8 px-2 text-danger hover:bg-danger-light"
          title="Eliminar producto"
        >
          ✕
        </button>
      </div>
    </Card>
  );
}
