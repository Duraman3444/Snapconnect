-- GROUP MESSAGING MESSAGES FIX
-- This fixes the get_active_messages function to properly handle group messages
-- The issue is that group messages have receiver_id as NULL, so the function
-- needs to check if the user is a participant in the group

-- =============================================================================
-- FIX 1: UPDATE get_active_messages FUNCTION TO HANDLE GROUP MESSAGES
-- =============================================================================

-- Drop the existing function
DROP FUNCTION IF EXISTS get_active_messages(uuid, uuid);

-- Create updated function that properly handles group messages
CREATE OR REPLACE FUNCTION get_active_messages(
    conversation_uuid uuid,
    user_id uuid
)
RETURNS TABLE (
    id uuid,
    conversation_id uuid,
    sender_id uuid,
    receiver_id uuid,
    content text,
    message_type text,
    image_url text,
    video_url text,
    media_url text,
    media_type text,
    is_ephemeral boolean,
    viewed_at timestamp with time zone,
    expires_at timestamp with time zone,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    is_read boolean,
    read_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id,
        m.conversation_id,
        m.sender_id,
        m.receiver_id,
        m.content,
        m.message_type,
        m.image_url,
        m.video_url,
        m.media_url,
        m.media_type,
        m.is_ephemeral,
        m.viewed_at,
        m.expires_at,
        m.created_at,
        m.updated_at,
        m.is_read,
        m.read_at
    FROM messages m
    WHERE m.conversation_id = get_active_messages.conversation_uuid
      AND (
          -- Show all non-ephemeral messages
          NOT m.is_ephemeral
          OR 
          -- Show ephemeral messages that haven't expired
          (m.is_ephemeral AND (m.expires_at IS NULL OR m.expires_at > NOW()))
      )
      AND (
          -- For 1-on-1 messages: user is sender or receiver
          (m.receiver_id IS NOT NULL AND (m.sender_id = get_active_messages.user_id OR m.receiver_id = get_active_messages.user_id))
          OR
          -- For group messages: user is a participant in the group
          (m.receiver_id IS NULL AND EXISTS (
              SELECT 1 FROM group_participants gp 
              WHERE gp.conversation_id = m.conversation_id 
              AND gp.user_id = get_active_messages.user_id 
              AND gp.is_active = TRUE
          ))
      )
    ORDER BY m.created_at ASC;
END;
$$;

-- =============================================================================
-- FIX 2: ENSURE PROPER RLS POLICY FOR MESSAGES
-- =============================================================================

-- Update the messages RLS policy to properly handle group messages
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;
CREATE POLICY "Users can view messages in their conversations" ON messages FOR SELECT USING (
    -- For 1-on-1 messages
    (receiver_id IS NOT NULL AND (auth.uid() = sender_id OR auth.uid() = receiver_id)) 
    OR
    -- For group messages
    (receiver_id IS NULL AND EXISTS (
        SELECT 1 FROM group_participants gp 
        WHERE gp.conversation_id = messages.conversation_id 
        AND gp.user_id = auth.uid() 
        AND gp.is_active = TRUE
    ))
    OR
    -- Always allow sender to see their own messages
    auth.uid() = sender_id
);

-- =============================================================================
-- FIX 3: ENSURE PROPER RLS POLICY FOR SENDING MESSAGES
-- =============================================================================

-- Update the send messages policy to handle group messages
DROP POLICY IF EXISTS "Users can send messages" ON messages;
CREATE POLICY "Users can send messages" ON messages FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND (
        -- Can send to 1-on-1 conversations
        (receiver_id IS NOT NULL) 
        OR
        -- Can send to groups they're part of
        (receiver_id IS NULL AND EXISTS (
            SELECT 1 FROM group_participants gp 
            WHERE gp.conversation_id = messages.conversation_id 
            AND gp.user_id = auth.uid() 
            AND gp.is_active = TRUE
        ))
    )
);

-- =============================================================================
-- FIX 4: CREATE HELPER FUNCTION TO DEBUG MESSAGE VISIBILITY
-- =============================================================================

CREATE OR REPLACE FUNCTION debug_message_visibility(
    user_id uuid,
    conversation_id uuid
)
RETURNS TABLE (
    message_id uuid,
    sender_id uuid,
    receiver_id uuid,
    content text,
    is_group_message boolean,
    user_is_participant boolean,
    created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id as message_id,
        m.sender_id,
        m.receiver_id,
        m.content,
        (m.receiver_id IS NULL) as is_group_message,
        CASE 
            WHEN m.receiver_id IS NULL THEN 
                EXISTS (
                    SELECT 1 FROM group_participants gp 
                    WHERE gp.conversation_id = m.conversation_id 
                    AND gp.user_id = debug_message_visibility.user_id 
                    AND gp.is_active = TRUE
                )
            ELSE 
                (m.sender_id = debug_message_visibility.user_id OR m.receiver_id = debug_message_visibility.user_id)
        END as user_is_participant,
        m.created_at
    FROM messages m
    WHERE m.conversation_id = debug_message_visibility.conversation_id
    ORDER BY m.created_at ASC;
END;
$$;

-- =============================================================================
-- VERIFICATION
-- =============================================================================
SELECT 'Group messaging messages fix applied!' as status;
SELECT 'Messages should now load properly in group chats' as message; 