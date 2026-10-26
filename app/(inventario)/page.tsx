"use client";

import { useEffect, useMemo, useState } from "react";
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
    metricasVentas,
    movimientos,
    abrirModalProducto,
    abrirModalMovimiento,
    abrirModalFiado,
    abrirModalCategoria,
  } = useInventario();

  const [montado, setMontado] = useState(false);
  useEffect(() => {
    setMontado(true);
  }, []);

  // Lista detallada de artículos vendidos hoy
  const ventasHoyDetalle = useMemo(() => {
    if (!montado) return [];
    const hoyInicio = new Date();
    hoyInicio.setHours(0, 0, 0, 0);
    const hoyTs = hoyInicio.getTime();

    const prodsMap = new Map(productos.map((p) => [p.id, p]));
    const salidasHoy = movimientos.filter(
      (m) => m.tipo === "salida" && new Date(m.created_at).getTime() >= hoyTs
    );

    return salidasHoy.map((m) => {
      const prod = prodsMap.get(m.producto_id);
      return {
        id: m.id,
        nombre: prod?.nombre ?? "Producto",
        categoria: prod?.categoria ?? "General",
        cantidad: m.cantidad,
        precioUnitario: prod?.precio ?? 0,
        subtotal: m.cantidad * (prod?.precio ?? 0),
        nota: m.nota,
        hora: new Date(m.created_at).toLocaleTimeString("es-CO", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
    });
  }, [montado, movimientos, productos]);

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

      {/* Tarjeta destacada de Ventas del Día y de la Semana */}
      <Card className="border-border shadow-warm-xs overflow-hidden">
        <CardBody className="space-y-4">
          <CardHeader
            eyebrow="Rendimiento Comercial"
            title="Ventas del Día y de la Semana"
            subtitle="Control en vivo de ingresos y sumatoria total de artículos vendidos"
            action={
              <button
                type="button"
                onClick={() => abrirModalMovimiento(productos[0]?.id, "salida")}
                className="btn btn-primary btn-sm flex items-center gap-1.5"
                title="Registrar una venta (salida de stock)"
              >
                <span>−</span>
                <span>Registrar venta</span>
              </button>
            }
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* ☀️ Bloque: Ventas de Hoy */}
            <div className="p-4 rounded-xl bg-primary-light/35 border border-primary/20 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                  <span>☀️</span>
                  <span>Ventas de hoy</span>
                </span>
                <span className="badge badge-primary text-[10px]">
                  {metricasVentas.transaccionesHoy}{" "}
                  {metricasVentas.transaccionesHoy === 1 ? "venta" : "ventas"}
                </span>
              </div>

              <div>
                <div className="text-2xl sm:text-3xl font-bold font-serif text-ink">
                  {moneda(metricasVentas.totalVentasHoy)}
                </div>
                <div className="flex items-center gap-2 text-xs text-ink-muted mt-1">
                  <span className="font-semibold text-primary">
                    📦 {numero(metricasVentas.articulosVendidosHoy)} artículos vendidos
                  </span>
                  <span>•</span>
                  <span>Sumatoria de hoy</span>
                </div>
              </div>

              {ventasHoyDetalle.length > 0 ? (
                <div className="pt-2 border-t border-primary/15 space-y-2">
                  <span className="text-[11px] font-semibold text-ink-muted uppercase block">
                    Artículos vendidos en el día:
                  </span>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {ventasHoyDetalle.map((v) => (
                      <div
                        key={v.id}
                        className="flex items-center justify-between text-xs p-2 rounded-lg bg-surface border border-border"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="font-medium text-ink truncate">{v.nombre}</p>
                          <p className="text-[10px] text-ink-muted">
                            {v.hora} · {v.cantidad} {v.cantidad === 1 ? "unidad" : "unidades"}
                          </p>
                        </div>
                        <span className="font-bold text-primary shrink-0">
                          {moneda(v.subtotal)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-ink-muted italic pt-1">
                  No se han registrado salidas por venta hoy todavía.
                </p>
              )}
            </div>

            {/* 📅 Bloque: Ventas de la Semana */}
            <div className="p-4 rounded-xl bg-secondary-light/60 border border-border space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-ink-muted uppercase tracking-wider flex items-center gap-1.5">
                  <span>📅</span>
                  <span>Ventas de la semana</span>
                </span>
                <span className="badge badge-accent text-[10px]">Semana en curso</span>
              </div>

              <div>
                <div className="text-2xl sm:text-3xl font-bold font-serif text-ink">
                  {moneda(metricasVentas.totalVentasSemana)}
                </div>
                <div className="flex items-center gap-2 text-xs text-ink-muted mt-1">
                  <span className="font-semibold text-ink">
                    📦 {numero(metricasVentas.articulosVendidosSemana)} artículos vendidos
                  </span>
                  <span>•</span>
                  <span>Total acumulado</span>
                </div>
              </div>

              <div className="pt-2 border-t border-border space-y-2 text-xs">
                <div className="flex justify-between items-center text-ink-muted p-2 rounded-lg bg-surface">
                  <span>Total operaciones en la semana:</span>
                  <span className="font-bold text-ink">
                    {metricasVentas.transaccionesSemana}
                  </span>
                </div>
                <div className="flex justify-between items-center text-ink-muted p-2 rounded-lg bg-surface">
                  <span>Promedio por artículo vendido:</span>
                  <span className="font-bold text-ink">
                    {metricasVentas.articulosVendidosSemana > 0
                      ? moneda(
                          Math.round(
                            metricasVentas.totalVentasSemana /
                              metricasVentas.articulosVendidosSemana
                          )
                        )
                      : "$ 0"}
                  </span>
                </div>
              </div>
            </div>
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
