# 🔧 Fix Raspberry Pi Connection

## Problem
The web app is trying to connect to: `wss://sound-utc-screensaver-pac.trycloudflare.com`
But this tunnel URL is **not working** (connection fails).

## Solution: Get Current Tunnel URL from Pi

### Step 1: SSH into Your Pi
```bash
ssh justin@192.168.100.220
```

### Step 2: Check if Tunnel is Running
```bash
# Check Cloudflare tunnel service
sudo systemctl status cloudflared-tunnel

# Or check if it's running manually
ps aux | grep cloudflared
```

### Step 3: Get Current Tunnel URL

**If using Cloudflare:**
```bash
# Check service logs for the URL
sudo journalctl -u cloudflared-tunnel -n 100 | grep -i "trycloudflare\|https://"
```

**Or if running manually:**
```bash
# The URL is shown when you start cloudflared
cloudflared tunnel --url http://localhost:8766
```

### Step 4: Update Database with Correct URL

Once you have the current tunnel URL (e.g., `wss://new-url.trycloudflare.com`):

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Run this (replace with your actual URL):
```sql
UPDATE pi_connection_config
SET websocket_url = 'wss://YOUR-NEW-TUNNEL-URL.trycloudflare.com',
    updated_at = NOW();
```

**Important:** Change `https://` to `wss://` in the URL!

### Step 5: Refresh Web App

1. Hard refresh browser: `Ctrl + Shift + R`
2. Check console - should connect to new URL

---

## Alternative: Restart Tunnel to Get New URL

If tunnel is running but URL is old:

```bash
# On Pi - restart tunnel service
sudo systemctl restart cloudflared-tunnel

# Wait 10 seconds, then get new URL
sudo journalctl -u cloudflared-tunnel -n 50 | grep -i "trycloudflare"
```

Then update database with the new URL.

---

## Quick Check: Is Tunnel Running?

```bash
# On Pi
sudo systemctl status cloudflared-tunnel
```

If it says "active (running)" - tunnel is running, just need correct URL.
If it says "inactive" - tunnel is not running, need to start it.




