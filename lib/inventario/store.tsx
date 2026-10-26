"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { CATEGORIAS_POR_DEFECTO, crearDatosDemo } from "./demo";
import { estadoStock } from "./format";
import type {
  CategoriaItem,
  Movimiento,
  NuevaCategoria,
  NuevoMovimiento,
  NuevoProducto,
  NuevoRegistroFiado,
  Producto,
  RegistroFiado,
  TipoMovimiento,
} from "./types";

/* -------------------------------------------------------------------------- */
/*  Constantes de almacenamiento y configuración                              */
/* -------------------------------------------------------------------------- */

export type ModoDatos = "supabase" | "demo";

export interface MetricasInventario {
  totalSkus: number;
  valorVenta: number;
  valorCosto: number;
  bajos: number;
  agotados: number;
  totalAlertas: number;
}

export interface MetricasFiados {
  totalPendiente: number;
  clientesConDeuda: number;
  totalRegistrosPendientes: number;
  totalRecuperado: number;
}

function supabaseConfigurado() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  return !!url && !!key && !url.includes("TU-PROYECTO") && !key.includes("XXXX");
}

const MODO: ModoDatos = supabaseConfigurado() ? "supabase" : "demo";
const LS_KEY = "tienda:inventario:v3";
const LS_FIADOS_KEY = "tienda:fiados:v3";
const LS_CATS_KEY = "tienda:categorias:v3";
const LS_CATS_RICH_KEY = "tienda:categorias-rich:v3";

const FECHA_DEFAULT = "2026-01-01T00:00:00.000Z";

const nuevoId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

const ordenar = (ps: Producto[]) =>
  [...ps].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

/* -------------------------------------------------------------------------- */
/*  Helpers de serialización y lectura segura en LocalStorage                 */
/* -------------------------------------------------------------------------- */

function guardarProductosYMovimientosLocal(ps: Producto[], ms: Movimiento[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      LS_KEY,
      JSON.stringify({ productos: ps, movimientos: ms, version: 3, guardadoEn: new Date().toISOString() })
    );
  } catch (e) {
    console.error("Error guardando productos en LocalStorage:", e);
  }
}

function guardarFiadosLocal(fs: RegistroFiado[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LS_FIADOS_KEY, JSON.stringify(fs));
  } catch (e) {
    console.error("Error guardando fiados en LocalStorage:", e);
  }
}

function guardarCategoriasLocal(cats: CategoriaItem[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LS_CATS_RICH_KEY, JSON.stringify(cats));
    localStorage.setItem(LS_CATS_KEY, JSON.stringify(cats.map((c) => c.nombre)));
  } catch (e) {
    console.error("Error guardando categorías en LocalStorage:", e);
  }
}

export function leerDatosLocales() {
  if (typeof window === "undefined") {
    return {
      productos: [],
      movimientos: [],
      fiados: [],
      categoriasItems: [],
    };
  }

  try {
    // 1. Productos y Movimientos
    const rawProds = localStorage.getItem(LS_KEY);
    let productos: Producto[] = [];
    let movimientos: Movimiento[] = [];

    if (rawProds) {
      try {
        const parsed = JSON.parse(rawProds);
        if (Array.isArray(parsed)) {
          productos = parsed;
        } else if (parsed && typeof parsed === "object") {
          if (Array.isArray(parsed.productos)) productos = parsed.productos;
          if (Array.isArray(parsed.movimientos)) movimientos = parsed.movimientos;
        }
      } catch (err) {}
    }

    // 2. Fiados
    const rawFiados = localStorage.getItem(LS_FIADOS_KEY);
    let fiados: RegistroFiado[] = [];
    if (rawFiados) {
      try {
        const parsed = JSON.parse(rawFiados);
        if (Array.isArray(parsed)) fiados = parsed;
      } catch {}
    }

    // 3. Categorías detalladas (inician vacías para que el cliente las cree desde 0)
    const rawCats = localStorage.getItem(LS_CATS_RICH_KEY);
    let categoriasItems: CategoriaItem[] = [];
    if (rawCats) {
      try {
        const parsed = JSON.parse(rawCats);
        if (Array.isArray(parsed)) categoriasItems = parsed;
      } catch {}
    }

    return { productos, movimientos, fiados, categoriasItems };
  } catch (e) {
    return {
      productos: [],
      movimientos: [],
      fiados: [],
      categoriasItems: [],
    };
  }
}

/* -------------------------------------------------------------------------- */
/*  Mapeo de filas Supabase a modelos TypeScript                              */
/* -------------------------------------------------------------------------- */

