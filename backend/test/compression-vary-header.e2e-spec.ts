import { Controller, Get, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { createCompressionMiddleware } from '../src/common/middleware/response-compression.middleware';

@Controller('test-vary')
class TestVaryController {
  @Get('large')
  large() {
    return {
      data: Array.from({ length: 120 }).map((_, index) => ({
        id: index,
        value: 'repeated-value-for-compression-behavior-validation',
      })),
    };
  }
}

describe('Compression vary header (e2e)', () => {
  let app: INestApplication;

  function parseRawBuffer(res: any, callback: any) {
    let data = Buffer.from('');
    res.on('data', (chunk) => {
      data = Buffer.concat([data, chunk]);
    });
    res.on('end', () => callback(null, data));
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [TestVaryController],
    }).compile();

    app = moduleRef.createNestApplication();
    app.use(createCompressionMiddleware());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('includes Accept-Encoding in vary for brotli responses', async () => {
    const response = await request(app.getHttpServer())
      .get('/test-vary/large')
      .set('Accept-Encoding', 'br')
      .buffer(true)
      .parse(parseRawBuffer)
      .expect(200);

    expect(response.headers['content-encoding']).toBe('br');
    expect(response.headers['vary'].toLowerCase()).toContain('accept-encoding');
  });

  it('includes Accept-Encoding in vary for gzip responses', async () => {
    const response = await request(app.getHttpServer())
      .get('/test-vary/large')
      .set('Accept-Encoding', 'gzip')
      .buffer(true)
      .parse(parseRawBuffer)
      .expect(200);

    expect(response.headers['content-encoding']).toBe('gzip');
    expect(response.headers['vary'].toLowerCase()).toContain('accept-encoding');
  });

  it('does not duplicate Accept-Encoding in vary header', async () => {
    const response = await request(app.getHttpServer())
      .get('/test-vary/large')
      .set('Accept-Encoding', 'br')
      .buffer(true)
      .parse(parseRawBuffer)
      .expect(200);

    const varyValues = response.headers['vary']
      .split(',')
      .map((value: string) => value.trim().toLowerCase());
    const count = varyValues.filter(
      (value: string) => value === 'accept-encoding',
    ).length;

    expect(count).toBe(1);
  });
});
