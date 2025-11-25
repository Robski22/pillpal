# ✅ Final Setup: Use Permanent Tunnel URL

## Permanent Tunnel URL
**`wss://departure-fin-wallace-steady.trycloudflare.com`**

---

## Step 1: Update Database

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Run:
```sql
UPDATE pi_connection_config
SET websocket_url = 'wss://departure-fin-wallace-steady.trycloudflare.com',
    updated_at = NOW();
```

3. Verify:
```sql
SELECT * FROM pi_connection_config;
```

Should show: `wss://departure-fin-wallace-steady.trycloudflare.com`

---

## Step 2: Update Vercel Environment Variable

1. Go to **Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**
2. Find `NEXT_PUBLIC_PI_WEBSOCKET_URL`
3. Update it to: `wss://departure-fin-wallace-steady.trycloudflare.com`
4. Make sure it's set for **Production** environment
5. **Redeploy** (Deployments → Redeploy)

---

## Step 3: Verify Tunnel is Running on Pi

On your Pi, check:

```bash
# Check if service is running
sudo systemctl status cloudflared-tunnel

# Should show: active (running)
```

**If not running:**
```bash
sudo systemctl start cloudflared-tunnel
sudo systemctl enable cloudflared-tunnel
```

---

## Step 4: Verify Pi Server is Running

```bash
# Check if Pi server is running
ps aux | grep pi_websocket_server

# Check if port 8766 is listening
netstat -tuln | grep 8766
```

**Should show port 8766 is LISTENING**

---

## Step 5: Wait for Vercel to Deploy

1. Check Vercel → Deployments
2. Wait for latest deployment to be **Ready** (green checkmark)
3. Usually takes 1-2 minutes

---

## Step 6: Test Connection

1. Open: `https://pillpal-drab.vercel.app/api/pi-url`
2. Should return: `{"url": "wss://departure-fin-wallace-steady.trycloudflare.com"}`
3. Open: `https://pillpal-drab.vercel.app`
4. Hard refresh: `Ctrl+Shift+R`
5. Click "Reconnect" button
6. Should show: **"✅ Connected to Raspberry Pi"** (green)

---

## Step 7: Verify Everything is Correct

### Check API Endpoint:
```
https://pillpal-drab.vercel.app/api/pi-url
```
Should return the permanent URL.

### Check Browser Console:
1. Press F12 → Console
2. Should see: "Using WebSocket URL: wss://departure-fin-wallace-steady.trycloudflare.com"
3. Should see: "✅ Connected to Pi!" (not connection errors)

---

## Troubleshooting

### If API still shows old URL:
- Wait 2-3 minutes for cache to clear
- Hard refresh browser: `Ctrl+Shift+R`
- Check Vercel deployment is complete

### If connection still fails:
1. **Check tunnel is running:**
   ```bash
   sudo systemctl status cloudflared-tunnel
   ```

2. **Check Pi server is running:**
   ```bash
   ps aux | grep pi_websocket_server
   netstat -tuln | grep 8766
   ```

3. **Check tunnel URL in logs:**
   ```bash
   sudo journalctl -u cloudflared-tunnel -n 100 | grep -i "https.*trycloudflare"
   ```
   Should show: `departure-fin-wallace-steady.trycloudflare.com`

---

## Summary

- ✅ Permanent URL: `wss://departure-fin-wallace-steady.trycloudflare.com`
- ✅ Update database
- ✅ Update Vercel environment variable
- ✅ Redeploy Vercel
- ✅ Verify tunnel and Pi server running
- ✅ Test connection

After completing these steps, your app should connect successfully!




