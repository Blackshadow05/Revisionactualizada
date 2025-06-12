import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Las variables de entorno NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY son requeridas');
}

const supabase = createClient(supabaseUrl, supabaseKey);

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    if (!supabase) {
      throw new Error('No se pudo conectar con la base de datos');
    }

    console.log('Buscando revisión con ID:', params.id);
    
    if (!params.id) {
      return NextResponse.json(
        { error: 'ID no proporcionado' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('revisiones_casitas')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error) {
      console.error('Error de Supabase:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Revisión no encontrada' },
        { status: 404 }
      );
    }

    console.log('Datos encontrados:', data);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error en el servidor:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 