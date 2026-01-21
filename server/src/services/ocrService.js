import OpenAI from 'openai';
import { config } from '../config/index.js';
import logger from '../utils/logger.js';

export class OCRService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: config.openai.apiKey,
    });
  }

  async extractTextFromImage(imageBuffer) {
    try {
      const base64Image = imageBuffer.toString('base64');
      
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extract all the text from this image. Return only the raw text without any additional formatting or explanation.',
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`,
                },
              },
            ],
          },
        ],
        max_tokens: 1000,
      });

      const extractedText = response.choices[0].message.content.trim();
      
      logger.info('OCR completed successfully', { 
        textLength: extractedText.length,
        tokensUsed: response.usage.total_tokens,
      });

      return extractedText;
    } catch (error) {
      logger.error('Error in OCR extraction', { 
        error: error.message,
        type: error.type,
      });
      throw new Error('Failed to extract text from image');
    }
  }
}

const ocrService = new OCRService();
export default ocrService;
