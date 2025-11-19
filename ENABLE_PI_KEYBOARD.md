# Enable On-Screen Keyboard on Raspberry Pi

## Method 1: Using Raspberry Pi OS Desktop (Easiest)

### Step 1: Open Preferences
1. Click the **Raspberry Pi menu** (top left)
2. Go to **Preferences** → **Onboard Settings**
   - OR search for "Onboard" in the menu

### Step 2: Enable Onboard
1. If Onboard is not installed, install it first:
   ```bash
   sudo apt update
   sudo apt install onboard -y
   ```
2. Open **Onboard** from the menu
3. The keyboard should appear on screen

### Step 3: Auto-start Onboard (Optional)
1. Go to **Preferences** → **Main Menu Editor**
2. Find **Onboard** and check "Show in startup programs"
3. Or add to autostart:
   ```bash
   mkdir -p ~/.config/autostart
   cp /usr/share/applications/onboard.desktop ~/.config/autostart/
   ```

---

## Method 2: Using Matchbox Keyboard (Lightweight)

### Install Matchbox Keyboard:
```bash
sudo apt update
sudo apt install matchbox-keyboard -y
```

### Run it:
```bash
matchbox-keyboard
```

### Auto-start on boot:
```bash
sudo nano ~/.config/lxsession/LXDE-pi/autostart
```

Add this line:
```
@matchbox-keyboard
```

Save (`Ctrl+O`, `Enter`, `Ctrl+X`)

---

## Method 3: Using Florence Virtual Keyboard

### Install:
```bash
sudo apt update
sudo apt install florence -y
```

### Run:
```bash
florence
```

---

## Method 4: Quick Enable via Terminal

**If you have terminal access but no keyboard:**

### Enable SSH first (if not enabled):
```bash
sudo systemctl enable ssh
sudo systemctl start ssh
```

Then connect from your Windows computer via SSH and use your computer's keyboard!

---

## Method 5: Using Accessibility Settings

1. Click **Raspberry Pi menu** → **Preferences** → **Accessibility**
2. Enable **"Onboard on-screen keyboard"**
3. Check **"Show on-screen keyboard"**

---

## Quick Commands (If You Have Terminal Access)

### Check if Onboard is installed:
```bash
which onboard
```

### Install Onboard:
```bash
sudo apt update
sudo apt install onboard -y
```

### Launch Onboard:
```bash
onboard &
```

### Make it always visible:
1. Right-click Onboard window
2. Select **"Keep above other windows"**

---

## Troubleshooting

### Onboard not showing:
```bash
# Kill and restart:
killall onboard
onboard &
```

### Keyboard too small:
- Right-click Onboard → **Preferences** → **Theme** → Choose larger theme
- Or drag corners to resize

### Keyboard blocking screen:
- Right-click Onboard → **"Keep above other windows"** (uncheck)
- Or move it to bottom of screen

---

## Alternative: Use SSH from Windows

**If you can't get on-screen keyboard working:**

1. **Enable SSH on Pi** (if you have terminal):
   ```bash
   sudo systemctl enable ssh
   sudo systemctl start ssh
   ```

2. **Find Pi's IP** (from Pi terminal):
   ```bash
   hostname -I
   ```

3. **Connect from Windows:**
   ```powershell
   ssh pi@PI_IP_ADDRESS
   # Or
   ssh justin@PI_IP_ADDRESS
   ```

4. **Now you can use your Windows keyboard!**

---

## Recommended: Onboard (Easiest)

**Onboard is the best option:**
- Built into Raspberry Pi OS
- Easy to use
- Customizable
- Can auto-start

**Quick setup:**
```bash
sudo apt update
sudo apt install onboard -y
onboard &
```

Then you can type using the on-screen keyboard!

---

## ✅ Summary

**Easiest method:**
1. Menu → Preferences → Onboard Settings
2. Or install: `sudo apt install onboard -y`
3. Run: `onboard`

**Alternative:**
- Use SSH from Windows computer (if SSH is enabled)
- Use your Windows keyboard to control Pi


