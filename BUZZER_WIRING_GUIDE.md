# 5V Buzzer Wiring Guide for Raspberry Pi

## Problem
Raspberry Pi GPIO pins output **3.3V** and can only supply **~16mA** per pin. A **5V buzzer** typically needs:
- 5V power supply
- More current than GPIO can provide

## Solution: Use a Transistor Circuit

You need to use a transistor to switch the 5V power supply to the buzzer, controlled by the GPIO pin.

### Required Components:
- **NPN Transistor** (e.g., 2N2222, BC547, or 2N3904)
- **Resistor** (1kΩ - 10kΩ) for base current limiting
- **5V Buzzer**
- **5V Power Supply** (can use Raspberry Pi's 5V pin)

### Circuit Diagram:

```
Raspberry Pi 5V Pin (Pin 2 or 4) ──┬── Buzzer (+) ──┬── Buzzer (-) ── Collector (C) of Transistor
                                    │                 │
                                    │                 │
                                    └── Emitter (E) ──┴── GND (Pin 6 or 9)
                                    
GPIO6 (Pin 31) ──[1kΩ Resistor]── Base (B) of Transistor
```

### Wiring Steps:

1. **Connect Buzzer to Transistor:**
   - Buzzer **positive (+)** → Raspberry Pi **5V pin** (Pin 2 or 4)
   - Buzzer **negative (-)** → Transistor **Collector (C)**

2. **Connect Transistor:**
   - Transistor **Emitter (E)** → Raspberry Pi **GND** (Pin 6, 9, 14, 20, 25, 30, 34, or 39)
   - Transistor **Base (B)** → **1kΩ Resistor** → GPIO6 (Pin 31)

3. **Transistor Pinout (2N2222 / BC547):**
   ```
   Looking at flat side:
   [E] [B] [C]
   Emitter | Base | Collector
   ```

### Alternative: Using a Relay Module
If you have a relay module, you can use that instead:
- Relay **VCC** → 5V
- Relay **GND** → GND
- Relay **IN** → GPIO6
- Buzzer connected to relay's NO (Normally Open) and COM terminals

## Testing After Wiring

Once wired correctly, test with:

```bash
python3 test_buzzer_5v.py
```

Or quick test:

```bash
python3 -c "import RPi.GPIO as GPIO; import time; GPIO.setmode(GPIO.BCM); GPIO.setup(6, GPIO.OUT); GPIO.output(6, GPIO.HIGH); time.sleep(0.5); GPIO.output(6, GPIO.LOW); GPIO.cleanup(); print('Beep!')"
```

## Troubleshooting

### No Sound:
1. ✅ Check transistor is wired correctly (E, B, C)
2. ✅ Verify buzzer polarity (positive to 5V, negative to transistor)
3. ✅ Check resistor value (1kΩ - 10kΩ is good)
4. ✅ Verify GPIO6 is connected to transistor base
5. ✅ Test buzzer directly with 5V to confirm it works
6. ✅ Check if buzzer is active (needs constant voltage) or passive (needs PWM)

### Buzzer Works But Very Quiet:
- Try a different transistor with higher current rating
- Check if buzzer needs more current (some need 30-50mA)

### Buzzer Makes Continuous Sound:
- Transistor might be shorted or wired incorrectly
- Check connections

## Direct Connection Test (Not Recommended)

**WARNING**: This might damage your Raspberry Pi or not work at all!

If you want to test if the buzzer works at all, you can try connecting it directly to 5V and GND (NOT through GPIO):

```bash
# This is just to test if buzzer itself works
# Connect: Buzzer (+) to 5V pin, Buzzer (-) to GND pin
# If it beeps, buzzer works but needs transistor circuit
```

## Parts List

If you need to buy components:
- **Transistor**: 2N2222 NPN (common, cheap, works well)
- **Resistor**: 1kΩ (brown-black-red) or 10kΩ (brown-black-orange)
- **Breadboard**: Optional but helpful for testing
- **Jumper wires**: For connections

