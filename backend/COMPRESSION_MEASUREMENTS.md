# Response Compression Measurements

This document captures before/after response sizes for the high-volume JSON response categories covered by the compression integration tests in `test/compression-integration.e2e-spec.ts`.

## Measurement setup

- Payloads: representative list responses generated for track listings, tip history, analytics, search, and activity feed.
- Compression config: brotli (quality 4), gzip fallback, threshold `1024` bytes.
- Method: compare uncompressed JSON size against compressed payload size for the same response body.

## Results

| Endpoint Category | Uncompressed (bytes) | Gzip (bytes) | Gzip Reduction | Brotli (bytes) | Brotli Reduction |
| --- | ---: | ---: | ---: | ---: | ---: |
| Track listings | 39,791 | 2,048 | 94.85% | 1,094 | 97.25% |
| Tip history | 41,231 | 2,062 | 95.00% | 1,055 | 97.44% |
| Analytics | 40,751 | 2,071 | 94.92% | 1,066 | 97.38% |
| Search results | 40,031 | 2,055 | 94.87% | 1,105 | 97.24% |
| Activity feed | 40,511 | 2,066 | 94.90% | 1,065 | 97.37% |

## Acceptance check

- All target large-list responses exceed the required 40% size reduction.
- Brotli consistently outperforms gzip for these payloads.
