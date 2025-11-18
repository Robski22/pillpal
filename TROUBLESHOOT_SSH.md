# Troubleshoot SSH Connection to Raspberry Pi

## Problem: "Connection timed out" when trying to SSH

This means your computer can't reach the Pi at `192.168.1.45:22`.

---

## ✅ Step 1: Check Pi is Powered On

- Is the Pi's power LED on?
- Is it fully booted? (Wait 30-60 seconds after power on)

---

## ✅ Step 2: Check Pi is on Same Network

**Your computer and Pi must be on the same Wi-Fi/network.**

**Check your computer's IP:**
```powershell
ipconfig
```
Look for your IP address (should be something like `192.168.1.XXX`)

**If your IP is different network (e.g., `192.168.0.XXX`):**
- Pi is on `192.168.1.45` but your computer is on `192.168.0.XXX`
- They're on different networks - can't connect!

**Solution:**
- Connect both to the same Wi-Fi network
- Or use Pi's IP on your network

---

## ✅ Step 3: Check Pi's IP Address

**The IP might have changed!**

**Option A: Check Router Admin Panel**
1. Log into your router (usually `192.168.1.1` or `192.168.0.1`)
2. Look for connected devices
3. Find "raspberrypi" or similar
4. Check its IP address

**Option B: Use Network Scanner**
```powershell
# Scan your network for Pi
arp -a | findstr "192.168.1"
```

**Option C: If Pi has Display/Keyboard**
- Connect display and keyboard to Pi
- Run: `hostname -I` or `ifconfig`
- This shows Pi's current IP

---

## ✅ Step 4: Check SSH is Enabled on Pi

**If you have physical access to Pi:**
1. Connect display/keyboard
2. Run: `sudo systemctl status ssh`
3. Should show "active (running)"
4. If not: `sudo systemctl enable ssh` and `sudo systemctl start ssh`

**If you don't have access:**
- SSH might be disabled
- Need to enable it via SD card or physical access

---

## ✅ Step 5: Check Firewall

**On Pi (if accessible):**
```bash
sudo ufw status
# If enabled, allow SSH:
sudo ufw allow 22
```

**On Windows:**
- Windows Firewall shouldn't block outbound SSH
- But check if you have third-party firewall

---

## ✅ Step 6: Test Network Connectivity

**Ping the Pi:**
```powershell
ping 192.168.1.45
```

**If ping works but SSH doesn't:**
- Pi is reachable but SSH port (22) is blocked or SSH is disabled

**If ping fails:**
- Pi is not reachable (wrong IP, different network, or offline)

---

## ✅ Step 7: Try Different Port

**If SSH is on different port:**
```powershell
ssh -p 2222 justin@192.168.1.45
# Or whatever port SSH is configured on
```

---

## ✅ Step 8: Check Username

**Common Pi usernames:**
- `pi` (default on older Raspberry Pi OS)
- `justin` (your username)
- Your custom username

**Try:**
```powershell
ssh pi@192.168.1.45
# Or
ssh justin@192.168.1.45
```

---

## 🔧 Quick Fixes

### Fix 1: Find Pi's Current IP
```powershell
# Scan network
arp -a
# Look for MAC address starting with B8:27:EB or DC:A6:32 (Raspberry Pi)
```

### Fix 2: Enable SSH via SD Card (if Pi not accessible)
1. Remove SD card from Pi
2. Insert into computer
3. Create empty file named `ssh` (no extension) in `boot` partition
4. Put SD card back in Pi
5. Boot Pi - SSH will be enabled

### Fix 3: Use VNC or Physical Access
- If you can access Pi via VNC or physically
- Enable SSH: `sudo systemctl enable ssh && sudo systemctl start ssh`

---

## 🎯 Most Common Issues

1. **Pi is off or not booted** → Wait for it to fully boot
2. **Different networks** → Connect both to same Wi-Fi
3. **Wrong IP address** → Pi's IP changed, find new IP
4. **SSH disabled** → Enable SSH on Pi
5. **Firewall blocking** → Allow port 22 on Pi

---

## ✅ Test Steps

1. **Ping test:**
   ```powershell
   ping 192.168.1.45
   ```
   - If works → Network OK, SSH issue
   - If fails → Network/IP issue

2. **Check your network:**
   ```powershell
   ipconfig
   ```
   - Check if you're on `192.168.1.XXX` network

3. **Try different username:**
   ```powershell
   ssh pi@192.168.1.45
   ```

---

## 💡 Alternative: Use VS Code Remote SSH

**If SSH works but you want easier access:**
1. Install "Remote - SSH" extension in VS Code
2. Configure SSH connection
3. Connect directly from VS Code

See `SETUP_REMOTE_SSH.md` for details.

---

## 🚨 If Still Can't Connect

**Last resort options:**
1. **Physical access:** Connect display/keyboard, enable SSH
2. **VNC:** If VNC works, use it to enable SSH
3. **SD card method:** Enable SSH via SD card (create `ssh` file)
4. **Check router:** See what devices are connected, find Pi's IP

---

## ✅ Summary

**Most likely causes:**
1. Pi is off or not on network
2. Wrong IP address (Pi's IP changed)
3. Different networks (Pi on different Wi-Fi)
4. SSH not enabled on Pi

**Quick test:**
```powershell
ping 192.168.1.45
```
- If this works → SSH issue
- If this fails → Network/IP issue

