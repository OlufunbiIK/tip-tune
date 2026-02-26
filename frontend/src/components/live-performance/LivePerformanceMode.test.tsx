import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import io from 'socket.io-client';
import LivePerformanceMode from './LivePerformanceMode';

const mockSocket = {
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
  disconnect: vi.fn(),
  connected: true,
};

vi.mock('socket.io-client', () => ({
  default: vi.fn(() => mockSocket),
}));

describe('LivePerformanceMode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('ingests websocket tip notifications and updates session stats', async () => {
    render(<LivePerformanceMode />);

    fireEvent.click(screen.getByRole('button', { name: /start session/i }));

    const tipHandlerCall = mockSocket.on.mock.calls.find((call) => call[0] === 'tip_notification');
    expect(tipHandlerCall).toBeDefined();

    await act(async () => {
      const callback = tipHandlerCall[1] as (payload: unknown) => void;
      callback({
        type: 'tip_received',
        data: {
          tipId: 'tip-100',
          amount: 30,
          asset: 'XLM',
          senderAddress: 'GABCD1234EFGH5678IJKL9012MNOP3456QRST7890',
          isAnonymous: false,
          createdAt: '2026-02-23T20:00:00.000Z',
        },
      });
    });

    await waitFor(() => {
      expect(screen.getByText('30.00 XLM')).toBeInTheDocument();
      expect(screen.getByText(/Big tip/i)).toBeInTheDocument();
      expect(screen.getByText(/Incoming tip/i)).toBeInTheDocument();
    });

    const persisted = JSON.parse(localStorage.getItem('tiptune.livePerformance.session.v1') || '{}');
    expect(persisted.sessionTotalXlm).toBe(30);
    expect(persisted.tipCount).toBe(1);
  });

  it('masks sensitive details in privacy mode and reset clears session stats', async () => {
    render(<LivePerformanceMode />);

    fireEvent.click(screen.getByRole('button', { name: /start session/i }));

    const tipHandlerCall = mockSocket.on.mock.calls.find((call) => call[0] === 'tip_notification');
    const callback = tipHandlerCall[1] as (payload: unknown) => void;

    await act(async () => {
      callback({
        type: 'tip_received',
        data: {
          tipId: 'tip-101',
          amount: 9,
          asset: 'XLM',
          senderAddress: 'GTESTING1234567890ABCDEF1234567890ABCDEF12',
          isAnonymous: false,
          createdAt: '2026-02-23T20:02:00.000Z',
        },
      });
    });

    fireEvent.click(screen.getByRole('button', { name: /enable privacy/i }));
    expect(screen.getByText('Hidden supporter')).toBeInTheDocument();
    expect(screen.getAllByText('••••').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: /reset stats/i }));

    await waitFor(() => {
      const persisted = JSON.parse(localStorage.getItem('tiptune.livePerformance.session.v1') || '{}');
      expect(persisted.sessionTotalXlm).toBe(0);
      expect(persisted.tipCount).toBe(0);
    });
  });

  it('connects socket to tips namespace', () => {
    render(<LivePerformanceMode />);
    expect(io).toHaveBeenCalledWith(
      expect.stringContaining('/tips'),
      expect.objectContaining({ transports: ['websocket'] }),
    );
  });
});
