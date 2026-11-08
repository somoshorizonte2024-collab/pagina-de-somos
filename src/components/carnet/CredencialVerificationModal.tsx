import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle,
  AlertTriangle,
  ShieldCheck,
  MapPin,
  Calendar,
  IdCard,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { SomosLogo } from '../ui/SomosLogo';
import { soundscape } from '../../audio/soundscape';
import { CAMPAIGN_COPY } from '../../data/campaignCopy';

interface VerificationData {
  valid: boolean;
  numeroAfiliado?: string;
  nombre?: string;
  municipio?: string;
  areaAccion?: string;
  fechaRegistro?: string;
  message?: string;
}

interface CredencialVerificationModalProps {
  numeroAfiliado: string | null;
  onClose: () => void;
  onOpenCarnet: () => void;
}

export const CredencialVerificationModal: React.FC<CredencialVerificationModalProps> = ({
  numeroAfiliado,
  onClose,
  onOpenCarnet,
}) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<VerificationData | null>(null);

  useEffect(() => {
    if (!numeroAfiliado) return;

    setLoading(true);
    fetch(`/api/afiliaciones/validar/${encodeURIComponent(numeroAfiliado)}`)
      .then((res) => res.json())
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch(() => {
        setData({ valid: false, message: 'No se pudo conectar con el servidor de validación' });
        setLoading(false);
      });
  }, [numeroAfiliado]);

  if (!numeroAfiliado) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-lg bg-[#0C2340] border-2 border-[#00AEEF] rounded-2xl shadow-2xl overflow-hidden my-6">
        {/* Franjas oficiales de SOMOS */}
        <div className="h-2 bg-[#EE007C] w-full" />
        <div className="h-1 bg-[#00AEEF] w-full" />

        {/* Cabecera */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#0C2340]">
          <div className="flex items-center gap-3">
            <SomosLogo size="sm" showSubtitle={false} variant="light" />
            <span className="text-xs font-mono tracking-widest text-[#00AEEF] uppercase font-bold">
              Validación Oficial de QR
            </span>
          </div>
          <button
            onClick={() => {
              soundscape.playClick();
              onClose();
            }}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-6">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
              <Loader2 className="w-8 h-8 text-[#00AEEF] animate-spin" />
              <p className="text-xs font-mono text-slate-300">
                Consultando el Padrón de SOMOS Jujuy...
              </p>
            </div>
          ) : data?.valid ? (
            <div className="space-y-6">
              {/* Badge de Verificación Exitosa */}
              <div className="p-4 bg-emerald-950/60 border border-emerald-500/50 rounded-xl flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-400 flex items-center justify-center text-emerald-400 shrink-0">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Credencial Auténtica y Verificada</h3>
                  <p className="text-[11px] text-emerald-300">
                    Registro activo en el padrón partidario de SOMOS Jujuy
                  </p>
                </div>
              </div>

              {/* Tarjeta del Titular */}
              <div className="p-5 bg-slate-900/90 border border-white/15 rounded-xl space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                    ID Oficial de Afiliación
                  </span>
                  <span className="font-mono font-bold text-sm text-[#EE007C] px-2.5 py-0.5 bg-[#EE007C]/10 border border-[#EE007C]/30 rounded">
                    {data.numeroAfiliado}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">
                    Titular de la Credencial
                  </span>
                  <h4 className="text-xl font-black text-white font-montserrat mt-0.5 uppercase">
                    {data.nombre}
                  </h4>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-[#F8C300]" />
                      <span>Territorio</span>
                    </span>
                    <p className="font-semibold text-slate-200 mt-0.5">{data.municipio}</p>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 uppercase flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-[#00AEEF]" />
                      <span>Fecha de Registro</span>
                    </span>
                    <p className="font-semibold text-slate-200 mt-0.5">
                      {data.fechaRegistro ? new Date(data.fechaRegistro).toLocaleDateString('es-AR') : '2026'}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/10">
                  <span className="text-[10px] text-slate-400 uppercase">
                    Condición de Participación
                  </span>
                  <p className="text-xs text-slate-200 font-medium mt-0.5">
                    {data.areaAccion || 'Solo Adhesión Ciudadana (General)'}
                  </p>
                </div>
              </div>

              {/* Lema Oficial */}
              <div className="text-center px-4">
                <p className="text-[11px] font-bold font-montserrat uppercase tracking-wider text-[#F8C300]">
                  {CAMPAIGN_COPY.brand.hookFinal}
                </p>
              </div>

              {/* Botón de acción */}
              <button
                onClick={() => {
                  soundscape.playClick();
                  onClose();
                  onOpenCarnet();
                }}
                className="w-full py-3 px-4 bg-[#EE007C] hover:bg-[#d4006e] text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98] cursor-pointer"
              >
                <IdCard className="w-4 h-4" />
                <span>Generar mi propia credencial de SOMOS Jujuy</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </button>
            </div>
          ) : (
            <div className="py-8 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-white text-base">Credencial no encontrada</h3>
              <p className="text-xs text-slate-300 max-w-sm mx-auto">
                El número <strong>{numeroAfiliado}</strong> no figura en los registros oficiales o fue ingresado incorrectamente.
              </p>

              <button
                onClick={() => {
                  soundscape.playClick();
                  onClose();
                  onOpenCarnet();
                }}
                className="py-2.5 px-5 bg-[#00AEEF] hover:bg-[#0096ce] text-slate-950 font-bold rounded-xl text-xs inline-flex items-center gap-2 cursor-pointer transition-colors"
              >
                <span>Registrarme ahora</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
