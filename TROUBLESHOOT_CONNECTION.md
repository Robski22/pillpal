# 🔍 Troubleshoot Pi Connection - Step by Step

## Current Status
- ✅ Tunnel URL found: `wss://references-thin-organisms-indirect.trycloudflare.com`
- ❌ App shows "Raspberry Pi offline"
- ❌ Can't connect

---

## Step 1: Verify Tunnel is Running on Pi

SSH into your Pi and check:

```bash
# Check if cloudflared tunnel is running
ps aux | grep cloudflared

# Should show something like:
# justin  XXXX  ... cloudflared tunnel --url http://localhost:8765
```

**If not running, start it:**
```bash
cloudflared tunnel --url http://localhost:8765
```

**Keep this terminal open!** The tunnel must stay running.

---

## Step 2: Verify Pi WebSocket Server is Running

```bash
# Check if Pi server is running
ps aux | grep pi_websocket_server

# Check if port 8765 is listening
netstat -tuln | grep 8765
# or
ss -tuln | grep 8765
```

**If not running, start it:**
```bash
cd ~/pillpal/pi-server  # or wherever your server is
python3 pi_websocket_server.py
```

---

## Step 3: Verify Database Has Correct URL

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Run:
```sql
SELECT * FROM pi_connection_config;
```

3. Verify `websocket_url` is: `wss://references-thin-organisms-indirect.trycloudflare.com`

**If empty or wrong, update it:**
```sql
-- Update all records
UPDATE pi_connection_config
SET websocket_url = 'wss://references-thin-organisms-indirect.trycloudflare.com',
    updated_at = NOW();
```

---

## Step 4: Verify Vercel Environment Variable

1. Go to **Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**
2. Check `NEXT_PUBLIC_PI_WEBSOCKET_URL`
3. Should be: `wss://references-thin-organisms-indirect.trycloudflare.com`

**If wrong, update it and redeploy.**

---

## Step 5: Test Tunnel Connection Locally

On your Pi, test if the tunnel is working:

```bash
# Test if tunnel is accessible
curl https://references-thin-organisms-indirect.trycloudflare.com

# Or test WebSocket connection
wscat -c wss://references-thin-organisms-indirect.trycloudflare.com
```

---

## Step 6: Check Browser Console for Errors

1. Open your web app: https://pillpal-drab.vercel.app
2. Press **F12** to open Developer Tools
3. Go to **Console** tab
4. Look for:
   - Connection errors
   - "Using WebSocket URL: ..."
   - "Connecting to Pi at: ..."
   - Any error messages

**Common errors:**
- `Failed to connect` - Tunnel not running or wrong URL
- `Connection refused` - Pi server not running
- `WebSocket closed` - Server closed connection
- `Timeout` - Network issue or tunnel down

---

## Step 7: Verify Tunnel URL is Still Valid

**Important:** Free Cloudflare tunnels get a NEW URL each time you restart!

If you restarted the tunnel, you need to:
1. Get the NEW tunnel URL
2. Update database
3. Update Vercel environment variable
4. Redeploy

---

## Step 8: Check Firewall

On your Pi:

```bash
# Check firewall status
sudo ufw status

# If firewall is active, allow port 8765
sudo ufw allow 8765
```

---

## Quick Diagnostic Commands

Run these on your Pi to check everything:

```bash
# 1. Check tunnel
ps aux | grep cloudflared

# 2. Check Pi server
ps aux | grep pi_websocket_server

# 3. Check ports
netstat -tuln | grep 8765

# 4. Test local connection
curl http://localhost:8765

# 5. Check tunnel logs (if using systemd)
sudo journalctl -u cloudflared-tunnel -n 50
```

---

## Common Issues & Solutions

### Issue: Tunnel not running
**Solution:** Start it: `cloudflared tunnel --url http://localhost:8765`

### Issue: Pi server not running
**Solution:** Start it: `python3 pi_websocket_server.py`

### Issue: Wrong tunnel URL in database
**Solution:** Update database with current tunnel URL

### Issue: Tunnel URL changed (restarted tunnel)
**Solution:** Get new URL, update database and Vercel

### Issue: Firewall blocking
**Solution:** `sudo ufw allow 8765`

### Issue: Port mismatch
**Solution:** Verify server is on 8765, tunnel points to 8765

---

## Test Connection Flow

1. ✅ Tunnel running on Pi
2. ✅ Pi server running on port 8765
3. ✅ Database has correct tunnel URL
4. ✅ Vercel has correct environment variable
5. ✅ Refresh web app
6. ✅ Click "Reconnect" button
7. ✅ Check browser console for errors

---

## Still Not Working?

1. **Check tunnel logs** for errors
2. **Check Pi server logs** for errors
3. **Check browser console** for connection errors
4. **Verify tunnel URL** is current (not expired)
5. **Try restarting** both tunnel and Pi server
6. **Check network** connectivity from Pi to internet




