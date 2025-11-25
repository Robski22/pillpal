# 🔧 Set Up Permanent Cloudflare Tunnel (Auto-Start Service)

## Goal
Create a permanent tunnel that:
- ✅ Runs automatically on boot
- ✅ Keeps running in background
- ✅ Has a permanent URL (doesn't change)
- ✅ No need to run in terminal

---

## Step 1: Create Named Tunnel (Permanent URL)

On your Pi, run:

```bash
# Create a named tunnel (gives permanent URL)
cloudflared tunnel create pillpal-tunnel
```

This will create a tunnel named "pillpal-tunnel" and show you a tunnel ID.

**Save the tunnel ID!** (looks like: `xxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)

---

## Step 2: Create Tunnel Configuration

```bash
# Create config directory
mkdir -p ~/.cloudflared

# Create config file
nano ~/.cloudflared/config.yml
```

Add this content (replace `YOUR_TUNNEL_ID` with the ID from Step 1):

```yaml
tunnel: YOUR_TUNNEL_ID
credentials-file: /home/justin/.cloudflared/YOUR_TUNNEL_ID.json

ingress:
  - hostname: pillpal-ws.yourdomain.com
    service: http://localhost:8766
  - service: http_status:404
```

**Note:** For free Cloudflare accounts, you can't use custom hostnames. Use this instead:

```yaml
tunnel: YOUR_TUNNEL_ID
credentials-file: /home/justin/.cloudflared/YOUR_TUNNEL_ID.json

ingress:
  - service: http://localhost:8766
```

Save and exit: `Ctrl+X`, then `Y`, then `Enter`

---

## Step 3: Set Up as Systemd Service

```bash
# Install cloudflared as a service
sudo cloudflared service install
```

This creates a systemd service that runs automatically.

---

## Step 4: Start the Service

```bash
# Start the service
sudo systemctl start cloudflared

# Enable it to start on boot
sudo systemctl enable cloudflared

# Check status
sudo systemctl status cloudflared
```

---

## Step 5: Get the Permanent URL

For named tunnels, you need to create a route. But for free accounts, you can use:

```bash
# Check the service logs to see the URL
sudo journalctl -u cloudflared -n 50
```

Or use the quick tunnel method but make it permanent:

---

## Alternative: Quick Tunnel as Service (Easier)

If named tunnels are too complex, set up quick tunnel as a service:

### Step 1: Create Service File

```bash
sudo nano /etc/systemd/system/cloudflared-tunnel.service
```

Add this content:

```ini
[Unit]
Description=Cloudflare Tunnel for PillPal
After=network.target

[Service]
Type=simple
User=justin
ExecStart=/usr/local/bin/cloudflared tunnel --url http://localhost:8766
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

Save: `Ctrl+X`, then `Y`, then `Enter`

### Step 2: Enable and Start Service

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable service (starts on boot)
sudo systemctl enable cloudflared-tunnel

# Start service
sudo systemctl start cloudflared-tunnel

# Check status
sudo systemctl status cloudflared-tunnel
```

### Step 3: Get the Tunnel URL

```bash
# View service logs to see the URL
sudo journalctl -u cloudflared-tunnel -n 100 | grep -i "tunnel\|url\|https"
```

Look for a line like:
```
Your quick Tunnel has been created! Visit it at: https://xxxxx.trycloudflare.com
```

**Copy this URL!** (It will stay the same as long as the service keeps running)

---

## Step 6: Update Database with Permanent URL

1. Go to **Supabase** → **SQL Editor**
2. Run (use the URL from Step 3, change `https` to `wss`):
```sql
UPDATE pi_connection_config
SET websocket_url = 'wss://TUNNEL-URL-HERE.trycloudflare.com',
    updated_at = NOW();
```

---

## Step 7: Update Vercel Environment Variable

1. Go to **Vercel** → Your Project → **Settings** → **Environment Variables**
2. Update `NEXT_PUBLIC_PI_WEBSOCKET_URL` to: `wss://TUNNEL-URL-HERE.trycloudflare.com`
3. **Redeploy**

---

## Verify Service is Running

```bash
# Check if service is running
sudo systemctl status cloudflared-tunnel

# Check if tunnel process is running
ps aux | grep cloudflared

# View recent logs
sudo journalctl -u cloudflared-tunnel -n 50
```

---

## Service Management Commands

```bash
# Start service
sudo systemctl start cloudflared-tunnel

# Stop service
sudo systemctl stop cloudflared-tunnel

# Restart service
sudo systemctl restart cloudflared-tunnel

# Check status
sudo systemctl status cloudflared-tunnel

# View logs
sudo journalctl -u cloudflared-tunnel -f
```

---

## Important Notes

1. **Quick tunnels get new URLs if service restarts** - The URL might change if the service restarts, but it will stay the same as long as it keeps running.

2. **For truly permanent URL** - You need a Cloudflare account with a domain, or use ngrok with a paid plan.

3. **Service auto-starts on boot** - Once set up, the tunnel will start automatically when Pi reboots.

4. **Check logs if connection fails** - Use `sudo journalctl -u cloudflared-tunnel -n 100` to see what's happening.

---

## Troubleshooting

### Service won't start
```bash
# Check logs
sudo journalctl -u cloudflared-tunnel -n 100

# Check if cloudflared is in correct location
which cloudflared
# Should show: /usr/local/bin/cloudflared
```

### URL changed after restart
- Quick tunnels get new URLs if the process fully restarts
- Check logs to get the new URL
- Update database and Vercel with new URL

### Service keeps restarting
- Check logs for errors
- Verify Pi server is running on port 8766
- Check firewall settings

---

## Recommended: Use ngrok for Permanent URL

If you want a truly permanent URL that never changes:

1. Sign up for free ngrok account: https://dashboard.ngrok.com
2. Get auth token
3. Set up ngrok as service (similar process)
4. ngrok free gives you a permanent URL like: `https://xxxxx.ngrok-free.app`

Would you like me to create a guide for ngrok setup instead?



