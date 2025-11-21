# SCP and Setup Instructions - Buzzer & SMS Fix

## Files to SCP

### 1. Main Server File (REQUIRED)
```bash
scp C:\Users\Feitan\PillApp\pillpal\pi-server\pi_websocket_server_PCA9685.py justin@192.168.100.220:/home/justin/pillpal/
```

**This is the ONLY file you need to copy.**

## What This File Does

The `pi_websocket_server_PCA9685.py` file is the **main server** that runs on your Raspberry Pi. It handles:

### 1. **Servo Control (Servo1 & Servo2)**
   - Controls servo motors via PCA9685 board
   - Servo1: Progressive dispense (30° increments, 0-180°)
   - Servo2: Medicine dispense (3° to 100° and back)
   - Saves positions to file (persists across reboots)

### 2. **Buzzer (GPIO17)** ← **NEW**
   - Sounds when dispense happens
   - Pattern: 1 second ON, 1 second OFF, repeat 3 times (6 seconds total)
   - Runs in background (doesn't block other functions)
   - Triggers automatically before confirmation dialog

### 3. **SMS via SIMCOM Module** ← **FIXED**
   - Sends SMS to user's phone number
   - **Fixed**: No more "AT+CMGF=1" in messages
   - **Fixed**: Sender name set to "PillPal"
   - Checks SIM card and signal strength
   - Sends before confirmation dialog appears

### 4. **LCD Display (I2C)**
   - Shows nearest scheduled time
   - Shows "DISPENSING" when medicine is dispensed
   - Shows "PillPal" when no schedules

### 5. **LED Indicators (GPIO27, GPIO22)**
   - Level 1 LED: ON when 5+ dispenses remaining
   - Level 2 LED: ON when 2 or fewer dispenses remaining

### 6. **Physical Button (GPIO26)**
   - Monitors button press (2 seconds = force dispense)
   - Sends notification to web app

### 7. **WebSocket Server**
   - Listens on port 8765
   - Receives commands from web app
   - Sends responses back to web app

## SQL Queries Needed

**NO SQL QUERIES NEEDED** - All functionality is in the server code.

## Setup Steps

### Step 1: Copy File to Raspberry Pi
```bash
scp C:\Users\Feitan\PillApp\pillpal\pi-server\pi_websocket_server_PCA9685.py justin@192.168.100.220:/home/justin/pillpal/
```

### Step 2: SSH into Raspberry Pi
```bash
ssh justin@192.168.100.220
```

### Step 3: Install pyserial (if not already installed)
```bash
pip3 install pyserial
```

### Step 4: Stop Old Server
```bash
pkill -f pi_websocket_server_PCA9685.py
```

### Step 5: Start New Server
```bash
cd /home/justin/pillpal
python3 pi_websocket_server_PCA9685.py
```

## What Was Fixed

### 1. SMS Message Fix
- **Problem**: "AT+CMGF=1" was appearing in SMS messages
- **Fix**: Properly handles AT command responses, clears buffers, waits for prompt before sending message
- **Result**: Clean messages without AT commands

### 2. Sender Name Fix
- **Problem**: Sender showed as "Iz Me" or "Itz Me"
- **Fix**: Attempts to set sender name to "PillPal" via phonebook
- **Note**: Sender name is usually controlled by carrier, but we try to set it

### 3. Buzzer Integration
- **Added**: BuzzerController class for GPIO17
- **Pattern**: 1s ON, 1s OFF, repeat 3 times (6 seconds)
- **Non-blocking**: Runs in background thread
- **Triggers**: Automatically on every dispense

## Testing

### Test Buzzer:
1. Click "Dispense" in web app
2. Buzzer should sound: 1s ON, 1s OFF x3
3. Check server logs: `🔔 Buzzer: Starting dispense notification`

### Test SMS:
1. Make sure phone number is set in profile
2. Click "Dispense" in web app
3. Check your phone - should receive SMS
4. **Message should be clean** (no "AT+CMGF=1")
5. **Sender should show as "PillPal"** (if carrier supports it)

### Check Server Logs:
```bash
# Look for these on startup:
✅ SIMCOM module initialized: SIM=Inserted, Signal=25
🔔 Buzzer initialized on GPIO17

# When dispensing:
🔔 Buzzer: Starting dispense notification
📤 Sending SMS to +639171234567...
✅ SMS sent successfully to +639171234567
```

## Troubleshooting

### SMS still shows "AT+CMGF=1":
- The fix should prevent this, but if it still happens:
- Check server logs for errors
- Try restarting the server
- Check SIMCOM module connection

### Sender name still not "PillPal":
- Sender name is usually controlled by your carrier
- The code tries to set it, but carriers may override it
- This is normal - not all carriers allow custom sender names

### Buzzer not working:
- Check wiring: GPIO17 to buzzer (+), GND to buzzer (-)
- Check server logs: `🔔 Buzzer initialized on GPIO17`
- Test manually (see TEST_SMS_AND_BUZZER.md)

## Summary

**File to SCP**: `pi_websocket_server_PCA9685.py`  
**SQL Queries**: None needed  
**What it does**: Controls servos, buzzer, SMS, LCD, LEDs, button, WebSocket server  
**Fixes**: SMS message format, sender name, buzzer integration

