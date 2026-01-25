import { Test, TestingModule } from "@nestjs/testing";
import { SearchController } from "./search.controller";
import { SearchService } from "./search.service";

describe("SearchController", () => {
  let controller: SearchController;
  let searchService: SearchService;

  const mockSearchResult = {
    artists: {
      data: [{ id: "a1", artistName: "Artist 1", genre: "rock" }],
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    },
    tracks: {
      data: [{ id: "t1", title: "Track 1", genre: "rock" }],
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    },
  };

  const mockSuggestions = {
    artists: [
      {
        type: "artist" as const,
        id: "a1",
        title: "Artist 1",
        subtitle: "rock",
      },
    ],
    tracks: [
      {
        type: "track" as const,
        id: "t1",
        title: "Track 1",
        subtitle: "rock · Artist 1",
      },
    ],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SearchController],
      providers: [
        {
          provide: SearchService,
          useValue: {
            search: jest.fn().mockResolvedValue(mockSearchResult),
            getSuggestions: jest.fn().mockResolvedValue(mockSuggestions),
          },
        },
      ],
    }).compile();

    controller = module.get<SearchController>(SearchController);
    searchService = module.get<SearchService>(SearchService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("search", () => {
    it("should call SearchService.search with query params", async () => {
      const dto = { q: "rock", type: "track" as const, page: 1, limit: 10 };
      const result = await controller.search(dto);
      expect(searchService.search).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockSearchResult);
    });
  });

  describe("getSuggestions", () => {
    it("should call SearchService.getSuggestions with query params", async () => {
      const dto = { q: "roc", limit: 10 };
      const result = await controller.getSuggestions(dto);
      expect(searchService.getSuggestions).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockSuggestions);
    });
  });
});
