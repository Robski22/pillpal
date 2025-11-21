# Setup VS Code Remote SSH to Edit Pi Files Directly

## Problem
You used to edit files directly in VS Code and changes appeared on the Pi. After changing devices, this no longer works.

## Solution: VS Code Remote SSH Extension

This lets you edit files on the Raspberry Pi directly from VS Code.

---

## Step 1: Install Remote SSH Extension in VS Code

1. Open VS Code
2. Click Extensions icon (or press `Ctrl+Shift+X`)
3. Search for: **"Remote - SSH"**
4. Install the extension by Microsoft

---

## Step 2: Get Your Pi's IP Address and SSH Details

You need:
- **Pi IP Address**: `192.168.1.45` (or check with `hostname -I` on Pi)
- **Pi Username**: Usually `pi` or `justin` (based on your files)
- **SSH Access**: Make sure SSH is enabled on Pi

### Enable SSH on Pi (if not enabled):
```bash
# On Pi, run:
sudo systemctl enable ssh
sudo systemctl start ssh
```

---

## Step 3: Connect to Pi from VS Code

### Option A: Quick Connect

1. Press `Ctrl+Shift+P` (or `F1`)
2. Type: **"Remote-SSH: Connect to Host"**
3. Enter: `pi@192.168.1.45` (or `justin@192.168.1.45`)
4. Select platform: **Linux**
5. Enter password when prompted
6. VS Code will connect and open a new window

### Option B: Configure SSH Config (Recommended)

1. Press `Ctrl+Shift+P`
2. Type: **"Remote-SSH: Open SSH Configuration File"**
3. Select: **`C:\Users\Feitan\.ssh\config`** (or create if doesn't exist)

4. Add this configuration:
```ssh
Host pillpal-pi
    HostName 192.168.1.45
    User pi
    # Or use: User justin
    # Optional: IdentityFile ~/.ssh/id_rsa
```

5. Save the file
6. Press `Ctrl+Shift+P` → **"Remote-SSH: Connect to Host"**
7. Select **"pillpal-pi"**
8. Enter password

---

## Step 4: Open Pi Folder in VS Code

After connecting:

1. Click **File** → **Open Folder**
2. Navigate to your Pi project folder (e.g., `/home/pi/pillpal/`)
3. Or use terminal: `cd /home/pi/pillpal`

Now you can edit files directly on the Pi!

---

## Step 5: Edit the WebSocket Server File

1. In VS Code (connected to Pi), open:
   - `/home/pi/pillpal/pi_websocket_server.py` (or wherever your server file is)

2. Make your changes
3. Save (`Ctrl+S`)
4. Changes are **immediately on the Pi** - no copying needed!

---

## Troubleshooting

### "Permission Denied" Error

**Fix:** Use correct username
```bash
# Check Pi username:
whoami
# Then use that username in SSH config
```

### "Host Key Verification Failed"

**Fix:** Remove old key
```bash
# On Windows, run in PowerShell:
ssh-keygen -R 192.168.1.45
```

### Can't Connect - "Connection Refused"

**Check:**
1. Pi is powered on
2. Pi is on same network
3. SSH is enabled: `sudo systemctl status ssh`
4. Firewall allows SSH: `sudo ufw allow 22`

### Password Authentication Fails

**Option 1:** Use SSH key (recommended)
```bash
# On Windows, generate key:
ssh-keygen -t rsa -b 4096

# Copy to Pi:
ssh-copy-id pi@192.168.1.45
```

**Option 2:** Check Pi password is correct

---

## Quick Test

1. Connect via Remote SSH
2. Open a file on Pi
3. Make a small change (add a comment)
4. Save
5. On Pi terminal, check: `cat filename.py` - change should be there!

---

## Benefits

✅ Edit files directly on Pi  
✅ No need to copy files manually  
✅ Changes appear immediately  
✅ Full VS Code features (IntelliSense, debugging, etc.)  
✅ Terminal access to Pi from VS Code  

---

## Alternative: Use SFTP Extension

If Remote SSH doesn't work, try:
1. Install **"SFTP"** extension
2. Configure to sync files automatically
3. Less seamless but works

---

## Your Setup Should Be:

```
VS Code (Windows) 
    ↓ Remote SSH
Raspberry Pi (192.168.1.45)
    ↓ Edit files directly
/home/pi/pillpal/pi_websocket_server.py
```

Now when you edit in VS Code, it edits directly on the Pi! 🎉




