# 🔍 Check PillPal Service Status

## Step 1: Check Service Status

```bash
# Check if service is running
sudo systemctl status pillpal

# Or if it's named differently
sudo systemctl status pillpal-websocket
```

Look for:
- ✅ `Active: active (running)` - Service is running
- ❌ `Active: failed` - Service failed to start
- ⚠️ `Active: activating` - Service is starting but stuck

---

## Step 2: Check Service Logs

```bash
# View recent logs
sudo journalctl -u pillpal -n 100

# Or if named differently
sudo journalctl -u pillpal-websocket -n 100

# Follow logs in real-time
sudo journalctl -u pillpal -f
```

**Look for:**
- Import errors (missing libraries)
- Permission errors
- Port binding errors
- Hardware initialization errors
- Any ERROR or CRITICAL messages

---

## Step 3: Check Service Configuration

```bash
# View service file
cat /etc/systemd/system/pillpal.service

# Or if named differently
cat /etc/systemd/system/pillpal-websocket.service
```

Check:
- Is the path to the Python file correct?
- Is the working directory set correctly?
- Are there any environment variables needed?

---

## Step 4: Restart Service and Watch Logs

```bash
# Restart the service
sudo systemctl restart pillpal

# Immediately check logs
sudo journalctl -u pillpal -n 50 --no-pager

# Or follow logs in real-time
sudo journalctl -u pillpal -f
```

Watch for:
- Server startup messages
- "WebSocket server running on ws://0.0.0.0:8765"
- Any errors during startup

---

## Step 5: Verify Server is Listening

After restart, check if port 8765 is listening:

```bash
# Wait a few seconds for server to start
sleep 5

# Check if listening
sudo netstat -tlnp | grep 8765
# OR
sudo ss -tlnp | grep 8765
```

---

## Common Issues:

### Issue 1: Service Starts But Server Doesn't

If service shows "active" but port isn't listening:
- Check logs for import errors
- Server might be crashing after starting
- Check if all dependencies are installed

### Issue 2: Missing Dependencies

```bash
# Install required Python packages
pip3 install websockets adafruit-circuitpython-servokit RPLCD pyserial

# Or if using system Python
sudo pip3 install websockets adafruit-circuitpython-servokit RPLCD pyserial
```

### Issue 3: Wrong Working Directory

Service might be running from wrong directory. Check service file:

```bash
cat /etc/systemd/system/pillpal.service | grep WorkingDirectory
```

Should be: `WorkingDirectory=/home/justin/pillpal`

### Issue 4: Permission Issues

```bash
# Check file permissions
ls -la /home/justin/pillpal/pi_websocket_server_PCA9685.py

# Check if service user can access the file
sudo -u justin test -r /home/justin/pillpal/pi_websocket_server_PCA9685.py && echo "Readable" || echo "Not readable"
```

---

## Quick Diagnostic Commands:

```bash
# 1. Service status
sudo systemctl status pillpal

# 2. Recent logs
sudo journalctl -u pillpal -n 50

# 3. Check if listening
sudo ss -tlnp | grep 8765

# 4. Check process
ps aux | grep pi_websocket_server

# 5. Test if server responds
python3 -c "
import asyncio
import websockets
async def test():
    try:
        async with websockets.connect('ws://localhost:8765', timeout=2) as ws:
            print('✅ Server is responding!')
    except Exception as e:
        print(f'❌ Server not responding: {e}')
asyncio.run(test())
"
```

---

## Expected Output:

When everything works:
- Service status: `Active: active (running)`
- Logs show: `WebSocket server running on ws://0.0.0.0:8765`
- `sudo ss -tlnp | grep 8765` shows Python listening
- Test connection succeeds


