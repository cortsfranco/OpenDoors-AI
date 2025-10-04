/**
 * Register Use Case - Application Layer
 * Handles user registration logic
 */
import { injectable, inject } from 'inversify';
import { IUserRepository } from '../../domain/repositories/user.repository';
import { RegisterInput, RegisterOutput, UserSession } from '../dtos/auth.dto';
import bcrypt from 'bcrypt';

@injectable()
export class RegisterUseCase {
  constructor(@inject("UserRepository") private userRepository: IUserRepository) {}

  async execute(input: RegisterInput): Promise<RegisterOutput> {
    try {
      // Check if email is already taken
      const emailAvailable = await this.userRepository.isEmailAvailable(input.email);
      if (!emailAvailable) {
        return {
          success: false,
          error: 'Este email ya está registrado'
        };
      }

      // Check if username is already taken
      const usernameAvailable = await this.userRepository.isUsernameAvailable(input.username);
      if (!usernameAvailable) {
        return {
          success: false,
          error: 'Este nombre de usuario ya está en uso'
        };
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(input.password, 10);

      // Create user
      const userData = {
        username: input.username,
        displayName: input.displayName,
        email: input.email,
        password: hashedPassword,
        role: input.role || 'viewer'
      };

      const newUser = await this.userRepository.createUser(userData);

      // Create user session
      const userSession: UserSession = {
        userId: newUser.id,
        username: newUser.username,
        displayName: newUser.displayName,
        email: newUser.email,
        role: newUser.role,
        isActive: newUser.isActive,
        fiscalPeriod: newUser.fiscalPeriod,
        decimalSeparator: newUser.decimalSeparator,
        thousandSeparator: newUser.thousandSeparator,
        decimalPlaces: newUser.decimalPlaces,
        currencySymbol: newUser.currencySymbol,
        currencyPosition: newUser.currencyPosition,
        roundingMode: newUser.roundingMode
      };

      return {
        success: true,
        user: userSession
      };
    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        error: 'Error interno del servidor'
      };
    }
  }
}
