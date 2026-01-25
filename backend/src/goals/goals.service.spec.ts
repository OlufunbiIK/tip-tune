import { Test, TestingModule } from "@nestjs/testing";
import { GoalsService } from "./goals.service";
import { getRepositoryToken } from "@nestjs/typeorm";
import { TipGoal, GoalStatus } from "./entities/tip-goal.entity";
import { GoalSupporter } from "./entities/goal-supporter.entity";
import { Repository } from "typeorm";

type MockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const createMockRepository = <T = any>(): MockRepository<T> => ({
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
});

describe("GoalsService", () => {
  let service: GoalsService;
  let goalsRepository: MockRepository;
  let supportersRepository: MockRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoalsService,
        {
          provide: getRepositoryToken(TipGoal),
          useValue: createMockRepository(),
        },
        {
          provide: getRepositoryToken(GoalSupporter),
          useValue: createMockRepository(),
        },
      ],
    }).compile();

    service = module.get<GoalsService>(GoalsService);
    goalsRepository = module.get<MockRepository>(getRepositoryToken(TipGoal));
    supportersRepository = module.get<MockRepository>(
      getRepositoryToken(GoalSupporter),
    );
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    it("should create and save a goal", async () => {
      const createDto = {
        title: "New Album",
        description: "Fund my new album",
        goalAmount: 1000,
      };
      const artistId = "artist-uuid";
      const expectedGoal = { id: "goal-uuid", ...createDto, artistId };

      goalsRepository.create.mockReturnValue(expectedGoal);
      goalsRepository.save.mockResolvedValue(expectedGoal);

      const result = await service.create(artistId, createDto);

      expect(goalsRepository.create).toHaveBeenCalledWith({
        ...createDto,
        artistId,
      });
      expect(goalsRepository.save).toHaveBeenCalledWith(expectedGoal);
      expect(result).toEqual(expectedGoal);
    });
  });

  describe("addSupport", () => {
    it("should update goal progress and create supporter", async () => {
      const goalId = "goal-uuid";
      const userId = "user-uuid";
      const amount = 100;
      const initialGoal = {
        id: goalId,
        goalAmount: 1000,
        currentAmount: 0,
        supporterCount: 0,
        status: GoalStatus.ACTIVE,
      };

      goalsRepository.findOne.mockResolvedValue(initialGoal);
      supportersRepository.create.mockReturnValue({
        goalId,
        userId,
        amountContributed: amount,
      });
      supportersRepository.save.mockResolvedValue({ id: "supporter-uuid" });
      goalsRepository.save.mockImplementation((goal) => Promise.resolve(goal));

      await service.addSupport(goalId, userId, amount);

      expect(supportersRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          goalId,
          userId,
          amountContributed: amount,
        }),
      );
      expect(goalsRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          currentAmount: 100,
          supporterCount: 1,
        }),
      );
    });
  });
});
