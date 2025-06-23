'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import dynamic from 'next/dynamic';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useSpectacularBackground } from '@/hooks/useSpectacularBackground';

// Importar BarChartComponent dinámicamente para evitar problemas de SSR
const BarChartComponent = dynamic(() => import('../../components/BarChartComponent'), {
  ssr: false,
  loading: () => <div className="bg-gray-800 bg-opacity-80 backdrop-blur-sm p-6 rounded-lg shadow-xl h-96 flex items-center justify-center"><div className="text-white">Cargando gráfico...</div></div>
});

// Tipos adaptados
interface RevisionCasita {
  id?: number;
  quien_revisa: string | null;
  caja_fuerte: string | null;
  casita: string | null;
  created_at?: string;
}

interface ChartDataItem {
  name: string;
  value: number;
}

// Constantes del dashboard original
const CHART_COLORS_PRIMARY = "#3B82F6"; // blue-500
const CHART_COLORS_SECONDARY = "#10B981"; // emerald-500
const CHART_COLORS_TERTIARY = "#F59E0B"; // amber-500
const CHECK_IN_VALUE = 'Check in';
const CHECK_OUT_VALUE = 'Check out';

export default function EstadisticasPage() {
  const router = useRouter();
  const { isLoggedIn, userRole } = useAuth();
  const [revisioinesData, setRevisioinesData] = useState<RevisionCasita[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const currentYear = new Date().getFullYear();

  // Verificar autenticación
  useEffect(() => {
    if (!isLoggedIn) {
      router.push('/');
      return;
    }
  }, [isLoggedIn, router]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const { data, error } = await supabase
          .from('revisiones_casitas')
          .select('quien_revisa, caja_fuerte, casita, created_at');

        if (error) {
          console.error('Error fetching data from Supabase:', error);
          throw error;
        }

        setRevisioinesData(data as RevisionCasita[] || []);
      } catch (err) {
        setError('Error al cargar los datos. Por favor, inténtelo de nuevo más tarde.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    if (isLoggedIn) {
      loadData();
    }
  }, [isLoggedIn]);

  const dataFilteredByCurrentYear = useMemo(() => {
    return revisioinesData.filter(item => {
      if (!item.created_at) return false;
      const itemDate = new Date(item.created_at);
      return itemDate.getFullYear() === currentYear;
    });
  }, [revisioinesData, currentYear]);

  const processChartData = (
    data: RevisionCasita[], 
    keyExtractor: (item: RevisionCasita) => string | null,
    filterFn?: (item: RevisionCasita) => boolean,
    limit?: number
  ): ChartDataItem[] => {
    const filteredData = filterFn ? data.filter(filterFn) : data;
    
    const counts = filteredData.reduce((acc, item) => {
      const key = keyExtractor(item);
      if (key) {
        acc[key] = (acc[key] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const sortedData = Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    return limit ? sortedData.slice(0, limit) : sortedData;
  };
  
  const casitasCheckInData = useMemo(() => {
    return processChartData(
      dataFilteredByCurrentYear,
      (item) => item.casita,
      (item) => item.caja_fuerte === CHECK_IN_VALUE,
      10
    );
  }, [dataFilteredByCurrentYear]);

  const quienRevisaData = useMemo(() => {
    return processChartData(
      dataFilteredByCurrentYear,
      (item) => item.quien_revisa,
      undefined,
      12
    );
  }, [dataFilteredByCurrentYear]);

  const quienRevisaCheckOutData = useMemo(() => {
    return processChartData(
      dataFilteredByCurrentYear,
      (item) => item.quien_revisa,
      (item) => item.caja_fuerte === CHECK_OUT_VALUE,
      10
    );
  }, [dataFilteredByCurrentYear]);

  const totalRevisiones = useMemo(() => dataFilteredByCurrentYear.length, [dataFilteredByCurrentYear]);

  const revisionesHoyCount = useMemo(() => {
    const today = new Date();
    return dataFilteredByCurrentYear.filter(item => {
      if (!item.created_at) return false;
      const itemDate = new Date(item.created_at);
      return itemDate.getFullYear() === today.getFullYear() &&
             itemDate.getMonth() === today.getMonth() &&
             itemDate.getDate() === today.getDate();
    }).length;
  }, [dataFilteredByCurrentYear]);

  const appBackgroundStyle = useSpectacularBackground();

  if (!isLoggedIn) {
    return null;
  }

  if (loading) {
    return (
      <div style={{ ...appBackgroundStyle, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ ...appBackgroundStyle, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
        <div className="bg-gray-800 p-8 rounded-lg shadow-xl text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-red-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="text-2xl font-bold text-gray-100 mb-2">Oops! Algo salió mal.</h2>
          <p className="text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={appBackgroundStyle} className="min-h-screen p-3 sm:p-4 md:p-8">
      {/* Botón de volver */}
      <div className="mb-4 sm:mb-6">
        <button
          onClick={() => router.back()}
          className="px-4 py-2.5 bg-gray-700 bg-opacity-80 backdrop-blur-sm text-white rounded-xl hover:bg-gray-600 transition-colors duration-200 flex items-center justify-center gap-2 text-sm font-medium relative overflow-hidden"
        >
          {/* Efecto de brillo continuo */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#f0cb35]/80 to-transparent animate-[slide_2s_ease-in-out_infinite] z-0"></div>
          <div className="relative z-10 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Volver
          </div>
        </button>
      </div>

      <header className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white text-center">Panel de Estadísticas de Revisiones</h1>
      </header>

      {/* Info Cards Section */}
      <div className="mb-6 sm:mb-8 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-gray-800 bg-opacity-80 backdrop-blur-sm p-4 sm:p-6 rounded-lg shadow-xl text-center flex flex-col items-center justify-center">
          <h3 className="text-lg sm:text-xl font-semibold text-gray-300 mb-2">Total Revisiones (Año Actual)</h3>
          <p className="text-3xl sm:text-4xl font-bold text-sky-400">{totalRevisiones}</p>
        </div>
        <div className="bg-gray-800 bg-opacity-80 backdrop-blur-sm p-4 sm:p-6 rounded-lg shadow-xl text-center flex flex-col items-center justify-center">
          <h3 className="text-lg sm:text-xl font-semibold text-gray-300 mb-2">Revisiones hechas hoy</h3>
          <p className="text-3xl sm:text-4xl font-bold text-emerald-400">{revisionesHoyCount}</p>
        </div>
      </div>

      {/* Charts Section - Optimizado para móvil */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
        <div> 
           <BarChartComponent
            data={casitasCheckInData}
            title="Estadística Casitas Check in (Año Actual)"
            barColor={CHART_COLORS_PRIMARY}
            xAxisLabel="Casita"
            yAxisLabel="Número de Revisiones"
          />
        </div>
       
        <div> 
          <BarChartComponent
            data={quienRevisaData}
            title="Estadística Revisiones (Año Actual)"
            barColor={CHART_COLORS_SECONDARY}
            xAxisLabel="Persona que revisa"
            yAxisLabel="Número de Revisiones"
          />
        </div>

        <div> 
          <BarChartComponent
            data={quienRevisaCheckOutData}
            title="Estadísticas Check out (Año Actual)"
            barColor={CHART_COLORS_TERTIARY}
            xAxisLabel="Persona que revisa"
            yAxisLabel="Número de Revisiones"
          />
        </div>
      </div>
      
      <footer className="mt-12 text-center text-sm text-gray-400">
        <p>Revision Casitas Ag, Todos los derechos reservados.</p>
      </footer>
    </div>
  );
} 