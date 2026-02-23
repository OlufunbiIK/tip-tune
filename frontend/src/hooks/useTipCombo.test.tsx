import { act, renderHook } from '@testing-library/react';
import { useTipCombo } from './useTipCombo';

const playComboSoundMock = vi.fn();

vi.mock('../utils/combo', () => ({
  playComboSound: (...args: unknown[]) => playComboSoundMock(...args),
}));

describe('useTipCombo', () => {
  beforeEach(() => {
    localStorage.clear();
    playComboSoundMock.mockReset();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-23T10:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('activates combo after two tips within 30 seconds', () => {
    const { result } = renderHook(() => useTipCombo({ windowMs: 30_000 }));

    act(() => {
      result.current.registerTip(5);
    });
    expect(result.current.comboActive).toBe(false);

    act(() => {
      vi.advanceTimersByTime(1000);
      result.current.registerTip(4);
    });

    expect(result.current.comboActive).toBe(true);
    expect(result.current.multiplier).toBe(2);
    expect(playComboSoundMock).toHaveBeenCalledWith(2);
  });

  it('records combo history when combo is finalized', () => {
    const { result } = renderHook(() => useTipCombo({ windowMs: 30_000 }));

    act(() => {
      result.current.registerTip(3);
      vi.advanceTimersByTime(1000);
      result.current.registerTip(2);
    });

    act(() => {
      result.current.resetCombo();
    });

    expect(result.current.history).toHaveLength(1);
    expect(result.current.history[0].multiplier).toBe(2);
  });

  it('increments streak on consecutive days', () => {
    const { result } = renderHook(() => useTipCombo({ windowMs: 30_000 }));

    act(() => {
      result.current.registerTip(1);
    });
    expect(result.current.streak.currentDays).toBe(1);

    act(() => {
      vi.setSystemTime(new Date('2026-02-24T11:00:00Z'));
      result.current.registerTip(1);
    });

    expect(result.current.streak.currentDays).toBe(2);
    expect(result.current.streak.longestDays).toBe(2);
  });
});
