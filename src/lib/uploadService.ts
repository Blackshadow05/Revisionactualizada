import { v4 as uuidv4 } from 'uuid';

const CHUNK_SIZE = 1024 * 1024; // 1MB
const RENDER_URL = process.env.NEXT_PUBLIC_RENDER_URL;

if (!RENDER_URL) {
  console.error('NEXT_PUBLIC_RENDER_URL no está configurada');
}

export interface UploadProgress {
  status: 'pending' | 'uploading' | 'processing' | 'storing' | 'updating' | 'completed' | 'error';
  progress: number;
  url?: string;
  error?: string;
  message?: string;
}

const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const errorText = await response.text();
    try {
      const errorJson = JSON.parse(errorText);
      throw new Error(errorJson.error || 'Error en la respuesta del servidor');
    } catch {
      throw new Error(errorText || 'Error en la respuesta del servidor');
    }
  }
  return response.json();
};

const checkServerHealth = async () => {
  try {
    if (!RENDER_URL) {
      throw new Error('URL del servidor no configurada');
    }

    console.log('Verificando servidor en:', RENDER_URL);
    const response = await fetch(`${RENDER_URL}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error('El servidor no está respondiendo correctamente');
    }
    
    const data = await response.json();
    return data.status === 'ok';
  } catch (error) {
    console.error('Error al verificar la salud del servidor:', error);
    return false;
  }
};

export const uploadFileInChunks = async (
  file: File,
  id: string,
  onProgress: (progress: UploadProgress) => void
): Promise<string> => {
  if (!RENDER_URL) {
    throw new Error('URL del servidor no configurada');
  }

  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  const uploadId = uuidv4();
  let uploadedChunks = 0;

  try {
    // Verificar conexión con el servidor
    onProgress({
      status: 'pending',
      progress: 0,
      message: 'Verificando conexión con el servidor...'
    });

    const isServerHealthy = await checkServerHealth();
    if (!isServerHealthy) {
      throw new Error('El servidor no está disponible. Por favor, intenta más tarde.');
    }

    // Iniciar la subida
    onProgress({
      status: 'uploading',
      progress: 0,
      message: 'Iniciando subida a Render...'
    });

    const initResponse = await fetch(`${RENDER_URL}/upload/init`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileName: file.name,
        fileSize: file.size,
        uploadId,
        id,
      }),
    });

    await handleResponse(initResponse);

    // Subir cada chunk
    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      const start = chunkIndex * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const chunk = file.slice(start, end);

      const formData = new FormData();
      formData.append('chunk', chunk);
      formData.append('uploadId', uploadId);
      formData.append('chunkIndex', chunkIndex.toString());
      formData.append('totalChunks', totalChunks.toString());

      const uploadResponse = await fetch(`${RENDER_URL}/upload/chunk`, {
        method: 'POST',
        body: formData,
      });

      await handleResponse(uploadResponse);

      uploadedChunks++;
      const progress = (uploadedChunks / totalChunks) * 100;
      onProgress({
        status: 'uploading',
        progress,
        message: `Subiendo a Render: ${Math.round(progress)}%`
      });
    }

    // Finalizar la subida
    onProgress({
      status: 'processing',
      progress: 100,
      message: 'Procesando imagen en Render...'
    });

    const finalizeResponse = await fetch(`${RENDER_URL}/upload/finalize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        uploadId,
        fileName: file.name,
      }),
    });

    const { url } = await handleResponse(finalizeResponse);

    onProgress({
      status: 'storing',
      progress: 100,
      message: 'Almacenando en Cloudinary...'
    });

    // Esperar un momento para simular el almacenamiento en Cloudinary
    await new Promise(resolve => setTimeout(resolve, 1000));

    onProgress({
      status: 'updating',
      progress: 100,
      message: 'Actualizando URL en la base de datos...'
    });

    // Esperar un momento para simular la actualización en Supabase
    await new Promise(resolve => setTimeout(resolve, 500));

    onProgress({
      status: 'completed',
      progress: 100,
      message: '¡Subida completada!',
      url,
    });

    return url;
  } catch (error: any) {
    console.error('Error en la subida:', error);
    onProgress({
      status: 'error',
      progress: 0,
      error: error.message || 'Error desconocido en la subida',
      message: 'Error en la subida'
    });
    throw error;
  }
}; 