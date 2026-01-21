import { UserState } from '../constants/index.js';
import userRepository from '../repositories/userRepository.js';
import ticketRepository from '../repositories/ticketRepository.js';
import whatsAppClient from './whatsappClient.js';
import ocrService from './ocrService.js';
import aiService from './aiService.js';
import logger from '../utils/logger.js';

export class StateMachine {
  constructor() {
    this.stateHandlers = {
      [UserState.WELCOME]: this.handleWelcome.bind(this),
      [UserState.WAITING_TICKET]: this.handleWaitingTicket.bind(this),
      [UserState.PROCESSING_TICKET]: this.handleProcessingTicket.bind(this),
      [UserState.TICKET_OK]: this.handleTicketOk.bind(this),
      [UserState.TICKET_ERROR]: this.handleTicketError.bind(this),
    };
  }

  async processMessage(phoneNumber, message, messageType) {
    try {
      const user = await userRepository.findOrCreate(phoneNumber);
      const currentState = user.state;

      logger.info('Processing message', { phoneNumber, currentState, messageType });

      const handler = this.stateHandlers[currentState];
      if (!handler) {
        logger.error('Unknown state', { state: currentState });
        await this.transitionTo(phoneNumber, UserState.WELCOME);
        return await this.handleWelcome(phoneNumber, message, messageType);
      }

      return await handler(phoneNumber, message, messageType);
    } catch (error) {
      logger.error('Error processing message', { phoneNumber, error });
      await whatsAppClient.sendMessage(
        phoneNumber,
        '❌ Lo siento, ocurrió un error. Por favor, intenta de nuevo más tarde.'
      );
    }
  }

  async handleWelcome(phoneNumber, message, messageType) {
    const welcomeMessage = `👋 ¡Bienvenido al sistema de procesamiento de tickets!

Por favor, envía una foto clara de tu ticket de compra para procesarlo.

La foto debe mostrar claramente:
✓ Nombre de la tienda
✓ Monto total
✓ Fecha de compra
✓ Número de ticket`;

    await whatsAppClient.sendMessage(phoneNumber, welcomeMessage);
    await this.transitionTo(phoneNumber, UserState.WAITING_TICKET);
  }

  async handleWaitingTicket(phoneNumber, message, messageType) {
    if (messageType === 'text') {
      await whatsAppClient.sendMessage(
        phoneNumber,
        '📸 Por favor, envía una foto de tu ticket de compra (no texto).'
      );
      return;
    }

    if (messageType === 'image') {
      await this.transitionTo(phoneNumber, UserState.PROCESSING_TICKET);
      
      await whatsAppClient.sendMessage(
        phoneNumber,
        '⏳ Procesando tu ticket... Esto puede tomar unos segundos.'
      );

      await this.processTicketImage(phoneNumber, message);
    }
  }

  async handleProcessingTicket(phoneNumber, message, messageType) {
    await whatsAppClient.sendMessage(
      phoneNumber,
      '⚙️ Tu ticket anterior aún se está procesando. Por favor, espera un momento.'
    );
  }

  async handleTicketOk(phoneNumber, message, messageType) {
    await whatsAppClient.sendMessage(
      phoneNumber,
      '¿Deseas procesar otro ticket? Envía una nueva foto o escribe "menu" para volver al inicio.'
    );

    if (messageType === 'image') {
      await this.transitionTo(phoneNumber, UserState.PROCESSING_TICKET);
      await whatsAppClient.sendMessage(
        phoneNumber,
        '⏳ Procesando tu nuevo ticket...'
      );
      await this.processTicketImage(phoneNumber, message);
    } else if (message?.toLowerCase().includes('menu')) {
      await this.transitionTo(phoneNumber, UserState.WELCOME);
      await this.handleWelcome(phoneNumber, message, messageType);
    }
  }

