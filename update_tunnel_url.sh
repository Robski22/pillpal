#!/bin/bash

# Auto-Update Tunnel URL Script
# This script runs on boot and updates the Supabase database with the current Cloudflare tunnel URL

# Wait for cloudflared to start and generate URL
sleep 20

# Get the tunnel URL from cloudflared logs
TUNNEL_URL=$(sudo journalctl -u cloudflared-tunnel -n 200 | grep -oP 'https://[a-z0-9-]+\.trycloudflare\.com' | tail -1)

if [ -z "$TUNNEL_URL" ]; then
    echo "$(date): Failed to get tunnel URL from cloudflared logs"
    # Try again after more time
    sleep 10
    TUNNEL_URL=$(sudo journalctl -u cloudflared-tunnel -n 200 | grep -oP 'https://[a-z0-9-]+\.trycloudflare\.com' | tail -1)
    
    if [ -z "$TUNNEL_URL" ]; then
        echo "$(date): Still failed to get tunnel URL. Exiting."
        exit 1
    fi
fi

# Convert https:// to wss:// for WebSocket
WS_URL=$(echo $TUNNEL_URL | sed 's|https://|wss://|')

echo "$(date): Found tunnel URL: $WS_URL"

# Replace these with your actual Supabase credentials
SUPABASE_URL="YOUR_SUPABASE_PROJECT_URL"
SUPABASE_SERVICE_KEY="YOUR_SUPABASE_SERVICE_ROLE_KEY"

# Update the database using Supabase stored procedure
# Using the update_pi_url RPC function (much cleaner!)
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  "${SUPABASE_URL}/rest/v1/rpc/update_pi_url" \
  -H "apikey: ${SUPABASE_SERVICE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=minimal" \
  -d "{\"url\": \"${WS_URL}\"}")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "204" ]; then
    echo "$(date): ✅ Successfully updated database with: $WS_URL"
    exit 0
else
    echo "$(date): ❌ Error updating database. HTTP Code: $HTTP_CODE"
    echo "$(date): Response: $BODY"
    exit 1
fi

