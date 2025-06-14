const CACHE_NAME = 'revision-casitas-v1';
const DB_NAME = 'RevisionCasitasDB';
const DB_VERSION = 1;
const STORE_NAME = 'uploadQueue';

// Abrir IndexedDB
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
  });
}

// Procesar cola de subidas
async function processUploadQueue() {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('status');
    
    const pendingUploads = await new Promise((resolve, reject) => {
      const request = index.getAll('pending');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    // Procesar máximo 3 subidas simultáneas
    const activeUploads = pendingUploads.slice(0, 3);
    
    for (const upload of activeUploads) {
      uploadToCloudinary(upload);
    }
  } catch (error) {
    console.error('Error procesando cola de subidas:', error);
  }
}

// Subir a Cloudinary
async function uploadToCloudinary(uploadItem) {
  try {
    // Actualizar estado a "uploading"
    await updateUploadStatus(uploadItem.id, 'uploading', { progress: 0 });
    
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const week = `semana_${getWeekNumber(now)}`;
    const folder = `prueba-imagenes/${month}/${week}`;

    const formData = new FormData();
    formData.append('file', uploadItem.file);
    formData.append('upload_preset', 'ml_default');
    formData.append('cloud_name', 'dhd61lan4');
    formData.append('folder', folder);

    const response = await fetch('https://api.cloudinary.com/v1_1/dhd61lan4/image/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Error al subir imagen a Cloudinary');
    }

    const data = await response.json();
    // Agregar optimizaciones automáticas f_auto,q_auto a la URL
    const originalUrl = data.secure_url;
    const finalUrl = originalUrl.replace('/upload/', '/upload/f_auto,q_auto/');

    // Actualizar Supabase
    await updateSupabaseRecord(uploadItem.recordId, uploadItem.fieldName, finalUrl);
    
    // Marcar como completado
    await updateUploadStatus(uploadItem.id, 'completed', { 
      url: finalUrl, 
      completedAt: new Date().toISOString() 
    });

    // Notificar a la aplicación
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'UPLOAD_COMPLETED',
          uploadId: uploadItem.id,
          url: finalUrl,
          recordId: uploadItem.recordId,
          fieldName: uploadItem.fieldName
        });
      });
    });

  } catch (error) {
    console.error('Error subiendo imagen:', error);
    
    // Incrementar intentos
    const retryCount = (uploadItem.retryCount || 0) + 1;
    const maxRetries = 3;
    
    if (retryCount < maxRetries) {
      // Programar reintento con backoff exponencial
      const delay = Math.pow(2, retryCount) * 1000; // 2s, 4s, 8s
      setTimeout(() => {
        updateUploadStatus(uploadItem.id, 'pending', { retryCount });
      }, delay);
    } else {
      // Marcar como error después de 3 intentos
      await updateUploadStatus(uploadItem.id, 'error', { 
        error: error.message,
        failedAt: new Date().toISOString()
      });
      
      // Notificar error
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'UPLOAD_ERROR',
            uploadId: uploadItem.id,
            error: error.message
          });
        });
      });
    }
  }
}

// Actualizar estado de subida
async function updateUploadStatus(id, status, additionalData = {}) {
  const db = await openDB();
  const transaction = db.transaction([STORE_NAME], 'readwrite');
  const store = transaction.objectStore(STORE_NAME);
  
  const request = store.get(id);
  request.onsuccess = () => {
    const upload = request.result;
    if (upload) {
      upload.status = status;
      upload.updatedAt = new Date().toISOString();
      Object.assign(upload, additionalData);
      store.put(upload);
    }
  };
}

// Actualizar registro en Supabase
async function updateSupabaseRecord(recordId, fieldName, url) {
  // Esta función será llamada desde el cliente principal
  // El SW no puede acceder directamente a Supabase por CORS
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({
        type: 'UPDATE_SUPABASE',
        recordId,
        fieldName,
        url
      });
    });
  });
}

