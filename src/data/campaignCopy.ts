/**
 * DICCIONARIO DEFINITIVO DE TEXTOS DE CAMPAÑA - SOMOS JUJUY
 * Actualizado con el documento de campaña oficial.
 */

export const CAMPAIGN_COPY = {
  // 1. Marca y Cabecera
  brand: {
    name: 'SOMOS',
    province: 'JUJUY',
    hookFinal: 'NO SOMOS UNA SIGLA. SOMOS LOS QUE QUEREMOS NUESTRA TIERRA.',
    topCtaButton: 'Sumarme a SOMOS',
  },

  // 2. Diapositivas Cinemáticas de Apertura (Los 4 Ejes de Campaña)
  slides: [
    {
      id: 'hornocal',
      tag: '01 / QUEBRADA',
      location: 'Quebrada de Humahuaca',
      title: 'Que nuestros pibes no tengan que irse.',
      subtitle:
        'Serranía del Hornocal y nuestros pueblos. Soberanía es tener salarios dignos, arraigo y futuro acá. Nadie debería verse obligado a dejar su tierra por falta de oportunidades.',
      soundName: 'Viento Andino & Quena de Quebrada',
    },
    {
      id: 'yungas',
      tag: '02 / YUNGAS',
      location: 'Yungas y Ramal Jujeño',
      title: 'Que la riqueza de la selva se note en la mesa.',
      subtitle:
        'Parque Nacional Calilegua y el Ramal. Defender nuestros bienes naturales es garantizar salud pública, agua limpia y trabajo local para que las familias no tengan que elegir entre pagar la luz o comprar remedios.',
      soundName: 'Brisa & Gotas de Nuboselva',
    },
    {
      id: 'salinas',
      tag: '03 / PUNA',
      location: 'Puna Jujeña',
      title: 'El litio es nuestro, la pobreza no puede serlo.',
      subtitle:
        'Salinas Grandes y el altiplano. Los minerales estratégicos deben traducirse en infraestructura, escuelas y desarrollo directo para las comunidades. Basta de riqueza en origen con miseria en el territorio.',
      soundName: 'Silencio & Resonancia de Sal',
    },
    {
      id: 'comunidad',
      tag: '04 / COMUNIDAD',
      location: 'Provincia de Jujuy',
      title: 'Llegar a fin de mes no puede ser una hazaña.',
      subtitle:
        'Eso es lo que preguntan en toda la provincia. Por eso este espacio es abierto para que tu voz en el barrio y la tecnología resuelvan problemas concretos: alquileres, tarifas y trabajo genuino.',
      soundName: 'Pulso & Esperanza Popular',
    },
  ],

  // 3. Controles e Instrucciones de Navegación
  controls: {
    heroCtaButton: 'Sumarme a SOMOS Jujuy',
    navigationHint: 'Deslizá el cursor para revelar el territorio · [← →] Navegar',
    audioActivePrefix: 'Sonido Activo:',
    audioInactivePrefix: 'Activar Sonido:',
    previousAria: 'Paisaje anterior',
    nextAria: 'Paisaje siguiente',
  },

  // 4. Modal de Sumarse a SOMOS y Buzón de Propuestas
  carnetModal: {
    title: 'Sumate a SOMOS Jujuy',
    description:
      'Sumate al proyecto que transforma Jujuy. Dejanos tus datos de contacto para coordinar la afiliación oficial en papel y tus propuestas en el buzón ciudadano.',
    form: {
      nombreLabel: 'Nombre y Apellido *',
      nombrePlaceholder: 'Ej: Marcelo Morales',
      municipioLabel: 'Municipio / Localidad donde vivís *',
      telefonoLabel: 'WhatsApp / Celular (Opcional)',
      telefonoPlaceholder: 'Ej: 388 123-4567',
      emailLabel: 'Correo Electrónico * (Obligatorio, para coordinar la firma en papel)',
      emailPlaceholder: 'Ej: tuemail@gmail.com',
      propuestaLabel: 'Buzón de Propuestas para Jujuy (Ideas, proyectos o inquietudes)',
      propuestaPlaceholder: '¿Qué propuesta o idea tenés para tu barrio, tu localidad o para Jujuy? Contanos acá tu iniciativa para construir juntos...',
      submitButton: 'Sumarme y Enviar Propuesta',
      submittingButton: 'Registrando tus datos y propuesta...',
      disclaimer:
        'Tus datos serán utilizados exclusivamente para contactarte y coordinar la firma de la ficha de afiliación oficial en papel ante la justicia electoral.',
    },
    success: {
      title: '¡Gracias por sumarte a SOMOS Jujuy!',
      subtitle: 'Tu registro y propuesta han sido recibidos con éxito por la Junta Promotora.',
      contactNotice:
        'Nos pondremos en contacto contigo a través de tu correo electrónico para coordinar el encuentro y la firma de la ficha de afiliación en papel.',
      proposalTag: 'Tu propuesta registrada en el buzón:',
      whatsappShareButton: 'Invitar a un amigo / vecino por WhatsApp',
      whatsappShareText: (url: string) =>
        `¡Me acabo de sumar a SOMOS Jujuy y dejé mi propuesta para la provincia! Sumate vos también acá: ${url}`,
      copyLinkButton: 'Copiar enlace de invitación',
      copiedButton: '¡Enlace Copiado!',
      closeButton: 'Entendido, volver a la página',
    },
    cardDesign: {
      headerCategory: 'JUJUY',
      statusBadge: 'Padrón Verificado',
      titularLabel: 'TITULAR',
      defaultTitular: 'NOMBRE Y APELLIDO',
      territorioLabel: 'TERRITORIO',
      accionLabel: 'PROPUESTA',
      numeroPadronLabel: 'ID',
      qrVerificationLabel: 'Validación en Padrón',
      partySubFooter: 'PARTIDO SOMOS JUJUY',
      movementFooter: 'Tu lugar en Jujuy · 2026',
    },
    actions: {
      whatsappButtonText: (afiliadoId: string) =>
        `Escribir a SOMOS Jujuy con mi N° de Registro #${afiliadoId}`,
      whatsappMessageTemplate: (municipio: string, afiliadoId: string, nombre: string) =>
        `¡Hola SOMOS Jujuy! Me acabo de sumar desde ${municipio}. Mi N° de Registro es #${afiliadoId} a nombre de ${nombre}.`,
      downloadButton: 'Descargar Comprobante',
      downloadingButton: 'Generando...',
      shareButton: 'Invitar a un vecino',
      copiedButton: '¡Enlace Copiado!',
      shareMessageText: (afiliadoId: string, url: string) =>
        `Ya me sumé a SOMOS Jujuy (Registro #${afiliadoId}). Sumate vos también a transformar nuestra provincia: ${url}`,
    },
  },

  // 5. Áreas / Participación
  actionAreas: [
    { id: 'adhesion_general', label: 'Adhesión y Propuestas Ciudadanas' },
  ],

  // 6. Lista de Municipios Cargados en el Selector
  municipalities: [
    'San Salvador de Jujuy',
    'Palpalá',
    'San Pedro de Jujuy',
    'Libertador Gral. San Martín',
    'Perico',
    'Tilcara',
    'Humahuaca',
    'La Quiaca',
    'Abra Pampa',
    'El Carmen',
    'Monterrico',
    'Calilegua',
    'Purmamarca',
    'Maimará',
    'Susques',
    'Santa Clara',
    'Yuto',
    'Fraile Pintado',
  ],

  // 7. Redes Sociales Oficiales de SOMOS Jujuy
  socialLinks: {
    facebook: 'https://www.facebook.com/SomosPartidoPoliticoJujuy',
    instagram: 'https://www.instagram.com/partidosomosjujuy?srtk=ZzZzMTZyaGx1bGc2',
    tiktok: 'https://www.tiktok.com/@somosesperanzajujuy?_r=1&_t=ZS-9B8F3458X7C',
  },
};
