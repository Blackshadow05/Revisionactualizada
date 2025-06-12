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

  const fetchData = async () => {
    try {
      setLoading(true);
      if (!supabase) {
        throw new Error('No se pudo conectar con la base de datos');
      }

      const { data: revisionData, error: revisionError } = await supabase
        .from('revisiones_casitas')
        .select('*')
        .eq('id', params.id)
        .single();

      if (revisionError) throw revisionError;
      setData(revisionData);

      // Obtener notas asociadas a esta casita
      const { data: notasData, error: notasError } = await supabase
        .from('Notas')
        .select('*')
        .eq('Casita', revisionData.casita)
        .order('id', { ascending: false });

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
        const compressedImage = await compressImage(nuevaNota.evidencia);
        const now = new Date();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const week = `semana_${getWeek(now, { weekStartsOn: 1 })}`;
        const folder = `notas/${month}/${week}`;
        
        const formDataCloudinary = new FormData();
        formDataCloudinary.append('file', compressedImage);
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
        evidenciaUrl = data.secure_url;
      }

      // Obtener fecha y hora local del dispositivo
      const now = new Date();
      const fechaLocal = new Date(now.getTime() - (now.getTimezoneOffset() * 60000));
      
      const { error } = await supabase
        .from('Notas')
        .insert([
          {
            fecha: fechaLocal.toISOString(),
            Casita: data.casita,
            Usuario: nuevaNota.Usuario,
            nota: nuevaNota.nota,
            Evidencia: evidenciaUrl
          }
        ]);

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
      // Obtener fecha y hora local del dispositivo sin ajustes de zona horaria
      const now = new Date();
      const fechaLocal = now.toLocaleString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).replace(',', '');

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

  if (loading) return <div className="min-h-screen bg-gradient-to-br from-[#1a1f35] to-[#2d364c] flex items-center justify-center text-white">Cargando...</div>;
  if (error) return <div className="min-h-screen bg-gradient-to-br from-[#1a1f35] to-[#2d364c] flex items-center justify-center text-red-500">Error: {error}</div>;
  if (!data) return <div className="min-h-screen bg-gradient-to-br from-[#1a1f35] to-[#2d364c] flex items-center justify-center text-white">No se encontraron datos</div>;

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#1a1f35] to-[#2d364c]">
      {/* Modal de imagen */}
      {modalOpen && modalImg && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 overflow-hidden">
          <div className="relative w-[90vw] h-[90vh] overflow-hidden">
            <div className="w-full h-full flex items-center justify-center">
              <img
                ref={imgRef}
                src={modalImg}
                alt="Evidencia"
                className="max-w-full max-h-full object-contain"
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
                className="text-white bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-75 transition-all"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </button>
              <button
                onClick={handleZoomOut}
                className="text-white bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-75 transition-all"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </button>
              <button
                onClick={closeModal}
                className="text-white bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-75 transition-all"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-[#1e2538] rounded-lg shadow-xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-white">Detalles de la Revisión</h1>
            <div className="flex gap-4">
              {!isEditing ? (
                (userRole === 'admin' || userRole === 'SuperAdmin') && (
                  <button
                    onClick={handleEdit}
                    className="px-4 py-2 bg-[#c9a45c] text-white rounded-lg hover:bg-[#d4b06c] transition-all transform hover:scale-[1.02] shadow-[0_8px_16px_rgb(0_0_0/0.2)] hover:shadow-[0_12px_24px_rgb(0_0_0/0.3)] relative overflow-hidden border-2 border-white/40 hover:border-white/60"
                  >
                    Editar
                  </button>
                )
              ) : (
                <>
                  <button
                    onClick={handleSaveEdit}
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all transform hover:scale-[1.02] shadow-[0_8px_16px_rgb(0_0_0/0.2)] hover:shadow-[0_12px_24px_rgb(0_0_0/0.3)] relative overflow-hidden border-2 border-white/40 hover:border-white/60"
                  >
                    {isSubmitting ? 'Guardando...' : 'Guardar'}
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all transform hover:scale-[1.02] shadow-[0_8px_16px_rgb(0_0_0/0.2)] hover:shadow-[0_12px_24px_rgb(0_0_0/0.3)] relative overflow-hidden border-2 border-white/40 hover:border-white/60"
                  >
                    Cancelar
                  </button>
                </>
              )}
              <button
                onClick={() => router.back()}
                className="px-4 py-2 text-[#1a1f35] bg-gradient-to-br from-[#c9a45c] via-[#d4b06c] to-[#f0c987] rounded-xl hover:from-[#d4b06c] hover:via-[#e0bc7c] hover:to-[#f7d498] transform hover:scale-[1.02] transition-all duration-200 shadow-[0_8px_16px_rgb(0_0_0/0.2)] hover:shadow-[0_12px_24px_rgb(0_0_0/0.3)] relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/40 before:to-transparent before:translate-x-[-200%] hover:before:translate-x-[200%] before:transition-transform before:duration-1000 after:absolute after:inset-0 after:bg-gradient-to-b after:from-white/20 after:to-transparent after:opacity-0 hover:after:opacity-100 after:transition-opacity after:duration-300 border border-[#f0c987]/20 hover:border-[#f0c987]/40 min-w-[100px] whitespace-nowrap"
              >
                Volver
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <h2 className="text-xl md:text-2xl text-[#c9a45c] font-semibold mb-4">Información General</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <p className="text-base md:text-lg text-gray-300">
                    <span className="text-gray-400">Casita:</span>{' '}
                    <span className="text-green-500 font-semibold">{data?.casita}</span>
                  </p>
                  <p className="text-base md:text-lg text-gray-300">
                    <span className="text-gray-400">Fecha:</span>{' '}
                    {data?.created_at.split('.')[0].replace('T', ' ')}
                  </p>
                  <p className="text-base md:text-lg text-gray-300">
                    <span className="text-gray-400">Revisado por:</span>{' '}
                    {data?.quien_revisa}
                  </p>
                  <p className="text-base md:text-lg text-gray-300">
                    <span className="text-gray-400">Caja fuerte:</span>{' '}
                    {isEditing ? (
                      <select
                        value={editedData?.caja_fuerte}
                        onChange={(e) => handleInputChange('caja_fuerte', e.target.value)}
                        className="ml-2 px-2 py-1 bg-[#2a3347] border border-[#3d4659] rounded-md text-white"
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
                      data?.caja_fuerte
                    )}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-xl md:text-2xl text-[#c9a45c] font-semibold mb-4">Accesorios</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    <div key={key}>
                      <h3 className="text-lg md:text-xl text-[#ff8c42] font-semibold mb-3">{label}</h3>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editedData?.[key as keyof RevisionData] || ''}
                          onChange={(e) => handleInputChange(key as keyof RevisionData, e.target.value)}
                          className="w-full px-4 py-2 bg-[#2a3347] border border-[#3d4659] rounded-md text-white"
                        />
                      ) : (
                        <p className="text-base md:text-lg text-gray-300">{value}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {(data.evidencia_01 || data.evidencia_02 || data.evidencia_03) && (
              <div>
                <h2 className="text-[#c9a45c] font-semibold mb-4">Evidencias</h2>
                <div className="bg-[#2a3347] rounded p-4">
                  <div className="flex gap-4">
                    {data.evidencia_01 && (
                      <button
                        onClick={() => openModal(data.evidencia_01)}
                        className="bg-[#c9a45c] text-white px-3 py-1.5 text-sm rounded hover:bg-[#d4b06c] transition-all transform hover:scale-[1.02] shadow-[0_4px_8px_rgb(0_0_0/0.2)] hover:shadow-[0_6px_12px_rgb(0_0_0/0.3)] relative overflow-hidden border border-white/20 hover:border-white/40"
                      >
                        Ver
                      </button>
                    )}
                    {data.evidencia_02 && (
                      <button
                        onClick={() => openModal(data.evidencia_02)}
                        className="bg-[#c9a45c] text-white px-3 py-1.5 text-sm rounded hover:bg-[#d4b06c] transition-all transform hover:scale-[1.02] shadow-[0_4px_8px_rgb(0_0_0/0.2)] hover:shadow-[0_6px_12px_rgb(0_0_0/0.3)] relative overflow-hidden border border-white/20 hover:border-white/40"
                      >
                        Ver
                      </button>
                    )}
                    {data.evidencia_03 && (
                      <button
                        onClick={() => openModal(data.evidencia_03)}
                        className="bg-[#c9a45c] text-white px-3 py-1.5 text-sm rounded hover:bg-[#d4b06c] transition-all transform hover:scale-[1.02] shadow-[0_4px_8px_rgb(0_0_0/0.2)] hover:shadow-[0_6px_12px_rgb(0_0_0/0.3)] relative overflow-hidden border border-white/20 hover:border-white/40"
                      >
                        Ver
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-[#ff4d4d] font-semibold">Notas</h2>
                <button
                  onClick={() => setShowNotaForm(true)}
                  className="px-4 py-2 bg-[#ff4d4d] text-white rounded-lg hover:bg-[#ff6b6b] transition-all transform hover:scale-[1.02] shadow-[0_8px_16px_rgb(0_0_0/0.2)] hover:shadow-[0_12px_24px_rgb(0_0_0/0.3)] relative overflow-hidden border-2 border-white/40 hover:border-white/60 animate-shimmer-mobile md:animate-none"
                >
                  + Agregar Nota
                </button>
              </div>

              {showNotaForm && (
                <div className="bg-[#1e2538] rounded-lg p-4 mb-4">
                  <form onSubmit={handleSubmitNota} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Usuario</label>
                      <select
                        required
                        className="w-full px-4 py-2 bg-[#2a3347] border border-[#3d4659] rounded-md text-white"
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
                      <label className="block text-sm font-medium text-gray-300 mb-1">Nota</label>
                      <textarea
                        required
                        className="w-full px-4 py-2 bg-[#2a3347] border border-[#3d4659] rounded-md text-white"
                        rows={3}
                        value={nuevaNota.nota}
                        onChange={(e) => setNuevaNota({ ...nuevaNota, nota: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Evidencia</label>
                      <input
                        type="file"
                        accept="image/*"
                        className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#c9a45c]/20 file:text-[#c9a45c] hover:file:bg-[#c9a45c]/30"
                        onChange={(e) => setNuevaNota({ ...nuevaNota, evidencia: e.target.files?.[0] || null })}
                      />
                    </div>

                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowNotaForm(false)}
                        className="px-4 py-2 bg-[#3d4659] text-gray-300 rounded-lg hover:bg-[#4a5568] transition-all transform hover:scale-[1.02] shadow-[0_8px_16px_rgb(0_0_0/0.2)] hover:shadow-[0_12px_24px_rgb(0_0_0/0.3)] relative overflow-hidden border border-[#4a5568]/20 hover:border-[#4a5568]/40 animate-shimmer-mobile md:animate-none"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className={`px-4 py-2 text-sm font-medium text-[#1a1f35] ${isSubmitting ? 'bg-[#22c55e] hover:bg-[#22c55e]' : 'bg-[#f0c987] hover:bg-[#f7d498]'} rounded-xl transition-all transform hover:scale-[1.02] shadow-[0_8px_16px_rgb(0_0_0/0.2)] hover:shadow-[0_12px_24px_rgb(0_0_0/0.3)] relative overflow-hidden border-2 border-white/40 hover:border-white/60 disabled:opacity-50 flex items-center justify-center gap-2 min-w-[120px] animate-shimmer-mobile md:animate-none`}
                      >
                        {isSubmitting ? (
                          <>
                            <svg className="animate-spin h-5 w-5 text-[#1a1f35]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>Guardando...</span>
                          </>
                        ) : (
                          <>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            <span>Guardar Nota</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div className="space-y-4">
                {notas.map((nota) => (
                  <div key={nota.id} className="bg-[#1e2538] rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-[#ff4d4d] font-medium">
                          {nota.fecha.split('.')[0].replace('T', ' ')}
                        </p>
                        <p className="text-gray-400 text-sm">Por: {nota.Usuario}</p>
                      </div>
                    </div>
                    <p className="text-gray-300 mb-2">{nota.nota}</p>
                    {nota.Evidencia && (
                      <button
                        onClick={() => openModal(nota.Evidencia)}
                        className="text-[#ff4d4d] hover:text-[#ff6b6b] transition-colors"
                      >
                        Ver evidencia
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Nueva sección para el historial de ediciones */}
            <div className="mt-8">
              <h2 className="text-[#c9a45c] font-semibold mb-4">Historial de Ediciones</h2>
              <div className="space-y-4">
                {registroEdiciones.map((edicion, index) => (
                  <div key={index} className="bg-[#1e2538] rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-[#c9a45c] font-medium">
                          {edicion.created_at ? edicion.created_at.split('+')[0].replace('T', ' ') : ''}
                        </p>
                        <p className="text-gray-400 text-sm">Editado por: {edicion["Usuario que Edito"]}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                      <div className="bg-[#2a3347] p-3 rounded">
                        <p className="text-gray-400 text-sm mb-1">Dato Anterior:</p>
                        <p className="text-gray-300">
                          {edicion.Dato_anterior.split(': ').slice(1).join(': ')}
                        </p>
                      </div>
                      <div className="bg-[#2a3347] p-3 rounded">
                        <p className="text-gray-400 text-sm mb-1">Dato Nuevo:</p>
                        <p className="text-gray-300">
                          {edicion.Dato_nuevo.split(': ').slice(1).join(': ')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                {registroEdiciones.length === 0 && (
                  <p className="text-gray-400 text-center py-4">No hay ediciones registradas</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
} 