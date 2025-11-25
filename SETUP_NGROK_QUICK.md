# 🚀 Quick Setup: ngrok Permanent Tunnel

## Step-by-Step Commands

### 1. Sign Up & Get Token
- Go to: https://dashboard.ngrok.com/signup
- Get authtoken from: https://dashboard.ngrok.com/get-started/your-authtoken

### 2. Install ngrok on Pi
```bash
curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null
echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | sudo tee /etc/apt/sources.list.d/ngrok.list
sudo apt update && sudo apt install ngrok
```

### 3. Add Auth Token
```bash
ngrok config add-authtoken YOUR_AUTH_TOKEN_HERE
```

### 4. Create Config File
```bash
mkdir -p ~/.config/ngrok
nano ~/.config/ngrok/ngrok.yml
```

Paste:
```yaml
version: "2"
authtoken: YOUR_AUTH_TOKEN_HERE
tunnels:
  pillpal:
    proto: http
    addr: 8766
    inspect: false
```

Save: `Ctrl+X`, `Y`, `Enter`

### 5. Create Service File
```bash
sudo nano /etc/systemd/system/ngrok-tunnel.service
```

Paste:
```ini
[Unit]
Description=ngrok Tunnel for PillPal
After=network.target

[Service]
Type=simple
User=justin
ExecStart=/usr/bin/ngrok start pillpal
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Save: `Ctrl+X`, `Y`, `Enter`

### 6. Enable & Start
```bash
sudo systemctl daemon-reload
sudo systemctl enable ngrok-tunnel
sudo systemctl start ngrok-tunnel
sudo systemctl status ngrok-tunnel
```

### 7. Get Permanent URL
```bash
# Wait 5 seconds, then get URL
sleep 5
curl http://localhost:4040/api/tunnels | grep -o '"public_url":"[^"]*"' | head -1
```

**Copy the URL!** (e.g., `https://pillpal-tunnel.ngrok-free.app`)

### 8. Update Database
```sql
UPDATE pi_connection_config
SET websocket_url = 'wss://YOUR-NGROK-URL-HERE.ngrok-free.app',
    updated_at = NOW();
```

### 9. Update Vercel
- Environment Variable: `NEXT_PUBLIC_PI_WEBSOCKET_URL` = `wss://YOUR-NGROK-URL-HERE.ngrok-free.app`
- Redeploy

---

## Done! ✅

- Tunnel auto-starts on boot
- Permanent URL that never changes
- No manual commands needed



