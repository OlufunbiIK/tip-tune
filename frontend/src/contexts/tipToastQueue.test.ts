import { describe, it, expect, beforeEach } from 'vitest';
import {
  dismissTipToast,
  enqueueTipToast,
  getTipToastQueueSnapshot,
  resetTipToastQueueForTests,
} from './tipToastQueue';

describe('tipToastQueue', () => {
  beforeEach(() => {
    resetTipToastQueueForTests();
  });

  it('prioritizes large tips before normal tips', () => {
    enqueueTipToast({
      id: 'tip-low',
      tipId: 'tip-low',
      title: 'Small tip',
      message: '2 XLM',
      priority: 'normal',
    });

    enqueueTipToast({
      id: 'tip-high',
      tipId: 'tip-high',
      title: 'Large tip',
      message: '100 XLM',
      priority: 'high',
    });

    const first = getTipToastQueueSnapshot();
    expect(first.active?.id).toBe('tip-high');
    expect(first.queuedCount).toBe(1);

    dismissTipToast('tip-high');
    const second = getTipToastQueueSnapshot();
    expect(second.active?.id).toBe('tip-low');
  });

  it('suppresses duplicate tip IDs', () => {
    const first = enqueueTipToast({
      id: 'dup-1',
      tipId: 'tip-duplicate',
      title: 'Tip A',
      message: '10 XLM',
      priority: 'normal',
    });

    const second = enqueueTipToast({
      id: 'dup-2',
      tipId: 'tip-duplicate',
      title: 'Tip B',
      message: '50 XLM',
      priority: 'high',
    });

    expect(first).toBe(true);
    expect(second).toBe(false);

    const snapshot = getTipToastQueueSnapshot();
    expect(snapshot.active?.id).toBe('dup-1');
    expect(snapshot.queuedCount).toBe(0);
  });

  it('drains the queue gracefully in order', () => {
    enqueueTipToast({
      id: 'tip-1',
      tipId: 'tip-1',
      title: 'Tip 1',
      message: '1 XLM',
      priority: 'normal',
    });
    enqueueTipToast({
      id: 'tip-2',
      tipId: 'tip-2',
      title: 'Tip 2',
      message: '2 XLM',
      priority: 'normal',
    });
    enqueueTipToast({
      id: 'tip-3',
      tipId: 'tip-3',
      title: 'Tip 3',
      message: '3 XLM',
      priority: 'normal',
    });

    expect(getTipToastQueueSnapshot().active?.id).toBe('tip-1');

    dismissTipToast('tip-1');
    expect(getTipToastQueueSnapshot().active?.id).toBe('tip-2');

    dismissTipToast('tip-2');
    expect(getTipToastQueueSnapshot().active?.id).toBe('tip-3');

    dismissTipToast('tip-3');
    const finalState = getTipToastQueueSnapshot();
    expect(finalState.active).toBeNull();
    expect(finalState.queuedCount).toBe(0);
  });
});
