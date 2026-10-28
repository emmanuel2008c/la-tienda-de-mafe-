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
import { estadoStock, obtenerEstadoSalida } from "./format";
import type {
  CambiosSalida,
  CategoriaItem,
  EstadoSalida,
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

export interface MetricasVentas {
  totalVentasHoy: number;
  articulosVendidosHoy: number;
  transaccionesHoy: number;
  totalVentasSemana: number;
  articulosVendidosSemana: number;
  transaccionesSemana: number;
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
const LS_SALIDAS_META_KEY = "tienda:salidas-meta:v1";

const FECHA_DEFAULT = "2026-01-01T00:00:00.000Z";

const nuevoId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

const ordenar = (ps: Producto[]) =>
  [...ps].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

const ordenarMovimientos = (ms: Movimiento[]) =>
  [...ms].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

/* -------------------------------------------------------------------------- */
/*  Helpers de serialización y lectura segura en LocalStorage                 */
/* -------------------------------------------------------------------------- */

interface MetaSalidaLocal {
  estado_salida?: EstadoSalida;
  precio_unitario?: number;
  cliente_nombre?: string | null;
  cliente_contacto?: string | null;
  fiado_id?: string | null;
}

function leerMetaSalidasLocal(): Record<string, MetaSalidaLocal> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(LS_SALIDAS_META_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function guardarMetaSalidaLocal(id: string, meta: MetaSalidaLocal) {
  if (typeof window === "undefined") return;
  try {
    const actual = leerMetaSalidasLocal();
    actual[id] = meta;
    localStorage.setItem(LS_SALIDAS_META_KEY, JSON.stringify(actual));
  } catch (e) {
    console.error("Error guardando metadatos de salida en LocalStorage:", e);
  }
}

function eliminarMetaSalidaLocal(id: string) {
  if (typeof window === "undefined") return;
  try {
    const actual = leerMetaSalidasLocal();
    if (id in actual) {
      delete actual[id];
      localStorage.setItem(LS_SALIDAS_META_KEY, JSON.stringify(actual));
    }
  } catch {}
}

function sincronizarMapaMetaSalidas(ms: Movimiento[]) {
  if (typeof window === "undefined") return;
  try {
    const actual = leerMetaSalidasLocal();
    for (const m of ms) {
      if (m.tipo === "salida") {
        actual[m.id] = {
          estado_salida: m.estado_salida ?? actual[m.id]?.estado_salida,
          precio_unitario: m.precio_unitario ?? actual[m.id]?.precio_unitario,
          cliente_nombre:
            m.cliente_nombre !== undefined ? m.cliente_nombre : actual[m.id]?.cliente_nombre,
          cliente_contacto:
            m.cliente_contacto !== undefined
              ? m.cliente_contacto
              : actual[m.id]?.cliente_contacto,
          fiado_id: m.fiado_id !== undefined ? m.fiado_id : actual[m.id]?.fiado_id,
        };
      }
    }
    localStorage.setItem(LS_SALIDAS_META_KEY, JSON.stringify(actual));
  } catch {}
}

function enriquecerMovimientoConMeta(
  m: Movimiento,
  mapaMeta: Record<string, MetaSalidaLocal>
): Movimiento {
  if (m.tipo !== "salida") return m;
  const meta = mapaMeta[m.id];
  const estado = m.estado_salida ?? meta?.estado_salida ?? obtenerEstadoSalida(m);
  return {
    ...m,
    estado_salida: estado,
    precio_unitario: m.precio_unitario ?? meta?.precio_unitario,
    cliente_nombre:
      m.cliente_nombre !== undefined ? m.cliente_nombre : (meta?.cliente_nombre ?? null),
    cliente_contacto:
      m.cliente_contacto !== undefined ? m.cliente_contacto : (meta?.cliente_contacto ?? null),
    fiado_id: m.fiado_id !== undefined ? m.fiado_id : (meta?.fiado_id ?? null),
  };
}

function guardarProductosYMovimientosLocal(ps: Producto[], ms: Movimiento[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      LS_KEY,
      JSON.stringify({
        productos: ps,
        movimientos: ms,
        version: 3,
        guardadoEn: new Date().toISOString(),
      })
    );
    sincronizarMapaMetaSalidas(ms);
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
    const mapaMeta = leerMetaSalidasLocal();

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
          if (Array.isArray(parsed.movimientos)) {
            movimientos = (parsed.movimientos as Movimiento[]).map((m) =>
              enriquecerMovimientoConMeta(m, mapaMeta)
            );
          }
        }
      } catch {}
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

    return { productos, movimientos: ordenarMovimientos(movimientos), fiados, categoriasItems };
  } catch {
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

const aMovimiento = (
  r: Record<string, unknown>,
  mapaMeta: Record<string, MetaSalidaLocal> = {}
): Movimiento => {
  const id = String(r.id);
  const tipo = r.tipo as Movimiento["tipo"];
  const nota = (r.nota as string | null) ?? null;
  const meta = mapaMeta[id];

  const estadoDb = r.estado_salida as EstadoSalida | null | undefined;
  const precioDb =
    r.precio_unitario !== undefined && r.precio_unitario !== null
      ? Number(r.precio_unitario)
      : undefined;
  const clienteDb =
    r.cliente_nombre !== undefined ? ((r.cliente_nombre as string | null) ?? null) : undefined;
  const contactoDb =
    r.cliente_contacto !== undefined ? ((r.cliente_contacto as string | null) ?? null) : undefined;
  const fiadoIdDb =
    r.fiado_id !== undefined ? ((r.fiado_id as string | null) ?? null) : undefined;

  const base: Movimiento = {
    id,
    producto_id: String(r.producto_id),
    tipo,
    cantidad: Number(r.cantidad ?? 0),
    stock_resultante: Number(r.stock_resultante ?? 0),
    nota,
    created_at: String(r.created_at ?? FECHA_DEFAULT),
  };

  if (tipo === "salida") {
    base.estado_salida =
      estadoDb ?? meta?.estado_salida ?? obtenerEstadoSalida({ estado_salida: undefined, nota });
    base.precio_unitario = precioDb ?? meta?.precio_unitario;
    base.cliente_nombre = clienteDb !== undefined ? clienteDb : (meta?.cliente_nombre ?? null);
    base.cliente_contacto =
      contactoDb !== undefined ? contactoDb : (meta?.cliente_contacto ?? null);
    base.fiado_id = fiadoIdDb !== undefined ? fiadoIdDb : (meta?.fiado_id ?? null);
  }

  return base;
};

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
  metricasVentas: MetricasVentas;
  cargando: boolean;
  error: string | null;
  recargar: () => Promise<void>;
  // Categorías
  crearCategoria: (cat: string | NuevaCategoria) => Promise<CategoriaItem>;
  editarCategoria: (nombreActual: string, cambios: Partial<NuevaCategoria>) => Promise<void>;
  eliminarCategoria: (nombre: string, reasignarA?: string) => Promise<void>;
  // Productos y Movimientos
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
  // Edición y gestión completa de Salidas
  actualizarSalida: (id: string, cambios: CambiosSalida) => Promise<void>;
  eliminarSalida: (id: string) => Promise<void>;
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
  modalMovimientoTipoInicial?: TipoMovimiento;
  abrirModalMovimiento: (productoId?: string, tipoInicial?: TipoMovimiento) => void;
  cerrarModalMovimiento: () => void;
  modalEditarSalida: Movimiento | null;
  estadoPredefinidoEditarSalida?: EstadoSalida;
  abrirModalEditarSalida: (movimiento: Movimiento, estadoPredefinido?: EstadoSalida) => void;
  cerrarModalEditarSalida: () => void;
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
  const [categoriasItems, setCategoriasItems] = useState<CategoriaItem[]>(
    () => CATEGORIAS_POR_DEFECTO
  );
  const [fiados, setFiados] = useState<RegistroFiado[]>(() => crearDatosDemo().fiados);

  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [esCliente, setEsCliente] = useState(false);

  // Hidratación segura del almacenamiento local del cliente tras el montaje
  useEffect(() => {
    setEsCliente(true);
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
  const [categoriaInicialModalProducto, setCategoriaInicialModalProducto] = useState<
    string | undefined
  >(undefined);
  const [modalMovimiento, setModalMovimiento] = useState<string | null>(null);
  const [modalMovimientoTipoInicial, setModalMovimientoTipoInicial] = useState<
    TipoMovimiento | undefined
  >(undefined);
  const [modalEditarSalida, setModalEditarSalida] = useState<Movimiento | null>(null);
  const [estadoPredefinidoEditarSalida, setEstadoPredefinidoEditarSalida] = useState<
    EstadoSalida | undefined
  >(undefined);
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
        const mapaMeta = leerMetaSalidasLocal();
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
            const movs = ordenarMovimientos(
              (mRes.data ?? []).map((row) => aMovimiento(row as Record<string, unknown>, mapaMeta))
            );
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
        descripcion:
          cambios.descripcion !== undefined
            ? cambios.descripcion?.trim()
            : catOriginal.descripcion,
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
    async ({
      producto_id,
      tipo,
      cantidad,
      nota,
      estado_salida,
      precio_unitario,
      cliente_nombre,
      cliente_contacto,
      created_at,
      fiado_id,
      omitirSyncFiado,
    }: NuevoMovimiento) => {
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

      const fechaIso = created_at || new Date().toISOString();
      const notaLimpia = nota?.trim() || null;

      let estadoFinal: EstadoSalida | undefined;
      let precioFinal: number | undefined;
      let clienteFinal: string | null = null;
      let contactoFinal: string | null = null;
      let fiadoIdFinal: string | null = fiado_id || null;

      if (tipo === "salida") {
        estadoFinal = estado_salida ?? "vendido";
        precioFinal =
          precio_unitario !== undefined && !Number.isNaN(precio_unitario)
            ? Math.max(0, precio_unitario)
            : producto.precio;
        clienteFinal = cliente_nombre?.trim() || null;
        contactoFinal = cliente_contacto?.trim() || null;

        if (estadoFinal === "fiado" && !clienteFinal && !omitirSyncFiado) {
          throw new Error("Ingresa el nombre del cliente cuando la salida es Fiado");
        }

        // Si se registra directamente como salida "fiado", sincronizar con Clientes Fijos
        if (!omitirSyncFiado && estadoFinal === "fiado") {
          const datosFiado = {
            cliente_nombre: clienteFinal || "Cliente",
            cliente_contacto: contactoFinal || undefined,
            producto_id: producto.id,
            producto_nombre: producto.nombre,
            cantidad,
            valor_unitario: precioFinal,
            valor_total: cantidad * precioFinal,
            estado: "pendiente" as const,
            nota: notaLimpia || undefined,
          };

          let nuevoFiado: RegistroFiado = {
            ...datosFiado,
            id: nuevoId(),
            created_at: fechaIso,
          };

          if (MODO === "supabase") {
            try {
              const { data: fData, error: fErr } = await db()
                .from("fiados")
                .insert(datosFiado)
                .select()
                .single();
              if (!fErr && fData) {
                nuevoFiado = aFiado(fData);
              }
            } catch {}
          }

          fiadoIdFinal = nuevoFiado.id;
          const nuevosFiados = [nuevoFiado, ...fiados];
          setFiados(nuevosFiados);
          guardarFiadosLocal(nuevosFiados);
        }
      }

      const registroBase = {
        producto_id,
        tipo,
        cantidad,
        stock_resultante: stockNuevo,
        nota: notaLimpia,
        created_at: fechaIso,
      };

      const registroExtendido =
        tipo === "salida"
          ? {
              ...registroBase,
              estado_salida: estadoFinal,
              precio_unitario: precioFinal,
              cliente_nombre: clienteFinal,
              cliente_contacto: contactoFinal,
              fiado_id: fiadoIdFinal,
            }
          : registroBase;

      let movimiento: Movimiento = {
        ...registroExtendido,
        id: nuevoId(),
      };

      if (MODO === "supabase") {
        try {
          const { data, error: errExt } = await db()
            .from("movimientos")
            .insert(registroExtendido)
            .select()
            .single();

          if (!errExt && data) {
            movimiento = {
              ...aMovimiento(data as Record<string, unknown>),
              ...(tipo === "salida"
                ? {
                    estado_salida: estadoFinal,
                    precio_unitario: precioFinal,
                    cliente_nombre: clienteFinal,
                    cliente_contacto: contactoFinal,
                    fiado_id: fiadoIdFinal,
                  }
                : {}),
            };
          } else if (errExt && tipo === "salida") {
            // Respaldo compatible si las nuevas columnas aún no se han migrado en Supabase
            const { data: dataBase, error: errBase } = await db()
              .from("movimientos")
              .insert(registroBase)
              .select()
              .single();
            if (!errBase && dataBase) {
              movimiento = {
                ...aMovimiento(dataBase as Record<string, unknown>),
                estado_salida: estadoFinal,
                precio_unitario: precioFinal,
                cliente_nombre: clienteFinal,
                cliente_contacto: contactoFinal,
                fiado_id: fiadoIdFinal,
              };
            }
          }

          await db().from("productos").update({ stock: stockNuevo }).eq("id", producto_id);
        } catch {}
      }

      if (tipo === "salida") {
        guardarMetaSalidaLocal(movimiento.id, {
          estado_salida: estadoFinal,
          precio_unitario: precioFinal,
          cliente_nombre: clienteFinal,
          cliente_contacto: contactoFinal,
          fiado_id: fiadoIdFinal,
        });
      }

      const nuevosMovs = ordenarMovimientos([movimiento, ...movimientos]);
      const nuevosProds = productos.map((p) =>
        p.id === producto_id ? { ...p, stock: stockNuevo } : p
      );

      setMovimientos(nuevosMovs);
      setProductos(nuevosProds);
      guardarProductosYMovimientosLocal(nuevosProds, nuevosMovs);
    },
    [db, productos, movimientos, fiados]
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
            nuevoMov = aMovimiento(data as Record<string, unknown>);
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
      const movsActualizados = ordenarMovimientos([nuevoMov, ...movimientos]);

      setProductos(prodsActualizados);
      setMovimientos(movsActualizados);
      guardarProductosYMovimientosLocal(prodsActualizados, movsActualizados);
    },
    [db, productos, movimientos, categoriasItems, crearCategoria]
  );

  /* -------------------------------------------------------------------------- */
  /*  Edición y Eliminación Completa de Salidas Registradas                     */
  /* -------------------------------------------------------------------------- */
  const actualizarSalida = useCallback(
    async (id: string, cambios: CambiosSalida) => {
      const movOriginal = movimientos.find((m) => m.id === id);
      if (!movOriginal) {
        throw new Error("No se encontró la salida seleccionada");
      }
      if (movOriginal.tipo !== "salida") {
        throw new Error("Este registro no corresponde a una salida");
      }
      if (!Number.isInteger(cambios.cantidad) || cambios.cantidad <= 0) {
        throw new Error("La cantidad debe ser un número entero mayor que 0");
      }
      if (Number.isNaN(cambios.precio_unitario) || cambios.precio_unitario < 0) {
        throw new Error("El precio unitario no puede ser negativo");
      }

      const nuevoProd = productos.find((p) => p.id === cambios.producto_id);
      if (!nuevoProd) {
        throw new Error("Selecciona un producto válido del catálogo");
      }

      const clienteLimpio = cambios.cliente_nombre?.trim() || null;
      const contactoLimpio = cambios.cliente_contacto?.trim() || null;
      const notaLimpia = cambios.nota?.trim() || null;
      const fechaFinal = cambios.created_at || movOriginal.created_at;

      if (cambios.estado_salida === "fiado" && !clienteLimpio) {
        throw new Error("Ingresa el nombre del cliente cuando el estado es Fiado");
      }

      // 1. Reconciliar existencias de stock en el inventario
      const mismoProducto = movOriginal.producto_id === nuevoProd.id;
      let nuevosProds = [...productos];
      let nuevoStockResultante = movOriginal.stock_resultante;

      if (mismoProducto) {
        const stockDisponible = nuevoProd.stock + movOriginal.cantidad;
        if (cambios.cantidad > stockDisponible) {
          throw new Error(
            `Stock insuficiente en "${nuevoProd.nombre}": máximo disponible ${stockDisponible} unidades`
          );
        }
        const stockActualizado = stockDisponible - cambios.cantidad;
        const ultimoMovProd = movimientos.find((m) => m.producto_id === nuevoProd.id);
        nuevoStockResultante =
          ultimoMovProd?.id === movOriginal.id
            ? stockActualizado
            : Math.max(0, movOriginal.stock_resultante + movOriginal.cantidad - cambios.cantidad);

        nuevosProds = ordenar(
          productos.map((p) => (p.id === nuevoProd.id ? { ...p, stock: stockActualizado } : p))
        );

        if (MODO === "supabase") {
          try {
            await db().from("productos").update({ stock: stockActualizado }).eq("id", nuevoProd.id);
          } catch {}
        }
      } else {
        if (cambios.cantidad > nuevoProd.stock) {
          throw new Error(
            `Stock insuficiente en "${nuevoProd.nombre}": solo hay ${nuevoProd.stock} unidades disponibles`
          );
        }

        const prodAnterior = productos.find((p) => p.id === movOriginal.producto_id);
        const stockAnteriorRestaurado = prodAnterior ? prodAnterior.stock + movOriginal.cantidad : 0;
        const stockNuevoDescontado = nuevoProd.stock - cambios.cantidad;
        nuevoStockResultante = stockNuevoDescontado;

        nuevosProds = ordenar(
          productos.map((p) => {
            if (p.id === movOriginal.producto_id) {
              return { ...p, stock: stockAnteriorRestaurado };
            }
            if (p.id === nuevoProd.id) {
              return { ...p, stock: stockNuevoDescontado };
            }
            return p;
          })
        );

        if (MODO === "supabase") {
          try {
            if (prodAnterior) {
              await db()
                .from("productos")
                .update({ stock: stockAnteriorRestaurado })
                .eq("id", prodAnterior.id);
            }
            await db()
              .from("productos")
              .update({ stock: stockNuevoDescontado })
              .eq("id", nuevoProd.id);
          } catch {}
        }
      }

      // 2. Sincronizar con la tabla de Fiados (Clientes Fijos) según el estado de la salida
      let fiadoVinculado = movOriginal.fiado_id
        ? fiados.find((f) => f.id === movOriginal.fiado_id)
        : undefined;

      // Compatibilidad con registros antiguos sin fiado_id explícito
      if (!fiadoVinculado && movOriginal.nota?.toLowerCase().startsWith("fiado a cliente:")) {
        const nombreExtraido = movOriginal.nota.slice("fiado a cliente:".length).trim().toLowerCase();
        fiadoVinculado = fiados.find(
          (f) =>
            f.cliente_nombre.trim().toLowerCase() === nombreExtraido &&
            f.producto_id === movOriginal.producto_id &&
            f.cantidad === movOriginal.cantidad
        );
      }

      let fiadoIdFinal: string | null = fiadoVinculado?.id ?? movOriginal.fiado_id ?? null;
      let nuevosFiados = [...fiados];
      let fiadosModificados = false;
      const valorTotal = cambios.cantidad * cambios.precio_unitario;

      if (cambios.estado_salida === "fiado") {
        if (fiadoVinculado) {
          const cambiosFiado = {
            cliente_nombre: clienteLimpio || fiadoVinculado.cliente_nombre,
            cliente_contacto: contactoLimpio || undefined,
            producto_id: nuevoProd.id,
            producto_nombre: nuevoProd.nombre,
            cantidad: cambios.cantidad,
            valor_unitario: cambios.precio_unitario,
            valor_total: valorTotal,
            estado: "pendiente" as const,
            pagado_at: undefined,
            nota: notaLimpia || undefined,
          };

          if (MODO === "supabase") {
            try {
              await db()
                .from("fiados")
                .update({
                  ...cambiosFiado,
                  cliente_contacto: contactoLimpio,
                  pagado_at: null,
                  nota: notaLimpia,
                })
                .eq("id", fiadoVinculado.id);
            } catch {}
          }

          nuevosFiados = fiados.map((f) =>
            f.id === fiadoVinculado!.id ? { ...f, ...cambiosFiado } : f
          );
          fiadosModificados = true;
          fiadoIdFinal = fiadoVinculado.id;
        } else {
          const datosNuevoFiado = {
            cliente_nombre: clienteLimpio || "Cliente",
            cliente_contacto: contactoLimpio || undefined,
            producto_id: nuevoProd.id,
            producto_nombre: nuevoProd.nombre,
            cantidad: cambios.cantidad,
            valor_unitario: cambios.precio_unitario,
            valor_total: valorTotal,
            estado: "pendiente" as const,
            nota: notaLimpia || undefined,
          };

          let creadoFiado: RegistroFiado = {
            ...datosNuevoFiado,
            id: nuevoId(),
            created_at: fechaFinal,
          };

          if (MODO === "supabase") {
            try {
              const { data: fData, error: fErr } = await db()
                .from("fiados")
                .insert(datosNuevoFiado)
                .select()
                .single();
              if (!fErr && fData) {
                creadoFiado = aFiado(fData);
              }
            } catch {}
          }

          fiadoIdFinal = creadoFiado.id;
          nuevosFiados = [creadoFiado, ...fiados];
          fiadosModificados = true;
        }
      } else if (cambios.estado_salida === "ya_pago") {
        if (fiadoVinculado) {
          const fechaPago = fiadoVinculado.pagado_at || new Date().toISOString();
          const cambiosFiado = {
            cliente_nombre: clienteLimpio || fiadoVinculado.cliente_nombre,
            cliente_contacto: contactoLimpio || undefined,
            producto_id: nuevoProd.id,
            producto_nombre: nuevoProd.nombre,
            cantidad: cambios.cantidad,
            valor_unitario: cambios.precio_unitario,
            valor_total: valorTotal,
            estado: "pagado" as const,
            pagado_at: fechaPago,
            nota: notaLimpia || undefined,
          };

          if (MODO === "supabase") {
            try {
              await db()
                .from("fiados")
                .update({
                  ...cambiosFiado,
                  cliente_contacto: contactoLimpio,
                  nota: notaLimpia,
                })
                .eq("id", fiadoVinculado.id);
            } catch {}
          }

          nuevosFiados = fiados.map((f) =>
            f.id === fiadoVinculado!.id ? { ...f, ...cambiosFiado } : f
          );
          fiadosModificados = true;
          fiadoIdFinal = fiadoVinculado.id;
        }
      } else if (cambios.estado_salida === "vendido") {
        // Si antes estaba como fiado y se cambia a venta directa ("Vendido"), retirar de cuentas por cobrar
        if (fiadoVinculado) {
          if (MODO === "supabase") {
            try {
              await db().from("fiados").delete().eq("id", fiadoVinculado.id);
            } catch {}
          }
          nuevosFiados = fiados.filter((f) => f.id !== fiadoVinculado!.id);
          fiadosModificados = true;
          fiadoIdFinal = null;
        }
      }

      if (fiadosModificados) {
        setFiados(nuevosFiados);
        guardarFiadosLocal(nuevosFiados);
      }

      // 3. Actualizar el registro de la salida en Supabase y almacenamiento local
      const payloadBase = {
        producto_id: nuevoProd.id,
        cantidad: cambios.cantidad,
        stock_resultante: nuevoStockResultante,
        nota: notaLimpia,
        created_at: fechaFinal,
      };

      const payloadExtendido = {
        ...payloadBase,
        estado_salida: cambios.estado_salida,
        precio_unitario: cambios.precio_unitario,
        cliente_nombre: clienteLimpio,
        cliente_contacto: contactoLimpio,
        fiado_id: fiadoIdFinal,
      };

      if (MODO === "supabase") {
        try {
          const { error: errUpd } = await db()
            .from("movimientos")
            .update(payloadExtendido)
            .eq("id", id);
          if (errUpd) {
            await db().from("movimientos").update(payloadBase).eq("id", id);
          }
        } catch {}
      }

      const movActualizado: Movimiento = {
        ...movOriginal,
        ...payloadExtendido,
      };

      guardarMetaSalidaLocal(id, {
        estado_salida: cambios.estado_salida,
        precio_unitario: cambios.precio_unitario,
        cliente_nombre: clienteLimpio,
        cliente_contacto: contactoLimpio,
        fiado_id: fiadoIdFinal,
      });

      const nuevosMovs = ordenarMovimientos(
        movimientos.map((m) => (m.id === id ? movActualizado : m))
      );

      setProductos(nuevosProds);
      setMovimientos(nuevosMovs);
      guardarProductosYMovimientosLocal(nuevosProds, nuevosMovs);
    },
    [db, movimientos, productos, fiados]
  );

  const eliminarSalida = useCallback(
    async (id: string) => {
      const mov = movimientos.find((m) => m.id === id);
      if (!mov) return;

      let nuevosProds = [...productos];

      // Si es salida, devolver las unidades al stock del producto
      if (mov.tipo === "salida") {
        const prod = productos.find((p) => p.id === mov.producto_id);
        if (prod) {
          const stockRestaurado = prod.stock + mov.cantidad;
          nuevosProds = ordenar(
            productos.map((p) => (p.id === prod.id ? { ...p, stock: stockRestaurado } : p))
          );

          if (MODO === "supabase") {
            try {
              await db().from("productos").update({ stock: stockRestaurado }).eq("id", prod.id);
            } catch {}
          }
        }

        if (mov.fiado_id) {
          if (MODO === "supabase") {
            try {
              await db().from("fiados").delete().eq("id", mov.fiado_id);
            } catch {}
          }
          const nuevosFiados = fiados.filter((f) => f.id !== mov.fiado_id);
          setFiados(nuevosFiados);
          guardarFiadosLocal(nuevosFiados);
        }
      }

      if (MODO === "supabase") {
        try {
          await db().from("movimientos").delete().eq("id", id);
        } catch {}
      }

      eliminarMetaSalidaLocal(id);

      const nuevosMovs = movimientos.filter((m) => m.id !== id);
      setProductos(nuevosProds);
      setMovimientos(nuevosMovs);
      guardarProductosYMovimientosLocal(nuevosProds, nuevosMovs);
    },
    [db, movimientos, productos, fiados]
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
            nota: datos.nota
              ? `Fiado a ${datos.cliente_nombre}: ${datos.nota}`
              : `Fiado a cliente: ${datos.cliente_nombre}`,
            estado_salida: datos.estado === "pagado" ? "ya_pago" : "fiado",
            precio_unitario: datos.valor_unitario,
            cliente_nombre: datos.cliente_nombre,
            cliente_contacto: datos.cliente_contacto,
            fiado_id: nuevoRegistro.id,
            omitirSyncFiado: true,
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

      // Si existe una salida vinculada a este fiado, actualizar su estado a "ya_pago"
      const movVinculado = movimientos.find((m) => m.fiado_id === id);
      if (movVinculado) {
        if (MODO === "supabase") {
          try {
            await db()
              .from("movimientos")
              .update({ estado_salida: "ya_pago" })
              .eq("id", movVinculado.id);
          } catch {}
        }
        guardarMetaSalidaLocal(movVinculado.id, {
          estado_salida: "ya_pago",
          precio_unitario: movVinculado.precio_unitario,
          cliente_nombre: movVinculado.cliente_nombre,
          cliente_contacto: movVinculado.cliente_contacto,
          fiado_id: movVinculado.fiado_id,
        });
        const movsActualizados = movimientos.map((m) =>
          m.id === movVinculado.id ? { ...m, estado_salida: "ya_pago" as const } : m
        );
        setMovimientos(movsActualizados);
        guardarProductosYMovimientosLocal(productos, movsActualizados);
      }
    },
    [db, fiados, movimientos, productos]
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
        version: 3,
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

        const prods: Producto[] = Array.isArray(datos.productos) ? datos.productos : [];
        const movs: Movimiento[] = Array.isArray(datos.movimientos)
          ? ordenarMovimientos(datos.movimientos)
          : [];
        const fias: RegistroFiado[] = Array.isArray(datos.fiados) ? datos.fiados : [];
        const cats: CategoriaItem[] = Array.isArray(datos.categoriasItems)
          ? datos.categoriasItems
          : CATEGORIAS_POR_DEFECTO;

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
    if (
      confirm(
        "¿Deseas restablecer el inventario con los datos demostrativos iniciales? Se sobreescribirán los datos locales actuales."
      )
    ) {
      const demo = crearDatosDemo();
      setProductos(ordenar(demo.productos));
      setMovimientos(demo.movimientos);
      setFiados(demo.fiados);
      setCategoriasItems(demo.categoriasItems);

      if (typeof window !== "undefined") {
        try {
          localStorage.removeItem(LS_SALIDAS_META_KEY);
        } catch {}
      }
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

  const metricasVentas = useMemo<MetricasVentas>(() => {
    if (!esCliente || movimientos.length === 0) {
      return {
        totalVentasHoy: 0,
        articulosVendidosHoy: 0,
        transaccionesHoy: 0,
        totalVentasSemana: 0,
        articulosVendidosSemana: 0,
        transaccionesSemana: 0,
      };
    }

    const prodsMap = new Map(productos.map((p) => [p.id, p]));
    const ahora = new Date();
    const hoyInicio = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()).getTime();

    const diaSem = ahora.getDay();
    const diffLunes = diaSem === 0 ? 6 : diaSem - 1;
    const semanaInicio = new Date(
      ahora.getFullYear(),
      ahora.getMonth(),
      ahora.getDate() - diffLunes
    ).getTime();

    let totalVentasHoy = 0;
    let articulosVendidosHoy = 0;
    let transaccionesHoy = 0;

    let totalVentasSemana = 0;
    let articulosVendidosSemana = 0;
    let transaccionesSemana = 0;

    for (const m of movimientos) {
      if (m.tipo !== "salida") continue;

      const t = new Date(m.created_at).getTime();
      const prod = prodsMap.get(m.producto_id);
      const precio = m.precio_unitario ?? prod?.precio ?? 0;
      const subtotal = m.cantidad * precio;

      if (t >= hoyInicio) {
        totalVentasHoy += subtotal;
        articulosVendidosHoy += m.cantidad;
        transaccionesHoy++;
      }

      if (t >= semanaInicio) {
        totalVentasSemana += subtotal;
        articulosVendidosSemana += m.cantidad;
        transaccionesSemana++;
      }
    }

    return {
      totalVentasHoy,
      articulosVendidosHoy,
      transaccionesHoy,
      totalVentasSemana,
      articulosVendidosSemana,
      transaccionesSemana,
    };
  }, [esCliente, movimientos, productos]);

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

  const abrirModalMovimiento = useCallback((productoId?: string, tipoInicial?: TipoMovimiento) => {
    setModalMovimiento(productoId ?? "");
    setModalMovimientoTipoInicial(tipoInicial);
  }, []);

  const cerrarModalMovimiento = useCallback(() => {
    setModalMovimiento(null);
    setModalMovimientoTipoInicial(undefined);
  }, []);

  const abrirModalEditarSalida = useCallback(
    (movimiento: Movimiento, estadoPredefinido?: EstadoSalida) => {
      setModalEditarSalida(movimiento);
      setEstadoPredefinidoEditarSalida(estadoPredefinido);
    },
    []
  );

  const cerrarModalEditarSalida = useCallback(() => {
    setModalEditarSalida(null);
    setEstadoPredefinidoEditarSalida(undefined);
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
      metricasVentas,
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
      actualizarSalida,
      eliminarSalida,
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
      modalMovimientoTipoInicial,
      abrirModalMovimiento,
      cerrarModalMovimiento,
      modalEditarSalida,
      estadoPredefinidoEditarSalida,
      abrirModalEditarSalida,
      cerrarModalEditarSalida,
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
      metricasVentas,
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
      actualizarSalida,
      eliminarSalida,
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
      modalMovimientoTipoInicial,
      abrirModalMovimiento,
      cerrarModalMovimiento,
      modalEditarSalida,
      estadoPredefinidoEditarSalida,
      abrirModalEditarSalida,
      cerrarModalEditarSalida,
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
