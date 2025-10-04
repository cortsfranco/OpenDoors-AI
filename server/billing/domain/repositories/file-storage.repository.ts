/**
 * File Storage Repository Interface - Domain Layer
 * Defines the contract for file storage operations
 */
export interface FileUploadResult {
  filePath: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export interface IFileStorageRepository {
  saveFile(fileBuffer: Buffer, fileName: string, mimeType: string): Promise<FileUploadResult>;
  deleteFile(filePath: string): Promise<boolean>;
  fileExists(filePath: string): Promise<boolean>;
  getFileBuffer(filePath: string): Promise<Buffer>;
}
