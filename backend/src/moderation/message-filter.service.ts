import { Injectable } from '@nestjs/common';
import { BlockedKeyword, KeywordSeverity } from './entities/blocked-keyword.entity';

export type MessageFilterLayerResult = {
  matched: boolean;
  severity: KeywordSeverity | null;
  reason: string | null;
  confidence: number;
};

export type MessageFilterResult = {
  result: 'approved' | 'filtered' | 'flagged' | 'blocked';
  reason: string | null;
  confidence: number;
  sanitizedMessage: string;
};

@Injectable()
export class MessageFilterService {
  checkBlockedKeywords(
    message: string,
    keywords: BlockedKeyword[],
  ): MessageFilterLayerResult {
    const normalized = message.toLowerCase();
    let best: MessageFilterLayerResult = {
      matched: false,
      severity: null,
      reason: null,
      confidence: 0,
    };

    for (const k of keywords) {
      const value = k.keyword.toLowerCase();
      if (!value) {
        continue;
      }
      if (normalized.includes(value)) {
        let confidence = 0.7;
        if (k.severity === KeywordSeverity.HIGH) {
          confidence = 0.95;
        } else if (k.severity === KeywordSeverity.MEDIUM) {
          confidence = 0.85;
        }

        if (confidence > best.confidence) {
          best = {
            matched: true,
            severity: k.severity,
            reason: `keyword:${k.keyword}`,
            confidence,
          };
        }
      }
    }

    return best;
  }

  checkRegexPatterns(message: string): MessageFilterLayerResult {
    const patterns: { regex: RegExp; label: string; confidence: number }[] = [
      { regex: /(https?:\/\/|www\.)\S+/i, label: 'link', confidence: 0.6 },
      { regex: /(free\s+money|giveaway|winner)/i, label: 'spam_phrase', confidence: 0.7 },
      { regex: /(.)\1{5,}/i, label: 'repetition', confidence: 0.5 },
    ];

    let best: MessageFilterLayerResult = {
      matched: false,
      severity: null,
      reason: null,
      confidence: 0,
    };

    for (const p of patterns) {
      if (p.regex.test(message)) {
        if (p.confidence > best.confidence) {
          best = {
            matched: true,
            severity: KeywordSeverity.LOW,
            reason: `regex:${p.label}`,
            confidence: p.confidence,
          };
        }
      }
    }

    return best;
  }

  applyFilters(
    message: string,
    keywords: BlockedKeyword[],
  ): MessageFilterResult {
    const trimmed = message.trim();

    if (!trimmed) {
      return {
        result: 'approved',
        reason: null,
        confidence: 0,
        sanitizedMessage: trimmed,
      };
    }

    const keywordResult = this.checkBlockedKeywords(trimmed, keywords);
    const regexResult = this.checkRegexPatterns(trimmed);

    let finalReason: string | null = null;
    let finalConfidence = 0;
    let finalSeverity: KeywordSeverity | null = null;

    if (keywordResult.matched && keywordResult.confidence >= regexResult.confidence) {
      finalReason = keywordResult.reason;
      finalConfidence = keywordResult.confidence;
      finalSeverity = keywordResult.severity;
    } else if (regexResult.matched) {
      finalReason = regexResult.reason;
      finalConfidence = regexResult.confidence;
      finalSeverity = regexResult.severity;
    }

    if (!finalReason) {
      return {
        result: 'approved',
        reason: null,
        confidence: 0,
        sanitizedMessage: trimmed,
      };
    }

    if (finalSeverity === KeywordSeverity.HIGH) {
      return {
        result: 'blocked',
        reason: finalReason,
        confidence: finalConfidence,
        sanitizedMessage: '',
      };
    }

    if (finalSeverity === KeywordSeverity.MEDIUM) {
      return {
        result: 'flagged',
        reason: finalReason,
        confidence: finalConfidence,
        sanitizedMessage: '',
      };
    }

    const sanitized = trimmed.replace(/\S/g, '*');

    return {
      result: 'filtered',
      reason: finalReason,
      confidence: finalConfidence,
      sanitizedMessage: sanitized,
    };
  }
}

