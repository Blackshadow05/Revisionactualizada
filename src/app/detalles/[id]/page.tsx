'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';
import { compressImage } from '@/lib/imageUtils';
import { getWeek } from 'date-fns';
import { useAuth } from '@/context/AuthContext';

interface RevisionData {
  id?: string;
  created_at: string;
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
  faltantes: string;
  steamer: string;
  bolsa_vapor: string;
  plancha_cabello: string;
  bulto: string;
  sombrero: string;
  bolso_yute: string;
  evidencia_01: string;
  evidencia_02: string;
  evidencia_03: string;
  fecha_edicion: string;
  quien_edito: string;
  datos_anteriores: any;
  datos_actuales: any;
  fecha_creacion: string;
  camas_ordenadas: string;
  cola_caballo: string;
  Notas: string;
}

interface Nota {
  id: string;
  fecha: string;
  Casita: string;
  revision_id: string;
  nota: string;
  Evidencia: string;
  Usuario: string;
  created_at: string;
}

interface RegistroEdicion {
  id?: string;
  created_at?: string;
  "Usuario que Edito": string;
  Dato_anterior: string;
  Dato_nuevo: string;
}

export default function DetallesRevision() {
  const params = useParams();
  const router = useRouter();
  const [data, setData] = useState<RevisionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalImg, setModalImg] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const imgRef = useRef<HTMLImageElement>(null);
  const [notas, setNotas] = useState<Nota[]>([]);
  const [showNotaForm, setShowNotaForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<RevisionData | null>(null);
  const { userRole, user } = useAuth();
  const [registroEdiciones, setRegistroEdiciones] = useState<RegistroEdicion[]>([]);
  const [nuevaNota, setNuevaNota] = useState({
    fecha: new Date().toISOString().split('T')[0],
    Usuario: '',
    nota: '',
    evidencia: null as File | null,
  });

  const nombresRevisores = [
    'Ricardo B', 'Michael J', 'Ramiro Q', 'Adrian S', 'Esteban B',
    'Willy G', 'Juan M', 'Olman Z', 'Daniel V', 'Jefferson V',
    'Cristopher G', 'Emerson S', 'Joseph R'
  ];

  // Mapeo de nombres de campos técnicos a nombres legibles
  const fieldLabels: Record<string, string> = {
    casita: 'Casita',
    quien_revisa: 'Quien revisa',
    caja_fuerte: 'Caja fuerte',
    puertas_ventanas: 'Puertas y ventanas',
    chromecast: 'Chromecast',
    binoculares: 'Binoculares',
    trapo_binoculares: 'Trapo binoculares',
    speaker: 'Speaker',
    usb_speaker: 'USB Speaker',
    controles_tv: 'Controles TV',
    secadora: 'Secadora',
    accesorios_secadora: 'Accesorios secadora',
    accesorios_secadora_faltante: 'Accesorios secadora faltante',
    steamer: 'Steamer',
    bolsa_vapor: 'Bolsa vapor',
    plancha_cabello: 'Plancha cabello',
    bulto: 'Bulto',
    sombrero: 'Sombrero',
    bolso_yute: 'Bolso yute',
    camas_ordenadas: 'Camas ordenadas',
    cola_caballo: 'Cola caballo',
    evidencia_01: 'Evidencia 1',
    evidencia_02: 'Evidencia 2',
    evidencia_03: 'Evidencia 3',
    faltantes: 'Faltantes',
    Notas: 'Notas'
  };

  // Función para extraer el nombre del campo y valor de los datos de edición
  const parseEditData = (dataString: string) => {
    // Formato: [UUID] campo: valor
    const match = dataString.match(/^\[([a-f0-9-]+)\]\s+([^:]+):\s*(.*)$/);
    if (match) {
      const [, id, fieldName, value] = match;
      const displayName = fieldLabels[fieldName.trim()] || fieldName.trim();
      return {
        fieldName: fieldName.trim(),
        displayName,
        value: value.trim()
      };
    }
    return {
      fieldName: '',
      displayName: 'Campo desconocido',
      value: dataString
    };
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      if (!supabase) {
        throw new Error('No se pudo conectar con la base de datos');
      }

      console.log('🆔 ID de la revisión (params.id):', params.id);
      console.log('🆔 Tipo de params.id:', typeof params.id);

      const { data: revisionData, error: revisionError } = await supabase
        .from('revisiones_casitas')
        .select('*')
        .eq('id', params.id)
        .single();

      if (revisionError) throw revisionError;
      setData(revisionData);

      // Obtener notas asociadas a esta revisión específica
      console.log('🔍 Buscando notas para revision_id:', params.id);
      
      const { data: notasData, error: notasError } = await supabase
        .from('Notas')
        .select('*')
        .eq('revision_id', String(params.id)) // Convertir a string para la búsqueda
        .order('id', { ascending: false });
      
      console.log('📝 Notas encontradas:', notasData);
      console.log('📝 Cantidad de notas:', notasData?.length || 0);
      
      // También vamos a verificar todas las notas de esta casita para debug
      const { data: todasLasNotas } = await supabase
        .from('Notas')
        .select('*')
        .eq('Casita', revisionData.casita)
        .order('id', { ascending: false });
      
      console.log('🏠 Todas las notas de casita', revisionData.casita + ':', todasLasNotas);

      if (notasError) throw notasError;
      setNotas(notasData || []);

      // Obtener el historial de ediciones y filtrar por el ID de la revisión actual
      const { data: edicionesData, error: edicionesError } = await supabase
        .from('Registro_ediciones')
        .select('*')
        .order('created_at', { ascending: false });

      if (edicionesError) throw edicionesError;
      
      // Filtrar las ediciones que corresponden a esta revisión
      const edicionesFiltradas = edicionesData?.filter(edicion => 
        edicion.Dato_anterior.startsWith(`[${params.id}]`) || 
        edicion.Dato_nuevo.startsWith(`[${params.id}]`)
      ) || [];
      
      setRegistroEdiciones(edicionesFiltradas);
    } catch (error: any) {
      console.error('Error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [params.id]);

  const handleSubmitNota = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data || !supabase) return;
    
    try {
      setIsSubmitting(true);
      let evidenciaUrl = null;

      if (nuevaNota.evidencia) {
        const now = new Date();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const week = `semana_${getWeek(now, { weekStartsOn: 1 })}`;
        const folder = `notas/${month}/${week}`;
        
        const formDataCloudinary = new FormData();
        formDataCloudinary.append('file', nuevaNota.evidencia);
        formDataCloudinary.append('upload_preset', 'PruebaSubir');
        formDataCloudinary.append('cloud_name', 'dhd61lan4');
        formDataCloudinary.append('folder', folder);

        const response = await fetch(
          `https://api.cloudinary.com/v1_1/dhd61lan4/image/upload`,
          {
            method: 'POST',
            body: formDataCloudinary,
          }
        );

        if (!response.ok) {
          throw new Error('Error al subir la imagen a Cloudinary');
        }

        const data = await response.json();
        // Añadir los parámetros f_auto,q_auto a la URL
        const url = new URL(data.secure_url);
        url.pathname = url.pathname.replace('/upload/', '/upload/f_auto,q_auto/');
        evidenciaUrl = url.toString();
      }

      // Obtener fecha y hora local del dispositivo
      const now = new Date();
      const fechaLocal = new Date(now.getTime() - (now.getTimezoneOffset() * 60000));
      
      const notaData = {
        fecha: fechaLocal.toISOString(),
        Casita: data.casita,
        revision_id: String(params.id), // Convertir explícitamente a string
        Usuario: nuevaNota.Usuario,
        nota: nuevaNota.nota,
        Evidencia: evidenciaUrl
      };
      
      console.log('💾 Insertando nota con datos:', notaData);
      console.log('💾 revision_id que se va a insertar:', params.id, 'tipo:', typeof params.id);
      
      const { data: insertResult, error } = await supabase
        .from('Notas')
        .insert([notaData])
        .select();
      
      console.log('✅ Resultado de inserción:', insertResult);
      console.log('❌ Error de inserción:', error);

      if (error) throw error;

      setNuevaNota({
        fecha: new Date().toISOString().split('T')[0],
        Usuario: '',
        nota: '',
        evidencia: null
      });
      setShowNotaForm(false);
      fetchData();
    } catch (error: any) {
      console.error('Error al guardar la nota:', error);
      alert('Error al guardar la nota');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openModal = (imgUrl: string) => {
    setModalImg(imgUrl);
    setZoom(1);
    setPosition({ x: 0, y: 0 });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalImg(null);
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY;
    const newZoom = delta < 0 ? zoom * 1.1 : zoom / 1.1;
    setZoom(Math.min(Math.max(1, newZoom), 5));
  };

  const handleMouseDownImage = (e: React.MouseEvent) => {
    if (zoom > 1) {
      e.preventDefault();
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  };

  const handleMouseMoveImage = (e: React.MouseEvent) => {
    if (isDragging && zoom > 1) {
      e.preventDefault();
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      
      const img = imgRef.current;
      if (img) {
        const rect = img.getBoundingClientRect();
        const scaledWidth = rect.width * zoom;
        const scaledHeight = rect.height * zoom;
        
        const maxX = (scaledWidth - rect.width) / 2;
        const maxY = (scaledHeight - rect.height) / 2;
        
        setPosition({
          x: Math.min(Math.max(-maxX, newX), maxX),
          y: Math.min(Math.max(-maxY, newY), maxY)
        });
      }
    }
  };

  const handleMouseUpImage = () => {
    setIsDragging(false);
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev * 1.2, 5));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev / 1.2, 1));
    if (zoom <= 1) {
      setPosition({ x: 0, y: 0 });
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  const handleEdit = () => {
    if (!data) return;
    setEditedData({ ...data });
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!data || !editedData || !supabase) return;

    try {
      setIsSubmitting(true);
      // Obtener fecha y hora local del dispositivo sin zona horaria
      const now = new Date();
      // Crear fecha en formato ISO local (sin ajustes de zona horaria)
      const fechaLocal = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 19).replace('T', ' ');

      console.log('Fecha local generada:', fechaLocal);
      console.log('Iniciando actualización...');

      // Actualizar los datos en revisiones_casitas
      const { error: updateError } = await supabase
        .from('revisiones_casitas')
        .update({
          ...editedData,
          fecha_edicion: fechaLocal,
          quien_edito: user || 'Usuario'
        })
        .eq('id', data.id);

      if (updateError) {
        console.error('Error al actualizar revisiones_casitas:', updateError);
        throw updateError;
      }

      console.log('Actualización en revisiones_casitas exitosa');

      // Guardar el registro de cambios en Registro_ediciones
      const cambios = Object.entries(editedData).reduce((acc, [key, value]) => {
        if (key === 'id' || key === 'created_at' || key === 'fecha_edicion' || 
            key === 'quien_edito' || key === 'datos_anteriores' || key === 'datos_actuales') {
          return acc;
        }
        const valorAnterior = data[key as keyof RevisionData];
        if (value !== valorAnterior) {
          const registro = {
            "Usuario que Edito": user || 'Usuario',
            Dato_anterior: `[${data.id}] ${key}: ${String(valorAnterior || '')}`,
            Dato_nuevo: `[${data.id}] ${key}: ${String(value || '')}`,
            created_at: fechaLocal
          };
          console.log('Registro a insertar:', registro);
          acc.push(registro);
        }
        return acc;
      }, [] as RegistroEdicion[]);

      console.log('Cambios detectados:', cambios);

      if (cambios.length > 0) {
        console.log('Intentando insertar en Registro_ediciones...');
        const { data: insertData, error: registroError } = await supabase
          .from('Registro_ediciones')
          .insert(cambios)
          .select();

        if (registroError) {
          console.error('Error al guardar en Registro_ediciones:', registroError);
          console.error('Datos que causaron el error:', cambios);
          throw registroError;
        }

        console.log('Inserción exitosa en Registro_ediciones:', insertData);
      } else {
        console.log('No hay cambios para registrar');
      }

      setIsEditing(false);
      setEditedData(null);
      await fetchData();
    } catch (error: any) {
      console.error('Error detallado:', error);
      setError(`Error al guardar los cambios: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedData(null);
  };

  const handleInputChange = (field: keyof RevisionData, value: string) => {
    if (!editedData) return;
    setEditedData({ ...editedData, [field]: value });
  };

  // Función para comprimir imagen usando canvas
  const compressImage = (file: File, maxWidth = 1920, maxHeight = 1080, quality = 0.8): Promise<File> => {
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

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f1419] via-[#1a1f35] to-[#1e2538] flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23c9a45c%22%20fill-opacity%3D%220.03%22%3E%3Ccircle%20cx%3D%2230%22%20cy%3D%2230%22%20r%3D%222%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-50"></div>
      <div className="relative z-10 flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-[#c9a45c]/30 border-t-[#c9a45c] rounded-full animate-spin"></div>
        <p className="text-white text-lg font-medium">Cargando detalles...</p>
      </div>
    </div>
  );
  
  if (error) return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f1419] via-[#1a1f35] to-[#1e2538] flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23c9a45c%22%20fill-opacity%3D%220.03%22%3E%3Ccircle%20cx%3D%2230%22%20cy%3D%2230%22%20r%3D%222%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-50"></div>
      <div className="relative z-10 bg-gradient-to-br from-red-500/10 to-red-600/10 backdrop-blur-md rounded-2xl p-8 border border-red-500/20 max-w-md mx-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-red-400">Error</h2>
        </div>
        <p className="text-red-300">{error}</p>
      </div>
    </div>
  );
  
  if (!data) return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f1419] via-[#1a1f35] to-[#1e2538] flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23c9a45c%22%20fill-opacity%3D%220.03%22%3E%3Ccircle%20cx%3D%2230%22%20cy%3D%2230%22%20r%3D%222%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-50"></div>
      <div className="relative z-10 bg-gradient-to-br from-[#1e2538]/80 to-[#2a3347]/80 backdrop-blur-md rounded-2xl p-8 border border-[#3d4659]/50 max-w-md mx-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-[#c9a45c]/20 rounded-full flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#c9a45c]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 20c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8c0 1.913-.67 3.669-1.791 5.043L19.5 20.5 17 18" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-[#c9a45c]">Sin Datos</h2>
        </div>
        <p className="text-gray-300">No se encontraron datos para esta revisión</p>
      </div>
    </div>
  );

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#0f1419] via-[#1a1f35] to-[#1e2538] relative overflow-hidden">
      {/* Efectos de fondo */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23c9a45c%22%20fill-opacity%3D%220.03%22%3E%3Ccircle%20cx%3D%2230%22%20cy%3D%2230%22%20r%3D%222%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-50"></div>
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent via-transparent to-[#0f1419]/20"></div>
      
      {/* Orbes decorativos */}
      <div className="absolute top-20 left-10 w-32 h-32 bg-[#c9a45c]/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-20 right-10 w-40 h-40 bg-[#f0c987]/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      <div className="absolute top-1/2 left-1/4 w-24 h-24 bg-[#c9a45c]/5 rounded-full blur-2xl animate-pulse delay-500"></div>

      {/* Modal de imagen */}
      {modalOpen && modalImg && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 overflow-hidden">
          <div className="relative w-[90vw] h-[90vh] overflow-hidden bg-gradient-to-br from-[#1e2538]/20 to-[#2a3347]/20 backdrop-blur-md rounded-2xl border border-[#3d4659]/30">
            <div className="w-full h-full flex items-center justify-center p-4">
              <img
                ref={imgRef}
                src={modalImg}
                alt="Evidencia"
                className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
                style={{
                  transform: `scale(${zoom}) translate(${position.x}px, ${position.y}px)`,
                  cursor: zoom > 1 ? 'grab' : 'default',
                  transition: 'transform 0.1s ease-out',
                  touchAction: 'none'
                }}
                onWheel={handleWheel}
                onMouseDown={handleMouseDownImage}
                onMouseMove={handleMouseMoveImage}
                onMouseUp={handleMouseUpImage}
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
                    const scale = currentDistance / dragStart.x;
                    const newZoom = Math.min(Math.max(zoom * scale, 1), 5);
                    setZoom(newZoom);
                    setDragStart({ x: currentDistance, y: 0 });
                  } else if (isDragging && zoom > 1) {
                    e.preventDefault();
                    const touch = e.touches[0];
                    const newX = touch.clientX - dragStart.x;
                    const newY = touch.clientY - dragStart.y;
                    
                    const img = imgRef.current;
                    if (img) {
                      const rect = img.getBoundingClientRect();
                      const scaledWidth = rect.width * zoom;
                      const scaledHeight = rect.height * zoom;
                      
                      const maxX = (scaledWidth - rect.width) / 2;
                      const maxY = (scaledHeight - rect.height) / 2;
                      
                      setPosition({
                        x: Math.min(Math.max(-maxX, newX), maxX),
                        y: Math.min(Math.max(-maxY, newY), maxY)
                      });
                    }
                  }
                }}
                onTouchEnd={() => {
                  setIsDragging(false);
                }}
                onContextMenu={handleContextMenu}
              />
            </div>
            <div className="absolute top-4 right-4 flex gap-2">
              <button
                onClick={handleZoomIn}
                className="w-12 h-12 bg-gradient-to-br from-[#1e2538]/80 to-[#2a3347]/80 backdrop-blur-md border border-[#3d4659]/50 rounded-xl flex items-center justify-center text-white hover:from-[#2a3347]/80 hover:to-[#3d4659]/80 transition-all duration-300 transform hover:scale-110 shadow-lg hover:shadow-xl"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </button>
              <button
                onClick={handleZoomOut}
                className="w-12 h-12 bg-gradient-to-br from-[#1e2538]/80 to-[#2a3347]/80 backdrop-blur-md border border-[#3d4659]/50 rounded-xl flex items-center justify-center text-white hover:from-[#2a3347]/80 hover:to-[#3d4659]/80 transition-all duration-300 transform hover:scale-110 shadow-lg hover:shadow-xl"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </button>
              <button
                onClick={closeModal}
                className="w-12 h-12 bg-gradient-to-br from-red-500/80 to-red-600/80 backdrop-blur-md border border-red-500/50 rounded-xl flex items-center justify-center text-white hover:from-red-600/80 hover:to-red-700/80 transition-all duration-300 transform hover:scale-110 shadow-lg hover:shadow-xl"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="bg-gradient-to-br from-[#1e2538]/80 to-[#2a3347]/80 backdrop-blur-md rounded-2xl shadow-2xl border border-[#3d4659]/50 overflow-hidden">
          {/* Header con gradiente y efectos */}
          <div className="bg-gradient-to-r from-[#c9a45c]/10 to-[#f0c987]/10 border-b border-[#3d4659]/30 p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-[#c9a45c] to-[#f0c987] rounded-xl flex items-center justify-center shadow-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#1a1f35]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5.291A7.962 7.962 0 0112 20c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8c0 1.913-.67 3.669-1.791 5.043L19.5 20.5 17 18" />
                  </svg>
                </div>
                <div className="relative">
                  {/* Efecto de resplandor sutil */}
                  <div className="absolute -inset-2 bg-gradient-to-r from-[#c9a45c]/10 via-[#f0c987]/10 to-[#c9a45c]/10 blur-xl rounded-2xl"></div>
                  
                  <div className="relative">
                    <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
                      <span className="block bg-gradient-to-r from-white via-[#f0c987] to-[#c9a45c] bg-clip-text text-transparent drop-shadow-lg">
                        Detalles de
                      </span>
                      <span className="block bg-gradient-to-r from-[#c9a45c] via-[#f0c987] to-white bg-clip-text text-transparent mt-1 transform translate-x-1">
                        la Revisión
                      </span>
                    </h1>
                    
                    {/* Badge moderno para la casita */}
                    <div className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-gradient-to-r from-[#c9a45c]/20 to-[#f0c987]/20 backdrop-blur-sm rounded-full border border-[#c9a45c]/30">
                      <div className="w-2 h-2 bg-gradient-to-r from-[#c9a45c] to-[#f0c987] rounded-full animate-pulse"></div>
                      <span className="text-[#f0c987] font-semibold text-sm tracking-wide">
                        CASITA {data?.casita}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2 sm:gap-3 w-full sm:w-auto">
                {!isEditing ? (
                  (userRole === 'admin' || userRole === 'SuperAdmin') && (
                    <button
                      onClick={handleEdit}
                      className="flex-1 sm:flex-none px-4 py-2.5 bg-gradient-to-r from-[#c9a45c] to-[#f0c987] text-[#1a1f35] rounded-xl hover:from-[#d4b06c] hover:to-[#f7d498] transition-all duration-300 transform hover:scale-[1.02] shadow-lg hover:shadow-xl font-medium flex items-center justify-center gap-2 border border-[#f0c987]/20"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Editar
                    </button>
                  )
                ) : (
                  <>
                    <button
                      onClick={handleSaveEdit}
                      disabled={isSubmitting}
                      className="flex-1 sm:flex-none px-4 py-2.5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-300 transform hover:scale-[1.02] shadow-lg hover:shadow-xl font-medium flex items-center justify-center gap-2 border border-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? (
                        <>
                          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Editando...
                        </>
                      ) : (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Guardar
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="flex-1 sm:flex-none px-4 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-300 transform hover:scale-[1.02] shadow-lg hover:shadow-xl font-medium flex items-center justify-center gap-2 border border-red-500/20"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Cancelar
                    </button>
                  </>
                )}
                <button
                  onClick={() => router.back()}
                  className="flex-1 sm:flex-none px-4 py-2.5 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl hover:from-gray-700 hover:to-gray-800 transition-all duration-300 transform hover:scale-[1.02] shadow-lg hover:shadow-xl font-medium flex items-center justify-center gap-2 border border-gray-600/20"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Volver
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Información General */}
            <div className="bg-gradient-to-br from-[#2a3347]/60 to-[#1e2538]/60 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-[#3d4659]/30 shadow-lg">
              <div className="flex items-center gap-3 mb-4 sm:mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-[#c9a45c] to-[#f0c987] rounded-lg flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#1a1f35]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-white via-[#c9a45c] to-[#f0c987] bg-clip-text text-transparent">
                  Información General
                </h2>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-[#1e2538]/40 to-[#2a3347]/40 rounded-lg p-4 border border-[#3d4659]/20">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 bg-[#c9a45c] rounded-full"></div>
                      <span className="text-gray-400 text-sm font-medium">Casita</span>
                    </div>
                    <p className="text-lg sm:text-xl font-bold text-[#c9a45c]">{data?.casita}</p>
                  </div>
                  
                  <div className="bg-gradient-to-r from-[#1e2538]/40 to-[#2a3347]/40 rounded-lg p-4 border border-[#3d4659]/20">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                      <span className="text-gray-400 text-sm font-medium">Fecha de Revisión</span>
                    </div>
                    <p className="text-base sm:text-lg text-white font-medium">
                      {data?.created_at.split('.')[0].replace('T', ' ')}
                    </p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-[#1e2538]/40 to-[#2a3347]/40 rounded-lg p-4 border border-[#3d4659]/20">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      <span className="text-gray-400 text-sm font-medium">Revisado por</span>
                    </div>
                    <p className="text-base sm:text-lg text-white font-medium">{data?.quien_revisa}</p>
                  </div>
                  
                  <div className="bg-gradient-to-r from-[#1e2538]/40 to-[#2a3347]/40 rounded-lg p-4 border border-[#3d4659]/20">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                      <span className="text-gray-400 text-sm font-medium">Caja Fuerte</span>
                    </div>
                    {isEditing ? (
                      <select
                        value={editedData?.caja_fuerte}
                        onChange={(e) => handleInputChange('caja_fuerte', e.target.value)}
                        className="w-full px-3 py-2 bg-[#1e2538] border border-[#3d4659] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#c9a45c]/50 focus:border-[#c9a45c]/50 transition-all"
                      >
                        <option value="Si">Si</option>
                        <option value="No">No</option>
                        <option value="Check in">Check in</option>
                        <option value="Check out">Check out</option>
                        <option value="Upsell">Upsell</option>
                        <option value="Guardar Upsell">Guardar Upsell</option>
                        <option value="Back to Back">Back to Back</option>
                        <option value="Show Room">Show Room</option>
                      </select>
                    ) : (
                      <p className="text-base sm:text-lg text-white font-medium">{data?.caja_fuerte}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Accesorios */}
            <div className="bg-gradient-to-br from-[#2a3347]/60 to-[#1e2538]/60 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-[#3d4659]/30 shadow-lg">
              <div className="flex items-center gap-3 mb-4 sm:mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-orange-400 to-orange-500 bg-clip-text text-transparent">
                  Accesorios y Estado
                </h2>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(data || {}).map(([key, value]) => {
                  if (key === 'id' || key === 'created_at' || key === 'casita' || 
                      key === 'quien_revisa' || key === 'caja_fuerte' || 
                      key === 'fecha_edicion' || key === 'quien_edito' || 
                      key === 'datos_anteriores' || key === 'datos_actuales' || 
                      key === 'fecha_creacion' || key === 'Notas' ||
                      key.startsWith('evidencia_')) {
                    return null;
                  }

                  const label = key.split('_').map(word => 
                    word.charAt(0).toUpperCase() + word.slice(1)
                  ).join(' ');

                  return (
                    <div key={key} className="bg-gradient-to-br from-[#1e2538]/50 to-[#2a3347]/50 rounded-lg p-4 border border-[#3d4659]/20 hover:border-[#c9a45c]/30 transition-all duration-300 hover:shadow-lg">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                        <h3 className="text-sm font-semibold text-orange-400 uppercase tracking-wide">{label}</h3>
                      </div>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editedData?.[key as keyof RevisionData] || ''}
                          onChange={(e) => handleInputChange(key as keyof RevisionData, e.target.value)}
                          className="w-full px-3 py-2 bg-[#1e2538] border border-[#3d4659] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#c9a45c]/50 focus:border-[#c9a45c]/50 transition-all text-sm"
                        />
                      ) : (
                        <p className="text-white font-medium text-sm sm:text-base break-words">{value}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Evidencias */}
            {(data.evidencia_01 || data.evidencia_02 || data.evidencia_03) && (
              <div className="bg-gradient-to-br from-[#2a3347]/60 to-[#1e2538]/60 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-[#3d4659]/30 shadow-lg">
                <div className="flex items-center gap-3 mb-4 sm:mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-400 to-blue-500 bg-clip-text text-transparent">
                    Evidencias Fotográficas
                  </h2>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {data.evidencia_01 && (
                    <div className="bg-gradient-to-br from-[#1e2538]/50 to-[#2a3347]/50 rounded-lg p-4 border border-[#3d4659]/20 hover:border-blue-400/30 transition-all duration-300 hover:shadow-lg group">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                          <span className="text-blue-400 font-semibold text-sm">Evidencia 1</span>
                        </div>
                        <div className="w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </div>
                      </div>
                      <button
                        onClick={() => openModal(data.evidencia_01)}
                        className="w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-300 transform hover:scale-[1.02] shadow-lg hover:shadow-xl font-medium flex items-center justify-center gap-2 group-hover:shadow-blue-500/25"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        Ver Imagen
                      </button>
                    </div>
                  )}
                  
                  {data.evidencia_02 && (
                    <div className="bg-gradient-to-br from-[#1e2538]/50 to-[#2a3347]/50 rounded-lg p-4 border border-[#3d4659]/20 hover:border-blue-400/30 transition-all duration-300 hover:shadow-lg group">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                          <span className="text-blue-400 font-semibold text-sm">Evidencia 2</span>
                        </div>
                        <div className="w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </div>
                      </div>
                      <button
                        onClick={() => openModal(data.evidencia_02)}
                        className="w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-300 transform hover:scale-[1.02] shadow-lg hover:shadow-xl font-medium flex items-center justify-center gap-2 group-hover:shadow-blue-500/25"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        Ver Imagen
                      </button>
                    </div>
                  )}
                  
                  {data.evidencia_03 && (
                    <div className="bg-gradient-to-br from-[#1e2538]/50 to-[#2a3347]/50 rounded-lg p-4 border border-[#3d4659]/20 hover:border-blue-400/30 transition-all duration-300 hover:shadow-lg group">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                          <span className="text-blue-400 font-semibold text-sm">Evidencia 3</span>
                        </div>
                        <div className="w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </div>
                      </div>
                      <button
                        onClick={() => openModal(data.evidencia_03)}
                        className="w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-300 transform hover:scale-[1.02] shadow-lg hover:shadow-xl font-medium flex items-center justify-center gap-2 group-hover:shadow-blue-500/25"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        Ver Imagen
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Notas */}
            <div className="bg-gradient-to-br from-[#2a3347]/60 to-[#1e2538]/60 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-[#3d4659]/30 shadow-lg">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 sm:mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-purple-400 to-purple-500 bg-clip-text text-transparent">
                      Notas y Observaciones
                    </h2>
                    <p className="text-gray-400 text-sm mt-1">{notas.length} nota{notas.length !== 1 ? 's' : ''} registrada{notas.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                
                <button
                  onClick={() => setShowNotaForm(true)}
                  className="w-full sm:w-auto px-4 py-2.5 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl hover:from-purple-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-[1.02] shadow-lg hover:shadow-xl font-medium flex items-center justify-center gap-2 border border-purple-500/20"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Agregar Nota
                </button>
              </div>

              {showNotaForm && (
                <div className="bg-gradient-to-br from-[#1e2538]/80 to-[#2a3347]/80 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-[#3d4659]/40 mb-6 shadow-lg">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-bold text-purple-400">Nueva Nota</h3>
                  </div>
                  
                  <form onSubmit={handleSubmitNota} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          Usuario
                        </label>
                        <select
                          required
                          className="w-full px-4 py-3 bg-gradient-to-r from-[#1e2538] to-[#2a3347] border border-[#3d4659] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
                          value={nuevaNota.Usuario}
                          onChange={(e) => setNuevaNota({ ...nuevaNota, Usuario: e.target.value })}
                        >
                          <option value="">Seleccionar usuario</option>
                          {nombresRevisores.map(nombre => (
                            <option key={nombre} value={nombre}>{nombre}</option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          Evidencia (Opcional)
                        </label>
                        
                        {/* Input oculto para galería */}
                        <input
                          id="galeria-input"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              try {
                                const compressedFile = await compressImage(file);
                                setNuevaNota({ ...nuevaNota, evidencia: compressedFile });
                              } catch (error) {
                                console.error('Error al comprimir imagen:', error);
                                setNuevaNota({ ...nuevaNota, evidencia: file });
                              }
                            }
                          }}
                        />
                        
                        {/* Input oculto para cámara */}
                        <input
                          id="camara-input"
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              try {
                                const compressedFile = await compressImage(file);
                                setNuevaNota({ ...nuevaNota, evidencia: compressedFile });
                              } catch (error) {
                                console.error('Error al comprimir imagen:', error);
                                setNuevaNota({ ...nuevaNota, evidencia: file });
                              }
                            }
                          }}
                        />
                        
                        {/* Botones para seleccionar origen */}
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const input = document.getElementById('galeria-input') as HTMLInputElement;
                              input.value = '';
                              input.click();
                            }}
                            className="flex-1 px-3 py-2.5 bg-gradient-to-r from-[#1e2538] to-[#2a3347] border border-[#3d4659] rounded-xl text-white hover:from-[#2a3347] hover:to-[#34404d] transition-all duration-300 transform hover:scale-[1.02] flex items-center justify-center gap-2 text-sm font-medium"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                            Galería
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => {
                              const input = document.getElementById('camara-input') as HTMLInputElement;
                              input.value = '';
                              input.click();
                            }}
                            className="flex-1 px-3 py-2.5 bg-gradient-to-r from-purple-500 to-purple-600 border border-purple-500/20 rounded-xl text-white hover:from-purple-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-[1.02] flex items-center justify-center gap-2 text-sm font-medium"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            Cámara
                          </button>
                        </div>
                        
                        {/* Mostrar nombre del archivo seleccionado */}
                        {nuevaNota.evidencia && (
                          <div className="mt-2 text-xs text-purple-400 bg-purple-500/10 rounded-lg px-3 py-2 border border-purple-500/20">
                            📁 {nuevaNota.evidencia.name}
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Nota
                      </label>
                      <textarea
                        required
                        className="w-full px-4 py-3 bg-gradient-to-r from-[#1e2538] to-[#2a3347] border border-[#3d4659] rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all resize-none"
                        rows={4}
                        placeholder="Escribe tu observación aquí..."
                        value={nuevaNota.nota}
                        onChange={(e) => setNuevaNota({ ...nuevaNota, nota: e.target.value })}
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowNotaForm(false)}
                        className="w-full sm:w-auto px-4 py-2.5 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl hover:from-gray-700 hover:to-gray-800 transition-all duration-300 transform hover:scale-[1.02] shadow-lg hover:shadow-xl font-medium flex items-center justify-center gap-2"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl hover:from-purple-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-[1.02] shadow-lg hover:shadow-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed min-w-[140px]"
                      >
                        {isSubmitting ? (
                          <>
                            <svg className="animate-spin h-5 w-5 text-[#1a1f35]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Editando...
                          </>
                        ) : (
                          <>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            Guardar Nota
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div className="space-y-4">
                {notas.length > 0 ? (
                  notas.map((nota) => (
                    <div key={nota.id} className="bg-gradient-to-br from-[#1e2538]/50 to-[#2a3347]/50 rounded-xl p-4 sm:p-5 border border-[#3d4659]/20 hover:border-purple-400/30 transition-all duration-300 hover:shadow-lg">
                      <div className="flex flex-col sm:flex-row justify-between items-start gap-3 mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-purple-400 font-semibold text-sm">
                              {nota.Usuario}
                            </p>
                            <p className="text-gray-400 text-xs">
                              {nota.fecha.split('.')[0].replace('T', ' ')}
                            </p>
                          </div>
                        </div>
                        
                        {nota.Evidencia && (
                          <button
                            onClick={() => openModal(nota.Evidencia)}
                            className="px-3 py-1.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-300 transform hover:scale-[1.02] shadow-md hover:shadow-lg font-medium text-xs flex items-center gap-2"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            Ver Evidencia
                          </button>
                        )}
                      </div>
                      
                      <div className="bg-gradient-to-r from-[#1e2538]/30 to-[#2a3347]/30 rounded-lg p-3 border border-[#3d4659]/10">
                        <p className="text-gray-300 leading-relaxed text-sm sm:text-base">{nota.nota}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </div>
                    <p className="text-gray-400 text-lg font-medium">No hay notas registradas</p>
                    <p className="text-gray-500 text-sm mt-1">Agrega la primera nota para esta casita</p>
                  </div>
                )}
              </div>
            </div>

            {/* Historial de Ediciones */}
            <div className="bg-gradient-to-br from-[#2a3347]/60 to-[#1e2538]/60 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-[#3d4659]/30 shadow-lg">
              <div className="flex items-center gap-3 mb-4 sm:mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-amber-400 to-amber-500 bg-clip-text text-transparent">
                    Historial de Ediciones
                  </h2>
                  <p className="text-gray-400 text-sm mt-1">{registroEdiciones.length} edición{registroEdiciones.length !== 1 ? 'es' : ''} registrada{registroEdiciones.length !== 1 ? 's' : ''}</p>
                </div>
              </div>
              
              <div className="space-y-4">
                {registroEdiciones.length > 0 ? (
                  registroEdiciones.map((edicion, index) => (
                    <div key={index} className="bg-gradient-to-br from-[#1e2538]/50 to-[#2a3347]/50 rounded-xl p-4 sm:p-5 border border-[#3d4659]/20 hover:border-amber-400/30 transition-all duration-300 hover:shadow-lg">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 bg-amber-500/20 rounded-lg flex items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-amber-400 font-semibold text-sm">
                            {edicion["Usuario que Edito"]}
                          </p>
                          <p className="text-gray-400 text-xs">
                            {edicion.created_at ? edicion.created_at.split('+')[0].replace('T', ' ') : ''}
                          </p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="bg-gradient-to-r from-red-500/10 to-red-600/10 rounded-lg p-4 border border-red-500/20">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                            <span className="text-red-400 font-semibold text-sm">Valor Anterior</span>
                          </div>
                          {(() => {
                            const parsedData = parseEditData(edicion.Dato_anterior);
                            return (
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-medium text-red-300 bg-red-500/20 px-2 py-1 rounded-md">
                                    {parsedData.displayName}
                                  </span>
                                </div>
                                <p className="text-gray-300 text-sm leading-relaxed break-words bg-[#1a1f35]/50 p-3 rounded-lg border border-red-500/10">
                                  {parsedData.value || 'Sin valor'}
                                </p>
                              </div>
                            );
                          })()}
                        </div>
                        
                        <div className="bg-gradient-to-r from-green-500/10 to-green-600/10 rounded-lg p-4 border border-green-500/20">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                            <span className="text-green-400 font-semibold text-sm">Valor Nuevo</span>
                          </div>
                          {(() => {
                            const parsedData = parseEditData(edicion.Dato_nuevo);
                            return (
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-medium text-green-300 bg-green-500/20 px-2 py-1 rounded-md">
                                    {parsedData.displayName}
                                  </span>
                                </div>
                                <p className="text-gray-300 text-sm leading-relaxed break-words bg-[#1a1f35]/50 p-3 rounded-lg border border-green-500/10">
                                  {parsedData.value || 'Sin valor'}
                                </p>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-gray-400 text-lg font-medium">No hay ediciones registradas</p>
                    <p className="text-gray-500 text-sm mt-1">Los cambios futuros aparecerán aquí</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
} 