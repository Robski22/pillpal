# 🔍 Get Current Tunnel URL from Service

## The Issue
App is trying to connect to: `wss://corporate-perhaps-downloaded-commons.trycloudflare.com`
But this URL might be expired or the tunnel restarted.

---

## Step 1: Get Current Tunnel URL from Pi

On your Pi, run:

```bash
# View recent tunnel logs to get current URL
sudo journalctl -u cloudflared-tunnel -n 200 | grep -i "https.*trycloudflare"

# Or view all recent logs
sudo journalctl -u cloudflared-tunnel -n 200
```

Look for a line like:
```
Your quick Tunnel has been created! Visit it at: https://xxxxx.trycloudflare.com
```

**Or if the service just started, restart it to see the URL:**

```bash
# Restart service to see the URL
sudo systemctl restart cloudflared-tunnel

# Immediately view logs
sudo journalctl -u cloudflared-tunnel -f
```

Press `Ctrl+C` after you see the URL.

---

## Step 2: Update Database with Current URL

Once you have the current URL (e.g., `https://corporate-perhaps-downloaded-commons.trycloudflare.com`):

1. Go to **Supabase** → **SQL Editor**
2. Run (change `https` to `wss`):
```sql
UPDATE pi_connection_config
SET websocket_url = 'wss://CURRENT-TUNNEL-URL-HERE.trycloudflare.com',
    updated_at = NOW();
```

---

## Step 3: Update Vercel Environment Variable

1. Go to **Vercel** → Your Project → **Settings** → **Environment Variables**
2. Update `NEXT_PUBLIC_PI_WEBSOCKET_URL` to: `wss://CURRENT-TUNNEL-URL-HERE.trycloudflare.com`
3. **Redeploy** (Deployments → Redeploy)

---

## Step 4: Verify Tunnel is Running

```bash
# Check if service is running
sudo systemctl status cloudflared-tunnel

# Should show: active (running)
```

If not running:
```bash
sudo systemctl start cloudflared-tunnel
sudo systemctl enable cloudflared-tunnel
```

---

## Step 5: Verify Pi Server is Running

```bash
# Check if Pi server is running
ps aux | grep pi_websocket_server

# Check if port 8766 is listening
netstat -tuln | grep 8766
```

---

## Why URL Keeps Changing

Free Cloudflare tunnels get a NEW URL each time the service restarts. To prevent this:

1. **Keep service running** (don't restart unless necessary)
2. **Or set up a named tunnel** (requires Cloudflare account with domain)
3. **Or use ngrok** (gives permanent URL with free account)

---

## Quick Check Commands

```bash
# On Pi - Get current tunnel URL
sudo journalctl -u cloudflared-tunnel -n 200 | grep -i "https.*trycloudflare" | tail -1

# Check service status
sudo systemctl status cloudflared-tunnel

# Check Pi server
ps aux | grep pi_websocket_server
netstat -tuln | grep 8766
```



