'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface UploadItem {
  id: number;
  fileName: string;
  revisionId: string;
  fieldName: string;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  progress: number;
  url?: string;
  error?: string;
}

export default function EstadoSubidas() {
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkServiceWorker = async () => {
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.ready;
          const channel = new MessageChannel();
          
          channel.port1.onmessage = (event) => {
            setUploads(event.data);
            setLoading(false);
          };

          registration.active?.postMessage(
            { type: 'GET_QUEUE' },
            [channel.port2]
          );
        } catch (error) {
          console.error('Error al obtener el estado de las subidas:', error);
          setLoading(false);
        }
      } else {
        console.error('Service Worker no soportado');
        setLoading(false);
      }
    };

    checkServiceWorker();
    const interval = setInterval(checkServiceWorker, 2000);

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-500';
      case 'error':
        return 'text-red-500';
      case 'uploading':
        return 'text-blue-500';
      default:
        return 'text-yellow-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completado';
      case 'error':
        return 'Error';
      case 'uploading':
        return 'Subiendo';
      default:
        return 'Pendiente';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Estado de Subidas</h1>
        <button
          onClick={() => router.back()}
          className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
        >
          Volver
        </button>
      </div>

      {loading ? (
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4">Cargando estado de subidas...</p>
        </div>
      ) : uploads.length === 0 ? (
        <div className="text-center text-gray-500">
          No hay subidas en progreso
        </div>
      ) : (
        <div className="space-y-4">
          {uploads.map((upload) => (
            <div
              key={upload.id}
              className="bg-white p-4 rounded-lg shadow"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold">{upload.fileName}</h3>
                  <p className="text-sm text-gray-500">
                    Campo: {upload.fieldName}
                  </p>
                </div>
                <span className={`font-medium ${getStatusColor(upload.status)}`}>
                  {getStatusText(upload.status)}
                </span>
              </div>

              {upload.status === 'uploading' && (
                <div className="mt-2">
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className="bg-blue-600 h-2.5 rounded-full"
                      style={{ width: `${upload.progress}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    Progreso: {upload.progress}%
                  </p>
                </div>
              )}

              {upload.status === 'error' && (
                <p className="text-red-500 text-sm mt-2">
                  Error: {upload.error}
                </p>
              )}

              {upload.status === 'completed' && upload.url && (
                <div className="mt-2">
                  <a
                    href={upload.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline text-sm"
                  >
                    Ver imagen
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 