import { query } from '../database/index.js';
import { UserState } from '../constants/index.js';
import logger from '../utils/logger.js';

export class UserRepository {
  async findByPhone(phoneNumber) {
    try {
      const result = await query(
        'SELECT * FROM users WHERE phone_number = $1',
        [phoneNumber]
      );
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error finding user by phone', { phoneNumber, error });
      throw error;
    }
  }

  async create(phoneNumber, state = UserState.WELCOME) {
    try {
      const result = await query(
        'INSERT INTO users (phone_number, state) VALUES ($1, $2) RETURNING *',
        [phoneNumber, state]
      );
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating user', { phoneNumber, error });
      throw error;
    }
  }

  async updateState(phoneNumber, state) {
    try {
      const result = await query(
        'UPDATE users SET state = $1, updated_at = CURRENT_TIMESTAMP WHERE phone_number = $2 RETURNING *',
        [state, phoneNumber]
      );
      return result.rows[0];
    } catch (error) {
      logger.error('Error updating user state', { phoneNumber, state, error });
      throw error;
    }
  }

  async findOrCreate(phoneNumber) {
    try {
      let user = await this.findByPhone(phoneNumber);
      if (!user) {
        user = await this.create(phoneNumber);
        logger.info('New user created', { phoneNumber });
      }
      return user;
    } catch (error) {
      logger.error('Error in findOrCreate', { phoneNumber, error });
      throw error;
    }
  }
}

const userRepository = new UserRepository();
export default userRepository;
