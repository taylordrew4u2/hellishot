## Purpose

This file gives concise, actionable guidance for an AI coding agent working in the Hell Is Hot repo so it can be immediately productive. Focus on discoverable patterns, where to look for authoritative behaviour, and the concrete commands used by developers.

## Big picture

- Monorepo layout:
  - `web/` — Vite + React + TypeScript PWA (frontend). Key file: `web/src/App.tsx` (Schedule, SignupDialog, Tarot flows).
  - `api/` — Node (Express) server that talks to Supabase and Stripe. Key files: `api/src/routes/*`, `api/src/utils/slotLock.ts` (slot assignment + break logic).
  - `supabase/` — SQL schema and migrations. Look here for schema changes and migrated behaviour (example: `supabase/migrations/20251030_000005_restructure_scheduling.sql`).

## Environment variables (complete reference)

**API (`api/.env`):**
```bash
PORT=8787
SUPABASE_URL=https://ercjivtwluyjoqxhjdie.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhb...  # Service role key (admin access)
VENMO_USERNAME=yourvenmousername
CASHAPP_CASHTAG=$yourcashtag
STRIPE_SECRET_KEY=sk_live_or_test_...
STRIPE_PUBLISHABLE_KEY=pk_live_or_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

**Web (`web/.env`):**
```bash
VITE_SUPABASE_URL=https://ercjivtwluyjoqxhjdie.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhb...  # Anon key (public access with RLS)
```

**Fly.io secrets (set via `fly secrets set`):**
- API app needs all API env vars above (except PORT, which is auto-configured)
- Web app: Vite env vars are baked into build as `--build-arg` (see `web/fly.toml` or `fly deploy` command)

## Critical integration points

- Realtime & counts: `get_block_filled_counts` Postgres function (Supabase) drives the live filled counts used by `web/src/App.tsx`.
- Bookings flow: POST `/api/bookings/create` and related cash/payment routes in `api/src/routes/bookings.ts`.
- Tarot flows: `api/src/routes/tarot*` and frontend fetches `/api/tarot/readers` and `/api/tarot/create` from `web/src/App.tsx`.
- Payments:
  - Venmo/Cash App: deep links generated server-side or frontend; values in env vars (`VENMO_USERNAME`, `CASHAPP_CASHTAG`).
  - Apple Pay via Stripe: webhook endpoint `/webhooks/stripe` and Stripe secrets in API env.

## Project-specific conventions & gotchas

- Single performance queue: The app was migrated from multiple blocks to a single continuous performance queue; slot assignment is sequential across the event (see `api/src/utils/slotLock.ts`).
- Break periods: Booking times skip fixed 10-minute breaks--implemented in the slot time calculation code. Tests during development often check that slot X time jumps over break windows.
- Tarot readers use `block_number` (1–4); frontend groups readers by `block_number` when rendering tarot blocks (`web/src/types.ts` defines `TarotReader`).
- Device-local bookings: “My Bookings” are looked up by `device_id` stored in localStorage (see `web/src/App.tsx` useDeviceId helper).
- Service worker caution: `web/public/sw.js` caches the app shell; during development or deployments a hard refresh or cache bump may be required (`cache-v4`).

## Developer workflows (commands)

- Local development
  - Start local API: `cd api && npm run dev` (defaults to port 8787)
  - Start web dev server: `cd web && npm run dev` (Vite; proxies `/api` to API)
  - Run local Supabase (optional): `supabase start` after `supabase link` if testing DB locally.

- Build & deploy
  - Build web: `cd web && npm run build`
  - Deploy to Fly (web): `fly deploy` from `web/` (uses Dockerfile/nginx). Update `web/nginx.conf` if internal API name differs.
  - Build & deploy API: `cd api && fly deploy` from `api/` (app must have secrets set via `fly secrets set`).

## Files to consult for authoritative behaviour

- Frontend: `web/src/App.tsx`, `web/src/types.ts`, `web/public/sw.js`.
- Backend: `api/src/utils/slotLock.ts`, `api/src/routes/bookings.ts`, `api/src/routes/tarot*.ts`.
- DB & migrations: `supabase/schema.sql`, `supabase/migrations/*` (especially the 20251030 migration that reworked scheduling).
- Deployment: `web/fly.toml`, `api/fly.toml`, `web/nginx.conf`.

## API/RPC contracts (with examples)

### `assignSlotAndCreateBooking` (slotLock.ts)
**Input:**
```typescript
{
  event_id: "a0677b93-85d2-4767-9f9f-f10d6b699831",
  block: { id: "798114cc...", capacity: 200, starts_at: "2025-10-30T22:30:00+00:00" },
  user_name: "Jane Doe",
  performance_type: "Comedy",
  song_info: null,
  wants_video: false,
  payment_method: "venmo",
  payment_status: "initiated",
  device_id: "uuid-from-localstorage"
}
```
**Output (success):**
```json
{
  "ok": true,
  "booking": {
    "id": "f857fad8-...",
    "slot_number": 29,
    "approximate_time": "2025-10-31T00:34:00+00:00",
    "payment_status": "initiated",
    "user_name": "Jane Doe",
    ...
  }
}
```
**Output (failure):** `{ "ok": false, "error": "Event is full" }`

**Break handling:** Slot times skip 10-minute breaks at 00:20-00:30, 02:20-02:30, 04:20-04:30 UTC (7:20-7:30PM, 9:20-9:30PM, 11:20-11:30PM EST). Example: slot 28 at 00:18 → slot 29 at 00:34 (skips 00:20-00:30).

### `get_block_filled_counts` (Postgres function)
**Call (JS):**
```javascript
const { data } = await supabase.rpc('get_block_filled_counts', { 
  p_event_id: 'a0677b93-85d2-4767-9f9f-f10d6b699831' 
})
```
**Returns:**
```json
[
  { "block_id": "798114cc-868a-4a89-81ac-93b893912c9d", "filled": 40 }
]
```

### `/api/tarot/readers` (GET)
**Returns:**
```json
{
  "readers": [
    {
      "id": "d94db0fa-ae3d-4233-bb67-625a0d2864e7",
      "name": "Meeti",
      "starts_at": "2025-10-30T22:30:00+00:00",
      "ends_at": "2025-10-31T00:20:00+00:00",
      "block_number": 1,
      "event_id": "a0677b93-..."
    },
    ...
  ]
}
```

### `/api/bookings/create` (POST)
**Request body:**
```json
{
  "block_id": "798114cc-...",
  "user_name": "John Smith",
  "performance_type": "Karaoke",
  "song_info": "Bohemian Rhapsody - Queen",
  "wants_video": true,
  "payment_method": "applepay",
  "device_id": "uuid-from-localstorage",
  "amount": 13
}
```
**Response (success):**
```json
{
  "booking": {
    "id": "booking-uuid",
    "slot_number": 15,
    "approximate_time": "2025-10-30T23:26:00+00:00",
    "payment_status": "initiated"
  }
}
```

## Typical troubleshooting steps for blank-screen or runtime errors

### 1. Browser console errors (most common)
**Check console first:** Open DevTools → Console tab. Common errors:
- `Cannot read properties of undefined (reading 'blocks')` → Schedule component accessing `summary.blocks[0]` before data loads. Add null check: `if (!summary) return <div>Loading...</div>`
- `Cannot read properties of undefined (reading 'filled')` → Similar issue with `performanceBlock.filled`. Add: `if (!performanceBlock) return <div>No blocks available</div>`
- `Unexpected token '<' in JSON` → API returned HTML error page instead of JSON. Check API logs or curl the endpoint.

### 2. Verify deployment artifacts
```bash
# Check HTML loads
curl -I https://hellishot-web-taylor.fly.dev

# Check JS bundle loads (find actual hash from HTML source)
curl -I https://hellishot-web-taylor.fly.dev/assets/index-zOKEiHaO.js

# Expected: HTTP 200, Content-Type: application/javascript
```

### 3. Test API endpoints directly
```bash
# Tarot readers
curl https://hellishot-web-taylor.fly.dev/api/tarot/readers | jq .

# Active event and blocks (via Supabase REST)
curl -s "https://ercjivtwluyjoqxhjdie.supabase.co/rest/v1/blocks?select=*&event_id=eq.a0677b93-85d2-4767-9f9f-f10d6b699831" \
  -H "apikey: YOUR_ANON_KEY" | jq .

# Filled counts RPC
curl -s "https://ercjivtwluyjoqxhjdie.supabase.co/rest/v1/rpc/get_block_filled_counts" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"p_event_id":"a0677b93-85d2-4767-9f9f-f10d6b699831"}' | jq .
```

### 4. Service worker cache issues
After deployment, users may see stale cached content. Force refresh:
- **Chrome/Edge:** Ctrl+Shift+R (Windows) / Cmd+Shift+R (Mac)
- **Firefox:** Ctrl+F5 / Cmd+Shift+R
- **Incognito/Private mode** bypasses cache entirely

Service worker version is in `web/public/sw.js` (currently `cache-v4`). Bump version if major UI changes deployed.

### 5. Database queries for debugging bookings
```sql
-- Check active event
SELECT id, name, starts_at, ends_at FROM events WHERE active = true;

-- Check blocks for active event
SELECT id, name, starts_at, ends_at, capacity 
FROM blocks 
WHERE event_id = (SELECT id FROM events WHERE active = true)
ORDER BY position;

-- Check filled counts
SELECT * FROM get_block_filled_counts(
  (SELECT id FROM events WHERE active = true)
);

-- Check recent bookings with slot times
SELECT slot_number, approximate_time, user_name, performance_type, payment_status
FROM bookings
WHERE event_id = (SELECT id FROM events WHERE active = true)
ORDER BY slot_number
LIMIT 50;

-- Verify break handling (slots 26-30 should show time jump at break)
SELECT slot_number, approximate_time
FROM bookings
WHERE event_id = (SELECT id FROM events WHERE active = true)
  AND slot_number BETWEEN 26 AND 30
ORDER BY slot_number;
```

### 6. Common runtime patterns to check
- **Missing environment variables:** Check `fly secrets list` for API, ensure `VITE_*` vars baked into web build
- **CORS errors:** API and web must be on same domain OR API must set CORS headers (currently proxied via nginx in production)
- **Stripe webhook failures:** Check webhook signing secret matches, verify endpoint URL in Stripe Dashboard
- **Realtime not updating:** Supabase realtime channel may disconnect; check browser network tab for WebSocket connection

## Small examples to copy/paste

- Fetch tarot readers (used in `web/src/App.tsx`):
  ```javascript
  fetch('/api/tarot/readers').then(r => r.json()).then(d => setReaders(d.readers || []))
  ```

- Calculate approximate time for slot (see `api/src/utils/slotLock.ts` for full logic):
  ```javascript
  // 4 minutes per performance, skip breaks at 00:20-00:30, 02:20-02:30, 04:20-04:30 UTC
  const avgMinutes = 4
  let currentTime = new Date(blockStartTime)
  for (let i = 0; i < slotNumber - 1; i++) {
    currentTime = new Date(currentTime.getTime() + avgMinutes * 60000)
    // Check if in break, skip to end of break...
  }
  ```

- Safe null checks for React components loading async data:
  ```javascript
  if (loading || !summary) return <div>Loading...</div>
  const performanceBlock = summary.blocks[0]
  if (!performanceBlock) return <div>No blocks available</div>
  // Now safe to access performanceBlock.filled, performanceBlock.capacity
  ```

## When to ask for human guidance

- Any change to Supabase migrations or functions (ask for DB migration windows and backups).
- Changing payment flows (Stripe keys, webhook handling) — needs careful verification and live tests.

---
If any part of this feels incomplete or you'd like a more detailed snippet (for example, a walkthrough of the slot time calculation or an exact list of env vars used by the deployed Fly apps), tell me which area and I will expand the doc.
