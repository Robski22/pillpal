# 🔍 How to Find Your Tunnel URL

## Method 1: Check Running Tunnel Process

If you have a tunnel running, you can find the URL by checking the process:

### For Cloudflare Tunnel:
```bash
# SSH into your Pi
ssh justin@192.168.100.220

# Check if cloudflared is running
ps aux | grep cloudflared

# Check the tunnel logs (if running in a screen/tmux session)
# Or check systemd logs
sudo journalctl -u cloudflared-tunnel -n 50
```

### For ngrok:
```bash
# Check if ngrok is running
ps aux | grep ngrok

# If ngrok web interface is enabled, check:
curl http://localhost:4040/api/tunnels
```

---

## Method 2: Check Database

The tunnel URL might already be stored in your database:

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Run this query:
```sql
SELECT * FROM pi_connection_config;
```

This will show you the current `websocket_url` if one is stored.

---

## Method 3: Check Environment Variables

If the tunnel URL was set as an environment variable:

1. Go to **Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**
2. Look for `NEXT_PUBLIC_PI_WEBSOCKET_URL`
3. Check its value

---

## Method 4: Start a New Tunnel and Get URL

If no tunnel is running, start one:

### Cloudflare (Easiest):
```bash
# On Pi
cloudflared tunnel --url ws://localhost:8766
```

This will immediately show you the tunnel URL in the output.

### ngrok:
```bash
# On Pi
ngrok http 8766
```

Check the ngrok web interface at `http://localhost:4040` or look at the terminal output.

---

## Method 5: Check Browser Console

1. Open your web app: https://pillpal-drab.vercel.app
2. Press **F12** to open Developer Tools
3. Go to **Console** tab
4. Look for connection attempts - it might show the URL it's trying to connect to
5. Look for messages like "Using WebSocket URL:" or connection errors that show the URL

---

## Quick Commands to Run on Pi

```bash
# Check all tunnel-related processes
ps aux | grep -E "cloudflared|ngrok|tunnel"

# Check if port 8766 is being forwarded
netstat -tuln | grep 8766

# Check systemd services
systemctl list-units | grep -E "cloudflared|ngrok|tunnel"

# Check recent logs
sudo journalctl -u cloudflared-tunnel --since "10 minutes ago"
```

---

## If You Can't Find It

If you can't find the tunnel URL, you'll need to:

1. **Start a new tunnel** (see Method 4 above)
2. **Copy the URL** it gives you
3. **Update the database** with that URL




