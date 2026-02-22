import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { VerificationService } from './verification.service';
import { CreateVerificationRequestDto } from './dto/create-verification-request.dto';
import { ReviewVerificationRequestDto } from './dto/review-verification-request.dto';
import { VerificationResponseDto, ArtistVerificationStatusDto } from './dto/verification-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserRole } from '../users/entities/user.entity';

@ApiTags('verification')
@Controller('verification')
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FilesInterceptor('documents', 5))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit verification request' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        documents: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'Identity documents (max 5 files, 10MB each)',
        },
        socialProof: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              platform: { type: 'string' },
              url: { type: 'string' },
              username: { type: 'string' },
            },
          },
        },
        additionalInfo: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Verification request created', type: VerificationResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid input or file' })
  @ApiResponse({ status: 409, description: 'Pending request already exists' })
  async createVerificationRequest(
    @CurrentUser() user: User,
    @Body() dto: CreateVerificationRequestDto,
    @UploadedFiles() documents: Express.Multer.File[],
  ): Promise<VerificationResponseDto> {
    if (!user.isArtist) {
      throw new Error('Only artists can request verification');
    }

    const request = await this.verificationService.createVerificationRequest(
      user.id,
      dto,
      documents || [],
    );

    return this.mapToResponseDto(request);
  }

  @Get('status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current artist verification status' })
  @ApiResponse({ status: 200, description: 'Verification status', type: ArtistVerificationStatusDto })
  async getVerificationStatus(
    @CurrentUser() user: User,
  ): Promise<ArtistVerificationStatusDto> {
    return this.verificationService.getArtistVerificationStatus(user.id);
  }

  @Get('requests/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get verification request by ID' })
  @ApiResponse({ status: 200, description: 'Verification request', type: VerificationResponseDto })
  @ApiResponse({ status: 404, description: 'Request not found' })
  async getVerificationRequest(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<VerificationResponseDto> {
    const request = await this.verificationService.getVerificationRequest(id);
    return this.mapToResponseDto(request);
  }

  @Delete('requests/:id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete pending verification request' })
  @ApiResponse({ status: 204, description: 'Request deleted' })
  @ApiResponse({ status: 404, description: 'Request not found' })
  async deleteRequest(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    await this.verificationService.deleteRequest(id, user.id);
  }

  // Admin endpoints

  @Get('admin/pending')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get pending verification requests (Admin only)' })
  @ApiResponse({ status: 200, description: 'List of pending requests' })
  async getPendingRequests(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ): Promise<{ data: VerificationResponseDto[]; total: number }> {
    const result = await this.verificationService.getPendingRequests(page, limit);
    return {
      data: result.data.map((req) => this.mapToResponseDto(req)),
      total: result.total,
    };
  }

  @Patch('admin/requests/:id/review')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Review verification request (Admin only)' })
  @ApiResponse({ status: 200, description: 'Request reviewed', type: VerificationResponseDto })
  @ApiResponse({ status: 404, description: 'Request not found' })
  async reviewRequest(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewVerificationRequestDto,
    @CurrentUser() admin: User,
  ): Promise<VerificationResponseDto> {
    const request = await this.verificationService.reviewRequest(
      id,
      admin.id,
      dto,
    );
    return this.mapToResponseDto(request);
  }

  @Get('admin/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get verification statistics (Admin only)' })
  @ApiResponse({ status: 200, description: 'Verification statistics' })
  async getStats(): Promise<{
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  }> {
    return this.verificationService.getRequestStats();
  }

  private mapToResponseDto(request: any): VerificationResponseDto {
    return {
      id: request.id,
      artistId: request.artistId,
      status: request.status,
      documents: request.documents,
      socialProof: request.socialProof,
      additionalInfo: request.additionalInfo,
      reviewedById: request.reviewedById,
      reviewNotes: request.reviewNotes,
      submittedAt: request.submittedAt,
      reviewedAt: request.reviewedAt,
      updatedAt: request.updatedAt,
    };
  }
}
