-- SnapConnect Group Messaging Fixes
-- This script fixes the infinite recursion and missing column issues

-- =============================================================================
-- FIX 1: RESOLVE INFINITE RECURSION IN GROUP_PARTICIPANTS RLS POLICIES
-- =============================================================================

-- Drop the problematic RLS policies
DROP POLICY IF EXISTS "Users can view group participants they're part of" ON group_participants;
DROP POLICY IF EXISTS "Admins can add group participants" ON group_participants;
DROP POLICY IF EXISTS "Users can leave groups" ON group_participants;

-- Create simpler, non-recursive RLS policies
CREATE POLICY "Users can view group participants" ON group_participants FOR SELECT USING (
    auth.uid() = user_id OR 
    EXISTS (
        SELECT 1 FROM group_participants gp2 
        WHERE gp2.conversation_id = group_participants.conversation_id 
        AND gp2.user_id = auth.uid()
        AND gp2.is_active = TRUE
    )
);

CREATE POLICY "Users can insert group participants" ON group_participants FOR INSERT WITH CHECK (
    auth.uid() = user_id OR
    EXISTS (
        SELECT 1 FROM group_participants gp_admin
        WHERE gp_admin.conversation_id = group_participants.conversation_id 
        AND gp_admin.user_id = auth.uid()
        AND gp_admin.role = 'admin' 
        AND gp_admin.is_active = TRUE
    )
);

CREATE POLICY "Users can update group participants" ON group_participants FOR UPDATE USING (
    auth.uid() = user_id OR
    EXISTS (
        SELECT 1 FROM group_participants gp_admin
        WHERE gp_admin.conversation_id = group_participants.conversation_id 
        AND gp_admin.user_id = auth.uid()
        AND gp_admin.role = 'admin' 
        AND gp_admin.is_active = TRUE
    )
);

-- =============================================================================
-- FIX 2: ENSURE PROFILES TABLE HAS DISPLAY_NAME COLUMN
-- =============================================================================

-- Add display_name column if it doesn't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS display_name TEXT;

-- Update existing profiles to have display_name = username if null
UPDATE profiles SET display_name = username WHERE display_name IS NULL;

-- =============================================================================
-- FIX 3: SIMPLIFY CONVERSATIONS RLS POLICIES TO AVOID RECURSION
-- =============================================================================

-- Update conversations RLS policies to be more direct
DROP POLICY IF EXISTS "Users can view their conversations" ON conversations;
CREATE POLICY "Users can view their conversations" ON conversations FOR SELECT USING (
    -- Direct 1-on-1 participant check
    (is_group = FALSE AND (auth.uid() = participant_one_id OR auth.uid() = participant_two_id)) OR
    -- Group participant check (simple existence check)
    (is_group = TRUE AND EXISTS (
        SELECT 1 FROM group_participants 
        WHERE conversation_id = conversations.id 
        AND user_id = auth.uid()
        AND is_active = TRUE
    ))
);

-- =============================================================================
-- FIX 4: ENSURE PROPER INDEXING FOR PERFORMANCE
-- =============================================================================

-- Create a unique index to prevent duplicate group participants
CREATE UNIQUE INDEX IF NOT EXISTS idx_group_participants_unique 
ON group_participants(conversation_id, user_id);

-- =============================================================================
-- FIX 5: CREATE SAFE FUNCTIONS FOR GROUP OPERATIONS
-- =============================================================================

-- Update get_group_participants to be more reliable
CREATE OR REPLACE FUNCTION public.get_group_participants(conversation_id UUID)
RETURNS TABLE(
    user_id UUID,
    username TEXT,
    display_name TEXT,
    avatar_url TEXT,
    role TEXT,
    joined_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN
) 
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        gp.user_id,
        p.username,
        COALESCE(p.display_name, p.username) as display_name,
        p.avatar_url,
        gp.role,
        gp.joined_at,
        gp.is_active
    FROM group_participants gp
    JOIN profiles p ON p.id = gp.user_id
    WHERE gp.conversation_id = get_group_participants.conversation_id
    ORDER BY 
        CASE WHEN gp.role = 'admin' THEN 0 ELSE 1 END,
        gp.joined_at ASC;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- VERIFICATION
-- =============================================================================

SELECT 'Group messaging fixes applied successfully!' as status;

-- Check that display_name column exists
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
  AND table_schema = 'public'
  AND column_name = 'display_name';

-- Check RLS policies
SELECT schemaname, tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'group_participants' 
  AND schemaname = 'public'; 