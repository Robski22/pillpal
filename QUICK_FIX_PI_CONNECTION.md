# 🚀 Quick Fix: Connect Pi from Internet

## The Problem
Your app on Vercel (internet) can't reach Pi at `192.168.1.45` (local network).

## ✅ **Easiest Solution: Use Cloudflare Tunnel (Free)**

### Step 1: On Your Pi (SSH into it)
```bash
# Download cloudflared
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm
chmod +x cloudflared-linux-arm
sudo mv cloudflared-linux-arm /usr/local/bin/cloudflared
```

### Step 2: Make Sure Pi Server is Running
```bash
# Check if pi_server_pca9685.py is running
ps aux | grep pi_server

# If not running, start it:
python3 pi_server_pca9685.py
```

### Step 3: Start Cloudflare Tunnel
```bash
# In a new terminal on Pi (keep server running!)
cloudflared tunnel --url ws://localhost:8765
```

You'll see output like:
```
+--------------------------------------------------------------------------------------------+
|  Your quick Tunnel has created!                                                           |
+--------------------------------------------------------------------------------------------+
|  Visit the following URL to access your tunnel:                                            |
|  https://xxxxx.trycloudflare.com                                                           |
+--------------------------------------------------------------------------------------------+
```

### Step 4: Copy the URL
Copy the URL (e.g., `https://xxxxx.trycloudflare.com`)

### Step 5: Update Vercel Environment Variable
1. Go to: https://vercel.com/dashboard
2. Click your **pillpal** project
3. Click **Settings** → **Environment Variables**
4. Add new variable:
   - **Name:** `NEXT_PUBLIC_PI_WEBSOCKET_URL`
   - **Value:** `wss://xxxxx.trycloudflare.com` (use your URL, but change `https://` to `wss://`)
   - **Environment:** Production (and Preview if you want)
5. Click **Save**

### Step 6: Redeploy on Vercel
1. Go to **Deployments** tab
2. Click the **3 dots** (⋮) on the latest deployment
3. Click **Redeploy**
4. Wait for it to finish

### Step 7: Test!
1. Open your app: `https://pillpal-drab.vercel.app`
2. It should now connect to Pi! ✅

---

## ⚠️ **Important Notes**

1. **Keep Both Running:**
   - Pi server (`pi_server_pca9685.py`) must be running
   - Cloudflare tunnel must be running
   - Both need to stay running!

2. **WebSocket URL Format:**
   - Cloudflare gives: `https://xxxxx.trycloudflare.com`
   - Use in Vercel: `wss://xxxxx.trycloudflare.com` (change `https` → `wss`)

3. **URL Changes Each Time:**
   - Cloudflare free tunnels get a new URL each time
   - For permanent URL, you need to sign up (free) and create a named tunnel

4. **If It Doesn't Work:**
   - Check Pi server is running: `ps aux | grep pi_server`
   - Check tunnel is running (should see URL in terminal)
   - Try `ws://` instead of `wss://` in environment variable
   - Check browser console for connection errors

---

## 🔄 **Make It Auto-Start (Optional)**

If you want the tunnel to start automatically when Pi boots:

1. Create a service file on Pi:
```bash
sudo nano /etc/systemd/system/cloudflared-tunnel.service
```

2. Add this content:
```ini
[Unit]
Description=Cloudflare Tunnel for PillPal
After=network.target

[Service]
Type=simple
User=justin
ExecStart=/usr/local/bin/cloudflared tunnel --url ws://localhost:8765
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

3. Enable and start:
```bash
sudo systemctl enable cloudflared-tunnel.service
sudo systemctl start cloudflared-tunnel.service
```

---

## ✅ **Checklist**

- [ ] Pi server running (`pi_server_pca9685.py`)
- [ ] Cloudflare tunnel running (shows URL)
- [ ] Environment variable added in Vercel (`NEXT_PUBLIC_PI_WEBSOCKET_URL`)
- [ ] Vercel redeployed
- [ ] App tested - Pi should connect!

