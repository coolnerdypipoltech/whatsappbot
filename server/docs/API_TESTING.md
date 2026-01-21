# API Testing Examples

Ejemplos de pruebas para el WhatsApp Ticket Bot.

## 🧪 Prerequisites

```bash
# Asegúrate de que el servidor esté corriendo
npm run dev

# En otra terminal, puedes ejecutar estos comandos
```

## 1. Health Check

Verifica que el servidor esté funcionando:

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

## 2. Webhook Verification (GET)

Simula la verificación que hace Meta cuando configuras el webhook:

```bash
curl -X GET "http://localhost:3000/api/webhook?hub.mode=subscribe&hub.verify_token=your_webhook_verify_token&hub.challenge=test_challenge_12345"
```

**Respuesta esperada:**
```
test_challenge_12345
```

**Si el token es incorrecto:**
```
Forbidden
```

## 3. Simular Mensaje de Texto

```bash
curl -X POST http://localhost:3000/api/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "object": "whatsapp_business_account",
    "entry": [
      {
        "id": "123456789",
        "changes": [
          {
            "value": {
              "messaging_product": "whatsapp",
              "metadata": {
                "display_phone_number": "1234567890",
                "phone_number_id": "123456789"
              },
              "contacts": [
                {
                  "profile": {
                    "name": "Test User"
                  },
                  "wa_id": "1234567890"
                }
              ],
              "messages": [
                {
                  "from": "1234567890",
                  "id": "wamid.test123",
                  "timestamp": "1234567890",
                  "text": {
                    "body": "Hola"
                  },
                  "type": "text"
                }
              ]
            },
            "field": "messages"
          }
        ]
      }
    ]
  }'
```

**Respuesta esperada:**
```
200 OK
```

**Lo que debe pasar:**
1. El servidor procesa el mensaje
2. El usuario se crea o se recupera de la DB
3. Se envía mensaje de bienvenida (si es estado WELCOME)
4. El estado cambia a WAITING_TICKET

## 4. Simular Mensaje con Imagen

```bash
curl -X POST http://localhost:3000/api/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "object": "whatsapp_business_account",
    "entry": [
      {
        "id": "123456789",
        "changes": [
          {
            "value": {
              "messaging_product": "whatsapp",
              "metadata": {
                "display_phone_number": "1234567890",
                "phone_number_id": "123456789"
              },
              "contacts": [
                {
                  "profile": {
                    "name": "Test User"
                  },
                  "wa_id": "1234567890"
                }
              ],
              "messages": [
                {
                  "from": "1234567890",
                  "id": "wamid.test456",
                  "timestamp": "1234567890",
                  "type": "image",
                  "image": {
                    "caption": "Mi ticket",
                    "mime_type": "image/jpeg",
                    "sha256": "abc123",
                    "id": "123456789"
                  }
                }
              ]
            },
            "field": "messages"
          }
        ]
      }
    ]
  }'
```

**Nota:** Este ejemplo intentará descargar la imagen real de WhatsApp API,
por lo que necesitas credenciales válidas para que funcione completamente.

## 5. Verificar Estado de Usuario en DB

```bash
# Conectarse a PostgreSQL
psql whatsapp_bot

# Ver todos los usuarios
SELECT * FROM users;

# Ver tickets procesados
SELECT * FROM tickets ORDER BY created_at DESC LIMIT 10;

# Ver estado de un usuario específico
SELECT * FROM users WHERE phone_number = '1234567890';

# Ver tickets de un usuario
SELECT t.* FROM tickets t
JOIN users u ON t.user_id = u.id
WHERE u.phone_number = '1234567890';
```

## 6. Testing con Postman/Insomnia

### Colección de Postman

Crea una colección con estas requests:

**Request 1: Health Check**
```
GET http://localhost:3000/health
```

**Request 2: Webhook Verify**
```
GET http://localhost:3000/api/webhook?hub.mode=subscribe&hub.verify_token={{VERIFY_TOKEN}}&hub.challenge=test123
```

