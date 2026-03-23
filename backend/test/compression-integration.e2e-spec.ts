import { Controller, Get, INestApplication, Param, Post } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import * as zlib from 'zlib';
import { createCompressionMiddleware } from '../src/common/middleware/response-compression.middleware';

type EndpointCase = {
  name: string;
  path: string;
};

const endpointCases: EndpointCase[] = [
  { name: 'track listings', path: '/test-compression/tracks' },
  { name: 'tip history', path: '/test-compression/tips/history' },
  { name: 'analytics', path: '/test-compression/analytics' },
  { name: 'search results', path: '/test-compression/search' },
  { name: 'activity feed', path: '/test-compression/activities/feed' },
];

@Controller('test-compression')
class CompressionTestController {
  @Get('tracks')
  tracks() {
    return { items: this.makeItems('track') };
  }

  @Get('tips/history')
  tipHistory() {
    return { items: this.makeItems('tip-history') };
  }

  @Get('analytics')
  analytics() {
    return { items: this.makeItems('analytics') };
  }

  @Get('search')
  search() {
    return { items: this.makeItems('search') };
  }

  @Get('activities/feed')
  activityFeed() {
    return { items: this.makeItems('activity') };
  }

  @Get('small')
  small() {
    return { ok: true, message: 'tiny' };
  }

  @Post('files/upload')
  uploadFile() {
    return Buffer.from('binary-upload-response');
  }

  @Get('files/:filename')
  downloadFile(@Param('filename') _filename: string) {
    return Buffer.from('binary-download-response');
  }

  @Get('files/:filename/stream')
  streamFile(@Param('filename') _filename: string) {
    return Buffer.from('binary-stream-response');
  }

  private makeItems(type: string) {
    return Array.from({ length: 120 }).map((_, index) => ({
      id: `${type}-${index}`,
      title: `${type.toUpperCase()} item ${index}`,
      description:
        'This payload is intentionally repetitive so compression reaches high efficiency on large JSON responses.',
      metadata: {
        createdAt: '2026-03-23T00:00:00.000Z',
        tags: ['lofi', 'drips-wave', 'stellar-wave', 'performance', 'backend'],
        counters: {
          likes: 100 + index,
          plays: 5000 + index,
          tips: 20 + index,
        },
      },
    }));
  }
}

function parseRawBuffer(res: any, callback: any) {
  let data = Buffer.from('');
  res.on('data', (chunk) => {
    data = Buffer.concat([data, chunk]);
  });
  res.on('end', () => callback(null, data));
}

describe('Response compression integration (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [CompressionTestController],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(createCompressionMiddleware());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('serves brotli when client requests br', async () => {
    const response = await request(app.getHttpServer())
      .get('/test-compression/tracks')
      .set('Accept-Encoding', 'br')
      .buffer(true)
      .parse(parseRawBuffer);

    expect(response.status).toBe(200);
    expect(response.headers['content-encoding']).toBe('br');
    expect(response.headers['vary'].toLowerCase()).toContain('accept-encoding');
  });

  it('falls back to gzip when br is not requested', async () => {
    const response = await request(app.getHttpServer())
      .get('/test-compression/tracks')
      .set('Accept-Encoding', 'gzip, deflate')
      .buffer(true)
      .parse(parseRawBuffer);

    expect(response.status).toBe(200);
    expect(response.headers['content-encoding']).toBe('gzip');
    expect(response.headers['vary'].toLowerCase()).toContain('accept-encoding');
  });

  it('does not compress responses smaller than 1KB', async () => {
    const response = await request(app.getHttpServer())
      .get('/test-compression/small')
      .set('Accept-Encoding', 'br, gzip')
      .expect(200);

    expect(response.headers['content-encoding']).toBeUndefined();
  });

  it('excludes binary upload and download endpoints from compression', async () => {
    const download = await request(app.getHttpServer())
      .get('/test-compression/files/demo.mp3')
      .set('Accept-Encoding', 'br, gzip')
      .expect(200);

    const stream = await request(app.getHttpServer())
      .get('/test-compression/files/demo.mp3/stream')
      .set('Accept-Encoding', 'br, gzip')
      .expect(200);

    const upload = await request(app.getHttpServer())
      .post('/test-compression/files/upload')
      .set('Accept-Encoding', 'br, gzip')
      .expect(201);

    expect(download.headers['content-encoding']).toBeUndefined();
    expect(stream.headers['content-encoding']).toBeUndefined();
    expect(upload.headers['content-encoding']).toBeUndefined();
  });

  it('achieves at least 40% size reduction for target large-list endpoints', async () => {
    for (const endpoint of endpointCases) {
      const baselineResponse = await request(app.getHttpServer())
        .get(endpoint.path)
        .set('Accept-Encoding', 'identity')
        .expect(200);

      const baselinePayload = Buffer.from(JSON.stringify(baselineResponse.body));
      const originalSize = baselinePayload.length;
      const brotliSize = zlib.brotliCompressSync(baselinePayload, {
        params: {
          [zlib.constants.BROTLI_PARAM_QUALITY]: 4,
        },
      }).length;
      const gzipSize = zlib.gzipSync(baselinePayload).length;
      const brotliRatio = 1 - brotliSize / originalSize;
      const gzipRatio = 1 - gzipSize / originalSize;
      expect(brotliRatio).toBeGreaterThanOrEqual(0.4);
      expect(gzipRatio).toBeGreaterThanOrEqual(0.4);
    }
  });
});
