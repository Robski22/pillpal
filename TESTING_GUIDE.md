# PillPal System Testing Guide

This guide will help you test all features of the PillPal system step by step.

## Prerequisites

1. **Raspberry Pi Setup:**
   - SSH into Pi: `ssh justin@192.168.100.68`
   - Navigate to: `cd /home/justin/pillpal`
   - Python server running: `python3 pi_websocket_server.py`
   - Hardware connected:
     - PCA9685 servo board
     - Servo1 (Channel 4) - main dispense servo
     - Servo2 (Channel 5) - confirmation servo
     - Button on GPIO26
     - LCD on I2C address 0x27
     - LED on GPIO27 (Level 1 indicator)
     - LED on GPIO22 (Level 2 indicator)

2. **Web App Setup:**
   - Development server running: `npm run dev`
   - Access at: `http://localhost:3000`
   - Logged into your account

---

## Testing Checklist

### ✅ Test 1: Start Servers

**On Raspberry Pi:**
```bash
ssh justin@192.168.100.68
cd /home/justin/pillpal
python3 pi_websocket_server.py
```

**On Local Machine (Windows):**
```bash
cd C:\Users\Feitan\PillApp\pillpal
npm run dev
```

### ✅ Test 2: Web App Connection to Pi

**Steps:**
1. Open the web app in your browser: `http://localhost:3000`
2. Check the top-right corner for connection status
3. Should show "Connected to Pi" (green indicator)

**Expected Result:**
- Connection indicator shows green
- No error messages in browser console

---

### ✅ Test 3: Manual Dispense (Servo1 Movement)

**Steps:**
1. Click "Dispense" button on any day card
2. Watch the console for logs
3. Observe Servo1 movement

**Expected Result:**
- Servo1 moves 30° clockwise
- Console shows: "Manual dispense bundle response"
- Servo1 position increases by 30° each time
- LED indicators update:
  - GPIO27 ON (if position 0°-120°)
  - GPIO22 ON (if position 150°-180°)

**Test Multiple Times:**
- Dispense 5 times → Servo1 should be at 150°
- Dispense 6 times → Servo1 should be at 180° and **STOP**

---

### ✅ Test 4: Servo2 Confirmation Dialog (At 180°)

**Steps:**
1. Dispense until Servo1 reaches 180° (6th dispense)
2. A dialog should appear asking for confirmation
3. Dialog message should mention "Servo1 is at 180°"

**Expected Result:**
- Dialog appears with message about 180° position
- Dialog has "Yes" and "No" buttons
- Dialog does NOT auto-close

**Test Options:**
- Click "Yes" → Servo2 should move 90° counter-clockwise, Servo1 resets to 0°
- Click "No" → Dialog closes, both servos stay in place

---

### ✅ Test 5: Physical Button (GPIO26)

**Steps:**
1. Trigger a dispense that shows the Servo2 confirmation dialog
2. Instead of clicking "Yes" in the web app, press the physical button on GPIO26
3. Watch for response

**Expected Result:**
- Button press triggers "Yes" action
- Servo2 moves 90° counter-clockwise
- Servo1 resets to 0° (if at 180°)
- Dialog closes automatically

**Test Multiple Times:**
- Press button multiple times rapidly → Should only trigger once (debouncing)
- Console should show: "Button press detected" logs

---

### ✅ Test 6: LED Level Indicators

**Steps:**
1. Start with Servo1 at 0°
2. Dispense multiple times and observe LEDs

**Expected Result:**
- **Positions 0°-120° (0-4 dispenses):**
  - GPIO27 LED: **ON** (green/yellow)
  - GPIO22 LED: **OFF**
  
- **Positions 150°-180° (5-6 dispenses):**
  - GPIO27 LED: **OFF**
  - GPIO22 LED: **ON** (red/orange)

**Test Sequence:**
- 0 dispenses (0°) → GPIO27 ON
- 1 dispense (30°) → GPIO27 ON
- 2 dispenses (60°) → GPIO27 ON
- 3 dispenses (90°) → GPIO27 ON
- 4 dispenses (120°) → GPIO27 ON
- 5 dispenses (150°) → GPIO22 ON
- 6 dispenses (180°) → GPIO22 ON

---

### ✅ Test 7: LCD Display

**Steps:**
1. Check the LCD screen on I2C address 0x27
2. Create or modify schedules in the web app
3. Watch LCD for updates

**Expected Result:**
- LCD shows: "Next: [TIME] [PERIOD]"
  - Example: "Next: 08:00 AM Morning"
  - Example: "Next: 14:00 PM Afternoon"
- Updates automatically when schedules change
- Updates every 60 seconds

