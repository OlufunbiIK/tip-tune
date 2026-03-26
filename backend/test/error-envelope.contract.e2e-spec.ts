import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { ConfigService } from '@nestjs/config';

describe('Error Envelope Contract Tests (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Error Response Schema', () => {
    it('/api/v1/tracks/:id (GET) - should return consistent 404 error envelope', async () => {
      const invalidId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app.getHttpServer())
        .get(`/api/v1/tracks/${invalidId}`)
        .expect(HttpStatus.NOT_FOUND);

      // Validate error envelope structure
      expect(response.body).toMatchObject({
        statusCode: HttpStatus.NOT_FOUND,
        error: 'Not Found',
        message: expect.any(String),
        path: `/api/v1/tracks/${invalidId}`,
      });

      // Validate required fields exist
      expect(response.body).toHaveProperty('statusCode');
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('path');
      
      // Validate types
      expect(typeof response.body.statusCode).toBe('number');
      expect(typeof response.body.error).toBe('string');
      expect(typeof response.body.message).toBe('string');
      expect(typeof response.body.path).toBe('string');
      
      // Check headers
      expect(response.headers['x-error-id']).toBeDefined();
      expect(response.headers['x-timestamp']).toBeDefined();
    });

    it('/api/v1/users/:id (GET) - should return consistent 400 error envelope for invalid UUID', async () => {
      const invalidId = 'not-a-uuid';
      const response = await request(app.getHttpServer())
        .get(`/api/v1/users/${invalidId}`)
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body).toMatchObject({
        statusCode: HttpStatus.BAD_REQUEST,
        error: 'Bad Request',
        message: expect.any(String),
        path: `/api/v1/users/${invalidId}`,
      });

      expect(response.body).toHaveProperty('statusCode');
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('path');
    });

    it('/api/v1/auth/verify (POST) - should return consistent 400 error envelope for missing body', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/verify')
        .send({})
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body).toMatchObject({
        statusCode: HttpStatus.BAD_REQUEST,
        error: 'Bad Request',
        message: expect.anything(),
        path: '/api/v1/auth/verify',
      });

      expect(response.body).toHaveProperty('statusCode');
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('path');
    });

    it('/api/v1/tracks/search (GET) - should return consistent 400 error envelope for missing query', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/tracks/search')
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body).toMatchObject({
        statusCode: HttpStatus.BAD_REQUEST,
        error: 'Bad Request',
        message: expect.any(String),
        path: '/api/v1/tracks/search',
      });

      expect(response.body).toHaveProperty('statusCode');
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('path');
    });
  });

  describe('Validation Error Schema', () => {
    it('/api/v1/users (POST) - should return consistent validation error envelope', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/users')
        .send({})
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body).toMatchObject({
        statusCode: HttpStatus.BAD_REQUEST,
        error: 'Bad Request',
        message: expect.anything(),
        path: '/api/v1/users',
      });

      // Validation errors might be in details or message array
      expect(
        response.body.message || 
        (response.body.details && response.body.details.errors)
      ).toBeDefined();
    });
  });
});
