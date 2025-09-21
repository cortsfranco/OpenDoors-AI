import cron from 'node-cron';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { logger } from './logger';

const execAsync = promisify(exec);

interface BackupConfig {
  enabled: boolean;
  schedule: string; // Cron expression
  maxBackups: number;
  backupPath: string;
  compression: boolean;
}

const BACKUP_CONFIG: BackupConfig = {
  enabled: process.env.NODE_ENV === 'production' || process.env.BACKUP_ENABLED === 'true',
  schedule: '0 2 * * *', // Daily at 2 AM
  maxBackups: 30, // Keep 30 days of backups
  backupPath: process.env.BACKUP_PATH || '/tmp/backups',
  compression: true,
};

class DatabaseBackupService {
  private isRunning = false;
  
  constructor() {
    this.initializeBackupDirectory();
  }

  private async initializeBackupDirectory() {
    try {
      if (!fs.existsSync(BACKUP_CONFIG.backupPath)) {
        fs.mkdirSync(BACKUP_CONFIG.backupPath, { recursive: true });
        logger.info(`Created backup directory: ${BACKUP_CONFIG.backupPath}`);
      }
    } catch (error) {
      logger.error('Failed to create backup directory:', error);
    }
  }

  async createBackup(): Promise<{ success: boolean; filePath?: string; error?: string }> {
    if (this.isRunning) {
      return { success: false, error: 'Backup already in progress' };
    }

    this.isRunning = true;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `financial_backup_${timestamp}.sql${BACKUP_CONFIG.compression ? '.gz' : ''}`;
    const backupFilePath = path.join(BACKUP_CONFIG.backupPath, backupFileName);

    try {
      logger.info('Starting database backup...');
      const startTime = Date.now();

      // Get database connection details from environment
      const dbHost = process.env.PGHOST || 'localhost';
      const dbPort = process.env.PGPORT || '5432';
      const dbName = process.env.PGDATABASE || 'financial_db';
      const dbUser = process.env.PGUSER || 'postgres';
      const dbPassword = process.env.PGPASSWORD;

      // Build pg_dump command
      let dumpCommand = `pg_dump -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} --no-password --verbose`;
      
      // Add compression if enabled
      if (BACKUP_CONFIG.compression) {
        dumpCommand += ` | gzip > "${backupFilePath}"`;
      } else {
        dumpCommand += ` > "${backupFilePath}"`;
      }

      // Set password environment variable for pg_dump
      const env = { ...process.env };
      if (dbPassword) {
        env.PGPASSWORD = dbPassword;
      }

      // Execute backup command
      await execAsync(dumpCommand, { env, maxBuffer: 50 * 1024 * 1024 }); // 50MB buffer

      const endTime = Date.now();
      const duration = Math.round((endTime - startTime) / 1000);
      const fileSize = this.getFileSizeInMB(backupFilePath);

      logger.info(`Backup completed successfully in ${duration}s. File: ${backupFileName} (${fileSize}MB)`);

      // Clean up old backups
      await this.cleanupOldBackups();

      // Log backup summary
      await this.logBackupSummary({
        timestamp: new Date(),
        fileName: backupFileName,
        fileSize,
        duration,
        success: true,
      });

      return { success: true, filePath: backupFilePath };

    } catch (error) {
      logger.error('Database backup failed:', error);
      
      // Clean up failed backup file
      if (fs.existsSync(backupFilePath)) {
        fs.unlinkSync(backupFilePath);
      }

      await this.logBackupSummary({
        timestamp: new Date(),
        fileName: backupFileName,
        fileSize: 0,
        duration: 0,
        success: false,
        error: (error as Error).message,
      });

      return { success: false, error: (error as Error).message };
    } finally {
      this.isRunning = false;
    }
  }

