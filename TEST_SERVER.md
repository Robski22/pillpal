# Test the PCA Server After Editing

## Step 1: Stop Any Running Server

**On your Pi (in the SSH terminal), run:**
```bash
# Find and kill any running server
pkill -f "pi_websocket_server"

# Verify it's stopped
ps aux | grep python | grep websocket
# Should show nothing (or just the grep command itself)
```

## Step 2: Start the New Server

**On your Pi, run:**
```bash
cd /home/justin/pillpal
python3 pi_websocket_server.py
```

**You should see output like:**
```
PillPal WebSocket Server Starting...
Listening on 0.0.0.0:8765
Servo positions will be maintained (not reset)
WebSocket server running on ws://0.0.0.0:8765
```

**Keep this terminal open** - the server is now running!

## Step 3: Test from Web App

1. **Open your web app** (on your phone or computer)
2. **Check connection status** - should show "Connected to Raspberry Pi" (green)
3. **Click "Dispense"** on any medication
4. **Watch the servo:**
   - Should move 30 degrees
   - Servo2 should move to 90 degrees
   - Confirmation dialog should appear

## Step 4: Test Position Persistence

### Test 1: Basic Movement
1. Dispense 2-3 times (servo should be at 60° or 90°)
2. Check the position file:
   ```bash
   cat /home/justin/pillpal/servo_positions.json
   ```
   Should show: `{"servo1": 60.0}` or `{"servo1": 90.0}`

### Test 2: Power Off Test
1. Dispense a few times (get to 60° or 90°)
2. **Stop the server:** Press `Ctrl+C` in the terminal
3. **Turn off the Pi completely** (unplug power)
4. **Turn Pi back on**
5. **Start server again:**
   ```bash
   cd /home/justin/pillpal
   python3 pi_websocket_server.py
   ```
6. **Check the logs** - should see:
   ```
   📊 Restoring servo1 to saved position: 60.0 degrees
   💡 Servo was at 60.0° before Pi was turned off
   ✅ Servo1 restored to 60.0 degrees (from saved file)
   ```
7. **Servo should physically move back to 60°** (not stay at 0°)

## Step 5: Test 30-Degree Rotation

1. **Dispense 1st time:** Should go from 0° → 30°
2. **Dispense 2nd time:** Should go from 30° → 60°
3. **Dispense 3rd time:** Should go from 60° → 90°
4. **Dispense 4th time:** Should go from 90° → 120°
5. **Dispense 5th time:** Should go from 120° → 150° (no overshoot)
6. **Dispense 6th time:** Should go from 150° → 180°, then auto-reset to 0°

## Step 6: Check Logs

**Watch the server terminal for:**
- ✅ Movement confirmations
- ✅ Position saves: `💾 Saved positions: {'servo1': 60.0}`
- ✅ Position loads: `📂 Loaded saved positions: {'servo1': 60.0}`
- ❌ Any error messages

## Troubleshooting

### Server Won't Start
```bash
# Check Python version
python3 --version

# Check if dependencies are installed
pip3 list | grep websockets
pip3 list | grep adafruit

# Install if missing
pip3 install websockets adafruit-circuitpython-servokit
```

### Servo Not Moving
```bash
# Check if PCA9685 is detected
sudo i2cdetect -y 1
# Should show 0x40 (PCA9685 address)

# Check server logs for errors
# Look for "❌" messages in the terminal
```

### Position Not Saving
```bash
# Check if file exists
ls -lh /home/justin/pillpal/servo_positions.json

# Check file permissions
chmod 666 /home/justin/pillpal/servo_positions.json

# Check file contents
cat /home/justin/pillpal/servo_positions.json
```

### Web App Can't Connect
```bash
# Check if server is listening
sudo netstat -tlnp | grep 8765

# Check firewall
sudo ufw status

# Test connection locally
curl http://localhost:8765
```

---

## Quick Test Checklist

- [ ] Server starts without errors
- [ ] Web app shows "Connected" (green)
- [ ] Dispense button works
- [ ] Servo moves 30 degrees each time
- [ ] Servo2 moves to 90° after main dispense
- [ ] Confirmation dialog appears
- [ ] Position file is created: `/home/justin/pillpal/servo_positions.json`
- [ ] Position saves after each movement
- [ ] After power off/on, servo restores to saved position

---

## Run Server in Background (Optional)

**To run server in background so you can use the terminal:**
```bash
# Press Ctrl+Z to suspend
# Then:
bg

# Or use nohup:
nohup python3 /home/justin/pillpal/pi_websocket_server.py > server.log 2>&1 &

# View logs:
tail -f server.log
```

