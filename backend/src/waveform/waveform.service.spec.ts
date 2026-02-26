import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WaveformService } from './waveform.service';
import { WaveformGeneratorService } from './waveform-generator.service';
import { TrackWaveform, GenerationStatus } from './entities/track-waveform.entity';
import { NotFoundException } from '@nestjs/common';

describe('WaveformService', () => {
  let service: WaveformService;
  let repository: Repository<TrackWaveform>;
  let generator: WaveformGeneratorService;

  const mockRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockGenerator = {
    generateWaveform: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WaveformService,
        {
          provide: getRepositoryToken(TrackWaveform),
          useValue: mockRepository,
        },
        {
          provide: WaveformGeneratorService,
          useValue: mockGenerator,
        },
      ],
    }).compile();

    service = module.get<WaveformService>(WaveformService);
    repository = module.get<Repository<TrackWaveform>>(getRepositoryToken(TrackWaveform));
    generator = module.get<WaveformGeneratorService>(WaveformGeneratorService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateForTrack', () => {
    it('should generate waveform successfully', async () => {
      const trackId = 'test-track-id';
      const audioPath = '/path/to/audio.mp3';
      const mockWaveformData = Array(200).fill(0.5);
      const mockPeakAmplitude = 0.95;

      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue({ trackId, dataPoints: 200 });
      mockRepository.save.mockResolvedValue({ id: 'waveform-id', trackId });
      mockGenerator.generateWaveform.mockResolvedValue({
        waveformData: mockWaveformData,
        peakAmplitude: mockPeakAmplitude,
      });

      const result = await service.generateForTrack(trackId, audioPath);

      expect(mockGenerator.generateWaveform).toHaveBeenCalledWith(audioPath, 200);
      expect(mockRepository.save).toHaveBeenCalled();
      expect(result.trackId).toBe(trackId);
    });

    it('should handle generation failure and retry', async () => {
      const trackId = 'test-track-id';
      const audioPath = '/path/to/audio.mp3';

      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue({ trackId, dataPoints: 200, retryCount: 0 });
      mockRepository.save.mockImplementation((entity) => Promise.resolve({ ...entity }));
      mockGenerator.generateWaveform.mockRejectedValue(new Error('Generation failed'));

      await expect(service.generateForTrack(trackId, audioPath)).rejects.toThrow('Generation failed');
      expect(mockRepository.save).toHaveBeenCalledTimes(2);
      expect(mockRepository.save).toHaveBeenLastCalledWith(
        expect.objectContaining({ 
          retryCount: 1,
          generationStatus: GenerationStatus.PENDING
        })
      );
    });
  });

  describe('getByTrackId', () => {
    it('should return waveform for valid trackId', async () => {
      const trackId = 'test-track-id';
      const mockWaveform = { id: 'waveform-id', trackId, waveformData: [] };

      mockRepository.findOne.mockResolvedValue(mockWaveform);

      const result = await service.getByTrackId(trackId);

      expect(result).toEqual(mockWaveform);
      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { trackId } });
    });

    it('should throw NotFoundException for invalid trackId', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.getByTrackId('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getStatus', () => {
    it('should return generation status', async () => {
      const trackId = 'test-track-id';
      mockRepository.findOne.mockResolvedValue({
        generationStatus: GenerationStatus.COMPLETED,
        retryCount: 0,
      });

      const result = await service.getStatus(trackId);

      expect(result.status).toBe(GenerationStatus.COMPLETED);
      expect(result.retryCount).toBe(0);
    });
  });

  describe('regenerate', () => {
    it('should reset retry count and regenerate', async () => {
      const trackId = 'test-track-id';
      const audioPath = '/path/to/audio.mp3';
      const existingWaveform = { trackId, retryCount: 2, dataPoints: 200 };

      mockRepository.findOne.mockResolvedValue(existingWaveform);
      mockRepository.save.mockResolvedValue({ ...existingWaveform, retryCount: 0 });
      mockGenerator.generateWaveform.mockResolvedValue({
        waveformData: Array(200).fill(0.5),
        peakAmplitude: 0.9,
      });

      await service.regenerate(trackId, audioPath);

      expect(mockRepository.save).toHaveBeenCalled();
      expect(mockGenerator.generateWaveform).toHaveBeenCalled();
    });
  });
});
