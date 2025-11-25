# 🔄 Auto-Update Tunnel URL on Every Boot

## Solution
Create a script that runs on boot, gets the current Cloudflare tunnel URL, and automatically updates the Supabase database.

---

## Step 1: Create Update Script on Pi

```bash
# SSH into Pi
ssh justin@192.168.100.220

# Create script directory
mkdir -p ~/scripts

# Create the update script
nano ~/scripts/update_tunnel_url.sh
```

Paste this script (replace with your Supabase credentials):

```bash
#!/bin/bash

# Wait for cloudflared to start and get URL
sleep 15

# Get the tunnel URL from cloudflared logs
TUNNEL_URL=$(sudo journalctl -u cloudflared-tunnel -n 100 | grep -oP 'https://[a-z0-9-]+\.trycloudflare\.com' | tail -1)

if [ -z "$TUNNEL_URL" ]; then
    echo "Failed to get tunnel URL"
    exit 1
fi

# Convert https:// to wss:// for WebSocket
WS_URL=$(echo $TUNNEL_URL | sed 's|https://|wss://|')

echo "Found tunnel URL: $WS_URL"

# Update Supabase database
# Replace with your actual Supabase URL and anon key
SUPABASE_URL="YOUR_SUPABASE_URL"
SUPABASE_ANON_KEY="YOUR_SUPABASE_ANON_KEY"

# Update the database
curl -X POST \
  "${SUPABASE_URL}/rest/v1/rpc/update_pi_url" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"url\": \"${WS_URL}\"}"

# Or use direct SQL update (requires service role key)
# SUPABASE_SERVICE_KEY="YOUR_SERVICE_ROLE_KEY"
# curl -X PATCH \
#   "${SUPABASE_URL}/rest/v1/pi_connection_config?id=eq.1" \
#   -H "apikey: ${SUPABASE_SERVICE_KEY}" \
#   -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
#   -H "Content-Type: application/json" \
#   -d "{\"websocket_url\": \"${WS_URL}\", \"updated_at\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}"

echo "Database updated with: $WS_URL"
```

Save: `Ctrl+X`, then `Y`, then `Enter`

---

## Step 2: Make Script Executable

```bash
chmod +x ~/scripts/update_tunnel_url.sh
```

---

## Step 3: Create Supabase Function (Better Method)

Instead of using curl, create a Supabase Edge Function for security:

1. Go to **Supabase Dashboard** → **Edge Functions**
2. Create new function: `update_pi_url`
3. Use this code:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  const { url } = await req.json()
  
  const { data, error } = await supabase
    .from('pi_connection_config')
    .update({ 
      websocket_url: url,
      updated_at: new Date().toISOString()
    })
    .eq('id', 1) // or use your actual ID
    
  return new Response(
    JSON.stringify({ success: !error, data, error }),
    { headers: { "Content-Type": "application/json" } }
  )
})
```

---

## Step 4: Create Systemd Service

```bash
# Create service file
sudo nano /etc/systemd/system/update-tunnel-url.service
```

Paste this:

```ini
[Unit]
Description=Auto-Update Tunnel URL on Boot
After=cloudflared-tunnel.service network.target
Requires=cloudflared-tunnel.service

[Service]
Type=oneshot
User=justin
ExecStart=/home/justin/scripts/update_tunnel_url.sh
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

Save: `Ctrl+X`, then `Y`, then `Enter`

---

## Step 5: Enable Service

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable service (runs on boot)
sudo systemctl enable update-tunnel-url.service

# Test it now (optional)
sudo systemctl start update-tunnel-url.service

# Check status
sudo systemctl status update-tunnel-url.service

# Check logs
sudo journalctl -u update-tunnel-url -n 50
```

---

## Alternative: Simpler Python Script

If you prefer Python:

```bash
# Create Python script
nano ~/scripts/update_tunnel_url.py
```

```python
#!/usr/bin/env python3
import time
import subprocess
import requests
import os

# Wait for cloudflared to start
time.sleep(15)

# Get tunnel URL from logs
result = subprocess.run(
    ['sudo', 'journalctl', '-u', 'cloudflared-tunnel', '-n', '100'],
    capture_output=True,
    text=True
)

# Extract URL
import re
urls = re.findall(r'https://[a-z0-9-]+\.trycloudflare\.com', result.stdout)
if not urls:
    print("Failed to get tunnel URL")
    exit(1)

tunnel_url = urls[-1]
ws_url = tunnel_url.replace('https://', 'wss://')

print(f"Found tunnel URL: {ws_url}")

# Update Supabase
SUPABASE_URL = os.environ.get('SUPABASE_URL', 'YOUR_SUPABASE_URL')
SUPABASE_KEY = os.environ.get('SUPABASE_SERVICE_KEY', 'YOUR_SERVICE_KEY')

response = requests.patch(
    f"{SUPABASE_URL}/rest/v1/pi_connection_config",
    headers={
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
    },
    json={
        'websocket_url': ws_url,
        'updated_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
    },
    params={'id': 'eq.1'}  # Adjust for your ID
)

if response.status_code in [200, 204]:
    print(f"✅ Database updated with: {ws_url}")
else:
    print(f"❌ Error updating database: {response.status_code} - {response.text}")
```

Make executable:
```bash
chmod +x ~/scripts/update_tunnel_url.py
```

Update service to use Python:
```ini
ExecStart=/usr/bin/python3 /home/justin/scripts/update_tunnel_url.py
```

---

## Step 6: Get Your Supabase Credentials

1. Go to **Supabase Dashboard** → **Settings** → **API**
2. Copy:
   - **Project URL** (for SUPABASE_URL)
   - **service_role key** (for SUPABASE_SERVICE_KEY) - **Keep this secret!**

Update the script with these values.

---

## Step 7: Test the Script

```bash
# Run manually to test
~/scripts/update_tunnel_url.sh

# Check if it worked
# Go to Supabase → Table Editor → pi_connection_config
# Should see updated websocket_url
```

---

## ✅ Done!

**After this setup:**
- ✅ Script runs automatically on every boot
- ✅ Gets current tunnel URL from cloudflared logs
- ✅ Updates Supabase database automatically
- ✅ Your Vercel app always uses the latest URL
- ✅ **No manual updates needed!**

---

## Troubleshooting

### Script not running
```bash
# Check service status
sudo systemctl status update-tunnel-url

# Check logs
sudo journalctl -u update-tunnel-url -n 100

# Check script permissions
ls -la ~/scripts/update_tunnel_url.sh
```

### Can't get tunnel URL
```bash
# Increase wait time in script (change sleep 15 to sleep 30)
# Check if cloudflared is running
sudo systemctl status cloudflared-tunnel
```

### Database update fails
- Check Supabase credentials in script
- Verify service role key has write permissions
- Check Supabase logs for errors

---

## Summary

1. ✅ Create update script
2. ✅ Add Supabase credentials
3. ✅ Create systemd service
4. ✅ Enable service
5. ✅ **Done! Auto-updates on every boot!** 🎉

**Now your tunnel URL updates automatically every time the Pi restarts!**




