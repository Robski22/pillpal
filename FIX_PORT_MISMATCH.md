# 🔧 Fix Port Mismatch Issue

## Problem Found:
- ❌ Server is trying to bind to port **8766**
- ❌ Port 8766 is already in use
- ❌ Tunnel is configured for port **8765**
- Result: Server can't start, tunnel can't connect

---

## Step 1: Find What's Using Port 8766

```bash
# Check what's using port 8766
sudo lsof -i :8766
# OR
sudo fuser 8766/tcp
# OR
sudo netstat -tlnp | grep 8766
# OR
sudo ss -tlnp | grep 8766
```

Kill whatever is using it:

```bash
# If you find a process, kill it
sudo kill <PID>
# OR force kill
sudo kill -9 <PID>
```

---

## Step 2: Fix Server to Use Port 8765

The server code needs to be changed from 8766 to 8765. Check the current port:

```bash
# Check what port the server is configured to use
grep -n "8766\|8765\|port.*=" ~/pillpal/pi_websocket_server_PCA9685.py | grep -v "^#"
```

If it shows 8766, you need to change it to 8765.

---

## Step 3: Update Server Code

Edit the server file:

```bash
nano ~/pillpal/pi_websocket_server_PCA9685.py
```

Find the line with `port = 8766` (around line 2202) and change it to:

```python
port = 8765
```

Save: `Ctrl+X`, `Y`, `Enter`

---

## Step 4: Restart Service

```bash
# Restart the service
sudo systemctl restart pillpal

# Check status
sudo systemctl status pillpal

# Check logs
sudo journalctl -u pillpal -n 50
```

You should now see:
- "Listening on 0.0.0.0:8765"
- "WebSocket server running on ws://0.0.0.0:8765"
- No more "address already in use" errors

---

## Step 5: Verify Port 8765 is Listening

```bash
# Wait a few seconds
sleep 5

# Check if listening on 8765
sudo ss -tlnp | grep 8765
```

Should show Python listening on port 8765.

---

## Quick Fix Commands:

```bash
# 1. Kill whatever is using 8766
sudo lsof -i :8766
sudo kill <PID_from_above>

# 2. Check server port configuration
grep -n "port.*=" ~/pillpal/pi_websocket_server_PCA9685.py | grep -v "^#"

# 3. If it shows 8766, change to 8765
sed -i 's/port = 8766/port = 8765/g' ~/pillpal/pi_websocket_server_PCA9685.py

# 4. Verify the change
grep -n "port.*=" ~/pillpal/pi_websocket_server_PCA9685.py | grep -v "^#"

# 5. Restart service
sudo systemctl restart pillpal

# 6. Check logs
sudo journalctl -u pillpal -n 30
```

---

## Alternative: Update Tunnel to Use 8766

If you want to keep the server on 8766, update the tunnel instead:

```bash
# Edit tunnel service
sudo nano /etc/systemd/system/cloudflared-quick-tunnel.service

# Change --url http://localhost:8765 to --url http://localhost:8766

# Restart tunnel
sudo systemctl daemon-reload
sudo systemctl restart cloudflared-quick-tunnel
```

But it's better to fix the server to use 8765 (standard port).


