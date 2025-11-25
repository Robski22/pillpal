# 🔍 Debug: Script Runs But No Output

## Problem
Script runs but produces no output. This could mean:
1. Script is waiting (sleep command)
2. Script failed silently
3. Output is being suppressed

## Check What's Happening

### Step 1: Check if Script is Still Running

```bash
# Check if script process is running
ps aux | grep update_tunnel_url

# If you see the process, it might be waiting on sleep
```

### Step 2: Run Script with Verbose Output

```bash
# Run with bash -x to see each command
bash -x ~/scripts/update_tunnel_url.sh
```

This will show every command as it executes.

### Step 3: Check Script Content

```bash
# View the entire script
cat ~/scripts/update_tunnel_url.sh
```

Make sure:
- Service key is filled in (not `YOUR_SERVICE_ROLE_KEY`)
- All variables are set correctly

### Step 4: Check if Cloudflare Tunnel is Running

```bash
# Check tunnel status
sudo systemctl status cloudflared-tunnel

# Check if tunnel has a URL
sudo journalctl -u cloudflared-tunnel -n 50 | grep -i "trycloudflare"
```

### Step 5: Test Each Part Manually

```bash
# Test getting tunnel URL
sudo journalctl -u cloudflared-tunnel -n 200 | grep -oP 'https://[a-z0-9-]+\.trycloudflare\.com' | tail -1

# If this returns nothing, the tunnel might not be running or URL not generated yet
```

### Step 6: Check Script Permissions and Format

```bash
# Check first line
head -1 ~/scripts/update_tunnel_url.sh
# Should be: #!/bin/bash

# Check if executable
ls -la ~/scripts/update_tunnel_url.sh
# Should show: -rwxr-xr-x
```

---

## Common Issues

### Issue 1: Service Key Not Set

If `SUPABASE_SERVICE_KEY="YOUR_SERVICE_ROLE_KEY"` is still in the script, it won't work.

Fix:
```bash
nano ~/scripts/update_tunnel_url.sh
# Replace YOUR_SERVICE_ROLE_KEY with actual key
```

### Issue 2: Cloudflare Tunnel Not Running

If tunnel isn't running, script can't get URL.

Fix:
```bash
sudo systemctl start cloudflared-tunnel
sudo systemctl status cloudflared-tunnel
```

### Issue 3: Script Runs Too Fast

If script runs before tunnel generates URL, increase wait time.

Fix:
```bash
nano ~/scripts/update_tunnel_url.sh
# Change: sleep 20
# To: sleep 30
```

---

## Expected Output

When script works, you should see:

```bash
$ bash -x ~/scripts/update_tunnel_url.sh
+ sleep 20
+ sudo journalctl -u cloudflared-tunnel -n 200
+ grep -oP 'https://[a-z0-9-]+\.trycloudflare\.com'
+ tail -1
+ TUNNEL_URL=https://xxxxx.trycloudflare.com
+ echo 'Mon Nov 24 22:33:11 PST 2025: Found tunnel URL: wss://xxxxx.trycloudflare.com'
Mon Nov 24 22:33:11 PST 2025: Found tunnel URL: wss://xxxxx.trycloudflare.com
+ curl -s -w '\n%{http_code}' -X POST ...
+ HTTP_CODE=200
+ echo 'Mon Nov 24 22:33:12 PST 2025: ✅ Successfully updated database with: wss://xxxxx.trycloudflare.com'
Mon Nov 24 22:33:12 PST 2025: ✅ Successfully updated database with: wss://xxxxx.trycloudflare.com
```

---

## Quick Diagnostic Commands

Run these to diagnose:

```bash
# 1. Check script content
cat ~/scripts/update_tunnel_url.sh | grep SUPABASE_SERVICE_KEY

# 2. Check if tunnel is running
sudo systemctl status cloudflared-tunnel | head -5

# 3. Check if tunnel has URL
sudo journalctl -u cloudflared-tunnel -n 50 | grep -i "trycloudflare" | tail -1

# 4. Run script with verbose output
bash -x ~/scripts/update_tunnel_url.sh 2>&1
```

---

## Next Steps

1. Run `bash -x ~/scripts/update_tunnel_url.sh` to see detailed output
2. Check if service key is set correctly
3. Verify cloudflared tunnel is running
4. Share the output so we can see what's happening



