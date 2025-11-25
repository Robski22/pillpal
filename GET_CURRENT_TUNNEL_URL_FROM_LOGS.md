# 🔍 Get Current Tunnel URL from Service Logs

## Issue
Tunnel service is running, but the URL `departure-fin-wallace-steady.trycloudflare.com` doesn't resolve.
This means the tunnel got a NEW URL when it restarted.

---

## Step 1: Get Current Tunnel URL

On your Pi, run:

```bash
# View all logs since service started to find the URL
sudo journalctl -u cloudflared-tunnel --since "30 minutes ago" | grep -i "tunnel\|https\|trycloudflare\|created"
```

Or view all recent logs:

```bash
sudo journalctl -u cloudflared-tunnel -n 300
```

**Look for a line like:**
```
Your quick Tunnel has been created! Visit it at: https://NEW-URL-HERE.trycloudflare.com
```

---

## Step 2: If URL Not in Logs, Restart to See It

```bash
# Restart service to see the URL
sudo systemctl restart cloudflared-tunnel

# Immediately view logs
sudo journalctl -u cloudflared-tunnel -f
```

**Look for:**
```
Your quick Tunnel has been created! Visit it at: https://xxxxx.trycloudflare.com
```

Press `Ctrl+C` to exit.

---

## Step 3: Update Database with NEW URL

Once you have the current URL (e.g., `https://abc123.trycloudflare.com`):

1. Go to **Supabase** → **SQL Editor**
2. Run (change `https` to `wss`):
```sql
UPDATE pi_connection_config
SET websocket_url = 'wss://NEW-TUNNEL-URL-HERE.trycloudflare.com',
    updated_at = NOW();
```

---

## Step 4: Update Vercel Environment Variable

1. Go to **Vercel** → Your Project → **Settings** → **Environment Variables**
2. Update `NEXT_PUBLIC_PI_WEBSOCKET_URL` to: `wss://NEW-TUNNEL-URL-HERE.trycloudflare.com`
3. **Redeploy** (Deployments → Redeploy)

---

## Why This Happened

Free Cloudflare tunnels get a **NEW URL each time the service restarts**. The service was restarted at `20:14:10`, so it got a new URL, but we're still using the old one.

---

## Quick Command to Get URL

```bash
# Get the tunnel URL from logs
sudo journalctl -u cloudflared-tunnel --since "30 minutes ago" | grep -i "https.*trycloudflare" | head -1
```

Or restart and capture:

```bash
sudo systemctl restart cloudflared-tunnel && sleep 3 && sudo journalctl -u cloudflared-tunnel -n 50 | grep -i "https.*trycloudflare"
```



