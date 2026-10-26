"use client";

import { useId, useMemo, useState } from "react";
import { useInventario } from "@/lib/inventario/store";
import type { NuevaCategoria } from "@/lib/inventario/types";

const ICONOS_SUGERIDOS = [
  { emoji: "🕯️", label: "Velas" },
  { emoji: "🌿", label: "Botánica" },
  { emoji: "👜", label: "Accesorios" },
  { emoji: "☕", label: "Hogar" },
  { emoji: "🎁", label: "Regalos" },
  { emoji: "🍵", label: "Despensa" },
  { emoji: "💍", label: "Joyería" },
  { emoji: "👗", label: "Moda" },
  { emoji: "🧼", label: "Cuidado" },
  { emoji: "🎨", label: "Arte" },
  { emoji: "✨", label: "Especial" },
  { emoji: "📦", label: "General" },
];

const COLORES_TAG = [
  { id: "terracota", label: "Terracota", bg: "bg-amber-100 text-amber-900 border-amber-300" },
  { id: "salvia", label: "Salvia", bg: "bg-emerald-100 text-emerald-900 border-emerald-300" },
  { id: "miel", label: "Miel", bg: "bg-yellow-100 text-yellow-900 border-yellow-300" },
  { id: "carmesi", label: "Carmesí", bg: "bg-rose-100 text-rose-900 border-rose-300" },
  { id: "rosa", label: "Rosa", bg: "bg-pink-100 text-pink-900 border-pink-300" },
  { id: "lavanda", label: "Lavanda", bg: "bg-purple-100 text-purple-900 border-purple-300" },
  { id: "carbon", label: "Carbón", bg: "bg-stone-200 text-stone-900 border-stone-400" },
];

