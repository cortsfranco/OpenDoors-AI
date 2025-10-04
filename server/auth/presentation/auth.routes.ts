/**
 * Auth Routes - Presentation Layer
 * Express routes for authentication operations following Clean Architecture
 */
import { Router, Request, Response } from 'express';
import { requireAuth } from '../../auth'; // Existing auth middleware
import { container } from '../../inversify.config';

// Import the use cases
import { LoginUseCase } from '../application/use-cases/login.usecase';
import { RegisterUseCase } from '../application/use-cases/register.usecase';
import { CheckSessionUseCase } from '../application/use-cases/check-session.usecase';

const router = Router();

// --- Dependency Injection with InversifyJS ---
const loginUseCase = container.get<LoginUseCase>("LoginUseCase");
const registerUseCase = container.get<RegisterUseCase>("RegisterUseCase");
const checkSessionUseCase = container.get<CheckSessionUseCase>("CheckSessionUseCase");
// ---

// POST /api/auth/login - User login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        message: "Email y contraseña son requeridos" 
      });
    }

    const result = await loginUseCase.execute({ email, password });

    if (!result.success) {
      return res.status(401).json({ 
        message: result.error 
      });
    }

    // Set session
    req.session.userId = result.user!.userId;
    req.session.userName = result.user!.displayName;
    req.session.user = result.user;

    res.json({
      user: result.user,
      message: "Inicio de sesión exitoso"
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: "Error al iniciar sesión" });
  }
});

// POST /api/auth/register - User registration
router.post('/register', async (req: Response, res: Response) => {
  try {
    const { username, displayName, email, password } = req.body;

    if (!username || !displayName || !email || !password) {
      return res.status(400).json({ 
        message: "Todos los campos son requeridos" 
      });
    }

    const result = await registerUseCase.execute({
      username,
      displayName,
      email,
      password
    });

    if (!result.success) {
      return res.status(400).json({ 
        message: result.error 
      });
    }

    // Set session
    req.session.userId = result.user!.userId;
    req.session.userName = result.user!.displayName;
    req.session.user = result.user;

    res.status(201).json({
      user: result.user,
      message: "Usuario registrado exitosamente"
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: "Error al registrar usuario" });
  }
});

// POST /api/auth/logout - User logout
router.post('/logout', requireAuth, async (req: Request, res: Response) => {
  try {
    // Log activity if user exists
    if (req.session.user) {
      // Activity logging would go here if needed
    }

    // Clear session
    req.session.destroy((err) => {
      if (err) {
        console.error('Session destruction error:', err);
        return res.status(500).json({ message: "Error al cerrar sesión" });
      }
      
      res.clearCookie('connect.sid');
      res.json({ message: "Sesión cerrada exitosamente" });
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: "Error al cerrar sesión" });
  }
});

// GET /api/auth/me - Get current user
router.get('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const result = await checkSessionUseCase.execute({
      userId: req.session.userId!
    });

    if (!result.success) {
      return res.status(401).json({ 
        error: result.error 
      });
    }

    res.json({
      user: result.user,
      message: "Usuario autenticado"
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: "Error al obtener información del usuario" });
  }
});

export default router;
