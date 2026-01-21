# Arquitectura del Sistema

## 📊 Diagrama de Flujo General

```
Usuario WhatsApp
       ↓
[Meta WhatsApp Cloud API]
       ↓
[Webhook POST /api/webhook]
       ↓
[Express Router]
       ↓
[State Machine] ←→ [User Repository]
       ↓                    ↓
   ┌───┴────┬──────────────┴─────┐
   ↓        ↓                     ↓
[WhatsApp  [OCR      [AI      [PostgreSQL]
 Client]   Service]  Service]
   ↓        ↓         ↓
  API    OpenAI    OpenAI
         Vision    GPT-4
```

## 🏗️ Arquitectura en Capas

```
┌─────────────────────────────────────────┐
│         Presentation Layer              │
│  (HTTP Routes - webhook.js)             │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│         Business Logic Layer            │
│  (State Machine, Services)              │
│  - stateMachine.js                      │
│  - whatsappClient.js                    │
│  - ocrService.js                        │
│  - aiService.js                         │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│         Data Access Layer               │
│  (Repositories)                         │
│  - userRepository.js                    │
│  - ticketRepository.js                  │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│         Database Layer                  │
│  (PostgreSQL)                           │
│  - users table                          │
│  - tickets table                        │
│  - migrations table                     │
└─────────────────────────────────────────┘
```

## 🔄 Flujo de Procesamiento de Ticket

```
1. Usuario envía imagen
        ↓
2. WhatsApp Cloud API → Webhook
        ↓
3. webhook.js recibe POST
        ↓
4. Extrae messageId, from, image.id
        ↓
5. Marca mensaje como leído
        ↓
6. stateMachine.processMessage()
        ↓
7. Verifica estado actual del usuario
        ↓
8. Estado = WAITING_TICKET → PROCESSING_TICKET
        ↓
9. whatsappClient.downloadMedia(imageId)
        ↓
10. ocrService.extractTextFromImage(buffer)
         ↓
11. OpenAI Vision API → texto extraído
         ↓
12. aiService.normalizeTicketData(texto)
         ↓
13. OpenAI GPT-4 → JSON estructurado
         ↓
14. Valida si es ticket válido
         ↓
    ┌────┴────┐
    ↓         ↓
  VÁLIDO   INVÁLIDO
    ↓         ↓
15a. Guardar  15b. Guardar error
    en DB          en DB
    ↓         ↓
16a. Estado   16b. Estado
    TICKET_OK     TICKET_ERROR
    ↓         ↓
17a. Mensaje  17b. Mensaje
    éxito         error
```

## 🗄️ Modelo de Datos

```sql
┌─────────────────────┐
│       users         │
├─────────────────────┤
│ id (PK)             │
│ phone_number (UQ)   │◄───────┐
│ state               │        │
│ created_at          │        │
│ updated_at          │        │
└─────────────────────┘        │
                               │
┌──────────────────────────────┴──┐
│          tickets                │
├─────────────────────────────────┤
│ id (PK)                         │
│ user_id (FK)                    │
│ phone_number                    │
│ store_name                      │
│ total_amount                    │
│ currency                        │
│ date                            │
│ ticket_number                   │
│ raw_ocr_text                    │
│ image_url                       │
│ status                          │
│ error_message                   │
│ created_at                      │
│ updated_at                      │
└─────────────────────────────────┘
```

## 🎭 Máquina de Estados

```
     [START]
        ↓
   ┌────────────┐
   │  WELCOME   │
   └──────┬─────┘
          ↓ (any message)
   ┌──────────────────┐
   │ WAITING_TICKET   │
   └──────┬───────────┘
          ↓ (image)
   ┌──────────────────────┐
   │ PROCESSING_TICKET    │
   └──────┬──────────┬────┘
          ↓          ↓
    ┌─────────┐  ┌──────────────┐
    │TICKET_OK│  │ TICKET_ERROR │
    └─────┬───┘  └──────┬───────┘
          │             │
          └─────┬───────┘
                ↓ (image: nuevo ticket)
          (vuelve a PROCESSING_TICKET)
```

### Transiciones Detalladas

| Estado Actual      | Evento          | Próximo Estado      | Acción                        |
|--------------------|-----------------|---------------------|-------------------------------|
| WELCOME            | text/image      | WAITING_TICKET      | Enviar instrucciones          |
| WAITING_TICKET     | text            | WAITING_TICKET      | Pedir imagen                  |
| WAITING_TICKET     | image           | PROCESSING_TICKET   | Iniciar procesamiento         |
| PROCESSING_TICKET  | success         | TICKET_OK           | Guardar datos + msg éxito     |
| PROCESSING_TICKET  | error           | TICKET_ERROR        | Guardar error + msg error     |
| TICKET_OK          | image           | PROCESSING_TICKET   | Procesar nuevo ticket         |
| TICKET_OK          | "menu"          | WELCOME             | Reiniciar flujo               |
| TICKET_ERROR       | image           | PROCESSING_TICKET   | Reintentar                    |
| TICKET_ERROR       | "menu"          | WELCOME             | Reiniciar flujo               |

