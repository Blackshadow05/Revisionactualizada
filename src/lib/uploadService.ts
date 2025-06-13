import { v4 as uuidv4 } from 'uuid';

const CHUNK_SIZE = 1024 * 1024; // 1MB por chunk
const RENDER_API_URL = process.env.NEXT_PUBLIC_RENDER_API_URL || 'https://tu-app.onrender.com';

interface UploadProgress {
  progress: number;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  error?: string;
}

export const uploadFileInChunks = async (
  file: File,
  onProgress: (progress: UploadProgress) => void
): Promise<string> => {
  const fileId = uuidv4();
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  let uploadedChunks = 0;

  try {
    // Iniciar la subida
    const initResponse = await fetch(`${RENDER_API_URL}/api/upload/init`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileName: file.name,
        fileSize: file.size,
        fileId,
        totalChunks,
      }),
    });

    if (!initResponse.ok) {
      throw new Error('Error al inicializar la subida');
    }

    // Subir cada chunk
    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      const start = chunkIndex * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const chunk = file.slice(start, end);

      const formData = new FormData();
      formData.append('chunk', chunk);
      formData.append('fileId', fileId);
      formData.append('chunkIndex', chunkIndex.toString());
      formData.append('totalChunks', totalChunks.toString());

      const uploadResponse = await fetch(`${RENDER_API_URL}/api/upload/chunk`, {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error(`Error al subir el chunk ${chunkIndex}`);
      }

      uploadedChunks++;
      onProgress({
        progress: (uploadedChunks / totalChunks) * 100,
        status: 'uploading',
      });
    }

    // Finalizar la subida
    const finalizeResponse = await fetch(`${RENDER_API_URL}/api/upload/finalize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileId,
        fileName: file.name,
      }),
    });

    if (!finalizeResponse.ok) {
      throw new Error('Error al finalizar la subida');
    }

    const { url } = await finalizeResponse.json();
    onProgress({
      progress: 100,
      status: 'completed',
    });

    return url;
  } catch (error) {
    onProgress({
      progress: 0,
      status: 'error',
      error: error instanceof Error ? error.message : 'Error desconocido',
    });
    throw error;
  }
}; 