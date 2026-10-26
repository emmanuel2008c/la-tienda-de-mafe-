import { createBrowserClient } from "@supabase/ssr";
import { supabasePublishableKey, supabaseUrl } from "./env";

/**
 * Cliente de Supabase para el NAVEGADOR.
 * Úsalo en Client Components ("use client"): formularios de login, realtime, etc.
 *
 *   const supabase = createClient();
 *   const { data } = await supabase.from("productos").select("*");
 */
export function createClient() {
  return createBrowserClient(supabaseUrl(), supabasePublishableKey());
}
