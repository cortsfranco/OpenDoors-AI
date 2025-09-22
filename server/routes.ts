import type { Express } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { storage } from "./storage";
import { z } from "zod";
import {
  insertInvoiceSchema,
  insertClientProviderSchema,
  fiscalPeriodQuerySchema,
  ivaComponentCreateSchema,
  paymentStatusUpdateSchema,
  excelImportSchema,
  userConfigUpdateSchema,
  insertInvoiceTemplateSchema
} from "@shared/schema";
import { invoiceProcessor } from "./ai/invoiceProcessor";
import { pythonAIProxy } from "./python-proxy";
import { azureProcessor } from "./azure-ai-processor";
import { loginUser, requireAuth, requireRole, hashPassword } from "./auth";
import multer from "multer";
import path from "path";
import fs from "fs";
import { Pool } from "pg";
import * as XLSX from "xlsx";
import { wsManager } from "./websocket";
import { uploadJobManager, UploadJobManager } from "./uploadJobManager";

// Configure multer for file uploads
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  dest: uploadDir,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(null, false);
    }
  },
});

// Configure multer for Excel file uploads
const excelUpload = multer({
  dest: uploadDir,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'application/octet-stream' // Sometimes Excel files are detected as this
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(null, false);
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup session middleware with fallback to memory store for development
  let sessionStore;
  
  if (process.env.DATABASE_URL) {
    // Use PostgreSQL session store in production
    const pgSession = connectPgSimple(session);
    const sessionPool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    sessionStore = new pgSession({
      pool: sessionPool,
      createTableIfMissing: true,
    });
  } else {
    // Use memory store in development
    console.warn("⚠️ Using memory session store - sessions will not persist across server restarts");
    sessionStore = new session.MemoryStore();
  }

  app.use(
    session({
      store: sessionStore,
      secret: process.env.SESSION_SECRET || 'opendoors-secret-key-change-this-in-production',
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      },
    })
  );

  // Authentication Routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { username, displayName, email, password } = req.body;

      // Validate required fields
      if (!username || !displayName || !email || !password) {
        return res.status(400).json({ 
          message: "Todos los campos son requeridos" 
        });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ 
          message: "Este email ya está registrado" 
        });
      }

      const existingUsername = await storage.getUserByUsername(username);
      if (existingUsername) {
        return res.status(400).json({ 
          message: "Este nombre de usuario ya está en uso" 
        });
      }

      // Hash password and create user
      const hashedPassword = await hashPassword(password);
      const newUser = await storage.createUser({
        username,
        displayName,
        email,
        password: hashedPassword,
        role: 'viewer', // Default role for new users
        isActive: true,
        fiscalPeriod: 'calendar',
      });

      // Log registration activity
      await storage.createActivityLog({
        userId: newUser.id,
        userName: newUser.displayName,
        actionType: 'create',
        entityType: 'user',
        entityId: newUser.id,
        description: `Nuevo usuario registrado: ${newUser.displayName}`,
        metadata: JSON.stringify({ email: newUser.email }),
        ipAddress: req.ip || req.connection.remoteAddress
      });

      res.status(201).json({
        message: "Registro exitoso",
        user: {
          id: newUser.id,
          displayName: newUser.displayName,
          email: newUser.email,
          role: newUser.role,
        }
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ message: "Error al registrar usuario" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Email y contraseña son requeridos" });
      }

      const ipAddress = req.ip || req.connection.remoteAddress;
      const userSession = await loginUser(email, password, ipAddress);

      if (!userSession) {
        return res.status(401).json({ message: "Credenciales inválidas" });
      }

      req.session.user = userSession;
      res.json({
        user: userSession,
        message: "Inicio de sesión exitoso"
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: "Error al iniciar sesión" });
    }
  });

  app.post("/api/auth/logout", requireAuth, async (req, res) => {
    try {
      const user = req.session.user;
      if (user) {
        await storage.createActivityLog({
          userId: user.id,
          userName: user.displayName,
          actionType: 'logout',
          entityType: 'user',
          entityId: user.id,
          description: `User ${user.displayName} logged out`,
          metadata: JSON.stringify({ email: user.email }),
          ipAddress: req.ip || req.connection.remoteAddress
        });
      }

      req.session.destroy((err) => {
        if (err) {
          console.error('Logout error:', err);
          return res.status(500).json({ message: "Error al cerrar sesión" });
        }
        res.json({ message: "Sesión cerrada exitosamente" });
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ message: "Error al cerrar sesión" });
    }
  });

  app.get("/api/auth/me", requireAuth, async (req, res) => {
    try {
      // Fetch fresh user data from database instead of returning cached session
      const userId = req.session.user!.id;
      const freshUser = await storage.getUser(userId);
      
      if (!freshUser) {
        return res.status(404).json({ error: "Usuario no encontrado" });
      }
      
      // Update session with fresh data including configuration
      req.session.user = {
        id: freshUser.id,
        displayName: freshUser.displayName,
        email: freshUser.email,
        role: freshUser.role,
        avatar: freshUser.avatar,
        decimalSeparator: freshUser.decimalSeparator,
        thousandSeparator: freshUser.thousandSeparator,
        decimalPlaces: freshUser.decimalPlaces,
        currencySymbol: freshUser.currencySymbol,
        currencyPosition: freshUser.currencyPosition,
        roundingMode: freshUser.roundingMode,
        fiscalPeriod: freshUser.fiscalPeriod,
      };
      
      res.json({ user: req.session.user });
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ error: "Error al obtener información del usuario" });
    }
  });

  // User Management (admin only)
  app.get("/api/users", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ error: "Error al obtener usuarios" });
    }
  });

  app.post("/api/users", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const { username, displayName, email, password, role } = req.body;
      
      if (!username || !displayName || !email || !password) {
        return res.status(400).json({ error: "Todos los campos son requeridos" });
      }

      // Check if user exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({ error: "El email ya está registrado" });
      }

      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({
        username,
        displayName,
        email,
        password: hashedPassword,
        role: role || 'viewer',
        isActive: true,
      });

      // Log activity
      await storage.createActivityLog({
        userId: req.session.user!.id,
        userName: req.session.user!.displayName,
        actionType: 'create',
        entityType: 'user',
        entityId: user.id,
        description: `Creó usuario ${user.displayName} (${user.email})`,
        metadata: JSON.stringify({ role: user.role }),
        ipAddress: req.ip,
      });

      res.json(user);
    } catch (error) {
      console.error('Error creating user:', error);
      res.status(500).json({ error: "Error al crear usuario" });
    }
  });

  app.put("/api/users/:id", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const { displayName, email, role, isActive } = req.body;
      const userId = req.params.id;

      const updates: any = {};
      if (displayName !== undefined) updates.displayName = displayName;
      if (email !== undefined) updates.email = email;
      if (role !== undefined) updates.role = role;
      if (isActive !== undefined) updates.isActive = isActive;

      const user = await storage.updateUser(userId, updates);
      
      if (!user) {
        return res.status(404).json({ error: "Usuario no encontrado" });
      }

      // Log activity
      await storage.createActivityLog({
        userId: req.session.user!.id,
        userName: req.session.user!.displayName,
        actionType: 'update',
        entityType: 'user',
        entityId: userId,
        description: `Actualizó usuario ${user.displayName}`,
        metadata: JSON.stringify(updates),
        ipAddress: req.ip,
      });

      res.json(user);
    } catch (error) {
      console.error('Error updating user:', error);
      res.status(500).json({ error: "Error al actualizar usuario" });
    }
  });

  app.delete("/api/users/:id", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const userId = req.params.id;
      
      // Prevent self-deletion
      if (userId === req.session.user!.id) {
        return res.status(400).json({ error: "No puedes eliminar tu propio usuario" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "Usuario no encontrado" });
      }

      const success = await storage.deleteUser(userId);
      
      if (success) {
        // Log activity
        await storage.createActivityLog({
          userId: req.session.user!.id,
          userName: req.session.user!.displayName,
          actionType: 'delete',
          entityType: 'user',
          entityId: userId,
          description: `Eliminó usuario ${user.displayName}`,
          metadata: JSON.stringify({ deletedUser: user.email }),
          ipAddress: req.ip,
        });

        res.json({ success: true, message: "Usuario eliminado" });
      } else {
        res.status(500).json({ error: "Error al eliminar usuario" });
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({ error: "Error al eliminar usuario" });
    }
  });

  // Profile Management (current user)
  app.put("/api/auth/profile", requireAuth, async (req, res) => {
    try {
      const { name, email } = req.body;
      const userId = req.session.user!.id;

      const updates: any = {};
      if (name !== undefined) updates.displayName = name;
      if (email !== undefined) updates.email = email;

      const user = await storage.updateUser(userId, updates);
      
      if (!user) {
        return res.status(404).json({ error: "Usuario no encontrado" });
      }

      // Update session
      req.session.user = {
        ...req.session.user!,
        displayName: user.displayName,
        email: user.email,
      };

      res.json({ message: "Perfil actualizado", user });
    } catch (error) {
      console.error('Error updating profile:', error);
      res.status(500).json({ error: "Error al actualizar perfil" });
    }
  });

  app.post("/api/auth/change-password", requireAuth, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.session.user!.id;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: "Se requieren ambas contraseñas" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "Usuario no encontrado" });
      }

      // Verify current password
      const bcrypt = require('bcrypt');
      const isValid = await bcrypt.compare(currentPassword, user.password);
      
      if (!isValid) {
        return res.status(401).json({ error: "Contraseña actual incorrecta" });
      }

      // Hash and update new password
      const hashedPassword = await hashPassword(newPassword);
      await storage.updateUserPassword(userId, hashedPassword);

      res.json({ message: "Contraseña actualizada exitosamente" });
    } catch (error) {
      console.error('Error changing password:', error);
      res.status(500).json({ error: "Error al cambiar contraseña" });
    }
  });

  app.put("/api/auth/configuration", requireAuth, async (req, res) => {
    try {
      const userId = req.session.user!.id;
      
      // Validate and parse configuration using Zod schema
      const validatedConfig = userConfigUpdateSchema.parse(req.body);

      const updatedUser = await storage.updateUserConfiguration(userId, validatedConfig);
      
      if (!updatedUser) {
        return res.status(404).json({ error: "Usuario no encontrado" });
      }

      // Update session with fresh user data from database
      req.session.user = {
        id: updatedUser.id,
        displayName: updatedUser.displayName,
        email: updatedUser.email,
        role: updatedUser.role,
        avatar: updatedUser.avatar,
      };

      res.json({ 
        message: "Configuración actualizada exitosamente", 
        configuration: {
          decimalSeparator: updatedUser.decimalSeparator,
          thousandSeparator: updatedUser.thousandSeparator,
          decimalPlaces: updatedUser.decimalPlaces,
          currencySymbol: updatedUser.currencySymbol,
          currencyPosition: updatedUser.currencyPosition,
          roundingMode: updatedUser.roundingMode,
          fiscalPeriod: updatedUser.fiscalPeriod,
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Datos de configuración inválidos",
          details: error.errors[0].message
        });
      }
      console.error('Error updating configuration:', error);
      res.status(500).json({ error: "Error al actualizar configuración" });
    }
  });

  // Avatar upload endpoint
  app.post("/api/auth/avatar", requireAuth, upload.single('avatar'), async (req, res) => {
    try {
      const userId = req.session.user!.id;

      if (!req.file) {
        return res.status(400).json({ error: "No se proporcionó archivo" });
      }

      // Generate unique filename
      const timestamp = Date.now();
      const ext = path.extname(req.file.originalname);
      const filename = `avatar-${userId}-${timestamp}${ext}`;
      const avatarPath = path.join('uploads', 'avatars', filename);
      const fullPath = path.join(uploadDir, 'avatars', filename);

      // Create avatars directory if it doesn't exist
      const avatarsDir = path.join(uploadDir, 'avatars');
      if (!fs.existsSync(avatarsDir)) {
        fs.mkdirSync(avatarsDir, { recursive: true });
      }

      // Move file to avatars directory
      fs.renameSync(req.file.path, fullPath);

      // Update user avatar in database
      await storage.updateUserAvatar(userId, `/uploads/avatars/${filename}`);

      // Fetch the updated user from database to get fresh data
      const updatedUser = await storage.getUser(userId);
      
      if (!updatedUser) {
        return res.status(404).json({ error: "Usuario no encontrado" });
      }

      // Update session with the complete fresh user data
      req.session.user = {
        id: updatedUser.id,
        displayName: updatedUser.displayName,
        email: updatedUser.email,
        role: updatedUser.role,
        avatar: updatedUser.avatar,
      };

      res.json({ 
        message: "Avatar actualizado", 
        avatar: `/uploads/avatars/${filename}`,
        user: req.session.user 
      });
    } catch (error) {
      console.error('Error uploading avatar:', error);
      res.status(500).json({ error: "Error al subir avatar" });
    }
  });

  // Company logo upload (admin only)
  app.post("/api/auth/company-logo", requireAuth, upload.single('logo'), async (req, res) => {
    try {
      const userId = req.session.user!.id;
      const user = await storage.getUser(userId);
      
      // Check if user is admin
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ error: "Solo los administradores pueden cambiar el logo de la empresa" });
      }

      if (!req.file) {
        return res.status(400).json({ error: "No se proporcionó archivo" });
      }

      // Validate file type and size
      const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
      if (!validTypes.includes(req.file.mimetype)) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: "Tipo de archivo no válido. Use PNG, JPG o SVG" });
      }

      if (req.file.size > 5 * 1024 * 1024) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: "El archivo no puede superar los 5MB" });
      }

      // Generate unique filename
      const timestamp = Date.now();
      const ext = path.extname(req.file.originalname);
      const filename = `company-logo-${timestamp}${ext}`;
      const fullPath = path.join(uploadDir, 'logos', filename);

      // Create logos directory if it doesn't exist
      const logosDir = path.join(uploadDir, 'logos');
      if (!fs.existsSync(logosDir)) {
        fs.mkdirSync(logosDir, { recursive: true });
      }

      // Move file to logos directory
      fs.renameSync(req.file.path, fullPath);

      // Update company logo in database
      await storage.updateUser(userId, { companyLogo: `/uploads/logos/${filename}` });

      res.json({ 
        message: "Logo actualizado exitosamente", 
        logo: `/uploads/logos/${filename}`
      });
    } catch (error) {
      console.error('Error uploading company logo:', error);
      res.status(500).json({ error: "Error al subir logo" });
    }
  });

  // Remove company logo (admin only)
  app.delete("/api/auth/company-logo", requireAuth, async (req, res) => {
    try {
      const userId = req.session.user!.id;
      const user = await storage.getUser(userId);
      
      // Check if user is admin
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ error: "Solo los administradores pueden cambiar el logo de la empresa" });
      }

      // Remove logo from database
      await storage.updateUser(userId, { companyLogo: null });

      res.json({ message: "Logo eliminado exitosamente" });
    } catch (error) {
      console.error('Error removing company logo:', error);
      res.status(500).json({ error: "Error al eliminar logo" });
    }
  });

  // Activity Logs
  app.get("/api/activity-logs", requireAuth, async (req, res) => {
    try {
      const filters = {
        userId: req.query.userId as string,
        entityType: req.query.entityType as string,
        actionType: req.query.actionType as 'create' | 'update' | 'delete' | 'upload' | 'login' | 'logout',
        limit: req.query.limit ? parseInt(req.query.limit as string) : 100,
        offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
      };

      const logs = await storage.getActivityLogs(filters);
      res.json(logs);
    } catch (error) {
      console.error('Error fetching activity logs:', error);
      res.status(500).json({ error: "Error al obtener registros de actividad" });
    }
  });

  // KPIs and Dashboard
  app.get("/api/kpis", async (req, res) => {
    try {
      const kpis = await storage.getKPIData();
      res.json(kpis);
    } catch (error) {
      console.error('Error fetching KPIs:', error);
      res.status(500).json({ error: "Error al obtener los KPIs" });
    }
  });

  // Reports endpoint with month/year filtering
  app.get("/api/reports", async (req, res) => {
    try {
      const month = req.query.month ? parseInt(req.query.month as string) : undefined;
      const year = req.query.year ? parseInt(req.query.year as string) : undefined;
      const ownerName = req.query.ownerName as string | undefined;
      const clientProviderName = req.query.clientProviderName as string | undefined;
      const type = req.query.type as 'income' | 'expense' | undefined;
      
      const comprehensiveReport = await storage.getComprehensiveReport({
        month,
        year,
        ownerName,
        clientProviderName,
        type,
      });
      
      const kpis = await storage.getFilteredKPIData(month, year);
      
      res.json({
        ...comprehensiveReport,
        kpis,
      });
    } catch (error) {
      console.error('Error fetching filtered reports:', error);
      res.status(500).json({ error: "Error al obtener los reportes filtrados" });
    }
  });

  app.get("/api/chart-data", async (req, res) => {
    try {
      const chartData = await storage.getChartData();
      res.json(chartData);
    } catch (error) {
      console.error('Error fetching chart data:', error);
      res.status(500).json({ error: "Error al obtener los datos del gráfico" });
    }
  });

  app.get("/api/quick-stats", async (req, res) => {
    try {
      const stats = await storage.getQuickStats();
      res.json(stats);
    } catch (error) {
      console.error('Error fetching quick stats:', error);
      res.status(500).json({ error: "Error al obtener las estadísticas rápidas" });
    }
  });

  app.get("/api/recent-invoices", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const invoices = await storage.getRecentInvoices(limit);
      res.json(invoices);
    } catch (error) {
      console.error('Error fetching recent invoices:', error);
      res.status(500).json({ error: "Error al obtener las facturas recientes" });
    }
  });

  // User Statistics Routes
  app.get("/api/user-stats/current", requireAuth, async (req, res) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const userId = req.session.user!.id;
      const stats = await storage.getUserStatistics(userId, days);
      res.json(stats);
    } catch (error) {
      console.error('Error fetching current user stats:', error);
      res.status(500).json({ error: "Error al obtener estadísticas del usuario" });
    }
  });

  app.get("/api/user-stats/:userId", requireAuth, async (req, res) => {
    try {
      const { userId } = req.params;
      const days = parseInt(req.query.days as string) || 30;
      
      // Check if user has permission to view other users' stats (admin or self)
      if (req.session.user!.role !== 'admin' && req.session.user!.id !== userId) {
        return res.status(403).json({ error: "No autorizado para ver estas estadísticas" });
      }
      
      const stats = await storage.getUserStatistics(userId, days);
      res.json(stats);
    } catch (error) {
      console.error('Error fetching user stats:', error);
      res.status(500).json({ error: "Error al obtener estadísticas del usuario" });
    }
  });

  // Invoices CRUD
  app.get("/api/invoices", async (req, res) => {
    try {
      const filters = {
        search: req.query.search as string,
        month: req.query.month ? parseInt(req.query.month as string) : undefined,
        year: req.query.year ? parseInt(req.query.year as string) : undefined,
        user: req.query.user as string,
        type: req.query.type as 'income' | 'expense',
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
      };

      const result = await storage.getAllInvoices(filters);
      res.json(result);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      res.status(500).json({ error: "Error al obtener las facturas" });
    }
  });

  // Get invoices pending review (must be before :id route)
  app.get("/api/invoices/pending-review", async (req, res) => {
    try {
      const pendingInvoices = await storage.getInvoicesPendingReview();
      res.json(pendingInvoices);
    } catch (error) {
      console.error('Error fetching pending invoices:', error);
      res.status(500).json({ error: "Error al obtener facturas pendientes de revisión" });
    }
  });

  app.get("/api/invoices/:id", async (req, res) => {
    try {
      const invoice = await storage.getInvoice(req.params.id);
      if (!invoice) {
        return res.status(404).json({ error: "Factura no encontrada" });
      }
      res.json(invoice);
    } catch (error) {
      console.error('Error fetching invoice:', error);
      res.status(500).json({ error: "Error al obtener la factura" });
    }
  });

  // Endpoint para servir archivos de facturas
  app.get("/api/invoices/:id/file", async (req, res) => {
    try {
      const invoice = await storage.getInvoice(req.params.id);
      
      if (!invoice || !invoice.filePath) {
        return res.status(404).json({ error: "Archivo no encontrado" });
      }

      const filePath = invoice.filePath;
      
      // Verificar que el archivo existe
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "Archivo no encontrado en el servidor" });
      }

      // Determinar el tipo MIME basado en la extensión
      const ext = path.extname(filePath).toLowerCase();
      let mimeType = 'application/octet-stream';
      
      if (ext === '.pdf') {
        mimeType = 'application/pdf';
      } else if (ext === '.jpg' || ext === '.jpeg') {
        mimeType = 'image/jpeg';
      } else if (ext === '.png') {
        mimeType = 'image/png';
      }

      // Configurar headers para mostrar en el navegador (no descargar)
      res.set({
        'Content-Type': mimeType,
        'Content-Disposition': `inline; filename="${invoice.fileName || 'factura' + ext}"`,
        'Cache-Control': 'public, max-age=3600'
      });

      // Enviar el archivo
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
      
    } catch (error) {
      console.error('Error serving invoice file:', error);
      res.status(500).json({ error: "Error al obtener el archivo" });
    }
  });

  app.post("/api/invoices", upload.single('file'), async (req, res) => {
    try {
      const { uploadedBy, uploadedByName, ownerName, manualEntry, invoiceData } = req.body;

      if (!uploadedBy || !uploadedByName) {
        return res.status(400).json({ error: "Usuario requerido" });
      }
      
      // Use ownerName if provided, otherwise default to uploadedByName
      const invoiceOwnerName = ownerName || uploadedByName;

      // Handle manual entry
      if (manualEntry === 'true' && invoiceData) {
        const parsedData = JSON.parse(invoiceData);
        
        // Create or find client/provider for manual entry
        let clientProviderId = null;
        if (parsedData.clientProviderName) {
          let clientProvider = await storage.getClientProviderByName(parsedData.clientProviderName);
          
          if (!clientProvider) {
            clientProvider = await storage.createClientProvider({
              name: parsedData.clientProviderName,
              type: parsedData.type === 'income' ? 'client' : 'provider',
              cuit: parsedData.clientProviderCuit || null,
            });
          }
          
          clientProviderId = clientProvider.id;
        }
        
        const invoice = await storage.createInvoice({
          ...parsedData,
          invoiceClass: parsedData.invoiceClass || 'A', // Add invoice class for manual entry
          clientProviderId,
          ownerId: uploadedBy, // Por defecto, el propietario es quien sube la factura
          ownerName: invoiceOwnerName,
          processed: true,
          extractedData: null,
        });
        
        // Log activity
        await storage.createActivityLog({
          userId: uploadedBy,
          userName: uploadedByName,
          actionType: 'create',
          entityType: 'invoice',
          entityId: invoice.id,
          description: `Creó factura manual ${invoice.invoiceNumber || 'sin número'} por ${invoice.totalAmount}`,
          metadata: JSON.stringify({ invoiceType: invoice.type, manualEntry: true }),
          ipAddress: req.ip,
        });
        
        // Notify WebSocket clients about new invoice
        wsManager.notifyInvoiceChange('created', invoice, uploadedBy);
        
        return res.json(invoice);
      }

      let extractedData = null;
      let filePath = null;
      let fileName = null;

      // Process uploaded file if present
      if (req.file) {
        filePath = req.file.path;
        fileName = req.file.originalname;

        // Check for duplicate files using filename + size combination
        const existingInvoice = await storage.findInvoiceByFileInfo(fileName, req.file.size);
        if (existingInvoice) {
          // Clean up uploaded file since it's a duplicate
          fs.unlinkSync(filePath);
          return res.status(409).json({ 
            error: "duplicate", 
            message: `Esta factura ya fue cargada anteriormente por ${existingInvoice.uploadedByName} el ${new Date(existingInvoice.createdAt).toLocaleDateString('es-ES')}`,
            existingInvoice: {
              id: existingInvoice.id,
              fileName: existingInvoice.fileName,
              uploadedBy: existingInvoice.uploadedByName,
              date: existingInvoice.createdAt
            }
          });
        }

        try {
          // Try Azure Document Intelligence first
          console.log('🔍 Processing invoice with Azure Document Intelligence...');
          
          // Detect type from filename first (priority over content detection)
          let invoiceType: 'income' | 'expense' | undefined;
          const fileNameLower = fileName.toLowerCase();
          
          if (fileNameLower.includes('emitida') || fileNameLower.includes('emitidas')) {
            invoiceType = 'income';
            console.log('📁 Detected INCOME from filename (contains "emitidas")');
          } else if (fileNameLower.includes('recibida') || fileNameLower.includes('recibidas')) {
            invoiceType = 'expense';
            console.log('📁 Detected EXPENSE from filename (contains "recibidas")');
          } else {
            // Use body type or let Azure detect from content
            invoiceType = req.body.type;
          }
          
          extractedData = await azureProcessor.processInvoice(filePath, invoiceType);
          
          if (!extractedData || extractedData.total === 0) {
            // Try Python backend as second option
            console.log('📄 Trying Python backend...');
            const fileBuffer = fs.readFileSync(filePath);
            const pythonResult = await pythonAIProxy.processInvoiceWithAI(
              fileBuffer, 
              fileName, 
              uploadedByName
            );

            if (pythonResult.success && pythonResult.processing_result?.extracted_data) {
              extractedData = pythonResult.processing_result.extracted_data;
            } else {
              // Fallback to original AI processor
              extractedData = await invoiceProcessor.processInvoice(filePath);
            }
          }
        } catch (aiError) {
          console.error('AI processing failed:', aiError);
          // Continue without AI processing
        }
      }

      // If AI extraction failed or no file, use manual data
      if (!extractedData) {
        const validatedData = insertInvoiceSchema.parse(req.body);
        const invoice = await storage.createInvoice({
          ...validatedData,
          ownerId: uploadedBy, // Por defecto, el propietario es quien sube la factura
          ownerName: invoiceOwnerName,
          extractedData: null,
          filePath,
          fileName,
        });
        // Manual entries remain as not processed by default
        return res.json(invoice);
      }

      // Create invoice with AI extracted data, mapping to our schema
      // For expenses: use supplier_name (who issued the invoice)
      // For income: use client_name (who we issued invoice to)
      const invoiceType = (extractedData as any).type || 'expense';
      const clientName = invoiceType === 'expense'
        ? ((extractedData as any).supplier_name || (extractedData as any).client_name || (extractedData as any).vendorName || 'Proveedor extraído por IA')
        : ((extractedData as any).client_name || (extractedData as any).customerName || 'Cliente extraído por IA');
      const clientCuit = invoiceType === 'expense'
        ? ((extractedData as any).supplier_cuit || null)
        : null;
      const invoiceNumber = 'invoice_number' in extractedData ? extractedData.invoice_number : 
                            'invoiceNumber' in extractedData ? extractedData.invoiceNumber : `INV-${Date.now()}`;
      const totalAmount = 'total' in extractedData ? extractedData.total : 
                          'totalAmount' in extractedData ? parseFloat(extractedData.totalAmount) : 0;
      const vatAmount = 'vat_amount' in extractedData ? extractedData.vat_amount : 
                        'ivaAmount' in extractedData ? parseFloat(extractedData.ivaAmount) : 0;
      
      // Crear o buscar el cliente/proveedor automáticamente
      let clientProviderId = null;
      if (clientName && clientName !== 'Cliente extraído por IA' && clientName !== 'Proveedor extraído por IA') {
        // Buscar si ya existe por CUIT primero (más preciso)
        let clientProvider = null;
        
        if (clientCuit) {
          clientProvider = await storage.getClientProviderByCuit(clientCuit);
        }
        
        // Si no se encontró por CUIT, buscar por nombre
        if (!clientProvider) {
          clientProvider = await storage.getClientProviderByName(clientName);
        }
        
        // Si no existe, crear nuevo
        if (!clientProvider) {
          // Crear nuevo cliente/proveedor
          const invoiceType = extractedData.type || 'expense';
          const isProvider = invoiceType === 'expense';
          
          clientProvider = await storage.createClientProvider({
            name: clientName,
            type: isProvider ? 'provider' : 'client',
            cuit: clientCuit,  // Include CUIT if available
          });
          console.log(`✅ Cliente/Proveedor creado automáticamente: ${clientName}${clientCuit ? ` (CUIT: ${clientCuit})` : ''}`);
        }
        
        clientProviderId = clientProvider.id;
      }
      
      // Calculate monetary values with proper decimal precision
      const subtotalValue = Number(((totalAmount || 0) - (vatAmount || 0)).toFixed(2));
      const ivaValue = Number((vatAmount || 0).toFixed(2));
      const totalValue = Number((totalAmount || 0).toFixed(2));
      
      // Parse the date carefully - NEVER use new Date() as fallback
      let invoiceDate: Date | null = null;
      
      if ('date' in extractedData && extractedData.date) {
        try {
          // The date should already be in YYYY-MM-DD format from extractDateField
          invoiceDate = new Date(extractedData.date);
          if (isNaN(invoiceDate.getTime())) {
            console.warn(`⚠️ Invalid date from extracted data: ${extractedData.date}`);
            invoiceDate = null;
          }
        } catch (error) {
          console.error(`❌ Error parsing date: ${extractedData.date}`, error);
          invoiceDate = null;
        }
      }
      
      // Log warning if no date could be extracted
      if (!invoiceDate) {
        console.warn(`⚠️ No valid date extracted for invoice ${invoiceNumber}. Date will be NULL in database.`);
      } else {
        console.log(`✅ Invoice date extracted: ${invoiceDate.toISOString().split('T')[0]}`);
      }
      
      const invoice = await storage.createInvoice({
        type: extractedData.type || 'expense',
        invoiceClass: (extractedData as any).invoice_class || 'A', // Include invoice class from AI extraction
        date: invoiceDate, // Can be null - database should handle it
        clientProviderName: clientName || 'Cliente extraído por IA',
        clientProviderId, // Asociar con el cliente/proveedor
        invoiceNumber: invoiceNumber || `INV-${Date.now()}`,
        subtotal: subtotalValue.toString(),  // Convert to string after rounding
        ivaAmount: ivaValue.toString(),      // Convert to string after rounding
        totalAmount: totalValue.toString(),  // Convert to string after rounding
        uploadedBy,
        uploadedByName,
        ownerId: uploadedBy, // Por defecto, el propietario es quien sube la factura
        ownerName: invoiceOwnerName,
        extractedData: JSON.stringify(extractedData),
        filePath,
        fileName,
        fileSize: req.file?.size,
      });
      
      // Mark invoice as processed after successful AI extraction
      if (extractedData && totalAmount && totalAmount > 0) {
        await storage.markInvoiceAsProcessed(invoice.id);
      }

      // Log activity for AI-extracted invoice
      await storage.createActivityLog({
        userId: uploadedBy,
        userName: uploadedByName,
        actionType: 'upload',
        entityType: 'invoice',
        entityId: invoice.id,
        description: `Cargó factura ${invoice.invoiceNumber || 'sin número'} por ${invoice.totalAmount}${extractedData ? ' (procesada con IA)' : ''}`,
        metadata: JSON.stringify({ 
          invoiceType: invoice.type, 
          fileName: fileName,
          aiProcessed: !!extractedData 
        }),
        ipAddress: req.ip,
      });

      // Notify WebSocket clients about new invoice
      wsManager.notifyInvoiceChange('created', invoice, uploadedBy);

      res.json(invoice);
    } catch (error) {
      console.error('Error creating invoice:', error);
      res.status(500).json({ error: "Error al crear la factura" });
    }
  });

  // Async upload endpoints for non-blocking file upload
  app.post("/api/uploads", requireAuth, upload.single('uploadFile'), async (req, res) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: "No se proporcionó archivo" });
      }

      const userId = req.session.user!.id;
      const uploadedByName = req.session.user!.displayName;
      const ownerName = req.body.ownerName || uploadedByName;
      
      try {
        // Generate fingerprint for duplicate detection
        const fileBuffer = fs.readFileSync(file.path);
        const fingerprint = UploadJobManager.generateFingerprint(fileBuffer);

        // Check for duplicates BEFORE creating the job
        const existingInvoice = await storage.findInvoiceByFingerprint(fingerprint);
        if (existingInvoice) {
          // Clean up uploaded file
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
          
          // Return duplicate error with detailed information
          return res.status(400).json({
            error: `📋 FACTURA DUPLICADA DETECTADA\n` +
                   `🔍 Archivo original: ${existingInvoice.fileName || 'N/A'}\n` +
                   `📅 Fecha: ${existingInvoice.date || 'N/A'}\n` +
                   `💰 Monto: $${existingInvoice.totalAmount || 'N/A'}\n` +
                   `🏢 Cliente/Proveedor: ${existingInvoice.clientProviderName || 'Cliente no identificado'}\n` +
                   `📄 Nro. Factura: ${existingInvoice.invoiceNumber || 'N/A'}\n` +
                   `👤 Cargada por: ${existingInvoice.uploadedByName || 'Usuario'}\n` +
                   `⚠️ La carga ha sido bloqueada para evitar duplicación de datos`
          });
        }

        // Create upload job with all required data - now persisted to database
        const job = await uploadJobManager.createJob(
          userId,
          file.originalname,
          file.size,
          fingerprint,
          file.path,
          uploadedByName,
          ownerName
        );

        // Return immediately with job ID - processing happens asynchronously
        res.status(202).json({
          message: `${file.originalname} en cola para procesamiento`,
          jobId: job.id,
          fileName: job.fileName,
          status: job.status
        });

      } catch (error: any) {
        // Handle file errors (especially duplicates) gracefully
        console.warn(`Error creating job for file ${file.originalname}:`, error);
        
        // Clean up uploaded file if there was an error
        if (fs.existsSync(file.path)) {
          try {
            fs.unlinkSync(file.path);
          } catch (cleanupError) {
            console.error(`Failed to cleanup file ${file.path}:`, cleanupError);
          }
        }

        // Return error response
        res.status(400).json({
          error: error.message?.includes('duplicate key') 
            ? 'Este archivo ya fue cargado anteriormente'
            : error.message || 'Error al crear trabajo de carga'
        });
      }

    } catch (error) {
      console.error('Error creating upload jobs:', error);
      res.status(500).json({ error: "Error al crear trabajos de carga" });
    }
  });

  // Clean up specific upload job (admin only)
  app.delete("/api/uploads/:jobId", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const { jobId } = req.params;
      const success = await storage.deleteUploadJob(jobId);
      
      if (success) {
        res.json({ success: true, message: "Job eliminado correctamente" });
      } else {
        res.status(404).json({ error: "Job no encontrado" });
      }
    } catch (error) {
      console.error('Error deleting upload job:', error);
      res.status(500).json({ error: "Error al eliminar el job" });
    }
  });

  // Get recent upload jobs for a user with pagination
  app.get("/api/uploads/recent", requireAuth, async (req, res) => {
    try {
      const userId = req.session.user!.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 5;
      const hours = parseInt(req.query.hours as string) || 168; // Default: 7 días (168 horas)
      
      // Obtener las últimas 20 cargas (máximo histórico)
      
      const allRecentJobs = await uploadJobManager.getRecentJobs(userId, hours * 60);
      
      // Limitar a las últimas 20 cargas
      const last20Jobs = allRecentJobs.slice(0, 20);
      
      // Implementar paginación
      const offset = (page - 1) * limit;
      const paginatedJobs = last20Jobs.slice(offset, offset + limit);
      
      const totalJobs = last20Jobs.length;
      const totalPages = Math.ceil(totalJobs / limit);
      
      res.json({
        jobs: paginatedJobs.map(job => ({
          id: job.id,
          fileName: job.fileName,
          fileSize: job.fileSize,
          status: job.status,
          invoiceId: job.invoiceId,
          error: job.error,
          createdAt: job.createdAt,
          updatedAt: job.updatedAt
        })),
        pagination: {
          currentPage: page,
          totalPages,
          totalJobs,
          limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      });

    } catch (error) {
      console.error('Error getting recent jobs:', error);
      res.status(500).json({ error: "Error al obtener trabajos recientes" });
    }
  });

  app.put("/api/invoices/:id", async (req, res) => {
    try {
      const validatedData = insertInvoiceSchema.partial().parse(req.body);
      
      // Check if all critical data is complete for automatic approval
      const hasCriticalData = (
        validatedData.date &&
        validatedData.totalAmount && parseFloat(validatedData.totalAmount.toString()) > 0 &&
        validatedData.clientProviderName && validatedData.clientProviderName !== 'Cliente extraído por IA' &&
        validatedData.invoiceNumber && !validatedData.invoiceNumber.startsWith('INV-')
      );
      
      // Auto-set review status based on data completeness
      if (hasCriticalData && !validatedData.reviewStatus) {
        validatedData.reviewStatus = 'approved';
        validatedData.needsReview = false;
      }
      
      const invoice = await storage.updateInvoice(req.params.id, validatedData);
      
      if (!invoice) {
        return res.status(404).json({ error: "Factura no encontrada" });
      }
      
      // Log activity
      const user = req.session.user?.id;
      const userName = req.session.user?.displayName;
      if (user && userName) {
        await storage.createActivityLog({
          userId: user,
          userName: userName,
          actionType: 'update',
          entityType: 'invoice',
          entityId: invoice.id,
          description: `Actualizó factura ${invoice.invoiceNumber || invoice.id}`,
          metadata: JSON.stringify({ changes: Object.keys(validatedData) }),
          ipAddress: req.ip,
        });
      }
      
      // Notify WebSocket clients about updated invoice
      wsManager.notifyInvoiceChange('updated', invoice, user);
      
      res.json(invoice);
    } catch (error) {
      console.error('Error updating invoice:', error);
      res.status(500).json({ error: "Error al actualizar la factura" });
    }
  });


  // Approve invoice (move from pending_review to approved)
  app.post("/api/invoices/:id/approve", async (req, res) => {
    try {
      const invoice = await storage.getInvoice(req.params.id);
      
      if (!invoice) {
        return res.status(404).json({ error: "Factura no encontrada" });
      }
      
      // Validate that invoice has all required data
      const hasCriticalData = (
        invoice.date &&
        invoice.totalAmount && parseFloat(invoice.totalAmount.toString()) > 0 &&
        invoice.clientProviderName && invoice.clientProviderName !== 'Cliente extraído por IA' &&
        invoice.invoiceNumber && !invoice.invoiceNumber.startsWith('INV-')
      );
      
      if (!hasCriticalData) {
        return res.status(400).json({ 
          error: "No se puede aprobar la factura: faltan datos críticos", 
          missingData: {
            date: !invoice.date,
            amount: !invoice.totalAmount || parseFloat(invoice.totalAmount.toString()) <= 0,
            client: !invoice.clientProviderName || invoice.clientProviderName === 'Cliente extraído por IA',
            invoiceNumber: !invoice.invoiceNumber || invoice.invoiceNumber.startsWith('INV-')
          }
        });
      }
      
      // Update to approved status
      const approvedInvoice = await storage.updateInvoice(invoice.id, {
        reviewStatus: 'approved',
        needsReview: false
      });
      
      // Log activity
      const user = req.session.user?.id;
      const userName = req.session.user?.displayName;
      if (user && userName) {
        await storage.createActivityLog({
          userId: user,
          userName: userName,
          actionType: 'update',
          entityType: 'invoice',
          entityId: invoice.id,
          description: `Aprobó factura ${invoice.invoiceNumber || invoice.id} - datos completos verificados`,
          metadata: JSON.stringify({ action: 'approve', previousStatus: 'pending_review' }),
          ipAddress: req.ip,
        });
      }
      
      // Notify WebSocket clients about approved invoice
      wsManager.notifyInvoiceChange('updated', approvedInvoice, user);
      
      res.json({ success: true, invoice: approvedInvoice });
    } catch (error) {
      console.error('Error approving invoice:', error);
      res.status(500).json({ error: "Error al aprobar la factura" });
    }
  });

  app.delete("/api/invoices/:id", async (req, res) => {
    try {
      const { deletedBy, deletedByName } = req.body;
      
      if (!deletedBy || !deletedByName) {
        return res.status(400).json({ error: "Usuario que elimina requerido" });
      }

      const success = await storage.deleteInvoice(req.params.id, deletedBy, deletedByName);
      
      if (!success) {
        return res.status(404).json({ error: "Factura no encontrada" });
      }
      
      // Log activity
      await storage.createActivityLog({
        userId: deletedBy,
        userName: deletedByName,
        actionType: 'delete',
        entityType: 'invoice',
        entityId: req.params.id,
        description: `Eliminó factura y la movió a la papelera`,
        metadata: null,
        ipAddress: req.ip,
      });
      
      // Notify WebSocket clients about deleted invoice
      wsManager.notifyInvoiceChange('deleted', { id: req.params.id }, deletedBy);
      
      res.json({ success: true, message: "Factura movida a la papelera" });
    } catch (error) {
      console.error('Error deleting invoice:', error);
      res.status(500).json({ error: "Error al eliminar la factura" });
    }
  });

  // Clients and Providers CRUD
  app.get("/api/clients", async (req, res) => {
    try {
      const clients = await storage.getAllClientsProviders();
      res.json(clients);
    } catch (error) {
      console.error('Error fetching clients:', error);
      res.status(500).json({ error: "Error al obtener los clientes" });
    }
  });

  app.post("/api/clients", async (req, res) => {
    try {
      const validatedData = insertClientProviderSchema.parse(req.body);
      const client = await storage.createClientProvider(validatedData);
      
      // Log activity if user info provided
      const user = req.body.createdBy;
      const userName = req.body.createdByName;
      if (user && userName) {
        await storage.createActivityLog({
          userId: user,
          userName: userName,
          actionType: 'create',
          entityType: 'client_provider',
          entityId: client.id,
          description: `Creó ${client.type === 'client' ? 'cliente' : 'proveedor'} ${client.name}`,
          metadata: JSON.stringify({ type: client.type }),
          ipAddress: req.ip,
        });
      }
      
      res.json(client);
    } catch (error) {
      console.error('Error creating client:', error);
      res.status(500).json({ error: "Error al crear el cliente" });
    }
  });

  app.put("/api/clients/:id", async (req, res) => {
    try {
      const validatedData = insertClientProviderSchema.partial().parse(req.body);
      const client = await storage.updateClientProvider(req.params.id, validatedData);
      
      if (!client) {
        return res.status(404).json({ error: "Cliente no encontrado" });
      }
      
      // Log activity if user info provided
      const user = req.body.updatedBy;
      const userName = req.body.updatedByName;
      if (user && userName) {
        await storage.createActivityLog({
          userId: user,
          userName: userName,
          actionType: 'update',
          entityType: 'client_provider',
          entityId: client.id,
          description: `Actualizó ${client.type === 'client' ? 'cliente' : 'proveedor'} ${client.name}`,
          metadata: JSON.stringify({ changes: Object.keys(validatedData) }),
          ipAddress: req.ip,
        });
      }
      
      res.json(client);
    } catch (error) {
      console.error('Error updating client:', error);
      res.status(500).json({ error: "Error al actualizar el cliente" });
    }
  });

  app.delete("/api/clients/:id", requireAuth, async (req, res) => {
    try {
      const result = await storage.deleteClientProvider(req.params.id);
      
      if (!result.success) {
        if (result.error) {
          return res.status(409).json({ 
            error: result.error,
            invoiceCount: result.invoiceCount 
          });
        } else {
          return res.status(404).json({ error: "Cliente no encontrado" });
        }
      }
      
      // Log activity with session user
      const user = req.session.user!.id;
      const userName = req.session.user!.displayName;
      await storage.createActivityLog({
        userId: user,
        userName: userName,
        actionType: 'delete',
        entityType: 'client_provider',
        entityId: req.params.id,
        description: `Eliminó cliente/proveedor`,
        metadata: null,
        ipAddress: req.ip,
      });
      
      // Notify WebSocket clients
      wsManager.notifyClientChange('deleted', { id: req.params.id }, user);
      
      res.json({ success: true, message: "Cliente eliminado" });
    } catch (error) {
      console.error('Error deleting client:', error);
      res.status(500).json({ error: "Error al eliminar el cliente" });
    }
  });

  // Trash/Deleted invoices
  app.get("/api/trash", async (req, res) => {
    try {
      const deletedInvoices = await storage.getDeletedInvoices();
      res.json(deletedInvoices);
    } catch (error) {
      console.error('Error fetching deleted invoices:', error);
      res.status(500).json({ error: "Error al obtener las facturas eliminadas" });
    }
  });

  app.post("/api/trash/:id/restore", async (req, res) => {
    try {
      const success = await storage.restoreInvoice(req.params.id);
      
      if (!success) {
        return res.status(404).json({ error: "Factura eliminada no encontrada" });
      }
      
      // Notify WebSocket clients about restored invoice
      const invoice = await storage.getInvoice(req.params.id);
      if (invoice) {
        wsManager.notifyInvoiceChange('updated', invoice, req.session?.user?.id);
      }
      
      res.json({ success: true, message: "Factura restaurada" });
    } catch (error) {
      console.error('Error restoring invoice:', error);
      res.status(500).json({ error: "Error al restaurar la factura" });
    }
  });

  app.delete("/api/trash/:id", async (req, res) => {
    try {
      const success = await storage.permanentlyDeleteInvoice(req.params.id);
      
      if (!success) {
        return res.status(404).json({ error: "Factura eliminada no encontrada" });
      }
      
      // Log activity (need user info from request)
      const user = req.body?.deletedBy;
      const userName = req.body?.deletedByName;
      if (user && userName) {
        await storage.createActivityLog({
          userId: user,
          userName: userName,
          actionType: 'delete',
          entityType: 'invoice',
          entityId: req.params.id,
          description: `Eliminó permanentemente factura de la papelera`,
          metadata: null,
          ipAddress: req.ip,
        });
      }
      
      // Notify WebSocket clients about permanent deletion
      wsManager.notifyInvoiceChange('deleted', { id: req.params.id, permanent: true }, req.session?.user?.id);
      
      res.json({ success: true, message: "Factura eliminada permanentemente" });
    } catch (error) {
      console.error('Error permanently deleting invoice:', error);
      res.status(500).json({ error: "Error al eliminar permanentemente la factura" });
    }
  });

  app.delete("/api/trash", async (req, res) => {
    try {
      // Get all deleted invoices before emptying to notify clients
      const deletedInvoices = await storage.getDeletedInvoices();
      await storage.emptyTrash();
      
      // Notify WebSocket clients about each permanently deleted invoice
      for (const deletedInvoice of deletedInvoices) {
        wsManager.notifyInvoiceChange('deleted', { id: deletedInvoice.originalInvoiceId, permanent: true }, req.session?.user?.id);
      }
      
      res.json({ success: true, message: "Papelera vaciada" });
    } catch (error) {
      console.error('Error emptying trash:', error);
      res.status(500).json({ error: "Error al vaciar la papelera" });
    }
  });

  // AI Chat endpoint
  app.post("/api/chat", requireAuth, async (req, res) => {
    try {
      const { message } = req.body;
      const user = req.session.user!;
      
      if (!message) {
        return res.status(400).json({ error: "Mensaje requerido" });
      }

      // Extract first name from display name
      const firstName = user.displayName ? user.displayName.split(' ')[0] : undefined;
      console.log('Chat request from user:', user.displayName, '-> firstName:', firstName);

      try {
        // Try Azure OpenAI first
        console.log('💬 Processing chat with Azure OpenAI...');
        const response = await azureProcessor.processChatQuery(message, firstName);
        res.json({ response });
      } catch (error) {
        console.error('Azure chat error:', error);
        
        // Try Python backend as fallback
        try {
          const pythonResponse = await pythonAIProxy.chatWithAI(message);
          
          if (pythonResponse.success) {
            res.json({ response: pythonResponse.answer });
          } else {
            // Fallback to original AI processor
            const response = await invoiceProcessor.processQuery(message);
            res.json({ response });
          }
        } catch (fallbackError) {
          const fallbackResponse = "Lo siento, el asistente de IA está temporalmente desconectado. Las funcionalidades básicas del sistema siguen funcionando normalmente.";
          res.json({ response: fallbackResponse });
        }
      }
    } catch (error) {
      console.error('Error processing chat message:', error);
      res.status(500).json({ error: "Error al procesar el mensaje" });
    }
  });

  // Integration status endpoint
  app.get("/api/integrations/status", async (req, res) => {
    try {
      await pythonAIProxy.refreshHealth();
      res.json({
        python_backend: {
          available: pythonAIProxy.backendAvailable,
          url: pythonAIProxy.backendUrl,
          last_check: new Date().toISOString()
        },
        fallback_active: !pythonAIProxy.backendAvailable
      });
    } catch (error) {
      console.error('Error checking integration status:', error);
      res.status(500).json({ error: "Error al verificar estado de integración" });
    }
  });

  // Bulk export endpoint for selected invoices
  app.post("/api/export/bulk", async (req, res) => {
    try {
      const { invoiceIds, format } = req.body;
      
      if (!invoiceIds || !Array.isArray(invoiceIds) || invoiceIds.length === 0) {
        return res.status(400).json({ error: "IDs de facturas requeridos" });
      }

      const invoices = await Promise.all(
        invoiceIds.map(id => storage.getInvoice(id))
      );
      
      const validInvoices = invoices.filter((inv): inv is NonNullable<typeof inv> => inv !== null);

      if (format === 'csv' || format === 'excel') {
        // Generate CSV/Excel
        const csvHeader = 'ID,Tipo,Fecha Emisión,Fecha Ingreso,Cliente/Proveedor,CUIT,Número,Subtotal,IVA,Total,Cargado por\n';
        const csvData = validInvoices.map(invoice => {
          const cuit = invoice.clientProvider?.cuit || '';
          const dateStr = invoice.date ? new Date(invoice.date).toLocaleDateString('es-AR') : 'Sin fecha';
          const createdAtStr = new Date(invoice.createdAt).toLocaleDateString('es-AR');
          return `"${invoice.id}","${invoice.type === 'income' ? 'Ingreso' : 'Egreso'}","${dateStr}","${createdAtStr}","${invoice.clientProviderName}","${cuit}","${invoice.invoiceNumber || ''}","${invoice.subtotal}","${invoice.ivaAmount}","${invoice.totalAmount}","${invoice.uploadedByName}"`;
        }).join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=facturas_seleccionadas_${Date.now()}.csv`);
        res.send(csvHeader + csvData);
      } else {
        res.status(400).json({ error: "Formato no soportado" });
      }
    } catch (error) {
      console.error('Error in bulk export:', error);
      res.status(500).json({ error: "Error al exportar facturas" });
    }
  });

  // Bulk download files endpoint
  app.post("/api/download/bulk-files", async (req, res) => {
    try {
      const { invoiceIds } = req.body;
      
      if (!invoiceIds || !Array.isArray(invoiceIds) || invoiceIds.length === 0) {
        return res.status(400).json({ error: "IDs de facturas requeridos" });
      }

      const invoices = await Promise.all(
        invoiceIds.map(id => storage.getInvoice(id))
      );
      
      const validInvoices = invoices.filter((inv): inv is NonNullable<typeof inv> => inv !== null && inv?.filePath !== null);

      if (validInvoices.length === 0) {
        return res.status(404).json({ error: "No hay archivos disponibles para descargar" });
      }

      // For simplicity, if only one file, send it directly
      if (validInvoices.length === 1) {
        const invoice = validInvoices[0];
        const filePath = invoice.filePath!; // We know filePath is not null from the filter
        
        if (!fs.existsSync(filePath)) {
          return res.status(404).json({ error: "Archivo no encontrado" });
        }
        
        const ext = path.extname(filePath);
        const filename = `factura_${invoice.invoiceNumber || invoice.id}${ext}`;
        
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.sendFile(path.resolve(filePath));
      } else {
        // TODO: Implement ZIP functionality for multiple files
        // For now, return a message that multi-file download is coming soon
        res.status(501).json({ 
          error: "Descarga múltiple de archivos próximamente disponible",
          message: "Por ahora, descarga los archivos uno por uno" 
        });
      }
    } catch (error) {
      console.error('Error in bulk file download:', error);
      res.status(500).json({ error: "Error al descargar archivos" });
    }
  });

  // Fiscal Period Routes
  app.get("/api/kpi/fiscal-period", requireAuth, async (req, res) => {
    try {
      const validatedQuery = fiscalPeriodQuerySchema.parse(req.query);
      
      const kpiData = await storage.getKPIDataByFiscalPeriod(
        validatedQuery.startMonth,
        validatedQuery.startYear,
        validatedQuery.endMonth,
        validatedQuery.endYear
      );
      
      res.json(kpiData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      console.error('Error getting fiscal period KPIs:', error);
      res.status(500).json({ error: "Error al obtener KPIs del período fiscal" });
    }
  });
  
  app.get("/api/chart-data/fiscal-period", requireAuth, async (req, res) => {
    try {
      const validatedQuery = fiscalPeriodQuerySchema.parse(req.query);
      
      const chartData = await storage.getChartDataByFiscalPeriod(validatedQuery);
      
      res.json(chartData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      console.error('Error getting fiscal period chart data:', error);
      res.status(500).json({ error: "Error al obtener datos del gráfico" });
    }
  });
  
  // IVA Components Routes
  app.get("/api/invoices/:id/iva-components", requireAuth, async (req, res) => {
    try {
      const components = await storage.getIvaComponentsByInvoice(req.params.id);
      res.json(components);
    } catch (error) {
      console.error('Error getting IVA components:', error);
      res.status(500).json({ error: "Error al obtener componentes IVA" });
    }
  });
  
  app.post("/api/invoices/:id/iva-components", requireAuth, async (req, res) => {
    try {
      const validatedData = ivaComponentCreateSchema.parse(req.body);
      const component = await storage.createIvaComponent({
        invoiceId: req.params.id,
        description: validatedData.description,
        percentage: validatedData.percentage.toString(),
        amount: validatedData.amount.toString()
      });
      res.json(component);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      console.error('Error creating IVA component:', error);
      res.status(500).json({ error: "Error al crear componente IVA" });
    }
  });
  
  app.delete("/api/invoices/:id/iva-components", requireAuth, requireRole('admin', 'editor'), async (req, res) => {
    try {
      await storage.deleteIvaComponentsByInvoice(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting IVA components:', error);
      res.status(500).json({ error: "Error al eliminar componentes IVA" });
    }
  });
  
  // Payment Status Routes
  app.patch("/api/invoices/:id/payment-status", requireAuth, async (req, res) => {
    try {
      const validatedData = paymentStatusUpdateSchema.parse(req.body);
      await storage.updateInvoicePaymentStatus(
        req.params.id, 
        validatedData.status as any,
        validatedData.paymentDate ? new Date(validatedData.paymentDate) : undefined
      );
      
      // Notify WebSocket clients about payment status update
      const invoice = await storage.getInvoice(req.params.id);
      if (invoice) {
        wsManager.notifyInvoiceChange('updated', invoice, req.session?.user?.id);
      }
      
      res.json({ success: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      console.error('Error updating payment status:', error);
      res.status(500).json({ error: "Error al actualizar estado de pago" });
    }
  });
  
  // Bulk Payment Status Update
  app.patch("/api/invoices/bulk-payment-status", requireAuth, async (req, res) => {
    try {
      const { invoiceIds, status } = req.body;
      
      if (!Array.isArray(invoiceIds) || invoiceIds.length === 0) {
        return res.status(400).json({ error: "Se requieren IDs de facturas" });
      }
      
      if (!['pending', 'paid', 'overdue', 'cancelled'].includes(status)) {
        return res.status(400).json({ error: "Estado de pago inválido" });
      }
      
      let updated = 0;
      let failed = 0;
      
      for (const invoiceId of invoiceIds) {
        try {
          await storage.updateInvoicePaymentStatus(
            invoiceId,
            status as any,
            status === 'paid' ? new Date() : undefined
          );
          updated++;
        } catch (error) {
          console.error(`Error updating invoice ${invoiceId}:`, error);
          failed++;
        }
      }
      
      // Notify WebSocket clients about each updated invoice
      if (updated > 0) {
        for (const invoiceId of invoiceIds) {
          try {
            const invoice = await storage.getInvoice(invoiceId);
            if (invoice) {
              wsManager.notifyInvoiceChange('updated', invoice, req.session?.user?.id);
            }
          } catch (error) {
            console.error(`Error notifying WebSocket for invoice ${invoiceId}:`, error);
          }
        }
      }
      
      res.json({ 
        updated, 
        failed,
        message: `Se actualizaron ${updated} factura(s) correctamente${failed > 0 ? `, ${failed} fallaron` : ''}`
      });
    } catch (error) {
      console.error('Error in bulk payment status update:', error);
      res.status(500).json({ error: "Error al actualizar estados de pago" });
    }
  });
  
  app.get("/api/invoices/overdue", requireAuth, async (req, res) => {
    try {
      const overdueInvoices = await storage.getOverdueInvoices();
      res.json(overdueInvoices);
    } catch (error) {
      console.error('Error getting overdue invoices:', error);
      res.status(500).json({ error: "Error al obtener facturas vencidas" });
    }
  });

  // Analytics Export endpoints
  app.get("/api/export/analytics-csv", requireAuth, async (req, res) => {
    try {
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      
      // Get KPIs and analytics data for the date range
      const kpis = await storage.getKPIsWithDateFilter(startDate, endDate);
      const trendsData = await storage.getAnalyticsTrends(startDate, endDate);
      
      // Generate analytics CSV
      const csvHeader = 'Métrica,Valor,Período,Fecha Generación\n';
      const csvData = [
        `"Total Ingresos","${kpis.totalIncome}","${startDate || 'Todos'} - ${endDate || 'Todos'}","${new Date().toLocaleDateString('es-AR')}"`,
        `"Total Egresos","${kpis.totalExpenses}","${startDate || 'Todos'} - ${endDate || 'Todos'}","${new Date().toLocaleDateString('es-AR')}"`,
        `"Balance","${kpis.balance}","${startDate || 'Todos'} - ${endDate || 'Todos'}","${new Date().toLocaleDateString('es-AR')}"`,
        `"IVA Débito","${kpis.ivaDebit}","${startDate || 'Todos'} - ${endDate || 'Todos'}","${new Date().toLocaleDateString('es-AR')}"`,
        `"IVA Crédito","${kpis.ivaCredit}","${startDate || 'Todos'} - ${endDate || 'Todos'}","${new Date().toLocaleDateString('es-AR')}"`,
        `"Tendencia","Positiva","${startDate || 'Todos'} - ${endDate || 'Todos'}","${new Date().toLocaleDateString('es-AR')}"`,
        `"Performance","Excelente","${startDate || 'Todos'} - ${endDate || 'Todos'}","${new Date().toLocaleDateString('es-AR')}"`
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=analytics-ejecutivos.csv');
      res.send(csvHeader + csvData);
    } catch (error) {
      console.error('Error exporting analytics CSV:', error);
      res.status(500).json({ error: "Error al exportar analytics CSV" });
    }
  });

  app.get("/api/export/analytics-excel", requireAuth, async (req, res) => {
    try {
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      
      // Get analytics data 
      const kpis = await storage.getKPIsWithDateFilter(startDate, endDate);
      
      // Create Excel workbook
      const workbook = XLSX.utils.book_new();
      
      // Analytics summary sheet
      const analyticsData = [
        ['Métrica', 'Valor', 'Período'],
        ['Total Ingresos', kpis.totalIncome, `${startDate || 'Todos'} - ${endDate || 'Todos'}`],
        ['Total Egresos', kpis.totalExpenses, `${startDate || 'Todos'} - ${endDate || 'Todos'}`],
        ['Balance', kpis.balance, `${startDate || 'Todos'} - ${endDate || 'Todos'}`],
        ['IVA Débito', kpis.ivaDebit, `${startDate || 'Todos'} - ${endDate || 'Todos'}`],
        ['IVA Crédito', kpis.ivaCredit, `${startDate || 'Todos'} - ${endDate || 'Todos'}`]
      ];
      
      const ws = XLSX.utils.aoa_to_sheet(analyticsData);
      XLSX.utils.book_append_sheet(workbook, ws, 'Analytics Ejecutivos');
      
      // Write to buffer
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=analytics-ejecutivos.xlsx');
      res.send(buffer);
    } catch (error) {
      console.error('Error exporting analytics Excel:', error);
      res.status(500).json({ error: "Error al exportar analytics Excel" });
    }
  });

  app.get("/api/export/csv", requireAuth, async (req, res) => {
    try {
      const filters = {
        search: req.query.search as string,
        month: req.query.month ? parseInt(req.query.month as string) : undefined,
        year: req.query.year ? parseInt(req.query.year as string) : undefined,
        startMonth: req.query.startMonth ? parseInt(req.query.startMonth as string) : undefined,
        startYear: req.query.startYear ? parseInt(req.query.startYear as string) : undefined,
        endMonth: req.query.endMonth ? parseInt(req.query.endMonth as string) : undefined,
        endYear: req.query.endYear ? parseInt(req.query.endYear as string) : undefined,
        user: req.query.user as string,
        type: req.query.type as 'income' | 'expense' | 'neutral',
        paymentStatus: req.query.paymentStatus as 'pending' | 'paid' | 'overdue' | 'cancelled',
      };

      const { invoices } = await storage.getAllInvoices(filters);
      
      // Generate CSV with all fields
      const csvHeader = 'Tipo,Clase,Fecha,Cliente/Proveedor,CUIT,Número,Subtotal,IVA,IIBB,Ganancias,Otros,Total,Estado Pago,Fecha Pago,Vencimiento,Cargado por\n';
      const csvData = invoices.map(invoice => {
        const dateStr = invoice.date ? invoice.date.toLocaleDateString('es-AR') : 'Sin fecha';
        const paymentDateStr = invoice.paymentDate ? invoice.paymentDate.toLocaleDateString('es-AR') : '';
        const dueDateStr = invoice.dueDate ? invoice.dueDate.toLocaleDateString('es-AR') : '';
        const typeStr = invoice.type === 'income' ? 'Ingreso' : invoice.type === 'expense' ? 'Egreso' : 'Neutro';
        
        return [
          typeStr,
          invoice.invoiceClass || 'A',
          dateStr,
          invoice.clientProviderName,
          invoice.clientProvider?.cuit || '',
          invoice.invoiceNumber || '',
          invoice.subtotal,
          invoice.ivaAmount,
          invoice.iibbAmount || '0',
          invoice.gananciasAmount || '0',
          invoice.otherTaxes || '0',
          invoice.totalAmount,
          invoice.paymentStatus || 'pending',
          paymentDateStr,
          dueDateStr,
          invoice.uploadedByName
        ].map(val => `"${val}"`).join(',');
      }).join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=facturas.csv');
      res.send(csvHeader + csvData);
    } catch (error) {
      console.error('Error exporting CSV:', error);
      res.status(500).json({ error: "Error al exportar CSV" });
    }
  });
  
  // Excel Export endpoint  
  app.get("/api/export/excel", requireAuth, async (req, res) => {
    try {
      let fiscalPeriod = undefined;
      if (req.query.fiscalPeriod) {
        try {
          const parsedPeriod = JSON.parse(req.query.fiscalPeriod as string);
          fiscalPeriod = fiscalPeriodQuerySchema.parse(parsedPeriod);
        } catch (e) {
          // If validation fails, proceed without fiscal period filter
          console.warn('Invalid fiscal period provided, exporting all data');
        }
      }
      
      const exportData = await storage.exportInvoiceData(fiscalPeriod);
      res.json(exportData);
    } catch (error) {
      console.error('Error exporting Excel data:', error);
      res.status(500).json({ error: "Error al exportar datos Excel" });
    }
  });
  
  // Excel Import Preview endpoint - analyze file without committing
  app.post("/api/import/preview", requireAuth, requireRole('admin', 'editor'), excelUpload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Archivo Excel requerido" });
      }
      
      // Get user context from session
      const userId = req.session.user?.id || 'user-test';
      
      // Read and parse Excel file
      const workbook = XLSX.readFile(req.file.path);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert sheet to JSON
      const rawData = XLSX.utils.sheet_to_json(worksheet, { raw: false });
      
      // Map Excel columns to expected format (same logic as before)
      const mappedData = rawData.map((row: any) => {
        return {
          date: row['Fecha'] || row['fecha'] || row['Date'] || row['date'],
          type: row['Tipo'] || row['tipo'] || row['Type'] || row['type'],
          issuer: row['Emisor'] || row['emisor'] || row['Socio'] || row['socio'] || row['Owner'] || row['owner'],
          clientName: row['Cliente'] || row['cliente'] || row['Proveedor'] || row['proveedor'] || row['Cliente/Proveedor'],
          cuit: row['CUIT'] || row['cuit'] || row['Cuit'],
          invoiceNumber: row['Número'] || row['numero'] || row['Numero'] || row['Nro'] || row['Invoice Number'],
          subtotal: parseFloat(row['Subtotal'] || row['subtotal'] || '0'),
          ivaAmount: parseFloat(row['IVA'] || row['iva'] || row['Iva'] || '0'),
          totalAmount: parseFloat(row['Total'] || row['total'] || '0'),
          invoiceClass: row['Clase'] || row['clase'] || row['Tipo Factura'] || row['Class'] || 'A',
          iibbAmount: parseFloat(row['IIBB'] || row['iibb'] || row['Ingresos Brutos'] || '0'),
          gananciasAmount: parseFloat(row['Ganancias'] || row['ganancias'] || '0'),
          otherTaxes: parseFloat(row['Otros'] || row['otros'] || row['Otros Impuestos'] || '0'),
          paymentStatus: row['Estado'] || row['estado'] || row['Estado Pago'] || row['Payment Status'] || 'pending',
        };
      });
      
      // Clean up the temporary file
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {
        console.warn('Could not delete temp file:', e);
      }
      
      // Analyze the data without committing
      const result = await storage.previewImportData(mappedData, userId);
      
      res.json({
        message: "Análisis completado",
        preview: result
      });
    } catch (error) {
      console.error('Error previewing Excel data:', error);
      
      // Clean up file if it exists
      if (req.file?.path) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (e) {
          console.warn('Could not delete temp file:', e);
        }
      }
      
      res.status(500).json({ error: "Error al analizar datos Excel. Verifique que el archivo tenga el formato correcto." });
    }
  });

  // Excel Import Commit endpoint - commit previously analyzed data
  app.post("/api/import/commit", requireAuth, requireRole('admin', 'editor'), excelUpload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Archivo Excel requerido" });
      }
      
      // Get user context from session
      const userId = req.session.user?.id || 'user-test';
      const userName = req.session.user?.displayName || 'Importación Excel';
      
      // Get options from request body
      const duplicateMode = req.body.duplicateMode || 'skip'; // 'skip', 'update', 'duplicate'
      const createBackup = req.body.createBackup === 'true' || req.body.createBackup === true;
      
      // Read and parse Excel file (same logic as preview)
      const workbook = XLSX.readFile(req.file.path);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      const rawData = XLSX.utils.sheet_to_json(worksheet, { raw: false });
      
      const mappedData = rawData.map((row: any) => {
        return {
          date: row['Fecha'] || row['fecha'] || row['Date'] || row['date'],
          type: row['Tipo'] || row['tipo'] || row['Type'] || row['type'],
          issuer: row['Emisor'] || row['emisor'] || row['Socio'] || row['socio'] || row['Owner'] || row['owner'],
          clientName: row['Cliente'] || row['cliente'] || row['Proveedor'] || row['proveedor'] || row['Cliente/Proveedor'],
          cuit: row['CUIT'] || row['cuit'] || row['Cuit'],
          invoiceNumber: row['Número'] || row['numero'] || row['Numero'] || row['Nro'] || row['Invoice Number'],
          subtotal: parseFloat(row['Subtotal'] || row['subtotal'] || '0'),
          ivaAmount: parseFloat(row['IVA'] || row['iva'] || row['Iva'] || '0'),
          totalAmount: parseFloat(row['Total'] || row['total'] || '0'),
          invoiceClass: row['Clase'] || row['clase'] || row['Tipo Factura'] || row['Class'] || 'A',
          iibbAmount: parseFloat(row['IIBB'] || row['iibb'] || row['Ingresos Brutos'] || '0'),
          gananciasAmount: parseFloat(row['Ganancias'] || row['ganancias'] || '0'),
          otherTaxes: parseFloat(row['Otros'] || row['otros'] || row['Otros Impuestos'] || '0'),
          paymentStatus: row['Estado'] || row['estado'] || row['Estado Pago'] || row['Payment Status'] || 'pending',
        };
      });
      
      // Clean up the temporary file
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {
        console.warn('Could not delete temp file:', e);
      }
      
      // Commit the data with advanced options
      const result = await storage.commitImportData(mappedData, {
        userId,
        userName,
        duplicateMode,
        createBackup
      });
      
      // Notify connected clients about the import
      wsManager.notifySystemEvent('bulk_import', {
        userId,
        userName,
        success: result.success,
        failed: result.failed,
        updated: result.updated,
        skipped: result.skipped,
        backupId: result.backupId
      });
      
      res.json({
        message: `Importación completada: ${result.success} creadas, ${result.updated} actualizadas, ${result.skipped} omitidas, ${result.failed} fallidas`,
        ...result
      });
    } catch (error) {
      console.error('Error committing Excel data:', error);
      
      // Clean up file if it exists
      if (req.file?.path) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (e) {
          console.warn('Could not delete temp file:', e);
        }
      }
      
      res.status(500).json({ error: "Error al importar datos Excel. Verifique que el archivo tenga el formato correcto." });
    }
  });

  // Rollback endpoint
  app.post("/api/import/rollback", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const { backupId } = req.body;
      const userId = req.session.user?.id || 'user-test';
      
      if (!backupId) {
        return res.status(400).json({ error: "ID de backup requerido" });
      }
      
      const success = await storage.rollbackFromBackup(backupId, userId);
      
      if (success) {
        // Notify connected clients about the rollback
        wsManager.notifySystemEvent('data_rollback', {
          userId,
          backupId,
          message: 'Datos restaurados desde backup'
        });
        
        res.json({
          message: "Datos restaurados exitosamente desde backup",
          backupId
        });
      } else {
        res.status(500).json({ error: "Error al restaurar datos desde backup" });
      }
    } catch (error) {
      console.error('Error during rollback:', error);
      res.status(500).json({ error: "Error interno durante rollback" });
    }
  });

  // Legacy Excel Import endpoint (kept for compatibility)
  app.post("/api/import/excel", requireAuth, requireRole('admin', 'editor'), excelUpload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Archivo Excel requerido" });
      }
      
      // Get user context from session
      const userId = req.session.user?.id || 'user-test';
      const userName = req.session.user?.displayName || 'Importación Excel';
      
      // Read and parse Excel file
      const workbook = XLSX.readFile(req.file.path);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert sheet to JSON
      const rawData = XLSX.utils.sheet_to_json(worksheet, { raw: false });
      
      // Map Excel columns to expected format
      const mappedData = rawData.map((row: any) => {
        // Handle different column name variations
        return {
          date: row['Fecha'] || row['fecha'] || row['Date'] || row['date'],
          type: row['Tipo'] || row['tipo'] || row['Type'] || row['type'],
          issuer: row['Emisor'] || row['emisor'] || row['Socio'] || row['socio'] || row['Owner'] || row['owner'],
          clientName: row['Cliente'] || row['cliente'] || row['Proveedor'] || row['proveedor'] || row['Cliente/Proveedor'],
          cuit: row['CUIT'] || row['cuit'] || row['Cuit'],
          invoiceNumber: row['Número'] || row['numero'] || row['Numero'] || row['Nro'] || row['Invoice Number'],
          subtotal: parseFloat(row['Subtotal'] || row['subtotal'] || '0'),
          ivaAmount: parseFloat(row['IVA'] || row['iva'] || row['Iva'] || '0'),
          totalAmount: parseFloat(row['Total'] || row['total'] || '0'),
          invoiceClass: row['Clase'] || row['clase'] || row['Tipo Factura'] || row['Class'] || 'A',
          iibbAmount: parseFloat(row['IIBB'] || row['iibb'] || row['Ingresos Brutos'] || '0'),
          gananciasAmount: parseFloat(row['Ganancias'] || row['ganancias'] || '0'),
          otherTaxes: parseFloat(row['Otros'] || row['otros'] || row['Otros Impuestos'] || '0'),
          paymentStatus: row['Estado'] || row['estado'] || row['Estado Pago'] || row['Payment Status'] || 'pending',
        };
      });
      
      // Clean up the temporary file
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {
        console.warn('Could not delete temp file:', e);
      }
      
      // Import the data
      const result = await storage.importInvoiceData(mappedData, userId, userName);
      
      // Notify connected clients about the import
      wsManager.notifySystemEvent('bulk_import', {
        userId,
        userName,
        success: result.success,
        failed: result.failed,
      });
      
      res.json({
        message: `Importación completada: ${result.success} facturas importadas, ${result.failed} fallidas`,
        ...result
      });
    } catch (error) {
      console.error('Error importing Excel data:', error);
      
      // Clean up file if it exists
      if (req.file?.path) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (e) {
          console.warn('Could not delete temp file:', e);
        }
      }
      
      res.status(500).json({ error: "Error al importar datos Excel. Verifique que el archivo tenga el formato correcto." });
    }
  });

  // Invoice Templates Routes
  app.get("/api/templates", requireAuth, async (req, res) => {
    try {
      const userId = req.session?.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "User not found" });
      }

      const templates = await storage.getInvoiceTemplates(userId);
      res.json(templates);
    } catch (error) {
      console.error("Error fetching templates:", error);
      res.status(500).json({ error: "Error al obtener templates" });
    }
  });

  app.post("/api/templates", requireAuth, async (req, res) => {
    try {
      const userId = req.session?.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "User not found" });
      }

      const templateData = insertInvoiceTemplateSchema.parse({
        ...req.body,
        userId
      });

      const template = await storage.createInvoiceTemplate(templateData);
      res.status(201).json(template);
    } catch (error) {
      console.error("Error creating template:", error);
      res.status(500).json({ error: "Error al crear template" });
    }
  });

  app.put("/api/templates/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session?.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Usuario no autenticado" });
      }

      // Check ownership first
      const existingTemplate = await storage.getInvoiceTemplate(req.params.id);
      if (!existingTemplate) {
        return res.status(404).json({ error: "Template no encontrado" });
      }
      if (existingTemplate.userId !== userId) {
        return res.status(403).json({ error: "No autorizado para modificar este template" });
      }

      // Validate update data with partial schema - insertInvoiceTemplateSchema already omits id, createdAt, updatedAt
      const updateSchema = insertInvoiceTemplateSchema.partial().omit({ 
        userId: true,
        usageCount: true 
      });
      const validatedData = updateSchema.parse(req.body);

      const template = await storage.updateInvoiceTemplate(req.params.id, validatedData);
      res.json(template);
    } catch (error) {
      console.error("Error updating template:", error);
      res.status(500).json({ error: "Error al actualizar template" });
    }
  });

  app.delete("/api/templates/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session?.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Usuario no autenticado" });
      }

      // Check ownership first
      const existingTemplate = await storage.getInvoiceTemplate(req.params.id);
      if (!existingTemplate) {
        return res.status(404).json({ error: "Template no encontrado" });
      }
      if (existingTemplate.userId !== userId) {
        return res.status(403).json({ error: "No autorizado para eliminar este template" });
      }

      const success = await storage.deleteInvoiceTemplate(req.params.id);
      if (!success) {
        return res.status(500).json({ error: "Error interno al eliminar template" });
      }
      res.json({ message: "Template eliminado exitosamente" });
    } catch (error) {
      console.error("Error deleting template:", error);
      res.status(500).json({ error: "Error al eliminar template" });
    }
  });

  app.post("/api/templates/:id/use", requireAuth, async (req, res) => {
    try {
      const userId = req.session?.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Usuario no autenticado" });
      }

      // Check ownership first
      const existingTemplate = await storage.getInvoiceTemplate(req.params.id);
      if (!existingTemplate) {
        return res.status(404).json({ error: "Template no encontrado" });
      }
      if (existingTemplate.userId !== userId) {
        return res.status(403).json({ error: "No autorizado para usar este template" });
      }

      await storage.incrementTemplateUsage(req.params.id);
      res.json({ message: "Template usage incremented" });
    } catch (error) {
      console.error("Error incrementing template usage:", error);
      res.status(500).json({ error: "Error al usar template" });
    }
  });

  // Advanced Analytics Routes
  app.get("/api/analytics/trends", async (req, res) => {
    try {
      const chartData = await storage.getChartData();
      const trendData = chartData.map(item => ({
        month: item.month,
        income: parseFloat((item.income || '0').toString().replace('$', '').replace(',', '')) || 0,
        expense: parseFloat((item.expenses || '0').toString().replace('$', '').replace(',', '')) || 0,
        profit: (parseFloat((item.income || '0').toString().replace('$', '').replace(',', '')) || 0) - (parseFloat((item.expenses || '0').toString().replace('$', '').replace(',', '')) || 0)
      }));
      
      res.json(trendData);
    } catch (error) {
      console.error("Error fetching trends:", error);
      res.status(500).json({ error: "Error al obtener tendencias" });
    }
  });

  app.get("/api/analytics/breakdown", async (req, res) => {
    try {
      const ivaBreakdown = await storage.getIVABreakdownByClass();
      res.json([
        { name: "Tipo A", value: ivaBreakdown.A, fill: "#10b981" },
        { name: "Tipo B", value: ivaBreakdown.B, fill: "#3b82f6" }, 
        { name: "Tipo C", value: ivaBreakdown.C, fill: "#f59e0b" }
      ]);
    } catch (error) {
      console.error("Error fetching breakdown:", error);
      res.status(500).json({ error: "Error al obtener desglose" });
    }
  });

  // Admin Routes - Advanced Management
  const requireAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!req.session?.user || req.session.user.role !== 'admin') {
      return res.status(403).json({ error: "Acceso denegado: Se requieren permisos de administrador" });
    }
    next();
  };

  // Admin: Create backup
  app.post("/api/admin/backup", requireAuth, requireAdmin, async (req, res) => {
    try {
      const backup = await storage.createDataBackup();
      
      await storage.createActivityLog({
        userId: req.session.user!.id,
        userName: req.session.user!.displayName,
        actionType: 'export',
        entityType: 'backup',
        entityId: backup.backupId,
        description: `Backup creado por administrador: ${backup.filename}`,
        metadata: JSON.stringify(backup),
        ipAddress: req.ip,
      });

      res.json({
        success: true,
        message: "Backup creado exitosamente",
        backup
      });
    } catch (error) {
      console.error('Error creating backup:', error);
      res.status(500).json({ error: "Error al crear el backup" });
    }
  });

  // Admin: Reset test data
  app.post("/api/admin/reset-test-data", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { confirmText } = req.body;
      
      if (confirmText !== 'DELETE') {
        return res.status(400).json({ 
          error: "Confirmación incorrecta. Escriba 'DELETE' para confirmar." 
        });
      }

      const result = await storage.resetTestData(req.session.user!.id);
      
      // Notify all clients about the reset
      wsManager.broadcast({
        type: 'system_reset',
        userId: req.session.user!.id,
        message: `Datos de prueba eliminados: ${result.deletedInvoices} facturas, ${result.deletedClients} clientes`,
        timestamp: new Date().toISOString()
      });
      
      res.json({
        success: true,
        message: "Datos de prueba eliminados exitosamente",
        result
      });
    } catch (error) {
      console.error('Error resetting test data:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Error al eliminar datos de prueba" });
    }
  });

  // Admin: System metrics
  app.get("/api/admin/metrics", requireAuth, requireAdmin, async (req, res) => {
    try {
      const metrics = await storage.getSystemMetrics();
      res.json(metrics);
    } catch (error) {
      console.error('Error getting system metrics:', error);
      res.status(500).json({ error: "Error al obtener métricas del sistema" });
    }
  });

  // Google Sheets export
  app.get("/api/export/google-sheets", requireAuth, async (req, res) => {
    try {
      const exportData = await storage.getExportableData();
      
      await storage.createActivityLog({
        userId: req.session.user!.id,
        userName: req.session.user!.displayName,
        actionType: 'export',
        entityType: 'google_sheets',
        entityId: 'export',
        description: `Exportación a Google Sheets: ${exportData.length} registros`,
        metadata: JSON.stringify({ count: exportData.length }),
        ipAddress: req.ip,
      });

      res.json({
        success: true,
        data: exportData,
        totalRecords: exportData.length,
        exportFormat: 'google_sheets'
      });
    } catch (error) {
      console.error('Error exporting to Google Sheets:', error);
      res.status(500).json({ error: "Error al exportar a Google Sheets" });
    }
  });

  // Google Sheets sync (manual trigger)
  app.post("/api/export/google-sheets/sync", requireAuth, async (req, res) => {
    try {
      const { sheetId, range = 'Data!A1' } = req.body;
      
      if (!sheetId) {
        return res.status(400).json({ error: "ID de Google Sheet requerido" });
      }

      const exportData = await storage.getExportableData();
      
      // Format data for Google Sheets
      const sheetsFormat = {
        range,
        majorDimension: 'ROWS',
        values: [
          // Header row
          ['Fecha', 'Número Factura', 'Tipo', 'Clase', 'Cliente/Proveedor', 'CUIT', 'Subtotal', 'IVA', 'Otros Impuestos', 'Total', 'Estado Pago', 'Fecha Pago', 'Propietario', 'Fecha Creación'],
          // Data rows
          ...exportData.map(item => [
            item.fecha,
            item.numeroFactura,
            item.tipo,
            item.clase,
            item.clienteProveedor,
            item.cuit,
            item.subtotal,
            item.iva,
            item.otrosImpuestos,
            item.total,
            item.estadoPago,
            item.fechaPago,
            item.propietario,
            item.fechaCreacion
          ])
        ]
      };

      await storage.createActivityLog({
        userId: req.session.user!.id,
        userName: req.session.user!.displayName,
        actionType: 'export',
        entityType: 'google_sheets_sync',
        entityId: sheetId,
        description: `Sincronización con Google Sheets: ${exportData.length} registros`,
        metadata: JSON.stringify({ sheetId, range, count: exportData.length }),
        ipAddress: req.ip,
      });

      res.json({
        success: true,
        message: "Datos preparados para Google Sheets",
        sheetsFormat,
        totalRecords: exportData.length,
        instructions: {
          step1: "Copia el array 'values' de la respuesta",
          step2: "Pega los datos en tu Google Sheet en el rango especificado",
          step3: "Las fórmulas existentes en otras pestañas seguirán funcionando"
        }
      });
    } catch (error) {
      console.error('Error syncing with Google Sheets:', error);
      res.status(500).json({ error: "Error al sincronizar con Google Sheets" });
    }
  });

  // AI Feedback and Review Queue Routes
  app.get("/api/ai-review/queue", requireAuth, async (req, res) => {
    try {
      const reviewQueue = await storage.getInvoicesNeedingReview();
      res.json({
        success: true,
        invoices: reviewQueue,
        totalPending: reviewQueue.length
      });
    } catch (error) {
      console.error('Error getting review queue:', error);
      res.status(500).json({ error: "Error al obtener cola de revisión" });
    }
  });

  app.post("/api/ai-review/:id/feedback", requireAuth, async (req, res) => {
    try {
      const { corrections, isCorrect } = req.body;
      
      if (isCorrect) {
        // Mark as correct, no corrections needed
        await storage.submitAIFeedback(req.params.id, {}, req.session.user!.id);
        
        await storage.createActivityLog({
          userId: req.session.user!.id,
          userName: req.session.user!.displayName,
          actionType: 'update',
          entityType: 'ai_feedback',
          entityId: req.params.id,
          description: 'Extracción AI marcada como correcta',
          metadata: JSON.stringify({ feedbackType: 'correct_extraction' }),
          ipAddress: req.ip,
        });
      } else {
        // Apply corrections
        await storage.submitAIFeedback(req.params.id, corrections, req.session.user!.id);
        
        await storage.createActivityLog({
          userId: req.session.user!.id,
          userName: req.session.user!.displayName,
          actionType: 'update',
          entityType: 'ai_feedback',
          entityId: req.params.id,
          description: 'Correcciones aplicadas a extracción AI',
          metadata: JSON.stringify({ corrections, feedbackType: 'corrected_extraction' }),
          ipAddress: req.ip,
        });
      }

      // Notify WebSocket clients about the review completion
      const updatedInvoice = await storage.getInvoice(req.params.id);
      if (updatedInvoice) {
        wsManager.notifyInvoiceChange('updated', updatedInvoice, req.session.user!.id);
      }

      res.json({
        success: true,
        message: isCorrect ? "Extracción marcada como correcta" : "Correcciones aplicadas exitosamente"
      });
    } catch (error) {
      console.error('Error submitting AI feedback:', error);
      res.status(500).json({ error: "Error al enviar feedback de AI" });
    }
  });

  app.post("/api/ai-review/:id/mark-for-review", requireAuth, async (req, res) => {
    try {
      const { reason } = req.body;
      
      if (!reason) {
        return res.status(400).json({ error: "Razón de revisión requerida" });
      }

      await storage.markInvoiceForReview(req.params.id, reason, req.session.user!.id);

      await storage.createActivityLog({
        userId: req.session.user!.id,
        userName: req.session.user!.displayName,
        actionType: 'update',
        entityType: 'invoice',
        entityId: req.params.id,
        description: `Factura marcada para revisión: ${reason}`,
        metadata: JSON.stringify({ reason, action: 'mark_for_review' }),
        ipAddress: req.ip,
      });

      // Notify WebSocket clients about the review request
      const invoice = await storage.getInvoice(req.params.id);
      if (invoice) {
        wsManager.notifyInvoiceChange('updated', invoice, req.session.user!.id);
      }

      res.json({
        success: true,
        message: "Factura marcada para revisión"
      });
    } catch (error) {
      console.error('Error marking invoice for review:', error);
      res.status(500).json({ error: "Error al marcar para revisión" });
    }
  });

  app.get("/api/ai-review/stats", requireAuth, async (req, res) => {
    try {
      const stats = await storage.getAIFeedbackStats();
      res.json(stats);
    } catch (error) {
      console.error('Error getting AI feedback stats:', error);
      res.status(500).json({ error: "Error al obtener estadísticas de AI" });
    }
  });

  // Custom Export Route for selective field export
  app.post("/api/export/custom", requireAuth, async (req, res) => {
    try {
      const { fields, format = 'csv' } = req.body;
      
      if (!fields || !Array.isArray(fields)) {
        return res.status(400).json({ error: "Campos de exportación requeridos" });
      }

      const allInvoices = await storage.getAllInvoices({ limit: 10000 });
      
      // Filter data to only include selected fields
      const filteredData = allInvoices.invoices.map(invoice => {
        const filtered: any = {};
        fields.forEach(field => {
          switch (field) {
            case 'date':
              filtered.fecha = invoice.date ? new Date(invoice.date).toLocaleDateString('es-AR') : '';
              break;
            case 'invoiceNumber':
              filtered.numeroFactura = invoice.invoiceNumber || '';
              break;
            case 'type':
              filtered.tipo = invoice.type === 'income' ? 'Ingreso' : 'Egreso';
              break;
            case 'invoiceClass':
              filtered.clase = invoice.invoiceClass || '';
              break;
            case 'clientProvider':
              filtered.clienteProveedor = invoice.clientProviderName || '';
              break;
            case 'cuit':
              filtered.cuit = invoice.clientProvider?.cuit || '';
              break;
            case 'subtotal':
              filtered.subtotal = invoice.subtotal || '0';
              break;
            case 'ivaAmount':
              filtered.iva = invoice.ivaAmount || '0';
              break;
            case 'totalAmount':
              filtered.total = invoice.totalAmount || '0';
              break;
            case 'paymentStatus':
              filtered.estadoPago = invoice.paymentStatus || 'pending';
              break;
            case 'paymentDate':
              filtered.fechaPago = invoice.paymentDate ? new Date(invoice.paymentDate).toLocaleDateString('es-AR') : '';
              break;
            case 'ownerName':
              filtered.propietario = invoice.ownerName || '';
              break;
            case 'createdAt':
              filtered.fechaCreacion = new Date(invoice.createdAt).toLocaleDateString('es-AR');
              break;
            case 'filePath':
              filtered.rutaArchivo = invoice.filePath || '';
              break;
          }
        });
        return filtered;
      });

      let content = '';
      if (format === 'csv') {
        // Create CSV content
        const headers = Object.keys(filteredData[0] || {});
        content = headers.join(',') + '\n';
        content += filteredData.map(row => 
          headers.map(header => `"${row[header] || ''}"`).join(',')
        ).join('\n');
      } else {
        // JSON format
        content = JSON.stringify(filteredData, null, 2);
      }

      await storage.createActivityLog({
        userId: req.session.user!.id,
        userName: req.session.user!.displayName,
        actionType: 'export',
        entityType: 'custom_export',
        entityId: 'custom',
        description: `Exportación personalizada: ${fields.length} campos, ${filteredData.length} registros`,
        metadata: JSON.stringify({ fields, format, count: filteredData.length }),
        ipAddress: req.ip,
      });

      res.json({
        success: true,
        content,
        totalRecords: filteredData.length,
        fields: fields,
        format
      });
    } catch (error) {
      console.error('Error creating custom export:', error);
      res.status(500).json({ error: "Error al crear exportación personalizada" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}