**Request 3: Text Message**
```
POST http://localhost:3000/api/webhook
Content-Type: application/json

{
  "object": "whatsapp_business_account",
  "entry": [{
    "changes": [{
      "field": "messages",
      "value": {
        "messages": [{
          "from": "1234567890",
          "id": "msg-001",
          "type": "text",
          "text": {"body": "Hola"}
        }]
      }
    }]
  }]
}
```

## 7. Testing de Servicios Individualmente

### Test OCR Service

```javascript
// test-ocr.js
import ocrService from './src/services/ocrService.js';
import fs from 'fs';

const imageBuffer = fs.readFileSync('./test-images/ticket.jpg');
const text = await ocrService.extractTextFromImage(imageBuffer);
console.log('Extracted text:', text);
```

```bash
node test-ocr.js
```

### Test AI Service

```javascript
// test-ai.js
import aiService from './src/services/aiService.js';

const sampleText = `
WALMART
Supercenter #1234
Date: 01/18/2026
Total: $45.99
Transaction: 987654321
`;

const result = await aiService.normalizeTicketData(sampleText);
console.log('Normalized:', JSON.stringify(result, null, 2));
```

```bash
node test-ai.js
```

### Test WhatsApp Client (requiere credenciales reales)

```javascript
// test-whatsapp.js
import whatsAppClient from './src/services/whatsappClient.js';

const to = '1234567890'; // Número de prueba
const message = 'Test message from bot';

await whatsAppClient.sendMessage(to, message);
console.log('Message sent!');
```

```bash
node test-whatsapp.js
```

## 8. Logs en Tiempo Real

### Ver todos los logs

```bash
# Desarrollo (output directo)
npm run dev

# Producción (con PM2)
pm2 logs whatsapp-bot
```

### Ver solo errores

```bash
# Archivo de errores
tail -f error.log

# PM2
pm2 logs whatsapp-bot --err
```

### Buscar en logs

```bash
# Buscar por número de teléfono
grep "1234567890" combined.log

# Buscar errores
grep "error" combined.log -i

# Últimas 100 líneas
tail -n 100 combined.log
```

## 9. Monitoreo de Base de Datos

### Ver queries lentas

```sql
-- Activar log de queries lentas
ALTER SYSTEM SET log_min_duration_statement = 1000; -- 1 segundo
SELECT pg_reload_conf();

-- Ver conexiones activas
SELECT pid, usename, application_name, state, query
FROM pg_stat_activity
WHERE datname = 'whatsapp_bot';

-- Ver tamaño de tablas
SELECT
    table_name,
    pg_size_pretty(pg_total_relation_size(quote_ident(table_name)))
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY pg_total_relation_size(quote_ident(table_name)) DESC;
```

## 10. Performance Testing

### Apache Bench (ab)

```bash
# Instalar apache bench
# Ubuntu: sudo apt install apache2-utils
# macOS: ya viene instalado

# Test de health endpoint
ab -n 1000 -c 10 http://localhost:3000/health

# Resultados:
# - Requests per second
# - Time per request
# - Transfer rate
```

### Artillery (más avanzado)

```bash
# Instalar
npm install -g artillery

# Crear config
cat > load-test.yml <<EOF
config:
  target: "http://localhost:3000"
  phases:
    - duration: 60
      arrivalRate: 5
scenarios:
  - name: "Health check"
    flow:
      - get:
          url: "/health"
EOF

# Ejecutar
artillery run load-test.yml
```

## 11. Debug Mode

### Activar debug detallado

```bash
# En .env
NODE_ENV=development

# O al iniciar
NODE_ENV=development npm run dev
```

### Inspeccionar con Chrome DevTools

```bash
node --inspect src/index.js

# Abrir en Chrome:
chrome://inspect
```

## 12. Payload Examples Reales

### Mensaje de texto real de WhatsApp

