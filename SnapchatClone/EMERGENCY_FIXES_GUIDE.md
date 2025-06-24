# Emergency Fixes for Group Messaging Issues

You're experiencing two critical errors:
1. `infinite recursion detected in policy for relation "group_participants"`
2. `column profiles_1.avatar_url does not exist`

## Quick Fix Steps

### Step 1: Fix the Missing Avatar Column
Run this SQL in your Supabase dashboard:

```sql
-- Add the missing avatar_url column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Update existing profiles to have NULL avatar_url by default
UPDATE profiles SET avatar_url = NULL WHERE avatar_url IS NULL;
```

### Step 2: Fix the RLS Recursion Issue
Run this SQL in your Supabase dashboard:

```sql
-- Disable RLS temporarily to fix recursion
ALTER TABLE group_participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE conversations DISABLE ROW LEVEL SECURITY;

-- Drop problematic recursive policies
DROP POLICY IF EXISTS "Users can view group participants they're part of" ON group_participants;
DROP POLICY IF EXISTS "Admins can add group participants" ON group_participants;
DROP POLICY IF EXISTS "Users can leave groups" ON group_participants;
DROP POLICY IF EXISTS "Users can view their conversations" ON conversations;

-- Create simple non-recursive policies
ALTER TABLE group_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Simple group_participants policy - allow viewing if you're the user
CREATE POLICY "group_participants_view_own" ON group_participants FOR SELECT USING (
    auth.uid() = user_id
);

-- Simple conversations policy - allow viewing 1-on-1 and all groups temporarily
CREATE POLICY "conversations_view_simple" ON conversations FOR SELECT USING (
    (is_group = FALSE AND (auth.uid() = participant_one_id OR auth.uid() = participant_two_id)) OR
    (is_group = TRUE)
);
```

### Step 3: Restart Your App
1. Stop your Expo dev server (Ctrl+C)
2. Clear the cache: `npx expo start --clear`
3. Test the app again

## Alternative One-Command Fix

You can also run the complete fix files:

```bash
# Navigate to your project
cd SnapchatClone

# Run both fixes in Supabase SQL Editor:
# 1. Copy and paste EMERGENCY_AVATAR_FIX.sql
# 2. Copy and paste EMERGENCY_RLS_FIX.sql
```

## What These Fixes Do

**Avatar Fix:**
- Adds the missing `avatar_url` column to the profiles table
- This prevents the "column does not exist" error

**RLS Fix:**
- Removes recursive RLS policies that were causing infinite loops
- Creates simple, non-recursive policies for basic functionality
- Temporarily allows access to all group conversations for testing

After applying these fixes, your group messaging should work without the recursion and column errors. 