const aProducto = (r: Record<string, unknown>): Producto => ({
  id: String(r.id),
  nombre: String(r.nombre ?? ""),
  sku: String(r.sku ?? ""),
  categoria: String(r.categoria ?? "General"),
  precio: Number(r.precio ?? 0),
  costo: Number(r.costo ?? 0),
  stock: Number(r.stock ?? 0),
  stock_minimo: Number(r.stock_minimo ?? 0),
  created_at: String(r.created_at ?? FECHA_DEFAULT),
});

const aMovimiento = (r: Record<string, unknown>): Movimiento => ({
  id: String(r.id),
  producto_id: String(r.producto_id),
  tipo: r.tipo as Movimiento["tipo"],
  cantidad: Number(r.cantidad ?? 0),
  stock_resultante: Number(r.stock_resultante ?? 0),
  nota: (r.nota as string | null) ?? null,
  created_at: String(r.created_at ?? FECHA_DEFAULT),
});

const aFiado = (r: Record<string, unknown>): RegistroFiado => ({
  id: String(r.id),
  cliente_nombre: String(r.cliente_nombre ?? ""),
  cliente_contacto: (r.cliente_contacto as string) || undefined,
  producto_id: (r.producto_id as string) || undefined,
  producto_nombre: String(r.producto_nombre ?? ""),
  cantidad: Number(r.cantidad ?? 1),
  valor_unitario: Number(r.valor_unitario ?? 0),
  valor_total: Number(r.valor_total ?? 0),
  estado: (r.estado as RegistroFiado["estado"]) || "pendiente",
  created_at: String(r.created_at ?? FECHA_DEFAULT),
  pagado_at: (r.pagado_at as string) || undefined,
  nota: (r.nota as string) || undefined,
});

const aCategoria = (r: Record<string, unknown>): CategoriaItem => ({
  id: String(r.id),
  nombre: String(r.nombre ?? ""),
  descripcion: (r.descripcion as string) || undefined,
  icono: String(r.icono ?? "🏷️"),
  color: String(r.color ?? "primary"),
  created_at: String(r.created_at ?? FECHA_DEFAULT),
});

function mensajeError(e: unknown) {
  if (e instanceof Error) return e.message;
  if (e && typeof e === "object" && "message" in e) return String(e.message);
  return "Ocurrió un error inesperado";
}

/* -------------------------------------------------------------------------- */
/*  Tipos y Contexto de Inventario                                            */
/* -------------------------------------------------------------------------- */

export interface Aviso {
  id: number;
  mensaje: string;
  tipo: "exito" | "error";
}

interface InventarioCtx {
  modo: ModoDatos;
  productos: Producto[];
  movimientos: Movimiento[];
  categorias: string[];
  categoriasDetalle: CategoriaItem[];
  fiados: RegistroFiado[];
  metricas: MetricasInventario;
  metricasFiados: MetricasFiados;
  cargando: boolean;
  error: string | null;
  recargar: () => Promise<void>;
  // Categorías
  crearCategoria: (cat: string | NuevaCategoria) => Promise<CategoriaItem>;
  editarCategoria: (nombreActual: string, cambios: Partial<NuevaCategoria>) => Promise<void>;
  eliminarCategoria: (nombre: string, reasignarA?: string) => Promise<void>;
  // Productos
  crearProducto: (p: NuevoProducto) => Promise<void>;
  actualizarProducto: (id: string, cambios: Partial<NuevoProducto>) => Promise<void>;
  eliminarProducto: (id: string) => Promise<void>;
  registrarMovimiento: (m: NuevoMovimiento) => Promise<void>;
  registrarMovimientoConNuevoProducto: (datos: {
    producto: NuevoProducto;
    tipo: TipoMovimiento;
    cantidad: number;
    nota?: string;
  }) => Promise<void>;
  // Clientes fijos / Fiados
  crearFiado: (f: NuevoRegistroFiado) => Promise<void>;
  marcarFiadoPagado: (id: string) => Promise<void>;
  eliminarFiado: (id: string) => Promise<void>;
  avisar: (mensaje: string, tipo?: Aviso["tipo"]) => void;
  // Respaldos y Migración
  exportarCopiaSeguridad: () => void;
  importarCopiaSeguridad: (contenido: string) => boolean;
  restablecerDatosDemo: () => void;
  // Modales
  modalProducto: Producto | "nuevo" | null;
  categoriaInicialModalProducto: string | undefined;
  abrirModalProducto: (p?: Producto | "nuevo", categoriaPredefinida?: string) => void;
  cerrarModalProducto: () => void;
  modalMovimiento: string | null;
  abrirModalMovimiento: (productoId?: string) => void;
  cerrarModalMovimiento: () => void;
  modalFiado: boolean;
  abrirModalFiado: () => void;
  cerrarModalFiado: () => void;
  modalCategoria: boolean | string;
  abrirModalCategoria: (catParaEditar?: string) => void;
  cerrarModalCategoria: () => void;
}

