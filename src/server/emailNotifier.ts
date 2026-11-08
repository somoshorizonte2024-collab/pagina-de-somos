import nodemailer from 'nodemailer';

export interface AfiliadoReportItem {
  id: string;
  numeroAfiliado: string;
  nombre: string;
  municipio: string;
  areaAccion: string;
  telefono: string;
  email: string;
  fechaRegistro: string;
}

export function isSmtpConfigured(): boolean {
  return Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
}

export async function sendDailySummaryEmail(
  afiliadosHoy: AfiliadoReportItem[],
  dateStr: string,
  totalHistorico: number
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

  const rowsHtml = afiliadosHoy
    .map(
      (a, idx) => `
      <tr style="border-bottom: 1px solid #e2e8f0; background: ${idx % 2 === 0 ? '#f8fafc' : '#ffffff'};">
        <td style="padding: 10px; font-weight: bold; font-family: monospace; color: #EE007C;">${a.numeroAfiliado}</td>
        <td style="padding: 10px; font-weight: bold; color: #0C2340;">${a.nombre}</td>
        <td style="padding: 10px; color: #0284c7; font-weight: 600;">
          <a href="mailto:${a.email}" style="color: #0284c7; text-decoration: none;">${a.email || '(Sin email)'}</a>
        </td>
        <td style="padding: 10px; color: #16a34a; font-family: monospace;">
          ${
            a.telefono
              ? `<a href="https://wa.me/${a.telefono.replace(/\D/g, '')}" style="color: #16a34a; text-decoration: none;">${a.telefono}</a>`
              : '<span style="color: #94a3b8; font-style: italic;">Sin teléfono</span>'
          }
        </td>
        <td style="padding: 10px; color: #334155;">${a.municipio}</td>
        <td style="padding: 10px; color: #64748b; font-size: 12px;">${a.areaAccion || 'General'}</td>
      </tr>
    `
    )
    .join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 20px; background-color: #f1f5f9; }
        .container { max-width: 800px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
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
            Reporte Diario de Afiliaciones y Contactos
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
            Aquí tienes sus correos y teléfonos para <strong>coordinar la firma de la ficha de afiliación en papel</strong>:
          </p>

          <div style="overflow-x: auto;">
            <table>
              <thead>
                <tr>
                  <th>N° Credencial</th>
                  <th>Nombre y Apellido</th>
                  <th>Correo Electrónico</th>
                  <th>WhatsApp</th>
                  <th>Municipio</th>
                  <th>Militancia</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>
          </div>

          <div style="margin-top: 24px; padding: 16px; background: #e0f2fe; border-left: 4px solid #00AEEF; border-radius: 6px;">
            <p style="margin: 0; font-size: 13px; color: #0369a1;">
              <strong>Padrón Histórico Acumulado:</strong> ${totalHistorico} personas registradas en total.
            </p>
          </div>
        </div>

        <div class="footer">
          <p style="margin: 0;">Partido Político SOMOS Jujuy · Padrón Digital Comunitario</p>
          <p style="margin: 4px 0 0; color: #94a3b8;">Este reporte se genera automáticamente una vez al día cuando se registra gente nueva.</p>
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
    });

    console.log(`[Notificador Diario] Correo enviado exitosamente a ${recipient} con ${afiliadosHoy.length} inscriptos.`);
    return {
      success: true,
      configured: true,
      message: `Correo enviado a ${recipient} con ${afiliadosHoy.length} inscriptos del día.`,
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
