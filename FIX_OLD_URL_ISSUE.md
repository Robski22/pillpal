# 🔧 Fix: App Using Old Tunnel URL

## Current Situation
- ✅ New tunnel service is running
- ❌ App still using old URL: `wss://location-oxide-surround-atlas.trycloudflare.com`
- ❌ Need to get NEW tunnel URL from service

---

## Step 1: Get NEW Tunnel URL from Service

On your Pi, run:

```bash
# Restart service to see the URL in logs
sudo systemctl restart cloudflared-tunnel

# Immediately view logs to see the URL
sudo journalctl -u cloudflared-tunnel -f
```

**Look for this line:**
```
Your quick Tunnel has been created! Visit it at: https://NEW-URL-HERE.trycloudflare.com
```

**Copy the NEW URL!** (It will be different from the old one)

Press `Ctrl+C` to exit the log viewer.

---

## Step 2: Update Database with NEW URL

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Run (use the NEW URL from Step 1, change `https` to `wss`):
```sql
UPDATE pi_connection_config
SET websocket_url = 'wss://NEW-TUNNEL-URL-HERE.trycloudflare.com',
    updated_at = NOW();
```

**Example:**
- If tunnel shows: `https://abc123-def456.trycloudflare.com`
- Use in database: `wss://abc123-def456.trycloudflare.com`

---

## Step 3: Update Vercel Environment Variable

1. Go to **Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**
2. Find `NEXT_PUBLIC_PI_WEBSOCKET_URL`
3. Update it to: `wss://NEW-TUNNEL-URL-HERE.trycloudflare.com`
4. **Redeploy** (Deployments → Redeploy)

---

## Step 4: Verify Update

1. Wait for Vercel to finish deploying
2. Open: `https://pillpal-drab.vercel.app/api/pi-url`
3. Should now show the NEW URL

---

## Step 5: Test Connection

1. Open: `https://pillpal-drab.vercel.app`
2. Refresh the page (hard refresh: `Ctrl+Shift+R`)
3. Click "Reconnect" button
4. Should show "✅ Connected to Raspberry Pi" (green)

---

## Why This Happened

The old URL (`location-oxide-surround-atlas`) was from a previous tunnel session. When you set up the service, it created a NEW tunnel with a NEW URL, but the database still has the old one.

---

## Quick Commands Summary

```bash
# On Pi - Get new tunnel URL
sudo systemctl restart cloudflared-tunnel
sudo journalctl -u cloudflared-tunnel -f
# Look for "Your quick Tunnel has been created! Visit it at: https://..."
```

Then update database and Vercel with the NEW URL!




