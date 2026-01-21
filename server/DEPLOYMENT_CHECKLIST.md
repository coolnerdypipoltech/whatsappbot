# 🚀 Deployment Checklist

Usa este checklist para asegurar un deployment exitoso del WhatsApp Ticket Bot.

## 📋 Pre-Deploy

### ✅ Código y Configuración

- [ ] Código en repositorio Git (GitHub/GitLab/Bitbucket)
- [ ] `.env.example` actualizado con todas las variables
- [ ] `.gitignore` incluye `.env`, `node_modules/`, `*.log`
- [ ] `package.json` tiene todas las dependencias necesarias
- [ ] `README.md` está actualizado
- [ ] Migraciones de base de datos probadas localmente

### ✅ APIs y Credenciales

- [ ] Cuenta de WhatsApp Business creada en Meta for Developers
- [ ] Phone Number ID obtenido
- [ ] Access Token (permanente) generado
- [ ] Webhook Verify Token creado (aleatorio y seguro)
- [ ] API Key de OpenAI obtenida
- [ ] Créditos disponibles en OpenAI (al menos $5)
- [ ] Todas las credenciales guardadas en gestor de contraseñas

### ✅ Testing Local

- [ ] `npm install` ejecutado sin errores
- [ ] Base de datos local creada y migrada
- [ ] Servidor inicia correctamente con `npm run dev`
- [ ] Health endpoint responde: `http://localhost:3000/health`
- [ ] Webhook verification funciona
- [ ] Mensaje de prueba procesado correctamente
- [ ] Logs se generan correctamente

## 🌐 Deploy a Producción

### Opción A: DigitalOcean App Platform

- [ ] Cuenta de DigitalOcean creada
- [ ] Repositorio conectado a DigitalOcean
- [ ] App creada con configuración correcta:
  - [ ] Source Directory: `/server`
  - [ ] Build Command: `npm install`
  - [ ] Run Command: `npm start`
  - [ ] Port: 8080
- [ ] Base de datos PostgreSQL agregada (managed)
- [ ] Variables de entorno configuradas:
  - [ ] `NODE_ENV=production`
  - [ ] `PORT=8080`
  - [ ] `WHATSAPP_API_URL`
  - [ ] `WHATSAPP_PHONE_NUMBER_ID`
  - [ ] `WHATSAPP_ACCESS_TOKEN`
  - [ ] `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
  - [ ] `OPENAI_API_KEY`
  - [ ] `DATABASE_URL` (auto-configurada)
- [ ] Deploy completado exitosamente
- [ ] URL pública obtenida
- [ ] Health check funciona: `https://tu-app.ondigitalocean.app/health`

### Opción B: DigitalOcean Droplet (VPS)

- [ ] Droplet creado (Ubuntu 22.04, mínimo 1GB RAM)
- [ ] SSH configurado con keys (no passwords)
- [ ] Node.js 18+ instalado
- [ ] PostgreSQL instalado y configurado
- [ ] Nginx instalado y configurado como reverse proxy
- [ ] PM2 instalado globalmente
- [ ] Código clonado en el servidor
- [ ] Dependencias instaladas: `npm install --production`
- [ ] Archivo `.env` creado con valores de producción
- [ ] Base de datos creada: `createdb whatsapp_bot`
- [ ] Migraciones ejecutadas: `npm run db:migrate`
- [ ] PM2 iniciado: `pm2 start src/index.js --name whatsapp-bot`
- [ ] PM2 configurado para auto-start: `pm2 startup` y `pm2 save`
- [ ] Firewall configurado (UFW):
  - [ ] SSH permitido
  - [ ] HTTP/HTTPS permitidos
  - [ ] PostgreSQL NO expuesto públicamente