**Test Scenarios:**
- No schedules → LCD shows "No schedules"
- Multiple schedules → Shows nearest upcoming time
- Change schedule time → LCD updates within 60 seconds

---

### ✅ Test 8: Schedule System with Date Picker

**Steps:**
1. Click on a day card (Saturday or Sunday)
2. Click the date picker
3. Select a specific date
4. Add medications and set times
5. Save

**Expected Result:**
- Date picker allows selecting any date
- Selected date is saved
- Schedule triggers at the selected date and time
- Console shows schedule check logs

**Test Scenarios:**
- Set Saturday to a future date → Should not trigger until that date
- Set Sunday to today → Should trigger at scheduled time
- Change date → Schedule updates

---

### ✅ Test 9: Automatic Dispense

**Steps:**
1. Set a schedule for a time 1-2 minutes in the future
2. Wait for the scheduled time
3. Watch for automatic dispense

**Expected Result:**
- At scheduled time, automatic dispense triggers
- Servo1 moves 30°
- Servo2 confirmation dialog appears (same as manual)
- All same behaviors as manual dispense

**Test Scenarios:**
- Schedule at 2 minutes from now → Wait and observe
- Multiple schedules → Each triggers independently
- Schedule at 180° position → Dialog appears correctly

---

### ✅ Test 10: Servo2 Counter-Clockwise Movement

**Steps:**
1. Trigger Servo2 movement (via dialog "Yes" or button)
2. Observe Servo2 direction

**Expected Result:**
- Servo2 moves **counter-clockwise** 90°
- Returns to 0° after 2 seconds
- Movement is smooth and consistent

---

### ✅ Test 11: Dialog Reappearance Logic

**Steps:**
1. Trigger a dispense that shows dialog
2. Click "No" (first time)
3. Wait 5 minutes
4. Dialog should reappear
5. Click "No" again (second time)
6. Dialog should wait for next dispense

**Expected Result:**
- First "No": Dialog reappears after 5 minutes
- Second "No": Dialog waits for next dispense
- "Yes": Dialog appears after next dispense

---

### ✅ Test 12: Position Persistence

**Steps:**
1. Dispense 3 times (Servo1 at 90°)
2. Restart the Python server (Ctrl+C, then restart)
3. Check Servo1 position

**Expected Result:**
- Servo1 position is restored to 90°
- LEDs show correct level
- No reset to 0°

---

### ✅ Test 13: Multiple Medications

**Steps:**
1. Add multiple medications to a schedule
2. Set different time frames (morning, afternoon, evening)
3. Dispense

**Expected Result:**
- All medications in the time frame are dispensed together
- Console shows all medication names
- Servo moves once per time frame

---

## Troubleshooting

### Connection Issues
- **Pi not connecting:** Check Python server is running, check WebSocket URL in code
- **Button not working:** Check GPIO26 wiring, check server logs for button errors
- **LCD not showing:** Check I2C address (0x27), check wiring, check server logs

### Servo Issues
- **Servo1 not moving:** Check PCA9685 connection, check channel 4
- **Servo2 not moving:** Check channel 5, check counter-clockwise direction
- **Position wrong:** Check position file in `/home/justin/pillpal/servo_positions.json`

### Dialog Issues
- **Dialog not appearing:** Check browser console, check `servo2_ready` flag in response
- **Button not triggering dialog:** Check WebSocket messages, check debouncing

### LED Issues
- **LEDs not lighting:** Check GPIO27 and GPIO22 wiring, check server logs
- **Wrong LED on:** Check servo position calculation

---

## Quick Test Sequence (5 minutes)

1. ✅ **Start Pi server:** `ssh justin@192.168.100.68` → `cd /home/justin/pillpal` → `python3 pi_websocket_server.py`
2. ✅ **Start web app:** `cd C:\Users\Feitan\PillApp\pillpal` → `npm run dev`
3. ✅ **Connect to Pi** → Check connection indicator (green)
4. ✅ **Dispense 6 times** → Watch Servo1 reach 180°
5. ✅ **Dialog appears** → Click "Yes" or press button (GPIO26)
6. ✅ **Servo2 moves** → Counter-clockwise 90°
7. ✅ **Servo1 resets** → Back to 0°
8. ✅ **Check LEDs** → GPIO27 should be ON
9. ✅ **Check LCD** → Should show next schedule time

---

## Notes

- All tests should be done in order for best results
- Keep browser console open to see logs
- Keep Python server terminal open to see server logs
- Test on both manual and automatic dispense
- Verify all hardware components are working

---

**Ready to test? Start with Test 1 and work through each one!**

