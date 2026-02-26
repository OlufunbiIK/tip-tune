import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Res,
  Req,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { StorageService } from './storage.service';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { UploadFileDto } from './dto/upload-file.dto';
import { ThrottleOverride } from '../common/decorators/throttle-override.decorator';

@ApiTags('storage')
@Controller('files')
export class StorageController {
  private readonly logger = new Logger(StorageController.name);

  constructor(private readonly storageService: StorageService) {}

  @Post('upload')
  @ThrottleOverride('FILE_UPLOAD') // 5 requests per minute
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload an audio file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Audio file upload',
    type: UploadFileDto,
  })
  @ApiResponse({
    status: 201,
    description: 'File uploaded successfully',
    schema: {
      type: 'object',
      properties: {
        filename: { type: 'string' },
        url: { type: 'string' },
        size: { type: 'number' },
        mimeType: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid file' })
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    try {
      const result = await this.storageService.saveFile(file);
      const fileInfo = await this.storageService.getFileInfo(result.filename);

      return {
        success: true,
        message: 'File uploaded successfully',
        data: {
          filename: result.filename,
          url: result.url,
          size: fileInfo.size,
          mimeType: fileInfo.mimeType,
        },
      };
    } catch (error) {
      this.logger.error(`Upload failed: ${error.message}`);
      throw new BadRequestException(error.message);
    }
  }

  @Get(':filename')
  @ApiOperation({ summary: 'Download a file' })
  @ApiResponse({ status: 200, description: 'File returned' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async getFile(@Param('filename') filename: string, @Res() res: Response) {
    try {
      const filePath = this.storageService.getFilePath(filename);
      const fileInfo = await this.storageService.getFileInfo(filename);

      if (!fileInfo.exists) {
        return res.status(HttpStatus.NOT_FOUND).json({
          success: false,
          message: 'File not found',
        });
      }

      res.setHeader('Content-Type', fileInfo.mimeType);
      res.setHeader('Content-Length', fileInfo.size);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      return res.sendFile(filePath);
    } catch (error) {
      this.logger.error(`File retrieval failed: ${error.message}`);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to retrieve file',
      });
    }
  }

  @Get(':filename/stream')
  @ApiOperation({ summary: 'Stream an audio file' })
  @ApiResponse({ status: 200, description: 'Audio stream started' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async streamFile(@Param('filename') filename: string, @Res() res: Response, @Req() req: any) {
    try {
      const filePath = this.storageService.getFilePath(filename);
      const fileInfo = await this.storageService.getFileInfo(filename);

      if (!fileInfo.exists) {
        return res.status(HttpStatus.NOT_FOUND).json({
          success: false,
          message: 'File not found',
        });
      }

      // Set headers for audio streaming
      res.setHeader('Content-Type', fileInfo.mimeType);
      res.setHeader('Content-Length', fileInfo.size);
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year cache

      // Handle range requests for seeking
      const range = req.headers.range;
      if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileInfo.size - 1;
        const chunksize = (end - start) + 1;

        res.status(206);
        res.setHeader('Content-Range', `bytes ${start}-${end}/${fileInfo.size}`);
        res.setHeader('Content-Length', chunksize);

        const fileStream = require('fs').createReadStream(filePath, { start, end });
        fileStream.pipe(res);
      } else {
        const fileStream = require('fs').createReadStream(filePath);
        fileStream.pipe(res);
      }
    } catch (error) {
      this.logger.error(`Streaming failed: ${error.message}`);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to stream file',
      });
    }
  }

  @Delete(':filename')
  @ApiOperation({ summary: 'Delete a file' })
  @ApiResponse({ status: 200, description: 'File deleted successfully' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async deleteFile(@Param('filename') filename: string) {
    try {
      const fileInfo = await this.storageService.getFileInfo(filename);

      if (!fileInfo.exists) {
        throw new BadRequestException('File not found');
      }

      await this.storageService.deleteFile(filename);

      return {
        success: true,
        message: 'File deleted successfully',
      };
    } catch (error) {
      this.logger.error(`File deletion failed: ${error.message}`);
      throw new BadRequestException(error.message);
    }
  }

  @Get(':filename/info')
  @ApiOperation({ summary: 'Get file information' })
  @ApiResponse({ status: 200, description: 'File information retrieved' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async getFileInfo(@Param('filename') filename: string) {
    try {
      const fileInfo = await this.storageService.getFileInfo(filename);

      if (!fileInfo.exists) {
        throw new BadRequestException('File not found');
      }

      return {
        success: true,
        data: {
          filename,
          size: fileInfo.size,
          mimeType: fileInfo.mimeType,
          streamingUrl: await this.storageService.getStreamingUrl(filename),
        },
      };
    } catch (error) {
      this.logger.error(`File info retrieval failed: ${error.message}`);
      throw new BadRequestException(error.message);
    }
  }
}
