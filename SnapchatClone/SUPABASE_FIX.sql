-- SnapConnect Supabase Fixes
-- Run this SQL script in your Supabase SQL editor to fix RLS and email confirmation issues

-- Fix 1: Update profiles RLS policy to allow trigger-based inserts
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT WITH CHECK (
  auth.uid() = id OR 
  auth.role() = 'authenticated' OR
  auth.uid() IS NULL  -- Allow during trigger execution
);

-- Fix 2: Update the profile creation function to handle errors gracefully
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Try to insert profile, ignore errors if profile already exists
  INSERT INTO public.profiles (id, username, email, display_name)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    new.email,
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();
    
  RETURN new;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    RAISE WARNING 'Profile creation failed for user %: %', new.id, SQLERRM;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix 3: Create a function to manually create profiles for existing users
CREATE OR REPLACE FUNCTION public.create_missing_profiles()
RETURNS void AS $$
DECLARE
  user_record RECORD;
BEGIN
  -- Loop through all auth users that don't have profiles
  FOR user_record IN 
    SELECT u.id, u.email, u.raw_user_meta_data
    FROM auth.users u
    LEFT JOIN public.profiles p ON u.id = p.id
    WHERE p.id IS NULL
  LOOP
    -- Create profile for this user
    INSERT INTO public.profiles (id, username, email, display_name)
    VALUES (
      user_record.id,
      COALESCE(user_record.raw_user_meta_data->>'username', split_part(user_record.email, '@', 1)),
      user_record.email,
      COALESCE(user_record.raw_user_meta_data->>'username', split_part(user_record.email, '@', 1))
    )
    ON CONFLICT (id) DO NOTHING;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix 4: Create profiles for any existing users missing them
SELECT public.create_missing_profiles();

-- Fix 5: Create a function to confirm emails for test accounts (use carefully!)
CREATE OR REPLACE FUNCTION public.confirm_test_emails()
RETURNS void AS $$
BEGIN
  -- Only confirm test emails ending with test@gmail.com
  UPDATE auth.users 
  SET 
    email_confirmed_at = NOW(),
    confirmed_at = NOW()
  WHERE 
    email LIKE '%test@gmail.com' 
    AND email_confirmed_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix 6: Confirm test emails (run this manually when needed)
-- SELECT public.confirm_test_emails();

-- Fix 7: Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.profiles TO anon, authenticated;
GRANT ALL ON public.friendships TO anon, authenticated;
GRANT ALL ON public.snaps TO anon, authenticated;
GRANT ALL ON public.stories TO anon, authenticated; 