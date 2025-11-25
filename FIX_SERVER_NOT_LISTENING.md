# 🔧 Fix: Server Running But Not Listening on Port 8765

## Problem:
- ✅ Python server process is running (PID 1784)
- ❌ Server is NOT listening on port 8765
- ❌ Tunnel can't connect: "connection refused"

This means the WebSocket server failed to start, even though the Python process is running.

---

## Step 1: Check Server Logs

The server should be logging errors. Check where it's logging:

### If Running as Service:

```bash
# Check service logs
sudo journalctl -u pillpal-websocket -n 100

# Or follow logs in real-time
sudo journalctl -u pillpal-websocket -f
```

### If Running Manually:

Check the terminal where you started it, or check if it's logging to a file:

```bash
# Check for log files
ls -la ~/pillpal/*.log

# Check if output is being redirected
ps aux | grep pi_websocket_server | grep -v grep
```

---

## Step 2: Check for Import Errors

The server might have failed to import required libraries. Check:

```bash
# Test if server can start
cd ~/pillpal
python3 pi_websocket_server_PCA9685.py
```

Look for errors like:
- `ImportError` - missing libraries
- `PermissionError` - can't access hardware
- `OSError` - port already in use or permission denied

---

## Step 3: Check What Ports Are Actually in Use

```bash
# Check all listening ports
sudo netstat -tlnp | grep python
# OR
sudo ss -tlnp | grep python

# Check if port 8765 is in use by something else
sudo lsof -i :8765
```

---

## Step 4: Restart the Server Properly

### If Running as Service:

```bash
# Stop the service
sudo systemctl stop pillpal-websocket

# Wait a moment
sleep 2

# Check if process is still running
ps aux | grep pi_websocket_server

# If still running, kill it
sudo pkill -f pi_websocket_server_PCA9685.py

# Start the service
sudo systemctl start pillpal-websocket

# Check status
sudo systemctl status pillpal-websocket

# Check logs
sudo journalctl -u pillpal-websocket -n 50
```

### If Running Manually:

```bash
# Find and kill the process
ps aux | grep pi_websocket_server
# Note the PID (e.g., 1784)

# Kill it
kill 1784
# OR force kill if needed
kill -9 1784

# Wait a moment
sleep 2

# Start it again
cd ~/pillpal
python3 pi_websocket_server_PCA9685.py
```

**Watch the output** - you should see:
```
🚀 Starting PillPal Raspberry Pi Server
PillPal WebSocket Server Starting...
Listening on 0.0.0.0:8765
WebSocket server running on ws://0.0.0.0:8765
```

If you see errors instead, note them down.

---

## Step 5: Verify Server is Listening

After restarting, verify:

```bash
# Should show Python listening on port 8765
sudo netstat -tlnp | grep 8765
# OR
sudo ss -tlnp | grep 8765
```

Should show something like:
```
tcp  0  0  0.0.0.0:8765  0.0.0.0:*  LISTEN  1784/python3
```

---

## Common Issues and Fixes:

### Issue 1: Missing Python Libraries

```bash
# Install required libraries
pip3 install websockets adafruit-circuitpython-servokit RPLCD pyserial
```

### Issue 2: Permission Denied

```bash
# Check file permissions
ls -la ~/pillpal/pi_websocket_server_PCA9685.py

# Make sure it's executable
chmod +x ~/pillpal/pi_websocket_server_PCA9685.py
```

### Issue 3: Port Already in Use

```bash
# Find what's using port 8765
sudo lsof -i :8765

# Kill the process using it
sudo kill <PID>
```

### Issue 4: Hardware Not Available

If the server is trying to initialize hardware that's not available, it might fail. Check logs for hardware-related errors.

---

## Step 6: Test Local Connection

Once the server is listening, test it:

```bash
# Test WebSocket connection
python3 -c "
import asyncio
import websockets

async def test():
    try:
        async with websockets.connect('ws://localhost:8765') as ws:
            await ws.send('{\"type\":\"ping\"}')
            response = await ws.recv()
            print('✅ Server is working! Response:', response)
    except Exception as e:
        print('❌ Connection failed:', e)

asyncio.run(test())
"
```

---

## Expected Result:

After fixing, you should see:
1. ✅ Server process running
2. ✅ Server listening on port 8765 (`sudo netstat -tlnp | grep 8765` shows it)
3. ✅ Server logs show "WebSocket server running on ws://0.0.0.0:8765"
4. ✅ Tunnel logs no longer show "connection refused"
5. ✅ Web app can connect


