'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface ImageData {
  file: File | null;
  compressed: string | null;
  originalSize: number;
  compressedSize: number;
}

export default function UnirImagenes() {
  const router = useRouter();
  const [image1, setImage1] = useState<ImageData>({ file: null, compressed: null, originalSize: 0, compressedSize: 0 });
  const [image2, setImage2] = useState<ImageData>({ file: null, compressed: null, originalSize: 0, compressedSize: 0 });
  const [mergedImage, setMergedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isHorizontal, setIsHorizontal] = useState(false);
  
  const fileInput1Ref = useRef<HTMLInputElement>(null);
  const fileInput2Ref = useRef<HTMLInputElement>(null);
  const camera1Ref = useRef<HTMLInputElement>(null);
  const camera2Ref = useRef<HTMLInputElement>(null);

  // Función para comprimir imagen usando Canvas
  const compressImage = useCallback((file: File, maxWidth = 1920, maxHeight = 1080, quality = 0.8): Promise<{ dataUrl: string; size: number }> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Calcular nuevas dimensiones manteniendo aspect ratio
        let { width, height } = img;
        
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Dibujar imagen comprimida
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Convertir a base64
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        const size = Math.round((dataUrl.length * 3) / 4); // Aproximar tamaño en bytes
        
        resolve({ dataUrl, size });
      };
      
      img.src = URL.createObjectURL(file);
    });
  }, []);

  // Manejar selección de archivo
  const handleFileSelect = useCallback(async (file: File, imageNumber: 1 | 2) => {
    if (!file || !file.type.startsWith('image/')) return;
    
    setIsProcessing(true);
    
    try {
      const { dataUrl, size } = await compressImage(file);
      
      const imageData: ImageData = {
        file,
        compressed: dataUrl,
        originalSize: file.size,
        compressedSize: size
      };
      
      if (imageNumber === 1) {
        setImage1(imageData);
      } else {
        setImage2(imageData);
      }
    } catch (error) {
      console.error('Error comprimiendo imagen:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [compressImage]);

  // Unir imágenes cuando ambas estén listas
  const mergeImages = useCallback(async () => {
    if (!image1.compressed || !image2.compressed) return;
    
    setIsProcessing(true);
    
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      const img1 = new Image();
      const img2 = new Image();
      
      await Promise.all([
        new Promise((resolve) => {
          img1.onload = resolve;
          img1.src = image1.compressed!;
        }),
        new Promise((resolve) => {
          img2.onload = resolve;
          img2.src = image2.compressed!;
        })
      ]);
      
      // Configurar canvas según orientación
      let canvasWidth, canvasHeight;
      
      if (isHorizontal) {
        // Horizontal: lado a lado
        canvasWidth = img1.width + img2.width;
        canvasHeight = Math.max(img1.height, img2.height);
      } else {
        // Vertical: una encima de la otra
        canvasWidth = Math.max(img1.width, img2.width);
        canvasHeight = img1.height + img2.height;
      }
      
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      
      // Dibujar primera imagen
      ctx?.drawImage(img1, 0, 0);
      
      // Dibujar segunda imagen según orientación
      if (isHorizontal) {
        ctx?.drawImage(img2, img1.width, 0);
      } else {
        ctx?.drawImage(img2, 0, img1.height);
      }
      
      const mergedDataUrl = canvas.toDataURL('image/jpeg', 0.9);
      setMergedImage(mergedDataUrl);
    } catch (error) {
      console.error('Error uniendo imágenes:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [image1.compressed, image2.compressed, isHorizontal]);

  // Efecto para unir imágenes automáticamente
  useEffect(() => {
    if (image1.compressed && image2.compressed) {
      mergeImages();
    }
  }, [image1.compressed, image2.compressed, isHorizontal, mergeImages]);

  // Limpiar imagen
  const clearImage = (imageNumber: 1 | 2) => {
    if (imageNumber === 1) {
      setImage1({ file: null, compressed: null, originalSize: 0, compressedSize: 0 });
      if (fileInput1Ref.current) fileInput1Ref.current.value = '';
      if (camera1Ref.current) camera1Ref.current.value = '';
    } else {
      setImage2({ file: null, compressed: null, originalSize: 0, compressedSize: 0 });
      if (fileInput2Ref.current) fileInput2Ref.current.value = '';
      if (camera2Ref.current) camera2Ref.current.value = '';
    }
    setMergedImage(null);
  };

  // Descargar imagen unida
  const downloadMergedImage = () => {
    if (!mergedImage) return;
    
    const link = document.createElement('a');
    link.download = `imagenes-unidas-${Date.now()}.jpg`;
    link.href = mergedImage;
    link.click();
  };

  // Crear Blob directamente desde canvas
  const createImageBlob = useCallback(async (): Promise<Blob | null> => {
    if (!image1.compressed || !image2.compressed) return null;
    
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      const img1 = new Image();
      const img2 = new Image();
      
      await Promise.all([
        new Promise((resolve) => {
          img1.onload = resolve;
          img1.src = image1.compressed!;
        }),
        new Promise((resolve) => {
          img2.onload = resolve;
          img2.src = image2.compressed!;
        })
      ]);
      
      // Configurar canvas según orientación
      let canvasWidth, canvasHeight;
      
      if (isHorizontal) {
        // Horizontal: lado a lado
        canvasWidth = img1.width + img2.width;
        canvasHeight = Math.max(img1.height, img2.height);
      } else {
        // Vertical: una encima de la otra
        canvasWidth = Math.max(img1.width, img2.width);
        canvasHeight = img1.height + img2.height;
      }
      
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      
      // Dibujar primera imagen
      ctx?.drawImage(img1, 0, 0);
      
      // Dibujar segunda imagen según orientación
      if (isHorizontal) {
        ctx?.drawImage(img2, img1.width, 0);
      } else {
        ctx?.drawImage(img2, 0, img1.height);
      }
      
      // Convertir canvas a blob directamente
      return new Promise((resolve) => {
        canvas.toBlob((blob) => {
          resolve(blob);
        }, 'image/jpeg', 0.9);
      });
    } catch (error) {
      console.error('Error creando blob:', error);
      return null;
    }
  }, [image1.compressed, image2.compressed, isHorizontal]);

  // Compartir imagen nativo (sin guardar en galería)
  const shareImage = async () => {
    if (!image1.compressed || !image2.compressed) return;
    
    try {
      // Crear blob directamente desde canvas
      const blob = await createImageBlob();
      if (!blob) {
        console.error('No se pudo crear el blob');
        return;
      }
      
      // Crear archivo temporal para compartir (no se guarda en galería)
      const file = new File([blob], `imagenes-unidas-${Date.now()}.jpg`, { 
        type: 'image/jpeg',
        lastModified: Date.now()
      });
      
      // Verificar si el navegador soporta Web Share API
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'Imágenes Unidas - Revisión de Casitas',
          text: 'Imagen combinada creada con la app Revisión de Casitas',
          files: [file]
        });
        console.log('Imagen compartida exitosamente (sin guardar en galería)');
      } else if (navigator.share) {
        // Fallback: compartir solo texto si no soporta archivos
        await navigator.share({
          title: 'Imágenes Unidas - Revisión de Casitas',
          text: 'He creado una imagen combinada con la app Revisión de Casitas',
          url: window.location.href
        });
             } else {
         // Fallback final: mostrar mensaje informativo
         const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname.includes('192.168');
         const message = isLocalhost 
           ? '📱 El compartir archivos requiere HTTPS. Funciona perfectamente en producción (Netlify). Por ahora usa "💾 Guardar".'
           : 'Tu navegador no soporta compartir archivos. Usa el botón "💾 Guardar" para descargar la imagen.';
         alert(message);
       }
    } catch (error) {
      console.error('Error compartiendo imagen:', error);
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('El usuario canceló el compartir');
      } else {
        alert('Error al compartir. Intenta usar el botón "Descargar".');
      }
    }
  };

  // Formatear tamaño de archivo
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#1a1f35] to-[#2d364c] py-8 md:py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#2a3347] rounded-xl shadow-2xl p-4 md:p-8 border border-[#3d4659]">
          {/* Header */}
          <div className="flex justify-between items-center mb-6 md:mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-white">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-purple-400 via-purple-500 to-purple-600 bg-clip-text text-transparent">
                  Unir Imágenes
                </h1>
                <p className="text-gray-400 text-sm md:text-base font-medium">Combina dos imágenes en una sola</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => router.push('/')}
              className="px-3 py-1 md:px-4 md:py-2 text-sm text-[#1a1f35] bg-gradient-to-br from-[#c9a45c] via-[#d4b06c] to-[#f0c987] rounded-xl hover:from-[#d4b06c] hover:via-[#e0bc7c] hover:to-[#f7d498] transform hover:scale-[1.02] transition-all duration-200 shadow-[0_8px_16px_rgb(0_0_0/0.2)] hover:shadow-[0_12px_24px_rgb(0_0_0/0.3)] relative overflow-hidden"
            >
              Volver
            </button>
          </div>

          {/* Control de orientación */}
          {(image1.compressed || image2.compressed) && (
            <div className="mb-6">
              <div className="flex items-center justify-center gap-4 p-4 bg-[#1a1f35] rounded-xl border border-[#3d4659]">
                <span className="text-gray-300 font-medium">Orientación:</span>
                <div className="flex bg-[#2a3347] rounded-lg p-1">
                  <button
                    onClick={() => setIsHorizontal(false)}
                    className={`px-4 py-2 rounded-md transition-all duration-300 flex items-center gap-2 ${
                      !isHorizontal 
                        ? 'bg-purple-500 text-white shadow-lg' 
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                    </svg>
                    Vertical
                  </button>
                  <button
                    onClick={() => setIsHorizontal(true)}
                    className={`px-4 py-2 rounded-md transition-all duration-300 flex items-center gap-2 ${
                      isHorizontal 
                        ? 'bg-purple-500 text-white shadow-lg' 
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
                    </svg>
                    Horizontal
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Contenedor de imágenes */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Imagen 1 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-purple-400 flex items-center gap-2">
                <span className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold">1</span>
                Primera Imagen
              </h3>
              
              {!image1.compressed ? (
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <button
                      onClick={() => fileInput1Ref.current?.click()}
                      disabled={isProcessing}
                      className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-300 transform hover:scale-[1.02] flex items-center justify-center gap-2 font-medium disabled:opacity-50"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                      </svg>
                      Galería
                    </button>
                    <button
                      onClick={() => camera1Ref.current?.click()}
                      disabled={isProcessing}
                      className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-300 transform hover:scale-[1.02] flex items-center justify-center gap-2 font-medium disabled:opacity-50"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                      </svg>
                      Cámara
                    </button>
                  </div>
                  
                  <input
                    ref={fileInput1Ref}
                    type="file"
                    accept="image/*"
                    onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0], 1)}
                    className="hidden"
                  />
                  <input
                    ref={camera1Ref}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0], 1)}
                    className="hidden"
                  />
                </div>
              ) : (
                <div className="relative">
                  <img
                    src={image1.compressed}
                    alt="Primera imagen"
                    className="w-full h-64 object-cover rounded-xl border border-[#3d4659]"
                  />
                  <button
                    onClick={() => clearImage(1)}
                    className="absolute top-2 right-2 w-8 h-8 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  <div className="mt-2 text-xs text-gray-400">
                    <p>Original: {formatFileSize(image1.originalSize)}</p>
                    <p>Comprimida: {formatFileSize(image1.compressedSize)}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Imagen 2 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-purple-400 flex items-center gap-2">
                <span className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold">2</span>
                Segunda Imagen
              </h3>
              
              {!image2.compressed ? (
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <button
                      onClick={() => fileInput2Ref.current?.click()}
                      disabled={isProcessing}
                      className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-300 transform hover:scale-[1.02] flex items-center justify-center gap-2 font-medium disabled:opacity-50"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                      </svg>
                      Galería
                    </button>
                    <button
                      onClick={() => camera2Ref.current?.click()}
                      disabled={isProcessing}
                      className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-300 transform hover:scale-[1.02] flex items-center justify-center gap-2 font-medium disabled:opacity-50"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                      </svg>
                      Cámara
                    </button>
                  </div>
                  
                  <input
                    ref={fileInput2Ref}
                    type="file"
                    accept="image/*"
                    onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0], 2)}
                    className="hidden"
                  />
                  <input
                    ref={camera2Ref}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0], 2)}
                    className="hidden"
                  />
                </div>
              ) : (
                <div className="relative">
                  <img
                    src={image2.compressed}
                    alt="Segunda imagen"
                    className="w-full h-64 object-cover rounded-xl border border-[#3d4659]"
                  />
                  <button
                    onClick={() => clearImage(2)}
                    className="absolute top-2 right-2 w-8 h-8 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  <div className="mt-2 text-xs text-gray-400">
                    <p>Original: {formatFileSize(image2.originalSize)}</p>
                    <p>Comprimida: {formatFileSize(image2.compressedSize)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Indicador de procesamiento */}
          {isProcessing && (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-3 text-purple-400">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-400"></div>
                <span>Procesando imagen...</span>
              </div>
            </div>
          )}

          {/* Vista previa de imagen unida */}
          {mergedImage && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-purple-400 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.847a4.5 4.5 0 003.09 3.09L15.75 12l-2.847.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423L16.5 15.75l.394 1.183a2.25 2.25 0 001.423 1.423L19.5 18.75l-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                  </svg>
                  Resultado
                </h3>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowPreview(true)}
                    className="px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all duration-300 flex items-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                    </svg>
                    Expandir
                  </button>
                  <button
                    onClick={shareImage}
                    className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-300 flex items-center gap-2"
                    title="Compartir sin guardar en galería"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.935-2.186 2.25 2.25 0 0 0-3.935 2.186Z" />
                    </svg>
                    📤 Compartir
                  </button>
                  <button
                    onClick={downloadMergedImage}
                    className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-300 flex items-center gap-2"
                    title="Guardar en galería/descargas"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                    💾 Guardar
                  </button>
                </div>
              </div>
              
              <div className="relative">
                <img
                  src={mergedImage}
                  alt="Imágenes unidas"
                  className="w-full max-h-96 object-contain rounded-xl border border-[#3d4659] bg-[#1a1f35]"
                />
              </div>
            </div>
          )}

          {/* Modal de vista previa expandida */}
          {showPreview && mergedImage && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="relative max-w-full max-h-full">
                <button
                  onClick={() => setShowPreview(false)}
                  className="absolute top-4 right-4 w-10 h-10 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white transition-colors z-10"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <img
                  src={mergedImage}
                  alt="Vista previa expandida"
                  className="max-w-full max-h-full object-contain rounded-xl"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
} 