  async handleTicketError(phoneNumber, message, messageType) {
    await whatsAppClient.sendMessage(
      phoneNumber,
      '❌ El ticket anterior no pudo ser procesado.\n\n¿Deseas intentar con otro ticket? Envía una nueva foto.'
    );

    if (messageType === 'image') {
      await this.transitionTo(phoneNumber, UserState.PROCESSING_TICKET);
      await whatsAppClient.sendMessage(
        phoneNumber,
        '⏳ Procesando tu nuevo ticket...'
      );
      await this.processTicketImage(phoneNumber, message);
    } else if (message?.toLowerCase().includes('menu')) {
      await this.transitionTo(phoneNumber, UserState.WELCOME);
      await this.handleWelcome(phoneNumber, message, messageType);
    }
  }

  async processTicketImage(phoneNumber, imageData) {
    let ticketId = null;
    
    try {
      const user = await userRepository.findByPhone(phoneNumber);
      
      const mediaBuffer = imageData.buffer;
      const mediaUrl = imageData.url;

      logger.info('Starting ticket processing', { phoneNumber, mediaUrl });

      const ocrText = await ocrService.extractTextFromImage(mediaBuffer);
      
      if (!ocrText || ocrText.length < 10) {
        throw new Error('No text could be extracted from the image');
      }

      const normalizedData = await aiService.normalizeTicketData(ocrText);

      if (!normalizedData.valid) {
        const ticket = await ticketRepository.create({
          userId: user.id,
          phoneNumber,
          rawOcrText: ocrText,
          imageUrl: mediaUrl,
          status: 'invalid',
        });
        
        await ticketRepository.updateStatus(
          ticket.id,
          'invalid',
          normalizedData.reason
        );

        await this.transitionTo(phoneNumber, UserState.TICKET_ERROR);
        
        await whatsAppClient.sendMessage(
          phoneNumber,
          `❌ El ticket no pudo ser procesado.\n\nRazón: ${normalizedData.reason}\n\nPor favor, envía una foto clara de un ticket de compra válido.`
        );
        
        return;
      }

      const ticket = await ticketRepository.create({
        userId: user.id,
        phoneNumber,
        storeName: normalizedData.data.storeName,
        totalAmount: normalizedData.data.totalAmount,
        currency: normalizedData.data.currency,
        date: normalizedData.data.date,
        ticketNumber: normalizedData.data.ticketNumber,
        rawOcrText: ocrText,
        imageUrl: mediaUrl,
        status: 'processed',
      });

      ticketId = ticket.id;

      await this.transitionTo(phoneNumber, UserState.TICKET_OK);

      const successMessage = `✅ ¡Ticket procesado exitosamente!

🏪 Tienda: ${normalizedData.data.storeName || 'No disponible'}
💰 Total: ${normalizedData.data.currency || ''} ${normalizedData.data.totalAmount || 'No disponible'}
📅 Fecha: ${normalizedData.data.date || 'No disponible'}
🎫 Número: ${normalizedData.data.ticketNumber || 'No disponible'}

Tu ticket ha sido registrado correctamente.`;

      await whatsAppClient.sendMessage(phoneNumber, successMessage);

      logger.info('Ticket processed successfully', { 
        phoneNumber, 
        ticketId,
        storeName: normalizedData.data.storeName,
      });

    } catch (error) {
      logger.error('Error processing ticket image', { phoneNumber, error });

      if (ticketId) {
        await ticketRepository.updateStatus(ticketId, 'error', error.message);
      }

      await this.transitionTo(phoneNumber, UserState.TICKET_ERROR);
      
      await whatsAppClient.sendMessage(
        phoneNumber,
        '❌ Ocurrió un error al procesar tu ticket. Por favor, intenta de nuevo con otra foto más clara.'
      );
    }
  }

  async transitionTo(phoneNumber, newState) {
    try {
      await userRepository.updateState(phoneNumber, newState);
      logger.info('State transition', { phoneNumber, newState });
    } catch (error) {
      logger.error('Error transitioning state', { phoneNumber, newState, error });
      throw error;
    }
  }
}

const stateMachine = new StateMachine();
export default stateMachine;
