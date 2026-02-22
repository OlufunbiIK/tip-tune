import { Injectable } from '@nestjs/common';

export enum Timeframe {
  ALL_TIME = 'all-time',
  MONTHLY = 'monthly',
  WEEKLY = 'weekly',
}

export interface RankingScore {
  score: number;
  rank: number;
  previousRank?: number;
  change?: number;
}

/**
 * Ranking service with decay algorithms for time-based leaderboards
 * Implements exponential decay to give more weight to recent activity
 */
@Injectable()
export class RankingService {
  /**
   * Calculate momentum score for trending tracks
   * Uses exponential decay: score = base * e^(-decay * age_in_days)
   */
  calculateMomentumScore(
    baseScore: number,
    ageInDays: number,
    decayRate: number = 0.1,
  ): number {
    if (ageInDays < 0) return baseScore;
    return baseScore * Math.exp(-decayRate * ageInDays);
  }

  /**
   * Calculate weighted score with time decay
   * Recent activity gets higher weight
   */
  calculateTimeDecayScore(
    baseScore: number,
    ageInHours: number,
    halfLifeHours: number = 168, // 1 week default
  ): number {
    if (ageInHours < 0) return baseScore;
    const decayFactor = Math.pow(0.5, ageInHours / halfLifeHours);
    return baseScore * decayFactor;
  }

  /**
   * Calculate growth rate score for fastest growing artists
   * Compares recent activity to historical baseline
   */
  calculateGrowthScore(
    recentValue: number,
    historicalValue: number,
    timeWindow: number = 7, // days
  ): number {
    if (historicalValue === 0) {
      return recentValue > 0 ? recentValue * 2 : 0;
    }
    const growthRate = (recentValue - historicalValue) / historicalValue;
    const normalizedGrowth = Math.max(0, growthRate * 100); // Convert to percentage
    return normalizedGrowth * (recentValue / timeWindow); // Weight by recent activity
  }

  /**
   * Calculate composite score for trending tracks
   * Combines plays, tips, and recency
   */
  calculateTrendingScore(
    plays: number,
    tips: number,
    tipAmount: number,
    ageInDays: number,
  ): number {
    const playScore = this.calculateMomentumScore(plays, ageInDays, 0.15);
    const tipScore = this.calculateMomentumScore(tips * 10, ageInDays, 0.12);
    const amountScore = this.calculateMomentumScore(tipAmount * 100, ageInDays, 0.1);
    
    return playScore + tipScore + amountScore;
  }

  /**
   * Rank items by score and calculate rank changes
   */
  rankItems<T extends { id: string; score: number }>(
    items: T[],
    previousRanks?: Map<string, number>,
  ): Array<T & RankingScore> {
    // Sort by score descending
    const sorted = [...items].sort((a, b) => b.score - a.score);

    return sorted.map((item, index) => {
      const rank = index + 1;
      const previousRank = previousRanks?.get(item.id);
      const change = previousRank ? previousRank - rank : 0;

      return {
        ...item,
        rank,
        previousRank,
        change,
      };
    });
  }

  /**
   * Get date range for timeframe
   */
  getDateRange(timeframe: Timeframe): { start: Date; end: Date } {
    const end = new Date();
    let start: Date;

    switch (timeframe) {
      case Timeframe.WEEKLY:
        start = new Date(end);
        start.setDate(start.getDate() - 7);
        break;
      case Timeframe.MONTHLY:
        start = new Date(end);
        start.setMonth(start.getMonth() - 1);
        break;
      case Timeframe.ALL_TIME:
      default:
        start = new Date(0); // Epoch start
        break;
    }

    return { start, end };
  }

  /**
   * Calculate age in days from a date
   */
  getAgeInDays(date: Date): number {
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Calculate age in hours from a date
   */
  getAgeInHours(date: Date): number {
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60));
  }
}
