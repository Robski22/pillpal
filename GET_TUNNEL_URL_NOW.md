# 🔍 Get Tunnel URL and Fix Connection

## Step 1: Get the Tunnel URL

Run this on your Pi to find the URL:

```bash
# View logs to find the tunnel URL
sudo journalctl -u cloudflared-tunnel --since "10 minutes ago" | grep -i "tunnel\|https\|trycloudflare\|created"
```

Or view all recent logs:

```bash
sudo journalctl -u cloudflared-tunnel -n 200
```

Look for a line like:
```
Your quick Tunnel has been created! Visit it at: https://xxxxx.trycloudflare.com
```

---

## Step 2: If URL Not in Logs

The URL might have been shown when the service first started. Try:

```bash
# View all logs since service was created
sudo journalctl -u cloudflared-tunnel --since today

# Or restart the service to see the URL
sudo systemctl restart cloudflared-tunnel
sudo journalctl -u cloudflared-tunnel -f
```

Press `Ctrl+C` after you see the URL.

---

## Step 3: Update Database

Once you have the URL (e.g., `https://abc123.trycloudflare.com`):

1. Go to **Supabase** → **SQL Editor**
2. Run (change `https` to `wss`):
```sql
UPDATE pi_connection_config
SET websocket_url = 'wss://TUNNEL-URL-HERE.trycloudflare.com',
    updated_at = NOW();
```

---

## Step 4: Update Vercel

1. Go to **Vercel** → Your Project → **Settings** → **Environment Variables**
2. Update `NEXT_PUBLIC_PI_WEBSOCKET_URL` to: `wss://TUNNEL-URL-HERE.trycloudflare.com`
3. **Redeploy** (Deployments → Redeploy)

---

## Step 5: Verify Pi Server is Running

```bash
# Check if Pi server is running
ps aux | grep pi_websocket_server

# Check if port 8766 is listening
netstat -tuln | grep 8766
```

---

## Quick Check: What URL is App Using?

1. Open: `https://pillpal-drab.vercel.app/api/pi-url`
2. This shows what URL the app is currently trying to use
3. Compare it to the tunnel URL from Step 1



