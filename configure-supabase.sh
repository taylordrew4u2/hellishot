#!/bin/bash
# Update Fly.io apps with real Supabase credentials
# 
# Get these from: Supabase Dashboard → Project Settings → API
# - Project URL: https://ercjivtwluyjoqxhjdie.supabase.co
# - anon/public key: starts with eyJhbGc... (used in browser/web app)
# - service_role key: starts with eyJhbGc... (used in server/API - has full access)

SUPABASE_URL="https://ercjivtwluyjoqxhjdie.supabase.co"

echo "=========================================="
echo "Hell Is Hot - Supabase Configuration"
echo "=========================================="
echo ""
echo "Supabase URL: $SUPABASE_URL"
echo ""
echo "You need TWO keys from Supabase Project Settings → API:"
echo "  1. anon public key (for web app)"
echo "  2. service_role key (for API backend)"
echo ""
echo "Paste your SERVICE ROLE key (starts with eyJhbGc...):"
read -r SERVICE_ROLE_KEY

echo ""
echo "Paste your ANON PUBLIC key (starts with eyJhbGc...):"
read -r ANON_KEY

echo ""
echo "=========================================="
echo "Updating API secrets..."
echo "=========================================="
cd /workspaces/hellishot/api
flyctl secrets set \
  SUPABASE_URL="$SUPABASE_URL" \
  SUPABASE_SERVICE_ROLE_KEY="$SERVICE_ROLE_KEY"

echo ""
echo "API will automatically redeploy with new secrets."
echo "Waiting 10 seconds..."
sleep 10

echo ""
echo "=========================================="
echo "Deploying web app with Supabase..."
echo "=========================================="
cd /workspaces/hellishot/web
flyctl deploy \
  --build-arg VITE_SUPABASE_URL="$SUPABASE_URL" \
  --build-arg VITE_SUPABASE_ANON_KEY="$ANON_KEY"

echo ""
echo "=========================================="
echo "✅ Deployment Complete!"
echo "=========================================="
echo ""
echo "Your apps are now connected to Supabase:"
echo "  Web: https://hellishot-web-taylor.fly.dev"
echo "  API: https://hellishot-api-taylor.fly.dev"
echo ""
echo "Next steps:"
echo "  1. Run schema.sql in Supabase SQL Editor"
echo "  2. Run seed.sql in Supabase SQL Editor"
echo "  3. Enable Realtime on 'bookings' table"
echo "  4. Test the app!"
echo ""
