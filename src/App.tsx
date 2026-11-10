import React, { useState, useEffect } from 'react';
import { TopBar } from './components/ui/TopBar';
import { CinematicCanvas } from './components/scene/CinematicCanvas';
import { CarnetModal } from './components/carnet/CarnetModal';
import { CredencialVerificationModal } from './components/carnet/CredencialVerificationModal';
import { soundscape } from './audio/soundscape';
import { CAMPAIGN_COPY } from './data/campaignCopy';
import {
  Volume2,
  VolumeX,
  ArrowRight,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

import imgYungas from './assets/images/jujuy_yungas_mist_1793819887266.jpg';
import imgHornocal from './assets/images/jujuy_hornocal_strata_1793819888783.jpg';
import imgSalinas from './assets/images/jujuy_salinas_grandes_1793819889557.jpg';
import imgComunidad from './assets/images/jujuy_comunidad_encuentro_1793819889846.jpg';

const SLIDE_IMAGES = [
  imgHornocal,
  imgYungas,
  imgSalinas,
  imgComunidad,
];

const SLIDES = CAMPAIGN_COPY.slides.map((slide, idx) => ({
  ...slide,
  imagePath: SLIDE_IMAGES[idx],
}));

export default function App() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isCarnetOpen, setIsCarnetOpen] = useState(false);
  const [verificarAfiliadoId, setVerificarAfiliadoId] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  // Detectar si alguien escaneó un código QR con ?validar=SOMOS-JUJ-XXXX o /validar/SOMOS-JUJ-XXXX
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    const idFromQuery = urlParams.get('validar');
    if (idFromQuery) {
      setVerificarAfiliadoId(idFromQuery);
      return;
    }

    const path = window.location.pathname;
    if (path.startsWith('/validar/')) {
      const idFromPath = path.replace('/validar/', '').trim();
      if (idFromPath) {
        setVerificarAfiliadoId(idFromPath);
      }
    }
  }, []);

  useEffect(() => {
    return soundscape.subscribe((playing, muted) => {
      setIsPlayingAudio(playing);
      setIsMuted(muted);
    });
  }, []);

  // Actualizar el paisaje sonoro específico al cambiar de diapositiva
  useEffect(() => {
    soundscape.setLandscapeByIndex(currentSlide);
  }, [currentSlide]);

  // Rotación automática suave de escenarios cada 10 segundos (se pausa si hay un modal abierto)
  useEffect(() => {
    if (isCarnetOpen || verificarAfiliadoId) return;

    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
    }, 10000);

    return () => clearInterval(timer);
  }, [isCarnetOpen, verificarAfiliadoId, currentSlide]);

  const nextSlide = () => {
    soundscape.playClick();
    setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
  };

  const prevSlide = () => {
    soundscape.playClick();
    setCurrentSlide((prev) => (prev - 1 + SLIDES.length) % SLIDES.length);
  };

  const goToSlide = (idx: number) => {
    soundscape.playRegionTransition(idx);
    setCurrentSlide(idx);
  };

  // Atajos de teclado para navegación fluida
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if (e.key === 'ArrowRight' || e.key === ' ') {
        nextSlide();
      } else if (e.key === 'ArrowLeft') {
        prevSlide();
      } else if (['1', '2', '3', '4'].includes(e.key)) {
        goToSlide(Number(e.key) - 1);
      } else if (e.key === 'Escape') {
        setIsCarnetOpen(false);
        setVerificarAfiliadoId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleAudioToggle = () => {
    soundscape.playClick();
    if (!isPlayingAudio) {
      soundscape.startAmbient();
    } else {
      soundscape.toggleMute();
    }
  };

  // Gestos táctiles en teléfonos móviles (deslizar izquierda o derecha)
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX - touchEndX;

    if (diff > 50) {
      nextSlide();
    } else if (diff < -50) {
      prevSlide();
    }
    setTouchStartX(null);
  };

  const activeSlide = SLIDES[currentSlide];

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="relative w-screen h-screen overflow-hidden bg-[#0C2340] text-slate-100 select-none font-sans"
    >
      {/* 1. Barra de Navegación Superior Limpia con Redes Oficiales */}
      <TopBar
        onOpenCarnet={() => setIsCarnetOpen(true)}
      />

      {/* 2. Lienzo WebGL Cinemático con Distorsión Líquida y Partículas */}
      <CinematicCanvas currentSlideIndex={currentSlide} slides={SLIDES} />

      {/* 3. Flechas de Navegación Flotantes (Izquierda y Derecha) */}
      <button
        onClick={prevSlide}
        className="fixed left-3 sm:left-6 top-1/2 -translate-y-1/2 z-30 p-2 sm:p-2.5 rounded-full bg-black/40 hover:bg-[#EE007C] border border-white/20 hover:border-[#EE007C] text-white/80 hover:text-white backdrop-blur-md transition-all shadow-xl active:scale-90 cursor-pointer pointer-events-auto"
        aria-label="Escenario anterior"
        title="Escenario anterior (←)"
      >
        <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
      </button>

      <button
        onClick={nextSlide}
        className="fixed right-3 sm:right-6 top-1/2 -translate-y-1/2 z-30 p-2 sm:p-2.5 rounded-full bg-black/40 hover:bg-[#00AEEF] border border-white/20 hover:border-[#00AEEF] text-white/80 hover:text-white backdrop-blur-md transition-all shadow-xl active:scale-90 cursor-pointer pointer-events-auto"
        aria-label="Escenario siguiente"
        title="Escenario siguiente (→)"
      >
        <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
      </button>

      {/* 4. Contenido Editorial Inmersivo en Pantalla Completa */}
      <div className="relative z-20 w-full h-full flex flex-col justify-between pt-24 pb-8 sm:pb-10 px-6 sm:px-12 md:px-20 pointer-events-none">
        {/* Encabezado del Slide Actual */}
        <div className="flex items-center justify-between text-xs font-mono uppercase tracking-[0.25em] text-white/70">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#EE007C]" />
            <span className="text-[#00AEEF] font-bold">{activeSlide.tag}</span>
            <span className="text-white/40">·</span>
            <span>{activeSlide.location}</span>
          </div>

          <div className="hidden sm:block text-slate-300 font-sans tracking-normal text-xs">
            {CAMPAIGN_COPY.controls.navigationHint}
          </div>
        </div>

        {/* Título Principal Editorial y Llamado a la Acción */}
        <div className="max-w-3xl pointer-events-auto">
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black font-montserrat text-white leading-[1.08] tracking-tight drop-shadow-xl">
            {activeSlide.title}
          </h1>

          <p className="mt-4 sm:mt-6 text-sm sm:text-lg text-slate-200/90 leading-relaxed font-sans max-w-2xl drop-shadow-md">
            {activeSlide.subtitle}
          </p>

          {/* Lema Institucional / Hook Final */}
          <div className="mt-4 inline-flex items-center gap-2 py-1.5 px-3.5 bg-black/40 backdrop-blur-md border border-white/15 rounded-xl shadow-lg">
            <span className="w-2 h-2 rounded-full bg-[#EE007C] shrink-0" />
            <span className="text-[11px] sm:text-xs font-black tracking-wider uppercase text-white font-montserrat">
              {CAMPAIGN_COPY.brand.hookFinal}
            </span>
          </div>

          <div className="mt-6 sm:mt-8 flex flex-wrap items-center gap-4">
            <button
              onClick={() => {
                soundscape.playClick();
                setIsCarnetOpen(true);
              }}
              className="py-3 px-6 bg-[#EE007C] hover:bg-[#d4006e] text-white font-bold rounded-xl text-sm flex items-center gap-2 shadow-2xl transition-all active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>{CAMPAIGN_COPY.controls.heroCtaButton}</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>

            {/* Control de Audio con Nombre del Paisaje Sonoro Activo */}
            <button
              onClick={handleAudioToggle}
              className={`py-3 px-4 rounded-xl text-xs font-semibold border backdrop-blur-md flex items-center gap-2.5 transition-all shadow-lg active:scale-95 cursor-pointer ${
                isPlayingAudio && !isMuted
                  ? 'bg-[#00AEEF]/20 border-[#00AEEF] text-[#00AEEF] ring-1 ring-[#00AEEF]/40'
                  : 'bg-black/50 hover:bg-black/70 border-white/25 hover:border-[#00AEEF] text-slate-200 hover:text-white'
              }`}
              title="Activar o silenciar el paisaje sonoro inmersivo"
            >
              {isPlayingAudio && !isMuted ? (
                <>
                  <Volume2 className="w-4 h-4 text-[#00AEEF] animate-pulse" />
                  <div className="flex items-end gap-0.5 h-3">
                    <span className="w-0.5 h-2 bg-[#00AEEF] animate-pulse" />
                    <span className="w-0.5 h-3 bg-[#00AEEF] animate-pulse delay-75" />
                    <span className="w-0.5 h-1.5 bg-[#00AEEF] animate-pulse delay-150" />
                  </div>
                  <span className="font-medium">{activeSlide.soundName}</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-4 h-4 text-slate-400" />
                  <span className="flex items-center gap-1.5">
                    <span className="text-[#00AEEF] font-bold">Activar sonido:</span>
                    <span>{activeSlide.soundName}</span>
                  </span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 5. Selector de Regiones Inferior (4 Ejes Territoriales Interactivos) */}
        <div className="w-full flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t border-white/10 pointer-events-auto">
          <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-1">
            {SLIDES.map((slide, idx) => {
              const isActive = idx === currentSlide;
              return (
                <button
                  key={slide.id}
                  onClick={() => goToSlide(idx)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-white/20 border border-[#00AEEF] text-white shadow-lg'
                      : 'bg-black/40 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isActive ? 'bg-[#EE007C] animate-pulse' : 'bg-white/30'
                    }`}
                  />
                  <span className="font-bold">{slide.tag}</span>
                </button>
              );
            })}
          </div>

          <div className="hidden md:flex items-center gap-2 text-[11px] font-mono text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            <span>Rotación activa (10s)</span>
          </div>
        </div>
      </div>

      {/* 6. Modal de Carnet Oficial de Afiliación (Padrón Permanente con Números Únicos) */}
      <CarnetModal isOpen={isCarnetOpen} onClose={() => setIsCarnetOpen(false)} />

      {/* 7. Modal de Verificación Pública de Credencial por Código QR */}
      <CredencialVerificationModal
        numeroAfiliado={verificarAfiliadoId}
        onClose={() => setVerificarAfiliadoId(null)}
        onOpenCarnet={() => {
          setVerificarAfiliadoId(null);
          setIsCarnetOpen(true);
        }}
      />
    </div>
  );
}

