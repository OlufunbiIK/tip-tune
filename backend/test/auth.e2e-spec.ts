import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "../src/app.module";
import * as cookieParser from "cookie-parser";

describe("AuthController (e2e)", () => {
  let app: INestApplication;
  let challengeId: string;
  let publicKey: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe("POST /api/auth/challenge", () => {
    it("should generate challenge for valid public key", () => {
      publicKey = "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX";
      return request(app.getHttpServer())
        .post("/api/auth/challenge")
        .send({ publicKey })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty("challengeId");
          expect(res.body).toHaveProperty("challenge");
          expect(res.body).toHaveProperty("expiresAt");
          challengeId = res.body.challengeId;
        });
    });

    it("should reject invalid public key format", () => {
      return request(app.getHttpServer())
        .post("/api/auth/challenge")
        .send({ publicKey: "invalid-key" })
        .expect(400);
    });

    it("should require publicKey in body", () => {
      return request(app.getHttpServer())
        .post("/api/auth/challenge")
        .send({})
        .expect(400);
    });
  });

  describe("POST /api/auth/verify", () => {
    it("should reject verification with invalid challenge", () => {
      return request(app.getHttpServer())
        .post("/api/auth/verify")
        .send({
          challengeId: "non-existent",
          publicKey: publicKey,
          signature: "signature",
        })
        .expect(401);
    });

    it("should require all fields", () => {
      return request(app.getHttpServer())
        .post("/api/auth/verify")
        .send({
          challengeId: challengeId,
          // missing publicKey and signature
        })
        .expect(400);
    });
  });
});
