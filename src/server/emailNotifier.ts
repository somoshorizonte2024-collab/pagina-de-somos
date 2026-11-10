import nodemailer from 'nodemailer';

export interface AfiliadoReportItem {
  id: string;
  numeroAfiliado: string;
  nombre: string;
  municipio: string;
  areaAccion?: string;
  propuesta?: string;
  telefono: string;
  email: string;
  fechaRegistro: string;
}

function escapeHtml(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeCsvField(val: string): string {
  const str = String(val || '').replace(/"/g, '""');
  if (/^[=+\-@\t\r]/.test(str)) {
    return `"'${str}"`;
  }
  return `"${str}"`;
}

export function generateAfiliadosCsv(afiliados: AfiliadoReportItem[]): string {
  let csv = 'NumeroAfiliado,Nombre,Municipio,Propuesta,Telefono,Email,FechaRegistro\n';
  afiliados.forEach((af) => {
    const cleanNum = sanitizeCsvField(af.numeroAfiliado);
    const cleanName = sanitizeCsvField(af.nombre);
    const cleanMun = sanitizeCsvField(af.municipio);
    const cleanPropuesta = sanitizeCsvField(af.propuesta || af.areaAccion || '');
    const cleanTel = sanitizeCsvField(af.telefono);
    const cleanMail = sanitizeCsvField(af.email || '');
    const cleanDate = sanitizeCsvField(af.fechaRegistro);
    csv += `${cleanNum},${cleanName},${cleanMun},${cleanPropuesta},${cleanTel},${cleanMail},${cleanDate}\n`;
  });
  // Retorna con UTF-8 BOM para que Microsoft Excel abra los acentos y caracteres especiales perfectamente
  return '\uFEFF' + csv;
}

export function isSmtpConfigured(): boolean {
  return Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
}

export async function sendDailySummaryEmail(
  afiliadosHoy: AfiliadoReportItem[],
  dateStr: string,
  totalHistorico: number,
  todosAfiliados?: AfiliadoReportItem[]
): Promise<{ success: boolean; configured: boolean; message: string }> {
  const recipient = process.env.NOTIFICATION_EMAIL || 'partidosomosjujuy@gmail.com';

  if (!isSmtpConfigured()) {
    const msg = `[Notificador Diario] Hay ${afiliadosHoy.length} inscripto(s) hoy (${dateStr}), pero falta configurar SMTP_PASS en el archivo .env para enviar a ${recipient}.`;
    console.warn(msg);
    return {
      success: false,
      configured: false,
      message: `Hay ${afiliadosHoy.length} personas registradas hoy, pero falta configurar la contraseña de aplicación (SMTP_PASS en .env) para enviar correos a ${recipient}.`,
    };
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '465', 10),
    secure: (process.env.SMTP_PORT || '465') === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const listaCompleta = todosAfiliados && todosAfiliados.length > 0 ? todosAfiliados : afiliadosHoy;
  const csvAttachmentContent = generateAfiliadosCsv(listaCompleta);
  const csvFilename = `Padron_Afiliados_SOMOS_Jujuy_${dateStr}.csv`;

  const rowsHtml = afiliadosHoy
    .map(
      (a, idx) => {
        const safeNumero = escapeHtml(a.numeroAfiliado);
        const safeNombre = escapeHtml(a.nombre);
        const safeEmail = escapeHtml(a.email);
        const safeMunicipio = escapeHtml(a.municipio);
        const userPropuesta = a.propuesta || a.areaAccion || '';
        const safePropuesta = escapeHtml(userPropuesta);
        const cleanTelDigits = (a.telefono || '').replace(/\D/g, '');
        const safeTel = escapeHtml(a.telefono);

        return `
      <tr style="border-bottom: 1px solid #e2e8f0; background: ${idx % 2 === 0 ? '#f8fafc' : '#ffffff'};">
        <td style="padding: 10px; font-weight: bold; font-family: monospace; color: #EE007C;">${safeNumero}</td>
        <td style="padding: 10px; font-weight: bold; color: #0C2340;">${safeNombre}</td>
        <td style="padding: 10px; color: #0284c7; font-weight: 600;">
          <a href="mailto:${safeEmail}" style="color: #0284c7; text-decoration: none;">${safeEmail || '(Sin email)'}</a>
        </td>
        <td style="padding: 10px; color: #16a34a; font-family: monospace;">
          ${
            cleanTelDigits
              ? `<a href="https://wa.me/${cleanTelDigits}" style="color: #16a34a; text-decoration: none;">${safeTel}</a>`
              : '<span style="color: #94a3b8; font-style: italic;">Sin teléfono</span>'
          }
        </td>
        <td style="padding: 10px; color: #334155;">${safeMunicipio}</td>
        <td style="padding: 10px; color: #334155; font-size: 12px; max-width: 280px; line-height: 1.4;">
          ${
            safePropuesta
              ? `<span style="display: inline-block; padding: 4px 8px; background: #fdf2f8; border-left: 3px solid #EE007C; border-radius: 4px; color: #831843; font-style: italic;">“${safePropuesta}”</span>`
              : '<span style="color: #94a3b8; font-style: italic;">(Sin propuesta escrita)</span>'
          }
        </td>
      </tr>
    `;
      }
    )
    .join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 20px; background-color: #f1f5f9; }
        .container { max-width: 860px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
        .header { background: #0C2340; color: #ffffff; padding: 24px; text-align: center; border-bottom: 4px solid #EE007C; }
        .content { padding: 24px; }
        .badge { background: #00AEEF; color: #ffffff; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; display: inline-block; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px; }
        th { background: #0C2340; color: #ffffff; text-align: left; padding: 10px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
        .footer { background: #f8fafc; padding: 16px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0; font-size: 26px; letter-spacing: 1px; color: #ffffff;">SOMOS JUJUY</h1>
          <p style="margin: 6px 0 0; font-size: 13px; color: #00AEEF; font-weight: bold;">
            Reporte Diario de Afiliaciones y Buzón de Propuestas
          </p>
        </div>

        <div class="content">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <p style="margin: 0; font-size: 15px; color: #1e293b;">
              Hola equipo de <strong>SOMOS Jujuy</strong>,
            </p>
            <span class="badge">Fecha: ${dateStr}</span>
          </div>

          <p style="color: #475569; font-size: 14px; line-height: 1.5; margin: 8px 0 16px;">
            Hoy se registraron <strong>${afiliadosHoy.length} nueva(s) persona(s)</strong> en la plataforma.
            Aquí tienes sus correos y teléfonos para <strong>coordinar la firma de la ficha de afiliación en papel</strong>, junto con sus iniciativas ingresadas al <strong>Buzón de Propuestas</strong>:
          </p>

          <div style="overflow-x: auto;">
            <table>
              <thead>
                <tr>
                  <th>N° Registro</th>
                  <th>Nombre y Apellido</th>
                  <th>Correo Electrónico</th>
                  <th>WhatsApp</th>
                  <th>Municipio</th>
                  <th>Buzón de Propuestas</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>
          </div>

          <!-- Cuadro de Archivo Adjunto Seguro -->
          <div style="margin-top: 20px; padding: 16px; background: #ecfdf5; border-left: 4px solid #10b981; border-radius: 8px;">
            <p style="margin: 0; font-size: 14px; font-weight: bold; color: #065f46;">
              📎 Base de Datos Adjunta: <code>${csvFilename}</code>
            </p>
            <p style="margin: 6px 0 0; font-size: 12px; color: #047857; line-height: 1.4;">
              Adjuntamos el archivo <strong>.csv</strong> actualizado con los <strong>${listaCompleta.length} registros del padrón histórico</strong>, listo para descargar y abrir directamente en <strong>Microsoft Excel</strong> o <strong>Google Sheets</strong>.
            </p>
            <p style="margin: 6px 0 0; font-size: 11px; color: #64748b; font-style: italic;">
              🔒 Nota de Privacidad: Por seguridad, la ruta de descarga web pública ha sido deshabilitada por completo. Solo los destinatarios autorizados de esta casilla oficial reciben este archivo.
            </p>
          </div>

          <div style="margin-top: 16px; padding: 12px 16px; background: #e0f2fe; border-left: 4px solid #00AEEF; border-radius: 6px;">
            <p style="margin: 0; font-size: 13px; color: #0369a1;">
              <strong>Padrón Histórico Acumulado:</strong> ${totalHistorico} personas registradas en total.
            </p>
          </div>
        </div>

        <div class="footer">
          <p style="margin: 0;">Partido Político SOMOS Jujuy · Padrón Digital Comunitario</p>
          <p style="margin: 4px 0 0; color: #94a3b8;">Este reporte con archivo adjunto se genera automáticamente una vez al día cuando se registra gente nueva.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await transporter.sendMail({
      from: `"SOMOS Jujuy" <${process.env.SMTP_USER}>`,
      to: recipient,
      subject: `📢 Resumen Diario SOMOS Jujuy: ${afiliadosHoy.length} nuevo(s) inscripto(s) hoy (${dateStr})`,
      html,
      attachments: [
        {
          filename: csvFilename,
          content: csvAttachmentContent,
          contentType: 'text/csv; charset=utf-8',
        },
      ],
    });

    console.log(`[Notificador Diario] Correo enviado exitosamente a ${recipient} con ${afiliadosHoy.length} inscriptos y archivo ${csvFilename} adjunto.`);
    return {
      success: true,
      configured: true,
      message: `Correo enviado a ${recipient} con ${afiliadosHoy.length} inscriptos del día y archivo .csv adjunto.`,
    };
  } catch (err) {
    console.error('[Notificador Diario] Error enviando correo:', err);
    return {
      success: false,
      configured: true,
      message: `Error al conectar con servidor de correo: ${(err as Error)?.message || err}`,
    };
  }
}
