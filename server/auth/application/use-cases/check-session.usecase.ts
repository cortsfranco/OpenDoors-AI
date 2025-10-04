/**
 * Check Session Use Case - Application Layer
 * Handles session validation logic
 */
import { injectable, inject } from 'inversify';
import { IUserRepository } from '../../domain/repositories/user.repository';
import { CheckSessionInput, CheckSessionOutput, UserSession } from '../dtos/auth.dto';

@injectable()
export class CheckSessionUseCase {
  constructor(@inject("UserRepository") private userRepository: IUserRepository) {}

  async execute(input: CheckSessionInput): Promise<CheckSessionOutput> {
    try {
      const user = await this.userRepository.findById(input.userId);
      
      if (!user || !user.isActive) {
        return {
          success: false,
          error: 'Usuario no encontrado o inactivo'
        };
      }

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
      console.error('Check session error:', error);
      return {
        success: false,
        error: 'Error interno del servidor'
      };
    }
  }
}
