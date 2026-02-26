# Waveform Module

Generates and stores waveform visualization data for uploaded tracks.

## Features

- Automatic waveform generation on track upload
- Normalized amplitude data (0-1 range)
- Configurable data points (default: 200)
- Retry logic (up to 3 attempts)
- Background processing
- REST API endpoints

## Prerequisites

Install `audiowaveform` CLI tool:

```bash
# Ubuntu/Debian
sudo apt-get install audiowaveform

# macOS
brew install audiowaveform

# Or build from source: https://github.com/bbc/audiowaveform
```

## Installation

1. **Add module to app.module.ts:**

```typescript
import { WaveformModule } from './waveform/waveform.module';

@Module({
  imports: [
    // ... other imports
    WaveformModule,
  ],
})
export class AppModule {}
```

2. **Run migration:**

```bash
npm run migration:run
```

3. **Integrate with tracks service:**

In `tracks.service.ts`, inject and call waveform generation:

```typescript
import { WaveformService } from '../waveform/waveform.service';

@Injectable()
export class TracksService {
  constructor(
    private waveformService: WaveformService,
  ) {}

  async createTrack(createTrackDto: CreateTrackDto, audioFile: Express.Multer.File) {
    // Save track to database
    const track = await this.tracksRepository.save(newTrack);
    
    // Trigger waveform generation (async, non-blocking)
    this.waveformService.generateForTrack(track.id, audioFile.path)
      .catch(err => console.error('Waveform generation failed:', err));
    
    return track;
  }
}
```

4. **Include waveform in track GET response:**

```typescript
async findOne(id: string) {
  const track = await this.tracksRepository.findOne({ where: { id } });
  
  try {
    const waveform = await this.waveformService.getByTrackId(id);
    return { ...track, waveform };
  } catch {
    return { ...track, waveform: null };
  }
}
```

## API Endpoints

### Get Waveform
```http
GET /api/waveform/:trackId
```

Response:
```json
{
  "id": "uuid",
  "trackId": "uuid",
  "waveformData": [0.1, 0.5, 0.8, ...],
  "dataPoints": 200,
  "peakAmplitude": 0.95,
  "generationStatus": "completed",
  "processingDurationMs": 1234,
  "createdAt": "2026-02-25T06:53:01.584Z",
  "updatedAt": "2026-02-25T06:53:01.584Z"
}
```

### Get Generation Status
```http
GET /api/waveform/:trackId/status
```

Response:
```json
{
  "status": "completed",
  "retryCount": 0
}
```

### Regenerate Waveform
```http
POST /api/waveform/:trackId/regenerate
```

## Database Schema

```sql
CREATE TABLE track_waveforms (
  id UUID PRIMARY KEY,
  trackId UUID UNIQUE REFERENCES tracks(id) ON DELETE CASCADE,
  waveformData JSONB NOT NULL,
  dataPoints INT DEFAULT 200,
  peakAmplitude DECIMAL(10,6) NOT NULL,
  generationStatus ENUM('pending', 'processing', 'completed', 'failed'),
  processingDurationMs INT,
  retryCount INT DEFAULT 0,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);
```

## Testing

```bash
npm run test -- waveform.service.spec.ts
```

## Frontend Integration

```typescript
// Fetch waveform with track
const response = await fetch(`/api/tracks/${trackId}`);
const data = await response.json();
const { waveform, ...track } = data;

// Render waveform
if (waveform?.waveformData) {
  renderWaveform(waveform.waveformData);
}
```

## Configuration

Adjust data points in service call:

```typescript
await this.waveformService.generateForTrack(trackId, audioPath, 400); // 400 points
```

## Troubleshooting

**audiowaveform not found:**
- Ensure `audiowaveform` is installed and in PATH
- Test: `audiowaveform --version`

**Generation fails:**
- Check audio file format (supports MP3, WAV, FLAC, OGG)
- Verify file permissions
- Check logs for detailed error messages

**Slow generation:**
- Reduce data points (e.g., 100 instead of 200)
- Process in background queue (Bull/BullMQ recommended for production)
