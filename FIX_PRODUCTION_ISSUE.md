# 🔧 Fix: Working on Localhost but Not on Production (Vercel)

## Terminology
- **Localhost** = Your local development server (`http://localhost:3000`)
- **Production/Public Server** = Your deployed app on Vercel (`https://pillpal-drab.vercel.app`)

---

## Why It Works Locally But Not on Production

### Common Reasons:

1. **Environment Variables Not Set in Vercel**
   - Localhost uses `.env.local` file
   - Vercel needs environment variables set in dashboard

2. **Database Connection Issues**
   - Different Supabase connection in production
   - RLS (Row Level Security) policies might block production

3. **Build-Time vs Runtime Issues**
   - Some code runs at build time on Vercel
   - Environment variables might not be available

4. **Caching Issues**
   - Vercel caches API responses
   - Old cached data being served

---

## Step 1: Verify Vercel Environment Variables

1. Go to **Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**
2. Check these are set:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_PI_WEBSOCKET_URL` = `wss://departure-fin-wallace-steady.trycloudflare.com`

3. **Make sure they're set for Production environment** (not just Preview/Development)

---

## Step 2: Check Vercel Function Logs

1. Go to **Vercel Dashboard** → Your Project → **Logs** (or **Functions** tab)
2. Look for errors when calling `/api/pi-url`
3. Check for:
   - Database connection errors
   - Missing environment variables
   - RLS policy errors

---

## Step 3: Verify Database is Accessible from Production

The API route tries to read from `pi_connection_config` table. Check:

1. **Supabase RLS Policies:**
   - Go to Supabase → Authentication → Policies
   - Make sure `pi_connection_config` table allows read access
   - Or temporarily disable RLS for testing:
   ```sql
   ALTER TABLE pi_connection_config DISABLE ROW LEVEL SECURITY;
   ```

2. **Test Database Query:**
   - In Supabase SQL Editor, run:
   ```sql
   SELECT * FROM pi_connection_config;
   ```
   - Should return the record with the correct URL

---

## Step 4: Force Use Environment Variable (Temporary Fix)

If database isn't accessible from production, we can make the API route use the environment variable directly:

Modify `app/api/pi-url/route.ts` to prioritize environment variable:

```typescript
export async function GET() {
  // Use environment variable first (for production)
  const envUrl = process.env.NEXT_PUBLIC_PI_WEBSOCKET_URL || ''
  
  if (envUrl) {
    return NextResponse.json({ url: envUrl })
  }
  
  // Fall back to database (for localhost)
  try {
    const { data, error } = await supabase
      .from('pi_connection_config')
      .select('websocket_url')
      .single()

    if (!error && data?.websocket_url) {
      return NextResponse.json({ url: data.websocket_url })
    }
  } catch (error) {
    console.error('Error fetching from database:', error)
  }
  
  return NextResponse.json({ url: '' })
}
```

---

## Step 5: Check What Production API Returns

1. Open: `https://pillpal-drab.vercel.app/api/pi-url`
2. What does it return?
   - Empty `{"url": ""}` = Environment variable not set
   - Old URL = Database has old value or can't be read
   - New URL = Should work!

---

## Quick Fix: Use Environment Variable Only

Since it works locally (probably using database), but production might have database access issues, let's make production use the environment variable:

1. **Set Vercel Environment Variable:**
   - `NEXT_PUBLIC_PI_WEBSOCKET_URL` = `wss://departure-fin-wallace-steady.trycloudflare.com`
   - Make sure it's set for **Production**

2. **Redeploy Vercel**

3. **Test:** `https://pillpal-drab.vercel.app/api/pi-url`
   - Should return the environment variable value

---

## Debug Steps

1. **Check Vercel Logs:**
   - Look for errors in function logs
   - See what URL is being returned

2. **Check Browser Console on Production:**
   - Open `https://pillpal-drab.vercel.app`
   - Press F12 → Console
   - Look for connection errors
   - Check what URL it's trying to use

3. **Compare Local vs Production:**
   - Localhost: What URL does it use? (Check browser console)
   - Production: What URL does it use? (Check browser console)
   - Are they different?

---

## Most Likely Issue

**Production can't read from database** due to:
- RLS policies blocking anonymous access
- Missing Supabase credentials in Vercel
- Database connection timeout

**Solution:** Use environment variable in Vercel instead of relying on database.




