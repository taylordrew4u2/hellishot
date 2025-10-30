#!/bin/bash
# Quick deploy with dummy Supabase values for testing
# Update these once you have real Supabase credentials

cd "$(dirname "$0")"

flyctl deploy \
  --build-arg VITE_SUPABASE_URL="http://localhost:54321" \
  --build-arg VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1bW15Iiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDUxOTIwMDAsImV4cCI6MTk2MDc2ODAwMH0.dummy"

echo ""
echo "Web app deployed with dummy Supabase credentials."
echo "To update with real credentials, edit this script and run: ./deploy.sh"
