'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import ButtonGroup from '@/components/ButtonGroup';
import { getWeek } from 'date-fns';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useDirectCloudinaryUpload } from '@/hooks/useDirectCloudinaryUpload';

interface RevisionData {
  casita: string;
  quien_revisa: string;
  caja_fuerte: string;
  puertas_ventanas: string;
  chromecast: string;
  binoculares: string;
  trapo_binoculares: string;
  speaker: string;
  usb_speaker: string;
  controles_tv: string;
  secadora: string;
  accesorios_secadora: string;
  accesorios_secadora_faltante: string;
  steamer: string;
  bolsa_vapor: string;
  plancha_cabello: string;
  bulto: string;
  sombrero: string;
  bolso_yute: string;
  camas_ordenadas: string;
  cola_caballo: string;
  evidencia_01: File | string;
  evidencia_02: File | string;
  evidencia_03: File | string;
  faltantes: string;
}

interface FileData {
  evidencia_01: File | null;
  evidencia_02: File | null;
  evidencia_03: File | null;
}

const initialFormData: RevisionData = {
  casita: '',
  quien_revisa: '',
  caja_fuerte: '',
  puertas_ventanas: '',
  chromecast: '',
  binoculares: '',
  trapo_binoculares: '',
  speaker: '',
  usb_speaker: '',
  controles_tv: '',
  secadora: '',
  accesorios_secadora: '',
  accesorios_secadora_faltante: '',
  steamer: '',
  bolsa_vapor: '',
  plancha_cabello: '',
  bulto: '',
  sombrero: '',
  bolso_yute: '',
  camas_ordenadas: '',
  cola_caballo: '',
  evidencia_01: '',
  evidencia_02: '',
  evidencia_03: '',
  faltantes: '',
};

const initialFileData: FileData = {
  evidencia_01: null,
  evidencia_02: null,
  evidencia_03: null,
};

const nombresRevisores = [
  'Ricardo B', 'Michael J', 'Ramiro Q', 'Adrian S', 'Esteban B',
  'Willy G', 'Juan M', 'Olman Z', 'Daniel V', 'Jefferson V',
  'Cristopher G', 'Emerson S', 'Joseph R'
];

