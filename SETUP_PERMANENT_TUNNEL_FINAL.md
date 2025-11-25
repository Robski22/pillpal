# 🔒 Set Up Permanent Tunnel (URL Never Changes!)

## Current Problem
- ❌ Cloudflare quick tunnel = **New URL every restart**
- ❌ Have to update database every time Pi reboots
- ❌ Not permanent

## Solution: ngrok with Permanent URL
- ✅ **Permanent URL** - Never changes, even after restart
- ✅ **Free account** gives permanent URL
- ✅ **Set once, forget it** - No more database updates needed!

---

## Step 1: Sign Up for ngrok (Free - 2 minutes)

1. Go to: https://dashboard.ngrok.com/signup
2. Sign up with email (free account is enough)
3. After signup, go to: https://dashboard.ngrok.com/get-started/your-authtoken
4. **Copy your authtoken** (looks like: `2abc123def456ghi789jkl012mno345pqr678`)

---

## Step 2: SSH into Your Pi

```bash
ssh justin@192.168.100.220
```

---

## Step 3: Install ngrok on Pi

```bash
# Install ngrok
curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null
echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | sudo tee /etc/apt/sources.list.d/ngrok.list
sudo apt update && sudo apt install ngrok
```

---

## Step 4: Add Your Auth Token

```bash
# Replace YOUR_AUTH_TOKEN_HERE with your actual token from Step 1
ngrok config add-authtoken YOUR_AUTH_TOKEN_HERE
```

---

## Step 5: Create Config File

```bash
# Create config directory
mkdir -p ~/.config/ngrok

# Create config file
nano ~/.config/ngrok/ngrok.yml
```

Paste this (replace `YOUR_AUTH_TOKEN_HERE` with your actual token):

```yaml
version: "2"
authtoken: YOUR_AUTH_TOKEN_HERE
tunnels:
  pillpal:
    proto: http
    addr: 8766
    inspect: false
```

Save: `Ctrl+X`, then `Y`, then `Enter`

---

## Step 6: Stop Old Cloudflare Tunnel (Optional)

If you want to switch from Cloudflare to ngrok:

```bash
# Stop Cloudflare tunnel service
sudo systemctl stop cloudflared-tunnel
sudo systemctl disable cloudflared-tunnel
```

---

## Step 7: Create ngrok Systemd Service

```bash
# Create service file
sudo nano /etc/systemd/system/ngrok-tunnel.service
```

Paste this:

```ini
[Unit]
Description=ngrok Tunnel for PillPal (Permanent URL)
After=network.target

[Service]
Type=simple
User=justin
ExecStart=/usr/bin/ngrok start pillpal
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

Save: `Ctrl+X`, then `Y`, then `Enter`

---

## Step 8: Enable and Start Service

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable service (starts on boot)
sudo systemctl enable ngrok-tunnel

# Start service now
sudo systemctl start ngrok-tunnel

# Check status
sudo systemctl status ngrok-tunnel
```

---

## Step 9: Get Your Permanent URL

Wait 10 seconds, then:

```bash
# Get the permanent URL
curl http://localhost:4040/api/tunnels 2>/dev/null | grep -o '"public_url":"[^"]*"' | head -1 | cut -d'"' -f4
```

**Or check logs:**
```bash
sudo journalctl -u ngrok-tunnel -n 50 | grep -i "forwarding\|url\|https://"
```

**Your permanent URL will be something like:**
- `https://pillpal-tunnel.ngrok-free.app` 
- or `https://xxxxx.ngrok-free.app`

**This URL NEVER changes!** ✅

---

## Step 10: Update Database (One Time Only!)

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Run this (use your permanent ngrok URL, change `https` to `wss`):
```sql
UPDATE pi_connection_config
SET websocket_url = 'wss://YOUR-PERMANENT-NGROK-URL.ngrok-free.app',
    updated_at = NOW();
```

**Example:**
```sql
UPDATE pi_connection_config
SET websocket_url = 'wss://pillpal-tunnel.ngrok-free.app',
    updated_at = NOW();
```

**Important:** 
- Use `wss://` (not `https://`) for WebSocket
- Remove `https://` and replace with `wss://`

---

## Step 11: Update Vercel (One Time Only!)

1. Go to **Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**
2. Update `NEXT_PUBLIC_PI_WEBSOCKET_URL` to: `wss://YOUR-PERMANENT-NGROK-URL.ngrok-free.app`
3. **Redeploy** (Deployments → Redeploy)

---

## ✅ Done! 

**After this setup:**
- ✅ Tunnel auto-starts on boot (no CMD needed)
- ✅ **Permanent URL that NEVER changes**
- ✅ Set once in database and Vercel
- ✅ **No more updates needed, even after Pi restart!**

---

## Verify Everything Works

```bash
# Check service is running
sudo systemctl status ngrok-tunnel

# Check Pi server is running
ps aux | grep pi_websocket_server
netstat -tuln | grep 8766

# Get permanent URL
curl http://localhost:4040/api/tunnels 2>/dev/null | grep -o '"public_url":"[^"]*"' | head -1
```

Then refresh your web app - it should connect!

---

## Service Management

```bash
# Start service
sudo systemctl start ngrok-tunnel

# Stop service
sudo systemctl stop ngrok-tunnel

# Restart service
sudo systemctl restart ngrok-tunnel

# Check status
sudo systemctl status ngrok-tunnel

# View logs
sudo journalctl -u ngrok-tunnel -f
```

---

## Troubleshooting

### Service won't start
```bash
# Check logs
sudo journalctl -u ngrok-tunnel -n 100

# Check if ngrok is installed
which ngrok

# Check config
cat ~/.config/ngrok/ngrok.yml
```

### Can't get URL
```bash
# Wait a bit longer (ngrok takes a few seconds to start)
sleep 10
curl http://localhost:4040/api/tunnels

# Or check logs
sudo journalctl -u ngrok-tunnel -n 100 | grep -i "forwarding"
```

---

## Summary

1. ✅ Sign up for ngrok (free) - Get authtoken
2. ✅ Install ngrok on Pi
3. ✅ Add authtoken
4. ✅ Create config file
5. ✅ Set up systemd service
6. ✅ Enable and start
7. ✅ Get permanent URL
8. ✅ Update database (one time)
9. ✅ Update Vercel (one time)
10. ✅ **Done! URL never changes again!** 🎉

**Your permanent URL:** `wss://xxxxx.ngrok-free.app` (set once, works forever!)