## 🔌 Integraciones Externas

### 1. WhatsApp Cloud API (Meta)

**Endpoints usados:**
- `POST /{phone_number_id}/messages` - Enviar mensajes
- `GET /{media_id}` - Obtener URL de media
- `GET {media_url}` - Descargar media

**Rate Limits:**
- 80 mensajes/segundo (por número de teléfono)
- 1000 mensajes/día (tier gratuito)

### 2. OpenAI API

**Endpoints usados:**
- `POST /v1/chat/completions` (Vision) - OCR
- `POST /v1/chat/completions` (GPT-4) - Normalización

**Costos aproximados:**
- Vision: $0.01 por imagen
- GPT-4: ~$0.03 por ticket

**Rate Limits:**
- 10,000 tokens/minuto (tier 1)
- 500 requests/día (tier gratuito)

## 🔐 Seguridad

```
┌──────────────────┐
│   WhatsApp API   │
└────────┬─────────┘
         ↓ HTTPS
┌────────────────────────────┐
│  Webhook Verification      │
│  (verify_token check)      │
└────────┬───────────────────┘
         ↓
┌────────────────────────────┐
│  Express Middleware        │
│  - JSON parsing            │
│  - Request logging         │
└────────┬───────────────────┘
         ↓
┌────────────────────────────┐
│  Business Logic            │
│  - Input validation        │
│  - State verification      │
└────────┬───────────────────┘
         ↓
┌────────────────────────────┐
│  Database (PostgreSQL)     │
│  - Connection pooling      │
│  - Parameterized queries   │
└────────────────────────────┘
```

### Medidas de seguridad implementadas:
- ✅ Verificación de webhook token
- ✅ Variables de entorno para secretos
- ✅ Prepared statements (SQL injection protection)
- ✅ Validación de payloads
- ✅ Error handling sin exponer internals
- ✅ Logs sin información sensible

## 📈 Escalabilidad

### Nivel 1: Single Instance (actual)
```
[Load Balancer/Nginx]
         ↓
    [Node.js App]
         ↓
    [PostgreSQL]
```
**Capacidad:** ~100 usuarios concurrentes

### Nivel 2: Horizontal Scaling
```
[Load Balancer]
    ↓     ↓     ↓
[App 1][App 2][App 3]
    ↓     ↓     ↓
  [PostgreSQL Primary]
         ↓
  [PostgreSQL Replica]
```
**Capacidad:** ~1,000 usuarios concurrentes

### Nivel 3: Microservicios + Queue
```
[API Gateway]
      ↓
[Webhook Service]
      ↓
[Message Queue - RabbitMQ/SQS]
      ↓
┌─────┴─────┬──────────┬──────────┐
│           │          │          │
[OCR       [AI      [State     [Notification
 Worker]   Worker]  Worker]    Worker]
      │          │          │          │
      └──────────┴──────────┴──────────┘
                  ↓
            [PostgreSQL]
                  ↓
              [Redis Cache]
```
**Capacidad:** 10,000+ usuarios concurrentes

## 🔍 Monitoreo y Observabilidad

```
┌──────────────┐
│   App Logs   │
│  (Winston)   │
└──────┬───────┘
       ↓
┌──────────────┐      ┌─────────────┐
│ File System  │ ───► │  Log Agg.   │
│ - error.log  │      │  (ELK/Cloud)│
│ - combined   │      └─────────────┘
└──────────────┘
       
┌──────────────┐
│ PM2 Monitor  │
│ - CPU/Memory │
│ - Restarts   │
└──────────────┘

┌──────────────┐
│   Database   │
│   - Queries  │
│   - Slow log │
└──────────────┘
```

## 🎯 Puntos de Mejora Futuros

1. **Caché distribuido (Redis)**
   - Estados de usuario en memoria
   - Resultados de OCR recientes
   - Rate limiting

2. **Message Queue**
   - Procesamiento asíncrono
   - Retry automático
   - Desacoplar webhook de procesamiento

3. **CDN para media**
   - Almacenar imágenes en S3/Spaces
   - Servir con CDN para velocidad

4. **Analytics Dashboard**
   - Métricas en tiempo real
   - Tasa de éxito de tickets
   - Tiendas más comunes

5. **Rate Limiting**
   - Por usuario
   - Por IP
   - Global
