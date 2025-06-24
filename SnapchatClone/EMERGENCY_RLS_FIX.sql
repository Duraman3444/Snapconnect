-- Emergency fix for RLS recursion issue
-- This temporarily disables problematic RLS policies

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

SELECT 'RLS policies fixed!' as status; 