import { useSyncExternalStore } from 'react';

export type ToastPriority = 'high' | 'normal';

export interface TipToastQueueItem {
  id: string;
  tipId: string;
  title: string;
  message: string;
  priority: ToastPriority;
  createdAt: string;
  duration?: number;
}

interface TipToastQueueState {
  active: TipToastQueueItem | null;
  queuedCount: number;
}

interface EnqueueTipToastInput {
  id: string;
  tipId: string;
  title: string;
  message: string;
  priority: ToastPriority;
  createdAt?: string;
  duration?: number;
}

interface StoredQueueItem extends TipToastQueueItem {
  sequence: number;
}

const MAX_SEEN_IDS = 500;

class TipToastQueueStore {
  private queue: StoredQueueItem[] = [];
  private active: StoredQueueItem | null = null;
  private seenTipIds: string[] = [];
  private seenTipIdSet = new Set<string>();
  private sequence = 0;
  private listeners = new Set<() => void>();

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): TipToastQueueState => ({
    active: this.active,
    queuedCount: this.queue.length,
  });

  enqueue = (input: EnqueueTipToastInput): boolean => {
    if (!input.tipId || this.seenTipIdSet.has(input.tipId)) {
      return false;
    }

    this.trackSeenTipId(input.tipId);

    const nextItem: StoredQueueItem = {
      ...input,
      createdAt: input.createdAt || new Date().toISOString(),
      sequence: this.sequence++,
    };

    if (this.active && nextItem.priority === 'high' && this.active.priority !== 'high') {
      this.insertByPriority(this.active);
      this.active = nextItem;
      this.emit();
      return true;
    }

    this.insertByPriority(nextItem);
    this.promoteNext();
    this.emit();
    return true;
  };

  dismiss = (id: string): void => {
    if (this.active?.id === id) {
      this.active = null;
      this.promoteNext();
      this.emit();
      return;
    }

    const initialLength = this.queue.length;
    this.queue = this.queue.filter((item) => item.id !== id);
    if (this.queue.length !== initialLength) {
      this.emit();
    }
  };

  reset = (): void => {
    this.queue = [];
    this.active = null;
    this.seenTipIds = [];
    this.seenTipIdSet.clear();
    this.sequence = 0;
    this.emit();
  };

  private emit(): void {
    this.listeners.forEach((listener) => listener());
  }

  private promoteNext(): void {
    if (this.active || this.queue.length === 0) {
      return;
    }

    const [next, ...rest] = this.queue;
    this.active = next;
    this.queue = rest;
  }

  private insertByPriority(item: StoredQueueItem): void {
    this.queue.push(item);
    this.queue.sort((left, right) => {
      if (left.priority !== right.priority) {
        return left.priority === 'high' ? -1 : 1;
      }
      return left.sequence - right.sequence;
    });
  }

  private trackSeenTipId(tipId: string): void {
    this.seenTipIds.push(tipId);
    this.seenTipIdSet.add(tipId);

    if (this.seenTipIds.length <= MAX_SEEN_IDS) {
      return;
    }

    const evicted = this.seenTipIds.shift();
    if (evicted) {
      this.seenTipIdSet.delete(evicted);
    }
  }
}

const tipToastQueueStore = new TipToastQueueStore();

export const enqueueTipToast = (input: EnqueueTipToastInput): boolean => tipToastQueueStore.enqueue(input);

export const dismissTipToast = (id: string): void => {
  tipToastQueueStore.dismiss(id);
};

export const useTipToastQueue = (): TipToastQueueState =>
  useSyncExternalStore(tipToastQueueStore.subscribe, tipToastQueueStore.getSnapshot);

export const getTipToastQueueSnapshot = (): TipToastQueueState => tipToastQueueStore.getSnapshot();

export const resetTipToastQueueForTests = (): void => {
  tipToastQueueStore.reset();
};
