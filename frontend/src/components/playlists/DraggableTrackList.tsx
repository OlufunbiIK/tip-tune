import { useMemo } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Track } from '../../types';

type DraggableTrackListProps = {
  tracks: Track[];
  onReorder: (nextTracks: Track[]) => void;
  onRemove: (track: Track) => void;
};

type DragItem = {
  index: number;
};

const itemType = 'playlist-track';

function TrackRow({
  track,
  index,
  onMove,
  onRemove,
}: {
  track: Track;
  index: number;
  onMove: (from: number, to: number) => void;
  onRemove: (track: Track) => void;
}) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: itemType,
    item: { index } as DragItem,
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  }));

  const [, drop] = useDrop(() => ({
    accept: itemType,
    hover: (item: DragItem) => {
      if (item.index !== index) {
        onMove(item.index, index);
        item.index = index;
      }
    },
  }));

  return (
    <div
      ref={(node) => drag(drop(node))}
      className={`flex items-center justify-between rounded-md border border-white/10 bg-white/5 p-3 ${
        isDragging ? 'opacity-60' : 'opacity-100'
      }`}
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-white">{track.title}</p>
        <p className="truncate text-xs text-white/60">
          {track.artist?.artistName || 'Unknown artist'}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <details className="relative">
          <summary className="cursor-pointer list-none rounded border border-white/20 px-2 py-1 text-xs text-white/80">
            Actions
          </summary>
          <div className="absolute right-0 z-10 mt-1 w-36 rounded border border-white/10 bg-navy-light p-1 shadow-lg">
            <button
              type="button"
              onClick={() => onRemove(track)}
              className="block w-full rounded px-2 py-1 text-left text-xs text-red-300 hover:bg-red-500/10"
            >
              Remove
            </button>
          </div>
        </details>
      </div>
    </div>
  );
}

export default function DraggableTrackList({
  tracks,
  onReorder,
  onRemove,
}: DraggableTrackListProps) {
  const safeTracks = useMemo(() => tracks || [], [tracks]);

  const handleMove = (from: number, to: number) => {
    if (from === to) {
      return;
    }
    const next = [...safeTracks];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onReorder(next);
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="space-y-2">
        {safeTracks.map((track, index) => (
          <TrackRow
            key={track.id}
            track={track}
            index={index}
            onMove={handleMove}
            onRemove={onRemove}
          />
        ))}
        {safeTracks.length === 0 && (
          <p className="text-sm text-white/60">No tracks in this playlist.</p>
        )}
      </div>
    </DndProvider>
  );
}
