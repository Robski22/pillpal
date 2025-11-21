# LCD Fix Instructions - Address 0x27 Detected

Your LCD is detected at **0x27** ✅, so the address is correct. Let's fix the issue.

## Quick Test (Try This First)

### Step 1: Copy simple test
```bash
scp C:\Users\Feitan\PillApp\pillpal\test_lcd_simple.py justin@192.168.100.220:/home/justin/pillpal/
```

### Step 2: Run with sudo (Important!)
```bash
ssh justin@192.168.100.220
cd /home/justin/pillpal
sudo python3 test_lcd_simple.py
```

**Note**: Using `sudo` is important - I2C sometimes needs root permissions.

## Common Fixes

### Fix 1: Run with sudo
Many I2C issues are permission-related. Always try with `sudo` first.

### Fix 2: Check Contrast
If the script says "SUCCESS" but LCD is blank:
- **Adjust contrast potentiometer** on the LCD (turn it slowly)
- Text should appear when contrast is correct

### Fix 3: Check Backlight
- Is the LCD lit up? (backlight should be on)
- If no light, check power connections

### Fix 4: Add User to i2c Group (Permanent Fix)
```bash
sudo usermod -a -G i2c $USER
# Log out and log back in
# Or run: newgrp i2c
```

After this, you won't need `sudo` anymore.

### Fix 5: Try Different I2C Expander
Some LCDs use different expanders. The simple test tries both:
- PCF8574 (most common)
- MCP23008 (alternative)

If one fails, the script will try the other.

## What Error Are You Seeing?

Please share:
1. **Output of the test script** (what does it say?)
2. **Is LCD blank or showing error?**
3. **Did you try with `sudo`?**

## If Still Not Working

Run the diagnostic script:
```bash
scp C:\Users\Feitan\PillApp\pillpal\test_lcd_diagnostic.py justin@192.168.100.220:/home/justin/pillpal/
sudo python3 test_lcd_diagnostic.py
```

This will show exactly which step fails.

