# Manual Network Registration Guide

## Problem
Network is showing `+CREG: 0,0` (not registered) and SMS fails with "Network timeout".

## Quick Fix - Use Script

### Step 1: Copy script
```bash
scp C:\Users\Feitan\PillApp\pillpal\force_network_register.py justin@192.168.100.220:/home/justin/pillpal/
```

### Step 2: Run script
```bash
ssh justin@192.168.100.220
cd /home/justin/pillpal
sudo python3 force_network_register.py
```

This will automatically try to register with the network.

## Manual Method - Using minicom

### Step 1: Connect with minicom
```bash
sudo minicom -D /dev/ttyS0 -b 115200
```

### Step 2: Check current status
Type:
```
AT+CREG?
```

**Expected responses:**
- `+CREG: 0,0` = Not registered, searching ❌
- `+CREG: 0,1` = Registered on HOME network ✅
- `+CREG: 0,2` = Registered on ROAMING network ✅

### Step 3: Enable registration notifications
Type:
```
AT+CREG=2
```

This enables automatic registration. Wait 10-30 seconds, then check:
```
AT+CREG?
```

### Step 4: If still not registered, try automatic selection
Type:
```
AT+COPS=0
```

This forces automatic network selection. Wait 30-60 seconds, then check:
```
AT+CREG?
```

### Step 5: If automatic fails, register manually with Globe

#### First, search for available networks:
Type:
```
AT+COPS=?
```

This will show all available networks. Look for Globe or network codes like 51502, 51503, 51505.

#### Then register manually:
Type:
```
AT+COPS=1,2,"51502"
```

(Replace 51502 with the Globe network code from step 5)

Wait 10-30 seconds, then check:
```
AT+CREG?
```

**Globe network codes (Philippines):**
- `51502` = Globe Telecom
- `51503` = Globe Telecom (alternate)
- `51505` = Globe Telecom (alternate)

### Step 6: Check signal strength
Type:
```
AT+CSQ
```

**Response meanings:**
- `+CSQ: 0,0` = No signal ❌
- `+CSQ: 99,0` = Unknown/Not detectable ❌
- `+CSQ: 15,0` = Weak signal (15/31) ⚠️
- `+CSQ: 25,0` = Good signal (25/31) ✅

**If signal is 0 or 99:**
- Check antenna connection
- Move to better location (near window)
- Wait longer (signal can take time to stabilize)

### Step 7: Exit minicom
- Press `Ctrl+A`
- Then press `X`
- Press `Enter` to confirm

## Troubleshooting

### If network won't register:

1. **Check signal strength**:
   ```
   AT+CSQ
   ```
   - If 0 or 99: No signal - check antenna, move location
   - If < 10: Very weak - move to better location

2. **Check SIM card**:
   ```
   AT+CPIN?
   ```
   - Should show: `+CPIN: READY`
   - If shows PIN required: Unlock with `AT+CPIN="1234"`

3. **Power cycle module**:
   - Unplug USB
   - Wait 5 seconds
   - Plug back in
   - Wait 30 seconds
   - Try registration again

4. **Wait longer**:
   - Some modules need 1-2 minutes to register
   - Be patient and check again

5. **Check SIM service**:
   - Verify SIM card has active service
   - Test SIM in a phone first
   - Check if account is active

### If signal is 99 (unknown):

Signal 99 means "unknown/not detectable" - this is bad. It means:
- Module can't detect signal
- Antenna might not be connected
- Module might not be getting proper power
- Location might have no signal

**Fix:**
1. Check antenna connection
2. Move to better location
3. Check USB power (try different USB port)
4. Wait longer (signal detection can take time)

## After Registration

Once registered, you should see:
```
AT+CREG?
+CREG: 0,1
OK
```

Or:
```
AT+CREG?
+CREG: 0,2
OK
```

Then test SMS again:
```bash
sudo python3 test_sms_send.py
```

## Quick Command Reference

```
AT              # Test communication
AT+CPIN?        # Check SIM card
AT+CSQ          # Check signal strength
AT+CREG?        # Check registration status
AT+CREG=2       # Enable registration notifications
AT+COPS=0       # Automatic network selection
AT+COPS=1,2,"51502"  # Manual registration with Globe
AT+COPS=?       # List available networks
```

