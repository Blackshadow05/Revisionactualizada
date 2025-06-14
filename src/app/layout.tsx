import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { AuthProvider } from '@/context/AuthContext'
import { UploadProvider } from '@/context/UploadContext'
import { ToastProvider } from '@/context/ToastContext'
import UploadIndicator from '@/components/UploadIndicator'
import UploadRecovery from '@/components/UploadRecovery'
import PWARegister from '@/components/PWARegister'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Sistema de Revisión de Casitas',
  description: 'Sistema moderno para la gestión y control de revisiones',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Revision Casitas',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#c9a45c',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#c9a45c" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Casitas" />
        <meta name="application-name" content="Revisión de Casitas" />
        <meta name="msapplication-TileColor" content="#c9a45c" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
        <link rel="icon" type="image/png" sizes="152x152" href="/icons/icon-152x152.png" />
        <link rel="apple-touch-icon" href="/icons/icon-152x152.png" />
      </head>
      <body className={inter.className}>
        <AuthProvider>
          <ToastProvider>
            <UploadProvider>
              {children}
              <UploadIndicator />
              <UploadRecovery />
              <PWARegister />
            </UploadProvider>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
