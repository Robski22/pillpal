# Check Server Status - What's Working

## Step 1: Make Sure You Have Latest Server File

### Copy latest server file to Raspberry Pi:
```bash
scp C:\Users\Feitan\PillApp\pillpal\pi-server\pi_websocket_server_PCA9685.py justin@192.168.100.220:/home/justin/pillpal/
```

## Step 2: Stop Old Server (if running)

```bash
ssh justin@192.168.100.220
cd /home/justin/pillpal
pkill -f pi_websocket_server_PCA9685.py
sleep 2
```

## Step 3: Start Server and Watch Logs

```bash
cd /home/justin/pillpal
python3 pi_websocket_server_PCA9685.py
```

## Step 4: Check Startup Logs

When the server starts, look for these messages:

### ✅ GPIO Initialization
```
✅ GPIO mode set to BCM (initialized once)
```

### ✅ Servo Controller
```
✅ Servo positions will be maintained (not reset)
```

### ✅ SMS Controller (SIMCOM)
```
📱 Connecting to SIMCOM module at /dev/ttyUSB0...
✅ SIM card detected and ready
📶 Signal strength: X/31
✅ SIMCOM module initialized: SIM=Inserted, Signal=X
```
**OR if not working:**
```
⚠️ SIMCOM module not found. SMS functionality disabled.
❌ SIM card not inserted or not ready
```

### ✅ LCD Controller
```
🔧 Initializing I2C LCD at address 0x27...
✅ LCD initialized successfully
```
**OR if not working:**
```
❌ Failed to initialize LCD: [error message]
LCD will run in demo mode
```

### ✅ LED Controller
```
✅ LEDs initialized: GPIO27 (Level 1), GPIO22 (Level 2)
```

### ✅ Buzzer Controller
```
🔔 Buzzer initialized on GPIO17
```

### ✅ Button Monitor
```
✅ GPIO26 button initialized (pin 26)
🔘 Starting GPIO26 button monitoring...
```

### ✅ Server Started
```
==================================================
🚀 Starting PillPal Raspberry Pi Server
==================================================
📊 Initialization Status:
   - GPIO Available: True
   - PCA9685 Available: True
   - LCD Available: True/False
   - Serial Available: True/False
   - Servo Controller: Active
   - SMS Controller: Active/Demo
   - LCD Controller: Active/Demo
   - LED Controller: Active/Demo, Setup: True/False
   - Buzzer Controller: Active/Demo, Setup: True/False
==================================================
Listening on 0.0.0.0:8765
WebSocket server running on ws://0.0.0.0:8765
```

## Step 5: Test Each Component

### Test Servo (Should Work)
1. Open web app
2. Click "Dispense"
3. **Check logs for:**
   ```
   Dispensing [medication] via servo1
   ⚙️ Moving servo1...
   ✔ Servo servo1 moved to X°
   ```

### Test Buzzer
1. Click "Dispense"
2. **Check logs for:**
   ```
   🔔 Buzzer: Starting dispense notification (1s ON, 1s OFF x3)
   🔔 Buzzer: ON (beep 1/3)
   🔔 Buzzer: OFF (pause 1/3)
   ...
   🔔 Buzzer: Notification complete
   ```
3. **Listen**: Should hear 3 beeps (1s each)

### Test LEDs
1. Click "Dispense" multiple times
2. **Check logs for:**
   ```
   💡 LED Level 1 (GPIO27) ON - Position: X° (5+ dispenses remaining)
   ```
   OR
   ```
   💡 LED Level 2 (GPIO22) ON - Position: X° (2 or fewer dispenses remaining)
   ```
3. **Look**: LED should light up

### Test LCD
1. Add a medication schedule in web app
2. **Check logs for:**
   ```
   📅 LCD: Updated with X schedule(s)
   📺 LCD: MM/DD HH:MM AM/PM - Morning
   ```
3. **Look at LCD**: Should show date, time, and time frame

### Test SMS
1. Make sure phone number is set in profile
2. Click "Dispense"
3. **Check logs for:**
   ```
   📤 Sending SMS to +63...
   ✅ SMS sent successfully to +63...
   ```
   OR if not working:
   ```
   ❌ SIM card not inserted or not ready
   ❌ Failed to send SMS
   ```
4. **Check phone**: Should receive SMS

## Step 6: Summary - What's Working

After checking logs, make a list:

| Component | Status | Notes |
|-----------|--------|-------|
| Servo | ✅/❌ | Working/Not working |
| Buzzer | ✅/❌ | Logs show activity? Sound? |
| LEDs | ✅/❌ | Logs show activity? Light up? |
| LCD | ✅/❌ | Logs show activity? Display? |
| SMS | ✅/❌ | Logs show activity? Message sent? |

## Common Issues to Look For

### Buzzer: Logs show activity but no sound
- **Issue**: Hardware/wiring
- **Fix**: Check GPIO17 → Buzzer +, GND → Buzzer -

### LEDs: Logs show activity but no light
- **Issue**: Hardware/wiring
- **Fix**: Check GPIO27/GPIO22 → LED +, GND → LED -

### LCD: Logs show "demo mode" or errors
- **Issue**: I2C connection or permissions
- **Fix**: Check wiring, try `sudo`, check contrast

### SMS: Logs show "SIM not ready" or "Signal: 0"
- **Issue**: SIM card or signal
- **Fix**: Check SIM card insertion, antenna, signal strength

## Share Results

After running the server, share:
1. **Startup logs** - What initialized successfully?
2. **Component status** - Which ones work, which don't?
3. **Error messages** - Any errors in the logs?

This will help identify exactly what needs to be fixed!

