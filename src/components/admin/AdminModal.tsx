import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  Search,
  MessageCircle,
  Database,
  Lock,
  Unlock,
  RefreshCw,
  Users,
  MapPin,
  Calendar,
  Phone,
  ShieldCheck,
  Server,
  FileSpreadsheet,
  Mail,
} from 'lucide-react';
import { soundscape } from '../../audio/soundscape';

interface Afiliado {
  id: string;
  numeroAfiliado: string;
  nombre: string;
  municipio: string;
  areaAccion: string;
  telefono: string;
  email?: string;
  fechaRegistro: string;
}

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminModal: React.FC<AdminModalProps> = ({ isOpen, onClose }) => {
  const [pin, setPin] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [afiliados, setAfiliados] = useState<Afiliado[]>([]);
  const [engine, setEngine] = useState<'postgresql' | 'json' | ''>('');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMunicipio, setSelectedMunicipio] = useState('Todos');
  const [activeTab, setActiveTab] = useState<'contactos' | 'guia'>('contactos');
  const [isSendingReport, setIsSendingReport] = useState(false);
  const [reportFeedback, setReportFeedback] = useState<{ success: boolean; message: string } | null>(null);

  const handleTriggerReport = async () => {
    setIsSendingReport(true);
    setReportFeedback(null);
    soundscape.playClick();
    try {
      const res = await fetch('/api/afiliaciones/enviar-resumen-diario', { method: 'POST' });
      const data = await res.json();
      setReportFeedback({ success: data.success, message: data.message });
    } catch {
      setReportFeedback({ success: false, message: 'Error de conexión al enviar reporte.' });
    } finally {
      setIsSendingReport(false);
    }
  };

  const fetchContacts = async (enteredPin: string) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`/api/afiliaciones/list?pin=${encodeURIComponent(enteredPin)}`);
      if (res.status === 401) {
        setIsAuthenticated(false);
        setErrorMsg('PIN incorrecto. (Por defecto: somos2026)');
        setLoading(false);
        return;
      }
      const data = await res.json();
      if (data.success && Array.isArray(data.afiliados)) {
        setAfiliados(data.afiliados);
        setEngine(data.engine || 'json');
        setIsAuthenticated(true);
      } else {
        setErrorMsg('No se pudieron obtener los contactos.');
      }
    } catch {
      setErrorMsg('Error de conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && isAuthenticated) {
      fetchContacts(pin);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    soundscape.playClick();
    fetchContacts(pin);
  };

  const handleDownloadCsv = () => {
    soundscape.playClick();
    window.open('/api/afiliaciones/csv', '_blank');
  };

  // Filtrado de contactos
  const municipiosUnicos = ['Todos', ...Array.from(new Set(afiliados.map((a) => a.municipio).filter(Boolean)))];

  const filteredAfiliados = afiliados.filter((a) => {
    const matchesSearch =
      a.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.numeroAfiliado.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.telefono && a.telefono.includes(searchTerm)) ||
      (a.email && a.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (a.areaAccion && a.areaAccion.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesMunicipio = selectedMunicipio === 'Todos' || a.municipio === selectedMunicipio;

    return matchesSearch && matchesMunicipio;
  });

  const getCleanPhoneForWhatsApp = (rawPhone: string) => {
    const digits = rawPhone.replace(/\D/g, '');
    if (digits.startsWith('549')) return digits;
    if (digits.startsWith('54')) return `549${digits.slice(2)}`;
    if (digits.startsWith('388') || digits.length === 10) return `549${digits}`;
    return digits;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-[#0C2340] border border-[#00AEEF]/50 rounded-2xl shadow-2xl overflow-hidden my-6 flex flex-col max-h-[90vh]">
        {/* Cabecera */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#0C2340]/90">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#00AEEF]/20 border border-[#00AEEF]/40 flex items-center justify-center text-[#00AEEF]">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold font-montserrat text-white flex items-center gap-2">
                <span>Padrón Territorial y Contactos</span>
                <span className="text-xs font-mono font-normal px-2 py-0.5 rounded bg-white/10 text-slate-300">
                  SOMOS Jujuy
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Gestión de personas afiliadas y base de datos para contacto directo
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              soundscape.playClick();
              onClose();
            }}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Si no está autenticado: Formulario de PIN */}
        {!isAuthenticated ? (
          <div className="p-8 sm:p-12 flex flex-col items-center justify-center text-center max-w-md mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-[#F8C300] mb-4 shadow-inner">
              <Lock className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-white font-montserrat">Acceso al Padrón Territorial</h3>
            <p className="text-xs text-slate-300 mt-2 mb-6">
              Ingresá el PIN de administración para ver la lista de personas registradas, sus teléfonos y descargar la planilla Excel / CSV.
            </p>

            <form onSubmit={handleLogin} className="w-full space-y-4">
              <div>
                <input
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="PIN de acceso (ej: somos2026)"
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-center text-white placeholder-slate-500 font-mono tracking-widest text-lg focus:outline-none focus:border-[#00AEEF]"
                  autoFocus
                />
                <span className="block text-[11px] text-slate-400 mt-1.5">
                  PIN predeterminado: <code className="text-[#00AEEF]">somos2026</code> (configurable en Hostinger)
                </span>
              </div>

              {errorMsg && (
                <div className="p-2.5 bg-red-500/20 border border-red-500/40 rounded-lg text-xs text-red-200">
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-[#EE007C] hover:bg-[#d4006e] text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98] cursor-pointer"
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Unlock className="w-4 h-4" />
                    <span>Desbloquear Padrón</span>
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
          /* Pantalla principal con Contactos y Guía */
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Barra superior de métricas y acciones */}
            <div className="px-6 py-4 bg-slate-900/60 border-b border-white/10 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-semibold text-slate-200">
                    Total Contactos: <strong className="text-white text-sm">{afiliados.length}</strong>
                  </span>
                </div>

                <div className="hidden sm:inline-flex items-center gap-1.5 text-xs text-slate-300 bg-white/5 border border-white/10 px-2.5 py-1 rounded-md">
                  <Server className="w-3.5 h-3.5 text-[#00AEEF]" />
                  <span>
                    Motor:{' '}
                    <strong className="text-[#00AEEF]">
                      {engine === 'postgresql' ? 'PostgreSQL (SQL)' : 'Archivo JSON Persistente'}
                    </strong>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchContacts(pin)}
                  disabled={loading}
                  className="p-2 text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Actualizar lista"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Actualizar</span>
                </button>

                <button
                  onClick={handleDownloadCsv}
                  className="py-2 px-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-md transition-colors cursor-pointer"
                  title="Descargar base de datos completa para Excel"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Descargar Excel / CSV</span>
                </button>

                <button
                  onClick={handleTriggerReport}
                  disabled={isSendingReport}
                  className="py-2 px-3.5 bg-[#00AEEF] hover:bg-[#0096ce] text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-md transition-colors cursor-pointer"
                  title="Enviar reporte diario ahora a partidosomosjujuy@gmail.com"
                >
                  <Mail className={`w-4 h-4 ${isSendingReport ? 'animate-spin' : ''}`} />
                  <span>{isSendingReport ? 'Enviando...' : 'Probar Envío a Gmail'}</span>
                </button>
              </div>
            </div>

            {reportFeedback && (
              <div
                className={`px-6 py-2.5 text-xs flex items-center justify-between border-b ${
                  reportFeedback.success
                    ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                    : 'bg-amber-950/60 border-amber-500/40 text-amber-200'
                }`}
              >
                <span>{reportFeedback.message}</span>
                <button
                  onClick={() => setReportFeedback(null)}
                  className="text-xs text-slate-400 hover:text-white ml-2 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Pestañas: Contactos vs Guía Hostinger VPS */}
            <div className="px-6 pt-3 border-b border-white/10 flex items-center gap-4 text-xs font-semibold">
              <button
                onClick={() => setActiveTab('contactos')}
                className={`pb-2.5 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'contactos'
                    ? 'border-[#00AEEF] text-[#00AEEF]'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Lista de Personas Registradas ({filteredAfiliados.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('guia')}
                className={`pb-2.5 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'guia'
                    ? 'border-[#EE007C] text-[#EE007C]'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Server className="w-4 h-4" />
                <span>Cómo funciona en tu Hostinger VPS</span>
              </button>
            </div>

            {/* Contenido de la pestaña activa */}
            {activeTab === 'contactos' ? (
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {/* Filtros */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Buscar por nombre, teléfono, municipio o militancia..."
                      className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-400 focus:outline-none focus:border-[#00AEEF]"
                    />
                  </div>

                  <select
                    value={selectedMunicipio}
                    onChange={(e) => setSelectedMunicipio(e.target.value)}
                    className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-[#00AEEF]"
                  >
                    {municipiosUnicos.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Lista de Contactos */}
                {filteredAfiliados.length === 0 ? (
                  <div className="p-8 text-center bg-slate-900/40 border border-white/5 rounded-xl text-slate-400 text-xs">
                    No se encontraron contactos que coincidan con la búsqueda.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {filteredAfiliados.map((af) => {
                      const cleanPhone = af.telefono ? getCleanPhoneForWhatsApp(af.telefono) : '';
                      const hasPhone = Boolean(cleanPhone && cleanPhone.length >= 8);
                      const waLink = hasPhone
                        ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
                            `¡Hola ${af.nombre}! Te escribimos desde SOMOS Jujuy respecto a tu Credencial #${af.numeroAfiliado} (${af.areaAccion || 'Militancia'}). Queríamos sumarte a las actividades en ${af.municipio}.`
                          )}`
                        : '';

                      return (
                        <div
                          key={af.id || af.numeroAfiliado}
                          className="p-4 bg-slate-900/70 border border-white/10 rounded-xl hover:border-[#00AEEF]/40 transition-colors flex flex-col justify-between gap-3"
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h4 className="font-bold text-white text-sm font-montserrat truncate">
                                  {af.nombre}
                                </h4>
                                <span className="inline-block text-[11px] font-mono text-[#00AEEF] font-semibold mt-0.5">
                                  {af.numeroAfiliado}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-400 bg-white/5 border border-white/5 px-2 py-0.5 rounded shrink-0">
                                {new Date(af.fechaRegistro).toLocaleDateString('es-AR')}
                              </span>
                            </div>

                            <div className="mt-3 space-y-1.5 text-xs text-slate-300">
                              <div className="flex items-center gap-1.5 text-slate-300">
                                <MapPin className="w-3.5 h-3.5 text-[#F8C300] shrink-0" />
                                <span>{af.municipio || 'Jujuy'}</span>
                              </div>

                              <div className="flex items-center gap-1.5 text-slate-300">
                                <Users className="w-3.5 h-3.5 text-[#EE007C] shrink-0" />
                                <span className="truncate">{af.areaAccion || 'General'}</span>
                              </div>

                              <div className="flex items-center gap-1.5">
                                <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                <span className="font-mono text-xs text-slate-200">
                                  {af.telefono || <span className="italic text-slate-500">Sin teléfono</span>}
                                </span>
                              </div>

                              {af.email && (
                                <div className="flex items-center gap-1.5">
                                  <Mail className="w-3.5 h-3.5 text-[#00AEEF] shrink-0" />
                                  <a
                                    href={`mailto:${af.email}`}
                                    className="text-xs text-[#00AEEF] hover:underline truncate"
                                    title="Enviar correo"
                                  >
                                    {af.email}
                                  </a>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Botón WhatsApp de Acción Directa */}
                          {hasPhone ? (
                            <a
                              href={waLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() => soundscape.playClick()}
                              className="mt-1 w-full py-2 px-3 bg-[#25D366]/20 hover:bg-[#25D366] text-[#25D366] hover:text-slate-950 font-bold rounded-lg text-xs flex items-center justify-center gap-2 border border-[#25D366]/40 transition-all cursor-pointer"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span>Escribir por WhatsApp</span>
                            </a>
                          ) : (
                            <span className="text-[11px] text-slate-500 text-center py-1.5">
                              No dejó número de contacto
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              /* Pestaña: Guía Hostinger VPS */
              <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-slate-200 leading-relaxed font-sans">
                <div className="p-4 bg-blue-950/40 border border-[#00AEEF]/30 rounded-xl space-y-2">
                  <h4 className="font-bold text-sm text-[#00AEEF] flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4" />
                    <span>¿Cómo se guardan los datos en tu Hostinger VPS?</span>
                  </h4>
                  <p>
                    A diferencia de plataformas en la nube que borran archivos al reiniciarse, tu <strong>VPS de Hostinger tiene disco duro permanente</strong>. Cada vez que un vecino o vecina entra a la web y genera su credencial, sus datos quedan guardados inmediatamente.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Opción 1 */}
                  <div className="p-4 bg-slate-900 border border-white/10 rounded-xl space-y-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold">
                      Opción 1 · Más fácil (Listo ya)
                    </span>
                    <h5 className="font-bold text-white text-sm">Almacenamiento Local en Disco</h5>
                    <p className="text-slate-400 text-xs">
                      Los datos se guardan de forma permanente en el archivo:
                      <br />
                      <code className="text-[#F8C300] bg-black/40 px-1.5 py-0.5 rounded font-mono text-[11px]">
                        /data/afiliaciones.json
                      </code>
                    </p>
                    <p className="text-slate-400 text-xs">
                      No necesitas instalar nada extra en el VPS. Al reiniciar el servidor con PM2, los datos nunca se pierden.
                    </p>
                  </div>

                  {/* Opción 2 */}
                  <div className="p-4 bg-slate-900 border border-white/10 rounded-xl space-y-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#00AEEF] font-bold">
                      Opción 2 · Base de Datos SQL
                    </span>
                    <h5 className="font-bold text-white text-sm">PostgreSQL en el mismo VPS</h5>
                    <p className="text-slate-400 text-xs">
                      Instalas PostgreSQL en tu VPS con:
                      <br />
                      <code className="text-slate-200 bg-black/40 px-1.5 py-0.5 rounded font-mono text-[10px]">
                        sudo apt install postgresql
                      </code>
                    </p>
                    <p className="text-slate-400 text-xs">
                      Agregas tu <code className="text-[#00AEEF]">DATABASE_URL</code> en el archivo <code className="text-[#00AEEF]">.env</code> y el servidor crea las tablas y secuencias numéricas automáticamente.
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-slate-900/70 border border-white/10 rounded-xl space-y-2">
                  <h5 className="font-bold text-white text-sm">¿Cómo contactar a las personas registradas?</h5>
                  <ul className="list-disc list-inside space-y-1.5 text-slate-300">
                    <li>
                      <strong>1. WhatsApp Directo:</strong> En la pestaña <em>"Lista de Personas Registradas"</em>, haz clic en el botón verde de cualquier vecino para abrir un chat de WhatsApp con un mensaje prearmado personalizado.
                    </li>
                    <li>
                      <strong>2. Planilla Excel completa:</strong> Haz clic en <strong>"Descargar Excel / CSV"</strong> para tener todos los nombres, municipios, teléfonos y fechas listos para importar en Google Sheets o enviar a los coordinadores barriales.
                    </li>
                    <li>
                      <strong>3. Reporte Diario Automático por Email:</strong> El servidor revisa automáticamente todas las noches a las 21:00 hs. Si hubo personas registradas ese día, envía un email estructurado a <strong className="text-[#00AEEF]">partidosomosjujuy@gmail.com</strong> con el listado completo para coordinar la afiliación física en papel.
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
