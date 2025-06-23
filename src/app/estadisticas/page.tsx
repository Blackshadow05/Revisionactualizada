'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import dynamic from 'next/dynamic';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useSpectacularBackground } from '@/hooks/useSpectacularBackground';

// 🚀 Importación dinámica optimizada con mejor loading glassmorphism
const BarChartComponent = dynamic(() => import('@/components/BarChartComponent'), {
  ssr: false,
  loading: () => (
    <div className="bg-[#2a3347]/95 backdrop-blur-xl rounded-xl border border-[#c9a45c]/20 p-6 shadow-2xl h-96 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-[#c9a45c] border-t-transparent rounded-full animate-spin"></div>
        <span className="text-[#c9a45c] font-medium">Cargando gráfico...</span>
      </div>
    </div>
  )
});

// 🎯 Tipos TypeScript mejorados y más específicos
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

interface StatCard {
  title: string;
  value: number;
  icon: React.ReactElement;
  color: string;
  description: string;
}

interface ProcessedStats {
  totalRevisiones: number;
  revisionesHoy: number;
  casitasCheckIn: ChartDataItem[];
  revisionesPorPersona: ChartDataItem[];
  checkOutsPorPersona: ChartDataItem[];
}

// 🎨 Constantes de colores actualizadas para consistencia con el diseño
const CHART_COLORS = {
  PRIMARY: '#c9a45c',
  SECONDARY: '#f0c987', 
  TERTIARY: '#ff8c42',
  SUCCESS: '#10b981',
  INFO: '#3b82f6'
} as const;

const CHECK_IN_VALUE = 'Check in';
const CHECK_OUT_VALUE = 'Check out';

// 🚀 Función debounce ligera para optimizaciones de rendimiento
function debounce<T extends (...args: any[]) => void>(func: T, delay: number): T {
  let timeoutId: NodeJS.Timeout;
  return ((...args: any[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(null, args), delay);
  }) as T;
}

