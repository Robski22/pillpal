# ✅ Verify Pi Connection

## Tunnel URL Found
**URL:** `wss://threatening-tires-premiere-bloomberg.trycloudflare.com`

---

## Step 1: Update Database (Optional but Recommended)

Since the URL is already in Vercel environment variables, the app should work. But let's also store it in the database as a backup:

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Run this query:

```sql
UPDATE pi_connection_config
SET websocket_url = 'wss://threatening-tires-premiere-bloomberg.trycloudflare.com',
    updated_at = NOW()
WHERE id = 1;
```

Or if the table doesn't exist or is empty:

```sql
INSERT INTO pi_connection_config (websocket_url, updated_at)
VALUES ('wss://threatening-tires-premiere-bloomberg.trycloudflare.com', NOW())
ON CONFLICT (id) DO UPDATE
SET websocket_url = EXCLUDED.websocket_url,
    updated_at = NOW();
```

---

## Step 2: Verify Tunnel is Running on Pi

SSH into your Pi and check:

```bash
# Check if cloudflared tunnel is running
ps aux | grep cloudflared

# Should show a process with the tunnel URL
```

If it's not running, start it:

```bash
cloudflared tunnel --url ws://localhost:8766
```

**Keep this terminal open!** The tunnel must stay running.

---

## Step 3: Verify Pi Server is Running

```bash
# Check if Pi WebSocket server is running
ps aux | grep pi_websocket_server

# Check if port 8766 is listening
netstat -tuln | grep 8766
```

If not running, start it:

```bash
cd ~/pillpal/pi-server  # or wherever your server is
python3 pi_websocket_server.py
```

---

## Step 4: Test Connection

1. **Open your web app:** https://pillpal-drab.vercel.app
2. **Refresh the page** (F5)
3. **Click "Reconnect" button** if it shows offline
4. **Check status:**
   - ✅ Should show: **"✅ Connected to Raspberry Pi"** (green)
   - ❌ If still offline, check browser console (F12) for errors

---

## Step 5: Check Browser Console

1. Press **F12** to open Developer Tools
2. Go to **Console** tab
3. Look for:
   - ✅ "Using WebSocket URL: wss://threatening-tires-premiere-bloomberg.trycloudflare.com"
   - ✅ "🔌 Connecting to Pi at: wss://..."
   - ✅ "✅ Connected to Pi!"
   - ❌ Any connection errors

---

## Troubleshooting

### If Still Offline:

1. **Check tunnel is running:**
   ```bash
   # On Pi
   ps aux | grep cloudflared
   ```

2. **Check Pi server is running:**
   ```bash
   # On Pi
   ps aux | grep pi_websocket_server
   ```

3. **Restart tunnel:**
   ```bash
   # On Pi - stop old tunnel, start new one
   pkill cloudflared
   cloudflared tunnel --url ws://localhost:8766
   ```
   **Note:** Cloudflare free tunnels get a new URL each time! If you restart, you'll need to update the URL again.

4. **Check firewall:**
   ```bash
   # On Pi
   sudo ufw status
   ```

5. **Test tunnel locally:**
   ```bash
   # On Pi - test if tunnel works
   curl http://localhost:8766
   ```

---

## ✅ Success Checklist

- [ ] Tunnel URL found: `wss://threatening-tires-premiere-bloomberg.trycloudflare.com`
- [ ] Database updated with tunnel URL
- [ ] Cloudflare tunnel running on Pi
- [ ] Pi WebSocket server running on port 8766
- [ ] Web app shows "Connected to Raspberry Pi" (green)
- [ ] Browser console shows successful connection

---

## 🔄 Keep Tunnel Running

To keep the tunnel running after SSH disconnects, use `screen` or `tmux`:

```bash
# Install screen (if not installed)
sudo apt install screen

# Start screen session
screen -S tunnel

# Start tunnel
cloudflared tunnel --url ws://localhost:8766

# Detach: Press Ctrl+A, then D
# Reattach: screen -r tunnel
```

Or create a systemd service (see SETUP_PI_CONNECTION_GUIDE.md for details).



