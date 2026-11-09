import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { sendDailySummaryEmail, isSmtpConfigured, AfiliadoReportItem } from './src/server/emailNotifier';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Hardening de seguridad HTTP y protección de información del servidor
app.disable('x-powered-by');
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Límite de carga útil JSON para prevenir ataques de denegación de servicio por memoria
app.use(express.json({ limit: '50kb' }));

// Limitador de tasa (Rate Limiting) en memoria para prevenir spam automatizado
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function isRateLimited(ip: string, maxRequests = 10, windowMs = 10 * 60 * 1000): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
    return false;
  }

  if (entry.count >= maxRequests) {
    return true;
  }

  entry.count++;
  return false;
}

// Limpieza periódica de entradas expiradas en el mapa de tasa
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap.entries()) {
    if (now > entry.resetTime) {
      rateLimitMap.delete(ip);
    }
  }
}, 15 * 60 * 1000);

// Helper para sanitizar celdas CSV y prevenir inyección de fórmulas (CSV / Formula Injection)
function sanitizeCsvField(val: string): string {
  const str = String(val || '').replace(/"/g, '""');
  if (/^[=+\-@\t\r]/.test(str)) {
    return `"'${str}"`;
  }
  return `"${str}"`;
}

// Helper para validar PIN de administración en rutas sensibles
function verifyAdminPin(req: express.Request): boolean {
  const pin = req.headers['x-admin-pin'] || req.query.pin || (req.body && req.body.pin);
  const requiredPin = process.env.ADMIN_PIN || 'somos2026';
  return Boolean(pin && pin === requiredPin);
}

// -------------------------------------------------------------
// BASE DE DATOS DUAL: POSTGRESQL (PRODUCCIÓN / CLOUD) + JSON PERSISTENTE (LOCAL)
// -------------------------------------------------------------
import pg from 'pg';
const { Pool } = pg;

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'afiliaciones.json');

// Detección de PostgreSQL: Si existe DATABASE_URL o PGHOST en variables de entorno válida
const hasPostgres = Boolean(process.env.DATABASE_URL || process.env.PGHOST);
let pgPool: pg.Pool | null = null;

if (hasPostgres) {
  try {
    pgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      host: process.env.PGHOST,
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD,
      database: process.env.PGDATABASE,
      port: process.env.PGPORT ? parseInt(process.env.PGPORT, 10) : 5432,
      ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
      connectionTimeoutMillis: 2500,
    });

    pgPool.on('error', (err) => {
      console.warn('[PostgreSQL Pool Warning] Error en cliente inactivo:', err.message);
    });
  } catch (err) {
    console.warn('[Base de Datos] Error instanciando cliente PostgreSQL, usando JSON persistente:', err);
    pgPool = null;
  }
}

// Inicializar esquemas (PostgreSQL o JSON)
async function initDatabase() {
  if (pgPool) {
    try {
      // Probar conexión y crear tabla de afiliados en PostgreSQL y secuencia numérica única
      await pgPool.query(`
        CREATE SEQUENCE IF NOT EXISTS afiliado_seq START WITH 101;

        CREATE TABLE IF NOT EXISTS afiliados (
          id VARCHAR(50) PRIMARY KEY,
          numero_afiliado VARCHAR(50) UNIQUE NOT NULL,
          nombre VARCHAR(255) NOT NULL,
          municipio VARCHAR(255) NOT NULL,
          area_accion VARCHAR(255) DEFAULT 'Solo Adhesión / Participación General',
          telefono VARCHAR(100) DEFAULT '',
          email VARCHAR(255) DEFAULT '',
          fecha_registro TIMESTAMPTZ DEFAULT NOW()
        );

        ALTER TABLE afiliados ADD COLUMN IF NOT EXISTS email VARCHAR(255) DEFAULT '';
      `);
      console.log('[PostgreSQL] Conexión establecida. Esquema y secuencia numérica inicializados con éxito');
      return;
    } catch (err) {
      console.warn('[PostgreSQL] Conexión no disponible o falló inicialización SQL. Conmutando a modo JSON persistente:', (err as Error)?.message || err);
      try {
        await pgPool.end();
      } catch {
        // Silenciar cierre
      }
      pgPool = null;
    }
  }

  // Fallback JSON
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(DB_FILE)) {
    const initialData = {
      lastNumber: 100, // Comienza la numeración oficial en 0101
      afiliados: [
        {
          id: 'SOMOS-JUJ-0100',
          numeroAfiliado: 'SOMOS-JUJ-0100',
          nombre: 'Comisión Promotora Fundacional',
          municipio: 'San Salvador de Jujuy',
          areaAccion: 'Organización Barrial y Territorial',
          telefono: '',
          fechaRegistro: '2026-01-01T00:00:00.000Z',
        },
      ],
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
  }
  console.log('[Base de Datos] Almacenamiento JSON persistente activo en data/afiliaciones.json');
}

