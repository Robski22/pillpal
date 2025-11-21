#!/usr/bin/env python3
"""
Diagnostic LCD Test Script
This will help identify exactly what's wrong
"""

import sys
import time
import os

print("=" * 60)
print("LCD Diagnostic Test - Detailed Troubleshooting")
print("=" * 60)
print()

# Step 1: Check Python version
print("Step 1: Checking Python version...")
print(f"   Python: {sys.version}")
print()

# Step 2: Check if running as root
print("Step 2: Checking permissions...")
if os.geteuid() == 0:
    print("   ⚠️ Running as root (not recommended, but should work)")
else:
    print("   ✅ Running as regular user")
    print("   Note: If you get permission errors, try: sudo python3 test_lcd_diagnostic.py")
print()

# Step 3: Check RPLCD library
print("Step 3: Checking RPLCD library...")
try:
    from RPLCD.i2c import CharLCD
    print("   ✅ RPLCD library found")
    print(f"   Location: {CharLCD.__module__}")
except ImportError as e:
    print("   ❌ RPLCD library not found!")
    print(f"   Error: {e}")
    print("   Install with: pip3 install RPLCD")
    sys.exit(1)
print()

# Step 4: Check smbus
print("Step 4: Checking I2C library (smbus)...")
try:
    import smbus
    print("   ✅ smbus library found")
    print(f"   Location: {smbus.__module__}")
except ImportError:
    print("   ⚠️ smbus library not found")
    print("   Install with: sudo apt-get install python3-smbus")
    print("   Note: May still work without it")
print()

# Step 5: Check I2C device
print("Step 5: Checking I2C device...")
try:
    import subprocess
    result = subprocess.run(['i2cdetect', '-y', '1'], 
                          capture_output=True, text=True, timeout=5)
    if result.returncode == 0:
        print("   ✅ i2cdetect command works")
        print("   Output:")
        print("   " + "\n   ".join(result.stdout.split('\n')))
        
        # Check for common LCD addresses
        output = result.stdout
        if '27' in output or '0x27' in output.lower():
            print("   ✅ Found device at 0x27")
            lcd_address = 0x27
        elif '3f' in output.lower() or '3F' in output:
            print("   ✅ Found device at 0x3F")
            lcd_address = 0x3F
        else:
            print("   ⚠️ Could not find LCD at 0x27 or 0x3F")
            print("   What address did you see? (Enter manually)")
            lcd_address = None
    else:
        print("   ⚠️ i2cdetect failed")
        print("   Install with: sudo apt-get install i2c-tools")
        lcd_address = 0x27  # Default
except FileNotFoundError:
    print("   ⚠️ i2cdetect not found")
    print("   Install with: sudo apt-get install i2c-tools")
    lcd_address = 0x27  # Default
except Exception as e:
    print(f"   ⚠️ Error running i2cdetect: {e}")
    lcd_address = 0x27  # Default
print()

# Step 6: Try to access I2C bus directly
print("Step 6: Testing I2C bus access...")
try:
    import smbus
    bus = smbus.SMBus(1)  # I2C bus 1
    print("   ✅ Can access I2C bus 1")
    
    # Try to read from LCD address
    if lcd_address:
        try:
            # Try to read a byte (some LCDs respond, some don't)
            bus.read_byte(lcd_address)
            print(f"   ✅ Can read from address 0x{lcd_address:02X}")
        except:
            print(f"   ⚠️ Cannot read from 0x{lcd_address:02X} (this is normal for some LCDs)")
    bus.close()
except Exception as e:
    print(f"   ❌ Cannot access I2C bus: {e}")
    print("   Possible issues:")
    print("   - I2C not enabled (sudo raspi-config)")
    print("   - Permission denied (add user to i2c group)")
    print("   - Wrong I2C bus number")
print()

# Step 7: Try to initialize LCD
print("Step 7: Attempting LCD initialization...")
print(f"   Trying address: 0x{lcd_address:02X if lcd_address else '27'}")

lcd = None
addresses_to_try = []

if lcd_address:
    addresses_to_try = [lcd_address]
else:
    addresses_to_try = [0x27, 0x3F]  # Try both common addresses

for addr in addresses_to_try:
    print(f"\n   Trying address 0x{addr:02X}...")
    try:
        lcd = CharLCD(
            i2c_expander='PCF8574',
            address=addr,
            cols=16,
            rows=2
        )
        print(f"   ✅ SUCCESS! LCD initialized at 0x{addr:02X}")
        break
    except Exception as e:
        print(f"   ❌ Failed at 0x{addr:02X}: {e}")
        lcd = None
        continue

if not lcd:
    print("\n   ❌ Could not initialize LCD at any address")
    print("\n   Troubleshooting:")
    print("   1. Check wiring:")
    print("      VCC → 5V")
    print("      GND → GND")
    print("      SDA → GPIO2 (Pin 3)")
    print("      SCL → GPIO3 (Pin 5)")
    print("   2. Check I2C address with: i2cdetect -y 1")
    print("   3. Try running with sudo: sudo python3 test_lcd_diagnostic.py")
    print("   4. Check if I2C is enabled: sudo raspi-config")
    sys.exit(1)

print()

# Step 8: Test LCD operations
print("Step 8: Testing LCD operations...")

try:
    print("   8.1: Clearing display...")
    lcd.clear()
    time.sleep(0.5)
    print("      ✅ Clear successful")
    
    print("   8.2: Writing to line 1...")
    lcd.write_string("Test Line 1")
    print("      ✅ Write successful")
    
    print("   8.3: Moving to line 2...")
    lcd.cursor_pos = (1, 0)
    print("      ✅ Cursor move successful")
    
    print("   8.4: Writing to line 2...")
    lcd.write_string("Test Line 2")
    print("      ✅ Write successful")
    
    print()
    print("=" * 60)
    print("✅ LCD IS WORKING!")
    print("=" * 60)
    print()
    print("You should see on the LCD:")
    print("  Line 1: Test Line 1")
    print("  Line 2: Test Line 2")
    print()
    print("Displaying for 5 seconds...")
    time.sleep(5)
    
    # Additional tests
    print()
    print("Step 9: Additional tests...")
    
    print("   9.1: Testing clear...")
    lcd.clear()
    time.sleep(0.5)
    
    print("   9.2: Testing special characters...")
    lcd.write_string("LCD Test OK!")
    lcd.cursor_pos = (1, 0)
    lcd.write_string("Address: 0x")
    lcd.write_string(f"{addr:02X}")
    time.sleep(3)
    
    print("   9.3: Final message...")
    lcd.clear()
    lcd.write_string("PillPal Ready")
    lcd.cursor_pos = (1, 0)
    lcd.write_string("LCD Working!")
    
    print()
    print("=" * 60)
    print("✅ ALL TESTS PASSED!")
    print("=" * 60)
    print()
    print(f"LCD is working correctly at address 0x{addr:02X}")
    print("You can now use it with the server.")
    
except Exception as e:
    print()
    print("=" * 60)
    print("❌ ERROR during LCD operations!")
    print("=" * 60)
    print()
    print(f"Error: {e}")
    print()
    print("Possible issues:")
    print("1. LCD contrast too low (adjust potentiometer)")
    print("2. LCD backlight off")
    print("3. LCD hardware issue")
    print()
    import traceback
    print("Full error traceback:")
    traceback.print_exc()
    sys.exit(1)

finally:
    if lcd:
        print()
        print("Test complete. LCD left with final message.")
        print("(LCD will keep displaying until cleared or power off)")

