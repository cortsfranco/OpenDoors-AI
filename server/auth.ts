import bcrypt from 'bcrypt';
import { type Request, type Response, type NextFunction } from 'express';
import { storage } from './storage';
import { type User, type UserSession } from '@shared/schema';

declare module 'express-session' {
  interface SessionData {
    user?: UserSession;
  }
}

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

export async function loginUser(email: string, password: string, ipAddress?: string): Promise<UserSession | null> {
  const user = await storage.getUserByEmail(email);
  
  if (!user || !user.isActive) {
    return null;
  }

  const isValid = await verifyPassword(password, user.password);
  if (!isValid) {
    await storage.createActivityLog({
      userId: user.id,
      userName: user.displayName,
      actionType: 'login',
      entityType: 'user',
      entityId: user.id,
      description: `Failed login attempt for ${email}`,
      metadata: JSON.stringify({ email, success: false }),
      ipAddress
    });
    return null;
  }

  await storage.updateUserLastLogin(user.id);
  
  await storage.createActivityLog({
    userId: user.id,
    userName: user.displayName,
    actionType: 'login',
    entityType: 'user',
    entityId: user.id,
    description: `User ${user.displayName} logged in successfully`,
    metadata: JSON.stringify({ email, success: true }),
    ipAddress
  });

  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role
  };
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  next();
}

export function requireRole(...roles: ('admin' | 'editor' | 'viewer')[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.session.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    if (!roles.includes(req.session.user.role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    
    next();
  };
}