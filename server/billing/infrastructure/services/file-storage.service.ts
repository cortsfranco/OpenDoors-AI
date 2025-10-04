/**
 * File Storage Service - Infrastructure Layer
 * Concrete implementation of file storage operations
 */
import { IFileStorageRepository, FileUploadResult } from '../../domain/repositories/file-storage.repository';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export class LocalFileStorageService implements IFileStorageRepository {
  private uploadDir: string;

  constructor() {
    this.uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async saveFile(fileBuffer: Buffer, fileName: string, mimeType: string): Promise<FileUploadResult> {
    // Generate unique filename to avoid conflicts
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(8).toString('hex');
    const ext = path.extname(fileName);
    const baseName = path.basename(fileName, ext);
    const uniqueFileName = `${baseName}_${timestamp}_${randomString}${ext}`;
    
    const filePath = path.join(this.uploadDir, uniqueFileName);
    
    // Write file to disk
    fs.writeFileSync(filePath, fileBuffer);
    
    return {
      filePath,
      fileName: uniqueFileName,
      fileSize: fileBuffer.length,
      mimeType
    };
  }

  async deleteFile(filePath: string): Promise<boolean> {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error deleting file:', error);
      return false;
    }
  }

  async fileExists(filePath: string): Promise<boolean> {
    return fs.existsSync(filePath);
  }

  async getFileBuffer(filePath: string): Promise<Buffer> {
    return fs.readFileSync(filePath);
  }
}
