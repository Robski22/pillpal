# 🔧 Permanent Fix - Complete Setup Guide

This guide will set up **everything to work automatically on boot** - no manual steps needed!

## ⚠️ CRITICAL FIX: Use `http://` NOT `ws://` for Cloudflare Tunnel

**The Problem:** Cloudflare Tunnel doesn't support `ws://` protocol directly.  
**The Solution:** Use `http://localhost:8765` - the tunnel will handle WebSocket upgrades automatically.

---

## Step 1: Set Up Python WebSocket Server (Auto-Start)

**On your Raspberry Pi:**

```bash
# Create systemd service
sudo nano /etc/systemd/system/pillpal-websocket.service
```

Paste this (adjust path if your file is in a different location):

```ini
[Unit]
Description=PillPal WebSocket Server
After=network.target

[Service]
Type=simple
User=justin
WorkingDirectory=/home/justin/pillpal
ExecStart=/usr/bin/python3 /home/justin/pillpal/pi_websocket_server_PCA9685.py
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

Save: `Ctrl+X`, `Y`, `Enter`

Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable pillpal-websocket
sudo systemctl start pillpal-websocket
sudo systemctl status pillpal-websocket
```

---

## Step 2: Set Up Cloudflare Tunnel (Auto-Start)

**IMPORTANT:** Use `http://localhost:8765` NOT `ws://localhost:8765`

```bash
# Create service file
sudo nano /etc/systemd/system/cloudflared-quick-tunnel.service
```

Paste this:

```ini
[Unit]
Description=Cloudflare Quick Tunnel for PillPal WebSocket
After=network.target pillpal-websocket.service
Requires=pillpal-websocket.service

[Service]
Type=simple
User=justin
ExecStart=/usr/local/bin/cloudflared tunnel --url http://localhost:8765
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

**Note:** Using `http://localhost:8765` - Cloudflare Tunnel will automatically handle WebSocket upgrades.

Save: `Ctrl+X`, `Y`, `Enter`

Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable cloudflared-quick-tunnel
sudo systemctl start cloudflared-quick-tunnel
sudo systemctl status cloudflared-quick-tunnel
```

Wait 10-15 seconds, then check the logs to get the tunnel URL:
```bash
sudo journalctl -u cloudflared-quick-tunnel -n 50 | grep trycloudflare
```

You should see a URL like: `https://xxxxx-xxxxx.trycloudflare.com`

---

## Step 3: Create Auto-Update Script

This script automatically updates your Supabase database with the tunnel URL on every boot.

```bash
# Create scripts directory
mkdir -p ~/scripts

# Create the update script
nano ~/scripts/update_tunnel_url.sh
```

Paste this script (replace `YOUR_SERVICE_ROLE_KEY_HERE` with your actual Supabase service role key):

```bash
#!/bin/bash

# Log file
LOG_FILE="/home/justin/scripts/update_tunnel_url.log"
echo "$(date): Starting tunnel URL update script" >> "$LOG_FILE"

# Wait for cloudflared to start and get URL
echo "$(date): Waiting for cloudflared to start..." >> "$LOG_FILE"
sleep 25

# Get the tunnel URL from cloudflared logs
TUNNEL_URL=""

# Try quick tunnel service first
if systemctl is-active --quiet cloudflared-quick-tunnel 2>/dev/null; then
    echo "$(date): Checking cloudflared-quick-tunnel logs..." >> "$LOG_FILE"
    TUNNEL_URL=$(sudo journalctl -u cloudflared-quick-tunnel -n 200 --no-pager 2>/dev/null | grep -oP 'https://[a-z0-9-]+\.trycloudflare\.com' | tail -1)
fi

# Try named tunnel service if quick tunnel didn't work
if [ -z "$TUNNEL_URL" ] && systemctl is-active --quiet cloudflared-tunnel 2>/dev/null; then
    echo "$(date): Checking cloudflared-tunnel logs..." >> "$LOG_FILE"
    TUNNEL_URL=$(sudo journalctl -u cloudflared-tunnel -n 200 --no-pager 2>/dev/null | grep -oP 'https://[a-z0-9-]+\.trycloudflare\.com' | tail -1)
fi

# If still no URL, wait more and try again
if [ -z "$TUNNEL_URL" ]; then
    echo "$(date): Still no URL, waiting 15 more seconds..." >> "$LOG_FILE"
    sleep 15
    TUNNEL_URL=$(sudo journalctl -u cloudflared-quick-tunnel -n 200 --no-pager 2>/dev/null | grep -oP 'https://[a-z0-9-]+\.trycloudflare\.com' | tail -1)
fi

if [ -z "$TUNNEL_URL" ]; then
    echo "$(date): ❌ Failed to get tunnel URL" >> "$LOG_FILE"
    exit 1
fi

# Convert https:// to wss:// for WebSocket (remove trailing slash)
WS_URL=$(echo "$TUNNEL_URL" | sed 's|https://|wss://|' | sed 's|/$||')
echo "$(date): Found tunnel URL: $WS_URL" >> "$LOG_FILE"

# Your Supabase credentials
SUPABASE_URL="https://ubpyymhxyjtbcifspcwj.supabase.co"
SUPABASE_SERVICE_KEY="YOUR_SERVICE_ROLE_KEY_HERE"  # ⚠️ REPLACE THIS!

# Update the database
echo "$(date): Updating Supabase database..." >> "$LOG_FILE"
RESPONSE=$(curl -s -w "\n%{http_code}" -X PATCH \
  "${SUPABASE_URL}/rest/v1/pi_connection_config?id=eq.1" \
  -H "apikey: ${SUPABASE_SERVICE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=minimal" \
  -d "{\"websocket_url\": \"${WS_URL}\", \"updated_at\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "204" ]; then
    echo "$(date): ✅ Database updated successfully with: $WS_URL" >> "$LOG_FILE"
    echo "✅ Database updated with: $WS_URL"
else
    echo "$(date): ❌ Error updating database: HTTP $HTTP_CODE - $BODY" >> "$LOG_FILE"
    echo "❌ Error updating database: HTTP $HTTP_CODE"
    exit 1
fi
```

