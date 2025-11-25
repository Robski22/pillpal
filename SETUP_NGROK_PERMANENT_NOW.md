# 🚀 Set Up ngrok Permanent Tunnel (No More URL Changes!)

## Why ngrok?
- ✅ **Permanent URL** - Never changes, even after restart
- ✅ **Free account** gives permanent URL
- ✅ **Auto-starts on boot** - No CMD needed
- ✅ **Set once, forget it** - No need to update Vercel

---

## Step 1: Sign Up for ngrok (Free - 2 minutes)

1. Go to: https://dashboard.ngrok.com/signup
2. Sign up with email (free account)
3. After signup, go to: https://dashboard.ngrok.com/get-started/your-authtoken
4. **Copy your authtoken** (looks like: `2abc123def456ghi789jkl012mno345pqr678`)

---

## Step 2: Install ngrok on Pi

On your Pi, run:

```bash
# Install ngrok
curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null
echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | sudo tee /etc/apt/sources.list.d/ngrok.list
sudo apt update && sudo apt install ngrok
```

---

## Step 3: Add Auth Token

```bash
# Add your authtoken (replace with your actual token)
ngrok config add-authtoken YOUR_AUTH_TOKEN_HERE
```

---

## Step 4: Create Config File

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

## Step 5: Stop Old Cloudflare Service (Optional)

If you want to switch from Cloudflare to ngrok:

```bash
# Stop Cloudflare tunnel service
sudo systemctl stop cloudflared-tunnel
sudo systemctl disable cloudflared-tunnel
```

---

## Step 6: Create ngrok Systemd Service

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

## Step 7: Enable and Start Service

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

## Step 8: Get Your Permanent URL

Wait 5-10 seconds, then:

```bash
# Get the permanent URL
curl http://localhost:4040/api/tunnels | grep -o '"public_url":"[^"]*"' | head -1
```

**Or check logs:**
```bash
sudo journalctl -u ngrok-tunnel -n 50 | grep -i "forwarding\|url"
```

**Your permanent URL will be something like:**
`https://pillpal-tunnel.ngrok-free.app` or `https://xxxxx.ngrok-free.app`

**This URL NEVER changes!** ✅

---

## Step 9: Update Database (One Time Only!)

1. Go to **Supabase** → **SQL Editor**
2. Run (use your permanent ngrok URL, change `https` to `wss`):
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

---

## Step 10: Update Vercel (One Time Only!)

1. Go to **Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**
2. Update `NEXT_PUBLIC_PI_WEBSOCKET_URL` to: `wss://YOUR-PERMANENT-NGROK-URL.ngrok-free.app`
3. **Redeploy** (Deployments → Redeploy)

---

## ✅ Done! 

**After this setup:**
- ✅ Tunnel auto-starts on boot (no CMD needed)
- ✅ Permanent URL that NEVER changes
- ✅ Set once in database and Vercel
- ✅ No more updates needed!

---

## Verify Everything Works

```bash
# Check service is running
sudo systemctl status ngrok-tunnel

# Check Pi server is running
ps aux | grep pi_websocket_server
netstat -tuln | grep 8766

# Get permanent URL
curl http://localhost:4040/api/tunnels | grep -o '"public_url":"[^"]*"' | head -1
```

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

1. Sign up for ngrok (free) - Get authtoken
2. Install ngrok on Pi
3. Add authtoken
4. Create config file
5. Set up systemd service
6. Enable and start
7. Get permanent URL
8. Update database (one time)
9. Update Vercel (one time)
10. **Done! URL never changes again!** ✅




