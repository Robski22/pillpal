# 🔄 Restore Permanent Cloudflare Tunnel (Named Tunnel)

## Current Problem
You're using a **quick tunnel** (account-less) which changes on restart.
You need a **named tunnel** (with Cloudflare account) for permanent URL.

---

## Step 1: Sign Up for Cloudflare (Free)

1. Go to: https://dash.cloudflare.com/sign-up
2. Sign up for a free account
3. Verify your email

---

## Step 2: Create Named Tunnel in Cloudflare Dashboard

1. Go to: https://one.dash.cloudflare.com/
2. Click **"Networks"** → **"Tunnels"**
3. Click **"Create a tunnel"**
4. Select **"Cloudflared"**
5. Give it a name: `pillpal-tunnel`
6. Click **"Save tunnel"**
7. **Copy the Tunnel ID** (you'll need this)

---

## Step 3: Authenticate cloudflared on Pi

```bash
# SSH into Pi
ssh justin@192.168.100.220

# Authenticate (this will open browser or give you a URL to visit)
cloudflared tunnel login
```

Visit the URL it shows to authenticate with your Cloudflare account.

---

## Step 4: Create Tunnel Configuration File

```bash
# On Pi - create config directory
mkdir -p ~/.cloudflared

# Create config file
nano ~/.cloudflared/config.yml
```

Paste this (replace `YOUR_TUNNEL_ID` with the ID from Step 2):

```yaml
tunnel: YOUR_TUNNEL_ID
credentials-file: /home/justin/.cloudflared/YOUR_TUNNEL_ID.json

ingress:
  - hostname: pillpal-tunnel.cfargotunnel.com
    service: http://localhost:8766
  - service: http_status:404
```

**Note:** For a free account without a domain, you can use `pillpal-tunnel.cfargotunnel.com` (Cloudflare provides this subdomain).

Save: `Ctrl+X`, then `Y`, then `Enter`

---

## Step 5: Update Systemd Service

```bash
# Edit the service file
sudo nano /etc/systemd/system/cloudflared-tunnel.service
```

Change the `ExecStart` line to use the config file:

```ini
[Unit]
Description=Cloudflare Named Tunnel for PillPal (Permanent)
After=network.target

[Service]
Type=simple
User=justin
ExecStart=/usr/local/bin/cloudflared tunnel --config /home/justin/.cloudflared/config.yml run
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

Save: `Ctrl+X`, then `Y`, then `Enter`

---

## Step 6: Restart Service

```bash
# Reload systemd
sudo systemctl daemon-reload

# Restart service
sudo systemctl restart cloudflared-tunnel

# Check status
sudo systemctl status cloudflared-tunnel
```

---

## Step 7: Get Your Permanent URL

The permanent URL will be: `https://pillpal-tunnel.cfargotunnel.com`

**Or check logs:**
```bash
sudo journalctl -u cloudflared-tunnel -n 50 | grep -i "cfargotunnel\|https://"
```

**This URL NEVER changes!** ✅

---

## Step 8: Update Database (One Time Only!)

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Run this:
```sql
UPDATE pi_connection_config
SET websocket_url = 'wss://pillpal-tunnel.cfargotunnel.com',
    updated_at = NOW();
```

**Important:** Use `wss://` (not `https://`) for WebSocket!

---

## Step 9: Update Vercel (One Time Only!)

1. Go to **Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**
2. Update `NEXT_PUBLIC_PI_WEBSOCKET_URL` to: `wss://pillpal-tunnel.cfargotunnel.com`
3. **Redeploy** your app

---

## ✅ Done!

**After this setup:**
- ✅ **Permanent URL** - Never changes, even after restart
- ✅ Uses your Cloudflare account (free)
- ✅ Auto-starts on boot
- ✅ Set once, works forever!

---

## Troubleshooting

### Authentication failed
```bash
# Re-authenticate
cloudflared tunnel login
```

### Can't find tunnel ID
1. Go to Cloudflare Dashboard → Zero Trust → Tunnels
2. Click on your tunnel
3. Copy the Tunnel ID from there

### Service won't start
```bash
# Check logs
sudo journalctl -u cloudflared-tunnel -n 100

# Verify config file exists
cat ~/.cloudflared/config.yml
```

---

## Summary

1. ✅ Sign up for Cloudflare (free)
2. ✅ Create named tunnel in dashboard
3. ✅ Authenticate on Pi
4. ✅ Create config file with tunnel ID
5. ✅ Update systemd service to use config
6. ✅ Restart service
7. ✅ Get permanent URL
8. ✅ Update database and Vercel
9. ✅ **Done! Permanent tunnel restored!** 🎉

**Your permanent URL:** `wss://pillpal-tunnel.cfargotunnel.com` (never changes!)




