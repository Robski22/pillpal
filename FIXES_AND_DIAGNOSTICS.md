# Fixes Applied and Diagnostics Guide

## ✅ Fixes Applied

### 1. GPIO Initialization (FIXED)
- **Problem**: GPIO.setmode was being called multiple times in different controllers, causing conflicts
- **Fix**: GPIO.setmode(GPIO.BCM) is now called ONCE globally before all controllers initialize
- **Location**: Line ~1272, before controller initialization

### 2. Buzzer (FIXED)
- **Problem**: GPIO mode might not be set when buzzer initializes
- **Fix**: Added GPIO.setmode check in buzzer setup, plus global initialization
- **Function**: `sound_dispense_notification()` - called on every dispense
- **Pattern**: 1s ON, 1s OFF x3 (6 seconds total)

### 3. LEDs (FIXED)
- **Problem**: GPIO mode might not be set when LEDs initialize
- **Fix**: Added GPIO.setmode check in LED setup, plus global initialization
- **Pins**: GPIO27 (Level 1), GPIO22 (Level 2)

### 4. SMS (FIXED)
- **Problem**: "AT+CMGF=1" appearing in messages, sender name wrong
- **Fix**: 
  - Properly handles AT command responses
  - Clears buffers before sending message
  - Waits for ">" prompt before sending message
  - Attempts to set sender name to "PillPal"

### 5. LCD (FIXED)
- **Problem**: Might fail silently
- **Fix**: Added better error logging and traceback
- **Initialization**: Called on startup, updates periodically every 60 seconds

## 🔍 Diagnostics - What to Check

### Check Server Logs on Startup

When you start the server, you should see:

```
✅ GPIO mode set to BCM (initialized once)
✅ LEDs initialized: GPIO27 (Level 1), GPIO22 (Level 2)
🔔 Buzzer initialized on GPIO17
✅ LCD initialized successfully
📱 SIMCOM module initialized: SIM=Inserted, Signal=25
✅ GPIO26 button initialized (pin 26)
```

### If Buzzer Doesn't Work:

1. **Check if GPIO17 is initialized:**
   - Look for: `🔔 Buzzer initialized on GPIO17`
   - If missing: Check wiring (GPIO17 to buzzer +, GND to buzzer -)

2. **Check if buzzer is called:**
   - When dispense happens, look for: `🔔 Buzzer: Starting dispense notification`
   - If missing: Buzzer function not being called

3. **Check GPIO mode:**
   - Look for: `✅ GPIO mode set to BCM (initialized once)`
   - If missing: GPIO not initialized

4. **Check for errors:**
   - Look for: `❌ Error setting up buzzer:`
   - This will show the exact error

### If LEDs Don't Work:

1. **Check if LEDs are initialized:**
   - Look for: `✅ LEDs initialized: GPIO27 (Level 1), GPIO22 (Level 2)`
   - If missing: Check wiring

2. **Check if LEDs are updated:**
   - When dispense happens, look for: `💡 LED Level 1 (GPIO27) ON - Position: X°`
   - If missing: LED update function not being called

3. **Check GPIO mode:**
   - Same as buzzer - GPIO mode must be set

4. **Check for errors:**
   - Look for: `❌ Error setting up LEDs:`

### If SMS Doesn't Work:

1. **Check if SIMCOM is initialized:**
   - Look for: `📱 SIMCOM module initialized: SIM=Inserted, Signal=X`
   - If shows "Not found": Check USB connection, try different port

2. **Check serial port:**
   - Default: `/dev/ttyUSB0`
   - If not found, tries: `/dev/ttyUSB1`, `/dev/ttyAMA0`, `/dev/ttyS0`
   - Check logs for: `📱 Connecting to SIMCOM module at /dev/ttyUSB0...`

3. **Check SIM card:**
   - Look for: `✅ SIM card detected and ready`
   - If shows "Not detected": Check SIM card insertion

4. **Check signal strength:**
   - Look for: `📶 Signal strength: X/31`
   - If 0: No signal, SMS will fail

5. **Check when sending SMS:**
   - Look for: `📤 Sending SMS to +63...`
   - Then: `✅ SMS sent successfully to +63...`
   - If error: Check phone number format

### If LCD Doesn't Work:

1. **Check if LCD is initialized:**
   - Look for: `✅ LCD initialized successfully`
   - If shows "Failed to initialize LCD": Check I2C connection

