# SIMCOM Module Test Instructions

## Quick Test - Run This First

### Step 1: Copy test script to Raspberry Pi
```bash
scp C:\Users\Feitan\PillApp\pillpal\test_simcom_comprehensive.py justin@192.168.100.220:/home/justin/pillpal/
```

### Step 2: SSH into Raspberry Pi
```bash
ssh justin@192.168.100.220
cd /home/justin/pillpal
```

### Step 3: Run the test script
```bash
python3 test_simcom_comprehensive.py
```

**Note**: If you get a permission error, try:
```bash
sudo python3 test_simcom_comprehensive.py
```

## What the Test Checks

1. **SIMCOM Module Detection**: Finds the USB serial port
2. **Module Communication**: Tests AT command response
3. **SIM Card Status**: Checks if SIM is inserted and ready
4. **Network Registration**: Verifies connection to cellular network
5. **Signal Strength**: Measures signal quality (0-31)
6. **Network Operator**: Shows which carrier you're connected to
7. **SMS Configuration**: Verifies SMS text mode is enabled
8. **Service Center**: Checks SMS service center number

## Expected Output

### ✅ All Good:
```
==================================================
FINAL SUMMARY
==================================================
Port: /dev/ttyUSB0
SIM Card Status: READY
Network Registration: HOME
Signal Strength: 25/31 (GOOD)
Network Operator: Your Carrier Name

✅ ALL CHECKS PASSED - SIMCOM is ready for SMS!
```

### ❌ Problems Found:
```
==================================================
FINAL SUMMARY
==================================================
Port: /dev/ttyUSB0
SIM Card Status: PIN_REQUIRED
Network Registration: SEARCHING
Signal Strength: 0/31 (NO_SIGNAL)
Network Operator: Unknown

❌ SIM CARD: Not ready - SMS will NOT work!
❌ NETWORK: Not registered - SMS will NOT work!
❌ SIGNAL: No signal - SMS will NOT work!
⚠️ SOME CHECKS FAILED - Fix issues above before using SMS
```

## Troubleshooting

### If SIMCOM Module Not Found:
1. **Check USB connection**:
   ```bash
   ls -l /dev/ttyUSB*
   ```
   Should show `/dev/ttyUSB0` or similar

2. **Check if module is powered**:
   - LED on SIMCOM module should be on
   - Check power supply connection

3. **Try different USB port**:
   - Unplug and replug USB cable
   - Try different USB port on Pi

### If SIM Card Not Ready:
1. **SIM requires PIN**:
   - Remove SIM card and check if it has PIN lock
   - If PIN is set, you need to unlock it first
   - Use: `AT+CPIN="1234"` (replace 1234 with your PIN)

2. **SIM not inserted**:
   - Remove and reinsert SIM card
   - Make sure SIM card is properly seated

3. **Test SIM in phone first**:
   - Verify SIM card works in a phone
   - Make sure SIM has active service

### If Network Not Registered:
1. **Wait a bit**:
   - Module may need time to register
   - Run test again after 30 seconds

2. **Check antenna**:
   - Make sure antenna is connected
   - Try moving to area with better signal

3. **Check SIM service**:
   - Verify SIM card has active cellular service
   - Check if account is active

### If Signal = 0:
1. **Check antenna connection**:
   - Antenna must be connected
   - Check antenna connector

2. **Move to better location**:
   - Try near a window
   - Move away from interference

3. **Check SIM service**:
   - Verify SIM has active service
   - Check account status with carrier

## Manual AT Commands (Advanced)

If you want to test manually using `minicom`:

### Install minicom:
```bash
sudo apt-get update
sudo apt-get install minicom
```

### Connect to SIMCOM:
```bash
sudo minicom -D /dev/ttyUSB0 -b 9600
```

### Useful AT Commands:
```
AT              # Test communication (should respond: OK)
AT+CPIN?        # Check SIM status (should show: +CPIN: READY)
AT+CREG?        # Check network registration
AT+CSQ          # Check signal strength
AT+COPS?        # Get network operator
AT+CMGF?        # Check SMS mode
AT+CSCA?        # Get service center number
```

### Exit minicom:
- Press `Ctrl+A`, then `X`, then `Enter`

## Next Steps

After running the test:

1. **If all checks pass**: SIMCOM is ready! You can use SMS functionality.

2. **If checks fail**: Fix the issues shown in the summary:
   - SIM card issues → Fix SIM card
   - Network issues → Check antenna and location
   - Signal issues → Improve signal reception

3. **Test SMS sending**: Once all checks pass, you can test sending an SMS from the web app.

## Integration with Server

The main server (`pi_websocket_server_PCA9685.py`) automatically checks SIMCOM status at startup. Look for these logs:

```
📱 Connecting to SIMCOM module at /dev/ttyUSB0...
✅ SIM card detected and ready
📶 Signal strength: 25/31
✅ SIMCOM module initialized: SIM=Inserted, Signal=25
```

If you see errors in server logs, run this test script to diagnose the issue.

