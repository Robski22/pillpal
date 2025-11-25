# 🔧 Update Script on Pi with Correct Service Role Key

## Your Service Role Key
Yes, that's your service role key! I've created the corrected script with your key.

## Update the Script on Your Pi

### Option 1: Copy the Corrected Script

On your Pi, run:

```bash
# Edit the script
nano ~/scripts/update_tunnel_url.sh
```

**Replace the entire content** with the corrected version from `update_tunnel_url_correct.sh`.

The key difference is the service role key - make sure it ends with `...We2BvwQ` (not `...We2BvWQ`).

### Option 2: Just Update the Key

If you prefer, just update the key line:

```bash
nano ~/scripts/update_tunnel_url.sh
```

Find this line:
```bash
SUPABASE_SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

Replace it with:
```bash
SUPABASE_SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVicHl5bWh4eWp0YmNpZnNwY3dqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTEzODYzNywiZXhwIjoyMDc2NzE0NjM3fQ.70ZSDf9njA82piZYSp_Nf5203EixdoYWPUCjWe2BvwQ"
```

**Important:** Make sure the key ends with `...We2BvwQ` (lowercase 'w' before the Q).

## Test the Script

After updating:

```bash
# Test manually
bash -x ~/scripts/update_tunnel_url.sh
```

**Expected output:**
```
+ Found tunnel URL: wss://defensive-southern-virginia-recommend.trycloudflare.com
+ ✅ Successfully updated database with: wss://...
```

## Verify It Works

1. **Check Supabase** - URL should be updated automatically
2. **Test service:**
   ```bash
   sudo systemctl restart update-tunnel-url.service
   sudo journalctl -u update-tunnel-url.service -f
   ```
3. **Should see:** `✅ Successfully updated database with: wss://...`

## After This

Once the script works:
- ✅ Database will auto-update on every Pi boot
- ✅ Web app will always use the latest URL
- ✅ No more manual database updates needed!


