# 🔧 Set Up Cloudflare Named Tunnel (Permanent URL)

## Requirements
- ✅ Cloudflare account (free is fine)
- ✅ A domain name (you need to own/register one)
- ✅ Domain added to Cloudflare

---

## Step 1: Sign Up for Cloudflare (If Not Already)

1. Go to: https://dash.cloudflare.com/sign-up
2. Sign up for a free account
3. Verify your email

---

## Step 2: Add Your Domain to Cloudflare

1. Go to Cloudflare Dashboard: https://dash.cloudflare.com
2. Click **"Add a Site"**
3. Enter your domain name (e.g., `yourdomain.com`)
4. Follow the setup wizard:
   - Cloudflare will scan your DNS records
   - Update your domain's nameservers at your registrar
   - Wait for DNS to propagate (can take a few hours)

**Note:** You need to own a domain. If you don't have one, you can:
- Register one at: Namecheap, Google Domains, Cloudflare Registrar, etc.
- Or use a free subdomain service (but Cloudflare requires you to add it to their dashboard)

---

## Step 3: Create Named Tunnel on Cloudflare Dashboard

1. Go to Cloudflare Dashboard
2. Click **"Zero Trust"** (or go to: https://one.dash.cloudflare.com/)
3. Click **"Networks"** → **"Tunnels"**
4. Click **"Create a tunnel"**
5. Select **"Cloudflared"**
6. Give it a name: `pillpal-tunnel`
7. Click **"Save tunnel"**

---

## Step 4: Install cloudflared on Pi (If Not Already)

```bash
# Download cloudflared
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm

# Make it executable
chmod +x cloudflared-linux-arm

# Move to system location
sudo mv cloudflared-linux-arm /usr/local/bin/cloudflared

# Verify
cloudflared --version
```

---

## Step 5: Authenticate cloudflared

1. In Cloudflare Dashboard → Tunnels → Your tunnel
2. Click **"Configure"** or **"Next"**
3. You'll see a command like:
   ```bash
   cloudflared tunnel login
   ```
4. Run this on your Pi - it will open a browser to authenticate

**Or manually:**
```bash
# On Pi, run:
cloudflared tunnel login
```

This will give you a URL to visit in a browser to authenticate.

---

## Step 6: Create Tunnel Configuration

After authentication, Cloudflare will show you commands. Run on your Pi:

```bash
# Create tunnel (replace TUNNEL_ID with the ID from dashboard)
cloudflared tunnel create pillpal-tunnel
```

**Or if you created it in dashboard, just get the tunnel ID from there.**

---

## Step 7: Configure Tunnel

Create config file:

```bash
# Create config directory
mkdir -p ~/.cloudflared

# Create config file
nano ~/.cloudflared/config.yml
```

Add this content (replace with your actual values):

```yaml
tunnel: YOUR_TUNNEL_ID_HERE
credentials-file: /home/justin/.cloudflared/YOUR_TUNNEL_ID_HERE.json

ingress:
  - hostname: pillpal.yourdomain.com
    service: http://localhost:8766
  - service: http_status:404
```

**Replace:**
- `YOUR_TUNNEL_ID_HERE` with your actual tunnel ID
- `yourdomain.com` with your actual domain
- `pillpal.yourdomain.com` with your desired subdomain

Save: `Ctrl+X`, then `Y`, then `Enter`

---

## Step 8: Create DNS Record

1. Go to Cloudflare Dashboard → Your Domain → **DNS**
2. Click **"Add record"**
3. Set:
   - **Type:** CNAME
   - **Name:** `pillpal` (or whatever subdomain you want)
   - **Target:** `YOUR_TUNNEL_ID_HERE.cfargotunnel.com`
   - **Proxy status:** Proxied (orange cloud)
4. Click **"Save"**

---

## Step 9: Set Up as Systemd Service

```bash
# Create service file
sudo nano /etc/systemd/system/cloudflared-tunnel.service
```

Paste this (replace TUNNEL_ID):

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
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

Save: `Ctrl+X`, then `Y`, then `Enter`

---

## Step 10: Enable and Start Service

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

---

## Step 11: Get Your Permanent URL

Your permanent URL will be:
**`https://pillpal.yourdomain.com`** (or whatever subdomain you chose)

**This URL never changes!**

---

## Step 12: Update Database and Vercel

1. **Update Database:**
   ```sql
   UPDATE pi_connection_config
   SET websocket_url = 'wss://pillpal.yourdomain.com',
       updated_at = NOW();
   ```
   (Change `https` to `wss`)

2. **Update Vercel Environment Variable:**
   - `NEXT_PUBLIC_PI_WEBSOCKET_URL` = `wss://pillpal.yourdomain.com`
   - Redeploy

---

## Verify Everything Works

```bash
# Check service is running
sudo systemctl status cloudflared-tunnel

# Check tunnel is connected
sudo journalctl -u cloudflared-tunnel -n 50

# Test the URL
curl https://pillpal.yourdomain.com
```

---

## Benefits

- ✅ **Permanent URL** - Never changes, even after restart
- ✅ **Free** - Cloudflare free tier is sufficient
- ✅ **Auto-starts on boot** - Service runs automatically
- ✅ **Professional** - Uses your own domain
- ✅ **Reliable** - Cloudflare's infrastructure

---

## Troubleshooting

### Tunnel won't start
```bash
# Check logs
sudo journalctl -u cloudflared-tunnel -n 100

# Verify config file exists
cat ~/.cloudflared/config.yml

# Test tunnel manually
cloudflared tunnel --config ~/.cloudflared/config.yml run
```

### DNS not working
- Wait 5-10 minutes for DNS to propagate
- Check DNS record in Cloudflare dashboard
- Make sure CNAME target is correct

### Authentication failed
```bash
# Re-authenticate
cloudflared tunnel login
```

---

## Summary

1. ✅ Sign up for Cloudflare (free)
2. ✅ Add your domain to Cloudflare
3. ✅ Create named tunnel in dashboard
4. ✅ Authenticate on Pi
5. ✅ Create config file
6. ✅ Add DNS record
7. ✅ Set up systemd service
8. ✅ Enable and start
9. ✅ Update database with permanent URL
10. ✅ Done!

**Your permanent URL:** `wss://pillpal.yourdomain.com` (never changes!)




