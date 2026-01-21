# Development Guide

## 🛠️ Configuración del Entorno de Desarrollo

### 1. Requisitos Previos

```bash
node --version  # >= 18.0.0
npm --version   # >= 9.0.0
psql --version  # >= 14.0
```

### 2. Setup Inicial

```bash
# Instalar dependencias
cd server
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales

# Crear base de datos local
createdb whatsapp_bot

# Ejecutar migraciones
npm run db:migrate

# Iniciar en modo desarrollo
npm run dev
```

### 3. Obtener Credenciales

#### WhatsApp Business API

1. Ir a https://developers.facebook.com
2. Crear una app (tipo "Business")
3. Agregar producto "WhatsApp"
4. En "API Setup":
   - `WHATSAPP_PHONE_NUMBER_ID`: Copiar de "Phone number ID"
   - `WHATSAPP_ACCESS_TOKEN`: Generar un "Permanent token"
5. En "Configuration":
   - `WHATSAPP_WEBHOOK_VERIFY_TOKEN`: Crear un token aleatorio fuerte

#### OpenAI API

1. Ir a https://platform.openai.com
2. API keys → Create new secret key
3. Copiar el key a `OPENAI_API_KEY`

### 4. Probar Webhook Localmente

Para que WhatsApp pueda enviar webhooks a tu máquina local:

```bash
# Opción 1: ngrok (recomendado)
npm install -g ngrok
ngrok http 3000

# Copiar la URL HTTPS generada (ej: https://abc123.ngrok.io)
# Configurarla en Meta: https://abc123.ngrok.io/api/webhook

# Opción 2: localtunnel
npm install -g localtunnel
lt --port 3000
```

---

## 🧪 Testing Manual

### Test 1: Health Check

```bash
curl http://localhost:3000/health
```

**Respuesta esperada:**
```json
{
  "status": "ok",
  "timestamp": "2026-01-19T10:00:00.000Z",
  "service": "whatsapp-ticket-bot"
}
```

### Test 2: Webhook Verification

```bash
curl "http://localhost:3000/api/webhook?hub.mode=subscribe&hub.verify_token=tu_token&hub.challenge=test123"
```

**Respuesta esperada:**
```
test123
```

### Test 3: Simular Mensaje de WhatsApp

```bash
curl -X POST http://localhost:3000/api/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "object": "whatsapp_business_account",
    "entry": [{
      "changes": [{
        "field": "messages",
        "value": {
          "messages": [{
            "from": "1234567890",
            "id": "wamid.test123",
            "type": "text",
            "text": {
              "body": "Hola"
            }
          }]
        }
      }]
    }]
  }'
```

---

## 🗂️ Estructura del Código

### Responsabilidades por Módulo

#### `src/config/`
- Centraliza toda la configuración
- Lee variables de entorno
- No lógica de negocio

#### `src/constants/`
- Define enums y constantes
- Estados del sistema
- Tipos de mensaje

#### `src/database/`
- `index.js`: Pool de conexiones
- `migrate.js`: Migraciones de esquema

#### `src/repositories/`
- Capa de acceso a datos
- Queries SQL encapsuladas
- Sin lógica de negocio

#### `src/services/`
- **stateMachine.js**: Orquesta el flujo completo
- **whatsappClient.js**: Comunicación con WhatsApp API
- **ocrService.js**: Extrae texto de imágenes
- **aiService.js**: Normaliza datos con IA

#### `src/routes/`
- Define endpoints HTTP
- Valida requests
- Delega a servicios

#### `src/utils/`
- Logger
- Helpers genéricos

---

## 🔄 Agregar un Nuevo Estado

### Ejemplo: Estado `WAITING_CONFIRMATION`

1. **Agregar constante**
```javascript
// src/constants/index.js
export const UserState = {
  WELCOME: 'WELCOME',
  WAITING_TICKET: 'WAITING_TICKET',
  PROCESSING_TICKET: 'PROCESSING_TICKET',
  WAITING_CONFIRMATION: 'WAITING_CONFIRMATION', // ✨ NUEVO
  TICKET_OK: 'TICKET_OK',
  TICKET_ERROR: 'TICKET_ERROR',
};
```

