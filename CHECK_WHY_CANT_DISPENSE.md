# Why Can't You Dispense?

## The Dispense Button is Disabled If:

1. **No time is set for the time frame** ⏰
   - You need to click "Set Time" for the time frame (Morning/Afternoon/Evening)
   - The button shows "No time set" if time isn't set

2. **Date is not today** 📅
   - The date must match today's date
   - Check the date at the top of the card

3. **Raspberry Pi not connected** 🔌
   - Need to be connected to Pi
   - Or use force dispense (hold button 2 seconds)

4. **No medications** 💊
   - Need at least one medication in the time frame

## Quick Fix Steps:

### Step 1: Set Time for Time Frame
1. Look at your medication card (Morning/Afternoon/Evening)
2. Find "No time set" with a clock icon
3. Click "Set Time" (blue link)
4. Set a time (e.g., 08:00 for Morning)
5. Click "Save"

### Step 2: Check Date
1. Look at the top of the card
2. Check the date shown
3. If it's not today, click the date and set it to today

### Step 3: Check Pi Connection
1. Look at the top of the page
2. Should show "Connected to Raspberry Pi" (green)
3. If not, start the Pi server

### Step 4: Try Dispense Again
After setting time and date, the "Dispense" button should be enabled (green)

---

## If Still Not Working:

The issue is likely:
- **Time not set** - Most common issue
- **Date not today** - Second most common

`servo_config` being empty is NOT the problem - it's not used for dispense.

