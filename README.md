# 🌸 La Tienda de Mafe — Sistema de Control de Inventario & Ventas

Sistema web moderno, rápido y estético para la gestión integral de inventario, stock, movimientos de mercancía y control de clientes fijos (cuentas corrientes / fiados).

Diseñado específicamente para **La Tienda de Mafe**, con soporte para funcionamiento offline mediante **LocalStorage** y sincronización en la nube con **Supabase**, listo para despliegue en **Vercel**.

---

## ✨ Características Principales

1. **📦 Control de Stock & Existencias:**
   - Visualización por productos y tarjetas interactivas.
   - Indicadores de estado de stock en tiempo real: *Óptimo, Normal, Bajo y Agotado*.
   - Barras de progreso de nivel de stock con respecto al umbral mínimo configurado.

2. **⇅ Registro Rápido de Movimientos:**
   - Botón directo para registrar entradas (compras/recepción de mercancía), salidas (ventas) y ajustes (conteo físico).
   - Posibilidad de crear artículos nuevos e ingresar su stock inicial directamente desde la ventana de movimientos.
   - Cálculo automático del stock resultante previsto con validación de inventario insuficiente.

3. **🏷️ Categorías Personalizables desde Cero:**
   - El catálogo inicia limpio para que el comerciante cree sus propias categorías según sus necesidades.
   - Asignación de iconos emoji y colores representativos a cada categoría.
   - Reasignación automática de productos al eliminar una categoría.

4. **📝 Clientes Fijos y Fiados (Cuentas por Cobrar):**
   - Registro de compras fiadas a clientes de confianza.
   - Descuento opcional automático de stock al entregar la mercancía fiada.
   - Marcación de pagos y auditoría de cuentas saldadas.

5. **💾 Persistencia Garantizada:**
   - Persistencia instantánea y síncrona en `LocalStorage` en cada creación, edición o movimiento.
   - Exportación e importación de copias de seguridad en formato JSON.
   - Conexión opcional resiliente con PostgreSQL / Supabase.

---

## 🚀 Despliegue en Vercel (Recomendado)

El proyecto está 100% optimizado para Next.js App Router y Vercel.

### Pasos para desplegar:
1. Conecta tu cuenta de GitHub en [Vercel](https://vercel.com).
2. Importa el repositorio: `https://github.com/emmanuel2008c/la-tienda-de-mafe-.git`
3. Configuración del proyecto en Vercel:
   - **Framework Preset:** `Next.js`
   - **Root Directory:** `./`
   - **Build Command:** `npm run build`
   - **Output Directory:** `.next`
   *(Nota: La aplicación funciona a la perfección aún si no configuras Supabase, guardando todo en el navegador del usuario).*
5. Haz clic en **Deploy**. ¡Listo!

---

## 🛠️ Ejecución Local

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

---

## 🗄️ Esquema de Base de Datos (Supabase)

El script SQL completo para las tablas `productos`, `movimientos`, `fiados` y `categorias` con políticas RLS se encuentra en [`supabase/schema.sql`](supabase/schema.sql).

---

Desarrollado con ❤️ para **La Tienda de Mafe**.
