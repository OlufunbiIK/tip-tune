
import { renderHook, act, waitFor } from '@testing-library/react';
import { useNotifications } from './useNotifications';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as io from 'socket.io-client';

// Mock socket.io-client
vi.mock('socket.io-client', () => {
  const socket = {
    on: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
    close: vi.fn(),
    connected: true,
  };
  return {
    default: vi.fn(() => socket),
  };
});

// Mock useWallet
vi.mock('./useWallet', () => ({
  useWallet: () => ({
    publicKey: 'test-public-key',
  }),
}));

// Mock API client
vi.mock('../utils/api', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: { data: [], count: 0 } }),
    patch: vi.fn().mockResolvedValue({}),
  },
}));

describe('useNotifications', () => {
  const mockSocket = io.default();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('authToken', 'test-token');
  });

  afterEach(() => {
    localStorage.removeItem('authToken');
  });

  it('should initialize socket connection with token', () => {
    localStorage.setItem('authToken', 'test-token');
    
    renderHook(() => useNotifications());

    expect(io.default).toHaveBeenCalledWith(
      expect.stringContaining('/notifications'),
      expect.objectContaining({
        auth: { token: 'test-token' },
      })
    );
  });

  it('should not connect if no token is present', () => {
    localStorage.removeItem('authToken');
    
    renderHook(() => useNotifications());

    // Should not have called io() again (it was called in global scope of mock, but we check if called inside hook)
    // Actually, since renderHook runs the effect, we check if it was called *with the args*
    // Resetting mock count before render
    (io.default as any).mockClear();
    
    renderHook(() => useNotifications());
    
    expect(io.default).not.toHaveBeenCalled();
  });

  it('should listen for tipReceived events', async () => {
    const { result } = renderHook(() => useNotifications());

    const onCall = (mockSocket.on as any).mock.calls.find((call: any[]) => call[0] === 'tipReceived');
    expect(onCall).toBeDefined();
    
    // Simulate receiving a tip
    const callback = onCall[1];
    const mockNotification = {
      id: '1',
      title: 'New Tip',
      message: 'You got money',
      isRead: false,
    };

    act(() => {
      callback(mockNotification);
    });

    await waitFor(() => {
        expect(result.current.notifications).toContainEqual(mockNotification);
        expect(result.current.unreadCount).toBe(1);
    });
  });
});
