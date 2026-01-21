import OpenAI from 'openai';
import { config } from '../config/index.js';
import logger from '../utils/logger.js';

export class AIService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: config.openai.apiKey,
    });
  }

  async normalizeTicketData(ocrText) {
    try {
      const systemPrompt = `You are an expert at extracting structured data from purchase receipts/tickets.
Your task is to analyze the provided text and extract the following fields:
- store_name: The name of the store or business
- total_amount: The total amount paid (numeric value only)
- currency: The currency symbol or code (e.g., USD, EUR, $, €)
- date: The purchase date in ISO format (YYYY-MM-DD)
- ticket_number: The receipt/ticket number or transaction ID

IMPORTANT:
- If the text does NOT appear to be a valid purchase receipt/ticket, return: {"valid": false, "reason": "explanation"}
- If it IS a valid receipt, return: {"valid": true, "data": {...extracted fields...}}
- All amounts should be numbers without currency symbols
- Use null for fields that cannot be determined
- Be strict: only consider actual receipts/tickets as valid

Return ONLY valid JSON, no additional text.`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: `Extract the ticket data from this text:\n\n${ocrText}`,
          },
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      });

      const result = JSON.parse(response.choices[0].message.content);
      
      logger.info('AI normalization completed', { 
        valid: result.valid,
        tokensUsed: response.usage.total_tokens,
      });

      if (!result.valid) {
        return {
          valid: false,
          reason: result.reason || 'Invalid ticket format',
        };
      }

      return {
        valid: true,
        data: {
          storeName: result.data.store_name || null,
          totalAmount: result.data.total_amount ? parseFloat(result.data.total_amount) : null,
          currency: result.data.currency || null,
          date: result.data.date || null,
          ticketNumber: result.data.ticket_number || null,
        },
      };
    } catch (error) {
      logger.error('Error in AI normalization', { 
        error: error.message,
        ocrTextLength: ocrText?.length,
      });
      
      return {
        valid: false,
        reason: 'Error processing ticket data',
      };
    }
  }
}

const aiService = new AIService();
export default aiService;