**Get your Supabase Service Role Key:**
1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to **Settings** → **API**
4. Copy the **service_role** key (keep it secret!)
5. Replace `YOUR_SERVICE_ROLE_KEY_HERE` in the script

Make executable:
```bash
chmod +x ~/scripts/update_tunnel_url.sh
```

Test it manually:
```bash
~/scripts/update_tunnel_url.sh
cat ~/scripts/update_tunnel_url.log
```

---

## Step 4: Set Up Passwordless Sudo for journalctl

```bash
sudo visudo
```

Add this line at the end:
```
justin ALL=(ALL) NOPASSWD: /usr/bin/journalctl
```

Save: `Ctrl+X`, `Y`, `Enter`

Test:
```bash
sudo journalctl -u cloudflared-quick-tunnel -n 5
# Should NOT ask for password
```

---

## Step 5: Create Auto-Update Service

```bash
sudo nano /etc/systemd/system/update-tunnel-url.service
```

Paste this:

```ini
[Unit]
Description=Auto-Update Tunnel URL on Boot
After=cloudflared-quick-tunnel.service network.target
Requires=cloudflared-quick-tunnel.service

[Service]
Type=oneshot
User=justin
ExecStart=/home/justin/scripts/update_tunnel_url.sh
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

Save: `Ctrl+X`, `Y`, `Enter`

Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable update-tunnel-url
sudo systemctl start update-tunnel-url
sudo systemctl status update-tunnel-url
```

Check logs:
```bash
sudo journalctl -u update-tunnel-url -n 50
cat ~/scripts/update_tunnel_url.log
```

---

## Step 6: Verify Everything

```bash
# Check all services
sudo systemctl status pillpal-websocket
sudo systemctl status cloudflared-quick-tunnel
sudo systemctl status update-tunnel-url

# Check if all are enabled (will start on boot)
systemctl is-enabled pillpal-websocket
systemctl is-enabled cloudflared-quick-tunnel
systemctl is-enabled update-tunnel-url
```

All should show "enabled".

---

## Step 7: Test Complete Setup

1. **Reboot your Pi:**
   ```bash
   sudo reboot
   ```

2. **After reboot (wait 30-60 seconds), check services:**
   ```bash
   sudo systemctl status pillpal-websocket
   sudo systemctl status cloudflared-quick-tunnel
   sudo systemctl status update-tunnel-url
   ```

3. **Check the tunnel URL was updated:**
   ```bash
   # Get current tunnel URL
   sudo journalctl -u cloudflared-quick-tunnel -n 50 | grep trycloudflare
   
   # Check what was saved to database
   cat ~/scripts/update_tunnel_url.log
   ```

4. **Verify in Supabase:**
   - Go to Supabase Dashboard → Table Editor → `pi_connection_config`
   - Check that `websocket_url` is updated (should be `wss://xxxxx.trycloudflare.com`)

5. **Test your Vercel app:**
   - Open https://pillpal-drab.vercel.app/
   - Refresh the page
   - Should see green "✅ Connected to Raspberry Pi" (not yellow "offline")

---

## ✅ Done! Permanent Setup Complete

**Now everything works automatically:**
- ✅ Python server starts on boot
- ✅ Cloudflare tunnel starts on boot (using `http://` protocol)
- ✅ Database updates automatically with tunnel URL
- ✅ Your Vercel app connects automatically
- ✅ **No manual steps needed after boot!**

**Just boot your Pi and open your Vercel app - it will connect automatically!** 🎉

---

## Troubleshooting

### If tunnel fails to start:
- Make sure you're using `http://localhost:8765` NOT `ws://localhost:8765`
- Check Python server is running first: `sudo systemctl status pillpal-websocket`
- Check logs: `sudo journalctl -u cloudflared-quick-tunnel -n 50`

### If auto-update script fails:
- Check service role key is correct in the script
- Check logs: `cat ~/scripts/update_tunnel_url.log`
- Verify passwordless sudo: `sudo journalctl -u cloudflared-quick-tunnel -n 5`

### If Vercel app still shows offline:
- Check Supabase database - is URL correct?
- Make sure URL has no trailing slash
- Check browser console (F12) for errors
- Verify tunnel URL in database matches what's in logs


