# Testing SMS and Buzzer Functionality

## Files to SCP to Raspberry Pi

### 1. Main Server File
```bash
scp C:\Users\Feitan\PillApp\pillpal\pi-server\pi_websocket_server_PCA9685.py justin@192.168.100.220:/home/justin/pillpal/
```

### 2. Restart Server
```bash
ssh justin@192.168.100.220
cd /home/justin/pillpal
pkill -f pi_websocket_server_PCA9685.py
python3 pi_websocket_server_PCA9685.py
```

## SQL Queries Needed

**No SQL queries needed** - All functionality is in the server code.

## Testing Buzzer (GPIO17)

### 1. Check Buzzer Wiring
- **Buzzer positive (+)**: Connect to GPIO17
- **Buzzer negative (-)**: Connect to GND
- **Note**: If using a 5V buzzer, you may need a transistor circuit (see BUZZER_WIRING_GUIDE.md)

### 2. Test Buzzer Manually
```bash
ssh justin@192.168.100.220
python3 -c "import RPi.GPIO as GPIO; import time; GPIO.setmode(GPIO.BCM); GPIO.setup(17, GPIO.OUT); GPIO.output(17, GPIO.HIGH); time.sleep(1); GPIO.output(17, GPIO.LOW); GPIO.cleanup(); print('Beep!')"
```

### 3. Expected Behavior
When you click "Dispense" in the web app:
- ✅ Buzzer should sound: **1 second ON, 1 second OFF, repeat 3 times** (total 6 seconds)
- ✅ This happens **before** the "Yes/No" confirmation dialog appears
- ✅ Check server logs for: `🔔 Buzzer: Starting dispense notification`

### 4. Check Server Logs
```bash
# Watch server logs in real-time
# You should see:
🔔 Buzzer: Starting dispense notification (1s ON, 1s OFF x3)
🔔 Buzzer: ON (beep 1/3)
🔔 Buzzer: OFF (pause 1/3)
🔔 Buzzer: ON (beep 2/3)
🔔 Buzzer: OFF (pause 2/3)
🔔 Buzzer: ON (beep 3/3)
🔔 Buzzer: Notification complete
```

## Testing SMS (SIMCOM Module)

### 1. Check SIMCOM Module Connection
```bash
ssh justin@192.168.100.220
# Check if SIMCOM module is detected
ls -l /dev/ttyUSB*
# Should see /dev/ttyUSB0 or /dev/ttyUSB1
```

### 2. Install pyserial (if not already installed)
```bash
pip3 install pyserial
```

### 3. Check Server Logs on Startup
When server starts, look for:
```
✅ SIMCOM module initialized: SIM=Inserted, Signal=25
📱 Connecting to SIMCOM module at /dev/ttyUSB0...
✅ SIM card detected and ready
📶 Signal strength: 25/31
```

### 4. Test SMS Sending

#### Method 1: Via Web App (Automatic)
1. Make sure your profile has a phone number set
2. Click "Dispense" on any medication
3. SMS should be sent **before** the confirmation dialog appears
4. Check server logs for:
   ```
   📤 Sending SMS to +639171234567...
   ✅ SMS sent successfully to +639171234567
   ```

#### Method 2: Manual Test via WebSocket
You can test SMS manually by opening browser console and running:
```javascript
// Connect to Pi first
await connectToPi()

// Send test SMS
const result = await sendSmsViaPi(['09171234567'], 'Test message from PillPal')
console.log('SMS result:', result)
```

#### Method 3: Check SIMCOM Status
In browser console:
```javascript
// This will be added to the WebSocket handler
// For now, check server logs for SIMCOM status on startup
```

### 5. Verify SMS Received
- ✅ Check your phone for the SMS message
- ✅ Message format: "The [medicines] for [timeframe] is/are ready to dispense."
- ✅ Example: "The Aspirin for Morning is ready to dispense."

### 6. Troubleshooting SMS

#### No SIM detected:
```bash
# Check server logs for:
⚠️ SIM card not detected
# Or:
❌ SIM card is locked (PUK required)
```

**Solutions:**
- Check SIM card is inserted correctly
- Check SIM card is not locked (PIN/PUK)
- Try removing and reinserting SIM card

#### No signal:
```bash
# Check server logs for:
⚠️ Signal strength: Unknown/Not detectable
# Or signal_strength: 0
```

**Solutions:**
- Check antenna is connected
- Move to area with better coverage
- Check SIM card has active service

#### SMS not sending:
```bash
# Check server logs for:
❌ Error sending SMS to +639171234567
```

**Solutions:**
- Verify phone number format (should start with +63 or 0)
- Check SIM has load/credit
- Check signal strength (should be > 0)
- Verify phone number is correct in profile

#### Module not found:
```bash
# Check server logs for:
⚠️ SIMCOM module not found. SMS functionality disabled.
```

**Solutions:**
- Check USB connection
- Check permissions: `sudo chmod 666 /dev/ttyUSB0`
- Try different port: Change `serial_port` in code to `/dev/ttyUSB1` or `/dev/ttyAMA0`
- Check if module is detected: `ls -l /dev/ttyUSB*`

## Expected Behavior Summary

### When Dispensing Medication:

1. **Servo1 moves** to target angle
2. **Buzzer sounds** (1s ON, 1s OFF x3 = 6 seconds total) ← **NEW**
3. **SMS is sent** to user's phone number ← **NEW**
4. **"Yes/No" confirmation dialog** appears
5. If "Yes": Servo2 moves, medicine dispensed
6. If "No": Dialog reappears after 1 minute

### SMS Message Format:
- **Single medicine**: "The Aspirin for Morning is ready to dispense."
- **Multiple medicines**: "The Aspirin, Paracetamol for Afternoon are ready to dispense."

## Quick Test Checklist

- [ ] Server file copied to Raspberry Pi
- [ ] Server restarted
- [ ] Buzzer wired to GPIO17 and GND
- [ ] SIMCOM module connected and detected
- [ ] SIM card inserted and detected
- [ ] Signal strength > 0
- [ ] Phone number set in user profile
- [ ] Test dispense - buzzer sounds
- [ ] Test dispense - SMS received
- [ ] Check server logs for any errors

## Demo Mode

If you want to test without hardware:
- Set `demo_mode=True` in server initialization
- Buzzer and SMS will log messages but not actually run
- Useful for testing the flow without hardware

