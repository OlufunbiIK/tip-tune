import { Injectable, BadRequestException, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { v4 as uuidv4 } from "uuid";
import * as path from "path";
import * as fs from "fs/promises";
import * as mime from "mime-types";

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly allowedMimeTypes = [
    "audio/mpeg",
    "audio/wav",
    "audio/flac",
    "audio/x-flac",
  ];
  private readonly maxFileSize: number;
  private readonly uploadDir: string;

  constructor(private configService: ConfigService) {
    this.maxFileSize =
      parseInt(this.configService.get<string>("MAX_FILE_SIZE")) ||
      50 * 1024 * 1024; // 50MB default
    this.uploadDir =
      this.configService.get<string>("UPLOAD_DIR") || "./uploads";
    this.ensureUploadDirectory();
  }

  private async ensureUploadDirectory(): Promise<void> {
    try {
      await fs.access(this.uploadDir);
    } catch {
      await fs.mkdir(this.uploadDir, { recursive: true });
      this.logger.log(`Created upload directory: ${this.uploadDir}`);
    }
  }

  validateFile(file: Express.Multer.File): void {
    // Check file type
    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Allowed types: ${this.allowedMimeTypes.join(", ")}`,
      );
    }

    // Check file size
    if (file.size > this.maxFileSize) {
      throw new BadRequestException(
        `File size exceeds maximum allowed size of ${this.maxFileSize / (1024 * 1024)}MB`,
      );
    }
  }

  generateUniqueFileName(originalName: string): string {
    const ext = path.extname(originalName);
    const timestamp = Date.now();
    const uuid = uuidv4();
    return `${timestamp}-${uuid}${ext}`;
  }

  async saveFile(
    file: Express.Multer.File,
  ): Promise<{ filename: string; path: string; url: string }> {
    this.validateFile(file);

    const filename = this.generateUniqueFileName(file.originalname);
    const filePath = path.join(this.uploadDir, filename);

    try {
      await fs.writeFile(filePath, file.buffer);

      const url = `/api/files/${filename}`;

      this.logger.log(`File saved successfully: ${filename}`);

      return {
        filename,
        path: filePath,
        url,
      };
    } catch (error) {
      this.logger.error(`Failed to save file: ${error.message}`);
      throw new BadRequestException("Failed to save file");
    }
  }

  async deleteFile(filename: string): Promise<void> {
    const filePath = path.join(this.uploadDir, filename);

    try {
      await fs.unlink(filePath);
      this.logger.log(`File deleted successfully: ${filename}`);
    } catch (error) {
      this.logger.error(`Failed to delete file: ${error.message}`);
      throw new BadRequestException("Failed to delete file");
    }
  }

  async getFileInfo(
    filename: string,
  ): Promise<{ exists: boolean; size?: number; mimeType?: string }> {
    const filePath = path.join(this.uploadDir, filename);

    try {
      const stats = await fs.stat(filePath);
      const mimeType = mime.lookup(filePath) || "application/octet-stream";

      return {
        exists: true,
        size: stats.size,
        mimeType,
      };
    } catch {
      return {
        exists: false,
      };
    }
  }

  getFilePath(filename: string): string {
    return path.join(this.uploadDir, filename);
  }

  async getStreamingUrl(filename: string): Promise<string> {
    const fileInfo = await this.getFileInfo(filename);

    if (!fileInfo.exists) {
      throw new BadRequestException("File not found");
    }

    return `/api/files/${filename}/stream`;
  }
}
