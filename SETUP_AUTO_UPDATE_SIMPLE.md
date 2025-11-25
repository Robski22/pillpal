# 🔄 Auto-Update Tunnel URL on Boot (Using Supabase Stored Procedure)

## Perfect! You have `update_pi_url` stored procedure!

This makes it much easier - we'll use the stored procedure instead of direct PATCH requests.

---

## Step 1: Get Your Supabase Credentials

From the Supabase dashboard (like in your screenshot):

1. Go to **Settings** → **API**
2. Copy:
   - **Project URL**: `https://ubpyymhxyjtbcifspcwj.supabase.co` (from your screenshot)
   - **service_role key** (the secret key - keep it safe!)

---

## Step 2: On Your Pi - Create the Script

```bash
# SSH into Pi
ssh justin@192.168.100.220

# Create script directory
mkdir -p ~/scripts

# Create the script
nano ~/scripts/update_tunnel_url.sh
```

Paste this (replace with your actual credentials):

```bash
#!/bin/bash

# Auto-Update Tunnel URL Script
# Uses Supabase update_pi_url stored procedure

# Wait for cloudflared to start and generate URL
sleep 20

# Get the tunnel URL from cloudflared logs
TUNNEL_URL=$(sudo journalctl -u cloudflared-tunnel -n 200 | grep -oP 'https://[a-z0-9-]+\.trycloudflare\.com' | tail -1)

if [ -z "$TUNNEL_URL" ]; then
    echo "$(date): Failed to get tunnel URL from cloudflared logs"
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

# Your Supabase credentials (REPLACE THESE!)
SUPABASE_URL="https://ubpyymhxyjtbcifspcwj.supabase.co"
SUPABASE_SERVICE_KEY="YOUR_SERVICE_ROLE_KEY_HERE"

# Call the update_pi_url stored procedure
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
```

**Important:** Replace `YOUR_SERVICE_ROLE_KEY_HERE` with your actual service role key!

Save: `Ctrl+X`, then `Y`, then `Enter`

---

## Step 3: Make Script Executable

```bash
chmod +x ~/scripts/update_tunnel_url.sh
```

---

## Step 4: Create Systemd Service

```bash
sudo nano /etc/systemd/system/update-tunnel-url.service
```

Paste this:

```ini
[Unit]
Description=Auto-Update Tunnel URL on Boot
After=cloudflared-tunnel.service network.target
Requires=cloudflared-tunnel.service

[Service]
Type=oneshot
User=justin
ExecStart=/home/justin/scripts/update_tunnel_url.sh
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

Save: `Ctrl+X`, then `Y`, then `Enter`

---

## Step 5: Enable and Test

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable service (runs on boot)
sudo systemctl enable update-tunnel-url.service

# Test it now
sudo systemctl start update-tunnel-url.service

# Check if it worked
sudo journalctl -u update-tunnel-url -n 50
```

You should see:
```
Found tunnel URL: wss://xxxxx.trycloudflare.com
✅ Successfully updated database with: wss://xxxxx.trycloudflare.com
```

---

## Step 6: Verify in Supabase

1. Go to **Supabase Dashboard** → **Table Editor** → **pi_connection_config**
2. Check the `websocket_url` column
3. It should be updated with the current tunnel URL

---

## Step 7: Test on Boot

```bash
# Restart Pi to test
sudo reboot

# After reboot, check logs
sudo journalctl -u update-tunnel-url -n 50
```

---

## ✅ Done!

**After this setup:**
- ✅ Script runs automatically on every boot
- ✅ Gets current tunnel URL from cloudflared
- ✅ Calls `update_pi_url` stored procedure
- ✅ Updates Supabase database automatically
- ✅ Your Vercel app always uses the latest URL
- ✅ **No manual updates needed!**

---

## Troubleshooting

### Can't find tunnel URL
```bash
# Check if cloudflared is running
sudo systemctl status cloudflared-tunnel

# Increase wait time in script (change sleep 20 to sleep 30)
```

### Database update fails
- Check service role key is correct
- Verify stored procedure exists: Go to Supabase → API Docs → Stored Procedures → update_pi_url
- Check Supabase logs for errors

### Script not running on boot
```bash
# Check service status
sudo systemctl status update-tunnel-url

# Check logs
sudo journalctl -u update-tunnel-url -n 100

# Verify service is enabled
sudo systemctl is-enabled update-tunnel-url
```

---

## Summary

1. ✅ Get Supabase credentials (URL + service role key)
2. ✅ Create update script using `update_pi_url` stored procedure
3. ✅ Make script executable
4. ✅ Create systemd service
5. ✅ Enable service
6. ✅ Test and verify
7. ✅ **Done! Auto-updates on every boot!** 🎉

**Now your tunnel URL updates automatically every time the Pi restarts!**



