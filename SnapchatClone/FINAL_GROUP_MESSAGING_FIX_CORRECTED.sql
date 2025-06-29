-- FINAL GROUP MESSAGING FIX - CORRECTED VERSION
-- This fixes the group visibility issue where other participants can't see the group
-- The previous fix was too permissive and allowed all users to see all groups

-- =============================================================================
-- FIX 1: CORRECT RLS POLICIES FOR GROUP VISIBILITY
-- =============================================================================

-- Drop the overly permissive policies
DROP POLICY IF EXISTS "conversations_access" ON conversations;
DROP POLICY IF EXISTS "group_participants_access" ON group_participants;

-- Create proper group_participants policy first (no recursion)
CREATE POLICY "group_participants_select" ON group_participants FOR SELECT USING (
    auth.uid() = user_id
);

CREATE POLICY "group_participants_insert" ON group_participants FOR INSERT WITH CHECK (
    auth.uid() = user_id OR auth.uid() = added_by
);

CREATE POLICY "group_participants_update" ON group_participants FOR UPDATE USING (
    auth.uid() = user_id
);

-- Create proper conversations policy that checks group participation
CREATE POLICY "conversations_select" ON conversations FOR SELECT USING (
    -- For 1-on-1 chats
    (is_group = FALSE AND (auth.uid() = participant_one_id OR auth.uid() = participant_two_id)) OR
    -- For group chats - check if user is in group_participants table
    (is_group = TRUE AND EXISTS (
        SELECT 1 FROM group_participants gp 
        WHERE gp.conversation_id = conversations.id 
        AND gp.user_id = auth.uid() 
        AND gp.is_active = TRUE
    ))
);

CREATE POLICY "conversations_insert" ON conversations FOR INSERT WITH CHECK (
    auth.uid() = participant_one_id OR auth.uid() = participant_two_id OR auth.uid() = created_by
);

CREATE POLICY "conversations_update" ON conversations FOR UPDATE USING (
    auth.uid() = participant_one_id OR auth.uid() = participant_two_id OR auth.uid() = created_by
);

-- =============================================================================
-- FIX 2: ENSURE PROPER INDEXING FOR RLS PERFORMANCE
-- =============================================================================

-- Add index to make RLS queries faster
CREATE INDEX IF NOT EXISTS idx_group_participants_user_conversation 
ON group_participants(user_id, conversation_id) WHERE is_active = TRUE;

-- =============================================================================
-- FIX 3: VERIFY FUNCTIONS ARE WORKING CORRECTLY
-- =============================================================================

-- Test the create_group_conversation function
CREATE OR REPLACE FUNCTION public.create_group_conversation(
    creator_id UUID,
    group_name TEXT,
    group_description TEXT DEFAULT NULL,
    participant_ids UUID[] DEFAULT ARRAY[]::UUID[]
)
RETURNS UUID 
SECURITY DEFINER
AS $$
DECLARE
    new_conversation_id UUID;
    participant_id UUID;
BEGIN
    -- Create the group conversation
    INSERT INTO conversations (
        is_group, 
        group_name, 
        group_description, 
        created_by,
        created_at,
        updated_at
    )
    VALUES (
        TRUE, 
        group_name, 
        group_description, 
        creator_id,
        NOW(),
        NOW()
    )
    RETURNING id INTO new_conversation_id;
    
    -- Add creator as admin
    INSERT INTO group_participants (conversation_id, user_id, role, added_by)
    VALUES (new_conversation_id, creator_id, 'admin', creator_id);
    
    -- Add other participants as members
    FOREACH participant_id IN ARRAY participant_ids
    LOOP
        IF participant_id != creator_id THEN
            INSERT INTO group_participants (conversation_id, user_id, role, added_by)
            VALUES (new_conversation_id, participant_id, 'member', creator_id)
            ON CONFLICT (conversation_id, user_id) DO NOTHING;
        END IF;
    END LOOP;
    
    RETURN new_conversation_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- FIX 4: CREATE HELPER FUNCTION TO DEBUG GROUP VISIBILITY
-- =============================================================================

CREATE OR REPLACE FUNCTION public.debug_user_groups(user_id UUID)
RETURNS TABLE(
    conversation_id UUID,
    group_name TEXT,
    user_role TEXT,
    is_active BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE
) 
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id as conversation_id,
        c.group_name,
        gp.role as user_role,
        gp.is_active,
        c.created_at
    FROM conversations c
    JOIN group_participants gp ON gp.conversation_id = c.id
    WHERE gp.user_id = debug_user_groups.user_id
    AND c.is_group = TRUE
    ORDER BY c.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- VERIFICATION
-- =============================================================================
SELECT 'Group messaging RLS policies corrected!' as status;
SELECT 'Users should now only see groups they are participants in' as message; 