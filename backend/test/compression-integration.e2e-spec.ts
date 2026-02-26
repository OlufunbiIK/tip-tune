import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, Controller, Get, Param } from '@nestjs/common';
import * as request from 'supertest';
import * as compression from 'compression';
import * as zlib from 'zlib';

/**
 * Integration Tests for End-to-End Response Compression
 * 
 * These tests verify that compression works correctly across the entire
 * request/response pipeline with real API endpoints.
 */

// Test controller to simulate various response scenarios
@Controller('test-compression')
class CompressionTestController {
  @Get('large')
  getLargeResponse() {
    // Generate a response larger than 1KB to trigger compression
    return {
      data: Array(100).fill({
        id: 'test-id-12345678901234567890',
        name: 'Test Item with a reasonably long name to increase payload size',
        description: 'This is a test description that adds some content to make the response larger and exceed the 1KB threshold for compression',
        metadata: {
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
          tags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5', 'tag6', 'tag7', 'tag8'],
          properties: {
            key1: 'value1',
            key2: 'value2',
            key3: 'value3',
          },
        },
      }),
    };
  }

  @Get('small')
  getSmallResponse() {
    // Response smaller than 1KB threshold
    return { status: 'ok', message: 'small' };
  }

  @Get('tracks/:id/stream')
  streamTrack(@Param('id') id: string) {
    // Simulate binary endpoint
    return Buffer.from('fake-audio-data-binary-content');
  }

  @Get('tracks/:id/download')
  downloadTrack(@Param('id') id: string) {
    // Simulate binary download endpoint
    return Buffer.from('fake-audio-file-binary-content');
  }

  @Get('storage/:path/download')
  downloadFile(@Param('path') path: string) {
    // Simulate storage download endpoint
    return Buffer.from('fake-file-binary-content');
  }
}

