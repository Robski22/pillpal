#!/usr/bin/env python3
"""
Simple LCD Test Script
Run this to check if LCD is working on Raspberry Pi
"""

import sys
import time

print("=" * 50)
print("LCD Display Test")
print("=" * 50)
print()

# Check if RPLCD is available
try:
    from RPLCD.i2c import CharLCD
    print("✅ RPLCD library found")
except ImportError:
    print("❌ RPLCD library not found!")
    print("   Install with: pip3 install RPLCD")
    sys.exit(1)

# Check if I2C is available
try:
    import smbus
    print("✅ I2C (smbus) library found")
except ImportError:
    print("⚠️ smbus library not found (may still work)")
    print("   Install with: sudo apt-get install python3-smbus")

print()

# LCD Configuration
LCD_ADDRESS = 0x27  # Common I2C address (try 0x3F if this doesn't work)
LCD_COLS = 16
LCD_ROWS = 2

print(f"Attempting to connect to LCD at I2C address 0x{LCD_ADDRESS:02X}...")
print()

lcd = None

try:
    # Try to initialize LCD
    print("Step 1: Initializing LCD...")
    lcd = CharLCD(
        i2c_expander='PCF8574',
        address=LCD_ADDRESS,
        cols=LCD_COLS,
        rows=LCD_ROWS
    )
    print("   ✅ LCD initialized successfully!")
    print()
    
    # Clear display
    print("Step 2: Clearing display...")
    lcd.clear()
    time.sleep(0.5)
    print("   ✅ Display cleared")
    print()
    
    # Write test message
    print("Step 3: Writing test message...")
    lcd.write_string("PillPal Test")
    print("   ✅ Line 1 written: 'PillPal Test'")
    print()
    
    # Move to second line
    print("Step 4: Writing to line 2...")
    lcd.cursor_pos = (1, 0)
    lcd.write_string("LCD Working!")
    print("   ✅ Line 2 written: 'LCD Working!'")
    print()
    
    print("=" * 50)
    print("✅ SUCCESS! LCD is working!")
    print("=" * 50)
    print()
    print("You should see on the LCD:")
    print("  Line 1: PillPal Test")
    print("  Line 2: LCD Working!")
    print()
    print("Displaying for 5 seconds...")
    time.sleep(5)
    
    # Test scrolling text
    print()
    print("Step 5: Testing scrolling text...")
    lcd.clear()
    lcd.write_string("Scrolling Test")
    time.sleep(2)
    
    # Scroll message
    message = "This is a longer message that should scroll"
    for i in range(len(message) - LCD_COLS + 1):
        lcd.cursor_pos = (1, 0)
        lcd.write_string(" " * LCD_COLS)  # Clear line
        lcd.cursor_pos = (1, 0)
        lcd.write_string(message[i:i+LCD_COLS])
        time.sleep(0.3)
    
    print("   ✅ Scrolling test complete")
    print()
    
    # Final message
    print("Step 6: Displaying final message...")
    lcd.clear()
    lcd.write_string("LCD Test OK!")
    lcd.cursor_pos = (1, 0)
    lcd.write_string("All tests pass")
    time.sleep(3)
    
    # Clear and show ready
    lcd.clear()
    lcd.write_string("PillPal Ready")
    lcd.cursor_pos = (1, 0)
    lcd.write_string("Waiting...")
    
    print("   ✅ Final message displayed")
    print()
    print("=" * 50)
    print("✅ ALL TESTS PASSED!")
    print("=" * 50)
    print()
    print("LCD is working correctly!")
    print("You can now use it with the server.")
    
except Exception as e:
    print()
    print("=" * 50)
    print("❌ ERROR: LCD test failed!")
    print("=" * 50)
    print()
    print(f"Error: {e}")
    print()
    print("Troubleshooting:")
    print("1. Check I2C is enabled:")
    print("   sudo raspi-config")
    print("   → Interface Options → I2C → Enable")
    print("   Then reboot: sudo reboot")
    print()
    print("2. Check I2C address:")
    print("   sudo apt-get install i2c-tools")
    print("   i2cdetect -y 1")
    print("   Should show: 27 (or 3F) in the grid")
    print()
    print("3. Check wiring:")
    print("   VCC → 5V (Pin 2 or 4)")
    print("   GND → GND (Pin 6, 9, 14, etc.)")
    print("   SDA → GPIO2 (Pin 3)")
    print("   SCL → GPIO3 (Pin 5)")
    print()
    print("4. Try different I2C address:")
    print("   Common addresses: 0x27, 0x3F")
    print("   Edit this script and change LCD_ADDRESS")
    print()
    
    import traceback
    print("Full error details:")
    traceback.print_exc()
    
    sys.exit(1)

finally:
    if lcd:
        print()
        print("Cleaning up...")
        # Don't clear here - leave message on screen
        print("✅ Done")

