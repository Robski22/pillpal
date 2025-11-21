# Where to Edit the PCA Server Code

## File Location on Raspberry Pi

**The file you need to edit is:**
```
/home/justin/pillpal/pi_websocket_server.py
```

## How to Edit It

### Option 1: Using VS Code Remote SSH (Easiest)

1. **Connect to Pi via Remote SSH in VS Code:**
   - Open VS Code
   - Click the Remote SSH extension icon (bottom left)
   - Connect to: `justin@192.168.100.68`
   - Navigate to: `/home/justin/pillpal/pi_websocket_server.py`
   - Edit directly in VS Code

### Option 2: Using Nano (Command Line)

1. **SSH to your Pi:**
   ```bash
   ssh justin@192.168.100.68
   ```

2. **Navigate to the folder:**
   ```bash
   cd /home/justin/pillpal
   ```

3. **Edit the file:**
   ```bash
   nano pi_websocket_server.py
   ```

4. **Save and exit:**
   - Press `Ctrl + O` to save
   - Press `Enter` to confirm
   - Press `Ctrl + X` to exit

### Option 3: Copy from Your Computer

1. **On your Windows computer, the file is at:**
   ```
   C:\Users\Feitan\PillApp\pillpal\pi-server\pi_websocket_server_PCA9685.py
   ```

2. **Copy it to your Pi:**
   ```powershell
   # From PowerShell on your computer
   cd C:\Users\Feitan\PillApp\pillpal\pi-server
   scp -o KexAlgorithms=+diffie-hellman-group1-sha1 -o HostKeyAlgorithms=+ssh-dss pi_websocket_server_PCA9685.py justin@192.168.100.68:/home/justin/pillpal/pi_websocket_server.py
   ```

## Verify You Have the Right File

**The file should contain these key things:**

1. **At the top, you should see:**
   ```python
   from adafruit_servokit import ServoKit
   PCA9685_AVAILABLE = True
   ```

2. **In the ServoController class, you should see:**
   ```python
   POSITION_FILE = "/home/justin/pillpal/servo_positions.json"
   DISPENSE_INCREMENT = 30
   ```

3. **It should have these methods:**
   - `_load_positions()` - loads saved positions
   - `_save_positions()` - saves positions
   - `dispense()` - moves servo 30 degrees

## Check Current File

**On your Pi, run:**
```bash
# Check if file exists
ls -lh /home/justin/pillpal/pi_websocket_server.py

# Check first few lines to verify it's PCA9685 version
head -30 /home/justin/pillpal/pi_websocket_server.py
```

**You should see:**
- `from adafruit_servokit import ServoKit`
- `PCA9685_AVAILABLE`
- `ServoKit(channels=16, address=0x40)`

## If File Doesn't Exist or Wrong Version

**Copy the correct file from your computer:**
```powershell
# Stop the server first
ssh justin@192.168.100.68 "pkill -f pi_websocket_server"

# Copy the file
scp -o KexAlgorithms=+diffie-hellman-group1-sha1 -o HostKeyAlgorithms=+ssh-dss C:\Users\Feitan\PillApp\pillpal\pi-server\pi_websocket_server_PCA9685.py justin@192.168.100.68:/home/justin/pillpal/pi_websocket_server.py
```

---

## Summary

- **File to edit:** `/home/justin/pillpal/pi_websocket_server.py` (on Pi)
- **Source file:** `C:\Users\Feitan\PillApp\pillpal\pi-server\pi_websocket_server_PCA9685.py` (on your computer)
- **Best method:** Use VS Code Remote SSH to edit directly
- **Position persistence:** Already implemented in the PCA9685 version!



