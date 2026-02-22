import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Track } from './entities/track.entity';

@Injectable()
export class EmbedTokenGuard implements CanActivate {
  constructor(
    @InjectRepository(Track)
    private readonly trackRepo: Repository<Track>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const trackId = request.params.trackId;
    const token =
      request.headers['x-embed-token'] ||
      request.query.token;

    if (!token) {
      throw new UnauthorizedException('Embed token is required');
    }

    const track = await this.trackRepo.findOne({ where: { id: trackId } });

    if (!track || track.embedToken !== token) {
      throw new UnauthorizedException('Invalid embed token');
    }

    request.track = track;
    return true;
  }
}