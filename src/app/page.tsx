'use client';

import { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase, checkSupabaseConnection } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

import Link from 'next/link';
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

export default function Home() {
  const router = useRouter();
  const { isLoggedIn, userRole, login, logout, user } = useAuth();
  const [data, setData] = useState<RevisionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [cajaFuerteFilter, setCajaFuerteFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalImg, setModalImg] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const imgRef = useRef<HTMLImageElement>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginData, setLoginData] = useState({
    usuario: '',
    password: ''
  });
  const [loginError, setLoginError] = useState<string | null>(null);
  const [showMenuDropdown, setShowMenuDropdown] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportDateFrom, setReportDateFrom] = useState('');
  const [reportDateTo, setReportDateTo] = useState('');

  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const cajaFuerteOptions = [
    'Si', 'No', 'Check in', 'Check out', 'Upsell', 'Guardar Upsell', 'Back to Back', 'Show Room'
  ];


  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchRevisiones();
  }, []);

  useEffect(() => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  // Cerrar menú desplegable al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showMenuDropdown) {
        const target = event.target as Element;
        if (!target.closest('.menu-dropdown-container')) {
          setShowMenuDropdown(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenuDropdown]);



  const fetchRevisiones = async () => {
    try {
      setLoading(true);
      setError(null);

      // Verificar la conexión con Supabase
      const isConnected = await checkSupabaseConnection();
      if (!isConnected) {
        throw new Error('No se pudo conectar con la base de datos. Por favor, verifica tu conexión.');
      }
      
      const { data: revisiones, error } = await supabase
        .from('revisiones_casitas')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching data:', error);
        throw new Error('Error al cargar los datos: ' + error.message);
      }

      if (!revisiones) {
        throw new Error('No se encontraron datos');
      }

      setData(revisiones);
    } catch (error: any) {
      console.error('Error in fetchData:', error);
      setError(error.message || 'Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const filteredData = data.filter(row => {
    const searchLower = searchTerm.toLowerCase();
    
    const cajaFuerteMatch = !cajaFuerteFilter || row.caja_fuerte === cajaFuerteFilter;

    if (!searchTerm) {
      return cajaFuerteMatch;
    }
    
    const searchMatch = 
      row.casita.toLowerCase() === searchLower || 
      row.quien_revisa.toLowerCase().includes(searchLower) ||
      row.caja_fuerte.toLowerCase().includes(searchLower);

    return cajaFuerteMatch && searchMatch;
  });

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
      
      // Obtener las dimensiones de la imagen
      const img = imgRef.current;
      if (img) {
        const rect = img.getBoundingClientRect();
        const scaledWidth = rect.width * zoom;
        const scaledHeight = rect.height * zoom;
        
        // Calcular los límites de arrastre
        const maxX = (scaledWidth - rect.width) / 2;
        const maxY = (scaledHeight - rect.height) / 2;
        
        // Limitar el arrastre a los límites de la imagen
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

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (tableContainerRef.current) {
      setStartX(e.pageX - tableContainerRef.current.offsetLeft);
      setScrollLeft(tableContainerRef.current.scrollLeft);
      tableContainerRef.current.style.cursor = 'grabbing';
      tableContainerRef.current.style.userSelect = 'none';
    }
  };

  const handleMouseLeave = () => {
    if (tableContainerRef.current) {
      tableContainerRef.current.style.cursor = 'grab';
      tableContainerRef.current.style.userSelect = 'auto';
    }
    setStartX(0);
    setScrollLeft(0);
  };

  const handleMouseUp = () => {
    if (tableContainerRef.current) {
      tableContainerRef.current.style.cursor = 'grab';
      tableContainerRef.current.style.userSelect = 'auto';
    }
    setStartX(0);
    setScrollLeft(0);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (startX && tableContainerRef.current) {
      e.preventDefault();
      const x = e.pageX - tableContainerRef.current.offsetLeft;
      const walk = (x - startX) * 2;
      const newScrollLeft = scrollLeft - walk;
      
      // Prevenir el scroll más allá de los límites
      const maxScroll = tableContainerRef.current.scrollWidth - tableContainerRef.current.clientWidth;
      tableContainerRef.current.scrollLeft = Math.max(0, Math.min(newScrollLeft, maxScroll));
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    try {
      await login(loginData.usuario, loginData.password);
      setShowLoginModal(false);
      setLoginData({ usuario: '', password: '' });
    } catch (error: any) {
      console.error('Error al iniciar sesión:', error);
      setLoginError('Error al iniciar sesión');
    }
  };

  const handleDelete = async (id: string) => {
    if (!supabase) {
      setError('No se pudo conectar con la base de datos');
      return;
    }

    if (!confirm('¿Estás seguro de que deseas eliminar esta revisión?')) return;

    try {
      const { error } = await supabase
        .from('revisiones_casitas')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchRevisiones();
    } catch (error: any) {
      console.error('Error al eliminar la revisión:', error);
      setError(error.message);
    }
  };

  const handleExportExcel = async () => {
    try {
      // Filtrar datos por rango de fechas
      const filteredDataForExport = data.filter(row => {
        const rowDate = new Date(row.created_at).toISOString().split('T')[0];
        return rowDate >= reportDateFrom && rowDate <= reportDateTo;
      });

      if (filteredDataForExport.length === 0) {
        alert('No hay datos en el rango de fechas seleccionado');
        return;
      }

      // Preparar datos para Excel
      const excelData = filteredDataForExport.map(row => {
        // Usar la fecha tal como está almacenada, sin conversiones de zona horaria
        const fechaOriginal = row.created_at;
        const fechaFormateada = fechaOriginal.replace('T', ' ').substring(0, 16); // YYYY-MM-DD HH:MM
        const [fecha, hora] = fechaFormateada.split(' ');
        const [year, month, day] = fecha.split('-');
        const fechaFinal = `${day}/${month}/${year} ${hora}`;
        
        return {
        'Fecha': fechaFinal,
        'Casita': row.casita,
        'Quien Revisa': row.quien_revisa,
        'Caja Fuerte': row.caja_fuerte,
        'Puertas/Ventanas': row.puertas_ventanas,
        'Chromecast': row.chromecast,
        'Binoculares': row.binoculares,
        'Trapo Binoculares': row.trapo_binoculares,
        'Speaker': row.speaker,
        'USB Speaker': row.usb_speaker,
        'Controles TV': row.controles_tv,
        'Secadora': row.secadora,
        'Accesorios Secadora': row.accesorios_secadora,
        'Steamer': row.steamer,
        'Bolsa Vapor': row.bolsa_vapor,
        'Plancha Cabello': row.plancha_cabello,
        'Bulto': row.bulto,
        'Sombrero': row.sombrero,
        'Bolso Yute': row.bolso_yute,
        'Camas Ordenadas': row.camas_ordenadas,
        'Cola Caballo': row.cola_caballo,
        'Notas': row.Notas || '',
        'Evidencia 1': row.evidencia_01 ? 'Sí' : 'No',
        'Evidencia 2': row.evidencia_02 ? 'Sí' : 'No',
        'Evidencia 3': row.evidencia_03 ? 'Sí' : 'No'
        };
      });

      // Crear archivo Excel usando una implementación simple
      const csvContent = [
        Object.keys(excelData[0]).join(','),
        ...excelData.map(row => Object.values(row).map(val => `"${val}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `Reporte_Revisiones_${reportDateFrom}_${reportDateTo}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Cerrar modal y limpiar campos
      setShowReportModal(false);
      setShowMenuDropdown(false);
      setReportDateFrom('');
      setReportDateTo('');
      
      alert(`Reporte exportado exitosamente como CSV`);
    } catch (error) {
      console.error('Error al exportar:', error);
      alert('Error al exportar el reporte');
    }
  };



  return (
    <main className="min-h-screen bg-gradient-to-br from-[#0f1419] via-[#1a1f35] to-[#1e2538] relative overflow-hidden">
      {/* Efectos de fondo */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23c9a45c%22%20fill-opacity%3D%220.03%22%3E%3Ccircle%20cx%3D%2230%22%20cy%3D%2230%22%20r%3D%222%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-50"></div>
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent via-transparent to-[#0f1419]/20"></div>
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3 mb-6">
            <div className="relative menu-dropdown-container lg:absolute lg:top-8 lg:left-8">
              <div className="w-12 h-12 bg-gradient-to-br from-[#c9a45c] to-[#f0c987] rounded-xl flex items-center justify-center shadow-lg cursor-pointer hover:shadow-xl transition-all duration-300"
                   onClick={() => setShowMenuDropdown(!showMenuDropdown)}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7 text-[#1a1f35]">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
              </div>
              
              {/* Menú Desplegable */}
              {showMenuDropdown && (
                <div className="absolute top-14 left-0 w-64 bg-gradient-to-br from-[#1e2538]/95 to-[#2a3347]/95 backdrop-blur-md rounded-xl border border-[#3d4659]/50 shadow-2xl z-50">
                  <div className="p-2">
                    <div className="px-3 py-2 text-xs font-medium text-[#c9a45c] uppercase tracking-wider border-b border-[#3d4659]/30 mb-2">
                      Reportes
                    </div>
                    {userRole === 'SuperAdmin' && (
                      <button
                        onClick={() => {
                          setShowReportModal(true);
                          setShowMenuDropdown(false);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-white hover:bg-[#3d4659]/30 rounded-lg transition-all duration-200 text-left"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-green-400">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                        </svg>
                        Exportar Reporte
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
                        <div className="flex flex-col items-center gap-4">
              <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-white via-[#c9a45c] to-[#f0c987] bg-clip-text text-transparent">
                Revisión de Casitas
              </h1>
              {/* Botón temporal de diagnóstico PWA */}
              <button
                onClick={() => {
                  // Diagnóstico PWA
                  console.log('=== DIAGNÓSTICO PWA ===');
                  console.log('User Agent:', navigator.userAgent);
                  console.log('Service Worker Support:', 'serviceWorker' in navigator);
                  console.log('beforeinstallprompt Support:', 'onbeforeinstallprompt' in window);
                  
                  // Verificar manifest
                  fetch('/manifest.json')
                    .then(r => r.json())
                    .then(manifest => {
                      console.log('Manifest:', manifest);
                      console.log('Icons:', manifest.icons);
                      console.log('Display:', manifest.display);
                      console.log('Start URL:', manifest.start_url);
                    })
                    .catch(e => console.error('Error cargando manifest:', e));
                  
                  // Verificar Service Worker
                  if ('serviceWorker' in navigator) {
                    navigator.serviceWorker.getRegistrations()
                      .then(registrations => {
                        console.log('Service Workers registrados:', registrations.length);
                        registrations.forEach((reg, i) => {
                          console.log(`SW ${i}:`, reg.scope, reg.active?.state);
                        });
                      });
                  }
                  
                  alert('Revisa la consola del navegador para ver el diagnóstico PWA');
                }}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm"
              >
                🔍 Diagnóstico PWA
              </button>
            </div>
          </div>
        </div>

        {/* Barra de Acciones Mejorada */}
        <div className="bg-gradient-to-br from-[#1e2538]/80 to-[#2a3347]/80 backdrop-blur-md rounded-xl p-6 border border-[#3d4659]/50 mb-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            {/* Info del Usuario */}
            <div className="flex items-center gap-4">
              {user && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-[#c9a45c] to-[#f0c987] rounded-full flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-[#1a1f35]">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-white font-medium">{user}</p>
                    <p className="text-[#c9a45c] text-sm">{userRole}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Botones de Acción */}
            <div className="flex flex-wrap gap-3">
              {userRole === 'SuperAdmin' && (
                <button
                  onClick={() => router.push('/gestion-usuarios')}
                  className="px-4 py-2.5 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl hover:from-purple-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-[1.02] shadow-lg hover:shadow-purple-500/25 flex items-center gap-2 font-medium"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                  </svg>
                  Gestión Usuarios
                </button>
              )}

              {isLoggedIn ? (
                <button
                  onClick={logout}
                  className="metallic-button metallic-button-red px-4 py-2.5 text-white rounded-xl hover:shadow-lg hover:shadow-red-500/25 transition-all duration-300 transform hover:scale-[1.02] flex items-center gap-2 font-medium"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                  </svg>
                  Cerrar Sesión
                </button>
              ) : (
                <button
                  onClick={() => setShowLoginModal(true)}
                  className="metallic-button metallic-button-gold px-4 py-2.5 text-white rounded-xl hover:shadow-lg hover:shadow-[#c9a45c]/40 transition-all duration-300 transform hover:scale-[1.02] flex items-center gap-2 font-medium"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                  Iniciar Sesión
                </button>
              )}

              <Link
                href="/nueva-revision"
                className="metallic-button metallic-button-green px-8 py-3 text-white rounded-xl hover:shadow-lg hover:shadow-green-500/40 transition-all duration-300 transform hover:scale-[1.02] flex items-center gap-3 font-medium text-lg min-w-[200px] justify-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Nueva Revisión
              </Link>

            </div>
          </div>
        </div>

        {/* Barra de Búsqueda y Filtros Mejorada */}
        <div className="bg-gradient-to-br from-[#1e2538]/80 to-[#2a3347]/80 backdrop-blur-md rounded-xl p-6 border border-[#3d4659]/50 mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Búsqueda Principal */}
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-[#c9a45c]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Buscar por casita, revisor o estado..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-gradient-to-r from-[#1a1f35] to-[#1e2538] border border-[#3d4659] rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#c9a45c]/50 focus:border-[#c9a45c]/50 transition-all duration-300 hover:border-[#c9a45c]/30"
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-white transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Filtro por Caja Fuerte */}
            <div className="relative">
              <select
                value={cajaFuerteFilter}
                onChange={(e) => setCajaFuerteFilter(e.target.value)}
                className="w-full lg:w-48 px-4 py-3 bg-gradient-to-r from-[#1a1f35] to-[#1e2538] border border-[#3d4659] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#c9a45c]/50 focus:border-[#c9a45c]/50 transition-all duration-300 hover:border-[#c9a45c]/30 appearance-none cursor-pointer"
              >
                <option value="">Todas las cajas</option>
                {cajaFuerteOptions.map(option => (
                  <option key={option} value={option} className="bg-[#1e2538]">{option}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                <svg className="w-4 h-4 text-[#c9a45c]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* Resultados de búsqueda */}
          {(searchTerm || cajaFuerteFilter) && (
            <div className="mt-4 pt-4 border-t border-[#3d4659]/50">
              <p className="text-gray-400 text-sm">
                Mostrando {filteredData.length} de {data.length} revisiones
                {searchTerm && <span> para "{searchTerm}"</span>}
                {cajaFuerteFilter && <span> con caja fuerte "{cajaFuerteFilter}"</span>}
              </p>
            </div>
          )}
        </div>

        {/* Tabla con diseño moderno */}
        {loading && !error ? (
          <div className="p-8 text-center text-gray-400 animate-pulse">
            <p>Cargando datos...</p>
          </div>
        ) : (
          <div className="relative">
            <div className="overflow-hidden rounded-xl shadow-[0_8px_32px_rgb(0_0_0/0.2)] backdrop-blur-md bg-[#1e2538]/80 border border-[#3d4659]/50">
              <div 
                ref={tableContainerRef} 
                className="table-container overflow-x-auto relative cursor-grab"
                onMouseDown={handleMouseDown}
                onMouseLeave={handleMouseLeave}
                onMouseUp={handleMouseUp}
                onMouseMove={handleMouseMove}
              >
                <table className="min-w-full divide-y divide-[#3d4659]/50">
                  <thead className="sticky top-0 z-30">
                    <tr className="bg-gradient-to-r from-[#1e2538]/90 to-[#2a3347]/90 backdrop-blur-md text-gray-300 text-left">
                      <th className="fixed-column-1 bg-gradient-to-r from-[#1e2538]/90 to-[#2a3347]/90 backdrop-blur-md px-3 py-2 md:px-4 md:py-3 border-r border-[#3d4659]/50">Fecha</th>
                      <th className="fixed-column-2 bg-gradient-to-r from-[#1e2538]/90 to-[#2a3347]/90 backdrop-blur-md px-3 py-2 md:px-4 md:py-3 border-r border-[#3d4659]/50">Casita</th>
                      <th className="px-3 py-2 md:px-4 md:py-3">Quien revisa</th>
                      <th className="px-3 py-2 md:px-4 md:py-3">Caja fuerte</th>
                      <th className="px-3 py-2 md:px-4 md:py-3">Puertas/Ventanas</th>
                      <th className="px-3 py-2 md:px-4 md:py-3">Chromecast</th>
                      <th className="px-3 py-2 md:px-4 md:py-3">Binoculares</th>
                      <th className="px-3 py-2 md:px-4 md:py-3">Trapo binoculares</th>
                      <th className="px-3 py-2 md:px-4 md:py-3">Speaker</th>
                      <th className="px-3 py-2 md:px-4 md:py-3">USB Speaker</th>
                      <th className="px-3 py-2 md:px-4 md:py-3">Controles TV</th>
                      <th className="px-3 py-2 md:px-4 md:py-3">Secadora</th>
                      <th className="px-3 py-2 md:px-4 md:py-3">Accesorios secadora</th>
                      <th className="px-3 py-2 md:px-4 md:py-3">Steamer</th>
                      <th className="px-3 py-2 md:px-4 md:py-3">Bolsa vapor</th>
                      <th className="px-3 py-2 md:px-4 md:py-3">Plancha cabello</th>
                      <th className="px-3 py-2 md:px-4 md:py-3">Bulto</th>
                      <th className="px-3 py-2 md:px-4 md:py-3">Sombrero</th>
                      <th className="px-3 py-2 md:px-4 md:py-3">Bolso yute</th>
                      <th className="px-3 py-2 md:px-4 md:py-3">Camas ordenadas</th>
                      <th className="px-3 py-2 md:px-4 md:py-3">Cola caballo</th>
                      <th className="px-3 py-2 md:px-4 md:py-3">Notas</th>
                      <th className="px-3 py-2 md:px-4 md:py-3">Evidencias</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#3d4659]/50">
                    {filteredData.map((row, index) => (
                      <tr
                        key={row.id || index}
                        className="border-t border-[#3d4659]/50 text-gray-300 hover:bg-[#1e2538]/50 transition-colors duration-200"
                      >
                        <td className="fixed-column-1 w-[320px] md:w-[200px]">
                          <div className="flex flex-col whitespace-nowrap">
                            <span className="text-[13px] md:text-xs text-[#c9a45c]">
                              {row.created_at.split('+')[0].split('T')[0]}
                            </span>
                            <span className="text-[13px] md:text-xs text-[#c9a45c]">
                              {row.created_at.split('+')[0].split('T')[1].split(':').slice(0,2).join(':')}
                            </span>
                          </div>
                        </td>
                        <td className="fixed-column-2 bg-gradient-to-r from-[#1a1f35]/90 to-[#1c2138]/90 backdrop-blur-md px-3 py-2 md:px-4 md:py-3 border-r border-[#3d4659]/50">
                          <button
                            onClick={() => {
                              console.log('ID de la revisión:', row.id);
                              router.push(`/detalles/${row.id}`);
                            }}
                            className="text-sky-400 hover:text-sky-300 transition-colors underline decoration-sky-400/30 hover:decoration-sky-300/50 hover:scale-105 transform duration-200"
                          >
                            {row.casita}
                          </button>
                        </td>
                        <td className="px-3 py-2 md:px-4 md:py-3">{row.quien_revisa}</td>
                        <td className="px-3 py-2 md:px-4 md:py-3">{row.caja_fuerte}</td>
                        <td className="px-3 py-2 md:px-4 md:py-3">{row.puertas_ventanas}</td>
                        <td className="px-3 py-2 md:px-4 md:py-3">{row.chromecast}</td>
                        <td className="px-3 py-2 md:px-4 md:py-3">{row.binoculares}</td>
                        <td className="px-3 py-2 md:px-4 md:py-3">{row.trapo_binoculares}</td>
                        <td className="px-3 py-2 md:px-4 md:py-3">{row.speaker}</td>
                        <td className="px-3 py-2 md:px-4 md:py-3">{row.usb_speaker}</td>
                        <td className="px-3 py-2 md:px-4 md:py-3">{row.controles_tv}</td>
                        <td className="px-3 py-2 md:px-4 md:py-3">{row.secadora}</td>
                        <td className="px-3 py-2 md:px-4 md:py-3">{row.accesorios_secadora}</td>
                        <td className="px-3 py-2 md:px-4 md:py-3">{row.steamer}</td>
                        <td className="px-3 py-2 md:px-4 md:py-3">{row.bolsa_vapor}</td>
                        <td className="px-3 py-2 md:px-4 md:py-3">{row.plancha_cabello}</td>
                        <td className="px-3 py-2 md:px-4 md:py-3">{row.bulto}</td>
                        <td className="px-3 py-2 md:px-4 md:py-3">{row.sombrero}</td>
                        <td className="px-3 py-2 md:px-4 md:py-3">{row.bolso_yute}</td>
                        <td className="px-3 py-2 md:px-4 md:py-3">{row.camas_ordenadas}</td>
                        <td className="px-3 py-2 md:px-4 md:py-3">{row.cola_caballo}</td>
                        <td className="px-3 py-2 md:px-4 md:py-3">{row.Notas}</td>
                        <td className="px-3 py-2 md:px-4 md:py-3">
                          {row.evidencia_01 && (
                            <button
                              type="button"
                              onClick={() => openModal(row.evidencia_01)}
                              className="text-[#c9a45c] hover:text-[#f0c987] mr-2 underline cursor-pointer hover:scale-110 transform duration-200 bg-[#1e2538]/50 px-2 py-1 rounded-lg shadow-[0_4px_8px_rgb(0_0_0/0.2)] hover:shadow-[0_4px_8px_rgb(0_0_0/0.3)] transition-all duration-200"
                              title="Ver evidencia 1"
                            >
                              1
                            </button>
                          )}
                          {row.evidencia_02 && (
                            <button
                              type="button"
                              onClick={() => openModal(row.evidencia_02)}
                              className="text-[#c9a45c] hover:text-[#f0c987] mr-2 underline cursor-pointer hover:scale-110 transform duration-200 bg-[#1e2538]/50 px-2 py-1 rounded-lg shadow-[0_4px_8px_rgb(0_0_0/0.2)] hover:shadow-[0_4px_8px_rgb(0_0_0/0.3)] transition-all duration-200"
                              title="Ver evidencia 2"
                            >
                              2
                            </button>
                          )}
                          {row.evidencia_03 && (
                            <button
                              type="button"
                              onClick={() => openModal(row.evidencia_03)}
                              className="text-[#c9a45c] hover:text-[#f0c987] underline cursor-pointer hover:scale-110 transform duration-200 bg-[#1e2538]/50 px-2 py-1 rounded-lg shadow-[0_4px_8px_rgb(0_0_0/0.2)] hover:shadow-[0_4px_8px_rgb(0_0_0/0.3)] transition-all duration-200"
                              title="Ver evidencia 3"
                            >
                              3
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}



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
                    transition: 'transform 0.1s ease-out'
                  }}
                  onWheel={handleWheel}
                  onMouseDown={handleMouseDownImage}
                  onMouseMove={handleMouseMoveImage}
                  onMouseUp={handleMouseUpImage}
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

        {/* Modal de Login Modernizado */}
        {showLoginModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-[#1e2538] to-[#2a3347] p-8 rounded-2xl shadow-2xl w-full max-w-md border border-[#3d4659]/50 backdrop-blur-md">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-gradient-to-br from-[#c9a45c] to-[#f0c987] rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-[#1a1f35]">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                </div>
                <h2 className="text-3xl font-bold bg-gradient-to-r from-white to-[#c9a45c] bg-clip-text text-transparent">
                  Iniciar Sesión
                </h2>
                <p className="text-gray-400 mt-2">Accede a tu cuenta para continuar</p>
              </div>
              
              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-300 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-[#c9a45c]">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                    </svg>
                    Usuario
                  </label>
                  <input
                    type="text"
                    value={loginData.usuario}
                    onChange={(e) => setLoginData({ ...loginData, usuario: e.target.value })}
                    className="w-full px-4 py-3 bg-gradient-to-r from-[#1a1f35] to-[#1e2538] border border-[#3d4659] rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#c9a45c]/50 focus:border-[#c9a45c]/50 transition-all duration-300 hover:border-[#c9a45c]/30"
                    placeholder="Ingresa tu usuario"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-300 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-[#c9a45c]">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                    Contraseña
                  </label>
                  <input
                    type="password"
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    className="w-full px-4 py-3 bg-gradient-to-r from-[#1a1f35] to-[#1e2538] border border-[#3d4659] rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#c9a45c]/50 focus:border-[#c9a45c]/50 transition-all duration-300 hover:border-[#c9a45c]/30"
                    placeholder="Ingresa tu contraseña"
                    required
                  />
                </div>
                
                {loginError && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                    <p className="text-red-400 text-sm flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                      </svg>
                      {loginError}
                    </p>
                  </div>
                )}
                
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowLoginModal(false)}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl hover:from-gray-700 hover:to-gray-800 transition-all duration-300 transform hover:scale-[1.02] shadow-lg hover:shadow-gray-600/25 font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-[#c9a45c] to-[#f0c987] text-[#1a1f35] rounded-xl hover:from-[#d4b06c] hover:to-[#f5d49a] transition-all duration-300 transform hover:scale-[1.02] shadow-lg hover:shadow-[#c9a45c]/25 font-medium"
                  >
                    Iniciar Sesión
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal de Reportes */}
        {showReportModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-[#1e2538] to-[#2a3347] p-8 rounded-2xl shadow-2xl w-full max-w-md border border-[#3d4659]/50 backdrop-blur-md">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-white">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                </div>
                <h2 className="text-3xl font-bold bg-gradient-to-r from-white to-green-400 bg-clip-text text-transparent">
                  Exportar Reporte
                </h2>
                <p className="text-gray-400 mt-2">Selecciona el rango de fechas para el reporte</p>
              </div>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-300 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-green-400">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5a2.25 2.25 0 002.25-2.25m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5a2.25 2.25 0 012.25 2.25v7.5" />
                    </svg>
                    Fecha Desde
                  </label>
                  <input
                    type="date"
                    value={reportDateFrom}
                    onChange={(e) => setReportDateFrom(e.target.value)}
                    className="w-full px-4 py-3 bg-gradient-to-r from-[#1a1f35] to-[#1e2538] border border-[#3d4659] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all duration-300 hover:border-green-500/30"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-300 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-green-400">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5a2.25 2.25 0 002.25-2.25m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5a2.25 2.25 0 012.25 2.25v7.5" />
                    </svg>
                    Fecha Hasta
                  </label>
                  <input
                    type="date"
                    value={reportDateTo}
                    onChange={(e) => setReportDateTo(e.target.value)}
                    className="w-full px-4 py-3 bg-gradient-to-r from-[#1a1f35] to-[#1e2538] border border-[#3d4659] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all duration-300 hover:border-green-500/30"
                    required
                  />
                </div>
                
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowReportModal(false);
                      setReportDateFrom('');
                      setReportDateTo('');
                    }}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl hover:from-gray-700 hover:to-gray-800 transition-all duration-300 transform hover:scale-[1.02] shadow-lg hover:shadow-gray-600/25 font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleExportExcel}
                    disabled={!reportDateFrom || !reportDateTo}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-300 transform hover:scale-[1.02] shadow-lg hover:shadow-green-500/25 font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    Exportar CSV
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}


      </div>
    </main>
  );
} 