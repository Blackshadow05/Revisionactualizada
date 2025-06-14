'use client';

import { useState, useEffect } from 'react';

interface DiagnosticInfo {
  [key: string]: any;
}

export default function PWADiagnostic() {
  const [diagnosticInfo, setDiagnosticInfo] = useState<DiagnosticInfo>({});
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const checkPWAStatus = () => {
      const info = {
        // Información del navegador
        userAgent: navigator.userAgent,
        isChrome: /Chrome/.test(navigator.userAgent),
        isAndroid: /Android/.test(navigator.userAgent),
        
        // Estado de PWA
        isStandalone: window.matchMedia('(display-mode: standalone)').matches,
        isInstalled: window.matchMedia('(display-mode: standalone)').matches,
        
        // Service Worker
        serviceWorkerSupported: 'serviceWorker' in navigator,
        serviceWorkerRegistered: false,
        
        // Manifest
        manifestSupported: 'manifest' in window.document.createElement('link'),
        
        // Protocolo
        isHTTPS: location.protocol === 'https:',
        
        // Características PWA
        hasBeforeInstallPrompt: 'onbeforeinstallprompt' in window,
        
        // URLs
        currentURL: window.location.href,
        manifestURL: window.location.origin + '/manifest.json'
      };

      // Verificar Service Worker
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(registrations => {
          setDiagnosticInfo(prev => ({
            ...prev,
            serviceWorkerRegistered: registrations.length > 0,
            serviceWorkerCount: registrations.length
          }));
        });
      }

      setDiagnosticInfo(info);
    };

    checkPWAStatus();

    // Escuchar eventos PWA
    const handleBeforeInstallPrompt = (e: any) => {
      setDiagnosticInfo(prev => ({
        ...prev,
        beforeInstallPromptTriggered: true,
        beforeInstallPromptPlatforms: e.platforms
      }));
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const testManifest = async () => {
    try {
      const response = await fetch('/manifest.json');
      const manifest = await response.json();
      setDiagnosticInfo(prev => ({
        ...prev,
        manifestLoaded: true,
        manifestContent: manifest
      }));
    } catch (error) {
      setDiagnosticInfo(prev => ({
        ...prev,
        manifestLoaded: false,
        manifestError: error instanceof Error ? error.message : 'Error desconocido'
      }));
    }
  };

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 left-4 bg-red-500 text-white px-3 py-2 rounded text-xs z-50"
      >
        🔍 PWA Debug
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white text-black rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Diagnóstico PWA</h2>
          <button
            onClick={() => setIsVisible(false)}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Estado del Navegador:</h3>
            <div className="text-sm space-y-1">
              <div className={diagnosticInfo.isChrome ? 'text-green-600' : 'text-red-600'}>
                ✓ Chrome: {diagnosticInfo.isChrome ? 'SÍ' : 'NO'}
              </div>
              <div className={diagnosticInfo.isAndroid ? 'text-green-600' : 'text-red-600'}>
                ✓ Android: {diagnosticInfo.isAndroid ? 'SÍ' : 'NO'}
              </div>
              <div className={diagnosticInfo.isHTTPS ? 'text-green-600' : 'text-red-600'}>
                ✓ HTTPS: {diagnosticInfo.isHTTPS ? 'SÍ' : 'NO'}
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Estado PWA:</h3>
            <div className="text-sm space-y-1">
              <div className={diagnosticInfo.isInstalled ? 'text-green-600' : 'text-orange-600'}>
                ✓ Instalada: {diagnosticInfo.isInstalled ? 'SÍ' : 'NO'}
              </div>
              <div className={diagnosticInfo.serviceWorkerSupported ? 'text-green-600' : 'text-red-600'}>
                ✓ Service Worker Soportado: {diagnosticInfo.serviceWorkerSupported ? 'SÍ' : 'NO'}
              </div>
              <div className={diagnosticInfo.serviceWorkerRegistered ? 'text-green-600' : 'text-red-600'}>
                ✓ Service Worker Registrado: {diagnosticInfo.serviceWorkerRegistered ? 'SÍ' : 'NO'}
              </div>
              <div className={diagnosticInfo.hasBeforeInstallPrompt ? 'text-green-600' : 'text-red-600'}>
                ✓ Install Prompt Disponible: {diagnosticInfo.hasBeforeInstallPrompt ? 'SÍ' : 'NO'}
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Eventos PWA:</h3>
            <div className="text-sm space-y-1">
              <div className={diagnosticInfo.beforeInstallPromptTriggered ? 'text-green-600' : 'text-orange-600'}>
                ✓ BeforeInstallPrompt Activado: {diagnosticInfo.beforeInstallPromptTriggered ? 'SÍ' : 'NO'}
              </div>
              {diagnosticInfo.beforeInstallPromptPlatforms && (
                <div className="text-blue-600">
                  Plataformas: {diagnosticInfo.beforeInstallPromptPlatforms.join(', ')}
                </div>
              )}
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">URLs:</h3>
            <div className="text-sm space-y-1">
              <div>Actual: {diagnosticInfo.currentURL}</div>
              <div>Manifest: {diagnosticInfo.manifestURL}</div>
            </div>
          </div>

          <div>
            <button
              onClick={testManifest}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Probar Manifest
            </button>
            {diagnosticInfo.manifestLoaded !== undefined && (
              <div className={`mt-2 text-sm ${diagnosticInfo.manifestLoaded ? 'text-green-600' : 'text-red-600'}`}>
                Manifest: {diagnosticInfo.manifestLoaded ? 'CARGADO' : 'ERROR'}
                {diagnosticInfo.manifestError && <div>Error: {diagnosticInfo.manifestError}</div>}
              </div>
            )}
          </div>

          <div className="pt-4 border-t">
            <h3 className="font-semibold mb-2">Soluciones Recomendadas:</h3>
            <div className="text-sm space-y-2">
              {!diagnosticInfo.isChrome && (
                <div className="text-red-600">• Usar Google Chrome</div>
              )}
              {!diagnosticInfo.isHTTPS && (
                <div className="text-red-600">• Necesita HTTPS</div>
              )}
              {!diagnosticInfo.serviceWorkerRegistered && (
                <div className="text-red-600">• Service Worker no registrado</div>
              )}
              {!diagnosticInfo.beforeInstallPromptTriggered && (
                <div className="text-orange-600">• Interactuar más con la página</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 