export default function NuevaRevision() {
  const router = useRouter();
  const { user } = useAuth();
  const { uploadMultipleFiles, isUploading: uploadsInProgress, uploads } = useDirectCloudinaryUpload();
  const { showSuccess, showError } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deviceInfo, setDeviceInfo] = useState<any>(null);
  const [formData, setFormData] = useState<RevisionData>({
    ...initialFormData,
    quien_revisa: user || ''
  });

  const [highlightedField, setHighlightedField] = useState<string | null>('casita');
  
  // Estados para compresión en segundo plano
  const [compressedFiles, setCompressedFiles] = useState<{
    evidencia_01: File | null;
    evidencia_02: File | null;
    evidencia_03: File | null;
  }>({
    evidencia_01: null,
    evidencia_02: null,
    evidencia_03: null,
  });

  // Estados para tamaños de archivos
  const [fileSizes, setFileSizes] = useState<{
    evidencia_01: { original: number; compressed: number };
    evidencia_02: { original: number; compressed: number };
    evidencia_03: { original: number; compressed: number };
  }>({
    evidencia_01: { original: 0, compressed: 0 },
    evidencia_02: { original: 0, compressed: 0 },
    evidencia_03: { original: 0, compressed: 0 },
  });
  
  const [compressionStatus, setCompressionStatus] = useState<{
    evidencia_01: { status: 'idle' | 'compressing' | 'completed' | 'error'; progress: number; stage: string; error?: string };
    evidencia_02: { status: 'idle' | 'compressing' | 'completed' | 'error'; progress: number; stage: string; error?: string };
    evidencia_03: { status: 'idle' | 'compressing' | 'completed' | 'error'; progress: number; stage: string; error?: string };
  }>({
    evidencia_01: { status: 'idle', progress: 0, stage: '' },
    evidencia_02: { status: 'idle', progress: 0, stage: '' },
    evidencia_03: { status: 'idle', progress: 0, stage: '' },
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef2 = useRef<HTMLInputElement>(null);
  const fileInputRef3 = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef2 = useRef<HTMLInputElement>(null);
  const cameraInputRef3 = useRef<HTMLInputElement>(null);

  // Estados para modal de imagen
  const [modalOpen, setModalOpen] = useState(false);
  const [modalImg, setModalImg] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const imgRef = useRef<HTMLImageElement>(null);

  // Efecto para actualizar quien_revisa cuando cambie el usuario
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        quien_revisa: user
      }));
    }
  }, [user]);

  // Efecto para inicializar información del dispositivo
  useEffect(() => {
    const initDeviceInfo = async () => {
      const { OptimizedImageCompressor } = await import('@/lib/imageCompressionOptimized');
      const info = OptimizedImageCompressor.getDeviceInfo();
      setDeviceInfo(info);
    };
    initDeviceInfo();
  }, []);

  // Efecto para cerrar modal con Escape y limpiar URLs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && modalOpen) {
        closeModal();
      }
    };

    if (modalOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [modalOpen]);

  const showEvidenceFields = ['Check in', 'Upsell', 'Back to Back'].includes(formData.caja_fuerte);

  const requiredFields: (keyof RevisionData)[] = [
    'casita',
    'quien_revisa',
    'caja_fuerte',
    'puertas_ventanas',
    'chromecast',
    'binoculares',
    'trapo_binoculares',
    'speaker',
    'usb_speaker',
    'controles_tv',
    'secadora',
    'accesorios_secadora',
    'steamer',
    'bolsa_vapor',
    'plancha_cabello',
    'bulto',
    'sombrero',
    'bolso_yute',
    'camas_ordenadas',
    'cola_caballo'
  ];

  const handleInputChange = (field: keyof RevisionData, value: string) => {
    if (error) setError(null);
    
    // Crear el nuevo estado con el valor actualizado
    const newFormData = { ...formData, [field]: value };
    setFormData(newFormData);
    
    // Buscar el primer campo vacío usando el nuevo estado
    const nextEmptyField = requiredFields.find(f => !newFormData[f]);
    setHighlightedField(nextEmptyField || null);
  };

  // Funciones para modal de imagen
  const openModal = (imageUrl: string) => {
    setModalImg(imageUrl);
    setModalOpen(true);
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalImg(null);
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const newZoom = zoom + (e.deltaY > 0 ? -0.1 : 0.1);
    setZoom(Math.max(0.5, Math.min(5, newZoom)));
  };

  const handleMouseDownImage = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  };

  const handleMouseMoveImage = (e: React.MouseEvent) => {
    if (isDragging && zoom > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUpImage = () => {
    setIsDragging(false);
  };

  // Función para comprimir imagen usando canvas (misma configuración que detalles)
  const compressImage = (file: File, maxWidth = 1920, maxHeight = 1080, quality = 0.7): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          // Redimensionar manteniendo la proporción
          if (width > height) {
            if (width > maxWidth) {
              height *= maxWidth / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width *= maxHeight / height;
              height = maxHeight;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          // Convertir canvas a blob
          canvas.toBlob((blob) => {
            if (!blob) {
              reject(new Error('No se pudo comprimir la imagen'));
              return;
            }
            const compressedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now()
            });
            resolve(compressedFile);
          }, file.type, quality);
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  };

  // Función para comprimir automáticamente en segundo plano
  const compressFileInBackground = async (field: keyof FileData, file: File) => {
    // Iniciar compresión
    setCompressionStatus(prev => ({
      ...prev,
      [field]: { status: 'compressing', progress: 50, stage: 'Comprimiendo imagen...' }
    }));

    try {
      const compressedFile = await compressImage(file);
      
      // Calcular porcentaje de compresión
      const compressionRatio = Math.round((1 - compressedFile.size / file.size) * 100);

      // Guardar archivo comprimido
      setCompressedFiles(prev => ({
        ...prev,
        [field]: compressedFile
      }));

      // Guardar tamaños de archivos
      setFileSizes(prev => ({
        ...prev,
        [field]: { original: file.size, compressed: compressedFile.size }
      }));

      setCompressionStatus(prev => ({
        ...prev,
        [field]: { 
          status: 'completed', 
          progress: 100, 
          stage: `Completado - ${compressionRatio}% compresión` 
        }
      }));

    } catch (error) {
      setCompressionStatus(prev => ({
        ...prev,
        [field]: { 
          status: 'error', 
          progress: 0, 
          stage: '', 
          error: (error as Error).message 
        }
      }));
      showError(`Error comprimiendo ${field}: ${(error as Error).message}`);
    }
  };

  const handleFileChange = (field: keyof FileData, file: File | null) => {
    if (error) setError(null);
    
    // Actualizar el formulario con el archivo original
    setFormData(prev => ({ ...prev, [field]: file }));
    
    // Si hay archivo, iniciar compresión en segundo plano
    if (file) {
      compressFileInBackground(field, file);
    } else {
      // Limpiar estados si se remueve el archivo
      setCompressedFiles(prev => ({ ...prev, [field]: null }));
      setFileSizes(prev => ({ ...prev, [field]: { original: 0, compressed: 0 } }));
      setCompressionStatus(prev => ({
        ...prev,
        [field]: { status: 'idle', progress: 0, stage: '' }
      }));
    }
  };

  // Función para limpiar archivo seleccionado
  const clearFile = (field: keyof FileData) => {
    handleFileChange(field, null);
    
    // Limpiar también los inputs de archivo
    if (field === 'evidencia_01') {
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    } else if (field === 'evidencia_02') {
      if (fileInputRef2.current) fileInputRef2.current.value = '';
      if (cameraInputRef2.current) cameraInputRef2.current.value = '';
    } else if (field === 'evidencia_03') {
      if (fileInputRef3.current) fileInputRef3.current.value = '';
      if (cameraInputRef3.current) cameraInputRef3.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      setError('No se pudo conectar con la base de datos');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Obtener fecha y hora local del dispositivo
      const now = new Date();
      const fechaLocal = new Date(now.getTime() - (now.getTimezoneOffset() * 60000));
      const nowISO = fechaLocal.toISOString();

      for (const field of requiredFields) {
        if (!formData[field]) {
          const fieldName = field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          setError(`El campo "${fieldName}" es obligatorio.`);
          return;
        }
      }
      
      if (showEvidenceFields && !formData.evidencia_01) {
        setError('El campo "Evidencia 1" es obligatorio cuando se selecciona Check in, Upsell, o Back to Back.');
        return;
      }

      // Primero guardar el registro en Supabase con URLs temporales
      const uploadedUrls = {
        evidencia_01: '',
        evidencia_02: '',
        evidencia_03: '',
      };

      const { faltantes, accesorios_secadora_faltante, ...restOfFormData } = formData;

      const notas_completas = [
        accesorios_secadora_faltante ? `Faltante accesorios secadora: ${accesorios_secadora_faltante}` : '',
        faltantes ? `Faltantes generales: ${faltantes}` : ''
      ].filter(Boolean).join('\n');

      const { data, error } = await supabase
        .from('revisiones_casitas')
        .insert([
          {
            casita: formData.casita,
            quien_revisa: formData.quien_revisa,
            caja_fuerte: formData.caja_fuerte,
            puertas_ventanas: formData.puertas_ventanas,
            chromecast: formData.chromecast,
            binoculares: formData.binoculares,
            trapo_binoculares: formData.trapo_binoculares,
            speaker: formData.speaker,
            usb_speaker: formData.usb_speaker,
            controles_tv: formData.controles_tv,
            secadora: formData.secadora,
            accesorios_secadora: formData.accesorios_secadora,
            steamer: formData.steamer,
            bolsa_vapor: formData.bolsa_vapor,
            plancha_cabello: formData.plancha_cabello,
            bulto: formData.bulto,
            sombrero: formData.sombrero,
            bolso_yute: formData.bolso_yute,
            camas_ordenadas: formData.camas_ordenadas,
            cola_caballo: formData.cola_caballo,
            Notas: notas_completas,
            evidencia_01: uploadedUrls.evidencia_01,
            evidencia_02: uploadedUrls.evidencia_02,
            evidencia_03: uploadedUrls.evidencia_03,
            created_at: nowISO
          }
        ])
        .select();

      if (error) throw error;

      // Obtener el ID del registro creado
      const recordId = data?.[0]?.id;
      
              if (recordId) {
        // Preparar archivos comprimidos para subida
        const filesToUpload = [];
        
        // Usar archivos comprimidos si están disponibles, sino usar originales
        if (formData.evidencia_01 instanceof File) {
          const fileToUpload = compressedFiles.evidencia_01 || formData.evidencia_01;
          console.log('Preparando evidencia_01:', fileToUpload.name, fileToUpload.size);
          filesToUpload.push({ file: fileToUpload, recordId, fieldName: 'evidencia_01' });
        }
        if (formData.evidencia_02 instanceof File) {
          const fileToUpload = compressedFiles.evidencia_02 || formData.evidencia_02;
          console.log('Preparando evidencia_02:', fileToUpload.name, fileToUpload.size);
          filesToUpload.push({ file: fileToUpload, recordId, fieldName: 'evidencia_02' });
        }
        if (formData.evidencia_03 instanceof File) {
          const fileToUpload = compressedFiles.evidencia_03 || formData.evidencia_03;
          console.log('Preparando evidencia_03:', fileToUpload.name, fileToUpload.size);
          filesToUpload.push({ file: fileToUpload, recordId, fieldName: 'evidencia_03' });
        }

        console.log('Total archivos a subir:', filesToUpload.length);

        // Subir todas las imágenes
        if (filesToUpload.length > 0) {
          await uploadMultipleFiles(filesToUpload);
        }
      }

      // Mostrar mensaje de éxito
      const hasImages = formData.evidencia_01 instanceof File || formData.evidencia_02 instanceof File || formData.evidencia_03 instanceof File;
      
      if (hasImages) {
        showSuccess('Formulario guardado exitosamente. Las imágenes se están subiendo...');
      } else {
        showSuccess('Formulario guardado exitosamente.');
      }

      router.push('/');
    } catch (error: any) {
      console.error('Error al guardar la revisión:', error);
      setError(error.message);
      showError(`Error al guardar la revisión: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Modificar los estilos de los campos para incluir el resaltado
  const getHighlightStyle = (fieldName: string) => {
    if (highlightedField === fieldName) {
      return 'animate-pulse border-2 border-[#00ff00] shadow-[0_0_15px_#00ff00]';
    }
    return '';
  };

  // Componente para mostrar el estado de compresión


  return (
    <main className="min-h-screen bg-gradient-to-br from-[#1a1f35] to-[#2d364c] py-8 md:py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <form onSubmit={handleSubmit} className="bg-[#2a3347] rounded-xl shadow-2xl p-4 md:p-8 border border-[#3d4659]">
          <div className="flex justify-between items-center mb-6 md:mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-[#c9a45c]">Nueva Revisión</h1>
            <button
              type="button"
              onClick={() => router.push('/')}
              className="px-3 py-1 md:px-4 md:py-2 text-sm text-[#1a1f35] bg-gradient-to-br from-[#c9a45c] via-[#d4b06c] to-[#f0c987] rounded-xl hover:from-[#d4b06c] hover:via-[#e0bc7c] hover:to-[#f7d498] transform hover:scale-[1.02] transition-all duration-200 shadow-[0_8px_16px_rgb(0_0_0/0.2)] hover:shadow-[0_12px_24px_rgb(0_0_0/0.3)] relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/40 before:to-transparent before:translate-x-[-200%] hover:before:translate-x-[200%] before:transition-transform before:duration-1000 after:absolute after:inset-0 after:bg-gradient-to-b after:from-white/20 after:to-transparent after:opacity-0 hover:after:opacity-100 after:transition-opacity after:duration-300 border border-[#f0c987]/20 hover:border-[#f0c987]/40"
            >
              Volver
            </button>
          </div>



          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div className="space-y-3">
                <label className="block text-base font-semibold text-[#ff8c42] flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                  </svg>
                  Casita <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    required
                    className={`w-full px-4 py-3 md:py-4 bg-gradient-to-br from-[#1e2538] to-[#2a3347] border border-[#3d4659] rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#c9a45c]/50 focus:border-[#c9a45c]/50 transition-all duration-300 hover:border-[#c9a45c]/30 hover:shadow-lg hover:shadow-[#c9a45c]/10 backdrop-blur-sm appearance-none cursor-pointer ${getHighlightStyle('casita')}`}
                    value={formData.casita}
                    onChange={(e) => handleInputChange('casita', e.target.value)}
                  >
                    <option value="" className="bg-[#1e2538] text-gray-400">Seleccionar casita</option>
                    {Array.from({ length: 50 }, (_, i) => i + 1).map(num => (
                      <option key={num} value={num} className="bg-[#1e2538] text-white">{num}</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                    <svg className="w-5 h-5 text-[#c9a45c]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-base font-semibold text-[#ff8c42] flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                  Quien revisa <span className="text-red-500">*</span>
                </label>
                {user ? (
                  <div className="relative">
                    <input
                      type="text"
                      value={user}
                      readOnly
                      className={`w-full px-4 py-3 md:py-4 bg-gradient-to-br from-[#1e2538] to-[#2a3347] border border-[#3d4659] rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#c9a45c]/50 focus:border-[#c9a45c]/50 transition-all duration-300 backdrop-blur-sm cursor-not-allowed opacity-80 ${getHighlightStyle('quien_revisa')}`}
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                      <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                      </svg>
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <select
                      required
                      className="w-full px-4 py-3 md:py-4 bg-gradient-to-br from-[#1e2538] to-[#2a3347] border border-[#3d4659] rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#c9a45c]/50 focus:border-[#c9a45c]/50 transition-all duration-300 hover:border-[#c9a45c]/30 hover:shadow-lg hover:shadow-[#c9a45c]/10 backdrop-blur-sm appearance-none cursor-pointer"
                      value={formData.quien_revisa}
                      onChange={(e) => handleInputChange('quien_revisa', e.target.value)}
                    >
                      <option value="" className="bg-[#1e2538] text-gray-400">Seleccionar persona</option>
                      {nombresRevisores.map(nombre => (
                        <option key={nombre} value={nombre} className="bg-[#1e2538] text-white">{nombre}</option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                      <svg className="w-5 h-5 text-[#c9a45c]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <ButtonGroup
              label="Guardado en la caja fuerte?"
              options={['Si', 'No', 'Check in', 'Check out', 'Upsell', 'Guardar Upsell', 'Back to Back', 'Show Room']}
              selectedValue={formData.caja_fuerte}
              onSelect={(value) => handleInputChange('caja_fuerte', value)}
              required
              highlight={highlightedField === 'caja_fuerte'}
            />
            
            <div className="space-y-3">
              <label className="block text-base font-semibold text-[#ff8c42] flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V9.75a.75.75 0 00-.75-.75h-4.5a.75.75 0 00-.75.75V21m-4.5 0H2.36m11.04 0H21m-1.5 0H9.375a1.125 1.125 0 01-1.125-1.125v-11.25c0-1.125.504-2.25 1.125-2.25H15a2.25 2.25 0 012.25 2.25v11.25c0 .621-.504 1.125-1.125 1.125z" />
                </svg>
                ¿Puertas y ventanas? (revisar casa por fuera) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  className={`w-full px-4 py-3 md:py-4 bg-gradient-to-br from-[#1e2538] to-[#2a3347] border border-[#3d4659] rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#c9a45c]/50 focus:border-[#c9a45c]/50 transition-all duration-300 hover:border-[#c9a45c]/30 hover:shadow-lg hover:shadow-[#c9a45c]/10 backdrop-blur-sm ${getHighlightStyle('puertas_ventanas')}`}
                  value={formData.puertas_ventanas}
                  onChange={(e) => handleInputChange('puertas_ventanas', e.target.value)}
                  placeholder="Estado de puertas y ventanas"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                  <svg className="w-5 h-5 text-[#c9a45c]/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                  </svg>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              <ButtonGroup 
                label="Chromecast" 
                options={['0', '01', '02', '03', '04']} 
                selectedValue={formData.chromecast} 
                onSelect={v => handleInputChange('chromecast', v)} 
                required 
                highlight={highlightedField === 'chromecast'}
              />
              <ButtonGroup 
                label="Binoculares" 
                options={['0', '01', '02', '03']} 
                selectedValue={formData.binoculares} 
                onSelect={v => handleInputChange('binoculares', v)} 
                required 
                highlight={highlightedField === 'binoculares'}
              />
              <ButtonGroup 
                label="Trapo para los binoculares" 
                options={['Si', 'No']} 
                selectedValue={formData.trapo_binoculares} 
                onSelect={v => handleInputChange('trapo_binoculares', v)} 
                required 
                highlight={highlightedField === 'trapo_binoculares'}
              />
              <ButtonGroup 
                label="Speaker" 
                options={['0', '01', '02', '03']} 
                selectedValue={formData.speaker} 
                onSelect={v => handleInputChange('speaker', v)} 
                required 
                highlight={highlightedField === 'speaker'}
              />
              <ButtonGroup 
                label="USB Speaker" 
                options={['0', '01', '02', '03']} 
                selectedValue={formData.usb_speaker} 
                onSelect={v => handleInputChange('usb_speaker', v)} 
                required 
                highlight={highlightedField === 'usb_speaker'}
              />
              <ButtonGroup 
                label="Controles TV" 
                options={['0', '01', '02', '03']} 
                selectedValue={formData.controles_tv} 
                onSelect={v => handleInputChange('controles_tv', v)} 
                required 
                highlight={highlightedField === 'controles_tv'}
              />
              <ButtonGroup 
                label="Secadora" 
                options={['0', '01', '02', '03']} 
                selectedValue={formData.secadora} 
                onSelect={v => handleInputChange('secadora', v)} 
                required 
                highlight={highlightedField === 'secadora'}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div className="space-y-3">
                <label className="block text-base font-semibold text-[#ff8c42] flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
                  </svg>
                  Accesorios secadora <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    required
                    className={`w-full px-4 py-3 md:py-4 bg-gradient-to-br from-[#1e2538] to-[#2a3347] border border-[#3d4659] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#c9a45c]/50 focus:border-[#c9a45c]/50 transition-all duration-300 hover:border-[#c9a45c]/30 hover:shadow-lg hover:shadow-[#c9a45c]/10 backdrop-blur-sm appearance-none cursor-pointer ${getHighlightStyle('accesorios_secadora')}`}
                    value={formData.accesorios_secadora}
                    onChange={(e) => handleInputChange('accesorios_secadora', e.target.value)}
                  >
                    <option value="" className="bg-[#1e2538] text-gray-400">Seleccionar cantidad</option>
                    <option key="0" value="0" className="bg-[#1e2538] text-white">0</option>
                    {Array.from({ length: 8 }, (_, i) => String(i + 1).padStart(2, '0')).map(num => (
                      <option key={num} value={num} className="bg-[#1e2538] text-white">{num}</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                    <svg className="w-5 h-5 text-[#c9a45c]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <label className="block text-base font-semibold text-[#ff8c42] flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                  En caso de faltar un accesorio. Cual es?
                </label>
                <div className="relative">
                  <input
                    type="text"
                    className="w-full px-4 py-3 md:py-4 bg-gradient-to-br from-[#1e2538] to-[#2a3347] border border-[#3d4659] rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#c9a45c]/50 focus:border-[#c9a45c]/50 transition-all duration-300 hover:border-[#c9a45c]/30 hover:shadow-lg hover:shadow-[#c9a45c]/10 backdrop-blur-sm"
                    value={formData.accesorios_secadora_faltante}
                    onChange={(e) => handleInputChange('accesorios_secadora_faltante', e.target.value)}
                    placeholder="Describe el accesorio faltante"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                    <svg className="w-5 h-5 text-[#c9a45c]/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <ButtonGroup 
                label="Steamer (plancha a vapor)" 
                options={['0', '01', '02']} 
                selectedValue={formData.steamer} 
                onSelect={v => handleInputChange('steamer', v)} 
                required 
                highlight={highlightedField === 'steamer'}
              />
              <ButtonGroup 
                label="Bolsa de vapor (plancha vapor)" 
                options={['Si', 'No']} 
                selectedValue={formData.bolsa_vapor} 
                onSelect={v => handleInputChange('bolsa_vapor', v)} 
                required 
                highlight={highlightedField === 'bolsa_vapor'}
              />
              <ButtonGroup 
                label="Plancha cabello" 
                options={['0', '01', '02']} 
                selectedValue={formData.plancha_cabello} 
                onSelect={v => handleInputChange('plancha_cabello', v)} 
                required 
                highlight={highlightedField === 'plancha_cabello'}
              />
              <ButtonGroup 
                label="Bulto" 
                options={['0', '01', '02']} 
                selectedValue={formData.bulto} 
                onSelect={v => handleInputChange('bulto', v)} 
                required 
                highlight={highlightedField === 'bulto'}
              />
              <ButtonGroup 
                label="Sombrero" 
                options={['0', '01', '02']} 
                selectedValue={formData.sombrero} 
                onSelect={v => handleInputChange('sombrero', v)} 
                required 
                highlight={highlightedField === 'sombrero'}
              />
              <ButtonGroup 
                label="Bolso yute" 
                options={['0', '01', '02', '03']} 
                selectedValue={formData.bolso_yute} 
                onSelect={v => handleInputChange('bolso_yute', v)} 
                required 
                highlight={highlightedField === 'bolso_yute'}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <ButtonGroup 
                label="Camas ordenadas" 
                options={['Si', 'No']} 
                selectedValue={formData.camas_ordenadas} 
                onSelect={v => handleInputChange('camas_ordenadas', v)} 
                required 
                highlight={highlightedField === 'camas_ordenadas'}
              />
              <ButtonGroup 
                label="Cola de caballo" 
                options={['Si', 'No']} 
                selectedValue={formData.cola_caballo} 
                onSelect={v => handleInputChange('cola_caballo', v)} 
                required 
                highlight={highlightedField === 'cola_caballo'}
              />
            </div>

            {showEvidenceFields && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-base font-semibold text-[#ff8c42]">Evidencia 1 (URL) <span className="text-red-500">*</span></label>
                  
                  {!(formData.evidencia_01 instanceof File) ? (
                    // Mostrar botones de selección cuando no hay archivo
                    <div className="flex gap-4">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleFileChange('evidencia_01', file);
                          }
                        }}
                      />
                      <input
                        ref={cameraInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleFileChange('evidencia_01', file);
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (fileInputRef.current) {
                            fileInputRef.current.click();
                          }
                        }}
                        className="flex-1 px-4 py-3 bg-gradient-to-r from-[#1e2538] to-[#2a3347] border border-[#3d4659] rounded-xl text-white hover:border-[#c9a45c]/50 hover:shadow-lg hover:shadow-[#c9a45c]/10 transition-all duration-300 flex items-center justify-center gap-2 group"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 group-hover:text-[#c9a45c] transition-colors">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                        </svg>
                        <span className="font-medium">Galería</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (cameraInputRef.current) {
                            cameraInputRef.current.click();
                          }
                        }}
                        className="flex-1 px-4 py-3 bg-gradient-to-r from-[#1e2538] to-[#2a3347] border border-[#3d4659] rounded-xl text-white hover:border-[#c9a45c]/50 hover:shadow-lg hover:shadow-[#c9a45c]/10 transition-all duration-300 flex items-center justify-center gap-2 group"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 group-hover:text-[#c9a45c] transition-colors">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                        </svg>
                        <span className="font-medium">Cámara</span>
                      </button>
                    </div>
                  ) : (
                    // Mostrar archivo seleccionado con botón de eliminar
                    <div className="group relative overflow-hidden bg-gradient-to-br from-[#1e2538] to-[#2a3347] border border-[#3d4659] rounded-xl p-4 hover:border-[#c9a45c]/30 transition-all duration-300 hover:shadow-lg hover:shadow-[#c9a45c]/10">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className="w-12 h-12 bg-gradient-to-br from-[#c9a45c] to-[#d4b06c] rounded-xl flex items-center justify-center shadow-lg">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-[#1a1f35]">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Z" />
                              </svg>
                            </div>
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                              <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          </div>
                          <div>
                            <div className="text-white font-medium">Evidencia 1</div>
                            {/* Indicador de estado de compresión */}
                            {compressionStatus.evidencia_01.status !== 'idle' && (
                              <div className="mt-1 text-xs text-gray-400">
                                {compressionStatus.evidencia_01.status === 'compressing' && (
                                  <span className="text-[#c9a45c]">🔄 Comprimiendo...</span>
                                )}
                                {compressionStatus.evidencia_01.status === 'completed' && (
                                  <span className="text-green-400">✅ {compressionStatus.evidencia_01.stage}</span>
                                )}
                                {compressionStatus.evidencia_01.status === 'error' && (
                                  <span className="text-red-400">❌ Error: {compressionStatus.evidencia_01.error}</span>
                                )}
                              </div>
                            )}
                            {/* Información de tamaños */}
                            {fileSizes.evidencia_01.original > 0 && (
                              <div className="mt-1 text-xs text-gray-500">
                                {(fileSizes.evidencia_01.original / 1024).toFixed(1)} KB → {(fileSizes.evidencia_01.compressed / 1024).toFixed(1)} KB
                              </div>
                            )}
                            {/* Preview de imagen clickeable */}
                            {formData.evidencia_01 instanceof File && (
                              <button
                                type="button"
                                onClick={() => {
                                  const url = URL.createObjectURL(formData.evidencia_01 as File);
                                  openModal(url);
                                }}
                                className="mt-2 text-xs text-blue-400 hover:text-blue-300 underline flex items-center gap-1"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                Ver en pantalla completa
                              </button>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => clearFile('evidencia_01')}
                          className="w-9 h-9 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500/50 rounded-xl flex items-center justify-center transition-all duration-200 hover:scale-105"
                          title="Eliminar imagen"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-red-400">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}

                </div>
                <div className="space-y-2">
                  <label className="block text-base font-semibold text-[#ff8c42]">Evidencia 2 (URL)</label>
                  
                  {!(formData.evidencia_02 instanceof File) ? (
                    <div className="flex gap-4">
                      <input
                        ref={fileInputRef2}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleFileChange('evidencia_02', file);
                          }
                        }}
                      />
                      <input
                        ref={cameraInputRef2}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleFileChange('evidencia_02', file);
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (fileInputRef2.current) {
                            fileInputRef2.current.click();
                          }
                        }}
                        className="flex-1 px-4 py-3 bg-gradient-to-r from-[#1e2538] to-[#2a3347] border border-[#3d4659] rounded-xl text-white hover:border-[#c9a45c]/50 hover:shadow-lg hover:shadow-[#c9a45c]/10 transition-all duration-300 flex items-center justify-center gap-2 group"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 group-hover:text-[#c9a45c] transition-colors">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                        </svg>
                        <span className="font-medium">Galería</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (cameraInputRef2.current) {
                            cameraInputRef2.current.click();
                          }
                        }}
                        className="flex-1 px-4 py-3 bg-gradient-to-r from-[#1e2538] to-[#2a3347] border border-[#3d4659] rounded-xl text-white hover:border-[#c9a45c]/50 hover:shadow-lg hover:shadow-[#c9a45c]/10 transition-all duration-300 flex items-center justify-center gap-2 group"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 group-hover:text-[#c9a45c] transition-colors">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                        </svg>
                        <span className="font-medium">Cámara</span>
                      </button>
                    </div>
                  ) : (
                    <div className="group relative overflow-hidden bg-gradient-to-br from-[#1e2538] to-[#2a3347] border border-[#3d4659] rounded-xl p-4 hover:border-[#c9a45c]/30 transition-all duration-300 hover:shadow-lg hover:shadow-[#c9a45c]/10">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className="w-12 h-12 bg-gradient-to-br from-[#c9a45c] to-[#d4b06c] rounded-xl flex items-center justify-center shadow-lg">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-[#1a1f35]">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Z" />
                              </svg>
                            </div>
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                              <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          </div>
                          <div>
                            <div className="text-white font-medium">Evidencia 2</div>
                            {/* Indicador de estado de compresión */}
                            {compressionStatus.evidencia_02.status !== 'idle' && (
                              <div className="mt-1 text-xs text-gray-400">
                                {compressionStatus.evidencia_02.status === 'compressing' && (
                                  <span className="text-[#c9a45c]">🔄 Comprimiendo...</span>
                                )}
                                {compressionStatus.evidencia_02.status === 'completed' && (
                                  <span className="text-green-400">✅ {compressionStatus.evidencia_02.stage}</span>
                                )}
                                {compressionStatus.evidencia_02.status === 'error' && (
                                  <span className="text-red-400">❌ Error: {compressionStatus.evidencia_02.error}</span>
                                )}
                              </div>
                            )}
                            {/* Información de tamaños */}
                            {fileSizes.evidencia_02.original > 0 && (
                              <div className="mt-1 text-xs text-gray-500">
                                {(fileSizes.evidencia_02.original / 1024).toFixed(1)} KB → {(fileSizes.evidencia_02.compressed / 1024).toFixed(1)} KB
                              </div>
                            )}
                            {/* Preview de imagen clickeable */}
                            {formData.evidencia_02 instanceof File && (
                              <button
                                type="button"
                                onClick={() => {
                                  const url = URL.createObjectURL(formData.evidencia_02 as File);
                                  openModal(url);
                                }}
                                className="mt-2 text-xs text-blue-400 hover:text-blue-300 underline flex items-center gap-1"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                Ver en pantalla completa
                              </button>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => clearFile('evidencia_02')}
                          className="w-9 h-9 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500/50 rounded-xl flex items-center justify-center transition-all duration-200 hover:scale-105"
                          title="Eliminar imagen"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-red-400">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}

                </div>
                <div className="space-y-2">
                  <label className="block text-base font-semibold text-[#ff8c42]">Evidencia 3 (URL)</label>
                  
                  {!(formData.evidencia_03 instanceof File) ? (
                    <div className="flex gap-4">
                      <input
                        ref={fileInputRef3}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleFileChange('evidencia_03', file);
                          }
                        }}
                      />
                      <input
                        ref={cameraInputRef3}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleFileChange('evidencia_03', file);
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (fileInputRef3.current) {
                            fileInputRef3.current.click();
                          }
                        }}
                        className="flex-1 px-4 py-3 bg-gradient-to-r from-[#1e2538] to-[#2a3347] border border-[#3d4659] rounded-xl text-white hover:border-[#c9a45c]/50 hover:shadow-lg hover:shadow-[#c9a45c]/10 transition-all duration-300 flex items-center justify-center gap-2 group"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 group-hover:text-[#c9a45c] transition-colors">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                        </svg>
                        <span className="font-medium">Galería</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (cameraInputRef3.current) {
                            cameraInputRef3.current.click();
                          }
                        }}
                        className="flex-1 px-4 py-3 bg-gradient-to-r from-[#1e2538] to-[#2a3347] border border-[#3d4659] rounded-xl text-white hover:border-[#c9a45c]/50 hover:shadow-lg hover:shadow-[#c9a45c]/10 transition-all duration-300 flex items-center justify-center gap-2 group"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 group-hover:text-[#c9a45c] transition-colors">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                        </svg>
                        <span className="font-medium">Cámara</span>
                      </button>
                    </div>
                  ) : (
                    <div className="group relative overflow-hidden bg-gradient-to-br from-[#1e2538] to-[#2a3347] border border-[#3d4659] rounded-xl p-4 hover:border-[#c9a45c]/30 transition-all duration-300 hover:shadow-lg hover:shadow-[#c9a45c]/10">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className="w-12 h-12 bg-gradient-to-br from-[#c9a45c] to-[#d4b06c] rounded-xl flex items-center justify-center shadow-lg">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-[#1a1f35]">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Z" />
                              </svg>
                            </div>
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                              <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          </div>
                          <div>
                            <div className="text-white font-medium">Evidencia 3</div>
                            {/* Indicador de estado de compresión */}
                            {compressionStatus.evidencia_03.status !== 'idle' && (
                              <div className="mt-1 text-xs text-gray-400">
                                {compressionStatus.evidencia_03.status === 'compressing' && (
                                  <span className="text-[#c9a45c]">🔄 Comprimiendo...</span>
                                )}
                                {compressionStatus.evidencia_03.status === 'completed' && (
                                  <span className="text-green-400">✅ {compressionStatus.evidencia_03.stage}</span>
                                )}
                                {compressionStatus.evidencia_03.status === 'error' && (
                                  <span className="text-red-400">❌ Error: {compressionStatus.evidencia_03.error}</span>
                                )}
                              </div>
                            )}
                            {/* Información de tamaños */}
                            {fileSizes.evidencia_03.original > 0 && (
                              <div className="mt-1 text-xs text-gray-500">
                                {(fileSizes.evidencia_03.original / 1024).toFixed(1)} KB → {(fileSizes.evidencia_03.compressed / 1024).toFixed(1)} KB
                              </div>
                            )}
                            {/* Preview de imagen clickeable */}
                            {formData.evidencia_03 instanceof File && (
                              <button
                                type="button"
                                onClick={() => {
                                  const url = URL.createObjectURL(formData.evidencia_03 as File);
                                  openModal(url);
                                }}
                                className="mt-2 text-xs text-blue-400 hover:text-blue-300 underline flex items-center gap-1"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                Ver en pantalla completa
                              </button>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => clearFile('evidencia_03')}
                          className="w-9 h-9 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500/50 rounded-xl flex items-center justify-center transition-all duration-200 hover:scale-105"
                          title="Eliminar imagen"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-red-400">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            )}

            <div className="space-y-3">
              <label className="block text-base font-semibold text-[#ff8c42] flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                </svg>
                Notas
              </label>
              <div className="relative">
                <textarea
                  className="w-full px-4 py-3 md:py-4 bg-gradient-to-br from-[#1e2538] to-[#2a3347] border border-[#3d4659] rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#c9a45c]/50 focus:border-[#c9a45c]/50 transition-all duration-300 hover:border-[#c9a45c]/30 hover:shadow-lg hover:shadow-[#c9a45c]/10 backdrop-blur-sm resize-none"
                  value={formData.faltantes}
                  onChange={(e) => handleInputChange('faltantes', e.target.value)}
                  placeholder="Describe cualquier otro elemento faltante o comentario general..."
                  rows={4}
                />
                <div className="absolute top-4 right-4 pointer-events-none">
                  <svg className="w-5 h-5 text-[#c9a45c]/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="mt-8 space-y-4">
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 backdrop-blur-sm">
                  <p className="text-red-400 text-center font-medium">{error}</p>
                </div>
              )}

              {/* Indicadores de subida arriba del botón */}
              {uploads.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                    <span className="text-blue-400 text-sm font-medium">Estado de subidas</span>
                  </div>
                  {uploads.map((upload: any, index: number) => (
                    <div key={index} className="bg-gradient-to-r from-[#1e2538] to-[#2a3347] rounded-xl p-4 border border-[#3d4659] backdrop-blur-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            upload.status === 'uploading' ? 'bg-blue-500/20 border border-blue-500/30' :
                            upload.status === 'completed' ? 'bg-green-500/20 border border-green-500/30' :
                            'bg-red-500/20 border border-red-500/30'
                          }`}>
                            {upload.status === 'uploading' ? (
                              <svg className="w-4 h-4 text-blue-400 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            ) : upload.status === 'completed' ? (
                              <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            )}
                          </div>
                          <div>
                            <div className="text-white font-medium text-sm">{upload.fileName}</div>
                            <div className={`text-xs font-medium ${
                              upload.status === 'completed' ? 'text-green-400' :
                              upload.status === 'error' ? 'text-red-400' :
                              'text-blue-400'
                            }`}>
                              {upload.status === 'uploading' ? 'Subiendo...' :
                               upload.status === 'completed' ? 'Completado' :
                               'Error'}
                            </div>
                          </div>
                        </div>
                        {upload.progress > 0 && upload.status !== 'completed' && (
                          <div className="text-xs text-gray-400 font-mono">{upload.progress}%</div>
                        )}
                      </div>
                      
                      {/* Barra de progreso moderna */}
                      {upload.status === 'uploading' && (
                        <div className="mt-3 w-full bg-[#3d4659] rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-blue-400 to-blue-500 h-1.5 rounded-full transition-all duration-500 ease-out"
                            style={{ width: `${upload.progress}%` }}
                          />
                        </div>
                      )}
                      
                      {upload.error && (
                        <div className="mt-3 text-xs text-red-400 bg-red-500/10 rounded-lg p-2">
                          Error: {upload.error}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || uploadsInProgress}
                className={`w-full font-bold px-8 py-4 rounded-xl transform hover:scale-[1.02] transition-all duration-200 shadow-[0_8px_16px_rgb(0_0_0/0.2)] hover:shadow-[0_12px_24px_rgb(0_0_0/0.3)] relative overflow-hidden border-2 ${
                  loading || uploadsInProgress
                    ? 'bg-gradient-to-r from-green-500 via-green-400 to-green-500 text-white border-green-400 animate-pulse cursor-wait'
                    : 'bg-gradient-to-br from-[#c9a45c] via-[#d4b06c] to-[#f0c987] text-[#1a1f35] border-white/40 hover:border-white/60'
                } ${
                  loading || uploadsInProgress
                    ? 'before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/30 before:to-transparent before:translate-x-[-200%] before:animate-[shimmer_1s_infinite] after:absolute after:inset-0 after:bg-gradient-to-b after:from-white/20 after:to-transparent after:animate-pulse'
                    : 'before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/40 before:to-transparent before:translate-x-[-200%] before:animate-shimmer before:transition-transform before:duration-1000 after:absolute after:inset-0 after:bg-gradient-to-b after:from-white/20 after:to-transparent after:opacity-100 after:transition-opacity after:duration-300'
                }`}
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {loading || uploadsInProgress ? (
                    <>
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {uploadsInProgress ? 'Subiendo Imágenes...' : 'Guardando...'}
                    </>
                  ) : (
                    'Guardar Revisión'
                  )}
                </span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Modal de imagen en pantalla completa */}
      {modalOpen && modalImg && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 overflow-hidden">
          <div className="relative w-[90vw] h-[90vh] overflow-hidden bg-gradient-to-br from-[#1e2538]/20 to-[#2a3347]/20 backdrop-blur-md rounded-2xl border border-[#3d4659]/30">
            {/* Botón de cerrar */}
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 z-10 w-10 h-10 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 hover:border-red-500/70 rounded-full flex items-center justify-center transition-all duration-200 backdrop-blur-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            {/* Controles de zoom */}
            <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2">
              <button
                onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
                className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </button>
              <span className="text-white text-sm font-mono min-w-[3rem] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={() => setZoom(Math.min(5, zoom + 0.25))}
                className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
              <button
                onClick={() => {
                  setZoom(1);
                  setPosition({ x: 0, y: 0 });
                }}
                className="ml-2 px-3 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-white text-xs transition-colors"
              >
                Reset
              </button>
            </div>

            <div className="w-full h-full flex items-center justify-center p-4">
              <img
                ref={imgRef}
                src={modalImg}
                alt="Evidencia"
                className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
                style={{
                  transform: `scale(${zoom}) translate(${position.x}px, ${position.y}px)`,
                  cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
                  transition: isDragging ? 'none' : 'transform 0.1s ease-out',
                  touchAction: 'none'
                }}
                onWheel={handleWheel}
                onMouseDown={handleMouseDownImage}
                onMouseMove={handleMouseMoveImage}
                onMouseUp={handleMouseUpImage}
                onMouseLeave={handleMouseUpImage}
                onTouchStart={(e) => {
                  if (e.touches.length === 2) {
                    e.preventDefault();
                    const touch1 = e.touches[0];
                    const touch2 = e.touches[1];
                    const initialDistance = Math.hypot(
                      touch2.clientX - touch1.clientX,
                      touch2.clientY - touch1.clientY
                    );
                    setDragStart({ x: initialDistance, y: 0 });
                  } else if (e.touches.length === 1 && zoom > 1) {
                    e.preventDefault();
                    setIsDragging(true);
                    setDragStart({
                      x: e.touches[0].clientX - position.x,
                      y: e.touches[0].clientY - position.y
                    });
                  }
                }}
                onTouchMove={(e) => {
                  if (e.touches.length === 2) {
                    e.preventDefault();
                    const touch1 = e.touches[0];
                    const touch2 = e.touches[1];
                    const currentDistance = Math.hypot(
                      touch2.clientX - touch1.clientX,
                      touch2.clientY - touch1.clientY
                    );
                    const scaleChange = currentDistance / dragStart.x;
                    setZoom(Math.max(0.5, Math.min(5, zoom * scaleChange)));
                    setDragStart({ x: currentDistance, y: 0 });
                  } else if (e.touches.length === 1 && isDragging && zoom > 1) {
                    e.preventDefault();
                    setPosition({
                      x: e.touches[0].clientX - dragStart.x,
                      y: e.touches[0].clientY - dragStart.y
                    });
                  }
                }}
                onTouchEnd={() => {
                  setIsDragging(false);
                }}
              />
            </div>

            {/* Instrucciones */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 backdrop-blur-sm rounded-lg px-4 py-2">
              <p className="text-white text-xs text-center">
                🖱️ Rueda del ratón para zoom • 👆 Arrastra para mover • 📱 Pellizca para zoom
              </p>
            </div>
          </div>
        </div>
      )}
    </main>
  );
} 