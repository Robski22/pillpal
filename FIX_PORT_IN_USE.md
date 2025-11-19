# Fix: Port 8765 Already in Use

## Problem
Error: "address already in use" on port 8765

This means something is already using that port (probably your old server or another process).

---

## ✅ Step 1: Find What's Using Port 8765

**On your Pi (SSH session), run:**
```bash
sudo lsof -i :8765
# Or
sudo netstat -tulpn | grep 8765
# Or
sudo ss -tulpn | grep 8765
```

This shows what process is using port 8765.

---

## ✅ Step 2: Stop the Process

**You'll see something like:**
```
python3  1234  ...  :8765
```

**Kill that process:**
```bash
kill 1234
# Or force kill:
kill -9 1234
```

**Or kill by name:**
```bash
pkill -f python3
# Or
pkill -f websocket
```

---

## ✅ Step 3: Verify Port is Free

```bash
sudo lsof -i :8765
```

Should show nothing (or only the grep command).

---

## ✅ Step 4: Start New Server

```bash
cd /home/justin/pillpal
python3 pi_websocket_server.py
```

---

## Why You Need the Server Running

**The server is the connection between your web app and the Pi hardware:**

1. **Web App** (browser) → Connects to → **Pi WebSocket Server** → Controls → **Servo Hardware**

2. **Without the server running:**
   - Web app can't connect to Pi
   - Shows "Raspberry Pi offline"
   - Can't dispense medications

3. **With server running:**
   - Web app connects successfully
   - Shows "Connected" (green)
   - Can dispense medications
   - Servo maintains position (doesn't reset)

**The server must be running 24/7 for your web app to work!**

---

## Make It Run Automatically (Optional)

**So you don't have to start it manually every time:**

### Option 1: Systemd Service (Recommended)
```bash
sudo nano /etc/systemd/system/pillpal-websocket.service
```

**Add:**
```ini
[Unit]
Description=PillPal WebSocket Server
After=network.target

[Service]
Type=simple
User=justin
WorkingDirectory=/home/justin/pillpal
ExecStart=/usr/bin/python3 /home/justin/pillpal/pi_websocket_server.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**Enable and start:**
```bash
sudo systemctl enable pillpal-websocket.service
sudo systemctl start pillpal-websocket.service
```

**Now it starts automatically on boot!**

### Option 2: Run in Background
```bash
nohup python3 /home/justin/pillpal/pi_websocket_server.py > /dev/null 2>&1 &
```

---

## Quick Fix Now

**Run these commands:**
```bash
# Find what's using port 8765
sudo lsof -i :8765

# Kill it (replace PID with actual number)
kill PID_NUMBER

# Start new server
cd /home/justin/pillpal
python3 pi_websocket_server.py
```


