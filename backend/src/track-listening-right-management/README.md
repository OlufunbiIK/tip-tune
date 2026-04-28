# Track Licensing Module

Manages per-track license definitions and the full lifecycle of license requests between listeners/creators and artists.

---

## Concepts

| Term | Description |
|---|---|
| `TrackLicense` | The license policy attached to a track (one per track). Defines what third parties may do with the audio. |
| `LicenseRequest` | A request submitted by any authenticated user asking to use a track under specific terms. |
| `LicensingLifecycle` | The state machine that governs every `LicenseRequest`. |

---

## Track License Defaults

When a track is uploaded and no license is explicitly set, `assignDefaultLicense` is called automatically. The defaults are:

| Field | Default value |
|---|---|
| `licenseType` | `all_rights_reserved` |
| `allowRemix` | `false` |
| `allowCommercialUse` | `false` |
| `allowDownload` | `false` |
| `requireAttribution` | `true` |
| `licenseUrl` | `null` |
| `customTerms` | `null` |

`assignDefaultLicense` is idempotent — if a license already exists for the track it returns the existing record unchanged.

### License Types

| Value | Meaning |
|---|---|
| `all_rights_reserved` | No use permitted without explicit approval |
| `creative_commons` | CC terms apply; check `licenseUrl` for the specific variant |
| `commercial` | Commercial use permitted under the stated terms |
| `sync` | Synchronisation rights (video/film) available |

---

## Request Lifecycle — State Machine

```
                    ┌─────────────────────────────────────────┐
                    │                                         │
          POST /request                                       │
               │                                             │
               ▼                                             │
           PENDING ──── artist responds ──► APPROVED (terminal)
               │                      └──► REJECTED (terminal)
               │
               ├── requester withdraws ──► WITHDRAWN (terminal)
               │
               └── expiresAt passes ──► EXPIRED
                                            │
                                            └── requester reopens ──► REOPENED
                                                                          │
                                                    artist responds ──► APPROVED (terminal)
                                                                    └──► REJECTED (terminal)
                                                    requester withdraws ──► WITHDRAWN (terminal)
```

### State Transition Rules (enforced by service)

| From state | Allowed transitions | Who can trigger |
|---|---|---|
| `PENDING` | → `APPROVED`, `REJECTED` | Artist (owns the track) |
| `PENDING` | → `WITHDRAWN` | Requester (owns the request) |
| `PENDING` | → `EXPIRED` | System scheduler (`expireStalePendingRequests`) |
| `REOPENED` | → `APPROVED`, `REJECTED` | Artist |
| `REOPENED` | → `WITHDRAWN` | Requester |
| `EXPIRED` | → `REOPENED` | Requester |
| `APPROVED` | — | Terminal — no further transitions |
| `REJECTED` | — | Terminal — no further transitions |
| `WITHDRAWN` | — | Terminal — no further transitions |

Attempting an invalid transition returns `400 Bad Request` with a message describing the current state.

---

## API Reference

All endpoints require a valid JWT (`access_token` cookie or `Authorization: Bearer`).

### Track License

#### `POST /api/licenses/track/:trackId`

Create or update the license for a track. Only the artist who owns the track may call this.

**Path param:** `trackId` — UUID of the track.

**Request body** (`CreateTrackLicenseDto` — all fields optional):

```json
{
  "licenseType": "creative_commons",
  "allowRemix": true,
  "allowCommercialUse": false,
  "allowDownload": true,
  "requireAttribution": true,
  "licenseUrl": "https://creativecommons.org/licenses/by/4.0/",
  "customTerms": "Must credit artist in video description."
}
```

**Response `200`** — the saved `TrackLicense` object.

**Errors:**

| Status | Cause |
|---|---|
| `403` | Authenticated user is not the artist who owns `trackId` |
| `404` | `trackId` does not exist |

---

#### `GET /api/licenses/track/:trackId`

Retrieve the license for a track. Public — no ownership check.

**Response `200`:**

