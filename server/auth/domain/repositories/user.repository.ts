/**
 * User Repository Interface - Domain Layer
 * Defines the contract for user data access
 */
import { User, LoginCredentials, RegisterData } from '../entities/user.entity';

export interface IUserRepository {
  // User CRUD operations
  findById(id: string): Promise<User | undefined>;
  findByEmail(email: string): Promise<User | undefined>;
  findByUsername(username: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(userData: RegisterData): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  updateUserPassword(id: string, hashedPassword: string): Promise<void>;
  updateUserLastLogin(id: string): Promise<void>;
  updateUserAvatar(id: string, avatarPath: string): Promise<void>;
  deleteUser(id: string): Promise<boolean>;
  
  // User configuration
  updateUserConfiguration(id: string, config: {
    decimalSeparator?: ',' | '.';
    thousandSeparator?: '.' | ',' | ' ' | 'none';
    decimalPlaces?: number;
    currencySymbol?: string;
    currencyPosition?: 'before' | 'after';
    roundingMode?: 'round' | 'ceil' | 'floor';
    fiscalPeriod?: 'calendar' | 'may_april';
  }): Promise<User | undefined>;
  
  // Authentication helpers
  validateCredentials(credentials: LoginCredentials): Promise<User | null>;
  isEmailAvailable(email: string): Promise<boolean>;
  isUsernameAvailable(username: string): Promise<boolean>;
}
