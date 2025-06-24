# 🚨 Supabase Troubleshooting Guide

This guide addresses common Supabase issues encountered during SnapConnect development and testing.

## Quick Fix Summary

### 🔧 **Run SUPABASE_FIX.sql First**
1. Go to Supabase Dashboard → SQL Editor
2. Copy and paste the contents of `SUPABASE_FIX.sql`
3. Click "Run" to execute all fixes
4. Then use the Debug Account Switcher

---

## Common Issues & Solutions

### 1. 🛡️ **Row Level Security (RLS) Policy Errors**

**Error:** `new row violates row-level security policy for table "profiles"`

**Problem:** The profiles RLS policy was too restrictive for the automatic profile creation trigger.

**Solution:**
```sql
-- Run this in Supabase SQL Editor
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT WITH CHECK (
  auth.uid() = id OR 
  auth.role() = 'authenticated' OR
  auth.uid() IS NULL  -- Allow during trigger execution
);
```

### 2. 📧 **Email Not Confirmed Errors**

**Error:** `Email not confirmed`

**Problem:** Supabase requires email confirmation for new accounts.

**Solutions:**

#### Option A: Confirm Test Emails (Recommended for Development)
```sql
-- Run this in Supabase SQL Editor
SELECT public.confirm_test_emails();
```

#### Option B: Disable Email Confirmation
1. Go to Supabase Dashboard → Authentication → Settings
2. Turn OFF "Enable email confirmations"
3. This affects ALL users, so use carefully

### 3. ⏳ **Rate Limiting Issues**

**Error:** `For security purposes, you can only request this after 52 seconds`

**Problem:** Supabase rate limits signup attempts for security.

**Solutions:**
- Wait 1-2 minutes between account creation attempts
- Use the Debug Switcher's "Create All" button (has built-in delays)
- Create accounts one at a time instead of bulk creation

### 4. 👤 **Missing Profile Errors**

**Error:** Profile-related errors after account creation

**Problem:** Profile creation trigger might fail silently.

**Solution:**
```sql
-- Run this in Supabase SQL Editor
SELECT public.create_missing_profiles();
```

---

## Step-by-Step Fix Process

### For New Projects:
1. **Run Initial Setup:**
   ```sql
   -- Run supabase-setup.sql first
   ```

2. **Apply Fixes:**
   ```sql
   -- Run SUPABASE_FIX.sql
   ```

3. **Test Debug Accounts:**
   - Open Debug Account Switcher
   - Click "Create All" (waits between attempts)
   - Click "Fix Issues" if needed

### For Existing Projects with Issues:
1. **Apply Fixes:**
   ```sql
   -- Run SUPABASE_FIX.sql
   ```

2. **Confirm Test Emails:**
   ```sql
   SELECT public.confirm_test_emails();
   ```

3. **Create Missing Profiles:**
   ```sql
   SELECT public.create_missing_profiles();
   ```

---

## Debug Account Switcher Features

### 🔧 **"Create All" Button**
- Creates all test accounts with 2-second delays
- Handles rate limiting gracefully
- Shows detailed results

### 🔨 **"Fix Issues" Button**
- Runs `create_missing_profiles()`
- Runs `confirm_test_emails()`
- Attempts automatic fixes

### 📋 **Test Accounts**
```
Alice Doe - alice.doe.test@gmail.com
Bob Smith - bob.smith.test@gmail.com  
Charlie Brown - charlie.brown.test@gmail.com
Password: TestUser123! (all accounts)
```

---

## Manual Verification

### Check User Creation:
```sql
SELECT id, email, email_confirmed_at, created_at 
FROM auth.users 
WHERE email LIKE '%test@gmail.com%';
```

### Check Profiles:
```sql
SELECT p.id, p.username, p.email, u.email_confirmed_at
FROM profiles p
JOIN auth.users u ON p.id = u.id
WHERE p.email LIKE '%test@gmail.com%';
```

### Check Missing Profiles:
```sql
SELECT u.id, u.email
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE p.id IS NULL;
```

---

## Supabase Dashboard Quick Actions

### Authentication Tab:
- **Users:** View all registered users
- **Policies:** Check RLS policies
- **Settings:** Email confirmation settings

### SQL Editor Tab:
- Run `SUPABASE_FIX.sql`
- Execute verification queries
- Apply manual fixes

### Database Tab:
- View `profiles` table
- Check `friendships` table
- Verify data integrity

---

## Error Code Reference

| Error Code | Meaning | Solution |
|------------|---------|----------|
| `42501` | RLS Policy Violation | Run RLS fixes in SUPABASE_FIX.sql |
| `23505` | Unique Constraint | User/profile already exists |
| `AuthApiError` | Authentication Issue | Check email confirmation |

---

## Best Practices for Development

### 1. **Always Use Debug Account Switcher**
- Don't manually create test accounts
- Use the built-in delay mechanisms
- Let it handle errors gracefully

### 2. **Apply Fixes Early**
- Run `SUPABASE_FIX.sql` during initial setup
- Don't wait for errors to appear

### 3. **Monitor Supabase Logs**
- Check Supabase Dashboard → Logs
- Watch for RLS policy violations
- Monitor authentication errors

### 4. **Test Account Management**
- Keep test accounts separate with `.test@gmail.com`
- Use consistent passwords (`TestUser123!`)
- Don't use production domains

---

## Production Considerations

⚠️ **Important:** Some fixes are development-only:

- **Email confirmation bypass:** Don't disable in production
- **Test account functions:** Only run on development databases  
- **Debug account switcher:** Only shows in `__DEV__` mode

---

## Need Help?

1. **Check Supabase Dashboard logs**
2. **Run verification queries**
3. **Use Debug Account Switcher diagnostics**
4. **Apply `SUPABASE_FIX.sql` fixes**

Most issues are resolved by running the fix script and using proper account creation timing. 