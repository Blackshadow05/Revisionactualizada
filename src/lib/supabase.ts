import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Validar la URL de Supabase
const isValidUrl = (url: string | undefined) => {
  if (!url) return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// Crear el cliente de Supabase solo si las variables están disponibles
export const supabase = supabaseUrl && supabaseKey && isValidUrl(supabaseUrl)
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      },
      db: {
        schema: 'public'
      },
      global: {
        headers: {
          'x-application-name': 'revision-casitas'
        }
      }
    })
  : null;

// Función de utilidad para verificar la conexión
export const checkSupabaseConnection = async () => {
  if (!supabase) {
    console.error('Supabase no está configurado correctamente');
    return false;
  }

  try {
    const { data, error } = await supabase.from('revisiones_casitas').select('count').limit(1);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error al verificar la conexión con Supabase:', error);
    return false;
  }
}; 