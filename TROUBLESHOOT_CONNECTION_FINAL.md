# 🔍 Final Troubleshooting - Connection Still Not Working

## Step 1: Verify Database Has Correct URL

1. Go to **Supabase** → **SQL Editor**
2. Run:
```sql
SELECT * FROM pi_connection_config;
```

3. **Check `websocket_url` column:**
   - Should be: `wss://departure-fin-wallace-steady.trycloudflare.com`
   - If it's wrong or empty, update it:
   ```sql
   UPDATE pi_connection_config
   SET websocket_url = 'wss://departure-fin-wallace-steady.trycloudflare.com',
       updated_at = NOW();
   ```

---

## Step 2: Check What API Returns

1. Open in browser: `https://pillpal-drab.vercel.app/api/pi-url`
2. Should show: `{"url": "wss://departure-fin-wallace-steady.trycloudflare.com"}`
3. **If it shows old URL or empty:**
   - Database might not be updated
   - Vercel might not be redeployed
   - Wait a few minutes for cache to clear

---

## Step 3: Verify Vercel Deployment

1. Go to **Vercel Dashboard** → **Deployments**
2. Check if latest deployment is **Ready** (green checkmark)
3. **If still building, wait for it to finish**
4. **If failed, check error logs**

---

## Step 4: Verify Tunnel is Running

On your Pi, run:

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

## Step 5: Verify Pi Server is Running

On your Pi, run:

```bash
# Check if Pi server is running
ps aux | grep pi_websocket_server

# Check if port 8766 is listening
netstat -tuln | grep 8766
```

**Should show port 8766 is LISTENING**

**If not running, start it:**
```bash
# Find where your server is
find ~ -name "*pi_websocket_server*.py" 2>/dev/null

# Then start it (adjust path as needed)
python3 /home/justin/pillpal/pi_websocket_server_PCA9685.py
```

---

## Step 6: Test Tunnel Connection

On your Pi, test if tunnel is working:

```bash
# Test if tunnel is accessible
curl https://departure-fin-wallace-steady.trycloudflare.com

# Or test WebSocket connection
wscat -c wss://departure-fin-wallace-steady.trycloudflare.com
```

**If this fails, the tunnel might not be working correctly.**

---

## Step 7: Check Browser Console

1. Open: `https://pillpal-drab.vercel.app`
2. Press **F12** → **Console** tab
3. Look for:
   - Connection errors
   - "Using WebSocket URL: ..."
   - "Connecting to Pi at: ..."
   - Any red error messages

**Share the error messages you see!**

---

## Step 8: Verify Tunnel URL is Still Valid

Free Cloudflare tunnels get new URLs if the service restarts. Check:

```bash
# On Pi - Get current tunnel URL
sudo journalctl -u cloudflared-tunnel -n 100 | grep -i "https.*trycloudflare"
```

**If URL is different, update database and Vercel with the NEW URL!**

---

## Step 9: Clear Browser Cache

1. **Hard refresh:** `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
2. **Or clear cache:**
   - Press `F12` → **Application** tab → **Clear storage** → **Clear site data**
3. **Or try incognito/private window**

---

## Step 10: Check Firewall

On your Pi:

```bash
# Check firewall status
sudo ufw status

# If active, allow port 8766
sudo ufw allow 8766
```

---

## Common Issues

### Issue: API returns old URL
**Solution:** 
- Database not updated correctly
- Run SELECT query to verify
- Update database again
- Wait 1-2 minutes for cache

### Issue: API returns empty URL
**Solution:**
- Database record doesn't exist
- Use INSERT instead of UPDATE:
  ```sql
  INSERT INTO pi_connection_config (websocket_url, updated_at)
  VALUES ('wss://departure-fin-wallace-steady.trycloudflare.com', NOW())
  ON CONFLICT (id) DO UPDATE
  SET websocket_url = EXCLUDED.websocket_url,
      updated_at = EXCLUDED.updated_at;
  ```

### Issue: Tunnel not running
**Solution:**
```bash
sudo systemctl start cloudflared-tunnel
sudo systemctl status cloudflared-tunnel
```

### Issue: Pi server not running
**Solution:**
- Start the Pi WebSocket server
- Verify it's listening on port 8766

### Issue: Tunnel URL changed
**Solution:**
- Get new URL from logs
- Update database and Vercel
- Redeploy

---

## Quick Diagnostic Commands

Run these on your Pi:

```bash
# 1. Check tunnel service
sudo systemctl status cloudflared-tunnel

# 2. Check Pi server
ps aux | grep pi_websocket_server
netstat -tuln | grep 8766

# 3. Get current tunnel URL
sudo journalctl -u cloudflared-tunnel -n 200 | grep -i "https.*trycloudflare" | tail -1

# 4. Test tunnel
curl https://departure-fin-wallace-steady.trycloudflare.com
```

---

## What to Share

Please share:
1. What does `/api/pi-url` return?
2. What errors are in browser console (F12)?
3. Is tunnel service running? (`sudo systemctl status cloudflared-tunnel`)
4. Is Pi server running? (`ps aux | grep pi_websocket_server`)
5. What does database show? (`SELECT * FROM pi_connection_config;`)

This will help identify the exact issue!