export default function EstadisticasPage() {
  const router = useRouter();
  const { isLoggedIn, userRole, isLoading: authLoading } = useAuth();
  const spectacularBg = useSpectacularBackground();
  
  // Estados principales optimizados
  const [revisioinesData, setRevisioinesData] = useState<RevisionCasita[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const currentYear = new Date().getFullYear();

  // 🛡️ Verificación de autenticación mejorada para producción
  useEffect(() => {
    if (!authLoading) {
      if (!isLoggedIn) {
        console.warn('🚫 Usuario no autenticado, redirigiendo...');
        router.push('/');
        return;
      }
      console.log('✅ Usuario autenticado correctamente');
    }
  }, [authLoading, isLoggedIn, router]);

  // 🚀 Función de carga de datos optimizada con debounce
  const loadData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      
      const { data, error: supabaseError } = await supabase
        .from('revisiones_casitas')
        .select('quien_revisa, caja_fuerte, casita, created_at')
        .order('created_at', { ascending: false });

      if (supabaseError) {
        console.error('❌ Error fetching data:', supabaseError);
        throw supabaseError;
      }

      setRevisioinesData(data as RevisionCasita[] || []);
      console.log(`✅ Cargados ${data?.length || 0} registros`);
      
    } catch (err) {
      const errorMessage = 'Error al cargar estadísticas. Verifica tu conexión.';
      setError(errorMessage);
      console.error('❌ Error en loadData:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // 🎯 Debounced refresh para evitar múltiples llamadas
  const debouncedRefresh = useMemo(
    () => debounce(() => loadData(true), 300),
    [loadData]
  );

  // Efecto inicial de carga - esperar verificación de auth
  useEffect(() => {
    if (!authLoading && isLoggedIn) {
      console.log('✅ Usuario autenticado, cargando datos...');
      loadData();
    }
  }, [authLoading, isLoggedIn, loadData]);

  const dataFilteredByCurrentYear = useMemo(() => {
    return revisioinesData.filter(item => {
      if (!item.created_at) return false;
      const itemDate = new Date(item.created_at);
      return itemDate.getFullYear() === currentYear;
    });
  }, [revisioinesData, currentYear]);

  // 🎯 Función optimizada para procesar datos de gráficos
  const processChartData = useCallback((
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
  }, []);

  // 🎯 Estadísticas procesadas (todas memoizadas para rendimiento máximo)
  const processedStats: ProcessedStats = useMemo(() => {
    const today = new Date();
    
    const totalRevisiones = dataFilteredByCurrentYear.length;
    
    const revisionesHoy = dataFilteredByCurrentYear.filter(item => {
      if (!item.created_at) return false;
      const itemDate = new Date(item.created_at);
      return itemDate.getFullYear() === today.getFullYear() &&
             itemDate.getMonth() === today.getMonth() &&
             itemDate.getDate() === today.getDate();
    }).length;

    const casitasCheckIn = processChartData(
      dataFilteredByCurrentYear,
      (item) => item.casita,
      (item) => item.caja_fuerte === CHECK_IN_VALUE,
      10
    );

    const revisionesPorPersona = processChartData(
      dataFilteredByCurrentYear,
      (item) => item.quien_revisa,
      undefined,
      12
    );

    const checkOutsPorPersona = processChartData(
      dataFilteredByCurrentYear,
      (item) => item.quien_revisa,
      (item) => item.caja_fuerte === CHECK_OUT_VALUE,
      10
    );

    return {
      totalRevisiones,
      revisionesHoy,
      casitasCheckIn,
      revisionesPorPersona,
      checkOutsPorPersona
    };
  }, [dataFilteredByCurrentYear, processChartData]);

  // 📋 Check outs del día actual con información detallada
  const checkOutsHoy = useMemo(() => {
    const today = new Date();
    
    return dataFilteredByCurrentYear
      .filter(item => {
        if (!item.created_at || item.caja_fuerte !== CHECK_OUT_VALUE) return false;
        const itemDate = new Date(item.created_at);
        return itemDate.getFullYear() === today.getFullYear() &&
               itemDate.getMonth() === today.getMonth() &&
               itemDate.getDate() === today.getDate();
      })
      .map(item => ({
        casita: item.casita || 'N/A',
        fecha: item.created_at ? new Date(item.created_at) : null,
        revisor: item.quien_revisa || 'N/A'
      }))
      .sort((a, b) => {
        if (!a.fecha || !b.fecha) return 0;
        return b.fecha.getTime() - a.fecha.getTime(); // Más recientes primero
      });
  }, [dataFilteredByCurrentYear]);

  // 🎨 Tarjetas de estadísticas con diseño glassmorphism
  const statCards: StatCard[] = useMemo(() => [
    {
      title: 'Total Revisiones',
      value: processedStats.totalRevisiones,
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      color: 'text-[#c9a45c]',
      description: `Año ${currentYear}`
    },
    {
      title: 'Revisiones Hoy',
      value: processedStats.revisionesHoy,
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'text-[#f0c987]',
      description: new Date().toLocaleDateString('es-ES')
    }
  ], [processedStats, currentYear]);

  // 🛡️ Guards de renderizado
  // Mostrar loading mientras se verifica la autenticación
  if (authLoading) {
    return (
      <div style={spectacularBg} className="min-h-screen flex items-center justify-center">
        <div className="bg-[#2a3347]/95 backdrop-blur-xl rounded-2xl border border-[#c9a45c]/20 p-8 shadow-2xl">
          <LoadingSpinner />
          <p className="text-[#c9a45c] text-center mt-4 font-medium">Verificando autenticación...</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return null;
  }

  if (loading) {
    return (
      <div style={spectacularBg} className="min-h-screen flex items-center justify-center">
        <div className="bg-[#2a3347]/95 backdrop-blur-xl rounded-2xl border border-[#c9a45c]/20 p-8 shadow-2xl">
          <LoadingSpinner />
          <p className="text-[#c9a45c] text-center mt-4 font-medium">Cargando estadísticas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={spectacularBg} className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-[#2a3347]/95 backdrop-blur-xl rounded-2xl border border-red-500/30 p-8 shadow-2xl text-center max-w-md">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Error al cargar datos</h2>
          <p className="text-gray-300 mb-4">{error}</p>
          <button
            onClick={() => loadData()}
            className="px-4 py-2 bg-[#c9a45c] text-white rounded-lg hover:bg-[#f0c987] transition-colors duration-200 font-medium"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={spectacularBg} className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header con glassmorphism */}
        <header className="mb-8">
          <div className="bg-[#2a3347]/95 backdrop-blur-xl rounded-2xl border border-[#c9a45c]/20 p-6 md:p-8 shadow-2xl">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-[#c9a45c] via-[#f0c987] to-[#ff8c42] bg-clip-text text-transparent">
                  Estadísticas de Revisiones
                </h1>
                <p className="text-gray-300 mt-2">Panel de control y análisis de datos</p>
              </div>
              
              <div className="flex items-center gap-3">
                {/* Botón de refresh */}
                <button
                  onClick={debouncedRefresh}
                  disabled={refreshing}
                  className="px-4 py-2 bg-[#c9a45c]/20 hover:bg-[#c9a45c]/30 border border-[#c9a45c]/40 text-[#c9a45c] rounded-xl transition-all duration-200 flex items-center gap-2 disabled:opacity-50"
                >
                  <svg className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {refreshing ? 'Actualizando...' : 'Actualizar'}
                </button>
                
                {/* Botón volver */}
                <button
                  onClick={() => router.push('/')}
                  className="px-4 py-2 bg-gray-600/20 hover:bg-gray-600/30 border border-gray-500/40 text-gray-300 rounded-xl transition-all duration-200 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Volver
                </button>
              </div>
            </div>
          </div>
        </header>

      {/* Tarjetas de estadísticas glassmorphism */}
      <section className="mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {statCards.map((card, index) => (
            <div 
              key={card.title}
              className="bg-[#2a3347]/95 backdrop-blur-xl rounded-2xl border border-[#c9a45c]/20 p-6 shadow-2xl group hover:border-[#c9a45c]/40 transition-all duration-300"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-300 mb-1">{card.title}</h3>
                  <p className="text-sm text-gray-400">{card.description}</p>
                </div>
                <div className={`${card.color} group-hover:scale-110 transition-transform duration-300`}>
                  {card.icon}
                </div>
              </div>
              <div className="mt-4">
                <span className={`text-4xl font-bold ${card.color}`}>
                  {card.value.toLocaleString()}
                </span>
              </div>
            </div>
          ))}
        </div>
              </section>

        {/* Sección informativa: Check Outs del día actual */}
        <section className="mb-8">
          <div className="bg-[#2a3347]/95 backdrop-blur-xl rounded-2xl border border-[#c9a45c]/20 p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-[#ff8c42]/20 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-[#ff8c42]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-[#ff8c42]">Check Outs de Hoy</h3>
                <p className="text-gray-400 text-sm">
                  {new Date().toLocaleDateString('es-ES', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
              <div className="ml-auto">
                <div className="bg-[#ff8c42]/20 px-3 py-1 rounded-full">
                  <span className="text-[#ff8c42] font-semibold text-sm">
                    {checkOutsHoy.length} Check Outs
                  </span>
                </div>
              </div>
            </div>

            {checkOutsHoy.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {checkOutsHoy.map((checkout, index) => (
                  <div 
                    key={`${checkout.casita}-${index}`}
                    className="bg-[#1a1f35]/50 rounded-xl border border-[#ff8c42]/20 p-4 hover:border-[#ff8c42]/40 transition-all duration-300 group"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-[#ff8c42]/20 rounded-lg flex items-center justify-center">
                          <svg className="w-4 h-4 text-[#ff8c42]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                          </svg>
                        </div>
                        <span className="text-[#ff8c42] font-bold text-lg">
                          Casita {checkout.casita}
                        </span>
                      </div>
                      <div className="w-2 h-2 bg-[#ff8c42] rounded-full animate-pulse"></div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-gray-300">
                          {checkout.fecha 
                            ? checkout.fecha.toLocaleTimeString('es-ES', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })
                            : 'Hora no disponible'
                          }
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                        </svg>
                        <span className="text-gray-300">
                          {checkout.revisor}
                        </span>
                      </div>
                    </div>

                    {/* Efecto de brillo en hover */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#ff8c42]/5 to-transparent opacity-0 group-hover:opacity-100 rounded-xl transition-opacity duration-300 pointer-events-none"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                </div>
                <h4 className="text-lg font-semibold text-gray-400 mb-2">No hay check outs hoy</h4>
                <p className="text-gray-500 text-sm">
                  Aún no se han registrado check outs para el día de hoy.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Gráficos con diseño glassmorphism mejorado */}
      <section className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-6">
        <div className="xl:col-span-1">
          <BarChartComponent
            data={processedStats.casitasCheckIn}
            title="Top Casitas - Check In"
            barColor={CHART_COLORS.PRIMARY}
            xAxisLabel="Casita"
            yAxisLabel="Check-ins"
          />
        </div>
        
        <div className="xl:col-span-1">
          <BarChartComponent
            data={processedStats.revisionesPorPersona}
            title="Revisiones por Persona"
            barColor={CHART_COLORS.SECONDARY}
            xAxisLabel="Revisor"
            yAxisLabel="Total Revisiones"
          />
        </div>

        <div className="xl:col-span-2 2xl:col-span-1">
          <BarChartComponent
            data={processedStats.checkOutsPorPersona}
            title="Check-outs por Persona"
            barColor={CHART_COLORS.TERTIARY}
            xAxisLabel="Revisor"
            yAxisLabel="Check-outs"
          />
        </div>
      </section>
      
        {/* Footer */}
        <footer className="mt-12 text-center">
          <div className="bg-[#2a3347]/95 backdrop-blur-xl rounded-2xl border border-[#c9a45c]/20 p-4 shadow-2xl">
            <p className="text-sm text-gray-400">
              © {currentYear} Revision Casitas AG. Todos los derechos reservados.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}