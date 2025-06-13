'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useUpload } from '@/context/UploadContext';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface Revision {
  id: string;
  nombre: string;
  fecha: string;
  estado: string;
  evidencia_01?: string;
  evidencia_02?: string;
  evidencia_03?: string;
}

export default function EstadoSubidas() {
  const params = useParams();
  const router = useRouter();
  const { uploads } = useUpload();
  const [revision, setRevision] = useState<Revision | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClientComponentClient();

  useEffect(() => {
    const fetchRevision = async () => {
      try {
        const { data, error } = await supabase
          .from('revisiones_casitas')
          .select('*')
          .eq('id', params.id)
          .single();

        if (error) throw error;
        setRevision(data);
      } catch (err) {
        setError('Error al cargar la revisión');
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRevision();
  }, [params.id, supabase]);

  // Filtrar las subidas relacionadas con esta revisión
  const revisionUploads = uploads.filter(upload => upload.id.startsWith(params.id as string));

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1e2538] flex items-center justify-center">
        <div className="text-white">Cargando...</div>
      </div>
    );
  }

  if (error || !revision) {
    return (
      <div className="min-h-screen bg-[#1e2538] flex items-center justify-center">
        <div className="text-red-500">{error || 'Revisión no encontrada'}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1e2538] p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-white">Estado de Subidas - {revision.nombre}</h1>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-[#c9a45c] text-white rounded hover:bg-[#b8934a] transition-colors"
          >
            Volver
          </button>
        </div>

        <div className="space-y-6">
          {revisionUploads.map((upload) => (
            <div key={upload.id} className="bg-[#2a3347] rounded-lg p-6 border border-[#3d4659]">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-white">{upload.fileName}</h3>
                <span className={`px-3 py-1 rounded-full text-sm ${
                  upload.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                  upload.status === 'error' ? 'bg-red-500/20 text-red-400' :
                  'bg-yellow-500/20 text-yellow-400'
                }`}>
                  {upload.status === 'completed' ? 'Completado' :
                   upload.status === 'error' ? 'Error' :
                   upload.status === 'pending' ? 'Pendiente' :
                   upload.status === 'uploading' ? 'Subiendo...' :
                   upload.status === 'processing' ? 'Procesando...' :
                   upload.status === 'storing' ? 'Almacenando...' :
                   upload.status === 'updating' ? 'Actualizando...' :
                   'En progreso'}
                </span>
              </div>

              <div className="w-full bg-[#1e2538] rounded-full h-2 mb-4">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    upload.status === 'error'
                      ? 'bg-red-500'
                      : upload.status === 'completed'
                      ? 'bg-green-500'
                      : 'bg-[#c9a45c]'
                  }`}
                  style={{ width: `${upload.progress}%` }}
                />
              </div>

              {upload.message && (
                <p className="text-sm text-gray-400">{upload.message}</p>
              )}
            </div>
          ))}

          {revisionUploads.length === 0 && (
            <div className="text-center text-gray-400 py-8">
              No hay subidas activas para esta revisión
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 