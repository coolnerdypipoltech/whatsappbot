import axios from 'axios';
import { config } from '../config/index.js';
import logger from '../utils/logger.js';

export class WhatsAppClient {
  constructor() {
    this.apiUrl = config.whatsapp.apiUrl;
    this.phoneNumberId = config.whatsapp.phoneNumberId;
    this.accessToken = config.whatsapp.accessToken;
  }

  async sendMessage(to, message) {
    try {
      const url = `${this.apiUrl}/${this.phoneNumberId}/messages`;
      
      const response = await axios.post(
        url,
        {
          messaging_product: 'whatsapp',
          to,
          type: 'text',
          text: { body: message },
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      logger.info('Message sent successfully', { to, messageId: response.data.messages?.[0]?.id });
      return response.data;
    } catch (error) {
      logger.error('Error sending WhatsApp message', {
        to,
        error: error.response?.data || error.message,
      });
      throw error;
    }
  }

  async markAsRead(messageId) {
    try {
      const url = `${this.apiUrl}/${this.phoneNumberId}/messages`;
      
      await axios.post(
        url,
        {
          messaging_product: 'whatsapp',
          status: 'read',
          message_id: messageId,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      logger.debug('Message marked as read', { messageId });
    } catch (error) {
      logger.error('Error marking message as read', { messageId, error: error.message });
    }
  }

  async downloadMedia(mediaId) {
    try {
      const urlInfo = `${this.apiUrl}/${mediaId}`;
      
      const infoResponse = await axios.get(urlInfo, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      });

      const mediaUrl = infoResponse.data.url;
      
      const mediaResponse = await axios.get(mediaUrl, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
        responseType: 'arraybuffer',
      });

      logger.info('Media downloaded successfully', { mediaId });
      
      return {
        buffer: Buffer.from(mediaResponse.data),
        mimeType: infoResponse.data.mime_type,
        url: mediaUrl,
      };
    } catch (error) {
      logger.error('Error downloading media', {
        mediaId,
        error: error.response?.data || error.message,
      });
      throw error;
    }
  }
}

const whatsAppClient = new WhatsAppClient();
export default whatsAppClient;
