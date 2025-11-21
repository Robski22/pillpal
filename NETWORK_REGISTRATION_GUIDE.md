# Network Registration Guide for SIMCOM Module

## Understanding Network Registration

Network registration means your SIMCOM module is connected to your carrier's cellular network (like Globe). Without registration, SMS will NOT work.

## How to Check Registration Status

### Method 1: Using the Test Script (Recommended)

```bash
# Copy script to Pi
scp C:\Users\Feitan\PillApp\pillpal\test_network_registration.py justin@192.168.100.220:/home/justin/pillpal/

# Run on Pi
ssh justin@192.168.100.220
cd /home/justin/pillpal
sudo python3 test_network_registration.py
```

This script will:
- Check current registration status
- Show signal strength
- Show network operator
- Try to register automatically if not registered
- Try manual registration with Globe if needed

### Method 2: Using AT Commands Directly

#### Connect with minicom:
```bash
sudo minicom -D /dev/ttyS0 -b 115200
```

#### Check registration status:
```
AT+CREG?
```

**Response meanings:**
- `+CREG: 0,0` = Not registered, searching
- `+CREG: 0,1` = Registered on HOME network ✅
- `+CREG: 0,2` = Registered on ROAMING network ✅
- `+CREG: 0,3` = Registration denied ❌
- `+CREG: 0,4` = Unknown ❌
- `+CREG: 0,5` = Registered (roaming) ✅

#### Check signal strength:
```
AT+CSQ
```

**Response:** `+CSQ: 25,0`
- First number (25) = Signal strength (0-31)
- 0 = No signal
- 1-10 = Very weak
- 11-20 = Weak
- 21-31 = Good

#### Check network operator:
```
AT+COPS?
```

**Response:** `+COPS: 0,0,"Globe"` = Connected to Globe

## How to Register Network

### Automatic Registration (Recommended)

The module should register automatically, but you can force it:

```
AT+CREG=2
```

This enables automatic registration. Wait 10-30 seconds, then check:
```
AT+CREG?
```

### Manual Registration (If Automatic Fails)

#### Step 1: Search for available networks:
```
AT+COPS=?
```

This will show all available networks. Look for Globe.

#### Step 2: Register with Globe manually:
```
AT+COPS=1,2,"51502"
```

Globe network codes:
- `51502` = Globe Telecom
- `51503` = Globe Telecom (alternate)
- `51505` = Globe Telecom (alternate)

Wait 10-30 seconds, then check:
```
AT+CREG?
```

## Common Issues and Fixes

### Issue 1: Not Registered (Status 0)

**Symptoms:**
- `AT+CREG?` shows `+CREG: 0,0`
- No network operator shown

**Fixes:**
1. **Check signal strength**:
   ```
   AT+CSQ
   ```
   If signal is 0 or very low (< 10), move to better location or check antenna

2. **Wait longer**:
   - Some modules need 1-2 minutes to register
   - Wait and check again

3. **Power cycle**:
   - Unplug USB
   - Wait 5 seconds
   - Plug back in
   - Wait 30 seconds
   - Check registration again

4. **Check SIM card**:
   ```
   AT+CPIN?
   ```
   Should show `+CPIN: READY`

5. **Try manual registration** (see above)

### Issue 2: Registration Denied (Status 3)

**Symptoms:**
- `AT+CREG?` shows `+CREG: 0,3`

**Fixes:**
1. **Check SIM card service**:
   - Verify SIM card has active service
   - Check if account is active
   - Test SIM in a phone first

2. **Check SIM card lock**:
   ```
   AT+CPIN?
   ```
   If shows `SIM PIN`, unlock it:
   ```
   AT+CPIN="1234"
   ```
   (Replace 1234 with your PIN)

### Issue 3: Weak Signal (Slow Network)

**Symptoms:**
- Signal strength < 15
- Network is slow

**Fixes:**
1. **Move to better location**:
   - Near a window
   - Higher location
   - Away from interference

2. **Check antenna**:
   - Make sure antenna is connected
   - Try different antenna
   - Check antenna connector

3. **Wait for better signal**:
   - Signal can vary throughout the day
   - Check at different times

4. **Check carrier coverage**:
   - Verify Globe has good coverage in your area
   - Check coverage map

### Issue 4: Registered but SMS Not Working

**Symptoms:**
- Network is registered
- But SMS sending fails

**Fixes:**
1. **Check SMS service center**:
   ```
   AT+CSCA?
   ```
   Should show Globe's SMS center number

2. **Set SMS text mode**:
   ```
   AT+CMGF=1
   ```

3. **Test SMS sending**:
   ```
   AT+CMGS="+639123456789"
   > Test message
   ```
   (Press Ctrl+Z to send)

## AT Commands Reference

### Registration Commands:
```
AT+CREG?              # Check registration status
AT+CREG=2             # Enable automatic registration
AT+COPS?               # Check current operator
AT+COPS=?              # List available operators
AT+COPS=1,2,"51502"   # Manually register with Globe
```

### Signal Commands:
```
AT+CSQ                 # Check signal strength
```

### SIM Card Commands:
```
AT+CPIN?               # Check SIM card status
AT+CPIN="1234"         # Enter PIN (if locked)
```

### SMS Commands:
```
AT+CMGF=1              # Set SMS text mode
AT+CSCA?               # Check SMS service center
AT+CMGS="+639123456789" # Send SMS
```

## For Globe SIM Specifically

Globe is a Philippine carrier. Common issues:

1. **Network codes**:
   - Primary: `51502`
   - Alternate: `51503`, `51505`

2. **SMS service center**:
   - Usually: `+639170000130` or `+639170000131`
   - Check with: `AT+CSCA?`

3. **Registration time**:
   - Globe can take 30-60 seconds to register
   - Be patient, wait and check again

4. **Signal in Philippines**:
   - Signal can be weak in some areas
   - Try different locations
   - Check Globe coverage map

## Quick Registration Test

Run this quick test:

```bash
# On Raspberry Pi
sudo minicom -D /dev/ttyS0 -b 115200
```

Then type:
```
AT
AT+CPIN?
AT+CSQ
AT+CREG?
AT+COPS?
```

**Expected results:**
- `AT` → `OK`
- `AT+CPIN?` → `+CPIN: READY`
- `AT+CSQ` → `+CSQ: 20,0` (or higher)
- `AT+CREG?` → `+CREG: 0,1` or `+CREG: 0,2` (registered)
- `AT+COPS?` → `+COPS: 0,0,"Globe"`

If all show good results, network is registered and ready for SMS!

## Integration with Server

The server automatically checks registration at startup. Look for these logs:

```
📱 Connecting to SIMCOM module at /dev/ttyS0...
✅ Connected at 115200 baud
✅ SIM card detected and ready
📶 Signal strength: 20/31
✅ Network registered: HOME
✅ SIMCOM module initialized: SIM=Inserted, Signal=20
```

If you see "Not registered" in logs, run the network registration test script to fix it.

