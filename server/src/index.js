import express from 'express';
import dotenv from 'dotenv';
import { config } from './config/index.js';
import logger from './utils/logger.js';
import webhookRouter from './routes/webhook.js';
import { runMigrations } from './database/migrate.js';
import pool from './database/index.js';

dotenv.config();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  logger.info('Incoming request', {
    method: req.method,
    path: req.path,
    ip: req.ip,
  });
  next();
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'whatsapp-ticket-bot',
  });
});

app.use('/api', webhookRouter);

app.use((err, req, res, next) => {
  logger.error('Unhandled error', { 
    error: err.message, 
    stack: err.stack,
    path: req.path,
  });
  
  res.status(500).json({ 
    error: 'Internal server error',
    message: config.nodeEnv === 'development' ? err.message : undefined,
  });
});

async function startServer() {
  try {
    logger.info('Running database migrations...');
    await runMigrations();
    
    await pool.query('SELECT NOW()');
    logger.info('Database connection successful');

    app.listen(config.port, () => {
      logger.info(`Server started successfully`, {
        port: config.port,
        env: config.nodeEnv,
      });
      console.log(`🚀 Server running on port ${config.port}`);
      console.log(`📱 WhatsApp webhook: http://localhost:${config.port}/api/webhook`);
    });
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason, promise });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { error });
  process.exit(1);
});

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await pool.end();
  process.exit(0);
});

startServer();
