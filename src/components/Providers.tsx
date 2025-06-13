'use client';

import { AuthProvider } from '@/context/AuthContext';
import { UploadProvider } from '@/context/UploadContext';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <UploadProvider>
        {children}
      </UploadProvider>
    </AuthProvider>
  );
} 