```json
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "106876012345678",
      "changes": [
        {
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {
              "display_phone_number": "15551234567",
              "phone_number_id": "106123456789012"
            },
            "contacts": [
              {
                "profile": {
                  "name": "John Doe"
                },
                "wa_id": "14155551234"
              }
            ],
            "messages": [
              {
                "from": "14155551234",
                "id": "wamid.HBgLMTQxNTU1NTEyMzQVAgARGBI5QTNDQTVCN0Y4RjREMEE4Q0QA",
                "timestamp": "1642648847",
                "text": {
                  "body": "Hola, quiero procesar un ticket"
                },
                "type": "text"
              }
            ]
          },
          "field": "messages"
        }
      ]
    }
  ]
}
```

### Mensaje con imagen real de WhatsApp

```json
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "106876012345678",
      "changes": [
        {
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {
              "display_phone_number": "15551234567",
              "phone_number_id": "106123456789012"
            },
            "contacts": [
              {
                "profile": {
                  "name": "John Doe"
                },
                "wa_id": "14155551234"
              }
            ],
            "messages": [
              {
                "from": "14155551234",
                "id": "wamid.HBgLMTQxNTU1NTEyMzQVAgARGBJENDg5RjU4QTAyRjBGNEVGOEEA",
                "timestamp": "1642648900",
                "type": "image",
                "image": {
                  "caption": "Mi ticket de Walmart",
                  "mime_type": "image/jpeg",
                  "sha256": "4e3dc82f0e98bb3d69c3bb8e6e8f1eca94c5b9a0e5f5e5e5e5e5e5e5e5e5e5e5",
                  "id": "123456789012345"
                }
              }
            ]
          },
          "field": "messages"
        }
      ]
    }
  ]
}
```

## 13. Error Testing

### Simular diferentes tipos de errores

```bash
# 1. Mensaje sin texto ni imagen
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
            "id": "msg-001",
            "type": "location"
          }]
        }
      }]
    }]
  }'

# 2. Payload inválido
curl -X POST http://localhost:3000/api/webhook \
  -H "Content-Type: application/json" \
  -d '{"invalid": "payload"}'

# 3. Objeto diferente a whatsapp_business_account
curl -X POST http://localhost:3000/api/webhook \
  -H "Content-Type: application/json" \
  -d '{"object": "instagram", "entry": []}'
```

## 14. Cleanup Scripts

```bash
# Limpiar logs viejos
find . -name "*.log" -mtime +7 -delete

# Limpiar base de datos de prueba
psql whatsapp_bot -c "DELETE FROM tickets WHERE phone_number = '1234567890';"
psql whatsapp_bot -c "DELETE FROM users WHERE phone_number = '1234567890';"

# Reiniciar contador de IDs (solo desarrollo)
psql whatsapp_bot -c "TRUNCATE users, tickets RESTART IDENTITY CASCADE;"
```

---

## 📊 Métricas a Monitorear

- ✅ Tiempo de respuesta del webhook (< 1s)
- ✅ Tasa de éxito de OCR (> 90%)
- ✅ Tasa de tickets válidos (depende del uso)
- ✅ Uso de memoria (< 500MB por instancia)
- ✅ Conexiones DB activas (< 20)
- ✅ Errores por hora (< 5%)

---

## 🐛 Troubleshooting

### Problema: Webhook no recibe mensajes

**Verificar:**
1. URL pública accesible
2. HTTPS habilitado (Meta requiere SSL)
3. Token de verificación correcto
4. Suscripción al campo "messages"

### Problema: OCR falla constantemente

**Verificar:**
1. API key de OpenAI válida
2. Créditos disponibles en OpenAI
3. Imágenes no demasiado grandes (< 20MB)
4. Formato de imagen soportado (JPEG, PNG)

### Problema: Database connection error

**Verificar:**
1. PostgreSQL está corriendo: `sudo systemctl status postgresql`
2. DATABASE_URL es correcta
3. Usuario tiene permisos
4. Firewall permite conexión

---

**Para más información, ver la documentación completa en `/docs`**
