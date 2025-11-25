# 🔧 Fix: API Still Showing Old URL After Update

## Issue
Database updated but API still returns old URL. This is likely a caching issue.

---

## Step 1: Verify Database Actually Updated

Run this in Supabase SQL Editor:

```sql
SELECT * FROM pi_connection_config;
```

**Check:**
- Does `websocket_url` show: `wss://departure-fin-wallace-steady.trycloudflare.com`?
- Or does it still show the old URL?

**If it still shows old URL:**
- The UPDATE didn't work
- Try this instead:
```sql
-- Delete all records and insert fresh
DELETE FROM pi_connection_config;
INSERT INTO pi_connection_config (websocket_url, updated_at)
VALUES ('wss://departure-fin-wallace-steady.trycloudflare.com', NOW());
```

---

## Step 2: Check for Multiple Records

```sql
SELECT COUNT(*) FROM pi_connection_config;
```

**If there are multiple records:**
```sql
-- Update ALL records
UPDATE pi_connection_config
SET websocket_url = 'wss://departure-fin-wallace-steady.trycloudflare.com',
    updated_at = NOW();
```

---

## Step 3: Clear Vercel Cache

The API route might be cached. Try:

1. **Force redeploy:**
   - Go to Vercel → Deployments
   - Click ⋮ (3 dots) on latest deployment
   - Click **Redeploy**
   - Wait for it to finish

2. **Or add cache-busting:**
   - The API route should not cache, but Vercel might
   - Try accessing: `https://pillpal-drab.vercel.app/api/pi-url?t=1234567890`
   - (Adding a query parameter bypasses cache)

---

## Step 4: Check API Route Code

The API route should prioritize database over environment variable. Verify the code in `app/api/pi-url/route.ts`:

```typescript
// Should check database first
const { data, error } = await supabase
  .from('pi_connection_config')
  .select('websocket_url')
  .single()

// Then use database URL if available
if (data?.websocket_url) {
  return NextResponse.json({ url: data.websocket_url })
}

// Fall back to environment variable
return NextResponse.json({ url: process.env.NEXT_PUBLIC_PI_WEBSOCKET_URL || '' })
```

---

## Step 5: Force Database Update with Specific ID

If you know the record ID, update it specifically:

```sql
UPDATE pi_connection_config
SET websocket_url = 'wss://departure-fin-wallace-steady.trycloudflare.com',
    updated_at = NOW()
WHERE id = '0fbefbf-0395-482e-9b64-a62bafc548f6';
```

(Use the actual ID from your SELECT query)

---

## Step 6: Temporary Fix - Use Environment Variable Only

If database keeps showing old value, temporarily rely on Vercel env var:

1. **In Vercel:** Make sure `NEXT_PUBLIC_PI_WEBSOCKET_URL` = `wss://departure-fin-wallace-steady.trycloudflare.com`
2. **Modify API route** to skip database check temporarily
3. **Or** delete the database record so it falls back to env var

---

## Step 7: Check Supabase RLS (Row Level Security)

If RLS is enabled, the API might not be able to read the updated value:

```sql
-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'pi_connection_config';

-- If needed, temporarily disable RLS for testing
ALTER TABLE pi_connection_config DISABLE ROW LEVEL SECURITY;
```

---

## Quick Test

1. **Update database:**
```sql
UPDATE pi_connection_config
SET websocket_url = 'wss://departure-fin-wallace-steady.trycloudflare.com',
    updated_at = NOW();
```

2. **Verify update:**
```sql
SELECT websocket_url FROM pi_connection_config;
```

3. **Wait 30 seconds** (for any cache to clear)

4. **Check API with cache-bust:**
```
https://pillpal-drab.vercel.app/api/pi-url?nocache=1234567890
```

5. **Hard refresh browser:** `Ctrl+Shift+R`

---

## Nuclear Option: Delete and Recreate

If nothing works:

```sql
-- Delete all records
DELETE FROM pi_connection_config;

-- Insert fresh record
INSERT INTO pi_connection_config (websocket_url, updated_at)
VALUES ('wss://departure-fin-wallace-steady.trycloudflare.com', NOW());
```

Then wait 1-2 minutes and check API again.



