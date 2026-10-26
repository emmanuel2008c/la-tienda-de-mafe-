/**
 * Lectura centralizada y validada de las variables de Supabase.
 * Falla con un mensaje claro si falta alguna, en lugar de errores crípticos.
 */

function required(name: string, value: string | undefined): string {
  if (!value || value.includes("TU-PROYECTO") || value.includes("XXXX")) {
    throw new Error(
      `[supabase] Falta configurar la variable de entorno ${name} en el archivo .env`
    );
  }
  return value;
}

// Nota: las NEXT_PUBLIC_* deben leerse de forma literal (process.env.NOMBRE)
// para que Next.js las incruste en el bundle del navegador.
export const supabaseUrl = () =>
  required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);

export const supabasePublishableKey = () =>
  required(
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );
