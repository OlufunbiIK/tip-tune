import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "../src/app.module";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Track } from "../src/tracks/entities/track.entity";
import { Repository } from "typeorm";
import * as path from "path";
import * as fs from "fs";

describe("Storage and Tracks Integration (e2e)", () => {
  let app: INestApplication;
  let tracksRepository: Repository<Track>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    tracksRepository = moduleFixture.get<Repository<Track>>(
      getRepositoryToken(Track),
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clean up database before each test
    await tracksRepository.clear();

    // Clean up uploaded files
    const uploadDir = "./uploads";
    if (fs.existsSync(uploadDir)) {
      fs.readdirSync(uploadDir).forEach((file) => {
        fs.unlinkSync(path.join(uploadDir, file));
      });
    }
  });

  describe("File Upload and Track Creation", () => {
    const createTestFile = (filename: string, mimeType: string): Buffer => {
      // Create a minimal valid audio file buffer (simplified for testing)
      const buffer = Buffer.alloc(1024); // 1KB dummy file
      return buffer;
    };

    it("should upload an MP3 file and create a track", async () => {
      const trackData = {
        title: "Test Track",
        artist: "Test Artist",
        genre: "rock",
        isPublic: true,
      };

      const testFile = createTestFile("test.mp3", "audio/mpeg");

      const response = await request(app.getHttpServer())
        .post("/api/tracks")
        .field("title", trackData.title)
        .field("artist", trackData.artist)
        .field("genre", trackData.genre)
        .field("isPublic", trackData.isPublic)
        .attach("file", testFile, "test.mp3")
        .expect(201);

      expect(response.body).toHaveProperty("id");
      expect(response.body.title).toBe(trackData.title);
      expect(response.body.artist).toBe(trackData.artist);
      expect(response.body.filename).toBeDefined();
      expect(response.body.url).toBeDefined();
      expect(response.body.streamingUrl).toBeDefined();
      expect(response.body.mimeType).toBe("audio/mpeg");
    });

    it("should reject invalid file types", async () => {
      const trackData = {
        title: "Test Track",
      };

      const invalidFile = Buffer.from("fake image content");

      await request(app.getHttpServer())
        .post("/api/tracks")
        .field("title", trackData.title)
        .attach("file", invalidFile, "test.txt")
        .expect(400);
    });

    it("should reject files that are too large", async () => {
      const trackData = {
        title: "Test Track",
      };

      // Create a file larger than 50MB (simulated)
      const largeFile = Buffer.alloc(51 * 1024 * 1024); // 51MB

      await request(app.getHttpServer())
        .post("/api/tracks")
        .field("title", trackData.title)
        .attach("file", largeFile, "large.mp3")
        .expect(400);
    });

    it("should require a file upload", async () => {
      const trackData = {
        title: "Test Track",
      };

      await request(app.getHttpServer())
        .post("/api/tracks")
        .send(trackData)
        .expect(400);
    });
  });

  describe("File Streaming", () => {
    let createdTrack: Track;

    beforeEach(async () => {
      // Create a test track first
      const trackData = {
        title: "Test Streaming Track",
        artist: "Test Artist",
      };

      const testFile = Buffer.alloc(1024);

      const response = await request(app.getHttpServer())
        .post("/api/tracks")
        .field("title", trackData.title)
        .field("artist", trackData.artist)
        .attach("file", testFile, "test.mp3")
        .expect(201);

      createdTrack = response.body;
    });

    it("should stream an uploaded file", async () => {
      await request(app.getHttpServer())
        .get(`/api/files/${createdTrack.filename}/stream`)
        .expect(200)
        .expect("Content-Type", /audio/);
    });

    it("should return 404 for non-existent file", async () => {
      await request(app.getHttpServer())
        .get("/api/files/non-existent.mp3/stream")
        .expect(404);
    });

    it("should provide file information", async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/files/${createdTrack.filename}/info`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.filename).toBe(createdTrack.filename);
      expect(response.body.data.size).toBeDefined();
      expect(response.body.data.mimeType).toBeDefined();
      expect(response.body.data.streamingUrl).toBeDefined();
    });
  });

  describe("Track Management", () => {
    let createdTrack: Track;

    beforeEach(async () => {
      const trackData = {
        title: "Test Management Track",
        artist: "Test Artist",
        genre: "pop",
        isPublic: true,
      };

      const testFile = Buffer.alloc(1024);

      const response = await request(app.getHttpServer())
        .post("/api/tracks")
        .field("title", trackData.title)
        .field("artist", trackData.artist)
        .field("genre", trackData.genre)
        .field("isPublic", trackData.isPublic)
        .attach("file", testFile, "test.mp3")
        .expect(201);

      createdTrack = response.body;
    });

    it("should retrieve all tracks", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/tracks")
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(1);
      expect(response.body[0].id).toBe(createdTrack.id);
    });

    it("should retrieve public tracks only", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/tracks/public")
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(1);
      expect(response.body[0].isPublic).toBe(true);
    });

    it("should search tracks by title", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/tracks/search?q=Management")
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(1);
      expect(response.body[0].title).toContain("Management");
    });

    it("should find tracks by artist", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/tracks/artist/Test Artist")
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(1);
      expect(response.body[0].artist).toBe("Test Artist");
    });

    it("should find tracks by genre", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/tracks/genre/pop")
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(1);
      expect(response.body[0].genre).toBe("pop");
    });

    it("should update track information", async () => {
      const updateData = {
        title: "Updated Track Title",
        description: "Updated description",
      };

      const response = await request(app.getHttpServer())
        .patch(`/api/tracks/${createdTrack.id}`)
        .send(updateData)
        .expect(200);

      expect(response.body.title).toBe(updateData.title);
      expect(response.body.description).toBe(updateData.description);
    });

    it("should increment play count", async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/tracks/${createdTrack.id}/play`)
        .expect(200);

      expect(response.body.playCount).toBe(1);
    });

    it("should delete track and associated file", async () => {
      await request(app.getHttpServer())
        .delete(`/api/tracks/${createdTrack.id}`)
        .expect(200);

      // Verify track is deleted
      await request(app.getHttpServer())
        .get(`/api/tracks/${createdTrack.id}`)
        .expect(404);

      // Verify file is deleted
      await request(app.getHttpServer())
        .get(`/api/files/${createdTrack.filename}/info`)
        .expect(400);
    });
  });

  describe("Error Handling", () => {
    it("should handle malformed UUID in track endpoints", async () => {
      await request(app.getHttpServer())
        .get("/api/tracks/invalid-uuid")
        .expect(400);

      await request(app.getHttpServer())
        .patch("/api/tracks/invalid-uuid")
        .send({ title: "Updated" })
        .expect(400);

      await request(app.getHttpServer())
        .delete("/api/tracks/invalid-uuid")
        .expect(400);
    });

    it("should handle missing search query", async () => {
      await request(app.getHttpServer()).get("/api/tracks/search").expect(400);
    });
  });
});
