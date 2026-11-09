# Guía Definitiva: Base de Datos y Despliegue en Hostinger VPS — SOMOS Jujuy

Esta guía detalla exactamente **cómo se guardan los datos de las personas que se afilian**, cómo acceder a sus **teléfonos para contactarlas**, y cómo desplegar la plataforma en tu **VPS de Hostinger**.

---

## 1. ¿Cómo se guardan los datos para contactar a la gente?

Cada vez que un vecino o vecina entra a la web y genera su credencial oficial, el servidor guarda automáticamente:
- **Nombre y Apellido**
- **Municipio / Barrio** (San Salvador, Palpalá, San Pedro, Tilcara, etc.)
- **Teléfono / WhatsApp** (Opcional, para avisos y convocatorias)
- **Correo Electrónico (Email)** (Obligatorio, para coordinar la firma de afiliación en papel)
- **Área de Acción / Militancia** (Opcional, por defecto "Solo Adhesión Ciudadana")
- **Número Único de Credencial** (ej: `SOMOS-JUJ-0101`, correlativo y no repetible)
- **Fecha y Hora de Registro**

### Las 2 formas de almacenar en tu VPS de Hostinger:

Tu aplicación está programada con un **sistema dual inteligente**:

1. **Opción A — Almacenamiento Local en Disco (Ya listo, sin configurar nada extra):**
   - En un VPS de Hostinger, el disco duro es **100% permanente** (no es como las plataformas gratuitas que borran archivos al reiniciarse).
   - Los datos se guardan en el archivo `/data/afiliaciones.json` dentro del servidor.
   - Cada nuevo registro se agrega al instante y persiste para siempre.
   
2. **Opción B — Base de Datos Relacional PostgreSQL (En el mismo VPS):**
   - Si prefieres un motor SQL tradicional, puedes instalar PostgreSQL en el mismo VPS con un comando (`sudo apt install postgresql`).
   - Configuras la variable `DATABASE_URL` en tu archivo `.env`.
   - La aplicación detecta PostgreSQL automáticamente y crea la tabla `afiliados` y la secuencia numérica correlativa.
   - **Ventaja de seguridad:** Si PostgreSQL sufriera alguna caída temporal, el servidor conmuta automáticamente al archivo JSON para que ningún vecino se quede sin poder registrarse.

---

## 2. ¿Cómo recibir los datos y contactar a las personas?

Hay **3 maneras sencillas y directas**:

### A) Por Correo Electrónico Diario Automático (El método principal)
- Todos los días a las **21:00 hs (hora Jujuy/Argentina)**, el servidor verifica si hubo nuevos inscriptos.
- **Si hubo registros ese día**, envía automáticamente un correo a **`partidosomosjujuy@gmail.com`** con:
  - Una tabla con: **Nombre y Apellido**, **Email**, **WhatsApp / Teléfono**, **Municipio / Barrio**, **Área de Acción**, y **Número de Credencial**.
  - Total histórico acumulado de adherentes.
- Si un día no se registró nadie, no envía correos innecesarios.

### B) Descarga directa de Planilla Excel / CSV (Sin panel público)
- Puedes descargar en cualquier momento la lista completa en formato compatible con Excel o Google Sheets accediendo a:
  `https://tudominio.com/api/afiliaciones/csv`
- Se descargará un archivo `.csv` con todas las columnas (`NumeroAfiliado`, `Nombre`, `Municipio`, `AreaAccion`, `Telefono`, `Email`, `FechaRegistro`) para imprimir las fichas o coordinar las firmas.

### C) Archivo físico permanente en el VPS
- El archivo se guarda en el disco del VPS en:
  ```bash
  cat /var/www/somos-jujuy/data/afiliaciones.json
  ```

---

## 3. Paso a Paso: Instalación en Hostinger VPS (Ubuntu / Debian)

### Paso 1: Conectarte por SSH a tu VPS de Hostinger
Abre tu terminal (o PuTTY en Windows) y conéctate con la IP provista por Hostinger:
```bash
ssh root@TU_IP_DE_HOSTINGER
```

### Paso 2: Instalar Node.js 22 y Git
Ejecuta estos comandos en tu VPS:
```bash
# Actualizar repositorios
sudo apt update && sudo apt upgrade -y

# Instalar Node.js 22 (LTS moderna)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs git nginx

# Verificar versiones
node -v
npm -v
```

