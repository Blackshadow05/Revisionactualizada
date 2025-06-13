'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import ButtonGroup from '@/components/ButtonGroup';
import { getWeek } from 'date-fns';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { useAuth } from '@/context/AuthContext';

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<RevisionData>({
    ...initialFormData,
    quien_revisa: user || ''
  });

  const [highlightedField, setHighlightedField] = useState<string | null>('casita');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef2 = useRef<HTMLInputElement>(null);
  const fileInputRef3 = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef2 = useRef<HTMLInputElement>(null);
  const cameraInputRef3 = useRef<HTMLInputElement>(null);

  // Efecto para actualizar quien_revisa cuando cambie el usuario
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        quien_revisa: user
      }));
    }
  }, [user]);

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

  const handleFileChange = (field: keyof FileData, file: File | null) => {
    if (error) setError(null);
    setFormData(prev => ({ ...prev, [field]: file }));
  };

  const compressImage = async (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1280;
          const MAX_HEIGHT = 1280;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              } else {
                reject(new Error('Error al comprimir la imagen'));
              }
            },
            'image/jpeg',
            0.7
          );
        };
      };
      reader.onerror = (error) => reject(error);
    });
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

      const uploadedUrls = {
        evidencia_01: '',
        evidencia_02: '',
        evidencia_03: '',
      };

      if (formData.evidencia_01 instanceof File) {
        const compressedFile = await compressImage(formData.evidencia_01);
        uploadedUrls.evidencia_01 = await uploadToCloudinary(compressedFile);
      }

      if (formData.evidencia_02 instanceof File) {
        const compressedFile = await compressImage(formData.evidencia_02);
        uploadedUrls.evidencia_02 = await uploadToCloudinary(compressedFile);
      }

      if (formData.evidencia_03 instanceof File) {
        const compressedFile = await compressImage(formData.evidencia_03);
        uploadedUrls.evidencia_03 = await uploadToCloudinary(compressedFile);
      }

      const { faltantes, accesorios_secadora_faltante, ...restOfFormData } = formData;

      const notas_completas = [
        accesorios_secadora_faltante ? `Faltante accesorios secadora: ${accesorios_secadora_faltante}` : '',
        faltantes ? `Faltantes generales: ${faltantes}` : ''
      ].filter(Boolean).join('\n');

      const { error } = await supabase
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
        ]);

      if (error) throw error;

      router.push('/');
    } catch (error: any) {
      console.error('Error al guardar la revisión:', error);
      setError(error.message);
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
              <div className="space-y-2">
                <label className="block text-base font-semibold text-[#ff8c42]">Casita <span className="text-red-500">*</span></label>
                <select
                  required
                  className={`w-full px-4 py-2 md:py-3 bg-[#1e2538] border border-[#3d4659] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#c9a45c] focus:border-transparent transition-all ${getHighlightStyle('casita')}`}
                  value={formData.casita}
                  onChange={(e) => handleInputChange('casita', e.target.value)}
                >
                  <option value="">Seleccionar casita</option>
                  {Array.from({ length: 50 }, (_, i) => i + 1).map(num => (
                    <option key={num} value={num}>{num}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-base font-semibold text-[#ff8c42]">Quien revisa <span className="text-red-500">*</span></label>
                {user ? (
                  <input
                    type="text"
                    value={user}
                    readOnly
                    className={`w-full px-4 py-2 md:py-3 bg-[#1e2538] border border-[#3d4659] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#c9a45c] focus:border-transparent transition-all ${getHighlightStyle('quien_revisa')}`}
                  />
                ) : (
                  <select
                    required
                    className="w-full px-4 py-2 md:py-3 bg-[#1e2538] border border-[#3d4659] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#c9a45c] focus:border-transparent transition-all"
                    value={formData.quien_revisa}
                    onChange={(e) => handleInputChange('quien_revisa', e.target.value)}
                  >
                    <option value="">Seleccionar persona</option>
                    {nombresRevisores.map(nombre => (
                      <option key={nombre} value={nombre}>{nombre}</option>
                    ))}
                  </select>
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
            
            <div className="space-y-2">
              <label className="block text-base font-semibold text-[#ff8c42]">¿Puertas y ventanas? (revisar casa por fuera) <span className="text-red-500">*</span></label>
              <input
                type="text"
                required
                className={`w-full px-4 py-2 md:py-3 bg-[#1e2538] border border-[#3d4659] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#c9a45c] focus:border-transparent transition-all ${getHighlightStyle('puertas_ventanas')}`}
                value={formData.puertas_ventanas}
                onChange={(e) => handleInputChange('puertas_ventanas', e.target.value)}
                placeholder="Estado de puertas y ventanas"
              />
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
              <div className="space-y-2">
                <label className="block text-base font-semibold text-[#ff8c42]">Accesorios secadora <span className="text-red-500">*</span></label>
                <select
                  required
                  className={`w-full px-4 py-2 md:py-3 bg-[#1e2538] border border-[#3d4659] rounded-lg text-white focus:ring-2 focus:ring-[#c9a45c] ${getHighlightStyle('accesorios_secadora')}`}
                  value={formData.accesorios_secadora}
                  onChange={(e) => handleInputChange('accesorios_secadora', e.target.value)}
                >
                  <option value="">Seleccionar cantidad</option>
                  <option key="0" value="0">0</option>
                  {Array.from({ length: 8 }, (_, i) => String(i + 1).padStart(2, '0')).map(num => (
                    <option key={num} value={num}>{num}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-base font-semibold text-[#ff8c42]">En caso de faltar un accesorio. Cual es?</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 md:py-3 bg-[#1e2538] border border-[#3d4659] rounded-lg text-white focus:ring-2 focus:ring-[#c9a45c]"
                  value={formData.accesorios_secadora_faltante}
                  onChange={(e) => handleInputChange('accesorios_secadora_faltante', e.target.value)}
                  placeholder="Describe el accesorio faltante"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
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
                      className="px-4 py-2 bg-[#1a1f35] border border-[#3d4659] rounded-md text-white hover:bg-[#2a3347] transition-colors flex items-center gap-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                      </svg>
                      <span>Galería</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (cameraInputRef.current) {
                          cameraInputRef.current.click();
                        }
                      }}
                      className="px-4 py-2 bg-[#1a1f35] border border-[#3d4659] rounded-md text-white hover:bg-[#2a3347] transition-colors flex items-center gap-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                      </svg>
                      <span>Cámara</span>
                    </button>
                  </div>
                  {formData.evidencia_01 instanceof File && (
                    <p className="mt-2 text-sm text-gray-400">
                      Archivo seleccionado: {formData.evidencia_01.name}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="block text-base font-semibold text-[#ff8c42]">Evidencia 2 (URL)</label>
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
                      className="px-4 py-2 bg-[#1a1f35] border border-[#3d4659] rounded-md text-white hover:bg-[#2a3347] transition-colors flex items-center gap-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                      </svg>
                      <span>Galería</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (cameraInputRef2.current) {
                          cameraInputRef2.current.click();
                        }
                      }}
                      className="px-4 py-2 bg-[#1a1f35] border border-[#3d4659] rounded-md text-white hover:bg-[#2a3347] transition-colors flex items-center gap-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                      </svg>
                      <span>Cámara</span>
                    </button>
                  </div>
                  {formData.evidencia_02 instanceof File && (
                    <p className="mt-2 text-sm text-gray-400">
                      Archivo seleccionado: {formData.evidencia_02.name}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="block text-base font-semibold text-[#ff8c42]">Evidencia 3 (URL)</label>
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
                      className="px-4 py-2 bg-[#1a1f35] border border-[#3d4659] rounded-md text-white hover:bg-[#2a3347] transition-colors flex items-center gap-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                      </svg>
                      <span>Galería</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (cameraInputRef3.current) {
                          cameraInputRef3.current.click();
                        }
                      }}
                      className="px-4 py-2 bg-[#1a1f35] border border-[#3d4659] rounded-md text-white hover:bg-[#2a3347] transition-colors flex items-center gap-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                      </svg>
                      <span>Cámara</span>
                    </button>
                  </div>
                  {formData.evidencia_03 instanceof File && (
                    <p className="mt-2 text-sm text-gray-400">
                      Archivo seleccionado: {formData.evidencia_03.name}
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-base font-semibold text-[#ff8c42]">Notas</label>
              <textarea
                className="w-full px-4 py-2 md:py-3 bg-[#1e2538] border border-[#3d4659] rounded-lg text-white focus:ring-2 focus:ring-[#c9a45c]"
                value={formData.faltantes}
                onChange={(e) => handleInputChange('faltantes', e.target.value)}
                placeholder="Describe cualquier otro elemento faltante o comentario general..."
                rows={3}
              />
            </div>

            <div className="mt-8">
              {error && (
                <div className="mb-4 bg-red-500/10 border border-red-500 rounded-lg p-4">
                  <p className="text-red-500 text-center font-semibold">{error}</p>
                </div>
              )}
              <button
                type="submit"
                disabled={loading}
                className={`w-full ${
                  loading 
                    ? 'bg-[#00ff00] text-white animate-pulse border-2 border-[#00ff00] shadow-[0_0_15px_#00ff00]' 
                    : 'bg-gradient-to-br from-[#c9a45c] via-[#d4b06c] to-[#f0c987] text-[#1a1f35]'
                } font-bold px-8 py-3 md:py-4 rounded-xl transform hover:scale-[1.02] transition-all duration-200 shadow-[0_8px_16px_rgb(0_0_0/0.2)] hover:shadow-[0_12px_24px_rgb(0_0_0/0.3)] relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/40 before:to-transparent before:translate-x-[-200%] hover:before:translate-x-[200%] before:transition-transform before:duration-1000 after:absolute after:inset-0 after:bg-gradient-to-b after:from-white/20 after:to-transparent after:opacity-0 hover:after:opacity-100 after:transition-opacity after:duration-300 border-2 border-white/40 hover:border-white/60 ${loading ? 'opacity-100 cursor-wait' : ''}`}
              >
                {loading ? 'Guardando...' : 'Guardar Revisión'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
} 