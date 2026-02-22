# Track Detail Modal

A comprehensive modal component for displaying detailed track information with full player controls and interactive features.

## Features

- **Full-size Cover Art**: Displays high-quality track artwork with fallback placeholder
- **Track Information**: Shows title, artist, genre, duration, plays, and tips
- **Full Player Controls**: 
  - Play/Pause with loading states
  - Previous/Next track navigation
  - Progress bar with seeking
  - Volume control with mute toggle
- **Interactive Actions**:
  - Tip button with Stellar integration
  - Share track functionality
  - Add to playlist
  - Download (when allowed)
- **Comments Section**: Preview of track comments with engagement features
- **Keyboard Navigation**: ESC to close, Space for play/pause
- **Mobile Support**: Responsive design and touch-friendly controls
- **Accessibility**: Focus trap and proper ARIA labels

## Usage

```tsx
import { TrackDetailModal } from '@/components/track';

function TrackPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);

  const handleTrackClick = (track: Track) => {
    setSelectedTrack(track);
    setIsModalOpen(true);
  };

  return (
    <div>
      {/* Your track listing */}
      <button onClick={() => handleTrackClick(someTrack)}>
        View Track Details
      </button>
      
      <TrackDetailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        track={selectedTrack}
        onTrackChange={(trackId) => {
          // Handle track navigation
        }}
      />
    </div>
  );
}
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `isOpen` | `boolean` | Yes | Controls modal visibility |
| `onClose` | `() => void` | Yes | Function to close the modal |
| `track` | `Track \| null` | Yes | Track data to display |
| `onTrackChange` | `(trackId: string) => void` | No | Callback for track navigation |
| `tracks` | `Track[]` | No | Array of tracks for playlist navigation |

## Keyboard Shortcuts

- **ESC**: Close modal
- **Space**: Toggle play/pause
- **Arrow Left**: Previous track
- **Arrow Right**: Next track
- **Tab**: Navigate focus within modal

## Accessibility Features

- **Focus Trap**: Prevents focus from leaving the modal
- **ARIA Labels**: Proper labeling for screen readers
- **Keyboard Navigation**: Full keyboard operability
- **High Contrast**: Sufficient color contrast ratios
- **Reduced Motion**: Respects user's motion preference

## Styling

The component uses the project's Tailwind CSS configuration with:
- Dark theme (`bg-navy-900`, `text-white`)
- Gold accent colors (`accent-gold`)
- Responsive breakpoints for mobile and desktop
- Smooth transitions and animations

## Dependencies

- `react` (v18+)
- `lucide-react` (icons)
- `react-spring` (optional animations)
- `@/hooks/useAudio` (audio playback)
- `@/components/tip/TipButton` (tip functionality)
- `@/utils/time` (time formatting)

## API Integration

The component expects the following API endpoints:

```typescript
// Track data
GET /tracks/:id

// Comments
GET /comments/track/:trackId

// Tips (handled by TipButton component)
POST /tips
```

## Future Enhancements

- [ ] Swipe gestures for mobile navigation
- [ ] Advanced animations with react-spring
- [ ] Real-time comment updates via WebSocket
- [ ] Playlist integration
- [ ] Social sharing options
- [ ] Download functionality
- [ ] Waveform visualization
- [ ] Related tracks suggestions

## Testing

The component includes comprehensive tests covering:
- Rendering and DOM structure
- User interactions
- Keyboard navigation
- Edge cases (no track, closed modal)
- Accessibility features
- Error handling

Run tests with:
```bash
npm run test track/TrackDetailModal.test.tsx
```