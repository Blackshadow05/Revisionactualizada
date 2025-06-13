'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

interface UploadStatus {
  id: string;
  revisionId: string;
  fileName: string;
  progress: number;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error';
  error?: string;
  url?: string;
}

interface UploadContextType {
  uploads: UploadStatus[];
  addUpload: (upload: Omit<UploadStatus, 'id'>) => string;
  updateUpload: (id: string, update: Partial<UploadStatus>) => void;
  removeUpload: (id: string) => void;
  getUploadsByRevision: (revisionId: string) => UploadStatus[];
}

const UploadContext = createContext<UploadContextType | undefined>(undefined);

export function UploadProvider({ children }: { children: React.ReactNode }) {
  const [uploads, setUploads] = useState<UploadStatus[]>([]);

  const addUpload = useCallback((upload: Omit<UploadStatus, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
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

  const getUploadsByRevision = useCallback((revisionId: string) => {
    return uploads.filter(upload => upload.revisionId === revisionId);
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
    throw new Error('useUpload must be used within an UploadProvider');
  }
  return context;
} 