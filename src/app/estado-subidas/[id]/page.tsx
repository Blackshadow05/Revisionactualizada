'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUpload } from '@/context/UploadContext';
import { supabase } from '@/lib/supabase';

interface Revision {
  id: string;
  casita: string;
  created_at: string;
  evidencia_01: string | null;
  evidencia_02: string | null;
  evidencia_03: string | null;
}

export default function EstadoSubidas() {
  const params = useParams();
  const router = useRouter();
  const { getUploadsByRevision } = useUpload();
  const [revision, setRevision] = useState<Revision | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      } catch (error: any) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchRevision();
  }, [params.id]);

  const uploads = getUploadsByRevision(params.id as string);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a1f35] to-[#2d364c] flex items-center justify-center">
        <div className="text-white">Cargando...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a1f35] to-[#2d364c] flex items-center justify-center">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#1a1f35] to-[#2d364c] py-8 md:py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#2a3347] rounded-xl shadow-2xl p-4 md:p-8 border border-[#3d4659]">
          <div className="flex justify-between items-center mb-6 md:mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-[#c9a45c]">
              Estado de Subidas - Casita {revision?.casita}
            </h1>
            <button
              onClick={() => router.push('/')}
              className="px-3 py-1 md:px-4 md:py-2 text-sm text-[#1a1f35] bg-gradient-to-br from-[#c9a45c] via-[#d4b06c] to-[#f0c987] rounded-xl hover:from-[#d4b06c] hover:via-[#e0bc7c] hover:to-[#f7d498] transform hover:scale-[1.02] transition-all duration-200"
            >
              Volver
            </button>
          </div>

          <div className="space-y-4">
            {uploads.map((upload) => (
              <div
                key={upload.id}
                className="bg-[#1a1f35] rounded-lg p-4 border border-[#3d4659]"
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="text-white font-medium">{upload.fileName}</span>
                  <span className={`px-2 py-1 rounded text-sm ${
                    upload.status === 'completed' ? 'bg-green-500 text-white' :
                    upload.status === 'error' ? 'bg-red-500 text-white' :
                    'bg-yellow-500 text-white'
                  }`}>
                    {upload.status === 'completed' ? 'Completado' :
                     upload.status === 'error' ? 'Error' :
                     'En progreso'}
                  </span>
                </div>
                {upload.status === 'pending' && (
                  <div className="w-full bg-[#2d364c] rounded-full h-2.5">
                    <div
                      className="bg-[#c9a45c] h-2.5 rounded-full transition-all duration-300"
                      style={{ width: `${upload.progress}%` }}
                    />
                  </div>
                )}
                {upload.error && (
                  <p className="text-red-500 text-sm mt-2">{upload.error}</p>
                )}
                {upload.url && (
                  <a
                    href={upload.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#c9a45c] hover:text-[#d4b06c] text-sm mt-2 inline-block"
                  >
                    Ver imagen
                  </a>
                )}
              </div>
            ))}

            {uploads.length === 0 && (
              <div className="text-white text-center py-8">
                No hay subidas en progreso
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
} 