```json
{
  "id": "uuid",
  "trackId": "uuid",
  "licenseType": "all_rights_reserved",
  "allowRemix": false,
  "allowCommercialUse": false,
  "allowDownload": false,
  "requireAttribution": true,
  "licenseUrl": null,
  "customTerms": null,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

**Errors:**

| Status | Cause |
|---|---|
| `404` | No license record exists for `trackId` (track was never licensed) |

---

### License Requests

#### `POST /api/licenses/request`

Submit a license request for a track. Any authenticated user may request; the artist is notified asynchronously.

**Request body** (`CreateLicenseRequestDto`):

```json
{
  "trackId": "uuid",
  "intendedUse": "Background music for a YouTube documentary"
}
```

Both fields are required. `intendedUse` is free text — it is shown to the artist verbatim.

**Response `201`** — the created `LicenseRequest`:

```json
{
  "id": "uuid",
  "trackId": "uuid",
  "requesterId": "uuid",
  "intendedUse": "Background music for a YouTube documentary",
  "status": "pending",
  "responseMessage": null,
  "respondedAt": null,
  "expiresAt": null,
  "withdrawnAt": null,
  "reopenedAt": null,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

**Errors:**

| Status | Cause |
|---|---|
| `400` | A `PENDING` request from this requester for this track already exists |
| `404` | `trackId` does not exist |

---

#### `GET /api/licenses/requests/artist`

List all license requests for the authenticated artist's tracks, ordered by `createdAt DESC`.

The artist's owned track IDs are read from `req.user.trackIds` (populated by the JWT guard). Returns `[]` if the artist has no tracks.

**Response `200`** — array of `LicenseRequest` objects (same shape as above).

---

#### `PUT /api/licenses/requests/:requestId/respond`

Approve or reject a license request. Only the artist who owns the track the request targets may call this.

**Path param:** `requestId` — UUID of the request.

**Request body** (`RespondToLicenseRequestDto`):

```json
{
  "status": "approved",
  "responseMessage": "Approved for non-commercial documentary use only."
}
```

`status` must be `approved` or `rejected`. `responseMessage` is optional.

**Response `200`** — the updated `LicenseRequest` with `respondedAt` set.

**Errors:**

| Status | Cause |
|---|---|
| `400` | Request is not in a `RESPONDABLE_STATES` (`pending` or `reopened`) |
| `403` | `requestId.trackId` is not in the artist's `trackIds` |
| `404` | `requestId` does not exist |

---

## Artist Ownership Rules

Ownership is enforced at two levels:

1. **License upsert** — `createOrUpdateLicense` queries `tracks` with `WHERE id = :trackId AND artistId = :artistId`. If no row is found, `403` is thrown. The artist cannot modify another artist's track license even if they know the `trackId`.

2. **Request response** — `respondToRequest` checks that `request.trackId` is present in `artistTrackIds` (the list passed from `req.user.trackIds`). This list is populated by the JWT strategy from the authenticated user's profile. If the track is not in the list, `403` is thrown.

Requesters can only withdraw or reopen their own requests — `request.requesterId !== requesterId` throws `403`.

---

## Notification Behavior

Notifications are dispatched via `LicensingDeliveryQueue` — an in-process outbox that keeps request creation synchronous and retries delivery in the background.

### Events and their notifications

| Trigger | Recipient | `NotificationType` | Title |
|---|---|---|---|
| New request submitted | Artist (track owner) | `LICENSE_REQUEST` | `"New License Request"` |
| Artist approves/rejects | Requester | `LICENSE_RESPONSE` | `"License Request APPROVED"` / `"License Request REJECTED"` |

### Delivery queue behavior

- Jobs are enqueued immediately on the same request thread (fire-and-forget from the caller's perspective).
- The queue flushes every **5 seconds** via `setInterval`.
- Each job is retried up to **3 times** on failure.
- After 3 failed attempts the job is marked `exhausted` and logged as an error — **manual replay is required** (see Ops section below).
- Both a WebSocket notification (`NotificationsService`) and an email (`LicensingMailService`) are enqueued for each event.

### Email behavior

`LicensingMailService` is a thin wrapper. In the current implementation it logs to console (`[MOCK MAIL]`). To send real emails, inject `@nestjs-modules/mailer` (or equivalent) into `sendMail` and resolve the recipient's actual email via `UsersService`.

---

## Ops Reference

### Expire stale pending requests

`expireStalePendingRequests` bulk-updates all `PENDING` requests where `expiresAt < NOW()` to `EXPIRED`. Wire this to a cron job or scheduler:

```ts
// Example: run every hour
@Cron('0 * * * *')
async handleExpiry() {
  const count = await this.licensingService.expireStalePendingRequests();
  this.logger.log(`Expired ${count} stale license requests`);
}
```

`expiresAt` is `null` by default — requests without an expiry date are never auto-expired by this method.

### Replaying exhausted delivery jobs

Exhausted jobs remain in the in-process `Map` and are visible via `LicensingDeliveryQueue.exhaustedJobs()`. To replay:

```ts
// Inject LicensingDeliveryQueue and call flush() after fixing the underlying issue
await deliveryQueue.flush();
```

For production deployments with multiple instances, replace `LicensingDeliveryQueue` with a persistent queue (BullMQ + Redis). The `enqueue` / `registerExecutor` interface is designed for this swap.

---

## Related Files

| File | Purpose |
|---|---|
| `licensing.service.ts` | All business logic — license CRUD, request lifecycle, ownership checks |
| `licensing.controller.ts` | HTTP layer — route definitions, auth guard, DTO binding |
| `licensing.dto.ts` | `CreateTrackLicenseDto`, `CreateLicenseRequestDto`, `RespondToLicenseRequestDto` |
| `track-license.entity.ts` | `TrackLicense` entity + `LicenseType` enum |
| `license-request.entity.ts` | `LicenseRequest` entity + deprecated `LicenseRequestStatus` enum |
| `licensing-lifecycle.enum.ts` | `LicensingLifecycle` enum + `WITHDRAWABLE_STATES`, `REOPENABLE_STATES`, `RESPONDABLE_STATES` |
| `licensing-delivery.queue.ts` | In-process outbox for async mail/notification delivery with retry |
| `licensing-mail.service.ts` | Email notification stubs (swap for real mailer in production) |
| `licensing.service.spec.ts` | Unit tests covering all service methods and error paths |
