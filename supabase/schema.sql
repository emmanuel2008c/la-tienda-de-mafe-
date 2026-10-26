-- =============================================================================
--  你好 — Esquema de inventario y Clientes Fijos (Fiados)
--  Ejecútalo una vez en Supabase: Dashboard → SQL Editor → New query → Run
-- =============================================================================

create table if not exists public.productos (
  id            uuid primary key default gen_random_uuid(),
  nombre        text not null,
  sku           text not null default '',
  categoria     text not null default 'General',
  precio        numeric(12, 2) not null default 0 check (precio >= 0),
  costo         numeric(12, 2) not null default 0 check (costo >= 0),
  stock         integer not null default 0 check (stock >= 0),
  stock_minimo  integer not null default 0 check (stock_minimo >= 0),
  created_at    timestamptz not null default now()
);

create table if not exists public.movimientos (
  id               uuid primary key default gen_random_uuid(),
  producto_id      uuid not null references public.productos (id) on delete cascade,
  tipo             text not null check (tipo in ('entrada', 'salida', 'ajuste')),
  cantidad         integer not null check (cantidad >= 0),
  stock_resultante integer not null check (stock_resultante >= 0),
  nota             text,
  created_at       timestamptz not null default now()
);

create index if not exists movimientos_producto_idx on public.movimientos (producto_id);
create index if not exists movimientos_fecha_idx on public.movimientos (created_at desc);

-- -----------------------------------------------------------------------------
-- Tabla: Clientes Fijos / Productos Fiados
-- -----------------------------------------------------------------------------
create table if not exists public.fiados (
  id               uuid primary key default gen_random_uuid(),
  cliente_nombre   text not null,
  cliente_contacto text,
  producto_id      uuid references public.productos (id) on delete set null,
  producto_nombre  text not null,
  cantidad         integer not null check (cantidad > 0),
  valor_unitario   numeric(12, 2) not null default 0 check (valor_unitario >= 0),
  valor_total      numeric(12, 2) not null default 0 check (valor_total >= 0),
  estado           text not null default 'pendiente' check (estado in ('pendiente', 'pagado')),
  nota             text,
  pagado_at        timestamptz,
  created_at       timestamptz not null default now()
);

create index if not exists fiados_cliente_idx on public.fiados (cliente_nombre);
create index if not exists fiados_estado_idx on public.fiados (estado);
create index if not exists fiados_fecha_idx on public.fiados (created_at desc);

-- -----------------------------------------------------------------------------
-- Tabla: Categorías del catálogo
-- -----------------------------------------------------------------------------
create table if not exists public.categorias (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null unique,
  descripcion text,
  icono       text default '🏷️',
  color       text default 'primary',
  created_at  timestamptz not null default now()
);

create index if not exists categorias_nombre_idx on public.categorias (nombre);

-- -----------------------------------------------------------------------------
-- Seguridad (RLS)
-- -----------------------------------------------------------------------------
alter table public.categorias  enable row level security;
alter table public.productos   enable row level security;
alter table public.movimientos enable row level security;
alter table public.fiados      enable row level security;

drop policy if exists "inventario_categorias"  on public.categorias;
drop policy if exists "inventario_productos"   on public.productos;
drop policy if exists "inventario_movimientos" on public.movimientos;
drop policy if exists "inventario_fiados"      on public.fiados;

create policy "inventario_categorias" on public.categorias
  for all to anon, authenticated using (true) with check (true);


create policy "inventario_productos" on public.productos
  for all to anon, authenticated using (true) with check (true);

create policy "inventario_movimientos" on public.movimientos
  for all to anon, authenticated using (true) with check (true);

create policy "inventario_fiados" on public.fiados
  for all to anon, authenticated using (true) with check (true);

-- -----------------------------------------------------------------------------
-- Datos de ejemplo iniciales (Opcional - Descomenta si deseas datos de prueba)
-- -----------------------------------------------------------------------------
-- Las categorías y productos inician vacíos para que crees tu catálogo desde 0 a tu gusto.
-- insert into public.categorias (nombre, icono, descripcion, color) values
--   ('Accesorios',       '👜', 'Bolsos tejidos, aretes y complementos artesanales', 'terracota'),
--   ('Cuidado personal', '🌿', 'Jabones botánicos, bálsamos y cuidado de la piel', 'salvia');

