export type TipoMovimiento = "entrada" | "salida" | "ajuste";

export interface Producto {
  id: string;
  nombre: string;
  sku: string;
  categoria: string;
  precio: number;
  costo: number;
  stock: number;
  stock_minimo: number;
  created_at: string;
}

export type NuevoProducto = Omit<Producto, "id" | "created_at">;

export interface Movimiento {
  id: string;
  producto_id: string;
  tipo: TipoMovimiento;
  /** Entrada/salida: unidades movidas. Ajuste: nuevo stock contado. */
  cantidad: number;
  stock_resultante: number;
  nota: string | null;
  created_at: string;
}

export interface NuevoMovimiento {
  producto_id: string;
  tipo: TipoMovimiento;
  cantidad: number;
  nota?: string;
}

export type EstadoFiado = "pendiente" | "pagado";

export interface RegistroFiado {
  id: string;
  cliente_nombre: string;
  cliente_contacto?: string;
  producto_id?: string;
  producto_nombre: string;
  cantidad: number;
  valor_unitario: number;
  valor_total: number;
  estado: EstadoFiado;
  created_at: string;
  pagado_at?: string;
  nota?: string;
}

export type NuevoRegistroFiado = Omit<RegistroFiado, "id" | "created_at" | "pagado_at"> & {
  descontarStock?: boolean;
};

export interface CategoriaItem {
  id: string;
  nombre: string;
  descripcion?: string;
  icono?: string;
  color?: string;
  created_at: string;
}

export type NuevaCategoria = {
  nombre: string;
  descripcion?: string;
  icono?: string;
  color?: string;
};