// Función auxiliar para obtener número de semana
function getWeekNumber(date) {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

// URLs críticas para cache offline
const CRITICAL_URLS = [
  '/',
  '/nueva-revision',
  '/subidas-pendientes',
  '/offline.html',
  '/_next/static/css/',
  '/_next/static/chunks/'
];

// Event Listeners
self.addEventListener('install', (event) => {
  console.log('Service Worker instalado');
  
  // Pre-cache recursos críticos
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll([
        '/',
        '/nueva-revision',
        '/manifest.json',
        '/icons/icon-152x152.png'
      ]).catch(err => {
        console.warn('No se pudieron pre-cachear algunos recursos:', err);
      });
    })
  );
  
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activado');
  
  // Limpiar caches viejos
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Eliminando cache viejo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Interceptar requests para funcionalidad offline
self.addEventListener('fetch', (event) => {
  // Solo manejar requests GET
  if (event.request.method !== 'GET') return;
  
  // Ignorar requests de API
  if (event.request.url.includes('/api/')) return;
  
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }
      
      return fetch(event.request).then(response => {
        // Cache successful responses
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      }).catch(() => {
        // Fallback offline para páginas
        if (event.request.destination === 'document') {
          return caches.match('/offline.html');
        }
      });
    })
  );
});

self.addEventListener('message', (event) => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'ADD_TO_QUEUE':
      addToUploadQueue(data);
      break;
    case 'PROCESS_QUEUE':
      processUploadQueue();
      break;
    case 'GET_QUEUE_STATUS':
      getQueueStatus().then(status => {
        event.ports[0].postMessage(status);
      });
      break;
  }
});

// Agregar a cola de subidas
async function addToUploadQueue(uploadData) {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    const uploadItem = {
      id: `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      file: uploadData.file,
      recordId: uploadData.recordId,
      fieldName: uploadData.fieldName,
      fileName: uploadData.fileName,
      status: 'pending',
      createdAt: new Date().toISOString(),
      retryCount: 0,
      priority: uploadData.priority || 1 // Prioridad para ordenar
    };
    
    store.add(uploadItem);
    
    // Iniciar keep-alive si hay subidas pendientes
    startKeepAlive();
    
    // Procesar cola automáticamente
    setTimeout(() => processUploadQueue(), 100);
    
    // Registrar background sync si está disponible
    if ('serviceWorker' in self && 'sync' in self.registration) {
      try {
        await self.registration.sync.register('background-upload');
      } catch (error) {
        console.log('Background sync no disponible:', error);
      }
    }
    
  } catch (error) {
    console.error('Error agregando a cola:', error);
  }
}

// Obtener estado de la cola
async function getQueueStatus() {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    
    const all = await new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    
    return {
      pending: all.filter(item => item.status === 'pending').length,
      uploading: all.filter(item => item.status === 'uploading').length,
      completed: all.filter(item => item.status === 'completed').length,
      error: all.filter(item => item.status === 'error').length,
      total: all.length
    };
  } catch (error) {
    console.error('Error obteniendo estado de cola:', error);
    return { pending: 0, uploading: 0, completed: 0, error: 0, total: 0 };
  }
}

// Procesar cola periódicamente
setInterval(() => {
  processUploadQueue();
}, 30000); // Cada 30 segundos

// Mantener el Service Worker activo
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-upload') {
    event.waitUntil(processUploadQueue());
  }
});

// Procesar cola cuando el SW se activa
self.addEventListener('activate', (event) => {
  console.log('Service Worker activado');
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      processUploadQueue() // Procesar cola pendiente al activarse
    ])
  );
});

// Mantener SW vivo con mensajes periódicos
let keepAliveInterval;

function startKeepAlive() {
  if (keepAliveInterval) return;
  
  keepAliveInterval = setInterval(() => {
    // Enviar mensaje a todos los clientes para mantener conexión
    self.clients.matchAll().then(clients => {
      if (clients.length === 0) {
        // No hay clientes, pero seguir procesando cola
        processUploadQueue();
      }
    });
  }, 25000); // Cada 25 segundos
}

function stopKeepAlive() {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
    keepAliveInterval = null;
  }
}

// Iniciar keep-alive cuando hay subidas pendientes
async function checkAndStartKeepAlive() {
  const status = await getQueueStatus();
  if (status.pending > 0 || status.uploading > 0) {
    startKeepAlive();
  } else {
    stopKeepAlive();
  }
}

// Verificar keep-alive periódicamente
setInterval(checkAndStartKeepAlive, 60000); // Cada minuto 