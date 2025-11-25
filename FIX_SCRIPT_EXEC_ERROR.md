# 🔧 Fix Script Execution Error (203/EXEC)

## Problem
`status=203/EXEC` means systemd can't execute the script. Common causes:
1. Missing shebang line (`#!/bin/bash`)
2. Script doesn't have execute permissions
3. Wrong line endings (Windows vs Linux)
4. Script file doesn't exist

## Solution: Fix the Script

### Step 1: Check Script Exists and Permissions

```bash
# Check if script exists
ls -la ~/scripts/update_tunnel_url.sh

# If it doesn't exist or has wrong permissions, fix it
chmod +x ~/scripts/update_tunnel_url.sh
```

### Step 2: Verify Script Has Shebang Line

```bash
# View first line of script
head -1 ~/scripts/update_tunnel_url.sh
```

**It MUST start with:** `#!/bin/bash`

### Step 3: Recreate Script Correctly

If the script is missing or corrupted, recreate it:

```bash
# Remove old script (if needed)
rm ~/scripts/update_tunnel_url.sh

# Create new script
nano ~/scripts/update_tunnel_url.sh
```

**Paste this (make sure first line is `#!/bin/bash`):**

```bash
#!/bin/bash

# Auto-Update Tunnel URL Script
# Uses Supabase update_pi_url stored procedure

# Wait for cloudflared to start and generate URL
sleep 20

# Get the tunnel URL from cloudflared logs
TUNNEL_URL=$(sudo journalctl -u cloudflared-tunnel -n 200 | grep -oP 'https://[a-z0-9-]+\.trycloudflare\.com' | tail -1)

if [ -z "$TUNNEL_URL" ]; then
    echo "$(date): Failed to get tunnel URL from cloudflared logs"
    sleep 10
    TUNNEL_URL=$(sudo journalctl -u cloudflared-tunnel -n 200 | grep -oP 'https://[a-z0-9-]+\.trycloudflare\.com' | tail -1)
    
    if [ -z "$TUNNEL_URL" ]; then
        echo "$(date): Still failed to get tunnel URL. Exiting."
        exit 1
    fi
fi

# Convert https:// to wss:// for WebSocket
WS_URL=$(echo $TUNNEL_URL | sed 's|https://|wss://|')

echo "$(date): Found tunnel URL: $WS_URL"

# Your Supabase credentials (REPLACE THESE!)
SUPABASE_URL="https://ubpyymhxyjtbcifspcwj.supabase.co"
SUPABASE_SERVICE_KEY="YOUR_SERVICE_ROLE_KEY_HERE"

# Call the update_pi_url stored procedure
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  "${SUPABASE_URL}/rest/v1/rpc/update_pi_url" \
  -H "apikey: ${SUPABASE_SERVICE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=minimal" \
  -d "{\"url\": \"${WS_URL}\"}")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "204" ]; then
    echo "$(date): ✅ Successfully updated database with: $WS_URL"
    exit 0
else
    echo "$(date): ❌ Error updating database. HTTP Code: $HTTP_CODE"
    echo "$(date): Response: $BODY"
    exit 1
fi
```

**Important:**
- First line MUST be `#!/bin/bash`
- Replace `YOUR_SERVICE_ROLE_KEY_HERE` with your actual Supabase service role key
- Save: `Ctrl+X`, then `Y`, then `Enter`

### Step 4: Fix Line Endings (If Copied from Windows)

```bash
# Convert Windows line endings to Linux
dos2unix ~/scripts/update_tunnel_url.sh

# If dos2unix is not installed:
sudo apt install dos2unix
dos2unix ~/scripts/update_tunnel_url.sh
```

### Step 5: Make Script Executable

```bash
chmod +x ~/scripts/update_tunnel_url.sh
```

### Step 6: Test Script Manually

```bash
# Test the script directly
~/scripts/update_tunnel_url.sh
```

If it works manually, the service should work too.

### Step 7: Verify Script Format

```bash
# Check first line (should be #!/bin/bash)
head -1 ~/scripts/update_tunnel_url.sh

# Check file type
file ~/scripts/update_tunnel_url.sh

# Check permissions
ls -la ~/scripts/update_tunnel_url.sh
```

Should show:
- `-rwxr-xr-x` (executable)
- First line: `#!/bin/bash`

### Step 8: Restart Service

```bash
# Reload systemd
sudo systemctl daemon-reload

# Start service
sudo systemctl start update-tunnel-url.service

# Check status
sudo systemctl status update-tunnel-url.service

# Check logs
sudo journalctl -u update-tunnel-url -n 50
```

---

## Quick Fix Commands

Run these in order:

```bash
# 1. Check script exists
ls -la ~/scripts/update_tunnel_url.sh

# 2. Check first line has shebang
head -1 ~/scripts/update_tunnel_url.sh

# 3. Fix line endings (if needed)
sudo apt install -y dos2unix
dos2unix ~/scripts/update_tunnel_url.sh

# 4. Make executable
chmod +x ~/scripts/update_tunnel_url.sh

# 5. Test manually
~/scripts/update_tunnel_url.sh

# 6. Restart service
sudo systemctl daemon-reload
sudo systemctl start update-tunnel-url.service
sudo systemctl status update-tunnel-url.service
```

---

## Common Issues

### Missing Shebang
If `head -1` doesn't show `#!/bin/bash`, the script won't run. Make sure first line is exactly:
```bash
#!/bin/bash
```

### Wrong Permissions
If `ls -la` doesn't show `x` (execute) permission:
```bash
chmod +x ~/scripts/update_tunnel_url.sh
```

### Windows Line Endings
If script was created on Windows, convert:
```bash
dos2unix ~/scripts/update_tunnel_url.sh
```

---

## Expected Output After Fix

After `sudo systemctl status update-tunnel-url.service`:
- ✅ `Active: inactive (dead)` or `Active: active (exited)` 
- ✅ No `203/EXEC` error
- ✅ `Main PID: XXXX (code=exited, status=0/SUCCESS)`

After `sudo journalctl -u update-tunnel-url -n 50`:
- ✅ `Found tunnel URL: wss://xxxxx.trycloudflare.com`
- ✅ `✅ Successfully updated database with: wss://xxxxx.trycloudflare.com`




