# Hell Is Hot - Deployment Summary

## ✅ API Deployed Successfully

**App Name:** hellishot-api-taylor
**URL:** https://hellishot-api-taylor.fly.dev
**Health Check:** https://hellishot-api-taylor.fly.dev/api/health ✓

### Current Configuration
- Secrets set with dummy values (functional but needs real credentials)
- Running on Fly.io region: iad (US East)
- Health checks passing

### Next Steps for API

1. **Update secrets with real values:**
   ```bash
   cd /workspaces/hellishot/api
   flyctl secrets set \
     SUPABASE_URL="https://YOUR_PROJECT.supabase.co" \
     SUPABASE_SERVICE_ROLE_KEY="YOUR_SERVICE_ROLE_KEY" \
     VENMO_USERNAME="your-real-venmo" \
     CASHAPP_CASHTAG="your-real-cashtag" \
     STRIPE_SECRET_KEY="sk_live_..." \
     STRIPE_PUBLISHABLE_KEY="pk_live_..." \
     STRIPE_WEBHOOK_SECRET="whsec_..."
   ```

2. **Configure Stripe webhook:**
   - Go to Stripe Dashboard → Webhooks
   - Add endpoint: `https://hellishot-api-taylor.fly.dev/webhooks/stripe`
   - Listen for event: `payment_intent.succeeded`
   - Copy webhook signing secret and add to secrets above

---

## 🚀 Web App - Ready to Deploy

**App Name:** hellishot-web-taylor
**Will proxy to:** hellishot-api-taylor.internal:8080

### Deploy Web App

1. **Create the app:**
   ```bash
   cd /workspaces/hellishot/web
   source ~/.bash_profile
   flyctl apps create hellishot-web-taylor
   ```

2. **Deploy with Supabase build args:**
   ```bash
   flyctl deploy \
     --build-arg VITE_SUPABASE_URL="https://YOUR_PROJECT.supabase.co" \
     --build-arg VITE_SUPABASE_ANON_KEY="your_anon_key"
   ```

3. **Your app will be live at:**
   `https://hellishot-web-taylor.fly.dev`

---

## 📋 Database Setup (Supabase)

Before the app works fully, you need to:

1. **Run schema:**
   - Open Supabase SQL Editor
   - Paste and run `/workspaces/hellishot/supabase/schema.sql`

2. **Seed event data:**
   - Run `/workspaces/hellishot/supabase/seed.sql`
   - This creates today's event with 4 time blocks

3. **Enable Realtime:**
   - In Supabase Dashboard → Database → Replication
   - Enable Realtime on `bookings` table

---

## 🔑 Required Credentials

### For API (flyctl secrets set):
- ✅ SUPABASE_URL
- ✅ SUPABASE_SERVICE_ROLE_KEY
- VENMO_USERNAME (your @handle)
- CASHAPP_CASHTAG (your $cashtag)
- STRIPE_SECRET_KEY (sk_test_ or sk_live_)
- STRIPE_PUBLISHABLE_KEY (pk_test_ or pk_live_)
- STRIPE_WEBHOOK_SECRET (from Stripe webhook endpoint)

### For Web (build args):
- ✅ VITE_SUPABASE_URL (same as API)
- ✅ VITE_SUPABASE_ANON_KEY (from Supabase project settings)

---

## ✨ What Works Now

With dummy secrets, the API:
- ✅ Responds to health checks
- ✅ Accepts HTTP requests
- ⚠️ Database operations will fail (need real Supabase URL)
- ⚠️ Payments won't work (need real payment credentials)

With real credentials:
- ✅ Full signup flow
- ✅ Venmo/Cash App deep links
- ✅ Apple Pay (after domain verification)
- ✅ Staff cash password validation
- ✅ Real-time schedule updates
- ✅ Admin dashboard
- ✅ CSV export

---

## 🎯 Production Checklist

- [ ] Set real Supabase credentials
- [ ] Set real payment credentials (Venmo, Cash App, Stripe)
- [ ] Configure Stripe webhook
- [ ] Deploy web app
- [ ] Run Supabase schema + seed
- [ ] Test full signup flow
- [ ] Add authentication to /admin routes
- [ ] Apple Pay domain verification (if using)
- [ ] Test on actual devices before event

---

## 📝 Quick Reference

**API Status:**
```bash
flyctl status -a hellishot-api-taylor
```

**API Logs:**
```bash
flyctl logs -a hellishot-api-taylor
```

**Update Secrets:**
```bash
cd api
flyctl secrets set KEY=value
```

**Redeploy API:**
```bash
cd api
flyctl deploy
```

**Redeploy Web:**
```bash
cd web
flyctl deploy \
  --build-arg VITE_SUPABASE_URL="..." \
  --build-arg VITE_SUPABASE_ANON_KEY="..."
```
