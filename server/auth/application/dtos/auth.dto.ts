/**
 * Auth DTOs - Application Layer
 * Data Transfer Objects for authentication operations
 */
import { User, UserSession } from '../../domain/entities/user.entity';

export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginOutput {
  success: boolean;
  user?: UserSession;
  error?: string;
}

export interface RegisterInput {
  username: string;
  displayName: string;
  email: string;
  password: string;
  role?: 'admin' | 'editor' | 'viewer';
}

export interface RegisterOutput {
  success: boolean;
  user?: UserSession;
  error?: string;
}

export interface CheckSessionInput {
  userId: string;
}

export interface CheckSessionOutput {
  success: boolean;
  user?: UserSession;
  error?: string;
}

export interface LogoutInput {
  userId: string;
}

export interface LogoutOutput {
  success: boolean;
  error?: string;
}
