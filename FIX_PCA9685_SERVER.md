# Fix: Stop Old PCA9685 Server and Use Correct Version

## The Problem
1. Your old `pi_server_pca9685.py` is probably running as a systemd service (auto-starts on boot)
2. The new server is using direct GPIO, but you have a PCA9685 board
3. Both servers are trying to control the servo, causing conflicts

## Step 1: Stop the Old Server Completely

On your Pi, run these commands:

```bash
# Check if it's running as a service
systemctl list-units | grep pi
systemctl list-units | grep python
systemctl list-units | grep server

# Stop the service if it exists
sudo systemctl stop pi_server_pca9685
sudo systemctl disable pi_server_pca9685

# Kill any running processes
pkill -f pi_server_pca9685
pkill -f python3

# Verify it's stopped
ps aux | grep python
```

## Step 2: Use the PCA9685 Version

You need to use `pi_websocket_server_PCA9685.py` instead of the GPIO version!

Copy the PCA9685 version to your Pi:

**On Windows:**
```powershell
cd C:\Users\Feitan\PillApp\pillpal\pi-server
scp pi_websocket_server_PCA9685.py justin@192.168.100.68:/home/justin/pillpal/pi_websocket_server.py
```

**Or manually:**
1. Open `C:\Users\Feitan\PillApp\pillpal\pi-server\pi_websocket_server_PCA9685.py` on Windows
2. Copy all content
3. On Pi: `nano /home/justin/pillpal/pi_websocket_server.py`
4. Paste and save

## Step 3: Install PCA9685 Library (if needed)

```bash
pip3 install adafruit-circuitpython-servokit
# Or if that fails:
sudo apt install python3-pip
pip3 install --break-system-packages adafruit-circuitpython-servokit
```

## Step 4: Run the New Server

```bash
cd /home/justin/pillpal
python3 pi_websocket_server.py
```

## Step 5: Make It Auto-Start (Optional)

If you want it to start on boot:

```bash
sudo nano /etc/systemd/system/pillpal-server.service
```

Paste this:
```ini
[Unit]
Description=PillPal WebSocket Server
After=network.target

[Service]
Type=simple
User=justin
WorkingDirectory=/home/justin/pillpal
ExecStart=/usr/bin/python3 /home/justin/pillpal/pi_websocket_server.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Then:
```bash
sudo systemctl daemon-reload
sudo systemctl enable pillpal-server
sudo systemctl start pillpal-server
sudo systemctl status pillpal-server
```




