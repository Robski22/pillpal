# 🚀 Set Up Tunnel - Make Pi Accessible from Internet

## Problem
Your Vercel app (internet) can't reach Pi at `192.168.1.45` (local network).

## Solution: Use Cloudflare Tunnel (Free, Easy)

---

## **Step 1: Install Cloudflare Tunnel on Pi**

On your Pi (SSH terminal):

```bash
# Download cloudflared
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm

# Make it executable
chmod +x cloudflared-linux-arm

# Move to system location
sudo mv cloudflared-linux-arm /usr/local/bin/cloudflared

# Verify it works
cloudflared --version
```

---

## **Step 2: Start Tunnel (Pi Server Must Be Running!)**

On your Pi:

```bash
# Start tunnel - this will give you a public URL
cloudflared tunnel --url ws://localhost:8765
```

**You'll see output like:**
```
+--------------------------------------------------------------------------------------------+
|  Your quick Tunnel has created!                                                           |
+--------------------------------------------------------------------------------------------+
|  Visit the following URL to access your tunnel:                                            |
+  https://xxxxx-xxxxx.trycloudflare.com                                                     |
+--------------------------------------------------------------------------------------------+
```

**IMPORTANT:** Copy the URL! (e.g., `https://xxxxx-xxxxx.trycloudflare.com`)

**Keep this terminal open!** Don't close it.

---

## **Step 3: Update Vercel Environment Variable**

1. **Go to Vercel Dashboard:**
   - https://vercel.com/dashboard
   - Click your **pillpal** project

2. **Go to Settings → Environment Variables:**
   - Click **Settings** tab
   - Click **Environment Variables** in left sidebar

3. **Add New Variable:**
   - **Name:** `NEXT_PUBLIC_PI_WEBSOCKET_URL`
   - **Value:** `wss://xxxxx-xxxxx.trycloudflare.com` 
     - Use the URL from Step 2, but change `https://` to `wss://`
     - Example: If tunnel gives `https://abc123.trycloudflare.com`, use `wss://abc123.trycloudflare.com`
   - **Environment:** Select **Production** (and **Preview** if you want)
   - Click **Save**

---

## **Step 4: Redeploy on Vercel**

1. Go to **Deployments** tab
2. Find latest deployment
3. Click **⋮** (3 dots menu)
4. Click **Redeploy**
5. Wait for it to finish (usually 1-2 minutes)

---

## **Step 5: Test Connection**

1. Open your app: `https://pillpal-drab.vercel.app`
2. **Refresh the page** (F5 or Ctrl+R)
3. The yellow "Raspberry Pi offline" should change to green **"Connected to Raspberry Pi"**! ✅

---

## ⚠️ **Important Notes**

1. **Keep Both Running:**
   - Pi server (`pi_server_pca9685.py`) must be running
   - Cloudflare tunnel must be running
   - Both terminals must stay open!

2. **URL Changes:**
   - Free Cloudflare tunnels get a new URL each time you restart
   - If you restart the tunnel, you need to update the Vercel environment variable again

3. **WebSocket Protocol:**
   - Tunnel gives: `https://xxxxx.trycloudflare.com`
   - Use in Vercel: `wss://xxxxx.trycloudflare.com` (change `https` → `wss`)

---

## 🔄 **Alternative: Use ngrok (More Permanent URL)**

If you want a more permanent solution:

### Install ngrok:
```bash
# On Pi
curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null
echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | sudo tee /etc/apt/sources.list.d/ngrok.list
sudo apt update && sudo apt install ngrok
```

### Sign up and get token:
1. Go to https://dashboard.ngrok.com/signup (free)
2. Get your auth token
3. On Pi: `ngrok config add-authtoken YOUR_TOKEN`

### Start tunnel:
```bash
# On Pi
ngrok http 8765
```

### Use the URL:
- ngrok shows: `https://xxxxx.ngrok-free.app`
- Use in Vercel: `wss://xxxxx.ngrok-free.app`

---

## ✅ **Quick Checklist**

- [ ] Cloudflare tunnel installed on Pi
- [ ] Pi server running (`python3 pi_server_pca9685.py`)
- [ ] Tunnel started (`cloudflared tunnel --url ws://localhost:8765`)
- [ ] Copied tunnel URL
- [ ] Added `NEXT_PUBLIC_PI_WEBSOCKET_URL` to Vercel (with `wss://`)
- [ ] Redeployed on Vercel
- [ ] Tested app - should show "Connected"!

---

## 🚨 **If It Still Doesn't Work**

1. **Check tunnel is running** (should show URL)
2. **Check Pi server is running** (`ps aux | grep pi_server`)
3. **Check browser console** (F12) for connection errors
4. **Try `ws://` instead of `wss://`** in environment variable
5. **Make sure tunnel URL is correct** (no typos)

