import React, { useMemo } from 'react';
import RequestCard from './RequestCard';
import type { SongRequest } from './types';

export interface RequestQueueProps {
  requests: SongRequest[];
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
  onPlay: (id: string) => void;
}

const RequestQueue: React.FC<RequestQueueProps> = ({
  requests,
  onAccept,
  onDecline,
  onPlay,
}) => {
  const sorted = useMemo(
    () =>
      [...requests].sort((a, b) => b.tipAmount - a.tipAmount),
    [requests]
  );

  if (!sorted.length) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-center text-sm text-slate-400">
        No song requests yet. Tips with a request will appear here.
      </div>
    );
  }

  return (
    <div className="space-y-2" data-testid="request-queue">
      {sorted.map((req) => (
        <RequestCard
          key={req.id}
          request={req}
          onAccept={() => onAccept(req.id)}
          onDecline={() => onDecline(req.id)}
          onPlay={() => onPlay(req.id)}
        />
      ))}
    </div>
  );
};

export default RequestQueue;

