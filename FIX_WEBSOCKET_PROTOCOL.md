# 🔧 WebSocket Protocol Explanation

## Protocol Difference

- **Cloudflare tunnel gives:** `https://xxxxx.trycloudflare.com`
- **WebSocket needs:** `wss://xxxxx.trycloudflare.com` (change `https` to `wss`)

**Why?**
- `https://` = HTTP Secure (for web pages)
- `wss://` = WebSocket Secure (for WebSocket connections)

Both use the same tunnel, just different protocols!

---

## Current Issue

The app is trying to connect to `wss://location-oxide-surround-atlas.trycloudflare.com` but failing.

**Possible reasons:**
1. ❌ Tunnel is not running on Pi
2. ❌ Tunnel URL expired (restarted = new URL)
3. ❌ Tunnel pointing to wrong port
4. ❌ Pi server not running

---

## Step 1: Check if Tunnel is Running

On your Pi, run:
```bash
ps aux | grep cloudflared
```

**If not running:**
```bash
# Start tunnel pointing to port 8766 (where your server is)
cloudflared tunnel --url http://localhost:8766
```

**Copy the NEW URL it shows!** (Free tunnels get new URL each restart)

---

## Step 2: Check What Port Tunnel is Pointing To

```bash
ps aux | grep cloudflared
```

Should show: `cloudflared tunnel --url http://localhost:8766`

**If it shows 8765, restart it:**
```bash
pkill cloudflared
cloudflared tunnel --url http://localhost:8766
```

---

## Step 3: Get Current Tunnel URL

When you start the tunnel, it shows:
```
Your quick Tunnel has been created! Visit it at:
https://NEW-URL-HERE.trycloudflare.com
```

**Copy this URL!**

---

## Step 4: Update Database with Current URL

1. Go to **Supabase** → **SQL Editor**
2. Run (use the URL from Step 3, change `https` to `wss`):
```sql
UPDATE pi_connection_config
SET websocket_url = 'wss://CURRENT-TUNNEL-URL-HERE.trycloudflare.com',
    updated_at = NOW();
```

**Example:**
- Tunnel shows: `https://abc123.trycloudflare.com`
- Use in database: `wss://abc123.trycloudflare.com`

---

## Step 5: Update Vercel Environment Variable

1. Go to **Vercel** → Your Project → **Settings** → **Environment Variables**
2. Update `NEXT_PUBLIC_PI_WEBSOCKET_URL` to: `wss://CURRENT-TUNNEL-URL-HERE.trycloudflare.com`
3. **Redeploy** (Deployments → Redeploy)

---

## Step 6: Verify Pi Server is Running

```bash
# Check if server is running
ps aux | grep pi_websocket_server

# Check if port 8766 is listening
netstat -tuln | grep 8766
```

---

## Summary

1. ✅ Tunnel running on Pi → port 8766
2. ✅ Pi server running on port 8766
3. ✅ Get current tunnel URL from tunnel output
4. ✅ Update database: `wss://CURRENT-URL.trycloudflare.com`
5. ✅ Update Vercel: `wss://CURRENT-URL.trycloudflare.com`
6. ✅ Redeploy Vercel
7. ✅ Test connection

---

## Why It's Failing

The URL `wss://location-oxide-surround-atlas.trycloudflare.com` is probably:
- ❌ Expired (tunnel was restarted, got new URL)
- ❌ Tunnel not running
- ❌ Tunnel pointing to wrong port

**Solution:** Get the CURRENT tunnel URL and update everything!



