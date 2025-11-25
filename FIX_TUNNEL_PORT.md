# 🔧 Fix Tunnel Port and Protocol

## Problem Found
Your tunnel is running but pointing to:
- ❌ Wrong port: `8765` (should be `8766`)
- ❌ Wrong protocol: `http://` (should be `ws://` for WebSocket)

## Solution: Restart Tunnel with Correct Settings

### Step 1: Stop the Current Tunnel

On your Pi, run:
```bash
# Find and kill the cloudflared process
pkill cloudflared

# Verify it's stopped
ps aux | grep cloudflared
```

### Step 2: Start Tunnel with Correct Settings

```bash
# Start tunnel with correct port (8766) and protocol (ws://)
cloudflared tunnel --url ws://localhost:8766
```

**Important:** 
- Use `ws://` (WebSocket protocol), not `http://`
- Use port `8766`, not `8765`

### Step 3: Copy the New Tunnel URL

The tunnel will show a new URL like:
```
+--------------------------------------------------------------------------------------------+
|  Your quick Tunnel has created!                                                           |
+--------------------------------------------------------------------------------------------+
|  Visit the following URL to access your tunnel:                                            |
+  https://NEW-URL-HERE.trycloudflare.com                                                     |
+--------------------------------------------------------------------------------------------+
```

**⚠️ Note:** Free Cloudflare tunnels get a NEW URL each time you restart!

### Step 4: Update Database with New URL

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Run (replace with your NEW tunnel URL):
```sql
UPDATE pi_connection_config
SET websocket_url = 'wss://NEW-TUNNEL-URL-HERE.trycloudflare.com',
    updated_at = NOW()
WHERE id = 1;
```

### Step 5: Update Vercel Environment Variable

1. Go to **Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**
2. Find `NEXT_PUBLIC_PI_WEBSOCKET_URL`
3. Update it with the NEW tunnel URL (change `https://` to `wss://`)
4. **Redeploy** your app (or wait for auto-deploy)

### Step 6: Test Connection

1. Refresh your web app
2. Click "Reconnect" button
3. Should show "✅ Connected to Raspberry Pi" (green)

---

## Keep Tunnel Running

To keep it running after SSH disconnects:

```bash
# Use screen
screen -S tunnel
cloudflared tunnel --url ws://localhost:8766
# Press Ctrl+A, then D to detach

# Or use nohup
nohup cloudflared tunnel --url ws://localhost:8766 > tunnel.log 2>&1 &
```

---

## Verify Pi Server is on Port 8766

Before starting the tunnel, make sure your Pi WebSocket server is running on port 8766:

```bash
# Check if server is running
ps aux | grep pi_websocket_server

# Check what port it's listening on
netstat -tuln | grep 8766
# or
ss -tuln | grep 8766
```

If your server is actually on port 8765, you have two options:
1. Change the server to use port 8766 (recommended)
2. Keep tunnel pointing to 8765, but update your app configuration



