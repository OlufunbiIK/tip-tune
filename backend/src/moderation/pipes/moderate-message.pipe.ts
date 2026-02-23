import { ArgumentMetadata, BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { ModerationService } from '../moderation.service';
import { Tip } from '../../tips/entities/tip.entity';

@Injectable()
export class ModerateMessagePipe implements PipeTransform {
  constructor(private readonly moderationService: ModerationService) {}

  async transform(value: any, metadata: ArgumentMetadata) {
    if (!value || typeof value !== 'object') {
      return value;
    }

    if (!value.message) {
      return value;
    }

    const tempTip = new Tip();
    tempTip.id = 'temp';
    tempTip.message = value.message;

    const log = await this.moderationService.moderateTipMessage(tempTip, null);

    if (log && log.moderationResult === 'blocked') {
      throw new BadRequestException('Tip message contains blocked content');
    }

    if (tempTip.message !== value.message) {
      value.message = tempTip.message;
    }

    return value;
  }
}

