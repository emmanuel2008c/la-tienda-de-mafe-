import type { CategoriaItem, Movimiento, Producto, RegistroFiado } from "./types";

/**
 * Las categorías y el catálogo inician vacíos para que el cliente
 * cree su inventario desde 0 a su propio gusto.
 */
export const CATEGORIAS_POR_DEFECTO: CategoriaItem[] = [];

export function crearDatosDemo(): {
  productos: Producto[];
  movimientos: Movimiento[];
  categorias: string[];
  categoriasItems: CategoriaItem[];
  fiados: RegistroFiado[];
} {
  return {
    productos: [],
    movimientos: [],
    categorias: [],
    categoriasItems: [],
    fiados: [],
  };
}
