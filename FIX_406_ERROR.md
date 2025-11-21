# Fix 406 "Not Acceptable" Error

## What is a 406 Error?
A 406 error means the server cannot produce a response matching the request's Accept headers.

## How to Find What's Failing

### Step 1: Check Browser Console
1. Open your browser's Developer Tools (F12)
2. Go to the **Network** tab
3. Look for requests with status **406**
4. Click on the failed request to see:
   - **Request URL** - What endpoint is failing?
   - **Request Headers** - What headers are being sent?
   - **Response** - What error message is returned?

### Step 2: Common Causes

#### 1. Supabase API Calls
- **Symptom**: 406 on Supabase requests
- **Cause**: RLS (Row Level Security) policies blocking access
- **Fix**: Check your Supabase RLS policies

#### 2. Missing Headers
- **Symptom**: 406 on API calls
- **Cause**: Missing `Content-Type` or `Accept` headers
- **Fix**: Ensure requests include proper headers

#### 3. WebSocket Issues
- **Symptom**: 406 on WebSocket connection
- **Cause**: Server doesn't accept WebSocket upgrade
- **Fix**: Check if WebSocket server is running correctly

## Quick Fixes

### If it's Supabase:
1. Check your Supabase dashboard
2. Verify RLS policies are set correctly
3. Check if your user is authenticated

### If it's WebSocket:
1. Verify server is running: `ps aux | grep pi_websocket_server`
2. Check server logs for errors
3. Verify connection URL is correct

### If it's an API route:
1. Check Next.js API route exists
2. Verify request headers match what the route expects
3. Check server logs

## Next Steps

1. **Tell me which URL is failing** (from Network tab)
2. **Tell me when it happens** (on page load? on button click?)
3. **Check the Response tab** - what error message does it show?

This will help me identify the exact issue!

