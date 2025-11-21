# Check if Server is Running

## The Problem
If servo1 (channel 4) is not moving when you click dispense, the server might not be running.

## Quick Check

### On Raspberry Pi:
1. SSH into your Pi:
   ```bash
   ssh justin@192.168.100.220
   ```

2. Check if server is running:
   ```bash
   ps aux | grep pi_websocket_server_PCA9685
   ```

3. If you see a process, the server is running.
4. If you see nothing, the server is NOT running.

## Start the Server

### If server is NOT running:

1. SSH into Pi:
   ```bash
   ssh justin@192.168.100.220
   ```

2. Navigate to directory:
   ```bash
   cd /home/justin/pillpal
   ```

3. Start the server:
   ```bash
   python3 pi_websocket_server_PCA9685.py
   ```

4. You should see:
   - "Server started on ws://0.0.0.0:8765"
   - "PCA9685 initialized"
   - "Servo1 initialized"
   - "Servo2 initialized"

## Stop the Server

If you need to stop it:
```bash
pkill -f pi_websocket_server_PCA9685.py
```

## Check Connection from Frontend

1. Open your web app
2. Check the top of the page - should show "Connected to Raspberry Pi" (green)
3. If it shows "Not connected" (yellow), the server is not running or not reachable

## What Should Happen When You Click Dispense

1. ✅ Servo1 (channel 4) moves first (30° increment)
2. ✅ Then shows "Dispense Medicine? Yes/No" dialog
3. ✅ If "Yes" → Servo2 moves (3° to 100° to 3°)
4. ✅ If "No" → Dialog reappears after 1 minute

If servo1 doesn't move, the server is likely not running!

