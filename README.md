# Hell Is Hot – Performer Self-Service Sign‑Up App

Mobile-first web app for performers to self-register into time blocks with real-time updates, simple payments (Venmo/Cash App deep links, Apple Pay via Stripe), a staff cash password flow, and a lightweight admin dashboard.

## What’s included

- Web app (Vite + React + PWA) in `web/`
- API server (Express + Supabase + Stripe) in `api/`
- Supabase schema and seed SQL in `supabase/`

Key features implemented:
- Schedule view with four blocks, live filled counts, real-time updates
- Sign-up form with performance type, optional video add-on, dynamic total
- Payments:
	- Venmo and Cash App deep links with prefilled amount and memo
	- Apple Pay via Stripe Payment Request (requires Stripe setup)
	- Cash flow via “Staff Password” validation
- Confirmation screen with slot number and details
- “My Bookings” on this device (device-id based)
- Current/Next Up banners; blocks indicate “Next Up” window (15 mins)
- Admin dashboard to view/remove bookings, set staff password, export CSV
- Offline-first basics (service worker caches shell and last data)
- Simple API rate limiting

## Prerequisites

- Node.js 18+ (v22 tested)
- A Supabase project (URL + Service Role key)
- Optional: Stripe account for Apple Pay (publishable key, secret key, webhook secret)

## 1) Database setup (Supabase)

1. Create a new Supabase project.
2. Run the schema:
	 - Open SQL Editor and paste `supabase/schema.sql`.
3. Seed an event and blocks (adjust times for your venue day):
	 - Run `supabase/seed.sql` in SQL Editor.

Notes:
- Function `get_block_filled_counts` drives real-time filled counts.
- Unique index on `(block_id, slot_number)` prevents double-booking.

## 2) Configure environment variables

Copy templates and fill in values:

api/.env

```
PORT=8787
SUPABASE_URL=YOUR_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
VENMO_USERNAME=yourvenmousername
CASHAPP_CASHTAG=yourcashtag
STRIPE_SECRET_KEY=sk_live_or_test
STRIPE_PUBLISHABLE_KEY=pk_live_or_test
STRIPE_WEBHOOK_SECRET=whsec_...
```

web/.env

```
VITE_SUPABASE_URL=YOUR_SUPABASE_URL
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

Apple Pay via Stripe notes:
- You’ll need to set up Apple Pay domain verification in Stripe Dashboard.
- The app uses Stripe Payment Request; webhook updates booking to `paid`.

## 3) Install dependencies

```
cd api && npm install
cd ../web && npm install
```

## 4) Run locally

In two terminals:

```
cd api && npm run dev
```

```
cd web && npm run dev
```

Visit http://localhost:5173

Vite proxies `/api`, `/pay`, `/webhooks` to the API on port 8787.

## 5) Using the app

- Home shows the schedule with capacity badges and “Sign Up”.
- Choose a block, fill your details, pick payment method:
	- Venmo/Cash App: opens the app/website with amount + memo prefilled.
	- Apple Pay: opens Payment Request (Stripe). On success, webhook marks as paid.
	- Cash: staff enters the event password; booking marked as paid.
- “My Bookings” shows all bookings for your device.
- “Admin” lets staff set the password, view/remove bookings, export CSV.

Security notes (MVP):
- Admin route has no auth yet; wire Supabase Auth/JWT before going live.
- Staff password is stored hashed in DB (bcrypt).
- API has simple rate limiting (60 req/min/IP).

## Deployment to Fly.io

Both API and web are ready to deploy on Fly.io with Dockerfiles and configs included.

### Prerequisites

1. Install flyctl:
   ```bash
   curl -L https://fly.io/install.sh | sh
   ```
   Add to PATH (codespaces example):
   ```bash
   export FLYCTL_INSTALL="/home/codespace/.fly"
   export PATH="$FLYCTL_INSTALL/bin:$PATH"
   ```

2. Login:
   ```bash
   fly auth login
   ```

### Deploy API

1. Create app (from `api/` directory):
   ```bash
   cd api
   fly launch --no-deploy
   ```
   - Choose a unique name (e.g., `hellishot-api-xyz`)
   - Pick region close to your venue (e.g., `iad` for US East)

2. Set secrets:
   ```bash
   fly secrets set \
     SUPABASE_URL="https://your-project.supabase.co" \
     SUPABASE_SERVICE_ROLE_KEY="your_service_role_key" \
     VENMO_USERNAME="your-venmo-handle" \
     CASHAPP_CASHTAG="yourcashtag" \
     STRIPE_SECRET_KEY="sk_test_or_live..." \
     STRIPE_PUBLISHABLE_KEY="pk_test_or_live..." \
     STRIPE_WEBHOOK_SECRET="whsec_..."
   ```

3. Deploy:
   ```bash
   fly deploy
   ```

4. Verify health:
   ```bash
   curl https://your-api-app.fly.dev/api/health
   ```

### Deploy Web

1. Update `web/nginx.conf` if you chose a different API app name:
   - Replace `hellishot-api.internal` with `YOUR_API_APP_NAME.internal`

2. Create app (from `web/` directory):
   ```bash
   cd ../web
   fly launch --no-deploy
   ```
   - Choose unique name (e.g., `hellishot-web-xyz`)

3. Deploy with build args:
   ```bash
   fly deploy \
     --build-arg VITE_SUPABASE_URL="https://your-project.supabase.co" \
     --build-arg VITE_SUPABASE_ANON_KEY="your_anon_key"
   ```

   **Alternative:** Bake build args into `web/fly.toml`:
   ```toml
   [build.args]
     VITE_SUPABASE_URL = "https://your-project.supabase.co"
     VITE_SUPABASE_ANON_KEY = "your_anon_key"
   ```
   Then just run: `fly deploy`

4. Visit your web app:
   ```
   https://your-web-app.fly.dev
   ```

### Stripe Webhook Setup

1. In Stripe Dashboard, create webhook endpoint:
   - URL: `https://your-api-app.fly.dev/webhooks/stripe`
   - Events: `payment_intent.succeeded`

2. Copy webhook secret and add to API secrets:
   ```bash
   cd api
   fly secrets set STRIPE_WEBHOOK_SECRET="whsec_..."
   ```

### Apple Pay Domain Verification

1. In Stripe Dashboard → Apple Pay:
   - Add your web domain: `your-web-app.fly.dev`
   - Download verification file and place in `web/public/`
   - Redeploy web app

## Production checklist

- Protect `api/admin/*` with authentication (Supabase Auth/JWT).
- Configure HTTPS and proper domains (Fly provides SSL by default).
- Complete Apple Pay domain verification; set Stripe keys.
- Tune RLS policies in Supabase if exposing client writes directly (current app writes via server with Service Role).
- Add logs/monitoring and backup for DB.
- Set rate limits per your expected load.
- Test payment flows thoroughly with Stripe test mode before going live.

## License

MIT