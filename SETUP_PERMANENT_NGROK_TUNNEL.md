# 🔧 Set Up Permanent ngrok Tunnel (Auto-Start on Boot)

## Why ngrok?
- ✅ **Permanent URL** - Doesn't change when service restarts
- ✅ **Free account** gives you a permanent URL
- ✅ **Auto-start on boot** - Set up as systemd service
- ✅ **No manual commands needed**

---

## Step 1: Sign Up for ngrok (Free)

1. Go to: https://dashboard.ngrok.com/signup
2. Sign up for a free account
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

## Step 3: Configure ngrok with Auth Token

```bash
# Add your authtoken (replace with your actual token)
ngrok config add-authtoken YOUR_AUTH_TOKEN_HERE
```

---

## Step 4: Create Named Tunnel (Permanent URL)

```bash
# Create a named tunnel (gives permanent URL)
ngrok tunnel --name pillpal-tunnel http://localhost:8766
```

**This will show you a permanent URL like:**
```
Forwarding   https://pillpal-tunnel.ngrok-free.app -> http://localhost:8766
```

**Copy this URL!** This is your permanent URL that won't change.

Press `Ctrl+C` to stop it (we'll set it up as a service next).

---

## Step 5: Create Systemd Service for Auto-Start

```bash
# Create service file
sudo nano /etc/systemd/system/ngrok-tunnel.service
```

Paste this content (replace `YOUR_AUTH_TOKEN` with your actual token):

```ini
[Unit]
Description=ngrok Tunnel for PillPal
After=network.target

[Service]
Type=simple
User=justin
ExecStart=/usr/bin/ngrok tunnel --name pillpal-tunnel http://localhost:8766
Restart=always
RestartSec=10
Environment="NGROK_AUTHTOKEN=YOUR_AUTH_TOKEN_HERE"

[Install]
WantedBy=multi-user.target
```

Save: `Ctrl+X`, then `Y`, then `Enter`

---

## Step 6: Enable and Start Service

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

## Step 7: Get Your Permanent URL

```bash
# View service logs to see the URL
sudo journalctl -u ngrok-tunnel -n 50

# Or check ngrok web interface
curl http://localhost:4040/api/tunnels
```

**Your permanent URL will be:** `https://pillpal-tunnel.ngrok-free.app` (or similar)

---

## Step 8: Update Database and Vercel

1. **Update Database:**
   ```sql
   UPDATE pi_connection_config
   SET websocket_url = 'wss://pillpal-tunnel.ngrok-free.app',
       updated_at = NOW();
   ```
   (Change `https` to `wss`)

2. **Update Vercel Environment Variable:**
   - `NEXT_PUBLIC_PI_WEBSOCKET_URL` = `wss://pillpal-tunnel.ngrok-free.app`
   - Redeploy

---

## Alternative: Use ngrok Config File (More Reliable)

Instead of command line, use a config file:

```bash
# Create config directory
mkdir -p ~/.config/ngrok

# Create config file
nano ~/.config/ngrok/ngrok.yml
```

Add this content:

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

Then update the service file:

```bash
sudo nano /etc/systemd/system/ngrok-tunnel.service
```

Change `ExecStart` to:
```
ExecStart=/usr/bin/ngrok start pillpal
```

Then:
```bash
sudo systemctl daemon-reload
sudo systemctl restart ngrok-tunnel
sudo systemctl status ngrok-tunnel
```

---

## Verify Everything Works

```bash
# Check service is running
sudo systemctl status ngrok-tunnel

# Check Pi server is running
ps aux | grep pi_websocket_server
netstat -tuln | grep 8766

# Get tunnel URL
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

## Benefits

- ✅ **Permanent URL** - Never changes, even after restart
- ✅ **Auto-starts on boot** - No manual commands needed
- ✅ **Free** - ngrok free account is sufficient
- ✅ **Reliable** - Service auto-restarts if it crashes

---

## Troubleshooting

### Service won't start
```bash
# Check logs
sudo journalctl -u ngrok-tunnel -n 100

# Check if ngrok is installed
which ngrok

# Check if authtoken is set
ngrok config check
```

### URL not showing
```bash
# Check ngrok web interface
curl http://localhost:4040/api/tunnels

# Or check logs
sudo journalctl -u ngrok-tunnel -n 100 | grep -i "forwarding\|url"
```

---

## Summary

1. Sign up for ngrok (free)
2. Install ngrok on Pi
3. Add authtoken
4. Create named tunnel
5. Set up systemd service
6. Enable auto-start
7. Get permanent URL
8. Update database and Vercel

After this, your tunnel will:
- ✅ Start automatically on boot
- ✅ Have a permanent URL that never changes
- ✅ Run in background (no CMD needed)




