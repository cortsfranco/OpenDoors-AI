/**
 * User Entity - Domain Layer
 * Represents the core business entity for users
 */
export interface User {
  id: string;
  username: string;
  displayName: string;
  email: string;
  password: string;
  avatar?: string;
  companyLogo?: string;
  role: 'admin' | 'editor' | 'viewer';
  isActive: boolean;
  lastLoginAt?: Date;
  fiscalPeriod: 'calendar' | 'may_april';
  decimalSeparator: ',' | '.';
  thousandSeparator: '.' | ',' | ' ' | 'none';
  decimalPlaces: number;
  currencySymbol: string;
  currencyPosition: 'before' | 'after';
  roundingMode: 'round' | 'ceil' | 'floor';
  createdAt: Date;
}

export interface UserSession {
  userId: string;
  username: string;
  displayName: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
  isActive: boolean;
  fiscalPeriod: 'calendar' | 'may_april';
  decimalSeparator: ',' | '.';
  thousandSeparator: '.' | ',' | ' ' | 'none';
  decimalPlaces: number;
  currencySymbol: string;
  currencyPosition: 'before' | 'after';
  roundingMode: 'round' | 'ceil' | 'floor';
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  username: string;
  displayName: string;
  email: string;
  password: string;
  role?: 'admin' | 'editor' | 'viewer';
}
