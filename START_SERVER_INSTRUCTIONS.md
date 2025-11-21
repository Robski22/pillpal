# How to Start the Updated Server

## Step-by-Step Instructions

### Step 1: Copy Updated Server to Raspberry Pi

From your Windows computer, open PowerShell or Command Prompt and run:

```bash
scp C:\Users\Feitan\PillApp\pillpal\pi-server\pi_websocket_server_PCA9685.py justin@192.168.100.220:/home/justin/pillpal/
```

**What this does:**
- Copies the updated server file to your Raspberry Pi
- You'll be prompted for the password

### Step 2: Connect to Raspberry Pi

```bash
ssh justin@192.168.100.220
```

**What this does:**
- Connects you to the Raspberry Pi via SSH
- You'll be prompted for the password

### Step 3: Stop the Old Server (if running)

```bash
cd /home/justin/pillpal
pkill -f pi_websocket_server_PCA9685.py
sleep 2
```

**What this does:**
- Stops any running instance of the server
- Waits 2 seconds to ensure it's fully stopped

### Step 4: Start the New Server

```bash
python3 pi_websocket_server_PCA9685.py
```

**What this does:**
- Starts the updated server
- You'll see startup logs showing:
  - Server listening on port 8765
  - Servo controller initialized
  - SMS controller initialized
  - LCD controller initialized
  - LED controller initialized
  - Buzzer controller initialized
  - Button monitoring started

### Step 5: Keep Server Running (Optional - Run in Background)

If you want the server to run in the background (so you can close the terminal):

```bash
nohup python3 pi_websocket_server_PCA9685.py > server.log 2>&1 &
```

**What this does:**
- Runs server in background
- Logs output to `server.log` file
- Server continues running even if you disconnect

### Step 6: Check Server Status

To see if server is running:

```bash
ps aux | grep pi_websocket_server_PCA9685.py
```

To see server logs (if running in background):

```bash
tail -f server.log
```

To stop background server:

```bash
pkill -f pi_websocket_server_PCA9685.py
```

## Quick Start (All in One)

If you want to do everything in one go:

```bash
# From Windows PowerShell/CMD
scp C:\Users\Feitan\PillApp\pillpal\pi-server\pi_websocket_server_PCA9685.py justin@192.168.100.220:/home/justin/pillpal/

# Then SSH and restart
ssh justin@192.168.100.220 "cd /home/justin/pillpal && pkill -f pi_websocket_server_PCA9685.py && sleep 2 && python3 pi_websocket_server_PCA9685.py"
```

## Troubleshooting

### Port Already in Use Error

If you see: `OSError: [Errno 98] address already in use`

```bash
# Kill the process using port 8765
sudo lsof -ti:8765 | xargs kill -9

# Or kill all Python processes (be careful!)
pkill -9 python3

# Then start server again
python3 pi_websocket_server_PCA9685.py
```

### Permission Denied

If you get permission errors:

```bash
# Make sure you're in the right directory
cd /home/justin/pillpal

# Check file permissions
ls -la pi_websocket_server_PCA9685.py

# If needed, make it executable
chmod +x pi_websocket_server_PCA9685.py
```

### Module Not Found Errors

If you see import errors:

```bash
# Install required packages
pip3 install websockets pyserial adafruit-circuitpython-pca9685 adafruit-circuitpython-servokit RPi.GPIO
```

## Verify Server is Working

1. **Check server logs** - You should see:
   - ✅ Listening on 0.0.0.0:8765
   - ✅ Servo Controller: Active
   - ✅ SMS Controller: Active
   - ✅ LCD Controller: Active
   - ✅ LED Controller: Active
   - ✅ Buzzer Controller: Active

2. **Test from frontend** - Connect to Pi from your web app
3. **Check WebSocket connection** - Should connect successfully

## Auto-Start on Boot (Optional)

If you want the server to start automatically when Raspberry Pi boots:

```bash
# Create systemd service file
sudo nano /etc/systemd/system/pillpal.service
```

Add this content:

```ini
[Unit]
Description=PillPal WebSocket Server
After=network.target

[Service]
Type=simple
User=justin
WorkingDirectory=/home/justin/pillpal
ExecStart=/usr/bin/python3 /home/justin/pillpal/pi_websocket_server_PCA9685.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Then enable and start:

```bash
sudo systemctl enable pillpal.service
sudo systemctl start pillpal.service
```

Check status:

```bash
sudo systemctl status pillpal.service
```

