import './globals.css'
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { AuthProvider } from '@/context/AuthContext'
import { UploadProvider } from '@/context/UploadContext'
import { ToastProvider } from '@/context/ToastContext'
import UploadIndicator from '@/components/UploadIndicator'
import UploadRecovery from '@/components/UploadRecovery'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Sistema de Revisión de Casitas',
  description: 'Sistema moderno para la gestión y control de revisiones',
  themeColor: '#1a1f35',
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <head>
        {/* Precarga de recursos críticos */}
        <link rel="preconnect" href="https://ik.imagekit.io" />
        <link rel="dns-prefetch" href="https://ik.imagekit.io" />
        <link rel="preconnect" href="https://dhd61lan4.cloudinary.net" />
        <link rel="dns-prefetch" href="https://dhd61lan4.cloudinary.net" />
        
        {/* Fuente optimizada con display swap */}
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        
        {/* PWA optimizada */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#1a1f35" />
        <link rel="icon" type="image/png" sizes="152x152" href="/icons/icon-152x152.png" />
        
        {/* Optimizaciones móviles */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className={inter.className}>
        <AuthProvider>
          <ToastProvider>
                      <UploadProvider>
            {children}
            <UploadIndicator />
            <UploadRecovery />
          </UploadProvider>
          </ToastProvider>
        </AuthProvider>
        
        {/* Registro del Service Worker */}
        <script dangerouslySetInnerHTML={{
          __html: `
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js')
                  .then(reg => console.log('SW registrado:', reg.scope))
                  .catch(err => console.log('SW error:', err));
              });
            }
          `
        }} />
      </body>
    </html>
  )
}
