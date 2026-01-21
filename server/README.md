# 📱 WhatsApp Ticket Bot

> Sistema profesional de procesamiento de tickets de compra mediante WhatsApp Business API, con OCR e IA.

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-blue.svg)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Bot de WhatsApp Business que recibe fotos de tickets de compra, extrae información mediante OCR e IA, y mantiene una conversación inteligente con máquina de estados persistente.

## ✨ Características

- 🔗 **Webhook oficial de WhatsApp Cloud API** - Integración directa con Meta
- 🎭 **Máquina de estados persistente** - Estado por usuario en PostgreSQL
- 👁️ **OCR avanzado** - Extracción de texto con OpenAI Vision (GPT-4o)
- 🤖 **Normalización con IA** - Estructuración de datos con GPT-4
- 💾 **Base de datos PostgreSQL** - Persistencia robusta y escalable
- 🏗️ **Arquitectura modular** - Separación de responsabilidades clara
- 🛡️ **Manejo robusto de errores** - Error handling en todas las capas
- 📊 **Logging estructurado** - Winston con múltiples niveles
- 🚀 **Production-ready** - Listo para DigitalOcean

## 📋 Tabla de Contenidos

- [Requisitos](#-requisitos)
- [Instalación](#-instalación)
- [Configuración](#️-configuración)
- [Uso](#-uso)
- [Arquitectura](#-arquitectura)
- [Despliegue](#-despliegue)
- [Documentación](#-documentación)
- [Contribuir](#-contribuir)
- [Licencia](#-licencia)

## 📋 Requisitos

### Software Requerido

| Software    | Versión | Propósito                           |
|-------------|---------|-------------------------------------|
| Node.js     | 18+     | Runtime del servidor                |
| PostgreSQL  | 14+     | Base de datos                       |
| npm         | 9+      | Gestor de paquetes                  |

### APIs Externas

- **WhatsApp Business API** - Cuenta en [Meta for Developers](https://developers.facebook.com)
- **OpenAI API** - API key de [OpenAI Platform](https://platform.openai.com)

## 🔧 Instalación

### 1. Clonar el repositorio

```bash
cd server
npm install
```

### 2. Configurar variables de entorno

Copia el archivo de ejemplo y configura tus credenciales:

```bash
cp .env.example .env
```

Edita `.env` con tus valores reales:

```env
# Server
PORT=3000
NODE_ENV=production

# WhatsApp Cloud API (obtener de Meta for Developers)
WHATSAPP_API_URL=https://graph.facebook.com/v18.0
WHATSAPP_PHONE_NUMBER_ID=tu_phone_number_id
WHATSAPP_ACCESS_TOKEN=tu_access_token
WHATSAPP_WEBHOOK_VERIFY_TOKEN=token_secreto_aleatorio

# OpenAI (obtener de OpenAI Platform)
OPENAI_API_KEY=tu_openai_api_key

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/whatsapp_bot
```

### 3. Configurar la base de datos

```bash
# Crear base de datos
createdb whatsapp_bot

# Ejecutar migraciones (crea tablas automáticamente)
npm run db:migrate
```

### 4. Iniciar el servidor

```bash
# Modo desarrollo (auto-reload)
npm run dev

# Modo producción
npm start
```

El servidor estará disponible en `http://localhost:3000`

## 🏗️ Arquitectura

```
src/
├── config/          # Configuración centralizada
├── constants/       # Estados y constantes
├── database/        # Conexión y migraciones
├── repositories/    # Capa de datos
├── services/        # Lógica de negocio
│   ├── stateMachine.js    # Máquina de estados
│   ├── whatsappClient.js  # Cliente WhatsApp API
│   ├── ocrService.js      # Extracción de texto
│   └── aiService.js       # Normalización IA
├── routes/          # Endpoints HTTP
├── utils/           # Utilidades (logger)
└── index.js         # Entry point
```

## 🔄 Flujo de Estados

```
WELCOME
   ↓
WAITING_TICKET (usuario envía foto)
   ↓
PROCESSING_TICKET (OCR + IA)
   ↓
TICKET_OK / TICKET_ERROR
```

## ⚙️ Configuración

### Obtener Credenciales de WhatsApp Business API

1. Ir a [Meta for Developers](https://developers.facebook.com)
2. Crear una nueva App (tipo "Business")
3. Agregar el producto "WhatsApp"
4. En la sección "API Setup":
   - Copiar el **Phone Number ID** → `WHATSAPP_PHONE_NUMBER_ID`
   - Generar un **Permanent Token** → `WHATSAPP_ACCESS_TOKEN`
5. Crear un token aleatorio fuerte para → `WHATSAPP_WEBHOOK_VERIFY_TOKEN`

### Configurar Webhook en Meta

Una vez desplegado tu servidor (o usando ngrok para desarrollo local):

1. En Meta for Developers, ir a **WhatsApp → Configuration**
2. Click en **Edit** en la sección Webhook
3. Configurar:
   - **Callback URL**: `https://tu-dominio.com/api/webhook`
   - **Verify Token**: El mismo valor de `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
4. Suscribirse al campo **messages**
5. Click en **Verify and Save**

### Testing Local con ngrok

Para probar webhooks localmente:

```bash
# Instalar ngrok
npm install -g ngrok

# Iniciar túnel
ngrok http 3000

# Usar la URL HTTPS generada en la configuración de Meta
# Ejemplo: https://abc123.ngrok.io/api/webhook
```

## 💬 Uso

### Flujo de Conversación

1. **Usuario inicia conversación**
   ```
   Usuario → WhatsApp
   Bot: "👋 ¡Bienvenido! Envía una foto de tu ticket..."
   ```

2. **Usuario envía foto del ticket**
   ```
   Usuario → [Foto del ticket]
   Bot: "⏳ Procesando tu ticket..."
   ```

3. **Sistema procesa (OCR + IA)**
   - Descarga la imagen
   - Extrae texto con OCR (OpenAI Vision)
   - Normaliza datos con IA (GPT-4)
   - Valida que sea un ticket válido

4. **Respuesta del bot**
   ```
   Bot: "✅ ¡Ticket procesado!
         🏪 Tienda: Walmart
         💰 Total: $45.99
         📅 Fecha: 2026-01-18
         🎫 Número: 123456789"
   ```

### Estados de la Máquina

| Estado              | Descripción                        | Transición                    |
|---------------------|------------------------------------|-------------------------------|
| `WELCOME`           | Estado inicial                     | Cualquier mensaje → WAITING   |
| `WAITING_TICKET`    | Esperando foto del ticket          | Imagen → PROCESSING           |
| `PROCESSING_TICKET` | Procesando con OCR + IA            | Success → TICKET_OK           |
|                     |                                    | Error → TICKET_ERROR          |
| `TICKET_OK`         | Ticket procesado exitosamente      | Nueva imagen → PROCESSING     |
| `TICKET_ERROR`      | Error en procesamiento             | Nueva imagen → PROCESSING     |

### Endpoints API

| Método | Ruta              | Descripción                          |
|--------|-------------------|--------------------------------------|
| GET    | `/health`         | Health check del servidor            |
| GET    | `/api/webhook`    | Verificación de webhook (Meta)       |
| POST   | `/api/webhook`    | Recepción de mensajes de WhatsApp    |

## 🔐 Seguridad

- No commitear el archivo `.env`
- Usar HTTPS en producción
- Validar tokens en webhook
- Sanitizar inputs de usuario
- Rate limiting en producción (implementar middleware)

## 📊 Base de Datos

### Tabla: users
- Almacena usuarios y su estado actual
- Indexada por `phone_number`

### Tabla: tickets
- Almacena tickets procesados
- Relacionada con usuarios
- Contiene datos extraídos y metadata

## 🚀 Despliegue en DigitalOcean

### Opción 1: App Platform

1. Conectar repositorio Git
2. Configurar variables de entorno
3. Añadir base de datos PostgreSQL
4. Deploy automático

### Opción 2: Droplet (VPS)

```bash
# Instalar Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Instalar PostgreSQL
sudo apt install postgresql postgresql-contrib

# Clonar proyecto
git clone <repo>
cd server

# Instalar dependencias
npm install --production

# Configurar PM2 (process manager)
sudo npm install -g pm2
pm2 start src/index.js --name whatsapp-bot
pm2 startup
pm2 save

# Nginx como reverse proxy
sudo apt install nginx
# Configurar proxy a puerto 3000
```

## 🧪 Testing

El sistema incluye:
- Validación de payloads
- Manejo de errores de red
- Timeout en APIs externas
- Reintentos en fallos transitorios

## 📝 Logs

Los logs se guardan en:
- `combined.log` - Todos los logs
- `error.log` - Solo errores
- Console (desarrollo)

## 🔍 Monitoreo

Recomendaciones:
- Usar PM2 para monitoreo de procesos
- Configurar alertas de errores
- Monitorear uso de API (OpenAI, WhatsApp)
- Revisar logs regularmente

## 🛠️ Extensiones Futuras

- [ ] Soporte para más tipos de documentos
- [ ] Dashboard de administración
- [ ] Reportes y analytics
- [ ] Integración con sistemas de inventario
- [ ] Multi-tienda
- [ ] Notificaciones programadas
- [ ] Rate limiting
- [ ] Caché de respuestas frecuentes

## 📄 Licencia

MIT

## 👤 Autor

Backend desarrollado por un Senior Backend Engineer especializado en WhatsApp Business APIs.
