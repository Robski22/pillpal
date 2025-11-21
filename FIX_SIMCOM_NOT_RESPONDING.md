# Fix SIMCOM Module Not Responding

## Problem
SIMCOM module is connected but not responding to AT commands. All responses are empty.

## Possible Causes
1. **Wrong baud rate** - Module might use 115200 instead of 9600
2. **Wrong port** - `/dev/ttyS0` might not be the correct port
3. **Module not initialized** - Needs more time to boot up
4. **Serial settings** - Wrong parity/stop bits
5. **Port permissions** - Need sudo access
6. **Module not powered** - Check power LED

## Solution 1: Run Diagnostic Tool

### Step 1: Copy diagnostic script
```bash
scp C:\Users\Feitan\PillApp\pillpal\test_simcom_diagnostic.py justin@192.168.100.220:/home/justin/pillpal/
```

### Step 2: Run diagnostic
```bash
ssh justin@192.168.100.220
cd /home/justin/pillpal
sudo python3 test_simcom_diagnostic.py
```

This will:
- Test all available serial ports
- Test different baud rates (9600, 115200, 57600, etc.)
- Find the working configuration
- Show you the correct port and baud rate

## Solution 2: Manual Testing

### Check what ports are available:
```bash
ls -l /dev/tty*
```

Look for:
- `/dev/ttyUSB0`, `/dev/ttyUSB1` (USB serial devices)
- `/dev/ttyAMA0` (GPIO serial)
- `/dev/ttyS0`, `/dev/ttyS1` (Hardware serial)

### Test with minicom (try different baud rates):

#### Install minicom:
```bash
sudo apt-get update
sudo apt-get install minicom
```

#### Test at 9600 baud:
```bash
sudo minicom -D /dev/ttyS0 -b 9600
```

In minicom, type:
```
AT
```

If you see "OK", it's working! Press `Ctrl+A` then `X` to exit.

#### Test at 115200 baud (common for SIMCOM):
```bash
sudo minicom -D /dev/ttyS0 -b 115200
```

Type `AT` and see if you get "OK".

#### Test other ports:
```bash
sudo minicom -D /dev/ttyUSB0 -b 115200
sudo minicom -D /dev/ttyUSB0 -b 9600
```

## Solution 3: Check Module Power and Connection

1. **Check power LED**:
   - SIMCOM module should have a power LED
   - LED should be ON if module is powered

2. **Check USB connection**:
   - Unplug and replug USB cable
   - Try different USB port on Raspberry Pi
   - Check USB cable (try different cable)

3. **Check if module is recognized**:
   ```bash
   dmesg | tail -20
   ```
   Look for USB device connection messages

4. **Check if port is in use**:
   ```bash
   sudo lsof | grep ttyS0
   sudo lsof | grep ttyUSB0
   ```
   If something is using the port, kill it:
   ```bash
   sudo pkill -f minicom
   sudo pkill -f python
   ```

## Solution 4: Update Server Code

Once you find the correct port and baud rate, update the server:

### If baud rate is different (e.g., 115200):

Edit `pi_websocket_server_PCA9685.py` and find:
```python
self.baudrate = 9600
```

Change to:
```python
self.baudrate = 115200  # or whatever baud rate works
```

### If port is different (e.g., /dev/ttyUSB0):

The server auto-detects ports, but you can force it by modifying the port detection logic.

## Solution 5: Wait Longer for Initialization

Some SIMCOM modules need more time to initialize. Try:

1. **Power cycle the module**:
   - Unplug USB
   - Wait 5 seconds
   - Plug back in
   - Wait 10 seconds before testing

2. **Increase initialization delay**:
   In the server code, find:
   ```python
   time.sleep(2)  # Wait for module to initialize
   ```
   Change to:
   ```python
   time.sleep(5)  # Wait longer for module to initialize
   ```

## Solution 6: Check Serial Settings

Some modules need specific serial settings. Try:

```python
ser = serial.Serial(
    port=port,
    baudrate=115200,  # Try different baud rates
    timeout=5,
    writeTimeout=5,
    bytesize=serial.EIGHTBITS,
    parity=serial.PARITY_NONE,
    stopbits=serial.STOPBITS_ONE,
    rtscts=False,  # Disable hardware flow control
    dsrdtr=False   # Disable DSR/DTR
)
```

## Most Common Fix

**Most SIMCOM modules use 115200 baud, not 9600!**

Try this first:
```bash
sudo minicom -D /dev/ttyS0 -b 115200
```

Then type `AT` - if you see "OK", that's your issue!

## After Finding Working Configuration

1. **Update server code** with correct baud rate
2. **Restart server**:
   ```bash
   pkill -f pi_websocket_server_PCA9685.py
   python3 pi_websocket_server_PCA9685.py
   ```
3. **Run test again**:
   ```bash
   python3 test_simcom_comprehensive.py
   ```

## Still Not Working?

If nothing works:

1. **Verify module type**: Make sure it's actually a SIMCOM module
2. **Check module documentation**: Look up the specific model's baud rate
3. **Test in Windows**: If you have Windows, test with PuTTY or similar
4. **Check module jumpers**: Some modules have jumpers for baud rate selection
5. **Try different module**: If possible, test with another SIMCOM module

