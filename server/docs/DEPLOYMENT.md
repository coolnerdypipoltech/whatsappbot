# Deployment Guide - DigitalOcean

## 📦 Opción 1: App Platform (Recomendado)

### Ventajas
- Deploy automático desde Git
- Escalado automático
- Base de datos managed
- SSL automático
- Monitoreo incluido

### Pasos

1. **Crear App en DigitalOcean**
   ```bash
   # Desde el panel de DigitalOcean
   Apps → Create App → GitHub (conectar repo)
   ```

2. **Configurar App**
   - Name: `whatsapp-ticket-bot`
   - Region: `New York` (o la más cercana)
   - Branch: `main`
   - Source Directory: `/server`
   - Build Command: `npm install`
   - Run Command: `npm start`

3. **Agregar Database**
   - Component Type: `Database`
   - Engine: `PostgreSQL 14`
   - Plan: `Basic ($7/mo)`
   - La variable `DATABASE_URL` se auto-configura

4. **Variables de Entorno**
   ```
   NODE_ENV=production
   PORT=8080
   WHATSAPP_API_URL=https://graph.facebook.com/v18.0
   WHATSAPP_PHONE_NUMBER_ID=<tu_valor>
   WHATSAPP_ACCESS_TOKEN=<tu_valor>
   WHATSAPP_WEBHOOK_VERIFY_TOKEN=<tu_valor>
   OPENAI_API_KEY=<tu_valor>
   ```

5. **Deploy**
   - Click "Create Resources"
   - Esperar deploy (3-5 min)
   - URL pública: `https://whatsapp-ticket-bot-xxxxx.ondigitalocean.app`

6. **Configurar Webhook en Meta**
   - URL: `https://tu-app.ondigitalocean.app/api/webhook`
   - Verify Token: El de tu `.env`

### Costos Estimados
- App Basic: $5/mo
- Database Basic: $7/mo
- **Total: ~$12/mo**

---

## 🖥️ Opción 2: Droplet (VPS Manual)

### Ventajas
- Más control
- Más barato a largo plazo
- Puede alojar múltiples servicios

### Pasos

#### 1. Crear Droplet

```bash
# Desde panel DigitalOcean
Create → Droplets
- Ubuntu 22.04 LTS
- Basic Plan - $6/mo (1GB RAM)
- Datacenter: Closest to your users
- Add SSH key
```

#### 2. Conectar y Configurar

```bash
# SSH al droplet
ssh root@your_droplet_ip

# Actualizar sistema
apt update && apt upgrade -y

# Instalar Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Instalar PostgreSQL
apt install postgresql postgresql-contrib -y

# Instalar Nginx
apt install nginx -y

# Instalar PM2 (process manager)
npm install -g pm2
```

#### 3. Configurar PostgreSQL

```bash
# Entrar a PostgreSQL
sudo -u postgres psql

# Crear base de datos y usuario
CREATE DATABASE whatsapp_bot;
CREATE USER bot_user WITH PASSWORD 'secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE whatsapp_bot TO bot_user;
\q

# Editar pg_hba.conf para permitir conexiones locales
sudo nano /etc/postgresql/14/main/pg_hba.conf
# Cambiar: peer → md5 para conexiones locales
sudo systemctl restart postgresql
```

#### 4. Clonar y Configurar App

```bash
# Crear usuario no-root
adduser nodeapp
usermod -aG sudo nodeapp
su - nodeapp

# Clonar proyecto
cd ~
git clone <tu_repo_url> whatsapp-bot
cd whatsapp-bot/server

# Instalar dependencias
npm install --production

# Crear archivo .env
nano .env
# Pegar configuración...

# Ejecutar migraciones
npm run db:migrate
```

#### 5. Configurar PM2

```bash
# Iniciar app con PM2
pm2 start src/index.js --name whatsapp-bot

# Auto-restart en reboot
pm2 startup
# Copiar y ejecutar el comando que muestra

pm2 save

# Ver logs
pm2 logs whatsapp-bot

# Monitoreo
pm2 monit
```

#### 6. Configurar Nginx

```bash
# Crear configuración
sudo nano /etc/nginx/sites-available/whatsapp-bot

# Pegar:
server {
    listen 80;
    server_name your_domain.com;  # O IP del droplet

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}

# Activar sitio
sudo ln -s /etc/nginx/sites-available/whatsapp-bot /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### 7. SSL con Let's Encrypt (Opcional pero recomendado)

```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtener certificado (requiere dominio)
sudo certbot --nginx -d your_domain.com

# Auto-renovación
sudo certbot renew --dry-run
```

#### 8. Firewall

```bash
# Configurar UFW
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

### Costos Estimados
- Droplet Basic: $6/mo
- **Total: $6/mo** (+ dominio opcional $12/año)

---

## 🔍 Verificación Post-Deploy

```bash
# Verificar que el servidor responde
curl http://your_domain/health

# Debería retornar:
# {"status":"ok","timestamp":"...","service":"whatsapp-ticket-bot"}

# Verificar webhook
curl -X GET "http://your_domain/api/webhook?hub.mode=subscribe&hub.verify_token=tu_token&hub.challenge=test"

# Debería retornar: test
```

---

## 📊 Monitoreo y Mantenimiento

### PM2 Commands

```bash
pm2 status                  # Ver estado
pm2 logs whatsapp-bot       # Ver logs en tiempo real
pm2 restart whatsapp-bot    # Reiniciar
pm2 stop whatsapp-bot       # Detener
pm2 delete whatsapp-bot     # Eliminar del PM2
```

### Actualizar Código

```bash
cd ~/whatsapp-bot/server
git pull origin main
npm install --production
npm run db:migrate
pm2 restart whatsapp-bot
```

### Backup Database

```bash
# Backup
pg_dump -U bot_user whatsapp_bot > backup_$(date +%Y%m%d).sql

# Restaurar
psql -U bot_user whatsapp_bot < backup_20260119.sql
```

---

## 🚨 Troubleshooting

### App no inicia
```bash
pm2 logs whatsapp-bot --err  # Ver errores
```

### Database connection error
```bash
# Verificar PostgreSQL
sudo systemctl status postgresql

# Verificar DATABASE_URL en .env
```

### Webhook no recibe mensajes
- Verificar URL en Meta Dashboard
- Verificar HTTPS (Meta requiere SSL)
- Revisar logs: `pm2 logs`

### Alto uso de memoria
```bash
# Monitorear
pm2 monit

# Reiniciar si es necesario
pm2 restart whatsapp-bot
```

---

## 📈 Optimizaciones para Producción

1. **Rate Limiting**: Implementar middleware para evitar spam
2. **Redis Cache**: Para estados en memoria y caché
3. **CDN**: Para servir assets estáticos
4. **Load Balancer**: Para múltiples instancias
5. **Monitoring**: Datadog, New Relic, o Sentry
6. **Backups automáticos**: DigitalOcean Backups ($1.20/mo)

---

## 🔐 Seguridad

- ✅ Usar variables de entorno para secretos
- ✅ HTTPS obligatorio en producción
- ✅ Firewall configurado (UFW)
- ✅ PostgreSQL no expuesto públicamente
- ✅ Actualizaciones regulares: `apt update && apt upgrade`
- ✅ SSH con keys, no passwords
- ✅ Fail2ban para protección contra brute force