function readJsonDatabase() {
  try {
    const content = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error('Error leyendo base de datos JSON:', error);
    return { lastNumber: 100, afiliados: [] };
  }
}

function writeJsonDatabase(data: unknown) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error guardando en base de datos JSON:', error);
  }
}

// -------------------------------------------------------------
// ENDPOINTS DE LA API DE AFILIACIONES Y CARNETS
// -------------------------------------------------------------

// 1. POST /api/afiliaciones - Registro y asignación de número único no repetible
app.post('/api/afiliaciones', async (req, res) => {
  try {
    // Control de tasa por dirección IP (anti-spam / anti-bot)
    const clientIp = req.headers['x-forwarded-for']?.toString().split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
    if (isRateLimited(clientIp, 10, 10 * 60 * 1000)) {
      return res.status(429).json({ error: 'Demasiadas solicitudes de registro desde esta conexión. Por favor espere unos minutos.' });
    }

    const { nombre, municipio, areaAccion, telefono, email } = req.body;

    if (!nombre || !municipio || !email) {
      return res.status(400).json({ error: 'Nombre, municipio y correo electrónico son requeridos' });
    }

    const cleanNombre = String(nombre).trim();
    const cleanMunicipio = String(municipio).trim();
    const cleanArea = String(areaAccion || 'Solo Adhesión Ciudadana (General)').trim();
    const cleanTel = String(telefono || '').trim();
    const cleanEmail = String(email || '').trim().toLowerCase();

    // Validación de longitudes para evitar desbordes o inyecciones masivas
    if (cleanNombre.length < 2 || cleanNombre.length > 80) {
      return res.status(400).json({ error: 'El nombre debe tener entre 2 y 80 caracteres' });
    }
    if (cleanMunicipio.length < 2 || cleanMunicipio.length > 80) {
      return res.status(400).json({ error: 'El municipio debe tener entre 2 y 80 caracteres' });
    }
    if (cleanArea.length > 100) {
      return res.status(400).json({ error: 'Área de acción demasiado extensa' });
    }

    // Validación estricta de formato de correo electrónico
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (cleanEmail.length > 120 || !emailRegex.test(cleanEmail)) {
      return res.status(400).json({ error: 'Por favor ingrese un correo electrónico válido' });
    }

    // Validación de teléfono si fue proporcionado (opcional)
    if (cleanTel) {
      if (cleanTel.length > 30 || !/^[0-9+\s().-]{6,30}$/.test(cleanTel)) {
        return res.status(400).json({ error: 'Formato de teléfono o WhatsApp inválido' });
      }
    }

    // Si PostgreSQL está activo:
    if (pgPool) {
      try {
        const seqRes = await pgPool.query("SELECT nextval('afiliado_seq') as num");
        const nextNum = seqRes.rows[0].num;
        const formattedNum = String(nextNum).padStart(4, '0');
        const numeroAfiliado = `SOMOS-JUJ-${formattedNum}`;

        const insertRes = await pgPool.query(
          `INSERT INTO afiliados (id, numero_afiliado, nombre, municipio, area_accion, telefono, email, fecha_registro)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
           RETURNING id, numero_afiliado as "numeroAfiliado", nombre, municipio, area_accion as "areaAccion", telefono, email, fecha_registro as "fechaRegistro"`,
          [numeroAfiliado, numeroAfiliado, cleanNombre, cleanMunicipio, cleanArea, cleanTel, cleanEmail]
        );

        const countRes = await pgPool.query('SELECT count(*) as total FROM afiliados');
        const totalAfiliados = parseInt(countRes.rows[0].total, 10);

        const nuevoAfiliado = insertRes.rows[0];
        console.log(`[Afiliación PostgreSQL] ${numeroAfiliado} - ${cleanNombre} (${cleanMunicipio}) - Email: ${cleanEmail}`);

        return res.status(201).json({
          success: true,
          afiliado: nuevoAfiliado,
          totalAfiliados,
          engine: 'postgresql',
        });
      } catch (sqlErr) {
        console.warn('[PostgreSQL Error] Falló query en afiliaciones, usando fallback JSON:', (sqlErr as Error)?.message || sqlErr);
      }
    }

    // Almacenamiento JSON persistente
    const db = readJsonDatabase();
    db.lastNumber = (Number(db.lastNumber) || 100) + 1;

    // Formato de numeración oficial estricto: SOMOS-JUJ-0101, SOMOS-JUJ-0102, ...
    const formattedNum = String(db.lastNumber).padStart(4, '0');
    const numeroAfiliado = `SOMOS-JUJ-${formattedNum}`;

    const nuevoAfiliado = {
      id: numeroAfiliado,
      numeroAfiliado,
      nombre: cleanNombre,
      municipio: cleanMunicipio,
      areaAccion: cleanArea,
      telefono: cleanTel,
      email: cleanEmail,
      fechaRegistro: new Date().toISOString(),
    };

    if (!Array.isArray(db.afiliados)) {
      db.afiliados = [];
    }
    db.afiliados.push(nuevoAfiliado);
    writeJsonDatabase(db);

    console.log(`[Afiliación JSON] ${numeroAfiliado} - ${nuevoAfiliado.nombre} (${nuevoAfiliado.municipio}) - Email: ${cleanEmail}`);

    return res.status(201).json({
      success: true,
      afiliado: nuevoAfiliado,
      totalAfiliados: db.afiliados.length,
      engine: 'json',
    });
  } catch (error) {
    console.error('Error en POST /api/afiliaciones:', error);
    return res.status(500).json({ error: 'Error interno del servidor al procesar afiliación' });
  }
});

