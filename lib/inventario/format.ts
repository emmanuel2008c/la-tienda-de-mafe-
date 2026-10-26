import type { Movimiento, Producto, TipoMovimiento } from "./types";

const fmtMoneda = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});
const fmtNumero = new Intl.NumberFormat("es-CO");
const fmtFecha = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export const moneda = (n: number) => fmtMoneda.format(n);
export const numero = (n: number) => fmtNumero.format(n);
export const fechaCorta = (iso: string) => fmtFecha.format(new Date(iso));

export type EstadoStock = "agotado" | "bajo" | "ok";

export function estadoStock(p: Pick<Producto, "stock" | "stock_minimo">): EstadoStock {
  if (p.stock <= 0) return "agotado";
  if (p.stock <= p.stock_minimo) return "bajo";
  return "ok";
}

// Clases escritas de forma literal para que Tailwind no las elimine.
export const estadoMeta: Record<EstadoStock, { etiqueta: string; badge: string; barra: string }> = {
  ok: { etiqueta: "Disponible", badge: "badge badge-primary badge-dot", barra: "progress" },
  bajo: { etiqueta: "Stock bajo", badge: "badge badge-warning badge-dot", barra: "progress is-bajo" },
  agotado: { etiqueta: "Agotado", badge: "badge badge-danger badge-dot", barra: "progress is-agotado" },
};

export const tipoMeta: Record<
  TipoMovimiento,
  { etiqueta: string; exito: string; badge: string; icono: string; texto: string }
> = {
  entrada: {
    etiqueta: "Entrada",
    exito: "Entrada registrada",
    badge: "badge badge-primary",
    icono: "mov-icon tone-primary",
    texto: "text-primary",
  },
  salida: {
    etiqueta: "Salida",
    exito: "Salida registrada",
    badge: "badge badge-danger",
    icono: "mov-icon tone-danger",
    texto: "text-danger",
  },
  ajuste: {
    etiqueta: "Ajuste",
    exito: "Ajuste registrado",
    badge: "badge badge-accent",
    icono: "mov-icon tone-accent",
    texto: "text-ink-muted",
  },
};

export function cantidadTexto(m: Pick<Movimiento, "tipo" | "cantidad">) {
  if (m.tipo === "entrada") return `+${numero(m.cantidad)}`;
  if (m.tipo === "salida") return `−${numero(m.cantidad)}`;
  return `= ${numero(m.cantidad)}`;
}
