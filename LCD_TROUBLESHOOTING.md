# LCD Troubleshooting - If Detected But Not Working

## If LCD is detected in i2cdetect but test script fails:

### Common Issues:

#### 1. **Wrong I2C Address**
Even if detected, the script might be using the wrong address.

**Check actual address:**
```bash
i2cdetect -y 1
```

**If you see `3F` instead of `27`:**
- Edit the test script and change `LCD_ADDRESS = 0x3F`
- Or use the diagnostic script which auto-detects

#### 2. **Permission Issues**
I2C might need root access or user needs to be in i2c group.

**Try running with sudo:**
```bash
sudo python3 test_lcd.py
```

**Or add user to i2c group:**
```bash
sudo usermod -a -G i2c $USER
# Log out and log back in, or:
newgrp i2c
```

#### 3. **Library Issues**
RPLCD might not be installed correctly.

**Reinstall:**
```bash
pip3 uninstall RPLCD
pip3 install RPLCD
```

**Or install system-wide:**
```bash
sudo pip3 install RPLCD
```

#### 4. **LCD Contrast Too Low**
LCD might be working but text is invisible.

**Solution:**
- Adjust contrast potentiometer on LCD (if available)
- Turn it slowly while LCD is on
- Text should appear when contrast is correct

#### 5. **LCD Backlight Off**
LCD might be working but backlight is off.

**Check:**
- Is the LCD lit up?
- Can you see any light from the backlight?

#### 6. **Wrong I2C Expander**
Some LCDs use different I2C expanders.

**Try different expander:**
```python
# Instead of:
lcd = CharLCD(i2c_expander='PCF8574', address=0x27, ...)

# Try:
lcd = CharLCD(i2c_expander='MCP23008', address=0x27, ...)
# Or:
lcd = CharLCD(i2c_expander='MCP23017', address=0x27, ...)
```

#### 7. **I2C Bus Number**
Raspberry Pi might be using bus 0 instead of bus 1.

**Check:**
```bash
ls /dev/i2c-*
# Should show: /dev/i2c-0 and /dev/i2c-1
```

**If only i2c-0 exists, edit code to use bus 0:**
```python
# In RPLCD, it uses bus 1 by default
# If you need bus 0, you might need to modify the library
# Or check if your Pi model uses bus 0
```

## Diagnostic Script

Use the diagnostic script to get more details:

```bash
# Copy diagnostic script
scp C:\Users\Feitan\PillApp\pillpal\test_lcd_diagnostic.py justin@192.168.100.220:/home/justin/pillpal/

# Run it
ssh justin@192.168.100.220
cd /home/justin/pillpal
python3 test_lcd_diagnostic.py
```

This will show:
- Exact error messages
- Which step fails
- I2C address detection
- Permission issues
- Library issues

## Quick Manual Test

If scripts don't work, try manual I2C access:

```python
import smbus
import time

bus = smbus.SMBus(1)  # I2C bus 1
address = 0x27  # Or 0x3F

# Try to write to LCD
try:
    # Send initialization sequence
    bus.write_byte(address, 0x08)  # Turn on backlight
    time.sleep(0.1)
    print("✅ Can write to LCD")
except Exception as e:
    print(f"❌ Cannot write: {e}")

bus.close()
```

## What Error Are You Seeing?

Please share:
1. **Exact error message** from the test script
2. **Output of `i2cdetect -y 1`** (what address shows?)
3. **Output of diagnostic script** (if you run it)

This will help identify the exact issue!

