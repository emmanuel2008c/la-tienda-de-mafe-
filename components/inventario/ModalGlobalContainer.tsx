"use client";

import { tipoMeta } from "@/lib/inventario/format";
import { useInventario } from "@/lib/inventario/store";
import { ModalCategoria } from "./ModalCategoria";
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
    cerrarModalMovimiento,
    registrarMovimiento,
    registrarMovimientoConNuevoProducto,
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
      {/* Modal: Registrar Movimiento */}
      {modalMovimiento !== null && (
        <ModalMovimiento
          productoIdInicial={modalMovimiento}
          productos={productos}
          categorias={categorias}
          onCerrar={cerrarModalMovimiento}
          onGuardar={async (nuevo) => {
            await registrarMovimiento(nuevo);
            avisar(tipoMeta[nuevo.tipo].exito);
            cerrarModalMovimiento();
          }}
          onGuardarNuevoProducto={async (datos) => {
            await registrarMovimientoConNuevoProducto(datos);
            avisar("Producto y movimiento registrados con éxito");
            cerrarModalMovimiento();
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
