# Fix Syntax Error in Python File

## The Problem

You have a syntax error on line 110. It looks like JavaScript code (`//`) was accidentally pasted into the Python file.

## Solution: Check Line 110

**On your Pi, run:**
```bash
# Check what's on line 110
sed -n '105,115p' /home/justin/pillpal/pi_websocket_server.py
```

**The correct code around line 110 should be:**
```python
            # Set actuation range to 180 degrees
            self.kit.servo[channel].actuation_range = 180
            
            # Set pulse width range for accurate positioning
            # Standard servos: 500-2500 microseconds (0.5-2.5ms) for 180 degrees
            # If rotating too much, reduce maximum pulse width
            # Try narrower range: 500-2400 to stop exactly at 180°
            try:
                self.kit.servo[channel].set_pulse_width_range(500, 2400)
                logger.info("✅ Servo pulse width set to 500-2400 microseconds (calibrated for exact 180°)")
```

## Quick Fix Options

### Option 1: Copy the entire file again

**From Windows PowerShell:**
```powershell
cd C:\Users\Feitan\PillApp\pillpal\pi-server
scp -o KexAlgorithms=+diffie-hellman-group1-sha1 -o HostKeyAlgorithms=+ssh-dss pi_websocket_server_PCA9685.py justin@192.168.100.68:/home/justin/pillpal/pi_websocket_server.py
```

### Option 2: Fix just line 110 in nano

**On your Pi:**
```bash
nano /home/justin/pillpal/pi_websocket_server.py
```

**Find line 110 and make sure it's a Python comment (`#`), not JavaScript (`//`):**

**WRONG:**
```python
// Check if there's a hash fragment in the URL (from password reset email)
```

**CORRECT:**
```python
# Set pulse width range for accurate positioning
```

**Or just delete the problematic line if it's not needed.**

### Option 3: Check for all JavaScript comments

**On your Pi:**
```bash
# Find all JavaScript-style comments (//) in the file
grep -n "//" /home/justin/pillpal/pi_websocket_server.py
```

**Replace them with Python comments (`#`).**

---

## After Fixing

1. **Save the file** (Ctrl+O, Enter, Ctrl+X in nano)
2. **Test syntax:**
   ```bash
   python3 -m py_compile /home/justin/pillpal/pi_websocket_server.py
   ```
   Should show no errors.

3. **Start the server:**
   ```bash
   python3 /home/justin/pillpal/pi_websocket_server.py
   ```

---

## Most Likely Issue

You probably accidentally pasted some JavaScript/TypeScript code from `page.tsx` into the Python file. Make sure you're only copying Python code!

