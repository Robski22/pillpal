# 🚀 Complete Auto-Start Setup for Vercel App

This guide will set up your Raspberry Pi so that **everything starts automatically on boot** and your Vercel app (https://pillpal-drab.vercel.app/) connects automatically.

## What We'll Set Up

1. ✅ Python WebSocket server (auto-start on boot)
2. ✅ Cloudflare tunnel (auto-start on boot)  
3. ✅ Auto-update script (updates database with tunnel URL on boot)
4. ✅ Everything works together automatically!

---

## Step 1: Set Up Python WebSocket Server to Auto-Start

**On your Raspberry Pi:**

```bash
# Create systemd service for Python server
sudo nano /etc/systemd/system/pillpal-websocket.service
```

Paste this (adjust path if needed):

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

## Step 2: Set Up Cloudflare Tunnel to Auto-Start

### Option A: Quick Tunnel (Easier, but URL changes on restart)

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

**IMPORTANT:** Use `http://localhost:8765` NOT `ws://localhost:8765` - Cloudflare Tunnel doesn't support `ws://` protocol directly, but it will handle WebSocket upgrades automatically.

Save: `Ctrl+X`, `Y`, `Enter`

Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable cloudflared-quick-tunnel
sudo systemctl start cloudflared-quick-tunnel
sudo systemctl status cloudflared-quick-tunnel
```

### Option B: Named Tunnel (Permanent URL - Recommended)

See `CLOUDFLARE_NAMED_TUNNEL_QUICK.md` for permanent URL setup.

---

## Step 3: Create Auto-Update Script

This script will automatically update your Supabase database with the tunnel URL on every boot.

```bash
# Create scripts directory
mkdir -p ~/scripts

# Create the update script
nano ~/scripts/update_tunnel_url.sh
```

Paste this (replace with your Supabase credentials):

```bash
#!/bin/bash

# Log file
LOG_FILE="/home/justin/scripts/update_tunnel_url.log"
echo "$(date): Starting tunnel URL update script" >> "$LOG_FILE"

# Wait for cloudflared to start and get URL
echo "$(date): Waiting for cloudflared to start..." >> "$LOG_FILE"
sleep 20

# Get the tunnel URL from cloudflared logs
# Try multiple methods to get the URL
TUNNEL_URL=""

# Method 1: Try quick tunnel service (most common)
if systemctl is-active --quiet cloudflared-quick-tunnel 2>/dev/null; then
    echo "$(date): Checking cloudflared-quick-tunnel logs..." >> "$LOG_FILE"
    TUNNEL_URL=$(sudo journalctl -u cloudflared-quick-tunnel -n 200 --no-pager 2>/dev/null | grep -oP 'https://[a-z0-9-]+\.trycloudflare\.com' | tail -1)
fi

# Method 2: Try named tunnel service
if [ -z "$TUNNEL_URL" ] && systemctl is-active --quiet cloudflared-tunnel 2>/dev/null; then
    echo "$(date): Checking cloudflared-tunnel logs..." >> "$LOG_FILE"
    TUNNEL_URL=$(sudo journalctl -u cloudflared-tunnel -n 200 --no-pager 2>/dev/null | grep -oP 'https://[a-z0-9-]+\.trycloudflare\.com' | tail -1)
fi

# Method 3: Check all cloudflared processes
if [ -z "$TUNNEL_URL" ]; then
    echo "$(date): Checking all cloudflared processes..." >> "$LOG_FILE"
    TUNNEL_URL=$(sudo journalctl -u cloudflared* -n 200 --no-pager 2>/dev/null | grep -oP 'https://[a-z0-9-]+\.trycloudflare\.com' | tail -1)
fi

# Method 4: Check if cloudflared is running as a process (not a service)
if [ -z "$TUNNEL_URL" ]; then
    echo "$(date): Checking cloudflared process output..." >> "$LOG_FILE"
    # Try to get URL from any cloudflared process
    TUNNEL_URL=$(ps aux | grep cloudflared | grep -oP 'https://[a-z0-9-]+\.trycloudflare\.com' | tail -1)
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
SUPABASE_SERVICE_KEY="YOUR_SERVICE_ROLE_KEY_HERE"  # Replace with your actual service role key!

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

**IMPORTANT:** Replace `YOUR_SERVICE_ROLE_KEY_HERE` with your actual Supabase service role key!

To get your service role key:
1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to **Settings** → **API**
4. Copy the **service_role** key (keep it secret!)

Make executable:
```bash
chmod +x ~/scripts/update_tunnel_url.sh
```

Test it manually:
```bash
~/scripts/update_tunnel_url.sh
```

Check the log:
```bash
cat ~/scripts/update_tunnel_url.log
```

---

## Step 4: Set Up Passwordless Sudo for journalctl

The script needs to read logs without a password:

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

Enable and test:
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

## Step 6: Verify Everything is Running

```bash
# Check Python server
sudo systemctl status pillpal-websocket

# Check Cloudflare tunnel
sudo systemctl status cloudflared-quick-tunnel

# Check auto-update service
sudo systemctl status update-tunnel-url

# View all services
systemctl list-units --type=service | grep -E "pillpal|cloudflared|update-tunnel"
```

All should show "active (running)" or "active (exited)" for oneshot services.

---

## Step 7: Test the Complete Setup

1. **Reboot your Pi:**
   ```bash
   sudo reboot
   ```

2. **After reboot, check services:**
   ```bash
   # Wait 30 seconds after boot, then check:
   sudo systemctl status pillpal-websocket
   sudo systemctl status cloudflared-quick-tunnel
   sudo systemctl status update-tunnel-url
   ```

3. **Check the tunnel URL:**
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

## Troubleshooting

### Python server not starting:
```bash
# Check logs
sudo journalctl -u pillpal-websocket -n 50

# Check if file exists
ls -la /home/justin/pillpal/pi_websocket_server_PCA9685.py

# Test manually
python3 /home/justin/pillpal/pi_websocket_server_PCA9685.py
```

### Cloudflare tunnel not starting:
```bash
# Check if cloudflared is installed
which cloudflared
cloudflared --version

# Check logs
sudo journalctl -u cloudflared-quick-tunnel -n 50

# Test manually (use http:// NOT ws://)
cloudflared tunnel --url http://localhost:8765
```

**Note:** Always use `http://localhost:8765` not `ws://localhost:8765` - Cloudflare Tunnel will handle WebSocket upgrades automatically.

### Auto-update script not working:
```bash
# Check service status
sudo systemctl status update-tunnel-url

# Check logs
sudo journalctl -u update-tunnel-url -n 50

# Check script log
cat ~/scripts/update_tunnel_url.log

# Test script manually
~/scripts/update_tunnel_url.sh
```

### Vercel app still shows offline:
1. Check Supabase database - is URL correct?
2. Check browser console (F12) for errors
3. Verify tunnel URL in database matches what's in logs
4. Make sure URL has no trailing slash
5. Try clearing browser cache

---

## Summary

After this setup:
- ✅ Python server starts automatically on boot
- ✅ Cloudflare tunnel starts automatically on boot
- ✅ Database updates automatically with tunnel URL
- ✅ Your Vercel app connects automatically!
- ✅ **No manual steps needed after boot!**

**Just boot your Pi and open your Vercel app - it will connect automatically!** 🎉

