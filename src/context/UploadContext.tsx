'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';

interface UploadStatus {
  id: string;
  revisionId: string;
  fileName: string;
  progress: number;
  status: 'pending' | 'uploading' | 'processing' | 'storing' | 'updating' | 'completed' | 'error';
  error?: string;
  url?: string;
  message?: string;
}

interface UploadContextType {
  uploads: UploadStatus[];
  addUpload: (upload: Omit<UploadStatus, 'id'>) => string;
  updateUpload: (id: string, update: Partial<UploadStatus>) => void;
  removeUpload: (id: string) => void;
  getUploadsByRevision: (id: string) => UploadStatus[];
}

const UploadContext = createContext<UploadContextType | undefined>(undefined);

export function UploadProvider({ children }: { children: React.ReactNode }) {
  const [uploads, setUploads] = useState<UploadStatus[]>([]);

  const addUpload = useCallback((upload: Omit<UploadStatus, 'id'>) => {
    const id = uuidv4();
    setUploads(prev => [...prev, { ...upload, id }]);
    return id;
  }, []);

  const updateUpload = useCallback((id: string, update: Partial<UploadStatus>) => {
    setUploads(prev => prev.map(upload => 
      upload.id === id ? { ...upload, ...update } : upload
    ));
  }, []);

  const removeUpload = useCallback((id: string) => {
    setUploads(prev => prev.filter(upload => upload.id !== id));
  }, []);

  const getUploadsByRevision = useCallback((id: string) => {
    return uploads.filter(upload => upload.revisionId === id);
  }, [uploads]);

  return (
    <UploadContext.Provider value={{
      uploads,
      addUpload,
      updateUpload,
      removeUpload,
      getUploadsByRevision
    }}>
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