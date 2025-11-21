# Hardware Troubleshooting Guide

## 🔴 Signal Strength 0 = BAD

**Signal 0 means NO SIGNAL - SMS will NOT work!**

### What Signal Strength Means:
- **0**: No signal ❌ (SMS will fail)
- **1-10**: Very weak signal ⚠️ (SMS may fail)
- **11-20**: Weak signal ⚠️ (SMS may work slowly)
- **21-31**: Good signal ✅ (SMS should work)

### How to Fix Signal 0:

1. **Check Antenna Connection:**
   - Make sure antenna is properly connected to SIMCOM module
   - Try reconnecting the antenna
   - Check if antenna is damaged

2. **Check SIM Card:**
   - Remove and reinsert SIM card
   - Make sure SIM card is inserted correctly (gold contacts facing down)
   - Check if SIM card has active service (try in a phone)

3. **Check Location:**
   - Move to area with better cell signal
   - Try near a window
   - Check if other devices have signal in same location

4. **Check SIMCOM Module:**
   - Check USB connection to Raspberry Pi
   - Try unplugging and replugging USB cable
   - Check if module is getting power (LED should be on)

5. **Check SIM Card Status:**
   - Look for log: `✅ SIM card detected and ready`
   - If shows "Not detected": SIM card issue
   - If shows "SIM PIN required": Need to unlock SIM

---

## 🔔 Buzzer Not Working (But Logs Show It's Working)

**If logs show `🔔 Buzzer: ON` but you can't hear anything, it's a HARDWARE issue.**

### Possible Problems:

