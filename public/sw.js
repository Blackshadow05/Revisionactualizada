const CACHE_NAME = 'upload-cache-v1';
const UPLOAD_QUEUE_KEY = 'upload-queue';

// Función para guardar la cola de subidas
const saveQueue = async (queue) => {
  const cache = await caches.open(CACHE_NAME);
  await cache.put(UPLOAD_QUEUE_KEY, new Response(JSON.stringify(queue)));
};

// Función para obtener la cola de subidas
const getQueue = async () => {
  const cache = await caches.open(CACHE_NAME);
  const response = await cache.match(UPLOAD_QUEUE_KEY);
  if (!response) return [];
  return response.json();
};

// Función para subir un archivo
const uploadFile = async (file, revisionId, fieldName) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('revisionId', revisionId);
  formData.append('fieldName', fieldName);

  try {
    const response = await fetch('https://revisionnetlify-subida-chunks.onrender.com/upload/chunk', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Error en la subida: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error en la subida:', error);
    throw error;
  }
};

// Función para finalizar la subida
const finalizeUpload = async (revisionId, fieldName, url) => {
  try {
    const response = await fetch('https://revisionnetlify-subida-chunks.onrender.com/upload/finalize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        revisionId,
        fieldName,
        url
      })
    });

    if (!response.ok) {
      throw new Error(`Error al finalizar: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error al finalizar:', error);
    throw error;
  }
};

// Función para procesar la cola de subidas
const processQueue = async () => {
  const queue = await getQueue();
  if (queue.length === 0) return;

  for (const item of queue) {
    if (item.status === 'pending') {
      try {
        // Actualizar estado a 'uploading'
        item.status = 'uploading';
        await saveQueue(queue);

        // Subir el archivo
        const result = await uploadFile(item.file, item.revisionId, item.fieldName);
        
        // Finalizar la subida
        await finalizeUpload(item.revisionId, item.fieldName, result.url);
        
        // Actualizar estado a 'completed'
        item.status = 'completed';
        item.url = result.url;
        await saveQueue(queue);
      } catch (error) {
        console.error('Error procesando subida:', error);
        item.status = 'error';
        item.error = error.message;
        await saveQueue(queue);
      }
    }
  }
};

// Escuchar eventos de conexión
self.addEventListener('online', () => {
  processQueue();
});

// Escuchar mensajes del cliente
self.addEventListener('message', async (event) => {
  if (event.data.type === 'START_UPLOAD') {
    const queue = await getQueue();
    queue.push({
      id: Date.now(),
      file: event.data.file,
      revisionId: event.data.revisionId,
      fieldName: event.data.fieldName,
      status: 'pending',
      progress: 0
    });
    await saveQueue(queue);
    processQueue();
  } else if (event.data.type === 'GET_QUEUE') {
    const queue = await getQueue();
    event.ports[0].postMessage(queue);
  }
});

// Instalación del Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/nueva-revision',
        '/estado-subidas'
      ]);
    })
  );
});

// Activación del Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
}); 