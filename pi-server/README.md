# Raspberry Pi WebSocket Server

This folder contains the Python WebSocket server that runs on your Raspberry Pi.

## File Location

- **VS Code Project**: `PillApp/pillpal/pi-server/pi_websocket_server.py` (for version control)
- **Raspberry Pi**: Copy this file to your Pi (e.g., `/home/pi/pillpal/pi_websocket_server.py`)

## Quick Setup on Raspberry Pi

1. **Copy file to Pi:**
   ```bash
   scp pi-server/pi_websocket_server.py pi@your-pi-ip:/home/pi/pillpal/
   ```

2. **Install dependencies:**
   ```bash
   pip3 install websockets
   ```

3. **Uncomment hardware code** in the file (GPIO/Servo imports)

4. **Run the server:**
   ```bash
   python3 pi_websocket_server.py
   ```

## Important

This file must run **on the Raspberry Pi**, not in VS Code. VS Code is just for editing and version control.


