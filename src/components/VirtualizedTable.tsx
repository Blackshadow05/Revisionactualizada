'use client';

import React, { memo, useCallback, useState, useRef, useEffect } from 'react';
import { FixedSizeList as List } from 'react-window';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface RevisionData {
  id: string;
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
  steamer: string;
  bolsa_vapor: string;
  plancha_cabello: string;
  bulto: string;
  sombrero: string;
  bolso_yute: string;
  evidencia_01?: string;
  evidencia_02?: string;
  evidencia_03?: string;
  notas?: string;
  notas_count?: number;
  camas_ordenadas: string;
  cola_caballo: string;
}

interface VirtualizedTableProps {
  data: RevisionData[];
  openModal: (url: string) => void;
  containerRef: React.RefObject<HTMLDivElement>;
}

// Componente Row memoizado para evitar re-renders
const Row = memo(({ 
  index, 
  style, 
  data 
}: { 
  index: number; 
  style: React.CSSProperties; 
  data: { 
    items: RevisionData[]; 
    openModal: (url: string) => void;
    router: any;
  } 
}) => {
  const { items, openModal, router } = data;
  const row = items[index];
  
  if (!row) return null;

  return (
    <div 
      style={style} 
      className="border-b border-[#3d4659]/50 text-gray-300 hover:bg-[#1e2538]/50 transition-colors duration-200 flex items-center"
    >
      {/* Fecha - Columna fija 1 */}
      <div className="table-col-fixed-1 flex-shrink-0">
        <div className="flex flex-col whitespace-nowrap">
          <span className="text-[11px] md:text-xs text-[#c9a45c]">
            {row.created_at.split('+')[0].split('T')[0]}
          </span>
          <span className="text-[11px] md:text-xs text-[#c9a45c]">
            {row.created_at.split('+')[0].split('T')[1].split(':').slice(0,2).join(':')}
          </span>
        </div>
      </div>

      {/* Casita - Columna fija 2 */}
      <div className="table-col-fixed-2 flex-shrink-0">
        <button
          onClick={() => router.push(`/detalles/${row.id}`)}
          className={
            (row.notas_count && row.notas_count > 0
              ? 'text-orange-400 font-extrabold underline underline-offset-4 decoration-orange-400/60 hover:text-orange-300 hover:decoration-orange-300/80 scale-105'
              : 'text-sky-400 hover:text-sky-300 underline decoration-sky-400/30 hover:decoration-sky-300/50') +
            ' transition-colors duration-200 hover:scale-105 transform text-sm'
          }
        >
          {row.casita}
        </button>
      </div>

      {/* Resto de columnas en contenedor scrolleable */}
      <div className="flex overflow-x-auto flex-1">
        <div className="px-2 py-2 min-w-[70px] text-xs">{row.quien_revisa}</div>
        <div className="px-2 py-2 min-w-[70px] text-xs">{row.caja_fuerte}</div>
        <div className="px-2 py-2 min-w-[70px] text-xs">{row.puertas_ventanas}</div>
        <div className="px-2 py-2 min-w-[55px] text-xs">{row.chromecast}</div>
        <div className="px-2 py-2 min-w-[55px] text-xs">{row.binoculares}</div>
        <div className="px-2 py-2 min-w-[55px] text-xs">{row.trapo_binoculares}</div>
        <div className="px-2 py-2 min-w-[55px] text-xs">{row.speaker}</div>
        <div className="px-2 py-2 min-w-[55px] text-xs">{row.usb_speaker}</div>
        <div className="px-2 py-2 min-w-[55px] text-xs">{row.controles_tv}</div>
        <div className="px-2 py-2 min-w-[50px] text-xs">{row.secadora}</div>
        <div className="px-2 py-2 min-w-[50px] text-xs">{row.accesorios_secadora}</div>
        <div className="px-2 py-2 min-w-[50px] text-xs">{row.steamer}</div>
        <div className="px-2 py-2 min-w-[50px] text-xs">{row.bolsa_vapor}</div>
        <div className="px-2 py-2 min-w-[50px] text-xs">{row.plancha_cabello}</div>
        <div className="px-2 py-2 min-w-[50px] text-xs">{row.bulto}</div>
        <div className="px-2 py-2 min-w-[50px] text-xs">{row.sombrero}</div>
        <div className="px-2 py-2 min-w-[50px] text-xs">{row.bolso_yute}</div>
        <div className="px-2 py-2 min-w-[50px] text-xs">{row.camas_ordenadas}</div>
        <div className="px-2 py-2 min-w-[50px] text-xs">{row.cola_caballo}</div>
        <div className="px-2 py-2 min-w-[65px] text-xs">{row.notas}</div>
        <div className="px-2 py-2 min-w-[60px] text-xs">
          <div className="flex items-center gap-1">
            {row.evidencia_01 && (
              <button
                onClick={() => openModal(row.evidencia_01!)}
                className="text-[#c9a45c] hover:text-[#f0c987] bg-[#1e2538]/50 px-1.5 py-0.5 rounded text-xs hover:scale-110 transform transition-all duration-200"
                title="Ver evidencia 1"
              >
                1
              </button>
            )}
            {row.evidencia_02 && (
              <button
                onClick={() => openModal(row.evidencia_02!)}
                className="text-[#c9a45c] hover:text-[#f0c987] bg-[#1e2538]/50 px-1.5 py-0.5 rounded text-xs hover:scale-110 transform transition-all duration-200"
                title="Ver evidencia 2"
              >
                2
              </button>
            )}
            {row.evidencia_03 && (
              <button
                onClick={() => openModal(row.evidencia_03!)}
                className="text-[#c9a45c] hover:text-[#f0c987] bg-[#1e2538]/50 px-1.5 py-0.5 rounded text-xs hover:scale-110 transform transition-all duration-200"
                title="Ver evidencia 3"
              >
                3
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

Row.displayName = 'VirtualizedRow';

const VirtualizedTable: React.FC<VirtualizedTableProps> = ({ 
  data, 
  openModal,
  containerRef 
}) => {
  const router = useRouter();
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const listRef = useRef<List>(null);

  // Detectar dimensiones del contenedor
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: Math.min(600, window.innerHeight * 0.7) // Max 70% de altura
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [containerRef]);

  // Altura de fila adaptativa para móvil/desktop
  const rowHeight = window.innerWidth < 768 ? 50 : 60;

  // Datos para el componente Row
  const itemData = {
    items: data,
    openModal,
    router
  };

  return (
    <div className="virtualized-table-container">
      {/* Header fijo */}
      <div className="sticky top-0 z-30 bg-gradient-to-r from-[#1e2538]/90 to-[#2a3347]/90 backdrop-blur-md text-gray-300 text-left border-b border-[#3d4659]/50">
        <div className="flex items-center">
          <div className="table-col-fixed-1 flex-shrink-0 py-2 text-xs font-medium">Fecha</div>
          <div className="table-col-fixed-2 flex-shrink-0 py-2 text-xs font-medium">Casita</div>
          <div className="flex overflow-x-auto flex-1">
            <div className="px-2 py-2 min-w-[70px] text-xs font-medium">Quien revisa</div>
            <div className="px-2 py-2 min-w-[70px] text-xs font-medium">Caja fuerte</div>
            <div className="px-2 py-2 min-w-[70px] text-xs font-medium">Puertas/Ventanas</div>
            <div className="px-2 py-2 min-w-[55px] text-xs font-medium">Chromecast</div>
            <div className="px-2 py-2 min-w-[55px] text-xs font-medium">Binoculares</div>
            <div className="px-2 py-2 min-w-[55px] text-xs font-medium">Trapo binoculares</div>
            <div className="px-2 py-2 min-w-[55px] text-xs font-medium">Speaker</div>
            <div className="px-2 py-2 min-w-[55px] text-xs font-medium">USB Speaker</div>
            <div className="px-2 py-2 min-w-[55px] text-xs font-medium">Controles TV</div>
            <div className="px-2 py-2 min-w-[50px] text-xs font-medium">Secadora</div>
            <div className="px-2 py-2 min-w-[50px] text-xs font-medium">Acc. secadora</div>
            <div className="px-2 py-2 min-w-[50px] text-xs font-medium">Steamer</div>
            <div className="px-2 py-2 min-w-[50px] text-xs font-medium">Bolsa vapor</div>
            <div className="px-2 py-2 min-w-[50px] text-xs font-medium">Plancha cabello</div>
            <div className="px-2 py-2 min-w-[50px] text-xs font-medium">Bulto</div>
            <div className="px-2 py-2 min-w-[50px] text-xs font-medium">Sombrero</div>
            <div className="px-2 py-2 min-w-[50px] text-xs font-medium">Bolso yute</div>
            <div className="px-2 py-2 min-w-[50px] text-xs font-medium">Camas ordenadas</div>
            <div className="px-2 py-2 min-w-[50px] text-xs font-medium">Cola caballo</div>
            <div className="px-2 py-2 min-w-[65px] text-xs font-medium">Notas</div>
            <div className="px-2 py-2 min-w-[60px] text-xs font-medium">Evidencias</div>
          </div>
        </div>
      </div>

      {/* Lista virtualizada */}
      {dimensions.height > 0 && (
        <List
          ref={listRef}
          height={dimensions.height}
          itemCount={data.length}
          itemSize={rowHeight}
          width="100%"
          itemData={itemData}
          overscanCount={5} // Pre-renderizar 5 items arriba y abajo
          className="custom-scrollbar"
        >
          {Row}
        </List>
      )}

      {/* Indicador de cantidad de registros */}
      <div className="text-center py-2 text-xs text-gray-400 border-t border-[#3d4659]/50">
        Mostrando {data.length} registros
      </div>
    </div>
  );
};

export default VirtualizedTable; 