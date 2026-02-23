import { useCallback, useEffect, useMemo, useState } from 'react';
import { playComboSound } from '../utils/combo';

const DEFAULT_WINDOW_MS = 30_000;
const STREAK_STORAGE_KEY = 'tiptune.streak.state.v1';
const COMBO_HISTORY_STORAGE_KEY = 'tiptune.combo.history.v1';
const HISTORY_LIMIT = 10;

type ComboRuntimeState = {
  comboCount: number;
  lastTipAt: number | null;
  comboStartedAt: number | null;
  comboAmount: number;
  timeRemainingMs: number;
};

export type StreakState = {
  currentDays: number;
  longestDays: number;
  lastTipDate: string | null;
};

export type ComboHistoryEntry = {
  id: string;
  multiplier: number;
  tipCount: number;
  totalAmount: number;
  startedAt: string;
  endedAt: string;
  durationMs: number;
};

const defaultRuntimeState: ComboRuntimeState = {
  comboCount: 0,
  lastTipAt: null,
  comboStartedAt: null,
  comboAmount: 0,
  timeRemainingMs: 0,
};

const defaultStreakState: StreakState = {
  currentDays: 0,
  longestDays: 0,
  lastTipDate: null,
};

const toLocalDateKey = (value: Date): string => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseStored = <T,>(
  key: string,
  fallback: T,
  guard: (value: unknown) => value is T,
): T => {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as unknown;
    return guard(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
};

const isStreakState = (value: unknown): value is StreakState =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as StreakState).currentDays === 'number' &&
  typeof (value as StreakState).longestDays === 'number' &&
  ((value as StreakState).lastTipDate === null ||
    typeof (value as StreakState).lastTipDate === 'string');

const isComboHistory = (value: unknown): value is ComboHistoryEntry[] =>
  Array.isArray(value);

const persist = (key: string, value: unknown): void => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify(value));
};

const buildHistoryEntry = (state: ComboRuntimeState): ComboHistoryEntry | null => {
  if (
    state.comboCount < 2 ||
    state.comboStartedAt == null ||
    state.lastTipAt == null
  ) {
    return null;
  }

  return {
    id: `combo-${state.comboStartedAt}-${state.comboCount}`,
    multiplier: state.comboCount,
    tipCount: state.comboCount,
    totalAmount: state.comboAmount,
    startedAt: new Date(state.comboStartedAt).toISOString(),
    endedAt: new Date(state.lastTipAt).toISOString(),
    durationMs: state.lastTipAt - state.comboStartedAt,
  };
};

const updateStreak = (previous: StreakState, now: Date): StreakState => {
  const today = toLocalDateKey(now);
  const yesterdayDate = new Date(now);
  yesterdayDate.setDate(now.getDate() - 1);
  const yesterday = toLocalDateKey(yesterdayDate);

  if (previous.lastTipDate === today) return previous;

  const nextCurrent = previous.lastTipDate === yesterday ? previous.currentDays + 1 : 1;
  return {
    currentDays: nextCurrent,
    longestDays: Math.max(previous.longestDays, nextCurrent),
    lastTipDate: today,
  };
};

type UseTipComboOptions = {
  windowMs?: number;
};

export const useTipCombo = ({ windowMs = DEFAULT_WINDOW_MS }: UseTipComboOptions = {}) => {
  const [runtime, setRuntime] = useState<ComboRuntimeState>(defaultRuntimeState);
  const [streak, setStreak] = useState<StreakState>(() =>
    parseStored(STREAK_STORAGE_KEY, defaultStreakState, isStreakState),
  );
  const [history, setHistory] = useState<ComboHistoryEntry[]>(() =>
    parseStored(COMBO_HISTORY_STORAGE_KEY, [], isComboHistory),
  );

  useEffect(() => {
    persist(STREAK_STORAGE_KEY, streak);
  }, [streak]);

  useEffect(() => {
    persist(COMBO_HISTORY_STORAGE_KEY, history);
  }, [history]);

  const finalizeCombo = useCallback((state: ComboRuntimeState) => {
    const entry = buildHistoryEntry(state);
    if (!entry) return;

    setHistory((prev) => [entry, ...prev].slice(0, HISTORY_LIMIT));
  }, []);

  const resetCombo = useCallback(() => {
    setRuntime((previous) => {
      finalizeCombo(previous);
      return defaultRuntimeState;
    });
  }, [finalizeCombo]);

  const registerTip = useCallback(
    (amount = 0) => {
      const now = Date.now();
      setRuntime((previous) => {
        const withinWindow =
          previous.lastTipAt != null && now - previous.lastTipAt <= windowMs;

        if (!withinWindow) {
          finalizeCombo(previous);
        }

        const nextState: ComboRuntimeState = withinWindow
          ? {
              comboCount: previous.comboCount + 1,
              comboStartedAt:
                previous.comboStartedAt ?? previous.lastTipAt ?? now,
              comboAmount: previous.comboAmount + amount,
              lastTipAt: now,
              timeRemainingMs: windowMs,
            }
          : {
              comboCount: 1,
              comboStartedAt: now,
              comboAmount: amount,
              lastTipAt: now,
              timeRemainingMs: windowMs,
            };

        if (nextState.comboCount >= 2) {
          playComboSound(nextState.comboCount);
        }

        return nextState;
      });
      setStreak((prev) => updateStreak(prev, new Date(now)));
    },
    [finalizeCombo, windowMs],
  );

  useEffect(() => {
    if (runtime.lastTipAt == null || runtime.comboCount <= 0) return;

    const timer = window.setInterval(() => {
      setRuntime((previous) => {
        if (previous.lastTipAt == null || previous.comboCount <= 0) {
          return previous;
        }

        const remaining = Math.max(
          0,
          windowMs - (Date.now() - previous.lastTipAt),
        );
        if (remaining <= 0) {
          finalizeCombo(previous);
          return defaultRuntimeState;
        }

        return previous.timeRemainingMs === remaining
          ? previous
          : { ...previous, timeRemainingMs: remaining };
      });
    }, 100);

    return () => window.clearInterval(timer);
  }, [finalizeCombo, runtime.comboCount, runtime.lastTipAt, windowMs]);

  const comboActive = runtime.comboCount >= 2 && runtime.timeRemainingMs > 0;
  const multiplier = comboActive ? runtime.comboCount : 1;
  const progress = runtime.timeRemainingMs > 0 ? runtime.timeRemainingMs / windowMs : 0;

  return useMemo(
    () => ({
      comboCount: runtime.comboCount,
      comboActive,
      multiplier,
      progress,
      timeRemainingMs: runtime.timeRemainingMs,
      isOnFire: comboActive && runtime.comboCount >= 5,
      streak,
      history,
      registerTip,
      resetCombo,
    }),
    [comboActive, history, multiplier, progress, registerTip, resetCombo, runtime, streak],
  );
};

export default useTipCombo;
