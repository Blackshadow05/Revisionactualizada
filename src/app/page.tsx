'use client';

import { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase, checkSupabaseConnection } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import NotasForm from '@/components/NotasForm';
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

  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const cajaFuerteOptions = [
    'Si', 'No', 'Check in', 'Check out', 'Upsell', 'Guardar Upsell', 'Back to Back', 'Show Room'
  ];

  const [showNotasForm, setShowNotasForm] = useState(false);
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

  const fetchRevisiones = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('revisiones_casitas')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setData(data || []);
    } catch (error: any) {
      console.error('Error al cargar revisiones:', error);
      setError(error.message);
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

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#1a1f35] to-[#2d364c] py-8 md:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-white">Revisión de Casitas</h1>
          <div className="flex gap-4">
            {userRole === 'SuperAdmin' && (
              <button
                onClick={() => router.push('/gestion-usuarios')}
                className="px-4 py-2 bg-[#c9a45c] text-white rounded-lg hover:bg-[#d4b06c] transition-all transform hover:scale-[1.02] shadow-[0_8px_16px_rgb(0_0_0/0.2)] hover:shadow-[0_12px_24px_rgb(0_0_0/0.3)] relative overflow-hidden border-2 border-white/40 hover:border-white/60"
              >
                Gestión de Usuarios
              </button>
            )}
          </div>
        </div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            {user && (
              <p className="text-[#c9a45c] font-medium">
                Usuario: <span className="text-white">{user}</span>
              </p>
            )}
          </div>
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4 w-full md:w-auto">
            {isLoggedIn ? (
              <div className="flex flex-col md:flex-row items-start md:items-center gap-4 w-full md:w-auto">
                <span className="text-[#c9a45c]">Rol: {userRole}</span>
                <button
                  onClick={logout}
                  className="w-full md:w-auto px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all transform hover:scale-[1.02] shadow-[0_8px_16px_rgb(0_0_0/0.2)] hover:shadow-[0_12px_24px_rgb(0_0_0/0.3)] relative overflow-hidden border-2 border-white/40 hover:border-white/60 before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-red-300/40 before:to-transparent before:translate-x-[-200%] hover:before:translate-x-[200%] before:transition-transform before:duration-1000 after:absolute after:inset-0 after:bg-gradient-to-b after:from-red-300/30 after:to-transparent after:opacity-100 after:transition-opacity after:duration-300 md:before:translate-x-[-200%] md:hover:before:translate-x-[200%] before:translate-x-[200%] before:animate-[shimmer_1.5s_infinite]"
                >
                  Cerrar Sesión
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowLoginModal(true)}
                className="w-full md:w-auto px-4 py-2 bg-[#2a3347] text-white rounded-lg hover:bg-[#2a3347] transition-all transform hover:scale-[1.02] shadow-[0_8px_16px_rgb(0_0_0/0.2)] hover:shadow-[0_12px_24px_rgb(0_0_0/0.3)] relative overflow-hidden border-2 border-white/40 hover:border-white/60 before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-[#e0e614]/40 before:to-transparent before:translate-x-[-200%] md:before:translate-x-[-200%] md:hover:before:translate-x-[200%] before:translate-x-[200%] before:animate-[shimmer_2s_infinite] after:absolute after:inset-0 after:bg-gradient-to-b after:from-[#e0e614]/30 after:to-transparent after:opacity-100 after:transition-opacity after:duration-300"
              >
                Iniciar Sesión
              </button>
            )}
            <Link
              href="/nueva-revision"
              className="w-full md:w-auto px-6 py-3 bg-[#2a3347] text-white font-bold rounded-xl transform hover:scale-[1.02] transition-all duration-200 shadow-[0_8px_16px_rgb(0_0_0/0.2)] hover:shadow-[0_12px_24px_rgb(0_0_0/0.3)] whitespace-nowrap flex items-center justify-center gap-2 group relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-[#06c426]/20 before:to-transparent before:translate-x-[-200%] md:before:translate-x-[-200%] md:hover:before:translate-x-[200%] before:translate-x-[200%] before:animate-[shimmer_2s_infinite] after:absolute after:inset-0 after:bg-gradient-to-b after:from-[#06c426]/15 after:to-transparent after:opacity-100 after:transition-opacity after:duration-300 border-2 border-white/40 hover:border-white/60"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transform group-hover:rotate-90 transition-transform duration-300" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Nueva Revisión
            </Link>
          </div>
        </div>

        {/* Barra de búsqueda y filtros */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4 w-full">
            {/* Filtro por Caja Fuerte */}
            <select
              value={cajaFuerteFilter}
              onChange={(e) => setCajaFuerteFilter(e.target.value)}
              className="w-full md:w-48 px-4 py-2 bg-[#1e2538] border border-[#3d4659] rounded-lg text-white"
            >
              <option value="">Todas las cajas</option>
              {cajaFuerteOptions.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>

            {/* Barra de búsqueda */}
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Buscar por casita..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 pl-10 bg-[#1e2538] border border-[#3d4659] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#c9a45c] focus:border-transparent transition-all"
              />
              <svg
                className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>
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

        {showNotasForm && (
          <NotasForm onClose={() => setShowNotasForm(false)} />
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

        {/* Modal de Login */}
        {showLoginModal && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-[#1e2538] p-6 rounded-lg shadow-xl w-full max-w-md">
              <h2 className="text-2xl font-bold text-[#c9a45c] mb-4">Iniciar Sesión</h2>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Usuario</label>
                  <input
                    type="text"
                    value={loginData.usuario}
                    onChange={(e) => setLoginData({ ...loginData, usuario: e.target.value })}
                    className="w-full px-4 py-2 bg-[#2a3347] border border-[#3d4659] rounded-md text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Contraseña</label>
                  <input
                    type="password"
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    className="w-full px-4 py-2 bg-[#2a3347] border border-[#3d4659] rounded-md text-white"
                    required
                  />
                </div>
                {loginError && (
                  <p className="text-red-500 text-sm">{loginError}</p>
                )}
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowLoginModal(false)}
                    className="px-4 py-2 bg-[#3d4659] text-gray-300 rounded-lg hover:bg-[#4a5568] transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#c9a45c] text-white rounded-lg hover:bg-[#d4b06c] transition-all"
                  >
                    Iniciar Sesión
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </main>
  );
} 