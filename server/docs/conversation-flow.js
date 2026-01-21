/**
 * Ejemplo de flujo de conversación con el bot
 * 
 * Este archivo documenta el flujo esperado de interacción
 */

// ============================================
// FLUJO 1: Primera interacción exitosa
// ============================================

// Usuario: [Inicia conversación]
// Bot: "👋 ¡Bienvenido al sistema de procesamiento de tickets!..."
// Estado: WELCOME → WAITING_TICKET

// Usuario: [Envía foto de ticket]
// Bot: "⏳ Procesando tu ticket... Esto puede tomar unos segundos."
// Estado: WAITING_TICKET → PROCESSING_TICKET

// [Sistema procesa OCR + IA]

// Bot: "✅ ¡Ticket procesado exitosamente!
//       🏪 Tienda: Walmart
//       💰 Total: $ 45.99
//       📅 Fecha: 2026-01-18
//       🎫 Número: 123456789"
// Estado: PROCESSING_TICKET → TICKET_OK

// ============================================
// FLUJO 2: Imagen no válida
// ============================================

// Usuario: [Envía foto que NO es un ticket]
// Bot: "⏳ Procesando tu ticket..."
// Estado: WAITING_TICKET → PROCESSING_TICKET

// [IA detecta que no es un ticket válido]

// Bot: "❌ El ticket no pudo ser procesado.
//       Razón: La imagen no parece ser un ticket de compra válido
//       Por favor, envía una foto clara de un ticket de compra válido."
// Estado: PROCESSING_TICKET → TICKET_ERROR

// ============================================
// FLUJO 3: Usuario envía texto en lugar de imagen
// ============================================

// Usuario: "Hola, quiero procesar un ticket"
// Bot: "📸 Por favor, envía una foto de tu ticket de compra (no texto)."
// Estado: WAITING_TICKET (sin cambio)

// ============================================
// FLUJO 4: Procesar múltiples tickets
// ============================================

// Usuario: [Envía primer ticket - procesado OK]
// Estado: TICKET_OK

// Usuario: [Envía segundo ticket directamente]
// Bot: "⏳ Procesando tu nuevo ticket..."
// Estado: TICKET_OK → PROCESSING_TICKET → TICKET_OK

// ============================================
// DATOS EXTRAÍDOS DE UN TICKET EJEMPLO
// ============================================

const ticketExample = {
  storeName: "Walmart Supercenter",
  totalAmount: 45.99,
  currency: "USD",
  date: "2026-01-18",
  ticketNumber: "123456789",
  rawOcrText: "WALMART\nSupercenter #1234\n...",
  status: "processed"
};

// ============================================
// ESTADOS Y TRANSICIONES
// ============================================

const stateTransitions = {
  WELCOME: {
    onText: 'WAITING_TICKET',
    onImage: 'WAITING_TICKET',
  },
  WAITING_TICKET: {
    onText: 'WAITING_TICKET', // No cambia, pide imagen
    onImage: 'PROCESSING_TICKET',
  },
  PROCESSING_TICKET: {
    onSuccess: 'TICKET_OK',
    onError: 'TICKET_ERROR',
  },
  TICKET_OK: {
    onImage: 'PROCESSING_TICKET', // Nuevo ticket
    onMenu: 'WELCOME',
  },
  TICKET_ERROR: {
    onImage: 'PROCESSING_TICKET', // Reintentar
    onMenu: 'WELCOME',
  },
};

export { ticketExample, stateTransitions };
