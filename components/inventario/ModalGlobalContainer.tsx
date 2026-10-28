"use client";

import { estadoSalidaMeta, tipoMeta } from "@/lib/inventario/format";
import { useInventario } from "@/lib/inventario/store";
import { ModalCategoria } from "./ModalCategoria";
import { ModalEditarSalida } from "./ModalEditarSalida";
import { ModalFiado } from "./ModalFiado";
import { ModalMovimiento } from "./ModalMovimiento";
import { ModalProducto } from "./ModalProducto";

export function ModalGlobalContainer() {
  const {
    modalProducto,
    categoriaInicialModalProducto,
    cerrarModalProducto,
    crearProducto,
    actualizarProducto,
    modalMovimiento,
    modalMovimientoTipoInicial,
    cerrarModalMovimiento,
    registrarMovimiento,
    registrarMovimientoConNuevoProducto,
    modalEditarSalida,
    estadoPredefinidoEditarSalida,
    cerrarModalEditarSalida,
    actualizarSalida,
    eliminarSalida,
    modalFiado,
    cerrarModalFiado,
    modalCategoria,
    cerrarModalCategoria,
    productos,
    categorias,
    avisar,
  } = useInventario();

  return (
    <>
      {/* Modal: Registrar Movimiento / Salida */}
      {modalMovimiento !== null && (
        <ModalMovimiento
          productoIdInicial={modalMovimiento}
          tipoInicial={modalMovimientoTipoInicial}
          productos={productos}
          categorias={categorias}
          onCerrar={cerrarModalMovimiento}
          onGuardar={async (nuevo) => {
            await registrarMovimiento(nuevo);
            if (nuevo.tipo === "salida" && nuevo.estado_salida) {
              avisar(
                `Salida registrada (${estadoSalidaMeta[nuevo.estado_salida].etiqueta})`
              );
            } else {
              avisar(tipoMeta[nuevo.tipo].exito);
            }
            cerrarModalMovimiento();
          }}
          onGuardarNuevoProducto={async (datos) => {
            await registrarMovimientoConNuevoProducto(datos);
            avisar("Producto y movimiento registrados con éxito");
            cerrarModalMovimiento();
          }}
        />
      )}

      {/* Modal: Editar Salida Registrada (todos sus aspectos y estado) */}
      {modalEditarSalida !== null && (
        <ModalEditarSalida
          movimiento={modalEditarSalida}
          estadoPredefinido={estadoPredefinidoEditarSalida}
          productos={productos}
          onCerrar={cerrarModalEditarSalida}
          onGuardar={async (id, cambios) => {
            await actualizarSalida(id, cambios);
            avisar(
              `Salida actualizada (${estadoSalidaMeta[cambios.estado_salida].etiqueta})`
            );
            cerrarModalEditarSalida();
          }}
          onEliminar={async (id) => {
            await eliminarSalida(id);
            avisar("Salida eliminada y unidades devueltas al stock");
            cerrarModalEditarSalida();
          }}
        />
      )}

      {/* Modal: Crear / Editar Producto */}
      {modalProducto !== null && (
        <ModalProducto
          producto={modalProducto === "nuevo" ? null : modalProducto}
          categoriasExistentes={categorias}
          categoriaInicial={categoriaInicialModalProducto}
          onCerrar={cerrarModalProducto}
          onGuardar={async (datos) => {
            if (modalProducto === "nuevo") {
              await crearProducto(datos);
              avisar("Producto creado exitosamente");
            } else {
              await actualizarProducto(modalProducto.id, datos);
              avisar("Producto actualizado");
            }
            cerrarModalProducto();
          }}
        />
      )}

      {/* Modal: Registrar Fiado / Cliente Fijo */}
      {modalFiado && <ModalFiado onCerrar={cerrarModalFiado} />}

      {/* Modal: Agregar / Gestionar Categoría */}
      {Boolean(modalCategoria) && (
        <ModalCategoria
          onCerrar={cerrarModalCategoria}
          categoriaInicialParaEditar={
            typeof modalCategoria === "string" ? modalCategoria : undefined
          }
        />
      )}
    </>
  );
}