### Paso 3: Clonar el proyecto desde GitHub
```bash
# Crear directorio web
sudo mkdir -p /var/www
cd /var/www

# Clonar el repositorio
git clone https://github.com/jujuycasaesquinalibertad/pagina-de-somos.git somos-jujuy
cd somos-jujuy

# Instalar dependencias y compilar
npm install
npm run build
```

### Paso 4: Configurar variables de entorno (`.env`)
Crea el archivo `.env` en la raíz del proyecto:
```bash
nano .env
```
Pega lo siguiente:
```env
PORT=3000
NODE_ENV=production
ADMIN_PIN=somos2026

# Notificaciones Diarias Automáticas
NOTIFICATION_EMAIL=partidosomosjujuy@gmail.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=partidosomosjujuy@gmail.com
SMTP_PASS=tu_clave_de_aplicacion_google

# Si usas PostgreSQL en el VPS, descomenta y pon tu clave:
# DATABASE_URL=postgres://usuario:contraseña@localhost:5432/somos_db
```

#### ¿Cómo obtener la `SMTP_PASS` para partidosomosjujuy@gmail.com?
1. Entra a [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords) con la cuenta `partidosomosjujuy@gmail.com`.
2. Escribe de nombre "SOMOS Web VPS" y presiona **Crear**.
3. Google te dará una clave de 16 letras (ejemplo: `abcd efgh ijkl mnop`). Esa es tu `SMTP_PASS`.
4. El servidor usará esa clave para enviar el resumen diario a las 21:00 hs automáticamente cada vez que haya inscriptos.
*(Guarda con `Ctrl + O` y sal con `Ctrl + X`)*.

### Paso 5: Instalar PM2 para que la web funcione 24/7
PM2 mantiene la aplicación viva en segundo plano y la reinicia automáticamente si el servidor se reinicia:
```bash
# Instalar PM2 globalmente
sudo npm install -g pm2

# Iniciar la plataforma de SOMOS Jujuy
pm2 start server.ts --name "somos-jujuy" --interpreter="node"

# Configurar PM2 para que inicie automáticamente tras reinicios del VPS
pm2 startup
pm2 save
```

### Paso 6: Configurar Nginx y Dominio Propio
Para que la web responda en tu dominio (ej: `somosjujuy.org` o `www.somosjujuy.com`):
```bash
sudo nano /etc/nginx/sites-available/somos-jujuy
```
Pega esta configuración:
```nginx
server {
    listen 80;
    server_name tudominio.com www.tudominio.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```
Habilita el sitio y reinicia Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/somos-jujuy /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Paso 7: Activar Certificado SSL Gratuito (HTTPS Seguro)
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d tudominio.com -d www.tudominio.com
```
¡Listo! Tu web tendrá el candado verde HTTPS oficial.

---

## 4. (Opcional) Si quieres instalar PostgreSQL en el VPS

Si prefieres usar una base de datos PostgreSQL en lugar del JSON:
```bash
# Instalar PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Entrar como usuario postgres
sudo -u postgres psql

# Crear la base de datos y usuario dentro de PostgreSQL:
CREATE DATABASE somos_db;
CREATE USER somos_user WITH ENCRYPTED PASSWORD 'TuPasswordSeguro123';
GRANT ALL PRIVILEGES ON DATABASE somos_db TO somos_user;
\q
```
Luego en tu `.env`:
```env
DATABASE_URL=postgres://somos_user:TuPasswordSeguro123@localhost:5432/somos_db
```
Y reinicias la aplicación:
```bash
pm2 restart somos-jujuy
```
El servidor detectará PostgreSQL y creará las tablas y secuencias automáticamente.

---

## 5. Respaldo Automático (Backup Diario de Contactos)

Para que nunca pierdas los teléfonos de la gente registrada, puedes programar un respaldo diario automático en tu VPS:
```bash
crontab -e
```
Agrega al final esta línea (hace una copia de seguridad todos los días a las 3:00 AM):
```cron
0 3 * * * cp /var/www/somos-jujuy/data/afiliaciones.json /var/backups/afiliaciones_$(date +\%F).json
```
Así siempre tendrás una copia histórica de todos los militantes y afiliados de SOMOS Jujuy.
