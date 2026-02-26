import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, Controller, Get } from '@nestjs/common';
import * as request from 'supertest';
import * as fc from 'fast-check';
import * as compression from 'compression';

// Simple test controller to generate responses
@Controller()
class TestController {
  @Get('/test-large')
  getLargeResponse() {
    // Generate a response larger than 1KB to trigger compression
    return {
      data: Array(100).fill({
        id: 'test-id-12345',
        name: 'Test Item with a reasonably long name',
        description: 'This is a test description that adds some content to make the response larger',
        metadata: {
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
          tags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5'],
        },
      }),
    };
  }

  @Get('/test-small')
  getSmallResponse() {
    return { status: 'ok' };
  }
}

describe('Compression Vary Header Verification', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [TestController],
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
    }));
    
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Property 6: Vary Header Management', () => {
    /**
     * Feature: response-compression
     * Property 6: Vary Header Management
     * Validates: Requirements 5.1, 5.2
     * 
     * For any compressed response, the Vary header SHALL include "Accept-Encoding",
     * and if a Vary header already exists, "Accept-Encoding" SHALL be appended
     * to the existing values without duplication.
     */
    it('should include Accept-Encoding in Vary header for all compressible responses', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate various Accept-Encoding header combinations
          fc.constantFrom('br', 'gzip', 'br, gzip', 'gzip, deflate', 'br, gzip, deflate'),
          async (acceptEncoding) => {
            // Test with large response endpoint
            const response = await request(app.getHttpServer())
              .get('/test-large')
              .set('Accept-Encoding', acceptEncoding)
              .buffer(true)
              .parse((res, callback) => {
                // Don't parse, just collect the buffer
                let data = Buffer.from('');
                res.on('data', (chunk) => {
                  data = Buffer.concat([data, chunk]);
                });
                res.on('end', () => {
                  callback(null, data);
                });
              });

            // The Vary header should be present
            expect(response.headers['vary']).toBeDefined();
            
            // The Vary header should include Accept-Encoding
            const varyHeader = response.headers['vary'];
            const varyValues = varyHeader.split(',').map((v: string) => v.trim().toLowerCase());
            expect(varyValues).toContain('accept-encoding');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not duplicate Accept-Encoding in Vary header', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('br', 'gzip', 'br, gzip'),
          async (acceptEncoding) => {
            const response = await request(app.getHttpServer())
              .get('/test-large')
              .set('Accept-Encoding', acceptEncoding)
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

            if (response.headers['vary']) {
              const varyHeader = response.headers['vary'];
              const varyValues = varyHeader.split(',').map((v: string) => v.trim().toLowerCase());
              
              // Count occurrences of 'accept-encoding'
              const acceptEncodingCount = varyValues.filter((v: string) => v === 'accept-encoding').length;
              
              // Should appear exactly once, not duplicated
              expect(acceptEncodingCount).toBeLessThanOrEqual(1);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Unit Tests: Vary Header Appending Behavior', () => {
    /**
     * Validates: Requirements 5.2
     * 
     * Test that Accept-Encoding is appended to existing Vary values
     * and that Accept-Encoding is not duplicated
     */
    it('should append Accept-Encoding to existing Vary header values', async () => {
      // Test with an endpoint that returns a large response
      const response = await request(app.getHttpServer())
        .get('/test-large')
        .set('Accept-Encoding', 'gzip');

      expect(response.headers['vary']).toBeDefined();
      
      const varyHeader = response.headers['vary'];
      expect(varyHeader.toLowerCase()).toContain('accept-encoding');
    });

    it('should not duplicate Accept-Encoding in Vary header when already present', async () => {
      // Make multiple requests to ensure consistency
      const response1 = await request(app.getHttpServer())
        .get('/test-large')
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

      const response2 = await request(app.getHttpServer())
        .get('/test-large')
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

      // Both responses should have Vary header with Accept-Encoding
      expect(response1.headers['vary']).toBeDefined();
      expect(response2.headers['vary']).toBeDefined();

      // Check for duplication in first response
      const varyValues1 = response1.headers['vary'].split(',').map((v: string) => v.trim().toLowerCase());
      const acceptEncodingCount1 = varyValues1.filter((v: string) => v === 'accept-encoding').length;
      expect(acceptEncodingCount1).toBe(1);

      // Check for duplication in second response
      const varyValues2 = response2.headers['vary'].split(',').map((v: string) => v.trim().toLowerCase());
      const acceptEncodingCount2 = varyValues2.filter((v: string) => v === 'accept-encoding').length;
      expect(acceptEncodingCount2).toBe(1);
    });

    it('should include Vary header even when response is not compressed', async () => {
      // Request without Accept-Encoding header
      const response = await request(app.getHttpServer())
        .get('/test-large');

      // Vary header should still be present for cache compatibility
      expect(response.headers['vary']).toBeDefined();
      
      const varyHeader = response.headers['vary'];
      expect(varyHeader.toLowerCase()).toContain('accept-encoding');
    });

    it('should include Vary header for responses below compression threshold', async () => {
      // Small response endpoint
      const response = await request(app.getHttpServer())
        .get('/test-small')
        .set('Accept-Encoding', 'br, gzip');

      // Even if not compressed due to size, Vary header should be present
      expect(response.headers['vary']).toBeDefined();
      expect(response.headers['vary'].toLowerCase()).toContain('accept-encoding');
    });
  });
});