  private async cleanupOldBackups() {
    try {
      const files = fs.readdirSync(BACKUP_CONFIG.backupPath)
        .filter(file => file.startsWith('financial_backup_'))
        .map(file => ({
          name: file,
          path: path.join(BACKUP_CONFIG.backupPath, file),
          stats: fs.statSync(path.join(BACKUP_CONFIG.backupPath, file)),
        }))
        .sort((a, b) => b.stats.mtime.getTime() - a.stats.mtime.getTime()); // Sort by modification time, newest first

      if (files.length > BACKUP_CONFIG.maxBackups) {
        const filesToDelete = files.slice(BACKUP_CONFIG.maxBackups);
        
        for (const file of filesToDelete) {
          fs.unlinkSync(file.path);
          logger.info(`Deleted old backup: ${file.name}`);
        }
        
        logger.info(`Cleaned up ${filesToDelete.length} old backup files`);
      }
    } catch (error) {
      logger.error('Failed to cleanup old backups:', error);
    }
  }

  private getFileSizeInMB(filePath: string): number {
    try {
      const stats = fs.statSync(filePath);
      return Math.round(stats.size / (1024 * 1024) * 100) / 100; // Round to 2 decimal places
    } catch {
      return 0;
    }
  }

  private async logBackupSummary(summary: {
    timestamp: Date;
    fileName: string;
    fileSize: number;
    duration: number;
    success: boolean;
    error?: string;
  }) {
    const logEntry = {
      ...summary,
      configuredMaxBackups: BACKUP_CONFIG.maxBackups,
      backupPath: BACKUP_CONFIG.backupPath,
    };

    // Write to backup log file
    const logFilePath = path.join(BACKUP_CONFIG.backupPath, 'backup_log.json');
    let backupHistory: any[] = [];

    try {
      if (fs.existsSync(logFilePath)) {
        const existingLog = fs.readFileSync(logFilePath, 'utf-8');
        backupHistory = JSON.parse(existingLog);
      }
    } catch (error) {
      logger.warn('Could not read existing backup log:', error);
    }

    backupHistory.unshift(logEntry); // Add to beginning
    backupHistory = backupHistory.slice(0, 100); // Keep last 100 entries

    try {
      fs.writeFileSync(logFilePath, JSON.stringify(backupHistory, null, 2));
    } catch (error) {
      logger.error('Failed to write backup log:', error);
    }
  }

  getBackupHistory(): any[] {
    const logFilePath = path.join(BACKUP_CONFIG.backupPath, 'backup_log.json');
    try {
      if (fs.existsSync(logFilePath)) {
        const logData = fs.readFileSync(logFilePath, 'utf-8');
        return JSON.parse(logData);
      }
    } catch (error) {
      logger.error('Failed to read backup history:', error);
    }
    return [];
  }

  getBackupStatus() {
    const history = this.getBackupHistory();
    const latestBackup = history[0];
    
    return {
      enabled: BACKUP_CONFIG.enabled,
      schedule: BACKUP_CONFIG.schedule,
      maxBackups: BACKUP_CONFIG.maxBackups,
      backupPath: BACKUP_CONFIG.backupPath,
      isRunning: this.isRunning,
      latestBackup: latestBackup ? {
        timestamp: latestBackup.timestamp,
        success: latestBackup.success,
        fileName: latestBackup.fileName,
        fileSize: latestBackup.fileSize,
        duration: latestBackup.duration,
      } : null,
      totalBackups: history.length,
      successfulBackups: history.filter(b => b.success).length,
      failedBackups: history.filter(b => !b.success).length,
    };
  }

  start() {
    if (!BACKUP_CONFIG.enabled) {
      logger.info('Database backup service is disabled');
      return;
    }

    logger.info(`Starting database backup service with schedule: ${BACKUP_CONFIG.schedule}`);
    
    // Schedule automatic backups
    cron.schedule(BACKUP_CONFIG.schedule, async () => {
      logger.info('Scheduled backup starting...');
      const result = await this.createBackup();
      if (result.success) {
        logger.info('Scheduled backup completed successfully');
      } else {
        logger.error('Scheduled backup failed:', result.error);
      }
    });

    logger.info('Database backup service started successfully');
  }

  stop() {
    // In a real application, we would stop the cron jobs here
    logger.info('Database backup service stopped');
  }
}

// Create singleton instance
export const backupService = new DatabaseBackupService();

// Auto-start in production or when explicitly enabled
if (BACKUP_CONFIG.enabled) {
  backupService.start();
}

export { DatabaseBackupService, BACKUP_CONFIG };