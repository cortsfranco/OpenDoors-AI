/**
 * Drizzle User Repository - Infrastructure Layer
 * Concrete implementation of user repository using Drizzle ORM
 */
import { IUserRepository } from '../../domain/repositories/user.repository';
import { User, LoginCredentials, RegisterData } from '../../domain/entities/user.entity';
import { storage } from '../../../storage'; // Reusing existing storage implementation
import bcrypt from 'bcrypt';

export class DrizzleUserRepository implements IUserRepository {
  async findById(id: string): Promise<User | undefined> {
    return await storage.getUser(id);
  }

  async findByEmail(email: string): Promise<User | undefined> {
    return await storage.getUserByEmail(email);
  }

  async findByUsername(username: string): Promise<User | undefined> {
    return await storage.getUserByUsername(username);
  }

  async getAllUsers(): Promise<User[]> {
    return await storage.getAllUsers();
  }

  async createUser(userData: RegisterData): Promise<User> {
    return await storage.createUser(userData);
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    return await storage.updateUser(id, updates);
  }

  async updateUserPassword(id: string, hashedPassword: string): Promise<void> {
    return await storage.updateUserPassword(id, hashedPassword);
  }

  async updateUserLastLogin(id: string): Promise<void> {
    return await storage.updateUserLastLogin(id);
  }

  async updateUserAvatar(id: string, avatarPath: string): Promise<void> {
    return await storage.updateUserAvatar(id, avatarPath);
  }

  async deleteUser(id: string): Promise<boolean> {
    return await storage.deleteUser(id);
  }

  async updateUserConfiguration(id: string, config: {
    decimalSeparator?: ',' | '.';
    thousandSeparator?: '.' | ',' | ' ' | 'none';
    decimalPlaces?: number;
    currencySymbol?: string;
    currencyPosition?: 'before' | 'after';
    roundingMode?: 'round' | 'ceil' | 'floor';
    fiscalPeriod?: 'calendar' | 'may_april';
  }): Promise<User | undefined> {
    return await storage.updateUserConfiguration(id, config);
  }

  async validateCredentials(credentials: LoginCredentials): Promise<User | null> {
    const user = await this.findByEmail(credentials.email);
    if (!user || !user.isActive) {
      return null;
    }

    const isValidPassword = await bcrypt.compare(credentials.password, user.password);
    return isValidPassword ? user : null;
  }

  async isEmailAvailable(email: string): Promise<boolean> {
    const existingUser = await this.findByEmail(email);
    return !existingUser;
  }

  async isUsernameAvailable(username: string): Promise<boolean> {
    const existingUser = await this.findByUsername(username);
    return !existingUser;
  }
}