2. **Implementar handler**
```javascript
// src/services/stateMachine.js
async handleWaitingConfirmation(phoneNumber, message, messageType) {
  if (message?.toLowerCase() === 'si') {
    await whatsAppClient.sendMessage(phoneNumber, '✅ Confirmado!');
    await this.transitionTo(phoneNumber, UserState.TICKET_OK);
  } else {
    await whatsAppClient.sendMessage(phoneNumber, '❌ Cancelado');
    await this.transitionTo(phoneNumber, UserState.WAITING_TICKET);
  }
}
```

3. **Registrar en stateHandlers**
```javascript
constructor() {
  this.stateHandlers = {
    // ...otros handlers...
    [UserState.WAITING_CONFIRMATION]: this.handleWaitingConfirmation.bind(this),
  };
}
```

4. **Transicionar desde otro estado**
```javascript
// Después de procesar ticket exitosamente
await whatsAppClient.sendMessage(phoneNumber, '¿Es correcto? (si/no)');
await this.transitionTo(phoneNumber, UserState.WAITING_CONFIRMATION);
```

---

## 🎯 Agregar Validación de Tienda Específica

### Ejemplo: Solo aceptar tickets de Walmart

```javascript
// src/services/aiService.js
async normalizeTicketData(ocrText) {
  // ...código existente...
  
  if (result.valid) {
    const storeName = result.data.store_name?.toLowerCase() || '';
    
    // Validación de tienda
    const allowedStores = ['walmart', 'costco', 'target'];
    const isAllowedStore = allowedStores.some(store => 
      storeName.includes(store)
    );
    
    if (!isAllowedStore) {
      return {
        valid: false,
        reason: 'Solo aceptamos tickets de Walmart, Costco o Target',
      };
    }
  }
  
  // ...resto del código...
}
```

---

## 📝 Logging Best Practices

```javascript
// ✅ BUENO
logger.info('Ticket processed', { 
  phoneNumber, 
  ticketId, 
  storeName 
});

// ❌ MALO
logger.info('Ticket processed for ' + phoneNumber);
```

**Niveles:**
- `error`: Errores que requieren atención
- `warn`: Situaciones anormales pero manejables
- `info`: Eventos importantes (producción)
- `debug`: Información detallada (desarrollo)

---

## 🐛 Debug Tips

### Ver logs en tiempo real

```bash
# Desarrollo
npm run dev

# Producción con PM2
pm2 logs whatsapp-bot --lines 100
```

### Debug database queries

```javascript
// src/database/index.js ya incluye logging
// Ver en consola cada query ejecutada
```

### Simular procesamiento de imagen

```javascript
// test/manual-test.js (crear este archivo)
import ocrService from '../src/services/ocrService.js';
import aiService from '../src/services/aiService.js';
import fs from 'fs';

const buffer = fs.readFileSync('./test-ticket.jpg');
const text = await ocrService.extractTextFromImage(buffer);
console.log('OCR:', text);

const normalized = await aiService.normalizeTicketData(text);
console.log('Normalized:', normalized);
```

---

## 🔧 Herramientas Recomendadas

- **VS Code Extensions:**
  - ESLint
  - Prettier
  - PostgreSQL (cweijan.vscode-postgresql-client2)
  - REST Client

- **Debugging:**
  - Postman/Insomnia para APIs
  - pgAdmin para PostgreSQL
  - ngrok para webhooks locales

- **Monitoring:**
  - PM2 en producción
  - Winston logs
  - PostgreSQL logs en `/var/log/postgresql/`

---

## 🚀 Performance Tips

1. **Connection Pooling**: Ya implementado en `database/index.js`
2. **Async/Await**: Usado correctamente en todo el código
3. **Índices DB**: Creados en migraciones
4. **Rate Limiting**: Pendiente (agregar middleware)
5. **Caché**: Considerar Redis para estados frecuentes

---

## 📚 Recursos Útiles

- [WhatsApp Cloud API Docs](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [OpenAI Vision API](https://platform.openai.com/docs/guides/vision)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [PostgreSQL Performance](https://wiki.postgresql.org/wiki/Performance_Optimization)

---

## 🤝 Contribuir

1. Fork el proyecto
2. Crear branch: `git checkout -b feature/nueva-feature`
3. Commit: `git commit -m 'Add: nueva feature'`
4. Push: `git push origin feature/nueva-feature`
5. Pull Request

### Commit Convention

```
Add: Nueva funcionalidad
Fix: Corrección de bug
Update: Actualización de código existente
Remove: Eliminación de código
Docs: Cambios en documentación
```
