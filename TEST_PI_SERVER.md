# ✅ Test Pi Server Connection

## **Step 1: Check if Server is Running**

On your Pi (SSH terminal):

```bash
# Check if process is running
ps aux | grep pi_server

# Check if port 8765 is in use
sudo netstat -tulpn | grep 8765
```

**Expected output:**
- You should see `pi_server_pca9685.py` in the process list
- You should see `:8765` in the port list

---

## **Step 2: Test Connection from Pi (Local Test)**

On your Pi terminal:

```bash
# Install websockets if not already installed
pip3 install websockets

# Test connection with a simple Python script
python3 << EOF
import asyncio
import websockets
import json

async def test():
    try:
        uri = 'ws://localhost:8765'
        async with websockets.connect(uri) as ws:
            # Send ping
            await ws.send(json.dumps({"type": "ping"}))
            response = await ws.recv()
            print(f"✅ Server responded: {response}")
    except Exception as e:
        print(f"❌ Connection failed: {e}")

asyncio.run(test())
EOF
```

**Expected output:**
```
✅ Server responded: {"success": true, "message": "pong", ...}
```

---

## **Step 3: Test from Your Vercel App**

### **Option A: Test in Browser (Easiest)**

1. Open your Vercel app: `https://pillpal-drab.vercel.app`
2. Open browser console (F12 or Right-click → Inspect → Console)
3. Look for connection messages:
   - ✅ Should see: "✅ Connected to Pi!"
   - ❌ If you see: "❌ WebSocket connection error" or "Raspberry Pi offline"

### **Option B: Test from Local Network**

If you're on the same network as your Pi:

1. Open your Vercel app
2. The app should automatically try to connect to `ws://192.168.1.45:8765`
3. Check if the status shows "Connected to Raspberry Pi" (green) instead of "Raspberry Pi offline" (yellow)

---

## **Step 4: Test from Internet (After Tunnel Setup)**

Once you set up ngrok/Cloudflare tunnel:

1. The tunnel will give you a public URL like `wss://xxxxx.ngrok-free.app`
2. Add this to Vercel environment variable: `NEXT_PUBLIC_PI_WEBSOCKET_URL`
3. Your Vercel app will connect to the tunnel URL
4. The tunnel forwards to your Pi's local server

---

## **Quick Checklist**

- [ ] Server running on Pi? (`ps aux | grep pi_server`)
- [ ] Port 8765 open? (`netstat -tulpn | grep 8765`)
- [ ] Local test works? (Python script above)
- [ ] Vercel app shows "Connected"? (Browser console)

---

## **Troubleshooting**

### **Server Not Running?**
```bash
# Start it manually
python3 pi_server_pca9685.py
```

### **Connection Refused?**
- Check Pi firewall: `sudo ufw status`
- Make sure server is listening on `0.0.0.0:8765` (not just `localhost`)

### **From Vercel App: "Pi offline"?**
- This is normal if you haven't set up the tunnel yet
- The app can't reach `192.168.1.45` from the internet
- Need to set up ngrok/Cloudflare tunnel first


