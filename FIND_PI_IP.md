# How to Find Raspberry Pi IP Address

## Method 1: Scan Your Network (Quick)

### Step 1: Get All Devices on Your Network
```powershell
arp -a
```
This shows all devices your computer has talked to.

### Step 2: Look for Raspberry Pi
Raspberry Pi MAC addresses usually start with:
- `B8:27:EB` (older Pi models)
- `DC:A6:32` (newer Pi models)
- `E4:5F:01` (some models)

### Step 3: Try SSH to Each IP
Try connecting to each IP you find:
```powershell
ssh pi@192.168.100.68
ssh justin@192.168.100.68
```

---

## Method 2: Use Router Admin Panel (Most Reliable)

### Step 1: Find Router IP
```powershell
ipconfig
```
Look for "Default Gateway" - usually `192.168.100.1` or `192.168.1.1`

### Step 2: Open Router Admin
1. Open browser
2. Go to: `http://192.168.100.1` (or your gateway IP)
3. Login (check router label for default password)

### Step 3: Find Connected Devices
- Look for "Connected Devices" or "DHCP Clients" or "Network Map"
- Find device named:
  - "raspberrypi"
  - "justin" (if that's the hostname)
  - Or look for MAC address starting with `B8:27:EB` or `DC:A6:32`

### Step 4: Note the IP Address
The router will show the Pi's current IP address.

---

## Method 3: Network Scanner Tool

### Option A: Advanced IP Scanner (Free)
1. Download: https://www.advanced-ip-scanner.com/
2. Install and run
3. Click "Scan"
4. Look for "raspberrypi" or Pi MAC address
5. See IP address

### Option B: Angry IP Scanner (Free)
1. Download: https://angryip.org/
2. Set range: `192.168.100.1` to `192.168.100.254`
3. Click "Start"
4. Look for Pi in results

---

## Method 4: If Pi Has Display/Keyboard

### Connect to Pi Directly:
1. Connect monitor and keyboard to Pi
2. Login
3. Run:
   ```bash
   hostname -I
   # Or
   ifconfig
   # Or
   ip addr show
   ```
4. This shows Pi's IP address

---

## Method 5: Try Common IPs

**If Pi is on your network (192.168.100.x), try:**
```powershell
# Try common IPs
ping 192.168.100.1
ping 192.168.100.2
ping 192.168.100.10
ping 192.168.100.20
ping 192.168.100.50
ping 192.168.100.68
ping 192.168.100.100
```

**If ping works, try SSH:**
```powershell
ssh pi@192.168.100.XX
ssh justin@192.168.100.XX
```

---

## Method 6: Use nmap (If Installed)

```powershell
# Install nmap first (if not installed):
# Download from: https://nmap.org/download.html

# Scan your network:
nmap -sn 192.168.100.0/24
```

This scans all IPs on your network and shows which are online.

---

## Method 7: Check Pi's Hostname

**If Pi is on your network, try:**
```powershell
ping raspberrypi
ping justin
```

If this works, the hostname resolves to an IP you can use.

---

## Quick PowerShell Script to Find Pi

**Save this as `find-pi.ps1`:**
```powershell
# Get your network range
$network = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -like "192.168.100.*"}).IPAddress
$base = $network -replace "\d+$", ""

# Try common Pi IPs
$commonIPs = 1..254 | ForEach-Object { "$base$_" }

foreach ($ip in $commonIPs) {
    $result = Test-Connection -ComputerName $ip -Count 1 -Quiet -ErrorAction SilentlyContinue
    if ($result) {
        Write-Host "Found device at: $ip" -ForegroundColor Green
        # Try to get hostname
        try {
            $hostname = [System.Net.Dns]::GetHostEntry($ip).HostName
            Write-Host "  Hostname: $hostname" -ForegroundColor Yellow
        } catch {}
    }
}
```

---

## ✅ Recommended: Router Admin Method

**Easiest and most reliable:**
1. Open router admin (`http://192.168.100.1`)
2. Look at connected devices
3. Find "raspberrypi" or Pi MAC address
4. Note the IP address
5. Use that IP for SSH

---

## 🎯 After Finding IP

**Update your connection:**
```powershell
ssh justin@NEW_IP_ADDRESS
# Or
ssh pi@NEW_IP_ADDRESS
```

**Update in VS Code Remote SSH:**
- Edit SSH config
- Change `HostName` to new IP

**Update in your app:**
- If you hardcoded IP anywhere, update it

---

## 💡 Pro Tip: Set Static IP on Pi

**Once you find the Pi, set a static IP so it doesn't change:**
1. SSH to Pi
2. Edit: `sudo nano /etc/dhcpcd.conf`
3. Add:
   ```
   interface wlan0
   static ip_address=192.168.100.100/24
   static routers=192.168.100.1
   static domain_name_servers=192.168.100.1
   ```
4. Reboot: `sudo reboot`

Now Pi will always be at `192.168.100.100` (or whatever IP you set).