- [ ] SSL/HTTPS configurado (Let's Encrypt)
- [ ] Dominio apuntando al servidor (opcional pero recomendado)

## 🔗 Configuración de WhatsApp

- [ ] Ir a Meta for Developers
- [ ] Seleccionar tu App de WhatsApp Business
- [ ] Ir a WhatsApp → Configuration
- [ ] Click en "Edit" en Webhook
- [ ] Configurar:
  - [ ] Callback URL: `https://tu-dominio.com/api/webhook`
  - [ ] Verify Token: El mismo de tu variable de entorno
- [ ] Click en "Verify and Save"
- [ ] Verificación exitosa (checkmark verde)
- [ ] Suscribirse al campo **messages**
- [ ] Webhook activo y recibiendo eventos

## 🧪 Testing en Producción

- [ ] Health check responde correctamente
  ```bash
  curl https://tu-dominio.com/health
  ```
- [ ] Webhook verification funciona
  ```bash
  curl "https://tu-dominio.com/api/webhook?hub.mode=subscribe&hub.verify_token=TU_TOKEN&hub.challenge=test"
  ```
- [ ] Enviar mensaje de prueba desde WhatsApp
- [ ] Bot responde correctamente
- [ ] Enviar imagen de ticket de prueba
- [ ] Ticket procesado exitosamente
- [ ] Datos guardados en base de datos
- [ ] Logs generándose correctamente

## 📊 Monitoreo

- [ ] PM2 monitoring activo: `pm2 monit` (si usas VPS)
- [ ] Logs accesibles:
  - [ ] App Platform: Ver en dashboard de DigitalOcean
  - [ ] VPS: `pm2 logs whatsapp-bot`
- [ ] Base de datos accesible para consultas
- [ ] Configurar alertas (opcional):
  - [ ] Email en errores críticos
  - [ ] Notificación si app se cae
  - [ ] Monitoreo de uso de APIs

## 🔐 Seguridad Post-Deploy

- [ ] Archivo `.env` NO está en Git
- [ ] Secrets en variables de entorno (no hardcoded)
- [ ] HTTPS habilitado (obligatorio para WhatsApp)
- [ ] Firewall configurado correctamente
- [ ] PostgreSQL solo accesible localmente
- [ ] SSH con keys, passwords deshabilitados (VPS)
- [ ] Fail2ban instalado (opcional, VPS)
- [ ] Backups de base de datos configurados

## 💾 Backups

- [ ] Backup automático de DigitalOcean habilitado (opcional, $1.20/mo)
- [ ] O script de backup manual configurado:
  ```bash
  pg_dump whatsapp_bot > backup_$(date +%Y%m%d).sql
  ```
- [ ] Backups almacenados en ubicación segura
- [ ] Proceso de restauración probado

## 📈 Optimizaciones (Opcional)

- [ ] Rate limiting implementado
- [ ] Redis para caché de estados
- [ ] CDN para assets estáticos
- [ ] Monitoring con Datadog/New Relic/Sentry
- [ ] Logs centralizados (ELK, Papertrail)
- [ ] Alerting configurado

## 📝 Documentación

- [ ] URL de producción documentada
- [ ] Credenciales guardadas de forma segura
- [ ] Procedimiento de rollback documentado
- [ ] Contactos de soporte anotados
- [ ] Runbook de incidentes creado

## 🎯 Go-Live

- [ ] Todos los items anteriores completados
- [ ] Testing en producción exitoso
- [ ] Stakeholders notificados
- [ ] Monitoreo activo
- [ ] On-call configurado (si aplica)

## 🚨 Post-Deploy Inmediato

**Primeras 24 horas:**

- [ ] Revisar logs cada 2-4 horas
- [ ] Monitorear uso de memoria/CPU
- [ ] Verificar que no haya errores repetitivos
- [ ] Confirmar que los tickets se procesan correctamente
- [ ] Verificar costos de APIs (OpenAI, WhatsApp)

**Primera semana:**

- [ ] Revisar logs diariamente
- [ ] Analizar tasa de éxito de OCR
- [ ] Identificar patrones de error comunes
- [ ] Optimizar prompts de IA si es necesario
- [ ] Ajustar mensajes del bot basado en feedback

## 📞 Soporte y Mantenimiento

### Comandos Útiles (VPS)

```bash
# Ver logs en tiempo real
pm2 logs whatsapp-bot

# Reiniciar app
pm2 restart whatsapp-bot

# Ver status
pm2 status

# Monitorear recursos
pm2 monit

# Ver errores recientes
tail -f error.log

# Backup de DB
pg_dump whatsapp_bot > backup.sql

# Actualizar código
git pull
npm install --production
npm run db:migrate
pm2 restart whatsapp-bot
```

### Troubleshooting Común

**Bot no responde:**
- [ ] Verificar PM2/App está corriendo
- [ ] Revisar logs de errores
- [ ] Verificar conexión a DB
- [ ] Verificar credenciales de WhatsApp

**OCR falla:**
- [ ] Verificar créditos de OpenAI
- [ ] Revisar límite de rate en OpenAI
- [ ] Verificar tamaño de imágenes

**Database errors:**
- [ ] Verificar conexión a PostgreSQL
- [ ] Revisar número de conexiones activas
- [ ] Verificar espacio en disco

## ✅ Deployment Completado

Una vez todos los items están marcados:

```
┌─────────────────────────────────────────────┐
│                                             │
│   ✅ Deployment Exitoso!                    │
│                                             │
│   🚀 Bot en producción                      │
│   📊 Monitoreo activo                       │
│   🔐 Seguridad configurada                  │
│   💾 Backups habilitados                    │
│                                             │
│   🎉 Listo para usuarios reales!            │
│                                             │
└─────────────────────────────────────────────┘
```

---

**Fecha de deployment:** _________________

**Deployed by:** _________________

**Production URL:** _________________

**Notas adicionales:**
_________________________________________________
_________________________________________________
_________________________________________________
