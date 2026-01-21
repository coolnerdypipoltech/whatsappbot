import express from 'express';
import { config } from '../config/index.js';
import stateMachine from '../services/stateMachine.js';
import whatsAppClient from '../services/whatsappClient.js';
import logger from '../utils/logger.js';

const router = express.Router();

router.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === config.whatsapp.webhookVerifyToken) {
    logger.info('Webhook verified successfully');
    res.status(200).send(challenge);
  } else {
    logger.warn('Webhook verification failed', { mode, token });
    res.sendStatus(403);
  }
});

router.post('/webhook', async (req, res) => {
  try {
    const body = req.body;

    if (body.object !== 'whatsapp_business_account') {
      return res.sendStatus(404);
    }

    res.sendStatus(200);

    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field !== 'messages') continue;

        const value = change.value;
        
        if (!value.messages) continue;

        for (const message of value.messages) {
          const from = message.from;
          const messageId = message.id;
          const messageType = message.type;

          logger.info('Received message', { from, messageId, messageType });

          await whatsAppClient.markAsRead(messageId);

          if (messageType === 'text') {
            const text = message.text?.body;
            await stateMachine.processMessage(from, text, 'text');
          } 
          else if (messageType === 'image') {
            const imageId = message.image?.id;
            
            if (!imageId) {
              logger.warn('Image message without media ID', { messageId });
              continue;
            }

            try {
              const mediaData = await whatsAppClient.downloadMedia(imageId);
              await stateMachine.processMessage(from, mediaData, 'image');
            } catch (error) {
              logger.error('Error downloading or processing image', { 
                from, 
                imageId, 
                error: error.message,
              });
              
              await whatsAppClient.sendMessage(
                from,
                '❌ No pude descargar la imagen. Por favor, intenta enviarla de nuevo.'
              );
            }
          }
          else {
            await whatsAppClient.sendMessage(
              from,
              '⚠️ Solo puedo procesar mensajes de texto e imágenes. Por favor, envía una foto de tu ticket.'
            );
          }
        }
      }
    }
  } catch (error) {
    logger.error('Error processing webhook', { 
      error: error.message,
      stack: error.stack,
    });
  }
});

export default router;