const Ctx = createContext<InventarioCtx | null>(null);

export function InventarioProvider({ children }: { children: ReactNode }) {
  // Estado inicial determinista idéntico en servidor y cliente para evitar errores de hidratación
  const [productos, setProductos] = useState<Producto[]>(() => crearDatosDemo().productos);
  const [movimientos, setMovimientos] = useState<Movimiento[]>(() => crearDatosDemo().movimientos);
  const [categoriasItems, setCategoriasItems] = useState<CategoriaItem[]>(() => CATEGORIAS_POR_DEFECTO);
  const [fiados, setFiados] = useState<RegistroFiado[]>(() => crearDatosDemo().fiados);

  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avisos, setAvisos] = useState<Aviso[]>([]);

  // Hidratación segura del almacenamiento local del cliente tras el montaje
  useEffect(() => {
    try {
      const guardado = localStorage.getItem(LS_KEY);
      const guardadoFiados = localStorage.getItem(LS_FIADOS_KEY);
      const guardadoCats = localStorage.getItem(LS_CATS_RICH_KEY);

      if (guardado || guardadoFiados || guardadoCats) {
        const locales = leerDatosLocales();
        setProductos(ordenar(locales.productos));
        setMovimientos(locales.movimientos);
        setFiados(locales.fiados);
        setCategoriasItems(locales.categoriasItems);
      }
    } catch (e) {
      console.warn("Aviso al hidratar almacenamiento local:", e);
    }
  }, []);

  // Modales
  const [modalProducto, setModalProducto] = useState<Producto | "nuevo" | null>(null);
  const [categoriaInicialModalProducto, setCategoriaInicialModalProducto] = useState<string | undefined>(undefined);
  const [modalMovimiento, setModalMovimiento] = useState<string | null>(null);
  const [modalFiado, setModalFiado] = useState(false);
  const [modalCategoria, setModalCategoria] = useState<boolean | string>(false);

  const supabaseRef = useRef<SupabaseClient | null>(null);

  const db = useCallback(() => {
    if (!supabaseRef.current) supabaseRef.current = createClient();
    return supabaseRef.current;
  }, []);

  const avisar = useCallback((mensaje: string, tipo: Aviso["tipo"] = "exito") => {
    const id = Date.now() + Math.random();
    setAvisos((a) => [...a, { id, mensaje, tipo }]);
    setTimeout(() => setAvisos((a) => a.filter((x) => x.id !== id)), 3500);
  }, []);

  /* -------------------------------------------------------------------------- */
  /*  Recarga y sincronización inteligente                                     */
  /* -------------------------------------------------------------------------- */
  const recargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      if (MODO === "supabase") {
        const cliente = db();
        const [pRes, mRes, fRes, cRes] = await Promise.all([
          cliente
            .from("productos")
            .select("*")
            .order("nombre")
            .then(
              (r) => r,
              (err) => ({ data: null, error: err })
            ),
          cliente
            .from("movimientos")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(300)
            .then(
              (r) => r,
              (err) => ({ data: null, error: err })
            ),
          cliente
            .from("fiados")
            .select("*")
            .order("created_at", { ascending: false })
            .then(
              (r) => r,
              () => ({ data: [], error: null })
            ),
          cliente
            .from("categorias")
            .select("*")
            .order("nombre")
            .then(
              (r) => r,
              () => ({ data: [], error: null })
            ),
        ]);

        // Si la tabla productos en Supabase falla (por ejemplo esquema no ejecutado), preservar datos locales
        if (pRes.error) {
          const locales = leerDatosLocales();
          setProductos(ordenar(locales.productos));
          setMovimientos(locales.movimientos);
          setFiados(locales.fiados);
          setCategoriasItems(locales.categoriasItems);
          setError(
            "Persistencia local activa: Tus datos se guardan de forma permanente en este navegador. Para sincronizar también en la nube de Supabase, ejecuta 'supabase/schema.sql' en el SQL Editor de tu proyecto."
          );
        } else {
          // Si Supabase responde correctamente con datos
          if (pRes.data && pRes.data.length > 0) {
            const prods = pRes.data.map(aProducto);
            const movs = (mRes.data ?? []).map(aMovimiento);
            setProductos(prods);
            setMovimientos(movs);
            guardarProductosYMovimientosLocal(prods, movs);
          } else {
            // Si Supabase está vacío, conservar los locales para no borrar la sesión previa
            const locales = leerDatosLocales();
            setProductos(ordenar(locales.productos));
            setMovimientos(locales.movimientos);
          }

          if (fRes.data && fRes.data.length > 0) {
            const fiadosCargados = (fRes.data as unknown[]).map((x) =>
              aFiado(x as Record<string, unknown>)
            );
            setFiados(fiadosCargados);
            guardarFiadosLocal(fiadosCargados);
          }

          if (cRes.data && cRes.data.length > 0) {
            const catsCargadas = (cRes.data as unknown[]).map((x) =>
              aCategoria(x as Record<string, unknown>)
            );
            setCategoriasItems(catsCargadas);
            guardarCategoriasLocal(catsCargadas);
          }
        }
      } else {
        const locales = leerDatosLocales();
        setProductos(ordenar(locales.productos));
        setMovimientos(locales.movimientos);
        setFiados(locales.fiados);
        setCategoriasItems(locales.categoriasItems);
      }
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setCargando(false);
    }
  }, [db]);

  useEffect(() => {
    void recargar();
  }, [recargar]);

  /* -------------------------------------------------------------------------- */
  /*  Gestión de Categorías con Persistencia Inmediata                          */
  /* -------------------------------------------------------------------------- */
  const crearCategoria = useCallback(
    async (entrada: string | NuevaCategoria): Promise<CategoriaItem> => {
      const nombre = typeof entrada === "string" ? entrada : entrada.nombre;
      const limpia = nombre.trim();
      if (!limpia) {
        throw new Error("El nombre de la categoría no puede estar vacío");
      }

      const yaExiste = categoriasItems.some(
        (c) => c.nombre.trim().toLowerCase() === limpia.toLowerCase()
      );
      if (yaExiste) {
        throw new Error(`La categoría "${limpia}" ya existe en el catálogo`);
      }

      const icono = typeof entrada === "object" && entrada.icono ? entrada.icono : "🏷️";
      const descripcion = typeof entrada === "object" ? entrada.descripcion?.trim() : undefined;
      const color = typeof entrada === "object" && entrada.color ? entrada.color : "terracota";

      const nuevoRegistro: CategoriaItem = {
        id: nuevoId(),
        nombre: limpia,
        descripcion,
        icono,
        color,
        created_at: new Date().toISOString(),
      };

      // 1. Guardar de inmediato en estado y LocalStorage
      const actualizadas = [...categoriasItems, nuevoRegistro].sort((a, b) =>
        a.nombre.localeCompare(b.nombre, "es")
      );
      setCategoriasItems(actualizadas);
      guardarCategoriasLocal(actualizadas);

      // 2. Intentar sincronizar con Supabase si está activo
      if (MODO === "supabase") {
        try {
          const { data, error: catErr } = await db()
            .from("categorias")
            .insert({
              nombre: limpia,
              descripcion: descripcion || null,
              icono,
              color,
            })
            .select()
            .single();

          if (!catErr && data) {
            nuevoRegistro.id = String(data.id);
          }
        } catch {
          // Si la tabla no está en Supabase, el almacenamiento local ya garantizó la persistencia
        }
      }

      return nuevoRegistro;
    },
    [db, categoriasItems]
  );

  const editarCategoria = useCallback(
    async (nombreActual: string, cambios: Partial<NuevaCategoria>) => {
      const catOriginal = categoriasItems.find(
        (c) => c.nombre.toLowerCase() === nombreActual.toLowerCase()
      );
      if (!catOriginal) throw new Error("Categoría no encontrada");

      const nuevoNombre = cambios.nombre ? cambios.nombre.trim() : catOriginal.nombre;
      if (!nuevoNombre) throw new Error("El nombre de la categoría no puede estar vacío");

      if (
        nuevoNombre.toLowerCase() !== nombreActual.toLowerCase() &&
        categoriasItems.some((c) => c.nombre.toLowerCase() === nuevoNombre.toLowerCase())
      ) {
        throw new Error(`Ya existe otra categoría llamada "${nuevoNombre}"`);
      }

      const itemActualizado: CategoriaItem = {
        ...catOriginal,
        nombre: nuevoNombre,
        descripcion: cambios.descripcion !== undefined ? cambios.descripcion?.trim() : catOriginal.descripcion,
        icono: cambios.icono || catOriginal.icono,
        color: cambios.color || catOriginal.color,
      };

      const cambioNombre = nuevoNombre.toLowerCase() !== nombreActual.toLowerCase();

      // Actualizar categorías en estado y LocalStorage
      const actualizadas = categoriasItems
        .map((c) => (c.nombre.toLowerCase() === nombreActual.toLowerCase() ? itemActualizado : c))
        .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
      setCategoriasItems(actualizadas);
      guardarCategoriasLocal(actualizadas);

      // Si cambió el nombre, actualizar productos asociados
      if (cambioNombre) {
        const prodsActualizados = productos.map((p) =>
          p.categoria.toLowerCase() === nombreActual.toLowerCase()
            ? { ...p, categoria: nuevoNombre }
            : p
        );
        setProductos(prodsActualizados);
        guardarProductosYMovimientosLocal(prodsActualizados, movimientos);
      }

      if (MODO === "supabase") {
        try {
          await db()
            .from("categorias")
            .update({
              nombre: nuevoNombre,
              descripcion: itemActualizado.descripcion || null,
              icono: itemActualizado.icono,
              color: itemActualizado.color,
            })
            .eq("nombre", nombreActual);

          if (cambioNombre) {
            await db()
              .from("productos")
              .update({ categoria: nuevoNombre })
              .eq("categoria", nombreActual);
          }
        } catch {}
      }
    },
    [db, categoriasItems, productos, movimientos]
  );

  const eliminarCategoria = useCallback(
    async (nombre: string, reasignarA: string = "General") => {
      const limpia = nombre.trim();
      const afectados = productos.filter((p) => p.categoria.toLowerCase() === limpia.toLowerCase());

      if (afectados.length > 0 && reasignarA.toLowerCase() !== limpia.toLowerCase()) {
        const prodsActualizados = productos.map((p) =>
          p.categoria.toLowerCase() === limpia.toLowerCase()
            ? { ...p, categoria: reasignarA }
            : p
        );
        setProductos(prodsActualizados);
        guardarProductosYMovimientosLocal(prodsActualizados, movimientos);

        if (MODO === "supabase") {
          try {
            await db()
              .from("productos")
              .update({ categoria: reasignarA })
              .eq("categoria", limpia);
          } catch {}
        }
      }

      const filtradas = categoriasItems.filter(
        (c) => c.nombre.toLowerCase() !== limpia.toLowerCase()
      );
      setCategoriasItems(filtradas);
      guardarCategoriasLocal(filtradas);

      if (MODO === "supabase") {
        try {
          await db().from("categorias").delete().eq("nombre", limpia);
        } catch {}
      }
    },
    [db, productos, movimientos, categoriasItems]
  );

  const categorias = useMemo(() => {
    return categoriasItems
      .map((c) => c.nombre)
      .sort((a, b) => a.localeCompare(b, "es"));
  }, [categoriasItems]);

  const categoriasDetalle = useMemo(() => {
    return [...categoriasItems].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  }, [categoriasItems]);

  /* -------------------------------------------------------------------------- */
  /*  Gestión de Productos con Persistencia Inmediata                           */
  /* -------------------------------------------------------------------------- */
  const crearProducto = useCallback(
    async (p: NuevoProducto) => {
      let creado: Producto = { ...p, id: nuevoId(), created_at: new Date().toISOString() };

      if (MODO === "supabase") {
        try {
          const { data, error } = await db().from("productos").insert(p).select().single();
          if (!error && data) {
            creado = aProducto(data);
          }
        } catch {}
      }

      const nuevaLista = ordenar([...productos, creado]);
      setProductos(nuevaLista);
      guardarProductosYMovimientosLocal(nuevaLista, movimientos);

      // Registrar categoría automáticamente si no existía
      if (
        p.categoria &&
        !categoriasItems.some((c) => c.nombre.toLowerCase() === p.categoria.toLowerCase())
      ) {
        void crearCategoria({ nombre: p.categoria, icono: "🏷️" });
      }
    },
    [db, productos, movimientos, categoriasItems, crearCategoria]
  );

  const actualizarProducto = useCallback(
    async (id: string, cambios: Partial<NuevoProducto>) => {
      if (MODO === "supabase") {
        try {
          await db().from("productos").update(cambios).eq("id", id);
        } catch {}
      }

      const nuevaLista = ordenar(
        productos.map((p) => (p.id === id ? { ...p, ...cambios } : p))
      );
      setProductos(nuevaLista);
      guardarProductosYMovimientosLocal(nuevaLista, movimientos);

      if (
        cambios.categoria &&
        !categoriasItems.some((c) => c.nombre.toLowerCase() === cambios.categoria?.toLowerCase())
      ) {
        void crearCategoria({ nombre: cambios.categoria, icono: "🏷️" });
      }
    },
    [db, productos, movimientos, categoriasItems, crearCategoria]
  );

  const eliminarProducto = useCallback(
    async (id: string) => {
      if (MODO === "supabase") {
        try {
          await db().from("productos").delete().eq("id", id);
        } catch {}
      }

      const nuevaListaProds = productos.filter((p) => p.id !== id);
      const nuevaListaMovs = movimientos.filter((m) => m.producto_id !== id);

      setProductos(nuevaListaProds);
      setMovimientos(nuevaListaMovs);
      guardarProductosYMovimientosLocal(nuevaListaProds, nuevaListaMovs);
    },
    [db, productos, movimientos]
  );

  const registrarMovimiento = useCallback(
    async ({ producto_id, tipo, cantidad, nota }: NuevoMovimiento) => {
      const producto = productos.find((p) => p.id === producto_id);
      if (!producto) throw new Error("Selecciona un producto");
      if (!Number.isInteger(cantidad) || cantidad < 0 || (tipo !== "ajuste" && cantidad === 0)) {
        throw new Error("La cantidad debe ser un número entero mayor que 0");
      }

      const stockNuevo =
        tipo === "entrada"
          ? producto.stock + cantidad
          : tipo === "salida"
            ? producto.stock - cantidad
            : cantidad;

      if (stockNuevo < 0) {
        throw new Error(`Stock insuficiente: solo hay ${producto.stock} unidades disponibles`);
      }

      const registro = {
        producto_id,
        tipo,
        cantidad,
        stock_resultante: stockNuevo,
        nota: nota?.trim() || null,
      };

      let movimiento: Movimiento = {
        ...registro,
        id: nuevoId(),
        created_at: new Date().toISOString(),
      };

      if (MODO === "supabase") {
        try {
          const { data, error } = await db().from("movimientos").insert(registro).select().single();
          if (!error && data) {
            movimiento = aMovimiento(data);
          }
          await db().from("productos").update({ stock: stockNuevo }).eq("id", producto_id);
        } catch {}
      }

      const nuevosMovs = [movimiento, ...movimientos];
      const nuevosProds = productos.map((p) =>
        p.id === producto_id ? { ...p, stock: stockNuevo } : p
      );

      setMovimientos(nuevosMovs);
      setProductos(nuevosProds);
      guardarProductosYMovimientosLocal(nuevosProds, nuevosMovs);
    },
    [db, productos, movimientos]
  );

  const registrarMovimientoConNuevoProducto = useCallback(
    async ({
      producto,
      tipo,
      cantidad,
      nota,
    }: {
      producto: NuevoProducto;
      tipo: TipoMovimiento;
      cantidad: number;
      nota?: string;
    }) => {
      const stockInicial = tipo === "entrada" ? cantidad : tipo === "ajuste" ? cantidad : 0;
      let nuevoProd: Producto = {
        ...producto,
        stock: stockInicial,
        id: nuevoId(),
        created_at: new Date().toISOString(),
      };

      if (MODO === "supabase") {
        try {
          const { data, error } = await db()
            .from("productos")
            .insert({ ...producto, stock: stockInicial })
            .select()
            .single();
          if (!error && data) {
            nuevoProd = aProducto(data);
          }
        } catch {}
      }

      const registroMov = {
        producto_id: nuevoProd.id,
        tipo,
        cantidad,
        stock_resultante: stockInicial,
        nota: nota?.trim() || `Ingreso de nuevo producto: ${nuevoProd.nombre}`,
      };

      let nuevoMov: Movimiento = {
        ...registroMov,
        id: nuevoId(),
        created_at: new Date().toISOString(),
      };

      if (MODO === "supabase") {
        try {
          const { data, error } = await db()
            .from("movimientos")
            .insert(registroMov)
            .select()
            .single();
          if (!error && data) {
            nuevoMov = aMovimiento(data);
          }
        } catch {}
      }

      if (
        nuevoProd.categoria &&
        !categoriasItems.some((c) => c.nombre.toLowerCase() === nuevoProd.categoria.toLowerCase())
      ) {
        void crearCategoria({ nombre: nuevoProd.categoria, icono: "🏷️" });
      }

      const prodsActualizados = ordenar([...productos, nuevoProd]);
      const movsActualizados = [nuevoMov, ...movimientos];

      setProductos(prodsActualizados);
      setMovimientos(movsActualizados);
      guardarProductosYMovimientosLocal(prodsActualizados, movsActualizados);
    },
    [db, productos, movimientos, categoriasItems, crearCategoria]
  );

  /* -------------------------------------------------------------------------- */
  /*  Gestión de Fiados / Clientes Fijos con Persistencia Inmediata             */
  /* -------------------------------------------------------------------------- */
  const crearFiado = useCallback(
    async (f: NuevoRegistroFiado) => {
      const { descontarStock, ...datos } = f;
      let nuevoRegistro: RegistroFiado = {
        ...datos,
        id: nuevoId(),
        created_at: new Date().toISOString(),
      };

      if (MODO === "supabase") {
        try {
          const { data, error } = await db().from("fiados").insert(datos).select().single();
          if (!error && data) {
            nuevoRegistro = aFiado(data);
          }
        } catch {}
      }

      if (descontarStock && datos.producto_id) {
        try {
          await registrarMovimiento({
            producto_id: datos.producto_id,
            tipo: "salida",
            cantidad: datos.cantidad,
            nota: `Fiado a cliente: ${datos.cliente_nombre}`,
          });
        } catch {}
      }

      const nuevosFiados = [nuevoRegistro, ...fiados];
      setFiados(nuevosFiados);
      guardarFiadosLocal(nuevosFiados);
    },
    [db, fiados, registrarMovimiento]
  );

  const marcarFiadoPagado = useCallback(
    async (id: string) => {
      const fecha = new Date().toISOString();
      if (MODO === "supabase") {
        try {
          await db().from("fiados").update({ estado: "pagado", pagado_at: fecha }).eq("id", id);
        } catch {}
      }

      const actualizados = fiados.map((f) =>
        f.id === id ? { ...f, estado: "pagado" as const, pagado_at: fecha } : f
      );
      setFiados(actualizados);
      guardarFiadosLocal(actualizados);
    },
    [db, fiados]
  );

  const eliminarFiado = useCallback(
    async (id: string) => {
      if (MODO === "supabase") {
        try {
          await db().from("fiados").delete().eq("id", id);
        } catch {}
      }

      const actualizados = fiados.filter((f) => f.id !== id);
      setFiados(actualizados);
      guardarFiadosLocal(actualizados);
    },
    [db, fiados]
  );

  /* -------------------------------------------------------------------------- */
  /*  Copia de Seguridad y Restauración de Datos                                */
  /* -------------------------------------------------------------------------- */
  const exportarCopiaSeguridad = useCallback(() => {
    try {
      const paquete = {
        version: 2,
        exportadoEn: new Date().toISOString(),
        productos,
        movimientos,
        fiados,
        categoriasItems,
      };

      const blob = new Blob([JSON.stringify(paquete, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `respaldo-inventario-nihao-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      avisar("Copia de seguridad descargada exitosamente");
    } catch {
      avisar("Error al exportar copia de seguridad", "error");
    }
  }, [productos, movimientos, fiados, categoriasItems, avisar]);

  const importarCopiaSeguridad = useCallback(
    (contenido: string): boolean => {
      try {
        const datos = JSON.parse(contenido);
        if (!datos || typeof datos !== "object") {
          throw new Error("El archivo no contiene un formato de respaldo válido");
        }

        const prods = Array.isArray(datos.productos) ? datos.productos : [];
        const movs = Array.isArray(datos.movimientos) ? datos.movimientos : [];
        const fias = Array.isArray(datos.fiados) ? datos.fiados : [];
        const cats = Array.isArray(datos.categoriasItems) ? datos.categoriasItems : CATEGORIAS_POR_DEFECTO;

        setProductos(ordenar(prods));
        setMovimientos(movs);
        setFiados(fias);
        setCategoriasItems(cats);

        guardarProductosYMovimientosLocal(prods, movs);
        guardarFiadosLocal(fias);
        guardarCategoriasLocal(cats);

        avisar(`Respaldo restaurado: ${prods.length} productos y ${cats.length} categorías cargadas`);
        return true;
      } catch (err) {
        avisar(err instanceof Error ? err.message : "Error al importar el respaldo", "error");
        return false;
      }
    },
    [avisar]
  );

  const restablecerDatosDemo = useCallback(() => {
    if (confirm("¿Deseas restablecer el inventario con los datos demostrativos iniciales? Se sobreescribirán los datos locales actuales.")) {
      const demo = crearDatosDemo();
      setProductos(ordenar(demo.productos));
      setMovimientos(demo.movimientos);
      setFiados(demo.fiados);
      setCategoriasItems(demo.categoriasItems);

      guardarProductosYMovimientosLocal(demo.productos, demo.movimientos);
      guardarFiadosLocal(demo.fiados);
      guardarCategoriasLocal(demo.categoriasItems);

      avisar("Datos iniciales de demostración restablecidos");
    }
  }, [avisar]);

  /* -------------------------------------------------------------------------- */
  /*  Métricas                                                                  */
  /* -------------------------------------------------------------------------- */
  const metricas = useMemo<MetricasInventario>(() => {
    let valorVenta = 0;
    let valorCosto = 0;
    let bajos = 0;
    let agotados = 0;

    for (const p of productos) {
      valorVenta += p.stock * p.precio;
      valorCosto += p.stock * p.costo;
      const st = estadoStock(p);
      if (st === "bajo") bajos++;
      if (st === "agotado") agotados++;
    }

    return {
      totalSkus: productos.length,
      valorVenta,
      valorCosto,
      bajos,
      agotados,
      totalAlertas: bajos + agotados,
    };
  }, [productos]);

  const metricasFiados = useMemo<MetricasFiados>(() => {
    let totalPendiente = 0;
    let totalRecuperado = 0;
    const clientesSet = new Set<string>();
    let totalRegistrosPendientes = 0;

    for (const f of fiados) {
      if (f.estado === "pendiente") {
        totalPendiente += f.valor_total;
        clientesSet.add(f.cliente_nombre.trim().toLowerCase());
        totalRegistrosPendientes++;
      } else {
        totalRecuperado += f.valor_total;
      }
    }

    return {
      totalPendiente,
      clientesConDeuda: clientesSet.size,
      totalRegistrosPendientes,
      totalRecuperado,
    };
  }, [fiados]);

  /* -------------------------------------------------------------------------- */
  /*  Modales                                                                   */
  /* -------------------------------------------------------------------------- */
  const abrirModalProducto = useCallback((p?: Producto | "nuevo", categoriaPredefinida?: string) => {
    setModalProducto(p ?? "nuevo");
    setCategoriaInicialModalProducto(categoriaPredefinida);
  }, []);

  const cerrarModalProducto = useCallback(() => {
    setModalProducto(null);
    setCategoriaInicialModalProducto(undefined);
  }, []);

  const abrirModalMovimiento = useCallback((productoId?: string) => {
    setModalMovimiento(productoId ?? "");
  }, []);

  const cerrarModalMovimiento = useCallback(() => {
    setModalMovimiento(null);
  }, []);

  const abrirModalFiado = useCallback(() => setModalFiado(true), []);
  const cerrarModalFiado = useCallback(() => setModalFiado(false), []);

  const abrirModalCategoria = useCallback((catParaEditar?: string) => {
    setModalCategoria(catParaEditar ? catParaEditar : true);
  }, []);

  const cerrarModalCategoria = useCallback(() => {
    setModalCategoria(false);
  }, []);

  const value = useMemo<InventarioCtx>(
    () => ({
      modo: MODO,
      productos,
      movimientos,
      categorias,
      categoriasDetalle,
      fiados,
      metricas,
      metricasFiados,
      cargando,
      error,
      recargar,
      crearCategoria,
      editarCategoria,
      eliminarCategoria,
      crearProducto,
      actualizarProducto,
      eliminarProducto,
      registrarMovimiento,
      registrarMovimientoConNuevoProducto,
      crearFiado,
      marcarFiadoPagado,
      eliminarFiado,
      avisar,
      exportarCopiaSeguridad,
      importarCopiaSeguridad,
      restablecerDatosDemo,
      modalProducto,
      categoriaInicialModalProducto,
      abrirModalProducto,
      cerrarModalProducto,
      modalMovimiento,
      abrirModalMovimiento,
      cerrarModalMovimiento,
      modalFiado,
      abrirModalFiado,
      cerrarModalFiado,
      modalCategoria,
      abrirModalCategoria,
      cerrarModalCategoria,
    }),
    [
      productos,
      movimientos,
      categorias,
      categoriasDetalle,
      fiados,
      metricas,
      metricasFiados,
      cargando,
      error,
      recargar,
      crearCategoria,
      editarCategoria,
      eliminarCategoria,
      crearProducto,
      actualizarProducto,
      eliminarProducto,
      registrarMovimiento,
      registrarMovimientoConNuevoProducto,
      crearFiado,
      marcarFiadoPagado,
      eliminarFiado,
      avisar,
      exportarCopiaSeguridad,
      importarCopiaSeguridad,
      restablecerDatosDemo,
      modalProducto,
      categoriaInicialModalProducto,
      abrirModalProducto,
      cerrarModalProducto,
      modalMovimiento,
      abrirModalMovimiento,
      cerrarModalMovimiento,
      modalFiado,
      abrirModalFiado,
      cerrarModalFiado,
      modalCategoria,
      abrirModalCategoria,
      cerrarModalCategoria,
    ]
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {avisos.map((a) => (
          <div key={a.id} className={a.tipo === "error" ? "toast is-error" : "toast"}>
            {a.mensaje}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useInventario() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useInventario debe usarse dentro de <InventarioProvider>");
  return ctx;
}