export function ModalCategoria({
  onCerrar,
  categoriaInicialParaEditar,
}: {
  onCerrar: () => void;
  categoriaInicialParaEditar?: string;
}) {
  const {
    categoriasDetalle,
    productos,
    crearCategoria,
    editarCategoria,
    eliminarCategoria,
    abrirModalProducto,
    avisar,
  } = useInventario();

  const [pestaña, setPestaña] = useState<"crear" | "gestionar">(
    categoriaInicialParaEditar ? "crear" : "crear"
  );

  // Modo edición
  const [editandoNombre, setEditandoNombre] = useState<string | null>(
    categoriaInicialParaEditar ?? null
  );

  // Formulario
  const catAEditar = useMemo(
    () => categoriasDetalle.find((c) => c.nombre.toLowerCase() === editandoNombre?.toLowerCase()),
    [categoriasDetalle, editandoNombre]
  );

  const [nombre, setNombre] = useState(catAEditar?.nombre ?? "");
  const [icono, setIcono] = useState(catAEditar?.icono ?? "🏷️");
  const [descripcion, setDescripcion] = useState(catAEditar?.descripcion ?? "");
  const [color, setColor] = useState(catAEditar?.color ?? "terracota");
  const [busquedaGestion, setBusquedaGestion] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  const idNombre = useId();
  const idDesc = useId();

  // Conteo de productos por categoría
  const conteoPorCategoria = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const p of productos) {
      const c = p.categoria.trim().toLowerCase();
      mapa.set(c, (mapa.get(c) ?? 0) + 1);
    }
    return mapa;
  }, [productos]);

  const categoriasFiltradas = useMemo(() => {
    const q = busquedaGestion.trim().toLowerCase();
    if (!q) return categoriasDetalle;
    return categoriasDetalle.filter(
      (c) =>
        c.nombre.toLowerCase().includes(q) ||
        (c.descripcion && c.descripcion.toLowerCase().includes(q))
    );
  }, [categoriasDetalle, busquedaGestion]);

  const iniciarEdicion = (cat: typeof catAEditar) => {
    if (!cat) return;
    setEditandoNombre(cat.nombre);
    setNombre(cat.nombre);
    setIcono(cat.icono ?? "🏷️");
    setDescripcion(cat.descripcion ?? "");
    setColor(cat.color ?? "terracota");
    setErrorLocal(null);
    setPestaña("crear");
  };

  const cancelarEdicion = () => {
    setEditandoNombre(null);
    setNombre("");
    setIcono("🏷️");
    setDescripcion("");
    setColor("terracota");
    setErrorLocal(null);
  };

  const handleSubmit = async (e: React.FormEvent, abrirCrearProducto: boolean = false) => {
    e.preventDefault();
    setErrorLocal(null);

    const limpia = nombre.trim();
    if (!limpia) {
      setErrorLocal("Escribe un nombre para la categoría");
      return;
    }

    try {
      setGuardando(true);
      const datos: NuevaCategoria = {
        nombre: limpia,
        icono: icono.trim() || "🏷️",
        descripcion: descripcion.trim() || undefined,
        color,
      };

      if (editandoNombre) {
        await editarCategoria(editandoNombre, datos);
        avisar(`Categoría "${limpia}" actualizada con éxito`);
      } else {
        await crearCategoria(datos);
        avisar(`Categoría "${limpia}" creada con éxito`);
      }

      onCerrar();

      if (abrirCrearProducto) {
        // Abre de inmediato el modal de nuevo producto con esta categoría preseleccionada
        abrirModalProducto("nuevo", limpia);
      }
    } catch (err) {
      setErrorLocal(err instanceof Error ? err.message : "Error al procesar la categoría");
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = async (catNombre: string) => {
    const totalEnUso = conteoPorCategoria.get(catNombre.trim().toLowerCase()) ?? 0;
    const mensaje =
      totalEnUso > 0
        ? `La categoría "${catNombre}" tiene ${totalEnUso} producto(s) asignado(s).\n\n¿Deseas eliminarla? Los productos pasarán automáticamente a la categoría "General".`
        : `¿Estás seguro de que deseas eliminar la categoría "${catNombre}"?`;

    if (confirm(mensaje)) {
      try {
        await eliminarCategoria(catNombre, "General");
        avisar(`Categoría "${catNombre}" eliminada`);
        if (editandoNombre === catNombre) {
          cancelarEdicion();
        }
      } catch (err) {
        avisar(err instanceof Error ? err.message : "Error al eliminar categoría", "error");
      }
    }
  };

  return (
    <div className="modal-backdrop" onClick={onCerrar}>
      <div
        className="modal-card max-w-xl max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-surface">
          <div>
            <span className="eyebrow">Gestión de Catálogo</span>
            <h2 className="text-xl font-serif font-bold text-ink">
              {editandoNombre ? `Editar categoría: ${editandoNombre}` : "Categorías de productos"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            className="text-ink-muted hover:text-ink text-xl font-bold p-1 rounded-lg hover:bg-secondary-light transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Pestañas de navegación */}
        <div className="flex border-b border-border px-6 bg-surface">
          <button
            type="button"
            onClick={() => {
              setPestaña("crear");
            }}
            className={`py-3 px-4 text-sm font-semibold border-b-2 -mb-px transition-colors ${
              pestaña === "crear"
                ? "border-primary text-primary font-bold"
                : "border-transparent text-ink-muted hover:text-ink"
            }`}
          >
            {editandoNombre ? "✏️ Editar detalles" : "+ Nueva categoría"}
          </button>
          <button
            type="button"
            onClick={() => {
              setPestaña("gestionar");
            }}
            className={`py-3 px-4 text-sm font-semibold border-b-2 -mb-px transition-colors flex items-center gap-1.5 ${
              pestaña === "gestionar"
                ? "border-primary text-primary font-bold"
                : "border-transparent text-ink-muted hover:text-ink"
            }`}
          >
            <span>▦ Todas las categorías</span>
            <span className="badge badge-accent text-[11px] py-0 px-1.5">
              {categoriasDetalle.length}
            </span>
          </button>
        </div>

        {/* Contenido según pestaña activa */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {errorLocal && (
            <div className="p-3 text-xs rounded-lg bg-danger-light text-danger border border-danger/30 flex items-center justify-between">
              <span>{errorLocal}</span>
              <button
                type="button"
                onClick={() => setErrorLocal(null)}
                className="font-bold ml-2 text-danger hover:underline"
              >
                ✕
              </button>
            </div>
          )}

          {pestaña === "crear" ? (
            <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-5">
              {/* Tarjeta de previsualización en tiempo real */}
              <div className="p-4 rounded-xl bg-secondary-light/40 border border-border flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl p-2.5 bg-surface rounded-xl border border-border shadow-warm-sm">
                    {icono || "🏷️"}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-ink text-base">
                        {nombre.trim() || "Nombre de categoría"}
                      </h4>
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${
                          COLORES_TAG.find((c) => c.id === color)?.bg ?? "bg-surface"
                        }`}
                      >
                        {COLORES_TAG.find((c) => c.id === color)?.label ?? "Etiqueta"}
                      </span>
                    </div>
                    <p className="text-xs text-ink-muted line-clamp-1 mt-0.5">
                      {descripcion.trim() || "Sin descripción asignada"}
                    </p>
                  </div>
                </div>
                <div className="text-right text-xs text-ink-muted hidden sm:block">
                  <span className="font-semibold text-ink">
                    {editandoNombre
                      ? `${conteoPorCategoria.get(editandoNombre.toLowerCase()) ?? 0} refs`
                      : "0 refs"}
                  </span>
                  <div className="text-[10px]">asociadas</div>
                </div>
              </div>

              {/* Nombre de la categoría */}
              <div>
                <label htmlFor={idNombre} className="label">
                  Nombre de la categoría *
                </label>
                <input
                  id={idNombre}
                  type="text"
                  required
                  autoFocus
                  className="input"
                  placeholder="Ej: Joyería, Papelería, Cosméticos naturales…"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                />
              </div>

              {/* Selector de Icono / Emoji */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="label mb-0">Icono representativo</label>
                  <span className="text-xs text-ink-muted">Haz clic o escribe uno personalizado</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {ICONOS_SUGERIDOS.map((item) => (
                    <button
                      key={item.emoji}
                      type="button"
                      onClick={() => setIcono(item.emoji)}
                      className={`text-xl p-2 rounded-lg border transition-transform hover:scale-110 ${
                        icono === item.emoji
                          ? "bg-surface border-primary ring-2 ring-primary/20 shadow-warm-sm"
                          : "bg-surface/50 border-border hover:bg-surface"
                      }`}
                      title={item.label}
                    >
                      {item.emoji}
                    </button>
                  ))}
                  <div className="flex items-center gap-1.5 ml-auto">
                    <span className="text-xs text-ink-muted">Otro:</span>
                    <input
                      type="text"
                      className="input w-12 text-center text-lg h-9 p-0"
                      maxLength={4}
                      value={icono}
                      onChange={(e) => setIcono(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Paleta de Color temática */}
              <div className="space-y-2">
                <label className="label mb-0">Estilo de color</label>
                <div className="flex flex-wrap gap-2">
                  {COLORES_TAG.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setColor(c.id)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                        color === c.id
                          ? `${c.bg} font-bold ring-2 ring-primary/40 shadow-warm-sm scale-105`
                          : "bg-surface border-border text-ink-muted hover:text-ink"
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Descripción breve */}
              <div>
                <label htmlFor={idDesc} className="label">
                  Descripción o notas (opcional)
                </label>
                <textarea
                  id={idDesc}
                  rows={2}
                  className="input py-2 text-sm"
                  placeholder="Detalles sobre qué artículos pertenecen a este grupo o materiales…"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                />
              </div>

              {/* Botones de acción */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-border">
                {editandoNombre ? (
                  <button
                    type="button"
                    onClick={cancelarEdicion}
                    className="btn btn-ghost btn-sm text-ink-muted"
                  >
                    ← Cancelar edición
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setPestaña("gestionar")}
                    className="text-xs text-primary font-semibold hover:underline"
                  >
                    Ver todas las categorías ({categoriasDetalle.length}) →
                  </button>
                )}

                <div className="flex items-center gap-2 ml-auto">
                  <button type="button" onClick={onCerrar} className="btn btn-ghost btn-sm">
                    Cerrar
                  </button>

                  {!editandoNombre && (
                    <button
                      type="button"
                      disabled={guardando || !nombre.trim()}
                      onClick={(e) => handleSubmit(e, true)}
                      className="btn btn-outline btn-sm"
                      title="Guarda la categoría y abre inmediatamente el formulario para crear su primer producto"
                    >
                      Guardar y añadir producto
                    </button>
                  )}

                  <button
                    type="submit"
                    disabled={guardando || !nombre.trim()}
                    className="btn btn-primary btn-sm"
                  >
                    {guardando
                      ? "Guardando…"
                      : editandoNombre
                      ? "Actualizar categoría"
                      : "Guardar categoría"}
                  </button>
                </div>
              </div>
            </form>
          ) : (
            /* ================= PESTAÑA: GESTIONAR CATEGORÍAS ================= */
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <input
                  type="search"
                  className="input input-pill text-xs h-9 flex-1"
                  placeholder="Buscar en el catálogo de categorías…"
                  value={busquedaGestion}
                  onChange={(e) => setBusquedaGestion(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => {
                    cancelarEdicion();
                    setPestaña("crear");
                  }}
                  className="btn btn-primary btn-sm h-9 px-3 text-xs whitespace-nowrap"
                >
                  + Nueva categoría
                </button>
              </div>

              <div className="divide-y divide-border border border-border rounded-xl overflow-hidden bg-surface shadow-warm-sm">
                {categoriasFiltradas.length === 0 ? (
                  <div className="p-8 text-center text-ink-muted text-sm space-y-3">
                    <span className="text-3xl block">🏷️</span>
                    <p className="font-semibold text-ink">
                      {categoriasDetalle.length === 0
                        ? "Aún no has creado ninguna categoría."
                        : "No se encontraron categorías que coincidan con la búsqueda."}
                    </p>
                    <p className="text-xs text-ink-muted max-w-xs mx-auto">
                      {categoriasDetalle.length === 0
                        ? "Define tus categorías a tu propio gusto para empezar a organizar tu inventario."
                        : "Intenta con otro término o limpia el buscador."}
                    </p>
                    {categoriasDetalle.length === 0 ? (
                      <button
                        type="button"
                        onClick={() => {
                          cancelarEdicion();
                          setPestaña("crear");
                        }}
                        className="btn btn-primary btn-sm"
                      >
                        + Crear primera categoría
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setBusquedaGestion("")}
                        className="btn btn-ghost btn-xs text-primary"
                      >
                        Limpiar búsqueda
                      </button>
                    )}
                  </div>
                ) : (
                  categoriasFiltradas.map((cat) => {
                    const totalProds =
                      conteoPorCategoria.get(cat.nombre.trim().toLowerCase()) ?? 0;
                    const estiloColor =
                      COLORES_TAG.find((c) => c.id === cat.color)?.bg ??
                      "bg-secondary-light text-ink border-border";

                    return (
                      <div
                        key={cat.id || cat.nombre}
                        className="p-3.5 flex items-center justify-between gap-3 hover:bg-secondary-light/30 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-2xl p-2 bg-surface rounded-lg border border-border shadow-xs">
                            {cat.icono || "🏷️"}
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-ink text-sm truncate">
                                {cat.nombre}
                              </span>
                              <span
                                className={`text-[10px] px-2 py-0.2 rounded-full border font-medium ${estiloColor}`}
                              >
                                {totalProds} {totalProds === 1 ? "artículo" : "artículos"}
                              </span>
                            </div>
                            {cat.descripcion && (
                              <p className="text-xs text-ink-muted line-clamp-1 mt-0.5">
                                {cat.descripcion}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              onCerrar();
                              abrirModalProducto("nuevo", cat.nombre);
                            }}
                            title={`Añadir un producto en ${cat.nombre}`}
                            className="btn btn-outline btn-xs px-2.5 text-[11px] h-7"
                          >
                            + Producto
                          </button>
                          <button
                            type="button"
                            onClick={() => iniciarEdicion(cat)}
                            title="Editar nombre e icono"
                            className="btn btn-ghost btn-xs px-2 text-[11px] h-7"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEliminar(cat.nombre)}
                            title="Eliminar categoría"
                            className="btn btn-ghost btn-xs px-2 text-danger hover:bg-danger-light h-7"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="flex items-center justify-between pt-2 text-xs text-ink-muted">
                <span>
                  Total: <strong>{categoriasDetalle.length}</strong> categorías registradas
                </span>
                <button type="button" onClick={onCerrar} className="btn btn-ghost btn-sm">
                  Cerrar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
