# 🔧 Fix: Missing Shebang Line

## Problem
Your script is missing `#!/bin/bash` as the first line!

When you run `head -1 ~/scripts/update_tunnel_url.sh`, it shows:
```
SUPABASE_URL="https://ubpyymhxyjtbcifspcwj.supabase.co"
```

But it SHOULD show:
```
#!/bin/bash
```

## Solution: Add Shebang Line

### On Your Pi:

```bash
# Edit the script
nano ~/scripts/update_tunnel_url.sh
```

### Add This as the VERY FIRST LINE:

```bash
#!/bin/bash
```

### The script should start like this:

```bash
#!/bin/bash

# Auto-Update Tunnel URL Script
# This script runs on boot and updates the Supabase database with the current Cloudflare tunnel URL

# Wait for cloudflared to start and generate URL
sleep 20

# Get the tunnel URL from cloudflared logs
TUNNEL_URL=$(sudo journalctl -u cloudflared-tunnel -n 200 | grep -oP 'https://[a-z0-9-]+\.trycloudflare\.com' | tail -1)

if [ -z "$TUNNEL_URL" ]; then
    echo "$(date): Failed to get tunnel URL from cloudflared logs"
    # Try again after more time
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

# Replace these with your actual Supabase credentials
SUPABASE_URL="https://ubpyymhxyjtbcifspcwj.supabase.co"
SUPABASE_SERVICE_KEY="YOUR_SERVICE_ROLE_KEY"

# ... rest of script
```

**Important:**
- `#!/bin/bash` MUST be the very first line
- No blank lines before it
- No spaces before it

### Save: `Ctrl+X`, then `Y`, then `Enter`

### Verify:

```bash
# Check first line
head -1 ~/scripts/update_tunnel_url.sh
# Should show: #!/bin/bash
```

### Test:

```bash
# Test script
~/scripts/update_tunnel_url.sh

# Restart service
sudo systemctl daemon-reload
sudo systemctl start update-tunnel-url.service
sudo systemctl status update-tunnel-url.service
```

---

## Quick Fix Command

If you want to add it quickly:

```bash
# Add shebang to beginning of file
sed -i '1i#!/bin/bash' ~/scripts/update_tunnel_url.sh

# Verify
head -1 ~/scripts/update_tunnel_url.sh
# Should show: #!/bin/bash
```

But make sure you don't already have it, or you'll have it twice!

---

## Expected Result

After fixing:
- `head -1` shows: `#!/bin/bash`
- Script runs without `203/EXEC` error
- Service starts successfully




