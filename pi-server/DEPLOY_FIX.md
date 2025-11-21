# Deploy 5th Rotation Fix to Raspberry Pi

## Quick Deploy Steps

### Step 1: Find Your Pi's IP Address (if needed)

**On your Raspberry Pi, run:**
```bash
hostname -I
```
or
```bash
ip addr show
```

**Or check your router's connected devices list.**

### Step 2: Copy Updated File to Pi

**From your Windows computer, run this command:**

```powershell
# Replace 192.168.100.68 with your Pi's actual IP address
# Replace justin with your Pi username if different

scp -o KexAlgorithms=+diffie-hellman-group1-sha1 -o HostKeyAlgorithms=+ssh-dss pi_websocket_server_PCA9685.py justin@192.168.100.68:/home/justin/pillpal/pi_websocket_server.py
```

**Or if you're in the pi-server folder:**
```powershell
cd PillApp\pillpal\pi-server
scp -o KexAlgorithms=+diffie-hellman-group1-sha1 -o HostKeyAlgorithms=+ssh-dss pi_websocket_server_PCA9685.py justin@192.168.100.68:/home/justin/pillpal/pi_websocket_server.py
```

**You'll be prompted for the password** (type it and press Enter).

### Step 3: SSH to Pi and Stop Old Server

**SSH to your Pi:**
```bash
ssh justin@192.168.100.68
```

**Find and stop any running server:**
```bash
# Find the process
ps aux | grep python3 | grep websocket

# Kill it (replace PID with the number you see)
kill PID_NUMBER

# Or kill all Python websocket processes
pkill -f "pi_websocket_server"

# Or if running as a service:
sudo systemctl stop pillpal-server
```

### Step 4: Verify File Was Copied

**On the Pi, check the file:**
```bash
ls -lh /home/justin/pillpal/pi_websocket_server.py
cat /home/justin/pillpal/pi_websocket_server.py | head -20
```

**You should see the updated code with the 5th rotation fix.**

### Step 5: Start the New Server

**On the Pi, run:**
```bash
cd /home/justin/pillpal
python3 pi_websocket_server.py
```

**You should see:**
```
PillPal WebSocket Server Starting...
Listening on 0.0.0.0:8765
Servo positions will be maintained (not reset)
WebSocket server running on ws://0.0.0.0:8765
```

### Step 6: Test the Fix

1. **Test 5th rotation (120° → 150°):**
   - Dispense 4 times to reach 120°
   - Dispense 5th time - should stop exactly at 150° (not overshoot)

2. **Test 6th rotation (150° → 180°):**
   - After 5th dispense, dispense 6th time
   - Should reach exactly 180° (not stop short)

3. **Test auto-reset:**
   - After 6th dispense (at 180°), it should automatically reset to 0°

### Step 7: Run in Background (Optional)

**To run the server in the background:**
```bash
# Press Ctrl+Z to suspend, then:
bg

# Or use nohup:
nohup python3 /home/justin/pillpal/pi_websocket_server.py > /home/justin/pillpal/server.log 2>&1 &
```

**To check if it's running:**
```bash
ps aux | grep pi_websocket_server
```

**To view logs:**
```bash
tail -f /home/justin/pillpal/server.log
```

---

## What the Fix Does

✅ **5th Rotation (120° → 150°):**
- Uses conservative pulse width (2350 instead of 2400) to prevent overshoot
- Adds correction step to snap exactly to 150°

✅ **6th Rotation (150° → 180°):**
- Restores full pulse width (2400) to reach exactly 180°
- Should now reach full 180° without stopping short

✅ **Auto-Reset:**
- After reaching 180°, automatically resets to 0° immediately

---

## Troubleshooting

**If file copy fails:**
- Check Pi IP address is correct
- Check username is correct (justin)
- Check Pi is on same network
- Try using WinSCP or FileZilla instead

**If server won't start:**
- Check Python version: `python3 --version`
- Install dependencies: `pip3 install websockets adafruit-circuitpython-servokit`
- Check file permissions: `chmod +x /home/justin/pillpal/pi_websocket_server.py`

**If servo still overshoots:**
- Check servo calibration in code (lines 250-292)
- May need to adjust pulse width values (2350, 2400)
- Check servo hardware connections

---

## Summary

The fix adds special handling for the 5th rotation to prevent overshoot, ensuring the 6th rotation can reach exactly 180°. Deploy and test! 🎉




