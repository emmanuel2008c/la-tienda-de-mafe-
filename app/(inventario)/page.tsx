"use client";

import Link from "next/link";
import { TablaMovimientos } from "@/components/inventario/TablaMovimientos";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { moneda, numero } from "@/lib/inventario/format";
import { useInventario } from "@/lib/inventario/store";

export default function PaginaResumenDashboard() {
  const {
    productos,
    categorias,
    categoriasDetalle,
    metricas,
    metricasFiados,
    abrirModalProducto,
    abrirModalMovimiento,
    abrirModalFiado,
    abrirModalCategoria,
  } = useInventario();

  // Desglose por categorías con iconos y detalles
  const resumenCategorias = categoriasDetalle.map((cat) => {
    const prods = productos.filter(
      (p) => p.categoria.toLowerCase() === cat.nombre.toLowerCase()
    );
    const unidades = prods.reduce((sum, p) => sum + p.stock, 0);
    const valor = prods.reduce((sum, p) => sum + p.stock * p.precio, 0);
    return {
      categoria: cat.nombre,
      icono: cat.icono || "🏷️",
      descripcion: cat.descripcion,
      color: cat.color,
      totalProds: prods.length,
      unidades,
      valor,
    };
  });

  return (
    <div className="space-y-8">
      {/* Banner de bienvenida y accesos rápidos usando Card reusable */}
      <Card variant="soft" className="border-border">
        <CardBody className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="eyebrow">Panel de Control</span>
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-ink">
              Bienvenida al inventario de 你好
            </h2>
            <p className="text-xs sm:text-sm text-ink-muted">
              Monitorea existencias, reposiciones críticas, movimientos diarios y productos fiados.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={abrirModalFiado}
              className="btn btn-outline btn-sm"
              title="Registrar producto fiado a cliente"
            >
              📝 Registrar fiado
            </button>
            <button
              id="btn-page-movimiento"
              type="button"
              onClick={() => abrirModalMovimiento(productos[0]?.id ?? "")}
              className="btn btn-outline btn-sm"
              title="Registrar entrada, salida o ajuste de stock"
            >
              ⇅ Registrar movimiento
            </button>
            <button
              type="button"
              onClick={() => abrirModalProducto("nuevo")}
              className="btn btn-primary btn-sm"
            >
              + Añadir artículo
            </button>
          </div>
        </CardBody>
      </Card>

      {/* Grid de 2 columnas: Desglose por categorías y Alertas críticas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna 1 y 2: Distribución por categoría usando Card */}
        <Card className="lg:col-span-2">
          <CardBody className="space-y-4">
            <CardHeader
              eyebrow="Distribución"
              title="Inventario por categoría"
              action={
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => abrirModalCategoria()}
                    className="btn btn-outline btn-xs px-2.5 h-7 text-xs font-semibold"
                    title="Crear o administrar categorías"
                  >
                    + Categoría
                  </button>
                  <Link
                    href="/productos"
                    className="text-xs text-primary font-semibold hover:underline"
                  >
                    Ver catálogo ({productos.length}) →
                  </Link>
                </div>
              }
            />

            {resumenCategorias.length === 0 ? (
              <div className="p-8 text-center rounded-xl bg-secondary-light/30 border border-dashed border-border space-y-3">
                <span className="text-3xl block">🏷️</span>
                <div className="space-y-1">
                  <h4 className="font-serif font-bold text-ink text-sm">
                    No hay categorías creadas aún
                  </h4>
                  <p className="text-xs text-ink-muted max-w-sm mx-auto">
                    Crea tus propias categorías desde cero para clasificar y organizar tus artículos según tu gusto.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => abrirModalCategoria()}
                  className="btn btn-primary btn-sm"
                >
                  + Crear primera categoría
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {resumenCategorias.map((cat) => (
                  <Card
                    key={cat.categoria}
                    variant="default"
                    className="p-3.5 hover:shadow-warm-sm transition-shadow space-y-2 group"
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xl p-1 bg-surface rounded-md border border-border shadow-xs">
                          {cat.icono}
                        </span>
                        <span className="font-semibold text-sm text-ink truncate">
                          {cat.categoria}
                        </span>
                      </div>
                      <span
                        className={`badge text-[10px] ${
                          cat.totalProds === 0
                            ? "bg-secondary-light/80 text-ink-muted border border-border"
                            : "badge-accent"
                        }`}
                      >
                        {cat.totalProds} {cat.totalProds === 1 ? "ref" : "refs"}
                      </span>
                    </div>
                    <div className="flex justify-between items-baseline text-xs text-ink-muted pt-0.5">
                      <span>{numero(cat.unidades)} unidades</span>
                      <span className="font-semibold text-primary">{moneda(cat.valor)}</span>
                    </div>
                    {cat.totalProds === 0 && (
                      <button
                        type="button"
                        onClick={() => abrirModalProducto("nuevo", cat.categoria)}
                        className="text-[11px] text-primary hover:underline font-semibold block pt-0.5"
                      >
                        + Añadir primer artículo →
                      </button>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Columna 3: Tarjeta de estado de alertas */}
        <Card
          variant={metricas.totalAlertas > 0 ? "warning" : "default"}
          className="flex flex-col justify-between"
        >
          <CardBody className="space-y-4 flex flex-col justify-between h-full">
            <div className="space-y-3">
              <CardHeader
                eyebrow="Monitoreo"
                title="Salud del stock"
                action={
                  metricas.totalAlertas > 0 ? (
                    <span className="badge badge-warning text-[10px]">Atención</span>
                  ) : (
                    <span className="badge badge-primary text-[10px]">Al día</span>
                  )
                }
              />

              <p className="text-xs text-ink-muted">
                {metricas.totalAlertas > 0
                  ? `Tienes ${metricas.totalAlertas} productos que requieren reposición inmediata para evitar quiebres de stock.`
                  : "Todos los productos del catálogo cuentan con stock suficiente por encima del mínimo configurado."}
              </p>

              <div className="space-y-2 pt-2">
                <div className="flex justify-between text-xs p-2.5 rounded-lg bg-secondary-light/60">
                  <span className="text-ink-muted">Productos agotados:</span>
                  <span className="font-bold text-danger">{metricas.agotados}</span>
                </div>
                <div className="flex justify-between text-xs p-2.5 rounded-lg bg-secondary-light/60">
                  <span className="text-ink-muted">Productos con stock bajo:</span>
                  <span className="font-bold text-warning">{metricas.bajos}</span>
                </div>
                {metricasFiados.totalPendiente > 0 && (
                  <Link
                    href="/clientes-fijos"
                    className="flex justify-between text-xs p-2.5 rounded-lg bg-danger-light/50 border border-danger/30 hover:bg-danger-light transition-colors"
                  >
                    <span className="text-danger font-medium">Deudas por cobrar:</span>
                    <span className="font-bold text-danger">
                      {moneda(metricasFiados.totalPendiente)}
                    </span>
                  </Link>
                )}
              </div>
            </div>

            <Link
              href="/alertas"
              className="btn btn-outline btn-sm w-full text-center mt-4"
            >
              Revisar alertas de reposición →
            </Link>
          </CardBody>
        </Card>
      </div>

      {/* Últimos movimientos registrados */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="eyebrow">Auditoría reciente</span>
            <h3 className="text-xl font-serif font-bold text-ink">
              Últimas transacciones
            </h3>
          </div>
          <Link href="/movimientos" className="text-xs text-primary font-semibold hover:underline">
            Ver todas las transacciones →
          </Link>
        </div>

        {/* Muestra los 5 más recientes */}
        <TablaMovimientos limite={5} />
      </div>
    </div>
  );
}