2. **Check I2C address:**
   - Default: `0x27`
   - Look for: `🔧 Initializing I2C LCD at address 0x27...`

3. **Check if LCD updates:**
   - Look for: `📅 LCD: Updated with X schedule(s)`
   - Then: `📺 LCD: MM/DD HH:MM AM/PM - Morning`

4. **Check periodic updates:**
   - LCD updates every 60 seconds
   - Look for periodic log messages

5. **Check for errors:**
   - Look for: `❌ Failed to initialize LCD:`
   - This will show the exact error

## 🛠️ Common Issues and Solutions

### Issue: "GPIO not available"
**Solution**: Install RPi.GPIO: `pip3 install RPi.GPIO`

### Issue: "pyserial not available"
**Solution**: Install pyserial: `pip3 install pyserial`

### Issue: "LCD not found"
**Solution**: 
- Check I2C is enabled: `sudo raspi-config` → Interface Options → I2C → Enable
- Check I2C address: `i2cdetect -y 1` (should show 0x27)

### Issue: "SIMCOM module not found"
**Solution**:
- Check USB connection
- Check if device appears: `ls -l /dev/ttyUSB*`
- Try different port in code: Change `serial_port='/dev/ttyUSB0'` to `/dev/ttyUSB1`

### Issue: "SIM card not detected"
**Solution**:
- Check SIM card is inserted correctly
- Check SIM card is not locked (PIN/PUK)
- Try removing and reinserting SIM card

### Issue: "No signal"
**Solution**:
- Check antenna connection
- Move to area with better signal
- Check SIM card has active service

## 📋 Startup Checklist

When starting the server, verify:

- [ ] GPIO mode set: `✅ GPIO mode set to BCM`
- [ ] LEDs initialized: `✅ LEDs initialized`
- [ ] Buzzer initialized: `🔔 Buzzer initialized on GPIO17`
- [ ] LCD initialized: `✅ LCD initialized successfully`
- [ ] SIMCOM initialized: `📱 SIMCOM module initialized`
- [ ] Button initialized: `✅ GPIO26 button initialized`
- [ ] Server running: `WebSocket server running on ws://0.0.0.0:8765`

## 🧪 Test Each Component

### Test Buzzer:
1. Click "Dispense" in web app
2. Should hear: 1s beep, 1s pause, repeat 3 times
3. Check logs: `🔔 Buzzer: Starting dispense notification`

### Test LEDs:
1. Click "Dispense" multiple times
2. LED should turn ON based on servo1 angle:
   - GPIO27 ON: 0°-120° (5+ dispenses remaining)
   - GPIO22 ON: 150°-180° (2 or fewer dispenses remaining)
3. Check logs: `💡 LED Level X (GPIOXX) ON - Position: X°`

### Test SMS:
1. Make sure phone number is set in profile
2. Click "Dispense"
3. Check phone for SMS
4. Check logs: `📤 Sending SMS to +63...` → `✅ SMS sent successfully`

### Test LCD:
1. Add a medication schedule
2. LCD should show: `MM/DD HH:MM AM/PM` on line 1, `Morning/Afternoon/Evening` on line 2
3. When dispensing: Should show `DISPENSING`
4. Check logs: `📺 LCD: MM/DD HH:MM AM/PM - Morning`

## 📝 File to SCP

```bash
scp C:\Users\Feitan\PillApp\pillpal\pi-server\pi_websocket_server_PCA9685.py justin@192.168.100.220:/home/justin/pillpal/
```

## 🔄 Restart Server

```bash
ssh justin@192.168.100.220
cd /home/justin/pillpal
pkill -f pi_websocket_server_PCA9685.py
python3 pi_websocket_server_PCA9685.py
```

## 📊 What the Code Does

The server file handles:
1. **Servo Control**: Servo1 (progressive dispense), Servo2 (medicine dispense)
2. **Buzzer**: GPIO17, sounds on dispense (1s ON, 1s OFF x3)
3. **SMS**: SIMCOM module, sends SMS notifications
4. **LCD**: I2C display, shows schedules and status
5. **LEDs**: GPIO27/GPIO22, level indicators
6. **Button**: GPIO26, force dispense
7. **WebSocket**: Port 8765, communicates with web app

All components are initialized on startup and should work independently.

