#!/bin/bash
# Deploy script for API - update these values before running

# Navigate to API directory
cd "$(dirname "$0")"

# Set secrets (UPDATE THESE VALUES)
flyctl secrets set \
  SUPABASE_URL="https://YOUR_PROJECT.supabase.co" \
  SUPABASE_SERVICE_ROLE_KEY="YOUR_SERVICE_ROLE_KEY" \
  VENMO_USERNAME="your-venmo-handle" \
  CASHAPP_CASHTAG="yourcashtag" \
  STRIPE_SECRET_KEY="sk_test_..." \
  STRIPE_PUBLISHABLE_KEY="pk_test_..." \
  STRIPE_WEBHOOK_SECRET="whsec_..."

# Deploy
flyctl deploy