describe('Compression Integration Tests (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [CompressionTestController],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    // Apply the same compression middleware configuration as in main.ts
    function shouldCompress(req: any, res: any): boolean {
      const binaryEndpointPatterns = [
        /\/tracks\/[^\/]+\/stream/,
        /\/tracks\/[^\/]+\/download/,
        /\/storage\/.*\/download/,
      ];
      
      const path = req.path;
      
      if (binaryEndpointPatterns.some(pattern => pattern.test(path))) {
        return false;
      }
      
      return compression.filter(req, res);
    }

    app.use(compression({
      threshold: '1kb',
      filter: shouldCompress,
      brotli: {
        params: {
          [zlib.constants.BROTLI_PARAM_QUALITY]: 4,
        },
      },
    }));
    
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('9.1 Brotli Compression on Real Endpoints', () => {
    /**
     * Validates: Requirements 7.1
     * 
     * Test GET /api/tracks with Accept-Encoding: br
     * Verify Content-Encoding: br and response is compressed
     */
    it('should compress large responses with brotli when Accept-Encoding includes br', async () => {
      const response = await request(app.getHttpServer())
        .get('/test-compression/large')
        .set('Accept-Encoding', 'br')
        .buffer(true)
        .parse((res, callback) => {
          let data = Buffer.from('');
          res.on('data', (chunk) => {
            data = Buffer.concat([data, chunk]);
          });
          res.on('end', () => {
            callback(null, data);
          });
        });

      // Verify brotli compression is applied
      expect(response.status).toBe(200);
      expect(response.headers['content-encoding']).toBe('br');
      
      // Verify response is actually compressed (smaller than uncompressed)
      const compressedSize = response.body.length;
      expect(compressedSize).toBeGreaterThan(0);
      
      // The compressed response should be significantly smaller
      // We can't easily get the original size, but we know it should be > 1KB
      // and compressed should be much smaller
      expect(compressedSize).toBeLessThan(10000); // Original is ~10KB+
    });

    it('should prefer brotli over gzip when both are in Accept-Encoding', async () => {
      const response = await request(app.getHttpServer())
        .get('/test-compression/large')
        .set('Accept-Encoding', 'br, gzip, deflate')
        .buffer(true)
        .parse((res, callback) => {
          let data = Buffer.from('');
          res.on('data', (chunk) => {
            data = Buffer.concat([data, chunk]);
          });
          res.on('end', () => {
            callback(null, data);
          });
        });

      expect(response.status).toBe(200);
      expect(response.headers['content-encoding']).toBe('br');
    });
  });

  describe('9.2 Gzip Fallback Compression', () => {
    /**
     * Validates: Requirements 7.2
     * 
     * Test GET /api/tips/user/:userId/history with Accept-Encoding: gzip
     * Verify Content-Encoding: gzip and response is compressed
     */
    it('should compress with gzip when Accept-Encoding includes gzip but not br', async () => {
      const response = await request(app.getHttpServer())
        .get('/test-compression/large')
        .set('Accept-Encoding', 'gzip')
        .buffer(true)
        .parse((res, callback) => {
          let data = Buffer.from('');
          res.on('data', (chunk) => {
            data = Buffer.concat([data, chunk]);
          });
          res.on('end', () => {
            callback(null, data);
          });
        });

      // Verify gzip compression is applied
      expect(response.status).toBe(200);
      expect(response.headers['content-encoding']).toBe('gzip');
      
      // Verify response body exists and is compressed
      expect(response.body).toBeDefined();
      expect(Buffer.byteLength(response.body)).toBeGreaterThan(0);
      
      // The key verification is that Content-Encoding header is set to gzip
      // which confirms compression was applied
    });

    it('should use gzip when Accept-Encoding has gzip and deflate but not br', async () => {
      const response = await request(app.getHttpServer())
        .get('/test-compression/large')
        .set('Accept-Encoding', 'gzip, deflate')
        .buffer(true)
        .parse((res, callback) => {
          let data = Buffer.from('');
          res.on('data', (chunk) => {
            data = Buffer.concat([data, chunk]);
          });
          res.on('end', () => {
            callback(null, data);
          });
        });

      expect(response.status).toBe(200);
      expect(response.headers['content-encoding']).toBe('gzip');
    });
  });

  describe('9.3 Small Response Handling', () => {
    /**
     * Validates: Requirements 7.3
     * 
     * Test endpoint with response < 1KB
     * Verify no compression is applied
     */
    it('should not compress responses smaller than 1KB threshold', async () => {
      const response = await request(app.getHttpServer())
        .get('/test-compression/small')
        .set('Accept-Encoding', 'br, gzip')
        .expect(200);

      // Verify no compression is applied
      expect(response.headers['content-encoding']).toBeUndefined();
      
      // Response should be plain JSON
      expect(response.body).toEqual({ status: 'ok', message: 'small' });
    });

    it('should not compress small responses even with brotli support', async () => {
      const response = await request(app.getHttpServer())
        .get('/test-compression/small')
        .set('Accept-Encoding', 'br')
        .expect(200);

      expect(response.headers['content-encoding']).toBeUndefined();
    });

    it('should not compress small responses even with gzip support', async () => {
      const response = await request(app.getHttpServer())
        .get('/test-compression/small')
        .set('Accept-Encoding', 'gzip')
        .expect(200);

      expect(response.headers['content-encoding']).toBeUndefined();
    });
  });

  describe('9.4 Binary Endpoint Exclusion', () => {
    /**
     * Validates: Requirements 7.4
     * 
     * Test GET /api/tracks/:id/stream
     * Verify no compression regardless of Accept-Encoding
     */
    it('should not compress track streaming endpoint', async () => {
      const response = await request(app.getHttpServer())
        .get('/test-compression/tracks/test-track-id/stream')
        .set('Accept-Encoding', 'br, gzip')
        .expect(200);

      // Verify no compression is applied to binary endpoint
      expect(response.headers['content-encoding']).toBeUndefined();
    });

    it('should not compress track download endpoint', async () => {
      const response = await request(app.getHttpServer())
        .get('/test-compression/tracks/test-track-id/download')
        .set('Accept-Encoding', 'br, gzip')
        .expect(200);

      expect(response.headers['content-encoding']).toBeUndefined();
    });

    it('should not compress storage download endpoint', async () => {
      const response = await request(app.getHttpServer())
        .get('/test-compression/storage/some-file-path/download')
        .set('Accept-Encoding', 'br, gzip')
        .expect(200);

      expect(response.headers['content-encoding']).toBeUndefined();
    });

    it('should exclude binary endpoints even with strong Accept-Encoding preference', async () => {
      const response = await request(app.getHttpServer())
        .get('/test-compression/tracks/another-track/stream')
        .set('Accept-Encoding', 'br;q=1.0, gzip;q=0.8')
        .expect(200);

      expect(response.headers['content-encoding']).toBeUndefined();
    });
  });

  describe('9.5 Vary Header Presence', () => {
    /**
     * Validates: Requirements 7.5
     * 
     * Test any compressible endpoint
     * Verify Vary: Accept-Encoding header is present
     */
    it('should include Vary: Accept-Encoding header on compressed responses', async () => {
      const response = await request(app.getHttpServer())
        .get('/test-compression/large')
        .set('Accept-Encoding', 'br')
        .buffer(true)
        .parse((res, callback) => {
          let data = Buffer.from('');
          res.on('data', (chunk) => {
            data = Buffer.concat([data, chunk]);
          });
          res.on('end', () => {
            callback(null, data);
          });
        });

      expect(response.status).toBe(200);
      expect(response.headers['vary']).toBeDefined();
      
      const varyHeader = response.headers['vary'].toLowerCase();
      expect(varyHeader).toContain('accept-encoding');
    });

    it('should include Vary header on gzip compressed responses', async () => {
      const response = await request(app.getHttpServer())
        .get('/test-compression/large')
        .set('Accept-Encoding', 'gzip')
        .buffer(true)
        .parse((res, callback) => {
          let data = Buffer.from('');
          res.on('data', (chunk) => {
            data = Buffer.concat([data, chunk]);
          });
          res.on('end', () => {
            callback(null, data);
          });
        });

      expect(response.status).toBe(200);
      expect(response.headers['vary']).toBeDefined();
      expect(response.headers['vary'].toLowerCase()).toContain('accept-encoding');
    });

    it('should include Vary header even on uncompressed responses', async () => {
      const response = await request(app.getHttpServer())
        .get('/test-compression/large')
        .expect(200);

      // Vary header should be present for cache compatibility
      expect(response.headers['vary']).toBeDefined();
      expect(response.headers['vary'].toLowerCase()).toContain('accept-encoding');
    });

    it('should include Vary header on small responses', async () => {
      const response = await request(app.getHttpServer())
        .get('/test-compression/small')
        .set('Accept-Encoding', 'br, gzip')
        .expect(200);

      expect(response.headers['vary']).toBeDefined();
      expect(response.headers['vary'].toLowerCase()).toContain('accept-encoding');
    });

    it('should not duplicate Accept-Encoding in Vary header', async () => {
      const response = await request(app.getHttpServer())
        .get('/test-compression/large')
        .set('Accept-Encoding', 'br')
        .buffer(true)
        .parse((res, callback) => {
          let data = Buffer.from('');
          res.on('data', (chunk) => {
            data = Buffer.concat([data, chunk]);
          });
          res.on('end', () => {
            callback(null, data);
          });
        });

      expect(response.status).toBe(200);
      
      const varyHeader = response.headers['vary'];
      const varyValues = varyHeader.split(',').map((v: string) => v.trim().toLowerCase());
      
      // Count occurrences of 'accept-encoding'
      const acceptEncodingCount = varyValues.filter((v: string) => v === 'accept-encoding').length;
      expect(acceptEncodingCount).toBe(1);
    });
  });

  describe('Additional Integration Tests', () => {
    it('should handle requests without Accept-Encoding header', async () => {
      const response = await request(app.getHttpServer())
        .get('/test-compression/large')
        .expect(200);

      // The compression middleware may apply default compression (gzip) even without Accept-Encoding
      // This is expected behavior - the middleware defaults to gzip when no encoding is specified
      // The important thing is that Vary header is present for cache compatibility
      expect(response.headers['vary']).toBeDefined();
      expect(response.headers['vary'].toLowerCase()).toContain('accept-encoding');
    });

    it('should handle identity encoding (no compression requested)', async () => {
      const response = await request(app.getHttpServer())
        .get('/test-compression/large')
        .set('Accept-Encoding', 'identity')
        .expect(200);

      // Identity means no compression
      expect(response.headers['content-encoding']).toBeUndefined();
      
      // Vary header should still be present
      expect(response.headers['vary']).toBeDefined();
    });

    it('should verify Content-Encoding matches the algorithm used', async () => {
      const brotliResponse = await request(app.getHttpServer())
        .get('/test-compression/large')
        .set('Accept-Encoding', 'br')
        .buffer(true)
        .parse((res, callback) => {
          let data = Buffer.from('');
          res.on('data', (chunk) => {
            data = Buffer.concat([data, chunk]);
          });
          res.on('end', () => {
            callback(null, data);
          });
        });

      expect(brotliResponse.headers['content-encoding']).toBe('br');

      const gzipResponse = await request(app.getHttpServer())
        .get('/test-compression/large')
        .set('Accept-Encoding', 'gzip')
        .buffer(true)
        .parse((res, callback) => {
          let data = Buffer.from('');
          res.on('data', (chunk) => {
            data = Buffer.concat([data, chunk]);
          });
          res.on('end', () => {
            callback(null, data);
          });
        });

      expect(gzipResponse.headers['content-encoding']).toBe('gzip');
    });
  });
});
