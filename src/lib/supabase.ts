import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Solo lanzar error en tiempo de ejecución, no durante el build
if (typeof window !== 'undefined') {
  if (!supabaseUrl) throw new Error('Missing Supabase URL');
  if (!supabaseKey) throw new Error('Missing Supabase Key');
}

// Validar la URL de Supabase
const isValidUrl = (url: string) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// Crear el cliente de Supabase solo si la URL es válida
export const supabase = isValidUrl(supabaseUrl) 
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
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