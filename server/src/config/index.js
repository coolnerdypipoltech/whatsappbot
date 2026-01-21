export const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  whatsapp: {
    apiUrl: process.env.WHATSAPP_API_URL,
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
    webhookVerifyToken: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN,
  },
  
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
  },
  
  database: {
    url: process.env.DATABASE_URL,
  },
};
