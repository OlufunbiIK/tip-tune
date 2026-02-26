import { ArgumentMetadata, BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { ModerationService } from '../moderation.service';

@Injectable()
export class ModerateMessagePipe implements PipeTransform {
  constructor(private readonly moderationService: ModerationService) {}

  async transform(value: any, metadata: ArgumentMetadata) {
    if (!value || typeof value !== 'object') {
      return value;
    }

    if (!value.message || typeof value.message !== 'string') {
      return value;
    }

    const result = await this.moderationService.previewMessage(value.message);

    if (result.result === 'blocked') {
      throw new BadRequestException('Tip message contains blocked content');
    }

    if (result.result === 'filtered' && result.sanitizedMessage !== value.message) {
      value.message = result.sanitizedMessage;
    }

    return value;
  }
}
