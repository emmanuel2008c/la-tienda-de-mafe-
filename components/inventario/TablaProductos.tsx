"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { estadoMeta, estadoStock, moneda, numero } from "@/lib/inventario/format";
import { useInventario } from "@/lib/inventario/store";
import { ProductoCard } from "./ProductoCard";

type FiltroEstado = "todos" | "ok" | "bajo" | "agotado";
type ModoVista = "tabla" | "tarjetas";

export function TablaProductos({ soloAlertas = false }: { soloAlertas?: boolean }) {
  const {
    productos,
    categorias,
    cargando,
    abrirModalProducto,
    abrirModalMovimiento,
    abrirModalCategoria,
    eliminarProducto,
    avisar,
  } = useInventario();

  const [busqueda, setBusqueda] = useState("");
  const [categoriaSel, setCategoriaSel] = useState<string>("todas");
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>("todos");
  const [modoVista, setModoVista] = useState<ModoVista>(soloAlertas ? "tarjetas" : "tabla");

  const productosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return productos.filter((p) => {
      if (q && !p.nombre.toLowerCase().includes(q) && !p.sku.toLowerCase().includes(q)) {
        return false;
      }
      if (categoriaSel !== "todas" && p.categoria !== categoriaSel) {
        return false;
      }
      const st = estadoStock(p);
      if (filtroEstado !== "todos" && st !== filtroEstado) {
        return false;
      }
      if (soloAlertas && st === "ok") {
        return false;
      }
      return true;
    });
  }, [productos, busqueda, categoriaSel, filtroEstado, soloAlertas]);

  return (
    <div className="space-y-4">
      {/* Barra de búsqueda y filtros */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-surface p-4 rounded-xl border border-border shadow-warm-sm">
        <div className="flex-1 min-w-[220px]">
          <input
            type="search"
            className="input input-pill text-sm h-10"
            placeholder="Buscar por nombre o SKU…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Filtro categoría con botón directo de agregar */}
          <div className="inline-flex items-center gap-1.5">
            <select
              className="select text-sm h-10"
              value={categoriaSel}
              onChange={(e) => setCategoriaSel(e.target.value)}
            >
              <option value="todas">Todas las categorías</option>
              {categorias.map((catNombre) => (
                <option key={catNombre} value={catNombre}>
                  {catNombre}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => abrirModalCategoria()}
              className="btn btn-outline btn-sm h-10 px-2.5 text-xs whitespace-nowrap"
              title="Agregar o gestionar categorías de inventario"
            >
              + Categoría
            </button>
          </div>

          {/* Filtro estado (cuando no está forzado a soloAlertas) */}
          {!soloAlertas && (
            <select
              className="select text-sm h-10"
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value as FiltroEstado)}
            >
              <option value="todos">Todos los estados</option>
              <option value="ok">Disponibles</option>
              <option value="bajo">Stock bajo</option>
              <option value="agotado">Agotados</option>
            </select>
          )}

          {/* Selector de vista: Tarjetas o Tabla */}
          <div className="inline-flex rounded-lg border border-border p-0.5 bg-background">
            <button
              type="button"
              onClick={() => setModoVista("tarjetas")}
              title="Vista en tarjetas"
              className={`px-2.5 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                modoVista === "tarjetas"
                  ? "bg-surface text-ink shadow-warm-sm"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              ▦ Tarjetas
            </button>
            <button
              type="button"
              onClick={() => setModoVista("tabla")}
              title="Vista en tabla"
              className={`px-2.5 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                modoVista === "tabla"
                  ? "bg-surface text-ink shadow-warm-sm"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              ▤ Tabla
            </button>
          </div>

          <button
            type="button"
            onClick={() => abrirModalProducto("nuevo")}
            className="btn btn-primary btn-sm h-10"
          >
            + Añadir producto
          </button>
        </div>
      </div>

      {/* Contenido según el modo de vista */}
      {cargando ? (
        <Card className="p-12 text-center text-ink-muted">
          Cargando catálogo…
        </Card>
      ) : productosFiltrados.length === 0 ? (
        <Card className="p-12 text-center space-y-4">
          <div className="space-y-1">
            <p className="font-serif text-lg text-ink">
              {soloAlertas
                ? "¡Excelente! No hay productos en estado de alerta actualmente."
                : categoriaSel !== "todas"
                ? `La categoría "${categoriaSel}" aún no tiene productos registrados.`
                : "No hay productos que coincidan con la búsqueda."}
            </p>
            {categoriaSel !== "todas" && (
              <p className="text-xs text-ink-muted">
                ¡Puedes empezar agregando el primer artículo para que forme parte de esta categoría!
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {categoriaSel !== "todas" && (
              <button
                type="button"
                onClick={() => abrirModalProducto("nuevo", categoriaSel)}
                className="btn btn-primary btn-sm"
              >
                + Añadir primer producto a {categoriaSel}
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setBusqueda("");
                setCategoriaSel("todas");
                setFiltroEstado("todos");
              }}
              className="btn btn-ghost btn-sm"
            >
              Limpiar filtros
            </button>
          </div>
        </Card>
      ) : modoVista === "tarjetas" ? (
        /* ================= VISTA EN CUADRÍCULA DE TARJETAS ================= */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {productosFiltrados.map((p) => (
            <ProductoCard key={p.id} producto={p} />
          ))}
        </div>
      ) : (
        /* ================= VISTA EN TABLA ================= */
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-secondary-light/60 text-ink-muted font-semibold border-b border-border text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Producto</th>
                  <th className="px-4 py-3.5">Categoría</th>
                  <th className="px-4 py-3.5 text-right">Precio venta</th>
                  <th className="px-4 py-3.5 text-right">Costo</th>
                  <th className="px-4 py-3.5 w-44">Nivel de stock</th>
                  <th className="px-4 py-3.5 text-center">Estado</th>
                  <th className="px-5 py-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {productosFiltrados.map((p) => {
                  const st = estadoStock(p);
                  const meta = estadoMeta[st];
                  const pct =
                    p.stock_minimo > 0
                      ? Math.min(100, Math.round((p.stock / (p.stock_minimo * 2)) * 100))
                      : p.stock > 0
                      ? 100
                      : 0;

                  return (
                    <tr key={p.id} className="hover:bg-secondary-light/30 transition-colors">
                      <td className="px-5 py-4">
                        <div className="font-semibold text-ink">{p.nombre}</div>
                        <div className="text-xs text-ink-muted font-mono">{p.sku}</div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="badge badge-accent text-[11px] font-normal">
                          {p.categoria}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right font-semibold text-ink">
                        {moneda(p.precio)}
                      </td>
                      <td className="px-4 py-4 text-right text-ink-muted text-xs">
                        {moneda(p.costo)}
                      </td>
                      <td className="px-4 py-4">
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs font-semibold">
                            <span>{numero(p.stock)} uds</span>
                            <span className="text-ink-muted font-normal">
                              mín. {p.stock_minimo}
                            </span>
                          </div>
                          <div className={meta.barra}>
                            <div className="progress-fill" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className={meta.badge}>{meta.etiqueta}</span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => abrirModalMovimiento(p.id)}
                            title="Mover stock (+/-)"
                            className="btn btn-outline btn-sm h-8 px-2.5 text-xs"
                          >
                            ⇅ Stock
                          </button>
                          <button
                            type="button"
                            onClick={() => abrirModalProducto(p)}
                            title="Editar producto"
                            className="btn btn-ghost btn-sm h-8 px-2.5 text-xs"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              if (
                                confirm(
                                  `¿Deseas eliminar "${p.nombre}"? Se borrará también su historial.`
                                )
                              ) {
                                try {
                                  await eliminarProducto(p.id);
                                  avisar("Producto eliminado");
                                } catch (e) {
                                  avisar(
                                    e instanceof Error ? e.message : "Error al eliminar",
                                    "error"
                                  );
                                }
                              }
                            }}
                            title="Eliminar producto"
                            className="btn btn-ghost btn-sm h-8 px-2 text-danger hover:bg-danger-light"
                          >
                            ✕
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
