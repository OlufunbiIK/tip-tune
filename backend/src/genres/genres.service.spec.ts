import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { GenresService } from "./genres.service";
import { Genre } from "./entities/genre.entity";
import { TrackGenre } from "./entities/track-genre.entity";
import { Track } from "../tracks/entities/track.entity";
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";

describe("GenresService", () => {
  let service: GenresService;
  let genreRepository: Repository<Genre>;
  let trackGenreRepository: Repository<TrackGenre>;
  let trackRepository: Repository<Track>;

  const mockGenreRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    count: jest.fn(),
  };

  const mockTrackGenreRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    delete: jest.fn(),
    remove: jest.fn(),
    count: jest.fn(),
  };

  const mockTrackRepository = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GenresService,
        {
          provide: getRepositoryToken(Genre),
          useValue: mockGenreRepository,
        },
        {
          provide: getRepositoryToken(TrackGenre),
          useValue: mockTrackGenreRepository,
        },
        {
          provide: getRepositoryToken(Track),
          useValue: mockTrackRepository,
        },
      ],
    }).compile();

    service = module.get<GenresService>(GenresService);
    genreRepository = module.get<Repository<Genre>>(getRepositoryToken(Genre));
    trackGenreRepository = module.get<Repository<TrackGenre>>(
      getRepositoryToken(TrackGenre),
    );
    trackRepository = module.get<Repository<Track>>(getRepositoryToken(Track));

    // Reset mocks
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    it("should create a new genre", async () => {
      const createDto = {
        name: "Electronic",
        description: "Electronic music",
      };

      const savedGenre = {
        id: "genre-id",
        name: "Electronic",
        slug: "electronic",
        description: "Electronic music",
        parentGenreId: null,
        trackCount: 0,
        createdAt: new Date(),
      };

      mockGenreRepository.findOne.mockResolvedValue(null); // No existing genre
      mockGenreRepository.create.mockReturnValue(savedGenre);
      mockGenreRepository.save.mockResolvedValue(savedGenre);

      const result = await service.create(createDto);

      expect(result).toEqual(savedGenre);
      expect(mockGenreRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Electronic",
          slug: "electronic",
          description: "Electronic music",
        }),
      );
      expect(mockGenreRepository.save).toHaveBeenCalled();
    });

    it("should throw ConflictException if genre name already exists", async () => {
      const createDto = {
        name: "Electronic",
      };

      mockGenreRepository.findOne.mockResolvedValue({
        id: "existing-id",
        name: "Electronic",
      });

      await expect(service.create(createDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it("should create genre with parent", async () => {
      const parentGenre = {
        id: "parent-id",
        name: "Electronic",
      };

      const createDto = {
        name: "House",
        parentGenreId: "parent-id",
      };

      const savedGenre = {
        id: "genre-id",
        name: "House",
        slug: "house",
        parentGenreId: "parent-id",
        trackCount: 0,
      };

      mockGenreRepository.findOne
        .mockResolvedValueOnce(null) // No existing genre with name
        .mockResolvedValueOnce(null) // No existing genre with slug
        .mockResolvedValueOnce(parentGenre); // Parent exists

      mockGenreRepository.create.mockReturnValue(savedGenre);
      mockGenreRepository.save.mockResolvedValue(savedGenre);

      const result = await service.create(createDto);

      expect(result.parentGenreId).toBe("parent-id");
    });

    it("should throw NotFoundException if parent genre does not exist", async () => {
      const createDto = {
        name: "House",
        parentGenreId: "non-existent-id",
      };

      mockGenreRepository.findOne
        .mockResolvedValueOnce(null) // No existing genre with name
        .mockResolvedValueOnce(null) // No existing genre with slug
        .mockResolvedValueOnce(null); // Parent does not exist

      await expect(service.create(createDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("findOne", () => {
    it("should return a genre by ID", async () => {
      const genre = {
        id: "genre-id",
        name: "Electronic",
        slug: "electronic",
      };

      mockGenreRepository.findOne.mockResolvedValue(genre);

      const result = await service.findOne("genre-id");

      expect(result).toEqual(genre);
      expect(mockGenreRepository.findOne).toHaveBeenCalledWith({
        where: { id: "genre-id" },
        relations: ["parent", "children", "trackGenres"],
      });
    });

    it("should throw NotFoundException if genre does not exist", async () => {
      mockGenreRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne("non-existent-id")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("getChildren", () => {
    it("should return children of a genre", async () => {
      const parent = {
        id: "parent-id",
        name: "Electronic",
      };

      const children = [
        { id: "child-1", name: "House", parentGenreId: "parent-id" },
        { id: "child-2", name: "Techno", parentGenreId: "parent-id" },
      ];

      mockGenreRepository.findOne.mockResolvedValue(parent);
      mockGenreRepository.find.mockResolvedValue(children);

      const result = await service.getChildren("parent-id");

      expect(result).toEqual(children);
      expect(mockGenreRepository.find).toHaveBeenCalledWith({
        where: { parentGenreId: "parent-id" },
        order: { name: "ASC" },
      });
    });
  });

  describe("assignGenresToTrack", () => {
    it("should assign genres to a track", async () => {
      const trackId = "track-id";
      const genreIds = ["genre-1", "genre-2"];

      const track = { id: trackId, title: "Test Track" };
      const genres = [
        { id: "genre-1", name: "Electronic" },
        { id: "genre-2", name: "House" },
      ];

      mockTrackRepository.findOne.mockResolvedValue(track);
      mockGenreRepository.find.mockResolvedValue(genres);
      mockTrackGenreRepository.delete.mockResolvedValue({ affected: 1 });
      mockTrackGenreRepository.create.mockImplementation((data) => data);
      mockTrackGenreRepository.save.mockResolvedValue([
        { id: "tg-1", trackId, genreId: "genre-1" },
        { id: "tg-2", trackId, genreId: "genre-2" },
      ]);

      const result = await service.assignGenresToTrack(trackId, genreIds);

      expect(result).toHaveLength(2);
      expect(mockTrackGenreRepository.delete).toHaveBeenCalledWith({ trackId });
      expect(mockTrackGenreRepository.save).toHaveBeenCalled();
    });

    it("should throw NotFoundException if track does not exist", async () => {
      mockTrackRepository.findOne.mockResolvedValue(null);

      await expect(
        service.assignGenresToTrack("non-existent", ["genre-1"]),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw NotFoundException if genre does not exist", async () => {
      const track = { id: "track-id" };
      mockTrackRepository.findOne.mockResolvedValue(track);
      mockGenreRepository.find.mockResolvedValue([{ id: "genre-1" }]); // Only one genre found

      await expect(
        service.assignGenresToTrack("track-id", ["genre-1", "non-existent"]),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("remove", () => {
    it("should remove a genre", async () => {
      const genre = {
        id: "genre-id",
        name: "Electronic",
      };

      mockGenreRepository.findOne.mockResolvedValue(genre);
      mockGenreRepository.find.mockResolvedValue([]); // No children
      mockTrackGenreRepository.count.mockResolvedValue(0); // No tracks assigned
      mockGenreRepository.remove.mockResolvedValue(genre);

      await service.remove("genre-id");

      expect(mockGenreRepository.remove).toHaveBeenCalledWith(genre);
    });

    it("should throw BadRequestException if genre has children", async () => {
      const genre = { id: "genre-id" };
      const children = [{ id: "child-1" }];

      mockGenreRepository.findOne.mockResolvedValue(genre);
      mockGenreRepository.find.mockResolvedValue(children);

      await expect(service.remove("genre-id")).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw BadRequestException if genre is assigned to tracks", async () => {
      const genre = { id: "genre-id" };

      mockGenreRepository.findOne.mockResolvedValue(genre);
      mockGenreRepository.find.mockResolvedValue([]); // No children
      mockTrackGenreRepository.count.mockResolvedValue(5); // 5 tracks assigned

      await expect(service.remove("genre-id")).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe("getPopular", () => {
    it("should return popular genres ordered by track count", async () => {
      const genres = [
        { id: "1", name: "Electronic", trackCount: 100 },
        { id: "2", name: "House", trackCount: 50 },
      ];

      mockGenreRepository.find.mockResolvedValue(genres);

      const result = await service.getPopular(10);

      expect(result).toEqual(genres);
      expect(mockGenreRepository.find).toHaveBeenCalledWith({
        order: { trackCount: "DESC", name: "ASC" },
        take: 10,
        relations: ["parent"],
      });
    });
  });

  describe("getDiscovery", () => {
    it("should return root genres and all genres", async () => {
      const rootGenres = [
        { id: "1", name: "Electronic", parentGenreId: null },
        { id: "2", name: "Rock", parentGenreId: null },
      ];

      const allGenres = [
        ...rootGenres,
        { id: "3", name: "House", parentGenreId: "1" },
      ];

      mockGenreRepository.find
        .mockResolvedValueOnce(rootGenres) // Root genres query
        .mockResolvedValueOnce(allGenres); // All genres query

      const result = await service.getDiscovery();

      expect(result.rootGenres).toEqual(rootGenres);
      expect(result.allGenres).toEqual(allGenres);
    });
  });
});
