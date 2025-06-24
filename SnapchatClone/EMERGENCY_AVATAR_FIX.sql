-- Emergency fix for avatar_url column issue
-- This adds the missing avatar_url column to the profiles table

-- Add the missing avatar_url column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Update existing profiles to have NULL avatar_url by default
UPDATE profiles SET avatar_url = NULL WHERE avatar_url IS NULL;

SELECT 'Avatar URL column added successfully!' as status; 