#### 1. **Wrong Buzzer Type (Most Common)**
- **5V Active Buzzer**: Needs transistor circuit (Raspberry Pi GPIO can't drive it directly)
- **3.3V Passive Buzzer**: Can work directly but needs PWM
- **Check**: What type of buzzer do you have?

#### 2. **Wiring Issues**
- **GPIO17 → Buzzer +**: Check connection
- **GND → Buzzer -**: Check connection
- **Test**: Use multimeter to check continuity

#### 3. **Power Issue**
- **5V Buzzer**: Raspberry Pi GPIO (3.3V) can't power it directly
- **Solution**: Need transistor circuit (see BUZZER_WIRING_GUIDE.md)

#### 4. **Buzzer is Broken**
- **Test**: Connect buzzer directly to 5V and GND (if 5V buzzer)
- **If no sound**: Buzzer is broken, replace it

### How to Test Buzzer:

#### Option 1: Test with Python Script
```bash
# SSH into Raspberry Pi
ssh justin@192.168.100.220
cd /home/justin/pillpal

# Create test script
cat > test_buzzer_gpio17.py << 'EOF'
import RPi.GPIO as GPIO
import time

GPIO.setmode(GPIO.BCM)
GPIO.setup(17, GPIO.OUT)

print("Testing buzzer on GPIO17...")
print("Turning ON for 2 seconds...")
GPIO.output(17, GPIO.HIGH)
time.sleep(2)
print("Turning OFF...")
GPIO.output(17, GPIO.LOW)
print("Test complete")
GPIO.cleanup()
EOF

# Run test
python3 test_buzzer_gpio17.py
```

**If you hear a beep**: Buzzer works, code issue  
**If no sound**: Hardware/wiring issue

#### Option 2: Test with Multimeter
- Set multimeter to continuity mode
- Touch one probe to GPIO17 pin
- Touch other probe to buzzer + terminal
- Should beep (shows connection is good)

#### Option 3: Test Buzzer Directly
- **For 5V Active Buzzer**: Connect + to 5V, - to GND (should beep)
- **If no sound**: Buzzer is broken

### Solutions:

#### If You Have 5V Active Buzzer:
You NEED a transistor circuit. See `BUZZER_WIRING_GUIDE.md` for detailed wiring.

**Quick Circuit:**
```
Raspberry Pi GPIO17 → 1kΩ resistor → NPN Transistor Base
NPN Transistor Emitter → GND
NPN Transistor Collector → Buzzer -
Buzzer + → 5V
```

#### If You Have 3.3V Passive Buzzer:
Current code should work, but might need PWM for better sound.

---

## 📺 LCD Not Displaying (But Logs Show Commands)

**If logs show `📺 LCD: DISPENSING` but display is blank, it's a HARDWARE issue.**

### Possible Problems:

#### 1. **I2C Connection Issues**
- **Check**: I2C wires (SDA, SCL) are connected correctly
- **SDA**: Usually GPIO2 (Pin 3)
- **SCL**: Usually GPIO3 (Pin 5)
- **Test**: `i2cdetect -y 1` (should show 0x27)

#### 2. **Power Issues**
- **Check**: LCD is getting power (5V and GND)
- **Test**: Check voltage with multimeter (should be 5V)

#### 3. **Contrast Too Low**
- **Problem**: LCD is working but contrast is too low (can't see text)
- **Solution**: Adjust contrast potentiometer on LCD (if available)
- **Or**: LCD might need contrast adjustment in code

#### 4. **Wrong I2C Address**
- **Default**: 0x27
- **Check**: Run `i2cdetect -y 1` to see actual address
- **Common addresses**: 0x27, 0x3F

#### 5. **I2C Not Enabled**
- **Check**: I2C is enabled in Raspberry Pi
- **Enable**: `sudo raspi-config` → Interface Options → I2C → Enable
- **Reboot**: After enabling

#### 6. **LCD Backlight Issue**
- **Check**: Backlight is on (should be lit)
- **Test**: Try adjusting backlight brightness

### How to Test LCD:

#### Step 1: Check I2C is Enabled
```bash
# SSH into Raspberry Pi
ssh justin@192.168.100.220

# Check if I2C is enabled
lsmod | grep i2c
# Should show: i2c_dev, i2c_bcm2835

# If not enabled:
sudo raspi-config
# Navigate to: Interface Options → I2C → Enable
# Reboot: sudo reboot
```

#### Step 2: Check I2C Address
```bash
# Install i2c-tools if not installed
sudo apt-get install i2c-tools

# Detect I2C devices
i2cdetect -y 1
# Should show: 27 (or 3F) in the grid
# If nothing shows: I2C wiring issue
```

#### Step 3: Test LCD with Python
```bash
cd /home/justin/pillpal

# Create test script
cat > test_lcd.py << 'EOF'
from RPLCD.i2c import CharLCD
import time

try:
    print("Initializing LCD...")
    lcd = CharLCD(i2c_expander='PCF8574', address=0x27, cols=16, rows=2)
    print("LCD initialized!")
    
    print("Clearing LCD...")
    lcd.clear()
    
    print("Writing test message...")
    lcd.write_string("PillPal Test")
    lcd.cursor_pos = (1, 0)
    lcd.write_string("LCD Working!")
    
    print("Test complete - check LCD display")
    time.sleep(5)
    
    lcd.clear()
    print("LCD cleared")
except Exception as e:
    print(f"ERROR: {e}")
    import traceback
    traceback.print_exc()
EOF

# Run test
python3 test_lcd.py
```

**If LCD shows text**: LCD works, check code  
**If LCD is blank**: Hardware issue

#### Step 4: Check Wiring
```
LCD Pin → Raspberry Pi
VCC → 5V (Pin 2 or 4)
GND → GND (Pin 6, 9, 14, 20, 25, 30, 34, 39)
SDA → GPIO2 (Pin 3)
SCL → GPIO3 (Pin 5)
```

#### Step 5: Check Contrast
- If LCD has contrast potentiometer, adjust it
- Try turning it slowly while LCD is on
- Text should appear when contrast is correct

---

## 💡 LED Indicators Not Working

### Possible Problems:

#### 1. **Wiring Issues**
- **GPIO27 (Level 1 LED)**: Check connection
- **GPIO22 (Level 2 LED)**: Check connection
- **GND**: Check connection

#### 2. **LED Polarity**
- **LEDs have polarity**: + (anode) and - (cathode)
- **Check**: Long leg = +, short leg = -
- **GPIO → Resistor (220Ω) → LED +**
- **LED - → GND**

#### 3. **Missing Resistor**
- **LEDs need resistor**: 220Ω recommended
- **Without resistor**: LED might burn out or not work

#### 4. **GPIO Not Set**
- **Check logs**: `✅ LEDs initialized: GPIO27 (Level 1), GPIO22 (Level 2)`
- **If missing**: GPIO initialization failed

### How to Test LEDs:

```bash
# SSH into Raspberry Pi
ssh justin@192.168.100.220
cd /home/justin/pillpal

# Create test script
cat > test_leds.py << 'EOF'
import RPi.GPIO as GPIO
import time

GPIO.setmode(GPIO.BCM)
GPIO.setup(27, GPIO.OUT)  # Level 1 LED
GPIO.setup(22, GPIO.OUT)  # Level 2 LED

print("Testing GPIO27 (Level 1 LED)...")
GPIO.output(27, GPIO.HIGH)
time.sleep(2)
GPIO.output(27, GPIO.LOW)
print("GPIO27 test complete")

print("Testing GPIO22 (Level 2 LED)...")
GPIO.output(22, GPIO.HIGH)
time.sleep(2)
GPIO.output(22, GPIO.LOW)
print("GPIO22 test complete")

GPIO.cleanup()
EOF

# Run test
python3 test_leds.py
```

**If LEDs light up**: LEDs work, check code  
**If no light**: Hardware/wiring issue

---

## 📋 Quick Checklist

### Signal 0 (SMS Not Working):
- [ ] Antenna connected
- [ ] SIM card inserted correctly
- [ ] SIM card has active service
- [ ] Location has cell signal
- [ ] SIMCOM module powered (LED on)

### Buzzer Not Working:
- [ ] Check buzzer type (5V needs transistor circuit)
- [ ] Check wiring (GPIO17 → Buzzer +, GND → Buzzer -)
- [ ] Test buzzer directly (connect to 5V and GND)
- [ ] Check if buzzer is broken

### LCD Not Displaying:
- [ ] I2C enabled (`sudo raspi-config`)
- [ ] I2C address correct (`i2cdetect -y 1` shows 0x27)
- [ ] Wiring correct (SDA, SCL, VCC, GND)
- [ ] Power connected (5V and GND)
- [ ] Contrast adjusted (if potentiometer available)
- [ ] Backlight on

### LEDs Not Working:
- [ ] Wiring correct (GPIO → Resistor → LED +, LED - → GND)
- [ ] Resistor present (220Ω)
- [ ] LED polarity correct (long leg = +)
- [ ] Test with test script

---

## 🔧 Common Solutions

### If Nothing Works:
1. **Check all connections** - unplug and replug everything
2. **Check power** - Raspberry Pi is powered, all modules have power
3. **Check logs** - Look for error messages in server logs
4. **Test individually** - Test each component separately
5. **Check wiring diagrams** - Make sure wiring matches diagrams

### If Code Shows "Working" But Hardware Doesn't:
- **99% chance it's a hardware/wiring issue**
- **Check connections first**
- **Test components individually**
- **Use multimeter to check continuity**

