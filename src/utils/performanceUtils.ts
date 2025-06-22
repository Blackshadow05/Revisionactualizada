/**
 * Utilidades de rendimiento para optimización móvil
 */

/**
 * Debounce optimizado para reducir llamadas a funciones
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle optimizado para limitar frecuencia de ejecución
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false;
  let lastTime = 0;
  
  return function executedFunction(this: any, ...args: Parameters<T>) {
    const now = Date.now();
    
    if (!inThrottle || now - lastTime >= limit) {
      func.apply(this, args);
      lastTime = now;
      inThrottle = true;
    }
  };
}

/**
 * Detectar capacidades del dispositivo
 */
export function getDeviceCapabilities() {
  if (typeof window === 'undefined') {
    return {
      isLowEnd: false,
      isMobile: false,
      hasTouch: false,
      cores: 4,
      memory: 4,
      connection: 'unknown'
    };
  }

  const ua = navigator.userAgent.toLowerCase();
  const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua);
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  
  // Detectar hardware
  const cores = navigator.hardwareConcurrency || 2;
  const memory = (navigator as any).deviceMemory || 2;
  
  // Detectar conexión
  const connection = (navigator as any).connection;
  const connectionType = connection?.effectiveType || 'unknown';
  
  // Determinar si es gama baja
  const isLowEnd = 
    cores <= 4 || 
    memory <= 2 || 
    connectionType === '2g' || 
    connectionType === '3g' ||
    (isMobile && cores <= 6);

  return {
    isLowEnd,
    isMobile,
    hasTouch,
    cores,
    memory,
    connection: connectionType
  };
}

/**
 * Lazy load de imágenes con Intersection Observer
 */
export function lazyLoadImages(selector: string = 'img[data-src]') {
  if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
    return;
  }

  const images = document.querySelectorAll<HTMLImageElement>(selector);
  
  const imageObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target as HTMLImageElement;
        const src = img.dataset.src;
        
        if (src) {
          img.src = src;
          img.removeAttribute('data-src');
          imageObserver.unobserve(img);
        }
      }
    });
  }, {
    rootMargin: '50px 0px', // Cargar 50px antes de que sea visible
    threshold: 0.01
  });

  images.forEach(img => imageObserver.observe(img));
  
  return imageObserver;
}

/**
 * Optimizar URL de imagen según dispositivo
 */
export function optimizeImageUrl(url: string, options?: {
  width?: number;
  quality?: number;
  format?: 'webp' | 'jpg' | 'png';
}) {
  if (!url || typeof window === 'undefined') return url;
  
  const device = getDeviceCapabilities();
  const isMobile = device.isMobile;
  const isLowEnd = device.isLowEnd;
  
  // Valores por defecto según dispositivo
  const defaultWidth = isMobile ? 400 : 800;
  const defaultQuality = isLowEnd ? 60 : (isMobile ? 70 : 85);
  const defaultFormat = 'webp';
  
  const width = options?.width || defaultWidth;
  const quality = options?.quality || defaultQuality;
  const format = options?.format || defaultFormat;
  
  // Si es ImageKit
  if (url.includes('ik.imagekit.io')) {
    const transforms = `tr:w-${width},q-${quality},f-${format}`;
    return url.includes('/tr:') 
      ? url.replace(/\/tr:[^\/]+/, `/${transforms}`)
      : url.replace(/\/([^\/]+)$/, `/${transforms}/$1`);
  }
  
  // Si es Cloudinary
  if (url.includes('cloudinary.com')) {
    const transforms = `w_${width},q_${quality},f_${format}`;
    return url.replace('/upload/', `/upload/${transforms}/`);
  }
  
  return url;
}

/**
 * Request Idle Callback polyfill
 */
export const requestIdleCallback = 
  typeof window !== 'undefined' && 'requestIdleCallback' in window
    ? (window as any).requestIdleCallback
    : (callback: (deadline: any) => void) => {
        const start = Date.now();
        return setTimeout(() => {
          callback({
            didTimeout: false,
            timeRemaining: () => Math.max(0, 50 - (Date.now() - start))
          });
        }, 1);
      };

/**
 * Cancelar Idle Callback
 */
export const cancelIdleCallback =
  typeof window !== 'undefined' && 'cancelIdleCallback' in window
    ? (window as any).cancelIdleCallback
    : clearTimeout; 