# 🔧 Fix Pi Connection Issue

## Problem
Your app is deployed on Vercel (internet) but trying to connect to Pi at `192.168.1.45` (local network).  
**Browsers on the internet can't reach local IP addresses!**

---

## ✅ **Solution Options**

### **Option 1: Use ngrok (Easiest - Recommended)**

ngrok creates a secure tunnel from the internet to your local Pi.

#### Step 1: Install ngrok on Your Pi
```bash
# SSH into your Pi
ssh justin@192.168.1.45

# Download ngrok
curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null
echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | sudo tee /etc/apt/sources.list.d/ngrok.list
sudo apt update && sudo apt install ngrok

# Or download manually:
# wget https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-arm.tgz
# tar -xzf ngrok-v3-stable-linux-arm.tgz
# sudo mv ngrok /usr/local/bin/
```

#### Step 2: Get ngrok Auth Token
1. Sign up at https://dashboard.ngrok.com/signup (free)
2. Get your auth token from dashboard
3. On Pi, run:
```bash
ngrok config add-authtoken YOUR_AUTH_TOKEN
```

#### Step 3: Start ngrok Tunnel
```bash
# Make sure your Pi server is running first!
# Then start ngrok:
ngrok tcp 8765
```

#### Step 4: Get Public URL
ngrok will show something like:
```
Forwarding   tcp://0.tcp.ngrok.io:12345 -> localhost:8765
```

#### Step 5: Update Vercel Environment Variable
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add:
   - **Name:** `NEXT_PUBLIC_PI_WEBSOCKET_URL`
   - **Value:** `wss://0.tcp.ngrok.io:12345` (use the ngrok URL, but with `wss://` instead of `tcp://`)
3. **Note:** WebSocket URLs need to be `ws://` or `wss://`, not `tcp://`
   - For ngrok, you might need to use HTTP tunnel instead:
   ```bash
   ngrok http 8765
   ```
   Then use: `wss://xxxxx.ngrok-free.app` (if ngrok supports WebSockets)

---

### **Option 2: Use Cloudflare Tunnel (Free, No Account Needed for Basic)**

Similar to ngrok but free.

#### Step 1: Install cloudflared on Pi
```bash
# Download cloudflared
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm
chmod +x cloudflared-linux-arm
sudo mv cloudflared-linux-arm /usr/local/bin/cloudflared
```

#### Step 2: Create Tunnel
```bash
cloudflared tunnel --url ws://localhost:8765
```

This will give you a public URL like: `https://xxxxx.trycloudflare.com`

#### Step 3: Update Vercel Environment Variable
- **Name:** `NEXT_PUBLIC_PI_WEBSOCKET_URL`
- **Value:** `wss://xxxxx.trycloudflare.com` (replace with your URL)

---

### **Option 3: Use localtunnel (Simple, Free)**

#### Step 1: Install on Pi
```bash
sudo npm install -g localtunnel
```

#### Step 2: Start Tunnel
```bash
lt --port 8765
```

This gives you a URL like: `https://xxxxx.loca.lt`

#### Step 3: Update Vercel Environment Variable
- **Name:** `NEXT_PUBLIC_PI_WEBSOCKET_URL`
- **Value:** `wss://xxxxx.loca.lt` (replace with your URL)

---

## ⚠️ **Important Notes**

1. **WebSocket Protocol:**
   - Local: `ws://192.168.1.45:8765`
   - Internet: `wss://xxxxx.tunnel.com` (secure WebSocket)
   - Some tunnels might need `ws://` instead of `wss://`

2. **Tunnel Must Be Running:**
   - Keep the tunnel running on your Pi
   - If Pi restarts, you need to restart the tunnel
   - Consider making it auto-start (systemd service)

3. **Security:**
   - These tunnels expose your Pi to the internet
   - Make sure your Pi server has proper authentication
   - Consider adding password protection to your Pi WebSocket server

4. **Pi Server Must Be Running:**
   - Make sure `pi_server_pca9685.py` is running on your Pi
   - Test locally first: `ws://192.168.1.45:8765`

---

## 🚀 **Quick Start (Recommended: ngrok)**

1. **On Pi:** Install ngrok
2. **On Pi:** Start ngrok: `ngrok http 8765`
3. **Copy the HTTPS URL** (e.g., `https://xxxxx.ngrok-free.app`)
4. **In Vercel:** Add environment variable `NEXT_PUBLIC_PI_WEBSOCKET_URL` = `wss://xxxxx.ngrok-free.app`
5. **Redeploy** on Vercel (or it auto-deploys)
6. **Test** your app!

---

## 🔄 **After Setting Up**

1. ✅ Tunnel running on Pi
2. ✅ Environment variable set in Vercel
3. ✅ Vercel redeployed
4. ✅ Test app - should connect to Pi!

---

## 📝 **Alternative: Router Port Forwarding (Advanced)**

If you have router access, you can:
1. Set up port forwarding on router (port 8765 → Pi IP)
2. Get your public IP: `curl ifconfig.me`
3. Use: `ws://YOUR_PUBLIC_IP:8765`

**Warning:** This exposes your Pi directly to the internet - use firewall!

