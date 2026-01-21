import { query } from '../database/index.js';
import logger from '../utils/logger.js';

export class TicketRepository {
  async create(ticketData) {
    try {
      const {
        userId,
        phoneNumber,
        storeName,
        totalAmount,
        currency,
        date,
        ticketNumber,
        rawOcrText,
        imageUrl,
        status = 'pending',
      } = ticketData;

      const result = await query(
        `INSERT INTO tickets 
        (user_id, phone_number, store_name, total_amount, currency, date, ticket_number, raw_ocr_text, image_url, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *`,
        [userId, phoneNumber, storeName, totalAmount, currency, date, ticketNumber, rawOcrText, imageUrl, status]
      );

      return result.rows[0];
    } catch (error) {
      logger.error('Error creating ticket', { ticketData, error });
      throw error;
    }
  }

  async updateStatus(ticketId, status, errorMessage = null) {
    try {
      const result = await query(
        'UPDATE tickets SET status = $1, error_message = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
        [status, errorMessage, ticketId]
      );
      return result.rows[0];
    } catch (error) {
      logger.error('Error updating ticket status', { ticketId, status, error });
      throw error;
    }
  }

  async findByPhone(phoneNumber, limit = 10) {
    try {
      const result = await query(
        'SELECT * FROM tickets WHERE phone_number = $1 ORDER BY created_at DESC LIMIT $2',
        [phoneNumber, limit]
      );
      return result.rows;
    } catch (error) {
      logger.error('Error finding tickets by phone', { phoneNumber, error });
      throw error;
    }
  }

  async findById(ticketId) {
    try {
      const result = await query(
        'SELECT * FROM tickets WHERE id = $1',
        [ticketId]
      );
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error finding ticket by id', { ticketId, error });
      throw error;
    }
  }
}

const ticketRepository = new TicketRepository();
export default ticketRepository;
