# Compression Measurement Script

## Overview

The `measure-compression.js` script measures the effectiveness of HTTP response compression on key API endpoints. It compares response sizes with different compression algorithms (brotli, gzip, none) and calculates compression ratios and transfer time savings.

## Prerequisites

- Node.js installed
- Backend server running on the configured port (default: 3001)
- API endpoints accessible

## Usage

### Basic Usage

```bash
# Start the backend server first
npm run start:dev

# In another terminal, run the measurement script
node scripts/measure-compression.js
```

### With Custom Configuration

```bash
# Use environment variables to configure the script
API_HOST=localhost API_PORT=3001 API_PROTOCOL=http node scripts/measure-compression.js
```

## Configuration

The script can be configured using environment variables:

- `API_HOST`: Server hostname (default: `localhost`)
- `API_PORT`: Server port (default: `3001`)
- `API_PROTOCOL`: Protocol to use (default: `http`)

## Measured Endpoints

The script measures compression effectiveness on the following endpoints:

1. **Track Listings** - `GET /api/tracks?limit=50`
2. **Tip History** - `GET /api/tips/user/test-user-id/history?limit=50`
3. **Search Results** - `GET /api/search?q=music&limit=30`
4. **Activity Feed** - `GET /api/activities?limit=30`

## Output

The script provides:

1. **Console Output**: Detailed measurements for each endpoint and compression algorithm
2. **JSON Export**: Results exported to `compression-measurements.json`

### Console Output Example

```
================================================================================
Measuring: Track Listings
Endpoint: GET /api/tracks?limit=50
Description: List of tracks with metadata
================================================================================

None:
  Content-Encoding: none
  Compressed Size: 125.43 KB
  Decompressed Size: 125.43 KB
  Compression Ratio: 0%
  Response Time: 45.23ms
  Vary Header: none

Gzip:
  Content-Encoding: gzip
  Compressed Size: 24.68 KB
  Decompressed Size: 125.43 KB
  Compression Ratio: 80.33%
  Response Time: 48.15ms
  Decompress Time: 2.34ms
  Vary Header: Accept-Encoding

Brotli:
  Content-Encoding: br
  Compressed Size: 18.25 KB
  Decompressed Size: 125.43 KB
  Compression Ratio: 85.45%
  Response Time: 52.67ms
  Decompress Time: 3.12ms
  Vary Header: Accept-Encoding
```

### Summary Report

The script generates a summary showing:

- Compression ratios for each endpoint
- Bytes saved by compression
- Transfer time savings on 3G and 4G connections
- Whether the 40% compression target is met

### JSON Export

Results are exported to `compression-measurements.json` with the following structure:

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "configuration": {
    "host": "localhost",
    "port": 3001,
    "protocol": "http",
    "baseUrl": "http://localhost:3001"
  },
  "measurements": [
    {
      "endpoint": "Track Listings",
      "path": "/api/tracks?limit=50",
      "results": [
        {
          "algorithm": "None",
          "encoding": "none",
          "compressedSize": 128440,
          "decompressedSize": 128440,
          "compressionRatio": 0,
          "responseTime": "45.23",
          "decompressTime": "0.00",
          "varyHeader": "none"
        },
        {
          "algorithm": "Gzip",
          "encoding": "gzip",
          "compressedSize": 25272,
          "decompressedSize": 128440,
          "compressionRatio": 80.33,
          "responseTime": "48.15",
          "decompressTime": "2.34",
          "varyHeader": "Accept-Encoding"
        }
      ]
    }
  ]
}
```

## Metrics Collected

For each endpoint and compression algorithm, the script measures:

- **Compressed Size**: Size of the response as received
- **Decompressed Size**: Original size of the response data
- **Compression Ratio**: Percentage reduction in size
- **Response Time**: Time to receive the complete response
- **Decompress Time**: Time to decompress the response (if compressed)
- **Vary Header**: Value of the Vary response header
- **Content-Encoding**: Compression algorithm used by the server

## Transfer Time Savings

The script calculates transfer time savings on different connection speeds:

- **3G Connection**: 384 Kbps
- **4G Connection**: 10 Mbps

This helps quantify the real-world impact of compression on user experience.

## Troubleshooting

### Server Not Running

```
❌ Server is not running or not accessible
   Please start the server at http://localhost:3001
```

**Solution**: Start the backend server before running the script:

```bash
npm run start:dev
```

### Endpoint Returns Non-200 Status

```
⚠️  Gzip: Status 404 - Skipping
```

**Solution**: Ensure the endpoint exists and is accessible. Some endpoints may require authentication or specific data to be present.

### Decompression Failed

```
⚠️  Brotli: Decompression failed - incorrect header check
```

**Solution**: This may indicate the server is not properly compressing responses. Check the compression middleware configuration in `src/main.ts`.

## Requirements Validated

This script validates the following requirements:

- **6.2**: Measure compression ratios for track list endpoints
- **6.3**: Measure compression ratios for tip history endpoints
- **6.4**: Measure compression ratios for search result endpoints
- **6.5**: Measure compression ratios for activity feed endpoints
- **6.6**: Verify at least 40% size reduction on list endpoints with 10+ items
