# 🔄 Update Database with Current Tunnel URL

## Current Situation

- **Database shows:** `wss://farmer-slight-mountain-colours.tryd...` (old URL)
- **Current tunnel URL:** `martial-proceedings-limited-laboratories.trycloudflare.com`
- **Script ran but may not have updated**

## Quick Fix: Update Database Manually

### Option 1: Update via Supabase Dashboard

1. In the `pi_connection_config` table, click on the `websocket_url` cell
2. Change it to: `wss://martial-proceedings-limited-laboratories.trycloudflare.com`
3. Click outside the cell or press Enter to save

### Option 2: Update via SQL

Go to **Supabase Dashboard** → **SQL Editor** and run:

```sql
UPDATE pi_connection_config
SET websocket_url = 'wss://martial-proceedings-limited-laboratories.trycloudflare.com',
    updated_at = NOW();
```

### Option 3: Run Script Manually Again

On your Pi:

```bash
# Run the script manually
~/scripts/update_tunnel_url.sh

# Check if it worked
# Then verify in Supabase that the URL was updated
```

---

## Why Script Might Not Have Updated

The script might have:
1. Run before the tunnel URL was generated
2. Failed silently (check script output)
3. Used wrong database ID

---

## Verify After Update

1. Check Supabase → `pi_connection_config` table
2. `websocket_url` should show: `wss://martial-proceedings-limited-laboratories.trycloudflare.com`
3. `updated_at` should show current timestamp

---

## Test Your Web App

After updating:
1. Go to: https://pillpal-drab.vercel.app
2. Hard refresh: `Ctrl + Shift + R`
3. Check browser console (F12)
4. Should connect to the new tunnel URL

---

## For Future: Script Will Auto-Update

Once working, the script will automatically update the database on every boot with the current tunnel URL. You won't need to update manually anymore!




