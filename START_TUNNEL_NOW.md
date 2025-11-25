# 🚀 Start Cloudflare Tunnel - Quick Fix

## Current Issue
- ✅ Python WebSocket server is running
- ❌ Cloudflare tunnel is NOT running
- Result: Can't connect from internet

## Quick Fix: Start Tunnel Manually

**On your Raspberry Pi, run:**

```bash
# Start the tunnel (this will give you a public URL)
# IMPORTANT: Use http:// NOT ws:// - Cloudflare Tunnel doesn't support ws:// directly
cloudflared tunnel --url http://localhost:8765
```

**You'll see output like:**
```
+--------------------------------------------------------------------------------------------+
|  Your quick Tunnel has created!                                                           |
+--------------------------------------------------------------------------------------------+
|  Visit the following URL to access your tunnel:                                            |
+  https://asthma-projected-cylinder-kong.trycloudflare.com                                 |
+--------------------------------------------------------------------------------------------+
```

**⚠️ IMPORTANT:** 
- **Keep this terminal open!** Don't close it.
- The tunnel will stop if you close the terminal.

---

## Better Solution: Run Tunnel as a Service (Auto-start on boot)

### Step 1: Create Service File

```bash
sudo nano /etc/systemd/system/cloudflared-quick-tunnel.service
```

Paste this:

```ini
[Unit]
Description=Cloudflare Quick Tunnel for PillPal WebSocket
After=network.target

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

Save: `Ctrl+X`, `Y`, `Enter`

### Step 2: Enable and Start Service

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable to start on boot
sudo systemctl enable cloudflared-quick-tunnel

# Start the service now
sudo systemctl start cloudflared-quick-tunnel

# Check status
sudo systemctl status cloudflared-quick-tunnel
```

### Step 3: Get the Tunnel URL

```bash
# View the logs to see the tunnel URL
sudo journalctl -u cloudflared-quick-tunnel -n 50 | grep -i "trycloudflare"
```

Or check the full logs:
```bash
sudo journalctl -u cloudflared-quick-tunnel -f
```

Look for a line like:
```
https://xxxxx-xxxxx.trycloudflare.com
```

### Step 4: Update Database with Tunnel URL

1. **Get the tunnel URL** from the logs (e.g., `https://asthma-projected-cylinder-kong.trycloudflare.com`)

2. **Convert to WebSocket URL**: Change `https://` to `wss://` and remove trailing slash
   - Example: `https://asthma-projected-cylinder-kong.trycloudflare.com` → `wss://asthma-projected-cylinder-kong.trycloudflare.com`

3. **Update Supabase:**
   ```sql
   UPDATE pi_connection_config 
   SET websocket_url = 'wss://asthma-projected-cylinder-kong.trycloudflare.com',
       updated_at = NOW();
   ```

---

## Verify Everything is Running

```bash
# Check Python server
ps aux | grep pi_websocket_server

# Check Cloudflare tunnel service
sudo systemctl status cloudflared-quick-tunnel

# View tunnel logs
sudo journalctl -u cloudflared-quick-tunnel -n 20
```

---

## After Starting Tunnel

1. **Refresh your localhost page** (http://localhost:3000)
2. **Check browser console** (F12) - should see connection attempts
3. **The yellow banner should change to green** when connected!

---

## Troubleshooting

### If service fails to start:
```bash
# Check if cloudflared is installed
which cloudflared
cloudflared --version

# If not installed:
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm
chmod +x cloudflared-linux-arm
sudo mv cloudflared-linux-arm /usr/local/bin/cloudflared
```

### If tunnel URL changes:
- Quick tunnels get new URLs when restarted
- Update the database with the new URL
- Consider setting up a named tunnel for a permanent URL (see `CLOUDFLARE_NAMED_TUNNEL_QUICK.md`)

### Check if tunnel is working:
```bash
# Test local connection
curl http://localhost:8765

# Check tunnel is forwarding
sudo journalctl -u cloudflared-quick-tunnel | grep -i "connected\|ready"
```

