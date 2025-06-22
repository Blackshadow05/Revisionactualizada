'use client';

import React, { memo, useMemo } from 'react';

interface ChartDataItem {
  name: string;
  value: number;
}

interface CSSBarChartProps {
  data: ChartDataItem[];
  title: string;
  barColor: string;
  height?: number;
}

const CSSBarChart = memo<CSSBarChartProps>(({ 
  data, 
  title, 
  barColor = '#3b82f6',
  height = 300 
}) => {
  // Calcular valores para el gráfico
  const chartData = useMemo(() => {
    const maxValue = Math.max(...data.map(d => d.value), 1);
    const scale = 100 / maxValue;
    
    return data.map(item => ({
      ...item,
      percentage: (item.value / maxValue) * 100,
      scaledValue: item.value * scale
    }));
  }, [data]);

  if (!data || data.length === 0) {
    return (
      <div className="bg-gray-800 p-4 rounded-lg shadow-md h-96 flex flex-col items-center justify-center">
        <h3 className="text-lg font-semibold text-gray-300 mb-2">{title}</h3>
        <p className="text-gray-400">No hay datos disponibles para mostrar.</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 p-4 rounded-lg shadow-md">
      <h3 className="text-sm sm:text-lg font-semibold text-gray-200 mb-4 text-center">
        {title}
      </h3>
      
      <div 
        className="relative flex items-end justify-between gap-2 px-2"
        style={{ height: `${height}px` }}
      >
        {/* Líneas de grid horizontales */}
        <div className="absolute inset-0 pointer-events-none">
          {[0, 25, 50, 75, 100].map(percent => (
            <div
              key={percent}
              className="absolute w-full border-t border-gray-700 opacity-30"
              style={{ bottom: `${percent}%` }}
            >
              <span className="absolute -left-8 -top-2 text-xs text-gray-500">
                {Math.round((percent / 100) * Math.max(...data.map(d => d.value)))}
              </span>
            </div>
          ))}
        </div>

        {/* Barras */}
        {chartData.map((item, index) => (
          <div
            key={item.name}
            className="relative flex-1 flex flex-col items-center group cursor-pointer"
            style={{ maxWidth: '80px' }}
          >
            {/* Tooltip */}
            <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
              <div className="bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                {item.name}: {item.value}
              </div>
            </div>

            {/* Barra */}
            <div className="w-full relative">
              <div
                className="w-full transition-all duration-500 ease-out rounded-t hover:opacity-80"
                style={{
                  height: `${(item.percentage / 100) * height}px`,
                  background: `linear-gradient(to top, ${barColor}, ${barColor}dd)`,
                  boxShadow: '0 -2px 10px rgba(0,0,0,0.3)',
                  transform: 'scaleY(0)',
                  transformOrigin: 'bottom',
                  animation: `growBar 0.5s ease-out ${index * 0.1}s forwards`
                }}
              >
                {/* Valor en la parte superior de la barra */}
                <span className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-medium text-gray-300">
                  {item.value}
                </span>
              </div>
            </div>

            {/* Etiqueta */}
            <div className="mt-2 text-xs text-gray-400 text-center transform -rotate-45 origin-top-left w-20">
              {item.name}
            </div>
          </div>
        ))}
      </div>

      {/* Estilos de animación */}
      <style jsx>{`
        @keyframes growBar {
          from {
            transform: scaleY(0);
          }
          to {
            transform: scaleY(1);
          }
        }
      `}</style>
    </div>
  );
});

CSSBarChart.displayName = 'CSSBarChart';

export default CSSBarChart; 