/**
 * Login Use Case - Application Layer
 * Handles user authentication logic
 */
import { injectable, inject } from 'inversify';
import { IUserRepository } from '../../domain/repositories/user.repository';
import { LoginInput, LoginOutput, UserSession } from '../dtos/auth.dto';
import { LoginCredentials } from '../../domain/entities/user.entity';
import bcrypt from 'bcrypt';

@injectable()
export class LoginUseCase {
  constructor(@inject("UserRepository") private userRepository: IUserRepository) {}

  async execute(input: LoginInput): Promise<LoginOutput> {
    try {
      // Validate credentials
      const credentials: LoginCredentials = {
        email: input.email,
        password: input.password
      };

      const user = await this.userRepository.validateCredentials(credentials);
      
      if (!user) {
        return {
          success: false,
          error: 'Credenciales inválidas'
        };
      }

      // Update last login
      await this.userRepository.updateUserLastLogin(user.id);

      // Create user session
      const userSession: UserSession = {
        userId: user.id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        fiscalPeriod: user.fiscalPeriod,
        decimalSeparator: user.decimalSeparator,
        thousandSeparator: user.thousandSeparator,
        decimalPlaces: user.decimalPlaces,
        currencySymbol: user.currencySymbol,
        currencyPosition: user.currencyPosition,
        roundingMode: user.roundingMode
      };

      return {
        success: true,
        user: userSession
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: 'Error interno del servidor'
      };
    }
  }
}