// 2. GET /api/afiliaciones/stats - Estadísticas de afiliaciones
app.get('/api/afiliaciones/stats', async (req, res) => {
  try {
    if (pgPool) {
      try {
        const countRes = await pgPool.query('SELECT count(*) as total FROM afiliados');
        const total = parseInt(countRes.rows[0].total, 10);

        const maxRes = await pgPool.query('SELECT numero_afiliado FROM afiliados ORDER BY fecha_registro DESC LIMIT 1');
        const ultimoNumero = maxRes.rows[0]?.numero_afiliado || 'SOMOS-JUJ-0100';

        const groupRes = await pgPool.query('SELECT municipio, count(*) as count FROM afiliados GROUP BY municipio');
        const porMunicipio: Record<string, number> = {};
        groupRes.rows.forEach((r: { municipio: string; count: string }) => {
          porMunicipio[r.municipio] = parseInt(r.count, 10);
        });

        return res.json({
          total,
          ultimoNumero,
          porMunicipio,
          engine: 'postgresql',
        });
      } catch (sqlErr) {
        console.warn('[PostgreSQL Error] Falló query en stats, usando fallback JSON:', (sqlErr as Error)?.message || sqlErr);
      }
    }

    const db = readJsonDatabase();
    const porMunicipio: Record<string, number> = {};
    const afiliados = Array.isArray(db.afiliados) ? db.afiliados : [];

    afiliados.forEach((af: { municipio: string }) => {
      const mun = af.municipio || 'Otros';
      porMunicipio[mun] = (porMunicipio[mun] || 0) + 1;
    });

    return res.json({
      total: afiliados.length,
      ultimoNumero: `SOMOS-JUJ-${String(db.lastNumber || 100).padStart(4, '0')}`,
      porMunicipio,
      engine: 'json',
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    return res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

// 3. GET /api/afiliaciones/validar/:numero - Validación pública de credenciales (con sanitización de entrada)
app.get('/api/afiliaciones/validar/:numero', async (req, res) => {
  try {
    const { numero } = req.params;
    const cleanNumero = String(numero || '').trim();

    // Validación estricta del identificador de carnet (previene inyecciones o parámetros maliciosos)
    if (!cleanNumero || !/^[A-Za-z0-9\-]{3,35}$/.test(cleanNumero)) {
      return res.status(400).json({ valid: false, message: 'Formato de credencial inválido' });
    }

    if (pgPool) {
      try {
        const findRes = await pgPool.query(
          'SELECT id, numero_afiliado as "numeroAfiliado", nombre, municipio, area_accion as "areaAccion", fecha_registro as "fechaRegistro" FROM afiliados WHERE UPPER(numero_afiliado) = UPPER($1)',
          [cleanNumero]
        );

        if (findRes.rows.length === 0) {
          return res.status(404).json({ valid: false, message: 'Carnet no encontrado en el padrón' });
        }

        const row = findRes.rows[0];
        // Solo expone datos no sensibles para validación de la credencial
        return res.json({
          valid: true,
          numeroAfiliado: row.numeroAfiliado,
          nombre: row.nombre,
          municipio: row.municipio,
          areaAccion: row.areaAccion,
          fechaRegistro: row.fechaRegistro,
        });
      } catch (sqlErr) {
        console.warn('[PostgreSQL Error] Falló query en validar, usando fallback JSON:', (sqlErr as Error)?.message || sqlErr);
      }
    }

    const db = readJsonDatabase();
    const afiliados = Array.isArray(db.afiliados) ? db.afiliados : [];
    const encontrado = afiliados.find(
      (af: { numeroAfiliado: string }) => af.numeroAfiliado?.toUpperCase() === cleanNumero.toUpperCase()
    );

    if (!encontrado) {
      return res.status(404).json({ valid: false, message: 'Carnet no encontrado en el padrón' });
    }

    return res.json({
      valid: true,
      numeroAfiliado: encontrado.numeroAfiliado,
      nombre: encontrado.nombre,
      municipio: encontrado.municipio,
      areaAccion: encontrado.areaAccion,
      fechaRegistro: encontrado.fechaRegistro,
    });
  } catch (error) {
    console.error('Error al validar credencial:', error);
    return res.status(500).json({ error: 'Error al validar credencial' });
  }
});

// 4. GET /api/afiliaciones/csv - Exportación de padrón para el partido (Protegido por PIN de Administración y sanitizado contra inyección CSV)
app.get('/api/afiliaciones/csv', async (req, res) => {
  try {
    if (!verifyAdminPin(req)) {
      return res.status(401).json({
        error: 'Acceso no autorizado. Se requiere PIN de administración (?pin= o header x-admin-pin).',
      });
    }

    let csv = 'NumeroAfiliado,Nombre,Municipio,AreaAccion,Telefono,Email,FechaRegistro\n';

    if (pgPool) {
      try {
        const allRes = await pgPool.query('SELECT numero_afiliado, nombre, municipio, area_accion, telefono, email, fecha_registro FROM afiliados ORDER BY fecha_registro ASC');
        allRes.rows.forEach((af: { numero_afiliado: string; nombre: string; municipio: string; area_accion: string; telefono: string; email?: string; fecha_registro: string }) => {
          const cleanName = sanitizeCsvField(af.nombre);
          const cleanMun = sanitizeCsvField(af.municipio);
          const cleanArea = sanitizeCsvField(af.area_accion);
          const cleanTel = sanitizeCsvField(af.telefono);
          const cleanMail = sanitizeCsvField(af.email || '');
          csv += `${af.numero_afiliado},${cleanName},${cleanMun},${cleanArea},${cleanTel},${cleanMail},${af.fecha_registro}\n`;
        });

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="Padron_Afiliados_SOMOS_Jujuy.csv"');
        return res.send(csv);
      } catch (sqlErr) {
        console.warn('[PostgreSQL Error] Falló query en csv, usando fallback JSON:', (sqlErr as Error)?.message || sqlErr);
      }
    }

    const db = readJsonDatabase();
    const afiliados = Array.isArray(db.afiliados) ? db.afiliados : [];
    afiliados.forEach((af: { numeroAfiliado: string; nombre: string; municipio: string; areaAccion: string; telefono: string; email?: string; fechaRegistro: string }) => {
      const cleanName = sanitizeCsvField(af.nombre);
      const cleanMun = sanitizeCsvField(af.municipio);
      const cleanArea = sanitizeCsvField(af.areaAccion);
      const cleanTel = sanitizeCsvField(af.telefono);
      const cleanMail = sanitizeCsvField(af.email || '');
      csv += `${af.numeroAfiliado},${cleanName},${cleanMun},${cleanArea},${cleanTel},${cleanMail},${af.fechaRegistro}\n`;
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="Padron_Afiliados_SOMOS_Jujuy.csv"');
    return res.send(csv);
  } catch (error) {
    console.error('Error exportando CSV:', error);
    return res.status(500).json({ error: 'Error exportando CSV' });
  }
});

// 5. GET /api/afiliaciones/list - Lista de contactos protegida por PIN
app.get('/api/afiliaciones/list', async (req, res) => {
  try {
    if (!verifyAdminPin(req)) {
      return res.status(401).json({ error: 'Acceso no autorizado. Se requiere PIN de administración.' });
    }

    if (pgPool) {
      try {
        const allRes = await pgPool.query(
          'SELECT id, numero_afiliado as "numeroAfiliado", nombre, municipio, area_accion as "areaAccion", telefono, email, fecha_registro as "fechaRegistro" FROM afiliados ORDER BY fecha_registro DESC'
        );
        return res.json({
          success: true,
          total: allRes.rows.length,
          afiliados: allRes.rows,
          engine: 'postgresql',
        });
      } catch (sqlErr) {
        console.warn('[PostgreSQL Error] Falló query en list, usando fallback JSON:', (sqlErr as Error)?.message || sqlErr);
      }
    }

    const db = readJsonDatabase();
    const afiliados = Array.isArray(db.afiliados) ? [...db.afiliados] : [];
    afiliados.sort((a, b) => new Date(b.fechaRegistro || 0).getTime() - new Date(a.fechaRegistro || 0).getTime());

    return res.json({
      success: true,
      total: afiliados.length,
      afiliados,
      engine: 'json',
    });
  } catch (error) {
    console.error('Error listando afiliados:', error);
    return res.status(500).json({ error: 'Error al listar contactos' });
  }
});

// 6. GET /validar/:numero - Redirección amigable para escaneo de código QR
app.get('/validar/:numero', (req, res) => {
  res.redirect(`/?validar=${encodeURIComponent(req.params.numero)}`);
});

// -------------------------------------------------------------
// SERVICIO DE NOTIFICACIÓN DIARIA POR CORREO ELECTRÓNICO
// Envía un email al partido (partidosomosjujuy@gmail.com)
// una vez al día cuando se haya registrado gente ese día.
// -------------------------------------------------------------

async function getAllAfiliadosForReport(): Promise<AfiliadoReportItem[]> {
  if (pgPool) {
    try {
      const res = await pgPool.query(
        'SELECT id, numero_afiliado as "numeroAfiliado", nombre, municipio, area_accion as "areaAccion", telefono, email, fecha_registro as "fechaRegistro" FROM afiliados ORDER BY fecha_registro ASC'
      );
      return res.rows;
    } catch (err) {
      console.warn('[PostgreSQL Report Warning] Falló query en reporte, usando fallback JSON:', err);
    }
  }

  const db = readJsonDatabase();
  return Array.isArray(db.afiliados) ? db.afiliados : [];
}

async function triggerDailyReport(forceSend = false): Promise<{ success: boolean; configured: boolean; message: string; count: number }> {
  try {
    const todos = await getAllAfiliadosForReport();
    const now = new Date();
    // Fecha local en formato YYYY-MM-DD
    const todayStr = now.toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Jujuy' });

    const db = readJsonDatabase();
    if (!forceSend && db.lastDailyReportDate === todayStr) {
      return {
        success: true,
        configured: isSmtpConfigured(),
        message: `El reporte diario de hoy (${todayStr}) ya fue enviado previamente.`,
        count: 0,
      };
    }

    // Filtrar inscriptos del día
    const inscriptosHoy = todos.filter((a) => {
      if (!a.fechaRegistro) return false;
      const regDate = new Date(a.fechaRegistro).toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Jujuy' });
      return regDate === todayStr;
    });

    if (inscriptosHoy.length === 0 && !forceSend) {
      console.log(`[Notificador Diario] No hubo nuevos inscriptos hoy (${todayStr}). No se envía correo.`);
      return {
        success: true,
        configured: isSmtpConfigured(),
        message: `No hubo nuevos inscriptos hoy (${todayStr}). No se envía correo.`,
        count: 0,
      };
    }

    // Si es forzado y no hay de hoy, tomar los últimos registrados como muestra
    const listToSend = inscriptosHoy.length > 0 ? inscriptosHoy : todos.slice(-5);

    const emailResult = await sendDailySummaryEmail(listToSend, todayStr, todos.length);

    if (emailResult.success) {
      db.lastDailyReportDate = todayStr;
      writeJsonDatabase(db);
    }

    return {
      success: emailResult.success,
      configured: emailResult.configured,
      message: emailResult.message,
      count: listToSend.length,
    };
  } catch (error) {
    console.error('[Notificador Diario] Error en triggerDailyReport:', error);
    return {
      success: false,
      configured: isSmtpConfigured(),
      message: `Error al procesar reporte: ${(error as Error)?.message || error}`,
      count: 0,
    };
  }
}

// 7. POST /api/afiliaciones/enviar-resumen-diario - Forzar o probar envío del resumen diario (Protegido por PIN)
app.post('/api/afiliaciones/enviar-resumen-diario', async (req, res) => {
  if (!verifyAdminPin(req)) {
    return res.status(401).json({ error: 'Acceso no autorizado. Se requiere PIN de administración.' });
  }

  const result = await triggerDailyReport(true);
  return res.json(result);
});

// 8. GET /api/afiliaciones/smtp-status - Estado de configuración del correo (Protegido por PIN)
app.get('/api/afiliaciones/smtp-status', (req, res) => {
  if (!verifyAdminPin(req)) {
    return res.status(401).json({ error: 'Acceso no autorizado. Se requiere PIN de administración.' });
  }

  return res.json({
    configured: isSmtpConfigured(),
    recipient: process.env.NOTIFICATION_EMAIL || 'partidosomosjujuy@gmail.com',
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
  });
});

// -------------------------------------------------------------
// VITE MIDDLEWARE EN DESARROLLO / SERVICIO ESTÁTICO EN PRODUCCIÓN
// -------------------------------------------------------------
async function startServer() {
  await initDatabase();
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  // Tarea programada en segundo plano: verificar cada 30 minutos
  // Si son las 21:00 hs o más en Jujuy y hubo gente registrada hoy, envía el resumen automáticamente
  setInterval(async () => {
    try {
      const jujuyHour = parseInt(
        new Intl.DateTimeFormat('en-US', {
          timeZone: 'America/Argentina/Jujuy',
          hour: 'numeric',
          hour12: false,
        }).format(new Date()),
        10
      );

      // Enviar reporte al final de la jornada (a partir de las 21:00 hs)
      if (jujuyHour >= 21) {
        await triggerDailyReport(false);
      }
    } catch (err) {
      console.warn('[Scheduler Error]', err);
    }
  }, 30 * 60 * 1000);

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Servidor SOMOS Jujuy] Escuchando en http://localhost:${PORT}`);
    console.log(`[Notificador Diario] Configurado para enviar resumen a ${process.env.NOTIFICATION_EMAIL || 'partidosomosjujuy@gmail.com'} una vez al día si hay registros.`);
  });
}

startServer();
