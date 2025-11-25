# 🌐 Setup Permanent Cloudflare Named Tunnel

This will give you a **permanent URL that never changes**, so you won't need to update the database anymore!

## Prerequisites

1. **Cloudflare account** (free): https://dash.cloudflare.com/sign-up
2. **Domain name** (you need your own domain - can get one cheap at Namecheap, Google Domains, etc.)

---

## Step 1: Add Domain to Cloudflare

1. Go to: https://dash.cloudflare.com
2. Click **"Add a Site"**
3. Enter your domain name
4. Follow the setup instructions to update nameservers at your domain registrar

---

## Step 2: Create Named Tunnel

1. Go to: https://one.dash.cloudflare.com/
2. Click **"Networks"** → **"Tunnels"**
3. Click **"Create a tunnel"**
4. Select **"Cloudflared"**
5. Name it: `pillpal-tunnel`
6. Click **"Save tunnel"**
7. **Copy the Tunnel ID** (you'll need it!)

---

## Step 3: Authenticate on Your Pi

On your Raspberry Pi, run:

```bash
cloudflared tunnel login
```

- It will show a URL
- Visit that URL in a browser
- Click to authorize
- This will download a credentials file

---

## Step 4: Create Config File on Pi

```bash
# Create config directory
mkdir -p ~/.cloudflared

# Create config file
nano ~/.cloudflared/config.yml
```

Paste this (replace `YOUR_TUNNEL_ID` with your actual tunnel ID):

```yaml
tunnel: YOUR_TUNNEL_ID
credentials-file: /home/justin/.cloudflared/YOUR_TUNNEL_ID.json

ingress:
  - hostname: pillpal.yourdomain.com
    service: http://localhost:8766
  - service: http_status:404
```

**Replace:**
- `YOUR_TUNNEL_ID` - with your actual tunnel ID from Step 2
- `pillpal.yourdomain.com` - with your actual domain (e.g., `pillpal.mydomain.com`)
- `8766` - with your actual WebSocket server port

Save: `Ctrl+X`, `Y`, `Enter`

---

## Step 5: Add DNS Record in Cloudflare

1. Go to Cloudflare Dashboard → Your Domain → **DNS**
2. Click **"Add record"**
3. Set:
   - **Type:** `CNAME`
   - **Name:** `pillpal` (or whatever subdomain you want)
   - **Target:** `YOUR_TUNNEL_ID.cfargotunnel.com`
   - **Proxy status:** Proxied (orange cloud ☁️)
4. Click **"Save"**

---

## Step 6: Update Systemd Service

```bash
sudo nano /etc/systemd/system/cloudflared-tunnel.service
```

Replace with:

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

## Step 7: Enable & Start Service

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable to start on boot
sudo systemctl enable cloudflared-tunnel

# Start the service
sudo systemctl start cloudflared-tunnel

# Check status
sudo systemctl status cloudflared-tunnel
```

---

## Step 8: Update Database Once

Update Supabase with your **permanent URL**:

```sql
UPDATE pi_connection_config
SET websocket_url = 'wss://pillpal.yourdomain.com',
    updated_at = NOW();
```

**Replace** `pillpal.yourdomain.com` with your actual subdomain.

---

## Step 9: Remove Auto-Update Script (Optional)

Since the URL is now permanent, you don't need the auto-update script anymore:

```bash
# Disable the service
sudo systemctl disable update-tunnel-url.service

# Or keep it enabled (it won't hurt, just won't need to update)
```

---

## Done! ✅

**Your permanent URL:** `wss://pillpal.yourdomain.com` (never changes!)

### Benefits:
- ✅ **Permanent URL** - never changes, even after reboot
- ✅ **No database updates needed** - set it once, works forever
- ✅ **More reliable** - stable connection
- ✅ **Professional** - uses your own domain

### Test It:

1. Wait a few minutes for DNS to propagate
2. Test the URL: `wss://pillpal.yourdomain.com`
3. Update database once with the permanent URL
4. Your web app will always connect!

---

## Troubleshooting

### If tunnel won't start:
```bash
# Check logs
sudo journalctl -u cloudflared-tunnel -n 50

# Test config
cloudflared tunnel --config ~/.cloudflared/config.yml run
```

### If DNS not working:
- Wait 5-10 minutes for DNS propagation
- Check Cloudflare DNS settings
- Make sure CNAME target is correct

### If connection fails:
- Check WebSocket server port (should be 8766 or 8765)
- Check firewall settings
- Verify tunnel is running: `sudo systemctl status cloudflared-tunnel`


