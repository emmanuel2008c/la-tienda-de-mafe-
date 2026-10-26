"use client";

import { useMemo, useState } from "react";
import { Card, StatCard } from "@/components/ui/Card";
import { fechaCorta, moneda, numero } from "@/lib/inventario/format";
import { useInventario } from "@/lib/inventario/store";
import type { EstadoFiado } from "@/lib/inventario/types";

export default function PaginaClientesFijos() {
  const {
    fiados,
    metricasFiados,
    cargando,
    marcarFiadoPagado,
    eliminarFiado,
    abrirModalFiado,
    avisar,
  } = useInventario();

  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<"todos" | EstadoFiado>("todos");

  const fiadosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return fiados.filter((f) => {
      if (
        q &&
        !f.cliente_nombre.toLowerCase().includes(q) &&
        !f.producto_nombre.toLowerCase().includes(q) &&
        !(f.cliente_contacto && f.cliente_contacto.toLowerCase().includes(q))
      ) {
        return false;
      }
      if (filtroEstado !== "todos" && f.estado !== filtroEstado) {
        return false;
      }
      return true;
    });
  }, [fiados, busqueda, filtroEstado]);

  return (
    <div className="space-y-8">
      {/* Encabezado de la sección */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <span className="eyebrow">Libro de Confianza</span>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-ink">
            Clientes fijos (Cuentas por cobrar)
          </h2>
          <p className="text-xs sm:text-sm text-ink-muted">
            Registro y control de productos entregados a crédito o fiados a clientes habituales.
          </p>
        </div>

        <button
          id="btn-nuevo-fiado"
          type="button"
          onClick={abrirModalFiado}
          className="btn btn-primary btn-sm sm:btn-md"
        >
          + Registrar nuevo fiado
        </button>
      </div>

      {/* Tarjetas de resumen del fiado */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total por cobrar"
          value={moneda(metricasFiados.totalPendiente)}
          description={`${metricasFiados.totalRegistrosPendientes} productos pendientes`}
          badge={metricasFiados.totalPendiente > 0 ? "Saldo activo" : "Al día"}
          tone="danger"
          loading={cargando}
        />

        <StatCard
          title="Clientes con deuda"
          value={numero(metricasFiados.clientesConDeuda)}
          description="Personas con saldo pendiente"
          tone={metricasFiados.clientesConDeuda > 0 ? "warning" : "default"}
          loading={cargando}
        />

        <StatCard
          title="Total fiados registrados"
          value={numero(fiados.length)}
          description="Histórico de créditos"
          tone="default"
          loading={cargando}
        />

        <StatCard
          title="Total recuperado / pagado"
          value={moneda(metricasFiados.totalRecuperado)}
          description="Cuentas ya canceladas"
          tone="primary"
          loading={cargando}
        />
      </div>

      {/* Barra de búsqueda y filtros */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-surface p-4 rounded-xl border border-border shadow-warm-sm">
        <div className="flex-1 min-w-[220px]">
          <input
            type="search"
            className="input input-pill text-sm h-10"
            placeholder="Buscar por cliente, teléfono o producto…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-ink-muted uppercase mr-1">
            Estado:
          </span>
          {(["todos", "pendiente", "pagado"] as const).map((est) => (
            <button
              key={est}
              type="button"
              onClick={() => setFiltroEstado(est)}
              className={`btn btn-sm ${
                filtroEstado === est
                  ? est === "pendiente"
                    ? "btn-danger"
                    : est === "pagado"
                    ? "btn-primary"
                    : "btn-primary"
                  : "btn-ghost"
              }`}
            >
              {est === "todos"
                ? "Todos"
                : est === "pendiente"
                ? `Pendientes (${metricasFiados.totalRegistrosPendientes})`
                : "Pagados"}
            </button>
          ))}
        </div>
      </div>

      {/* Lista / Tabla de Clientes Fijos */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-secondary-light/60 text-ink-muted font-semibold border-b border-border text-xs uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Fecha</th>
                <th className="px-5 py-3.5">Nombre del cliente</th>
                <th className="px-5 py-3.5">Nombre del producto</th>
                <th className="px-4 py-3.5 text-center">Cantidad</th>
                <th className="px-4 py-3.5 text-right">Valor unitario</th>
                <th className="px-5 py-3.5 text-right">Total fiado</th>
                <th className="px-4 py-3.5 text-center">Estado</th>
                <th className="px-5 py-3.5">Compromiso / Nota</th>
                <th className="px-5 py-3.5 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {cargando ? (
                <tr>
                  <td colSpan={9} className="px-5 py-12 text-center text-ink-muted">
                    Cargando lista de clientes fijos…
                  </td>
                </tr>
              ) : fiadosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-12 text-center space-y-3">
                    <p className="font-serif text-lg text-ink">
                      {filtroEstado === "pendiente"
                        ? "¡Al día! No tienes productos fiados pendientes por cobrar."
                        : "No se encontraron registros de clientes fijos con este filtro."}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setBusqueda("");
                        setFiltroEstado("todos");
                      }}
                      className="btn btn-ghost btn-sm"
                    >
                      Limpiar filtros
                    </button>
                  </td>
                </tr>
              ) : (
                fiadosFiltrados.map((item, index) => {
                  const esPendiente = item.estado === "pendiente";

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-secondary-light/30 transition-colors ${
                        esPendiente ? "bg-danger-light/10" : ""
                      }`}
                    >
                      {/* Fecha y # */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="text-xs font-semibold text-ink">
                          {fechaCorta(item.created_at)}
                        </div>
                        <span className="text-[10px] text-ink-muted font-mono">
                          #{index + 1}
                        </span>
                      </td>

                      {/* Nombre del cliente */}
                      <td className="px-5 py-4">
                        <div className="font-bold text-ink">{item.cliente_nombre}</div>
                        {item.cliente_contacto && (
                          <div className="text-xs text-ink-muted flex items-center gap-1">
                            <span>📞 {item.cliente_contacto}</span>
                          </div>
                        )}
                      </td>

                      {/* Nombre del producto */}
                      <td className="px-5 py-4">
                        <div className="font-semibold text-ink">{item.producto_nombre}</div>
                        {item.producto_id && (
                          <span className="badge badge-accent text-[10px] py-0 px-1.5">
                            Del inventario
                          </span>
                        )}
                      </td>

                      {/* Cantidad de productos */}
                      <td className="px-4 py-4 text-center">
                        <span className="inline-block px-2.5 py-1 rounded-md bg-secondary-light font-bold text-ink text-xs">
                          {numero(item.cantidad)} uds
                        </span>
                      </td>

                      {/* Valor unitario del producto */}
                      <td className="px-4 py-4 text-right text-xs text-ink-muted">
                        {moneda(item.valor_unitario)}
                      </td>

                      {/* Valor total fiado */}
                      <td className="px-5 py-4 text-right">
                        <span
                          className={`font-serif text-base font-bold ${
                            esPendiente ? "text-danger" : "text-primary"
                          }`}
                        >
                          {moneda(item.valor_total)}
                        </span>
                      </td>

                      {/* Estado */}
                      <td className="px-4 py-4 text-center whitespace-nowrap">
                        {esPendiente ? (
                          <span className="badge badge-danger badge-dot">
                            Por cobrar
                          </span>
                        ) : (
                          <div className="space-y-0.5">
                            <span className="badge badge-primary badge-dot">
                              Pagado
                            </span>
                            {item.pagado_at && (
                              <div className="text-[10px] text-ink-muted">
                                {fechaCorta(item.pagado_at)}
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Nota / Compromiso */}
                      <td className="px-5 py-4 text-xs text-ink-muted max-w-xs">
                        {item.nota || "—"}
                      </td>

                      {/* Acciones */}
                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {esPendiente && (
                            <button
                              type="button"
                              onClick={async () => {
                                if (
                                  confirm(
                                    `¿Confirmar que ${item.cliente_nombre} canceló la deuda de ${moneda(
                                      item.valor_total
                                    )}?`
                                  )
                                ) {
                                  try {
                                    await marcarFiadoPagado(item.id);
                                    avisar(
                                      `Deuda de ${item.cliente_nombre} marcada como pagada`
                                    );
                                  } catch (e) {
                                    avisar(
                                      e instanceof Error ? e.message : "Error al actualizar",
                                      "error"
                                    );
                                  }
                                }
                              }}
                              className="btn btn-primary btn-sm h-8 px-2.5 text-xs"
                              title="Marcar deuda como cancelada"
                            >
                              ✓ Saldar
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={async () => {
                              if (
                                confirm(
                                  `¿Deseas eliminar este registro de fiado de "${item.cliente_nombre}"?`
                                )
                              ) {
                                try {
                                  await eliminarFiado(item.id);
                                  avisar("Registro de fiado eliminado");
                                } catch (e) {
                                  avisar(
                                    e instanceof Error ? e.message : "Error al eliminar",
                                    "error"
                                  );
                                }
                              }
                            }}
                            className="btn btn-ghost btn-sm h-8 px-2 text-danger hover:bg-danger-light"
                            title="Eliminar registro"
                          >
                            ✕
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
