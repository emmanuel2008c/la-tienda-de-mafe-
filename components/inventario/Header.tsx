"use client";

import { useRef, useState } from "react";
import { useInventario } from "@/lib/inventario/store";

export function HeaderInventario() {
  const {
    modo,
    abrirModalProducto,
    abrirModalMovimiento,
    productos,
    exportarCopiaSeguridad,
    importarCopiaSeguridad,
    restablecerDatosDemo,
  } = useInventario();

  const [menuPersistencia, setMenuPersistencia] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const contenido = event.target?.result as string;
      if (contenido) {
        importarCopiaSeguridad(contenido);
        setMenuPersistencia(false);
      }
    };
    reader.readAsText(file);
    // Limpiar input
    e.target.value = "";
  };

  return (
    <header className="border-b border-border bg-surface/80 backdrop-blur-md sticky top-0 z-30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <span className="eyebrow">Boutique & Taller</span>
            <span
              className={`badge text-[11px] ${
                modo === "supabase" ? "badge-primary" : "badge-accent"
              }`}
              title={
                modo === "supabase"
                  ? "Conectado a la base de datos Supabase y guardado permanente en LocalStorage"
                  : "Guardando en almacenamiento local permanente de este navegador"
              }
            >
              ● {modo === "supabase" ? "Nube Supabase" : "Almacenamiento Local"}
            </span>

            {/* Indicador de persistencia con menú de respaldo */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuPersistencia(!menuPersistencia)}
                className="badge text-[10px] bg-secondary-light/80 hover:bg-secondary-light border border-border text-ink-muted hover:text-ink cursor-pointer transition-colors flex items-center gap-1 py-0.5 px-2"
                title="Opciones de persistencia y copias de seguridad"
              >
                <span>💾 Guardado permanente</span>
                <span className="text-[8px]">▼</span>
              </button>

              {menuPersistencia && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setMenuPersistencia(false)}
                  />
                  <div className="absolute left-0 mt-1 w-64 bg-surface rounded-xl border border-border shadow-warm-lg z-50 p-2 space-y-1 text-xs">
                    <div className="px-3 py-1.5 border-b border-border text-[11px] text-ink-muted">
                      <strong>Persistencia de datos:</strong> Cada cambio se guarda de forma inmediata y automática para tu próxima sesión.
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        exportarCopiaSeguridad();
                        setMenuPersistencia(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-secondary-light/60 flex items-center gap-2 text-ink transition-colors"
                    >
                      <span>📥</span>
                      <span>Descargar copia de respaldo (.json)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-secondary-light/60 flex items-center gap-2 text-ink transition-colors"
                    >
                      <span>📤</span>
                      <span>Restaurar copia de respaldo (.json)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        restablecerDatosDemo();
                        setMenuPersistencia(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-danger-light text-danger flex items-center gap-2 transition-colors border-t border-border mt-1"
                    >
                      <span>🔄</span>
                      <span>Restablecer datos de ejemplo</span>
                    </button>
                  </div>
                </>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif text-ink tracking-tight mt-0.5">
            你好
          </h1>
          <p className="text-xs text-ink-muted hidden sm:block">
            Control de inventario, stock mínimo y registro de movimientos
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            id="btn-header-movimiento"
            type="button"
            onClick={() => abrirModalMovimiento(productos[0]?.id ?? "")}
            className="btn btn-outline btn-sm sm:btn-md"
            title="Registrar entrada, salida o ajuste de inventario"
          >
            ⇅ Registrar movimiento
          </button>
          <button
            id="btn-header-nuevo-producto"
            type="button"
            onClick={() => abrirModalProducto("nuevo")}
            className="btn btn-primary btn-sm sm:btn-md"
          >
            + Nuevo producto
          </button>
        </div>
      </div>
    </header>
  );
}
