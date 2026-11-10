import React, { useState, useEffect } from 'react';
import {
  X,
  Share2,
  MessageCircle,
  CheckCircle,
  Sparkles,
  Shield,
  Loader2,
  Mail,
  Lightbulb,
  Phone,
  MapPin,
  User,
  Heart,
} from 'lucide-react';
import { soundscape } from '../../audio/soundscape';
import { CAMPAIGN_COPY } from '../../data/campaignCopy';
import { SomosLogo } from '../ui/SomosLogo';

interface CarnetModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMunicipio?: string;
}

export const CarnetModal: React.FC<CarnetModalProps> = ({
  isOpen,
  onClose,
  defaultMunicipio = 'San Salvador de Jujuy',
}) => {
  const [nombre, setNombre] = useState('');
  const [municipio, setMunicipio] = useState(defaultMunicipio);
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [propuesta, setPropuesta] = useState('');
  const [afiliadoId, setAfiliadoId] = useState('SOMOS-JUJ-0101');
  const [submittedPropuesta, setSubmittedPropuesta] = useState('');
  const [submittedNombre, setSubmittedNombre] = useState('');
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [submittedTelefono, setSubmittedTelefono] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/afiliaciones/stats')
        .then((res) => res.json())
        .then((data) => {
          if (data.ultimoNumero && !isSubmitted) {
            const parts = data.ultimoNumero.split('-');
            const nextNum = Number(parts[2] || 100) + 1;
            setAfiliadoId(`SOMOS-JUJ-${String(nextNum).padStart(4, '0')}`);
          }
        })
        .catch(() => {
          setAfiliadoId('SOMOS-JUJ-0101');
        });
    }
  }, [isOpen, isSubmitted]);

  if (!isOpen) return null;

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !email.trim()) return;

    setIsSubmitting(true);
    soundscape.playClick();

    const currentPropuesta = propuesta.trim();
    const currentNombre = nombre.trim();
    const currentEmail = email.trim();
    const currentTelefono = telefono.trim();

    try {
      const response = await fetch('/api/afiliaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: currentNombre,
          municipio,
          areaAccion: currentPropuesta ? 'Buzón de Propuestas' : 'Adhesión General',
          propuesta: currentPropuesta,
          telefono: currentTelefono,
          email: currentEmail,
        }),
      });

      const data = await response.json();

      if (response.ok && data.afiliado) {
        setAfiliadoId(data.afiliado.numeroAfiliado);
      }
      setSubmittedNombre(currentNombre);
      setSubmittedEmail(currentEmail);
      setSubmittedTelefono(currentTelefono);
      setSubmittedPropuesta(currentPropuesta);
      setIsSubmitted(true);
      soundscape.playCarnetIssued();
    } catch {
      setSubmittedNombre(currentNombre);
      setSubmittedEmail(currentEmail);
      setSubmittedTelefono(currentTelefono);
      setSubmittedPropuesta(currentPropuesta);
      setIsSubmitted(true);
      soundscape.playCarnetIssued();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWhatsAppShare = () => {
    soundscape.playClick();
    const shareText = CAMPAIGN_COPY.carnetModal.success.whatsappShareText(window.location.origin);
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
  };

  const handleShareLink = () => {
    soundscape.playClick();
    const shareText = CAMPAIGN_COPY.carnetModal.success.whatsappShareText(window.location.origin);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    }
  };

  const handleResetAndClose = () => {
    soundscape.playClick();
    setIsSubmitted(false);
    setNombre('');
    setTelefono('');
    setEmail('');
    setPropuesta('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-xl bg-[#0C2340] border border-[#00AEEF]/40 rounded-2xl shadow-2xl overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-200">
        {/* Cabecera del Modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#0C2340]/90">
          <div className="flex items-center gap-3">
            <SomosLogo size="sm" showSubtitle={false} />
            <div className="h-6 w-px bg-white/15" />
            <div>
              <h2 className="text-sm sm:text-base font-bold font-montserrat text-white leading-tight">
                {CAMPAIGN_COPY.carnetModal.title}
              </h2>
              <p className="text-[11px] text-slate-400">
                Ficha de adhesión y buzón ciudadano
              </p>
            </div>
          </div>
          <button
            onClick={handleResetAndClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido: Formulario o Pantalla de Confirmación */}
        <div className="p-6">
          {!isSubmitted ? (
            <div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-5">
                {CAMPAIGN_COPY.carnetModal.description}
              </p>

              <form onSubmit={handleSubmitForm} className="space-y-4">
                {/* Nombre y Apellido */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-[#00AEEF]" />
                    <span>{CAMPAIGN_COPY.carnetModal.form.nombreLabel}</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder={CAMPAIGN_COPY.carnetModal.form.nombrePlaceholder}
                    className="w-full px-3.5 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-[#00AEEF] focus:ring-1 focus:ring-[#00AEEF] text-sm transition-all"
                  />
                </div>

                {/* Municipio */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#00AEEF]" />
                    <span>{CAMPAIGN_COPY.carnetModal.form.municipioLabel}</span>
                  </label>
                  <select
                    value={municipio}
                    onChange={(e) => setMunicipio(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-[#00AEEF] focus:ring-1 focus:ring-[#00AEEF] text-sm transition-all cursor-pointer"
                  >
                    {CAMPAIGN_COPY.municipalities.map((m) => (
                      <option key={m} value={m} className="bg-slate-900 text-white">
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Correo Electrónico (Obligatorio) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-[#EE007C]" />
                    <span>{CAMPAIGN_COPY.carnetModal.form.emailLabel}</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={CAMPAIGN_COPY.carnetModal.form.emailPlaceholder}
                    className="w-full px-3.5 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-[#00AEEF] focus:ring-1 focus:ring-[#00AEEF] text-sm transition-all"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Te escribiremos a este email para coordinar la firma en papel de tu ficha de afiliación.
                  </p>
                </div>

                {/* WhatsApp / Teléfono (Opcional) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-[#25D366]" />
                    <span>{CAMPAIGN_COPY.carnetModal.form.telefonoLabel}</span>
                  </label>
                  <input
                    type="tel"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    placeholder={CAMPAIGN_COPY.carnetModal.form.telefonoPlaceholder}
                    className="w-full px-3.5 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-[#00AEEF] focus:ring-1 focus:ring-[#00AEEF] text-sm transition-all"
                  />
                </div>

                {/* Buzón de Propuestas (Reemplaza a "¿Te gustaría militar?") */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Lightbulb className="w-3.5 h-3.5 text-[#F8C300]" />
                      <span>{CAMPAIGN_COPY.carnetModal.form.propuestaLabel}</span>
                    </span>
                    <span className="text-[10px] text-[#F8C300] font-normal lowercase bg-[#F8C300]/10 px-2 py-0.5 rounded border border-[#F8C300]/20">
                      Tu voz importa
                    </span>
                  </label>
                  <textarea
                    rows={3}
                    value={propuesta}
                    onChange={(e) => setPropuesta(e.target.value)}
                    placeholder={CAMPAIGN_COPY.carnetModal.form.propuestaPlaceholder}
                    maxLength={1500}
                    className="w-full px-3.5 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-[#00AEEF] focus:ring-1 focus:ring-[#00AEEF] text-sm resize-none transition-all leading-relaxed"
                  />
                  <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1">
                    <span>Proyectos vecinales, inquietudes, salud, trabajo joven, educación o ambiente</span>
                    <span>{propuesta.length}/1500</span>
                  </div>
                </div>

                {/* Botón de Envío */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-[#EE007C] to-[#d4006e] hover:from-[#d4006e] hover:to-[#b0005a] text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50 mt-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{CAMPAIGN_COPY.carnetModal.form.submittingButton}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>{CAMPAIGN_COPY.carnetModal.form.submitButton}</span>
                    </>
                  )}
                </button>
              </form>

              {/* Aviso de Privacidad y Afiliación Oficial */}
              <div className="mt-4 p-3 bg-slate-900/60 border border-white/5 rounded-xl text-[11px] text-slate-400 flex items-start gap-2.5">
                <Shield className="w-4 h-4 text-[#00AEEF] shrink-0 mt-0.5" />
                <span>{CAMPAIGN_COPY.carnetModal.form.disclaimer}</span>
              </div>
            </div>
          ) : (
            /* Estado de Confirmación Exitosa */
            <div className="text-center py-2 space-y-5 animate-in fade-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-full bg-emerald-500/15 border-2 border-emerald-500/50 text-emerald-400 mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/10">
                <CheckCircle className="w-8 h-8 text-emerald-400" />
              </div>

              <div>
                <span className="inline-block px-3 py-1 bg-[#EE007C]/15 border border-[#EE007C]/40 text-[#EE007C] rounded-full text-xs font-mono font-bold tracking-wider mb-2">
                  N° DE REGISTRO: {afiliadoId}
                </span>
                <h3 className="text-xl sm:text-2xl font-bold font-montserrat text-white">
                  ¡Gracias por sumarte, {submittedNombre}!
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 mt-1.5 max-w-md mx-auto">
                  {CAMPAIGN_COPY.carnetModal.success.subtitle}
                </p>
              </div>

              {/* Tarjeta de Coordinación de Afiliación en Papel */}
              <div className="p-4 bg-slate-900/80 border border-[#00AEEF]/30 rounded-xl text-left space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-[#00AEEF] uppercase tracking-wider">
                  <Mail className="w-4 h-4" />
                  <span>Próximo Paso: Afiliación Oficial en Papel</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Te escribiremos a <strong className="text-white">{submittedEmail}</strong>
                  {submittedTelefono ? (
                    <>
                      {' '}y por WhatsApp a <strong className="text-white">{submittedTelefono}</strong>
                    </>
                  ) : null}{' '}
                  para coordinar el encuentro en tu localidad ({municipio}) y completar la firma de tu ficha de afiliación oficial.
                </p>
              </div>

              {/* Si dejó una propuesta en el buzón */}
              {submittedPropuesta && (
                <div className="p-4 bg-[#F8C300]/10 border border-[#F8C300]/30 rounded-xl text-left space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#F8C300] uppercase tracking-wider">
                    <Lightbulb className="w-4 h-4" />
                    <span>Propuesta Ingresada al Buzón</span>
                  </div>
                  <p className="text-xs text-slate-200 italic leading-relaxed bg-black/30 p-2.5 rounded-lg border border-white/5">
                    “{submittedPropuesta}”
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Tu propuesta ha sido enviada directamente a la Junta Promotora de SOMOS Jujuy para ser analizada e incorporada a las mesas de trabajo.
                  </p>
                </div>
              )}

              {/* Acciones para Compartir */}
              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={handleWhatsAppShare}
                  className="w-full py-3 px-4 bg-[#25D366] hover:bg-[#20b858] text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98] cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4 fill-slate-950" />
                  <span>{CAMPAIGN_COPY.carnetModal.success.whatsappShareButton}</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleShareLink}
                    className="py-2.5 px-3 bg-white/10 hover:bg-white/15 text-white font-medium rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {isCopied ? (
                      <>
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">
                          {CAMPAIGN_COPY.carnetModal.success.copiedButton}
                        </span>
                      </>
                    ) : (
                      <>
                        <Share2 className="w-3.5 h-3.5 text-[#00AEEF]" />
                        <span>{CAMPAIGN_COPY.carnetModal.success.copyLinkButton}</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleResetAndClose}
                    className="py-2.5 px-3 bg-[#0C2340] hover:bg-slate-800 border border-white/15 text-white font-medium rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Heart className="w-3.5 h-3.5 text-[#EE007C]" />
                    <span>{CAMPAIGN_COPY.carnetModal.success.closeButton}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
