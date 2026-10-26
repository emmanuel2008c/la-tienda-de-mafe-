import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refresca la sesión de Supabase en cada petición y sincroniza las cookies
 * entre la request y la response. Lo invoca proxy.ts.
 */
export async function updateSession(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  // Si aún no se configuró .env, no bloquear el sitio.
  if (!url || !key || url.includes("TU-PROYECTO") || key.includes("XXXX")) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
        // Evita que una CDN cachee respuestas con cookies de sesión.
        Object.entries(headers ?? {}).forEach(([key, value]) =>
          response.headers.set(key, value)
        );
      },
    },
  });

  // IMPORTANTE: no pongas código entre createServerClient y getUser().
  // getUser() valida el token con Supabase y lo refresca si caducó.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Ejemplo: proteger rutas privadas (descomenta y ajusta cuando tengas login).
  // if (!user && request.nextUrl.pathname.startsWith("/cuenta")) {
  //   const loginUrl = request.nextUrl.clone();
  //   loginUrl.pathname = "/login";
  //   return NextResponse.redirect(loginUrl);
  // }
  void user;

  return response;
}
