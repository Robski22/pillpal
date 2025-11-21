#!/usr/bin/env python3
"""
Ultra-Simple LCD Test
Direct I2C access to test LCD
"""

import sys
import time

print("LCD Simple Test - Address 0x27")
print("=" * 40)

# Check libraries
try:
    import smbus
    print("✅ smbus found")
except ImportError:
    print("❌ smbus not found")
    print("Install: sudo apt-get install python3-smbus")
    sys.exit(1)

try:
    from RPLCD.i2c import CharLCD
    print("✅ RPLCD found")
except ImportError:
    print("❌ RPLCD not found")
    print("Install: pip3 install RPLCD")
    sys.exit(1)

print()

# Test 1: Direct I2C access
print("Test 1: Direct I2C access...")
try:
    bus = smbus.SMBus(1)
    address = 0x27
    
    # Try to write to LCD (backlight on)
    bus.write_byte(address, 0x08)
    time.sleep(0.1)
    print("   ✅ Can write to I2C address 0x27")
    bus.close()
except Exception as e:
    print(f"   ❌ Cannot write to I2C: {e}")
    print("   Try: sudo python3 test_lcd_simple.py")
    sys.exit(1)

print()

# Test 2: RPLCD initialization
print("Test 2: RPLCD initialization...")
lcd = None

try:
    # Try with PCF8574 (most common)
    print("   Trying PCF8574 expander...")
    lcd = CharLCD(
        i2c_expander='PCF8574',
        address=0x27,
        cols=16,
        rows=2
    )
    print("   ✅ LCD initialized with PCF8574")
except Exception as e1:
    print(f"   ❌ PCF8574 failed: {e1}")
    
    try:
        # Try with MCP23008
        print("   Trying MCP23008 expander...")
        lcd = CharLCD(
            i2c_expander='MCP23008',
            address=0x27,
            cols=16,
            rows=2
        )
        print("   ✅ LCD initialized with MCP23008")
    except Exception as e2:
        print(f"   ❌ MCP23008 failed: {e2}")
        print()
        print("=" * 40)
        print("❌ Could not initialize LCD")
        print("=" * 40)
        print()
        print("Possible solutions:")
        print("1. Try with sudo: sudo python3 test_lcd_simple.py")
        print("2. Check contrast potentiometer on LCD")
        print("3. Check if LCD backlight is on")
        print("4. Try different I2C expander in code")
        sys.exit(1)

print()

# Test 3: Clear and write
print("Test 3: Writing to LCD...")
try:
    lcd.clear()
    time.sleep(0.3)
    
    lcd.write_string("LCD TEST")
    lcd.cursor_pos = (1, 0)
    lcd.write_string("Working!")
    
    print("   ✅ Text written to LCD")
    print()
    print("=" * 40)
    print("✅ SUCCESS!")
    print("=" * 40)
    print()
    print("You should see on LCD:")
    print("  Line 1: LCD TEST")
    print("  Line 2: Working!")
    print()
    print("If LCD is blank:")
    print("  - Adjust contrast potentiometer")
    print("  - Check backlight is on")
    print()
    print("Displaying for 5 seconds...")
    time.sleep(5)
    
    # Final message
    lcd.clear()
    lcd.write_string("PillPal Ready")
    
except Exception as e:
    print(f"   ❌ Error writing: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("✅ Test complete!")

