'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { uploadFileInChunks } from '@/lib/uploadService';

interface UploadProgress {
  id: string;
  fileName: string;
  progress: number;
  status: 'pending' | 'uploading' | 'processing' | 'storing' | 'updating' | 'completed' | 'error';
  message?: string;
}

interface UploadContextType {
  uploads: UploadProgress[];
  addUpload: (file: File, revisionId: string) => Promise<void>;
  clearUploads: () => void;
  hasActiveUploads: boolean;
}

const UploadContext = createContext<UploadContextType | undefined>(undefined);

export function UploadProvider({ children }: { children: React.ReactNode }) {
  const [uploads, setUploads] = useState<UploadProgress[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('uploadProgress');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('uploadProgress', JSON.stringify(uploads));
    }
  }, [uploads]);

  const addUpload = async (file: File, revisionId: string) => {
    const uploadId = `${revisionId}-${file.name}`;
    
    // Verificar si ya existe una subida con el mismo ID
    const existingUpload = uploads.find(u => u.id === uploadId);
    if (existingUpload && existingUpload.status === 'completed') {
      return; // No permitir subir el mismo archivo si ya está completado
    }

    setUploads(prev => [
      ...prev.filter(u => u.id !== uploadId), // Remover si existe
      {
        id: uploadId,
        fileName: file.name,
        progress: 0,
        status: 'pending',
        message: 'Verificando conexión con el servidor...'
      }
    ]);

    try {
      await uploadFileInChunks(file, revisionId, (progress, status, message) => {
        setUploads(prev => 
          prev.map(upload => 
            upload.id === uploadId 
              ? { ...upload, progress, status, message } 
              : upload
          )
        );
      });
    } catch (error) {
      console.error('Error en la subida:', error);
      setUploads(prev => 
        prev.map(upload => 
          upload.id === uploadId 
            ? { ...upload, status: 'error', message: 'Error en la subida' } 
            : upload
        )
      );
    }
  };

  const clearUploads = () => {
    setUploads([]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('uploadProgress');
    }
  };

  const hasActiveUploads = uploads.some(
    upload => ['pending', 'uploading', 'processing', 'storing', 'updating'].includes(upload.status)
  );

  return (
    <UploadContext.Provider value={{ uploads, addUpload, clearUploads, hasActiveUploads }}>
      {children}
    </UploadContext.Provider>
  );
}

export function useUpload() {
  const context = useContext(UploadContext);
  if (context === undefined) {
    throw new Error('useUpload debe ser usado dentro de un UploadProvider');
  }
  return context;
} 