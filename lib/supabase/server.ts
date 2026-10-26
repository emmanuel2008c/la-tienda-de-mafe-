import "server-only";

import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { supabasePublishableKey, supabaseUrl } from "./env";

/**
 * Cliente de Supabase para el SERVIDOR (respeta RLS y la sesión del usuario).
 * Úsalo en Server Components, Server Actions y Route Handlers.
 *
 *   const supabase = await createClient();
 *   const { data: { user } } = await supabase.auth.getUser();
 *
 * Crea uno nuevo en cada petición; no lo guardes en una variable global.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl(), supabasePublishableKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Llamado desde un Server Component (no puede escribir cookies).
          // Es seguro ignorarlo: proxy.ts se encarga de refrescar la sesión.
        }
      },
    },
  });
}

/**
 * Cliente ADMIN con la clave secreta. ⚠ Salta RLS por completo.
 * Solo para tareas de servidor de confianza (webhooks, panel de admin, scripts).
 * Nunca lo importes en código de cliente.
 */
export function createAdminClient() {
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!secretKey || secretKey.includes("XXXX")) {
    throw new Error(
      "[supabase] Falta configurar SUPABASE_SECRET_KEY en el archivo .env"
    );
  }

  return createSupabaseClient(supabaseUrl(), secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
