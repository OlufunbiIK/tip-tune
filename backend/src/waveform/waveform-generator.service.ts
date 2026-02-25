import { Injectable, Logger } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

const execAsync = promisify(exec);

@Injectable()
export class WaveformGeneratorService {
  private readonly logger = new Logger(WaveformGeneratorService.name);

  async generateWaveform(audioFilePath: string, dataPoints: number = 200): Promise<{ waveformData: number[]; peakAmplitude: number }> {
    const tempJsonPath = path.join('/tmp', `waveform-${Date.now()}.json`);

    try {
      // Generate waveform using audiowaveform CLI
      await execAsync(
        `audiowaveform -i "${audioFilePath}" -o "${tempJsonPath}" --pixels-per-second 20 --bits 8`
      );

      const jsonData = await fs.readFile(tempJsonPath, 'utf-8');
      const waveformJson = JSON.parse(jsonData);
      
      // Extract amplitude data
      const rawData = waveformJson.data || [];
      const peakAmplitude = Math.max(...rawData);
      
      // Normalize and resample to desired data points
      const normalized = this.normalizeAndResample(rawData, dataPoints, peakAmplitude);

      await fs.unlink(tempJsonPath).catch(() => {});

      return {
        waveformData: normalized,
        peakAmplitude: peakAmplitude || 1,
      };
    } catch (error) {
      await fs.unlink(tempJsonPath).catch(() => {});
      this.logger.error(`Waveform generation failed: ${error.message}`);
      throw error;
    }
  }

  private normalizeAndResample(data: number[], targetPoints: number, peak: number): number[] {
    if (data.length === 0) return Array(targetPoints).fill(0);
    if (peak === 0) return Array(targetPoints).fill(0);

    const step = data.length / targetPoints;
    const result: number[] = [];

    for (let i = 0; i < targetPoints; i++) {
      const start = Math.floor(i * step);
      const end = Math.floor((i + 1) * step);
      const slice = data.slice(start, end);
      const avg = slice.reduce((sum, val) => sum + val, 0) / slice.length;
      result.push(Math.min(1, avg / peak));
    }

    return result;
  }
}
