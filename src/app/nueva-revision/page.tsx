'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useUpload } from '@/context/UploadContext';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import UploadProgress from '@/components/UploadProgress';

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
  const { addUpload, uploads } = useUpload();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revisionId, setRevisionId] = useState<string | null>(null);
  const supabase = createClientComponentClient();

  const [formData, setFormData] = useState<RevisionData>(initialFormData);
  const [fileData, setFileData] = useState<FileData>(initialFileData);
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
    setFileData(prev => ({ ...prev, [field]: file }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Insertar la revisión en Supabase
      const { data: revision, error: insertError } = await supabase
        .from('revisiones_casitas')
        .insert([formData])
        .select()
        .single();

      if (insertError) throw insertError;

      setRevisionId(revision.id);

      // Subir las imágenes en segundo plano
      const files = [
        fileData.evidencia_01,
        fileData.evidencia_02,
        fileData.evidencia_03
      ].filter((file): file is File => file !== null);

      for (const file of files) {
        if (file.size > 0) {
          await addUpload(file, revision.id);
        }
      }

      router.push('/');
    } catch (err) {
      console.error('Error al guardar la revisión:', err);
      setError('Error al guardar la revisión. Por favor, intente nuevamente.');
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
    <div className="min-h-screen bg-[#1e2538] p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-8">Nueva Revisión</h1>

        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-500 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="casita" className="block text-sm font-medium text-gray-300 mb-2">
              Casita
            </label>
            <input
              type="text"
              id="casita"
              name="casita"
              value={formData.casita}
              onChange={(e) => handleInputChange('casita', e.target.value)}
              required
              className={`w-full px-4 py-2 bg-[#2a3347] border border-[#3d4659] rounded text-white focus:outline-none focus:border-[#c9a45c] ${getHighlightStyle('casita')}`}
            />
          </div>

          <div>
            <label htmlFor="quien_revisa" className="block text-sm font-medium text-gray-300 mb-2">
              Quién Revisa
            </label>
            <select
              id="quien_revisa"
              name="quien_revisa"
              value={formData.quien_revisa}
              onChange={(e) => handleInputChange('quien_revisa', e.target.value)}
              required
              className={`w-full px-4 py-2 bg-[#2a3347] border border-[#3d4659] rounded text-white focus:outline-none focus:border-[#c9a45c] ${getHighlightStyle('quien_revisa')}`}
            >
              <option value="">Seleccione un revisor</option>
              {nombresRevisores.map((nombre) => (
                <option key={nombre} value={nombre}>
                  {nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="caja_fuerte" className="block text-sm font-medium text-gray-300 mb-2">
              Tipo de Revisión
            </label>
            <select
              id="caja_fuerte"
              name="caja_fuerte"
              value={formData.caja_fuerte}
              onChange={(e) => handleInputChange('caja_fuerte', e.target.value)}
              required
              className={`w-full px-4 py-2 bg-[#2a3347] border border-[#3d4659] rounded text-white focus:outline-none focus:border-[#c9a45c] ${getHighlightStyle('caja_fuerte')}`}
            >
              <option value="">Seleccione un tipo</option>
              <option value="Check in">Check in</option>
              <option value="Upsell">Upsell</option>
              <option value="Back to Back">Back to Back</option>
            </select>
          </div>

          {showEvidenceFields && (
            <div className="space-y-4">
              <div>
                <label htmlFor="evidencia_01" className="block text-sm font-medium text-gray-300 mb-2">
                  Evidencia 1
                </label>
                <input
                  type="file"
                  id="evidencia_01"
                  name="evidencia_01"
                  accept="image/*"
                  onChange={(e) => handleFileChange('evidencia_01', e.target.files?.[0] || null)}
                  className="w-full px-4 py-2 bg-[#2a3347] border border-[#3d4659] rounded text-white focus:outline-none focus:border-[#c9a45c]"
                />
              </div>

              <div>
                <label htmlFor="evidencia_02" className="block text-sm font-medium text-gray-300 mb-2">
                  Evidencia 2
                </label>
                <input
                  type="file"
                  id="evidencia_02"
                  name="evidencia_02"
                  accept="image/*"
                  onChange={(e) => handleFileChange('evidencia_02', e.target.files?.[0] || null)}
                  className="w-full px-4 py-2 bg-[#2a3347] border border-[#3d4659] rounded text-white focus:outline-none focus:border-[#c9a45c]"
                />
              </div>

              <div>
                <label htmlFor="evidencia_03" className="block text-sm font-medium text-gray-300 mb-2">
                  Evidencia 3
                </label>
                <input
                  type="file"
                  id="evidencia_03"
                  name="evidencia_03"
                  accept="image/*"
                  onChange={(e) => handleFileChange('evidencia_03', e.target.files?.[0] || null)}
                  className="w-full px-4 py-2 bg-[#2a3347] border border-[#3d4659] rounded text-white focus:outline-none focus:border-[#c9a45c]"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full px-4 py-2 rounded text-white font-medium ${
              loading
                ? 'bg-gray-500 cursor-not-allowed'
                : 'bg-[#c9a45c] hover:bg-[#b8934a]'
            }`}
          >
            {loading ? 'Guardando...' : 'Guardar Revisión'}
          </button>
        </form>

        {revisionId && (
          <div className="mt-8">
            <UploadProgress />
          </div>
        )}
      </div>
    </div>
  );
} 