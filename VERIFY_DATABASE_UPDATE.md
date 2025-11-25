# ✅ Verify Database Was Updated

## Check if Script Updated Database

### Step 1: Check Supabase Database

1. Go to **Supabase Dashboard** → **Table Editor** → **pi_connection_config**
2. Check the `websocket_url` column
3. It should show: `wss://martial-proceedings-limited-laboratories.trycloudflare.com`

### Step 2: Test Script Again with Output

The script ran but didn't show output. Let's test it again:

```bash
# Run script and capture output
~/scripts/update_tunnel_url.sh 2>&1 | tee /tmp/script_output.txt
cat /tmp/script_output.txt
```

### Step 3: Check if Script Actually Updated Database

Test the curl command manually:

```bash
# Get current tunnel URL
TUNNEL_URL="https://martial-proceedings-limited-laboratories.trycloudflare.com"
WS_URL=$(echo $TUNNEL_URL | sed 's|https://|wss://|')

# Test updating database (replace with your actual service key)
SUPABASE_URL="https://ubpyymhxyjtbcifspcwj.supabase.co"
SUPABASE_SERVICE_KEY="YOUR_SERVICE_KEY"

curl -X POST \
  "${SUPABASE_URL}/rest/v1/rpc/update_pi_url" \
  -H "apikey: ${SUPABASE_SERVICE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"url\": \"${WS_URL}\"}"
```

---

## Expected Result

If everything worked:
- ✅ Database `websocket_url` = `wss://martial-proceedings-limited-laboratories.trycloudflare.com`
- ✅ Your Vercel app can now connect to Pi
- ✅ Script will auto-update on every boot

---

## Test Your Web App

1. Go to: https://pillpal-drab.vercel.app
2. Check browser console (F12)
3. Should see: "✅ Connected to Pi!" (if Pi is online)

---

## Summary

- ✅ Script has correct service key
- ✅ Cloudflare tunnel is running
- ✅ Tunnel URL found: `martial-proceedings-limited-laboratories.trycloudflare.com`
- ✅ Script runs on boot
- ⚠️ Need to verify database was updated

Check Supabase to confirm the URL was saved!



