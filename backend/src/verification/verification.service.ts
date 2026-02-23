import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  VerificationRequest,
  VerificationStatus,
  VerificationDocument,
} from './entities/verification-request.entity';
import { Artist } from '../artists/entities/artist.entity';
import { CreateVerificationRequestDto } from './dto/create-verification-request.dto';
import { ReviewVerificationRequestDto } from './dto/review-verification-request.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class VerificationService {
  private readonly logger = new Logger(VerificationService.name);
  private readonly uploadDir: string;
  private readonly encryptionKey: Buffer;
  private readonly allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/jpg',
    'application/pdf',
  ];
  private readonly maxFileSize = 10 * 1024 * 1024; // 10MB

  constructor(
    @InjectRepository(VerificationRequest)
    private readonly verificationRepository: Repository<VerificationRequest>,
    @InjectRepository(Artist)
    private readonly artistRepository: Repository<Artist>,
    private readonly configService: ConfigService,
    private readonly notificationsService: NotificationsService,
  ) {
    this.uploadDir =
      this.configService.get<string>('VERIFICATION_UPLOAD_DIR') ||
      './uploads/verification';
    const key =
      this.configService.get<string>('DOCUMENT_ENCRYPTION_KEY') ||
      'default-key-32-chars-long!!!!!!';
    this.encryptionKey = crypto.scryptSync(key, 'salt', 32);
    this.ensureUploadDirectory();
  }

  private async ensureUploadDirectory(): Promise<void> {
    try {
      await fs.access(this.uploadDir);
    } catch {
      await fs.mkdir(this.uploadDir, { recursive: true });
      this.logger.log(`Created verification upload directory: ${this.uploadDir}`);
    }
  }

  private encryptBuffer(buffer: Buffer): { encrypted: Buffer; iv: string } {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return {
      encrypted: Buffer.concat([authTag, encrypted]),
      iv: iv.toString('hex'),
    };
  }

  private decryptBuffer(encryptedBuffer: Buffer, iv: string): Buffer {
    const authTag = encryptedBuffer.slice(0, 16);
    const encrypted = encryptedBuffer.slice(16);
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      this.encryptionKey,
      Buffer.from(iv, 'hex'),
    );
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
  }

  private validateDocument(file: Express.Multer.File): void {
    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Allowed types: ${this.allowedMimeTypes.join(', ')}`,
      );
    }

    if (file.size > this.maxFileSize) {
      throw new BadRequestException(
        `File size exceeds maximum allowed size of ${this.maxFileSize / (1024 * 1024)}MB`,
      );
    }
  }

  async uploadDocument(
    file: Express.Multer.File,
    artistId: string,
  ): Promise<VerificationDocument> {
    this.validateDocument(file);

    const timestamp = Date.now();
    const uuid = uuidv4();
    const filename = `${artistId}-${timestamp}-${uuid}.enc`;
    const filePath = path.join(this.uploadDir, filename);

    try {
      // Encrypt and save file
      const { encrypted, iv } = this.encryptBuffer(file.buffer);
      await fs.writeFile(filePath, encrypted);

      // Store IV separately for decryption
      const ivPath = `${filePath}.iv`;
      await fs.writeFile(ivPath, iv);

      this.logger.log(`Document uploaded and encrypted: ${filename}`);

      return {
        filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        encryptedPath: filePath,
        uploadedAt: new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to upload document: ${error.message}`);
      throw new BadRequestException('Failed to upload document');
    }
  }

  async getDecryptedDocument(
    document: VerificationDocument,
  ): Promise<Buffer> {
    try {
      const ivPath = `${document.encryptedPath}.iv`;
      const iv = await fs.readFile(ivPath, 'utf-8');
      const encrypted = await fs.readFile(document.encryptedPath);
      return this.decryptBuffer(encrypted, iv);
    } catch (error) {
      this.logger.error(`Failed to decrypt document: ${error.message}`);
      throw new BadRequestException('Failed to retrieve document');
    }
  }

  async createVerificationRequest(
    artistId: string,
    dto: CreateVerificationRequestDto,
    documents: Express.Multer.File[],
  ): Promise<VerificationRequest> {
    // Check if artist already has a pending request
    const existingRequest = await this.verificationRepository.findOne({
      where: { artistId, status: VerificationStatus.PENDING },
    });

    if (existingRequest) {
      throw new ConflictException(
        'You already have a pending verification request',
      );
    }

    // Check if artist is already verified
    const artist = await this.artistRepository.findOne({
      where: { id: artistId },
    });

    if (!artist) {
      throw new NotFoundException('Artist not found');
    }

    if (artist.isVerified) {
      throw new ConflictException('Artist is already verified');
    }

    // Upload and encrypt documents
    const uploadedDocuments: VerificationDocument[] = [];
    for (const file of documents) {
      const doc = await this.uploadDocument(file, artistId);
      uploadedDocuments.push(doc);
    }

    // Create verification request
    const request = this.verificationRepository.create({
      artistId,
      status: VerificationStatus.PENDING,
      documents: uploadedDocuments,
      socialProof: dto.socialProof,
      additionalInfo: dto.additionalInfo,
    });

    const savedRequest = await this.verificationRepository.save(request);

    this.logger.log(`Verification request created: ${savedRequest.id}`);

    return savedRequest;
  }

  async getVerificationRequest(id: string): Promise<VerificationRequest> {
    const request = await this.verificationRepository.findOne({
      where: { id },
      relations: ['artist', 'reviewedBy'],
    });

    if (!request) {
      throw new NotFoundException('Verification request not found');
    }

    return request;
  }

  async getArtistVerificationStatus(
    artistId: string,
  ): Promise<{ isVerified: boolean; hasPendingRequest: boolean; requestId?: string }> {
    const artist = await this.artistRepository.findOne({
      where: { id: artistId },
    });

    if (!artist) {
      throw new NotFoundException('Artist not found');
    }

    if (artist.isVerified) {
      return { isVerified: true, hasPendingRequest: false };
    }

    const pendingRequest = await this.verificationRepository.findOne({
      where: { artistId, status: VerificationStatus.PENDING },
    });

    return {
      isVerified: false,
      hasPendingRequest: !!pendingRequest,
      requestId: pendingRequest?.id,
    };
  }

  async getPendingRequests(
    page: number = 1,
    limit: number = 20,
  ): Promise<{ data: VerificationRequest[]; total: number }> {
    const [data, total] = await this.verificationRepository.findAndCount({
      where: { status: VerificationStatus.PENDING },
      relations: ['artist'],
      order: { submittedAt: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total };
  }

  async reviewRequest(
    requestId: string,
    adminId: string,
    dto: ReviewVerificationRequestDto,
  ): Promise<VerificationRequest> {
    const request = await this.verificationRepository.findOne({
      where: { id: requestId },
      relations: ['artist'],
    });

    if (!request) {
      throw new NotFoundException('Verification request not found');
    }

    if (request.status !== VerificationStatus.PENDING) {
      throw new BadRequestException(
        'This request has already been reviewed',
      );
    }

    // Update request
    request.status = dto.status;
    request.reviewedById = adminId;
    request.reviewNotes = dto.reviewNotes;
    request.reviewedAt = new Date();

    const savedRequest = await this.verificationRepository.save(request);

    // If approved, update artist verification status
    if (dto.status === VerificationStatus.APPROVED) {
      await this.artistRepository.update(request.artistId, {
        isVerified: true,
      });
    }

    // Send notification to artist
    await this.sendReviewNotification(savedRequest);

    this.logger.log(
      `Verification request ${requestId} reviewed by ${adminId}: ${dto.status}`,
    );

    return savedRequest;
  }

  private async sendReviewNotification(
    request: VerificationRequest,
  ): Promise<void> {
    const isApproved = request.status === VerificationStatus.APPROVED;
    const title = isApproved
      ? 'Verification Approved!'
      : 'Verification Request Update';
    const message = isApproved
      ? 'Congratulations! Your artist verification has been approved. You now have a verified badge on your profile.'
      : 'Your verification request has been reviewed. Please check the review notes for details.';

    await this.notificationsService.create({
      userId: request.artistId,
      type: 'VERIFICATION_UPDATE',
      title,
      message,
      data: {
        requestId: request.id,
        status: request.status,
        reviewNotes: request.reviewNotes,
      },
    });
  }

  async deleteRequest(requestId: string, artistId: string): Promise<void> {
    const request = await this.verificationRepository.findOne({
      where: { id: requestId, artistId },
    });

    if (!request) {
      throw new NotFoundException('Verification request not found');
    }

    if (request.status !== VerificationStatus.PENDING) {
      throw new BadRequestException(
        'Cannot delete a request that has already been reviewed',
      );
    }

    // Delete encrypted documents
    for (const doc of request.documents) {
      try {
        await fs.unlink(doc.encryptedPath);
        await fs.unlink(`${doc.encryptedPath}.iv`);
      } catch (error) {
        this.logger.warn(`Failed to delete document file: ${error.message}`);
      }
    }

    await this.verificationRepository.remove(request);

    this.logger.log(`Verification request deleted: ${requestId}`);
  }

  async getRequestStats(): Promise<{
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  }> {
    const [total, pending, approved, rejected] = await Promise.all([
      this.verificationRepository.count(),
      this.verificationRepository.count({
        where: { status: VerificationStatus.PENDING },
      }),
      this.verificationRepository.count({
        where: { status: VerificationStatus.APPROVED },
      }),
      this.verificationRepository.count({
        where: { status: VerificationStatus.REJECTED },
      }),
    ]);

    return { total, pending, approved, rejected };
  }
}
