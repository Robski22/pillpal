#!/bin/bash

# Auto-Update Tunnel URL Script
# This script runs on boot and updates the Supabase database with the current Cloudflare tunnel URL
# Fixed version that works without sudo password prompt

# Set error handling
set -e

# Log function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S'): $1" >&2
}

log "Starting tunnel URL update script..."

# Wait for cloudflared to start and generate URL
log "Waiting for cloudflared to start..."
sleep 25

# Try to get tunnel URL without sudo first (if user is in systemd-journal group)
log "Attempting to get tunnel URL..."
TUNNEL_URL=$(journalctl -u cloudflared-tunnel -n 200 --no-pager 2>/dev/null | grep -oP 'https://[a-z0-9-]+\.trycloudflare\.com' | tail -1)

# If that didn't work, try with sudo (should work if passwordless sudo is configured)
if [ -z "$TUNNEL_URL" ]; then
    log "First attempt failed, trying with sudo..."
    TUNNEL_URL=$(sudo journalctl -u cloudflared-tunnel -n 200 --no-pager 2>/dev/null | grep -oP 'https://[a-z0-9-]+\.trycloudflare\.com' | tail -1)
fi

# If still no URL, wait a bit more and try again
if [ -z "$TUNNEL_URL" ]; then
    log "Still no URL found, waiting 15 more seconds..."
    sleep 15
    TUNNEL_URL=$(journalctl -u cloudflared-tunnel -n 200 --no-pager 2>/dev/null | grep -oP 'https://[a-z0-9-]+\.trycloudflare\.com' | tail -1)
    
    if [ -z "$TUNNEL_URL" ]; then
        TUNNEL_URL=$(sudo journalctl -u cloudflared-tunnel -n 200 --no-pager 2>/dev/null | grep -oP 'https://[a-z0-9-]+\.trycloudflare\.com' | tail -1)
    fi
fi

# Final check
if [ -z "$TUNNEL_URL" ]; then
    log "ERROR: Failed to get tunnel URL from cloudflared logs after multiple attempts"
    log "This might mean cloudflared hasn't started yet or there's a permission issue"
    exit 1
fi

# Convert https:// to wss:// for WebSocket
WS_URL=$(echo "$TUNNEL_URL" | sed 's|https://|wss://|')

log "Found tunnel URL: $WS_URL"

# Your Supabase credentials
SUPABASE_URL="https://ubpyymhxyjtbcifspcwj.supabase.co"
SUPABASE_SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVicHl5bWh4eWp0YmNpZnNwY3dqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTEzODYzNywiZXhwIjoyMDc2NzE0NjM3fQ.70ZSDf9njA82piZYSp_Nf5203EixdoYWPUCjWe2BvWQ"

# Update the database using Supabase stored procedure
log "Updating Supabase database with URL: $WS_URL"

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
    log "✅ Successfully updated database with: $WS_URL"
    exit 0
else
    log "❌ Error updating database. HTTP Code: $HTTP_CODE"
    log "Response: $BODY"
    exit 1
fi
