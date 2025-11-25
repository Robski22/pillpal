# 🔍 Debug Script Hanging Issue

## Problem
Script stops after setting variables. It's probably at the `sleep 25` command.

## Check What's Happening

The script should continue after setting variables. If it's hanging, check:

### 1. Wait for the sleep to finish

The script has `sleep 25` - wait 25 seconds and see if it continues.

### 2. Check if cloudflared is running

```bash
sudo systemctl status cloudflared-tunnel
```

### 3. Test getting the tunnel URL manually

```bash
# Try without sudo first
journalctl -u cloudflared-tunnel -n 200 --no-pager | grep -oP 'https://[a-z0-9-]+\.trycloudflare\.com' | tail -1

# Or with sudo
sudo journalctl -u cloudflared-tunnel -n 200 --no-pager | grep -oP 'https://[a-z0-9-]+\.trycloudflare\.com' | tail -1
```

Should return: `https://defensive-southern-virginia-recommend.trycloudflare.com`

### 4. Check script permissions

```bash
ls -l ~/scripts/update_tunnel_url.sh
```

Should show: `-rwxr-xr-x` (executable)

If not, make it executable:
```bash
chmod +x ~/scripts/update_tunnel_url.sh
```

### 5. Also check your service role key

I noticed your key might have a typo. In the script output, it shows:
`...732piZYSP_Nf5203EixdoYWPUCjWe2BvwQ`

But it should be:
`...70ZSDf9njA82piZYSp_Nf5203EixdoYWPUCjWe2BvwQ`

**Fix it:**
```bash
nano ~/scripts/update_tunnel_url.sh
```

Make sure the SUPABASE_SERVICE_KEY line has the correct key (the one you provided earlier).

### 6. Run with more verbose output

```bash
bash -x ~/scripts/update_tunnel_url.sh 2>&1 | tee /tmp/script_output.log
```

This will save all output to a file so you can review it.

## Expected Output

After the sleep, you should see:
```
+ Starting tunnel URL update script...
+ Waiting for cloudflared to start...
+ Attempting to get tunnel URL...
+ Found tunnel URL: wss://defensive-southern-virginia-recommend.trycloudflare.com
+ Updating Supabase database with URL: wss://...
+ ✅ Successfully updated database with: wss://...
```

Let the script run and wait for the output!



