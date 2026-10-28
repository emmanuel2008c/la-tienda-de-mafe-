export type TipoMovimiento = "entrada" | "salida" | "ajuste";

export type EstadoSalida = "vendido" | "fiado" | "ya_pago";

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
  /** Detalles específicos de salidas (ventas, fiados y pagos) */
  estado_salida?: EstadoSalida;
  precio_unitario?: number;
  cliente_nombre?: string | null;
  cliente_contacto?: string | null;
  fiado_id?: string | null;
}

export interface NuevoMovimiento {
  producto_id: string;
  tipo: TipoMovimiento;
  cantidad: number;
  nota?: string;
  estado_salida?: EstadoSalida;
  precio_unitario?: number;
  cliente_nombre?: string;
  cliente_contacto?: string;
  created_at?: string;
  fiado_id?: string;
  omitirSyncFiado?: boolean;
}

export interface CambiosSalida {
  producto_id: string;
  cantidad: number;
  precio_unitario: number;
  estado_salida: EstadoSalida;
  cliente_nombre?: string;
  cliente_contacto?: string;
  nota?: string;
  created_at?: string;
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
