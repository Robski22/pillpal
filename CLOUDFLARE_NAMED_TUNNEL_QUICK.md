# 🚀 Quick Setup: Cloudflare Named Tunnel (Permanent URL)

## Prerequisites
- Cloudflare account (free): https://dash.cloudflare.com/sign-up
- A domain name (register at Namecheap, Google Domains, etc. if you don't have one)

---

## Step 1: Add Domain to Cloudflare

1. Go to: https://dash.cloudflare.com
2. Click **"Add a Site"**
3. Enter your domain
4. Follow setup (update nameservers at your registrar)

---

## Step 2: Create Named Tunnel

1. Go to: https://one.dash.cloudflare.com/
2. Click **"Networks"** → **"Tunnels"**
3. Click **"Create a tunnel"**
4. Select **"Cloudflared"**
5. Name: `pillpal-tunnel`
6. Click **"Save tunnel"**

---

## Step 3: Authenticate on Pi

```bash
# On Pi - authenticate
cloudflared tunnel login
```

Visit the URL it shows to authenticate.

---

## Step 4: Create Config File

```bash
# On Pi
mkdir -p ~/.cloudflared
nano ~/.cloudflared/config.yml
```

Paste (replace with your values):
```yaml
tunnel: YOUR_TUNNEL_ID
credentials-file: /home/justin/.cloudflared/YOUR_TUNNEL_ID.json

ingress:
  - hostname: pillpal.yourdomain.com
    service: http://localhost:8766
  - service: http_status:404
```

Save: `Ctrl+X`, `Y`, `Enter`

---

## Step 5: Add DNS Record

In Cloudflare Dashboard → Your Domain → DNS:
- **Type:** CNAME
- **Name:** `pillpal`
- **Target:** `YOUR_TUNNEL_ID.cfargotunnel.com`
- **Proxy:** Proxied (orange cloud)

---

## Step 6: Create Service

```bash
sudo nano /etc/systemd/system/cloudflared-tunnel.service
```

Paste:
```ini
[Unit]
Description=Cloudflare Named Tunnel for PillPal
After=network.target

[Service]
Type=simple
User=justin
ExecStart=/usr/local/bin/cloudflared tunnel --config /home/justin/.cloudflared/config.yml run
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Save: `Ctrl+X`, `Y`, `Enter`

---

## Step 7: Enable & Start

```bash
sudo systemctl daemon-reload
sudo systemctl enable cloudflared-tunnel
sudo systemctl start cloudflared-tunnel
sudo systemctl status cloudflared-tunnel
```

---

## Step 8: Update Database

```sql
UPDATE pi_connection_config
SET websocket_url = 'wss://pillpal.yourdomain.com',
    updated_at = NOW();
```

---

## Done! ✅

**Permanent URL:** `wss://pillpal.yourdomain.com` (never changes!)



