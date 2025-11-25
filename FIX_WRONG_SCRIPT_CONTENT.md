# 🔧 Fix: Script Has Wrong Content (JavaScript Instead of Bash)

## Problem
Your script has JavaScript/TypeScript code instead of bash! That's why you see:
- `import: command not found`
- `const: command not found`
- `Exec format error`

## Solution: Replace with Correct Bash Script

### Step 1: Delete the Wrong Script

```bash
rm ~/scripts/update_tunnel_url.sh
```

### Step 2: Create New Script with Correct Bash Code

```bash
nano ~/scripts/update_tunnel_url.sh
```

### Step 3: Paste This CORRECT Bash Script

**Copy this ENTIRE script (it's bash, not JavaScript!):**

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
- First line MUST be: `#!/bin/bash`
- This is BASH script, NOT JavaScript!
- Replace `YOUR_SERVICE_ROLE_KEY_HERE` with your actual Supabase service role key
- Save: `Ctrl+X`, then `Y`, then `Enter`

### Step 4: Make Script Executable

```bash
chmod +x ~/scripts/update_tunnel_url.sh
```

### Step 5: Fix Line Endings

```bash
# Install dos2unix if needed
sudo apt install -y dos2unix

# Convert line endings
dos2unix ~/scripts/update_tunnel_url.sh
```

### Step 6: Verify Script Content

```bash
# Check first few lines (should show bash code, not JavaScript)
head -10 ~/scripts/update_tunnel_url.sh
```

Should show:
```
#!/bin/bash

# Auto-Update Tunnel URL Script
# Uses Supabase update_pi_url stored procedure

# Wait for cloudflared to start and generate URL
sleep 20
```

**NOT:**
```
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(...)
```

### Step 7: Test Script Manually

```bash
# Test the script
~/scripts/update_tunnel_url.sh
```

Should work now (might show database error if service key is wrong, but script should run).

### Step 8: Restart Service

```bash
sudo systemctl daemon-reload
sudo systemctl start update-tunnel-url.service
sudo systemctl status update-tunnel-url.service
```

---

## Quick Copy-Paste Fix

Run these commands in order:

```bash
# 1. Remove wrong script
rm ~/scripts/update_tunnel_url.sh

# 2. Create new script
nano ~/scripts/update_tunnel_url.sh
# (Paste the bash script above, save with Ctrl+X, Y, Enter)

# 3. Make executable
chmod +x ~/scripts/update_tunnel_url.sh

# 4. Fix line endings
sudo apt install -y dos2unix
dos2unix ~/scripts/update_tunnel_url.sh

# 5. Verify content
head -5 ~/scripts/update_tunnel_url.sh
# Should show: #!/bin/bash

# 6. Test manually
~/scripts/update_tunnel_url.sh

# 7. Restart service
sudo systemctl daemon-reload
sudo systemctl start update-tunnel-url.service
sudo systemctl status update-tunnel-url.service
```

---

## What Went Wrong?

You accidentally pasted JavaScript/TypeScript code (from Supabase docs) into a bash script file. Bash can't understand JavaScript syntax like `import` and `const`.

The script needs to be written in **bash** (shell script language), not JavaScript!

---

## Expected Output After Fix

After `head -5 ~/scripts/update_tunnel_url.sh`:
```
#!/bin/bash

# Auto-Update Tunnel URL Script
# Uses Supabase update_pi_url stored procedure
```

After `~/scripts/update_tunnel_url.sh`:
```
Found tunnel URL: wss://xxxxx.trycloudflare.com
✅ Successfully updated database with: wss://xxxxx.trycloudflare.com
```

After `sudo systemctl status update-tunnel-url.service`:
- ✅ No `203/EXEC` error
- ✅ `Active: inactive (dead)` or `Active: active (exited)`
- ✅ No JavaScript errors




