#!/bin/bash
# Quick deploy script - paste your SERVICE ROLE key when you run this

SUPABASE_URL="https://ercjivtwluyjoqxhjdie.supabase.co"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVyY2ppdnR3bHV5am9xeGhqZGllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3ODA1MjYsImV4cCI6MjA3NzM1NjUyNn0.E67G7i6cBpttUYbOb_xDH-OBky0NsW4NbVfQY7C9ZtM"

# This is the SERVICE ROLE KEY - REPLACE THIS with your actual service_role key from Supabase
SERVICE_ROLE_KEY="PASTE_YOUR_SERVICE_ROLE_KEY_HERE"

if [[ "$SERVICE_ROLE_KEY" == "PASTE_YOUR_SERVICE_ROLE_KEY_HERE" ]]; then
  echo "❌ ERROR: You need to edit this file and add your SERVICE ROLE key"
  echo ""
  echo "1. Go to: Supabase Dashboard → Settings → API"
  echo "2. Find 'service_role' key (NOT the anon key)"
  echo "3. Click 'Copy' or reveal and copy it"
  echo "4. Edit this file: nano $0"
  echo "5. Replace PASTE_YOUR_SERVICE_ROLE_KEY_HERE with your actual key"
  echo "6. Run this script again"
  exit 1
fi

echo "🚀 Updating API with Supabase credentials..."
cd /workspaces/hellishot/api
source ~/.bash_profile
flyctl secrets set \
  SUPABASE_URL="$SUPABASE_URL" \
  SUPABASE_SERVICE_ROLE_KEY="$SERVICE_ROLE_KEY"

echo ""
echo "⏳ Waiting for API to redeploy (30 seconds)..."
sleep 30

echo ""
echo "🌐 Deploying web app with Supabase..."
cd /workspaces/hellishot/web
flyctl deploy \
  --build-arg VITE_SUPABASE_URL="$SUPABASE_URL" \
  --build-arg VITE_SUPABASE_ANON_KEY="$ANON_KEY"

echo ""
echo "✅ Done! Your apps are now connected to Supabase!"
echo ""
echo "Web: https://hellishot-web-taylor.fly.dev"
echo "API: https://hellishot-api-taylor.fly.dev"
echo ""
echo "Next: Run schema.sql and seed.sql in Supabase SQL Editor"
