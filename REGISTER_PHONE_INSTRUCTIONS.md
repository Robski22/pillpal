# Register Phone Number for SMS Notifications

## Phone Number: +639762549485

This number will receive SMS notifications when medications are ready to dispense.

## Method 1: Update via Profile Page (Recommended)

1. Log in to your PillPal account
2. Go to the **Profile** page
3. Find the **Phone Number** field
4. Enter: `+639762549485` or `09762549485`
5. Click **Save Profile**
6. The system will automatically format it correctly

## Method 2: Update via SQL (Supabase Dashboard)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Run this query (replace `your-email@example.com` with your actual email):

```sql
UPDATE profiles
SET 
  phone_number = '+639762549485',
  updated_at = NOW()
WHERE id IN (
  SELECT id FROM auth.users 
  WHERE email = 'your-email@example.com'
);
```

4. Click **Run** to execute

## Method 3: Update All Users (If you only have one user)

⚠️ **Warning**: Only use this if you have a single user account!

```sql
UPDATE profiles
SET 
  phone_number = '+639762549485',
  updated_at = NOW();
```

## Verify the Update

After updating, verify the phone number is saved:

```sql
SELECT 
  id,
  phone_number,
  updated_at
FROM profiles
WHERE phone_number LIKE '%639762549485%';
```

## Format Notes

The system accepts phone numbers in these formats:
- `+639762549485` (international format - recommended)
- `09762549485` (local format - will be converted to +63)
- `639762549485` (without + - will be converted to +63)

The system will automatically convert all formats to `+639762549485` when sending SMS.

## Testing

After registering the phone number:
1. Trigger a dispense action
2. Check your phone for SMS notification
3. The message will be: "The [medication] for [timeframe] is/are ready to dispense."

## Troubleshooting

If SMS is not received:
1. Check that the phone number is saved correctly in the database
2. Verify the SIMCOM module is connected and registered to network
3. Check server logs for SMS sending status
4. Ensure the SIM card in the SIMCOM module has active service

