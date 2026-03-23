import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

@Injectable()
export class VaryAcceptEncodingMiddleware implements NestMiddleware {
  use(_req: Request, res: Response, next: NextFunction): void {
    res.vary('Accept-Encoding');
    next();
  }
}
