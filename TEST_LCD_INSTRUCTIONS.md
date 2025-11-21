# LCD Test Instructions

## Quick Test (Copy and Run)

### Step 1: Copy the test file to Raspberry Pi

**From Windows CMD/PowerShell:**
```bash
scp C:\Users\Feitan\PillApp\pillpal\test_lcd.py justin@192.168.100.220:/home/justin/pillpal/
```

### Step 2: SSH into Raspberry Pi
```bash
ssh justin@192.168.100.220
```

### Step 3: Navigate to directory
```bash
cd /home/justin/pillpal
```

### Step 4: Make script executable (optional)
```bash
chmod +x test_lcd.py
```

### Step 5: Run the test
```bash
python3 test_lcd.py
```

## What the Test Does

1. **Checks libraries** - Verifies RPLCD is installed
2. **Connects to LCD** - Tries to connect at I2C address 0x27
3. **Clears display** - Clears any existing text
4. **Writes test message** - Shows "PillPal Test" on line 1, "LCD Working!" on line 2
5. **Tests scrolling** - Tests if text scrolling works
6. **Shows final message** - Displays "LCD Test OK!" and "All tests pass"

## Expected Output

### If LCD Works:
```
==================================================
LCD Display Test
==================================================

✅ RPLCD library found
✅ I2C (smbus) library found

Attempting to connect to LCD at I2C address 0x27...

Step 1: Initializing LCD...
   ✅ LCD initialized successfully!

Step 2: Clearing display...
   ✅ Display cleared

Step 3: Writing test message...
   ✅ Line 1 written: 'PillPal Test'

Step 4: Writing to line 2...
   ✅ Line 2 written: 'LCD Working!'

==================================================
✅ SUCCESS! LCD is working!
==================================================
```

**On LCD screen, you should see:**
```
Line 1: PillPal Test
Line 2: LCD Working!
```

### If LCD Doesn't Work:

You'll see an error message with troubleshooting steps.

## Common Issues

### Issue: "RPLCD library not found"
**Solution:**
```bash
pip3 install RPLCD
```

### Issue: "I2C not enabled"
**Solution:**
```bash
sudo raspi-config
# Navigate to: Interface Options → I2C → Enable
sudo reboot
```

### Issue: "No device at address 0x27"
**Solution:**
1. Check I2C address:
   ```bash
   sudo apt-get install i2c-tools
   i2cdetect -y 1
   ```
2. If shows `3F` instead of `27`, edit the script:
   ```python
   LCD_ADDRESS = 0x3F  # Change from 0x27 to 0x3F
   ```

### Issue: "Permission denied" or "Access denied"
**Solution:**
```bash
# Add user to i2c group
sudo usermod -a -G i2c $USER
# Log out and log back in, or:
newgrp i2c
```

### Issue: LCD is blank but test says "success"
**Possible causes:**
1. **Contrast too low** - Adjust contrast potentiometer on LCD (if available)
2. **Backlight off** - Check if backlight is on
3. **Wrong I2C address** - Try 0x3F instead of 0x27

## Manual I2C Check

Before running the test, you can check if I2C is working:

```bash
# Install i2c-tools (if not installed)
sudo apt-get install i2c-tools

# Check I2C devices
i2cdetect -y 1
```

**Expected output:**
```
     0  1  2  3  4  5  6  7  8  9  a  b  c  d  e  f
00:                         -- -- -- -- -- -- -- -- 
10: -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- 
20: -- -- -- -- -- -- -- -- 27 -- -- -- -- -- -- -- 
30: -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- 
```

**Look for `27` or `3F` in the grid** - that's your LCD!

## Wiring Check

Make sure LCD is wired correctly:

```
LCD Pin    →  Raspberry Pi
─────────────────────────
VCC        →  5V (Pin 2 or 4)
GND        →  GND (Pin 6, 9, 14, 20, 25, 30, 34, 39)
SDA        →  GPIO2 (Pin 3)
SCL        →  GPIO3 (Pin 5)
```

## Next Steps

If the test passes:
- ✅ LCD is working!
- ✅ You can use it with the server
- ✅ Check server logs to see if LCD updates are working

If the test fails:
- Follow the troubleshooting steps in the error message
- Check wiring
- Check I2C is enabled
- Check I2C address

