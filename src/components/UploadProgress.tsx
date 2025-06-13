'use client';

import { useUpload } from '@/context/UploadContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function UploadProgress() {
  const { uploads, hasActiveUploads } = useUpload();
  const router = useRouter();
  const [showProgress, setShowProgress] = useState(false);

  useEffect(() => {
    // Mostrar el progreso si hay subidas activas o completadas
    setShowProgress(uploads.length > 0);
  }, [uploads]);

  if (!showProgress) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-white rounded-lg shadow-lg p-4 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Estado de Subidas</h3>
          <button
            onClick={() => router.push('/progreso-subida')}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            Ver Detalles
          </button>
        </div>
        
        <div className="space-y-3">
          {uploads.map((upload) => (
            <div key={upload.id} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="font-medium truncate max-w-[200px]">{upload.fileName}</span>
                <span className={`${
                  upload.status === 'completed' ? 'text-green-600' :
                  upload.status === 'error' ? 'text-red-600' :
                  'text-yellow-600'
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
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    upload.status === 'completed' ? 'bg-green-600' :
                    upload.status === 'error' ? 'bg-red-600' :
                    'bg-yellow-600'
                  }`}
                  style={{ width: `${upload.progress}%` }}
                />
              </div>
              {upload.message && (
                <p className="text-xs text-gray-600">{upload.message}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 