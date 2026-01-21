import { query } from './index.js';
import logger from '../utils/logger.js';

const migrations = [
  {
    version: 1,
    name: 'create_users_table',
    up: `
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        phone_number VARCHAR(50) UNIQUE NOT NULL,
        state VARCHAR(50) NOT NULL DEFAULT 'WELCOME',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX idx_users_phone ON users(phone_number);
    `,
  },
  {
    version: 2,
    name: 'create_tickets_table',
    up: `
      CREATE TABLE IF NOT EXISTS tickets (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        phone_number VARCHAR(50) NOT NULL,
        store_name VARCHAR(255),
        total_amount DECIMAL(10, 2),
        currency VARCHAR(10),
        date DATE,
        ticket_number VARCHAR(100),
        raw_ocr_text TEXT,
        image_url TEXT,
        status VARCHAR(50) DEFAULT 'pending',
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX idx_tickets_user ON tickets(user_id);
      CREATE INDEX idx_tickets_phone ON tickets(phone_number);
    `,
  },
  {
    version: 3,
    name: 'create_migrations_table',
    up: `
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        version INTEGER UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `,
  },
];

export async function runMigrations() {
  try {
    await query(migrations[2].up);
    
    for (const migration of migrations) {
      const result = await query(
        'SELECT * FROM migrations WHERE version = $1',
        [migration.version]
      );
      
      if (result.rows.length === 0) {
        logger.info(`Running migration: ${migration.name}`);
        await query(migration.up);
        await query(
          'INSERT INTO migrations (version, name) VALUES ($1, $2)',
          [migration.version, migration.name]
        );
        logger.info(`Migration completed: ${migration.name}`);
      }
    }
    
    logger.info('All migrations completed successfully');
  } catch (error) {
    logger.error('Migration failed', { error });
    throw error;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
