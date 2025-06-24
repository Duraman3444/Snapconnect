-- SnapConnect Group Messaging Setup
-- This script adds group messaging functionality to existing 1-on-1 messaging system
-- Run this in your Supabase SQL editor

-- =============================================================================
-- 1. MODIFY CONVERSATIONS TABLE FOR GROUP SUPPORT
-- =============================================================================

-- Add group-related columns to existing conversations table
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS is_group BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS group_name TEXT,
ADD COLUMN IF NOT EXISTS group_description TEXT,
ADD COLUMN IF NOT EXISTS group_avatar_url TEXT,
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS max_participants INTEGER DEFAULT 50;

-- Update the unique constraint to handle both 1-on-1 and group conversations
-- Drop the old constraint that only works for 1-on-1
ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_participant_one_id_participant_two_id_key;

-- =============================================================================
-- 2. CREATE GROUP PARTICIPANTS TABLE
-- =============================================================================

-- Create table to manage group participants (many-to-many relationship)
CREATE TABLE IF NOT EXISTS group_participants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member', -- 'admin', 'member'
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    added_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    left_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(conversation_id, user_id)
);

-- Enable RLS on group_participants
ALTER TABLE group_participants ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 3. UPDATE MESSAGES TABLE FOR GROUP SUPPORT
-- =============================================================================

-- Remove the receiver_id constraint for group messages (receiver can be null for groups)
ALTER TABLE messages 
ALTER COLUMN receiver_id DROP NOT NULL;

-- Add group-specific columns
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS mentions JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS reply_to_message_id UUID REFERENCES messages(id) ON DELETE SET NULL;

-- =============================================================================
-- 4. CREATE GROUP-RELATED RLS POLICIES
-- =============================================================================

-- Group Participants RLS Policies
DROP POLICY IF EXISTS "Users can view group participants they're part of" ON group_participants;
CREATE POLICY "Users can view group participants they're part of" ON group_participants FOR SELECT USING (
    auth.uid() = user_id OR 
    auth.uid() IN (
        SELECT user_id FROM group_participants gp2 
        WHERE gp2.conversation_id = group_participants.conversation_id 
        AND gp2.is_active = TRUE
    )
);

DROP POLICY IF EXISTS "Admins can add group participants" ON group_participants;
CREATE POLICY "Admins can add group participants" ON group_participants FOR INSERT WITH CHECK (
    auth.uid() IN (
        SELECT user_id FROM group_participants 
        WHERE conversation_id = group_participants.conversation_id 
        AND role = 'admin' 
        AND is_active = TRUE
    ) OR
    auth.uid() = user_id -- Allow users to join if invited
);

DROP POLICY IF EXISTS "Users can leave groups" ON group_participants;
CREATE POLICY "Users can leave groups" ON group_participants FOR UPDATE USING (
    auth.uid() = user_id OR
    auth.uid() IN (
        SELECT user_id FROM group_participants gp2
        WHERE gp2.conversation_id = group_participants.conversation_id 
        AND gp2.role = 'admin' 
        AND gp2.is_active = TRUE
    )
);

-- Update Conversations RLS Policies for groups
DROP POLICY IF EXISTS "Users can view their conversations" ON conversations;
CREATE POLICY "Users can view their conversations" ON conversations FOR SELECT USING (
    -- 1-on-1 conversations
    (is_group = FALSE AND (auth.uid() = participant_one_id OR auth.uid() = participant_two_id)) OR
    -- Group conversations
    (is_group = TRUE AND auth.uid() IN (
        SELECT user_id FROM group_participants 
        WHERE conversation_id = conversations.id 
        AND is_active = TRUE
    ))
);

DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
CREATE POLICY "Users can create conversations" ON conversations FOR INSERT WITH CHECK (
    -- 1-on-1 conversations
    (is_group = FALSE AND (auth.uid() = participant_one_id OR auth.uid() = participant_two_id)) OR
    -- Group conversations (creator becomes admin)
    (is_group = TRUE AND auth.uid() = created_by)
);

DROP POLICY IF EXISTS "Users can update their conversations" ON conversations;
CREATE POLICY "Users can update their conversations" ON conversations FOR UPDATE USING (
    -- 1-on-1 conversations
    (is_group = FALSE AND (auth.uid() = participant_one_id OR auth.uid() = participant_two_id)) OR
    -- Group conversations (only admins can update group info)
    (is_group = TRUE AND auth.uid() IN (
        SELECT user_id FROM group_participants 
        WHERE conversation_id = conversations.id 
        AND role = 'admin' 
        AND is_active = TRUE
    ))
);

-- Update Messages RLS Policies for groups
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;
CREATE POLICY "Users can view messages in their conversations" ON messages FOR SELECT USING (
    -- 1-on-1 messages
    (receiver_id IS NOT NULL AND (auth.uid() = sender_id OR auth.uid() = receiver_id)) OR
    -- Group messages
    (receiver_id IS NULL AND auth.uid() IN (
        SELECT user_id FROM group_participants 
        WHERE conversation_id = messages.conversation_id 
        AND is_active = TRUE
    )) OR
    -- Direct access for sender
    auth.uid() = sender_id
);

DROP POLICY IF EXISTS "Users can send messages" ON messages;
CREATE POLICY "Users can send messages" ON messages FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND (
        -- Can send to 1-on-1 conversations they're part of
        (receiver_id IS NOT NULL) OR
        -- Can send to groups they're part of
        (receiver_id IS NULL AND auth.uid() IN (
            SELECT user_id FROM group_participants 
            WHERE conversation_id = messages.conversation_id 
            AND is_active = TRUE
        ))
    )
);

-- =============================================================================
-- 5. CREATE GROUP MESSAGING FUNCTIONS
-- =============================================================================

-- Function to create a new group conversation
CREATE OR REPLACE FUNCTION public.create_group_conversation(
    creator_id UUID,
    group_name TEXT,
    group_description TEXT DEFAULT NULL,
    participant_ids UUID[] DEFAULT ARRAY[]::UUID[]
)
RETURNS UUID AS $$
DECLARE
    conversation_id UUID;
    participant_id UUID;
BEGIN
    -- Create the group conversation
    INSERT INTO conversations (
        is_group, 
        group_name, 
        group_description, 
        created_by,
        participant_one_id, -- Set to creator for compatibility
        participant_two_id  -- Set to creator for compatibility
    )
    VALUES (
        TRUE, 
        group_name, 
        group_description, 
        creator_id,
        creator_id,
        creator_id
    )
    RETURNING id INTO conversation_id;
    
    -- Add creator as admin
    INSERT INTO group_participants (conversation_id, user_id, role, added_by)
    VALUES (conversation_id, creator_id, 'admin', creator_id);
    
    -- Add other participants as members
    FOREACH participant_id IN ARRAY participant_ids
    LOOP
        IF participant_id != creator_id THEN
            INSERT INTO group_participants (conversation_id, user_id, role, added_by)
            VALUES (conversation_id, participant_id, 'member', creator_id)
            ON CONFLICT (conversation_id, user_id) DO NOTHING;
        END IF;
    END LOOP;
    
    RETURN conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add user to group
CREATE OR REPLACE FUNCTION public.add_user_to_group(
    conversation_id UUID,
    user_id UUID,
    added_by_user_id UUID,
    role TEXT DEFAULT 'member'
)
RETURNS BOOLEAN AS $$
DECLARE
    is_admin BOOLEAN := FALSE;
    participant_count INTEGER;
    max_participants INTEGER;
BEGIN
    -- Check if the user adding is an admin
    SELECT EXISTS(
        SELECT 1 FROM group_participants 
        WHERE conversation_id = add_user_to_group.conversation_id 
        AND user_id = added_by_user_id 
        AND role = 'admin' 
        AND is_active = TRUE
    ) INTO is_admin;
    
    IF NOT is_admin THEN
        RETURN FALSE;
    END IF;
    
    -- Check participant limit
    SELECT c.max_participants INTO max_participants
    FROM conversations c
    WHERE c.id = conversation_id;
    
    SELECT COUNT(*) INTO participant_count
    FROM group_participants
    WHERE conversation_id = add_user_to_group.conversation_id
    AND is_active = TRUE;
    
    IF participant_count >= max_participants THEN
        RETURN FALSE;
    END IF;
    
    -- Add the user
    INSERT INTO group_participants (conversation_id, user_id, role, added_by)
    VALUES (add_user_to_group.conversation_id, add_user_to_group.user_id, add_user_to_group.role, added_by_user_id)
    ON CONFLICT (conversation_id, user_id) 
    DO UPDATE SET 
        is_active = TRUE,
        left_at = NULL,
        joined_at = NOW();
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to remove user from group
CREATE OR REPLACE FUNCTION public.remove_user_from_group(
    conversation_id UUID,
    user_id UUID,
    removed_by_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    is_admin BOOLEAN := FALSE;
    is_self_removal BOOLEAN := FALSE;
BEGIN
    -- Check if it's self-removal or admin removal
    is_self_removal := (user_id = removed_by_user_id);
    
    IF NOT is_self_removal THEN
        -- Check if the user removing is an admin
        SELECT EXISTS(
            SELECT 1 FROM group_participants 
            WHERE conversation_id = remove_user_from_group.conversation_id 
            AND user_id = removed_by_user_id 
            AND role = 'admin' 
            AND is_active = TRUE
        ) INTO is_admin;
        
        IF NOT is_admin THEN
            RETURN FALSE;
        END IF;
    END IF;
    
    -- Remove the user (mark as inactive)
    UPDATE group_participants 
    SET is_active = FALSE, left_at = NOW()
    WHERE conversation_id = remove_user_from_group.conversation_id 
    AND user_id = remove_user_from_group.user_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get group participants
CREATE OR REPLACE FUNCTION public.get_group_participants(conversation_id UUID)
RETURNS TABLE(
    user_id UUID,
    username TEXT,
    display_name TEXT,
    avatar_url TEXT,
    role TEXT,
    joined_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        gp.user_id,
        p.username,
        p.display_name,
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to send group message
CREATE OR REPLACE FUNCTION public.send_group_message(
    conversation_id UUID,
    sender_id UUID,
    content TEXT,
    message_type TEXT DEFAULT 'text',
    image_url TEXT DEFAULT NULL,
    reply_to_message_id UUID DEFAULT NULL,
    mentions UUID[] DEFAULT ARRAY[]::UUID[]
)
RETURNS UUID AS $$
DECLARE
    message_id UUID;
BEGIN
    -- Insert the message (receiver_id is NULL for group messages)
    INSERT INTO messages (
        conversation_id,
        sender_id,
        receiver_id,
        content,
        message_type,
        image_url,
        reply_to_message_id,
        mentions
    )
    VALUES (
        send_group_message.conversation_id,
        send_group_message.sender_id,
        NULL, -- No specific receiver for group messages
        send_group_message.content,
        send_group_message.message_type,
        send_group_message.image_url,
        send_group_message.reply_to_message_id,
        to_jsonb(send_group_message.mentions)
    )
    RETURNING id INTO message_id;
    
    RETURN message_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 6. CREATE INDEXES FOR PERFORMANCE
-- =============================================================================

-- Indexes for group_participants table
CREATE INDEX IF NOT EXISTS idx_group_participants_conversation ON group_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_group_participants_user ON group_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_group_participants_active ON group_participants(conversation_id, is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_group_participants_role ON group_participants(conversation_id, role) WHERE is_active = TRUE;

-- Indexes for group conversations
CREATE INDEX IF NOT EXISTS idx_conversations_is_group ON conversations(is_group);
CREATE INDEX IF NOT EXISTS idx_conversations_created_by ON conversations(created_by) WHERE is_group = TRUE;

-- Indexes for group messages
CREATE INDEX IF NOT EXISTS idx_messages_mentions ON messages USING GIN(mentions) WHERE mentions IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_reply_to ON messages(reply_to_message_id) WHERE reply_to_message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_group ON messages(conversation_id) WHERE receiver_id IS NULL;

-- =============================================================================
-- 7. ENABLE REALTIME FOR GROUP TABLES
-- =============================================================================

-- Enable realtime for group_participants table
ALTER publication supabase_realtime ADD TABLE group_participants;

-- =============================================================================
-- 8. CREATE TRIGGER FOR GROUP MESSAGE NOTIFICATIONS
-- =============================================================================

-- Update the conversation timestamp trigger to work with both 1-on-1 and group messages
CREATE OR REPLACE FUNCTION public.update_conversation_timestamp()
RETURNS trigger AS $$
BEGIN
    UPDATE conversations 
    SET 
        updated_at = TIMEZONE('utc'::text, NOW()),
        last_message_at = TIMEZONE('utc'::text, NOW())
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- SETUP COMPLETE!
-- =============================================================================

SELECT 'Group messaging setup completed successfully!' as status;

-- Show the new columns
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'conversations' 
  AND table_schema = 'public'
  AND column_name IN ('is_group', 'group_name', 'group_description', 'group_avatar_url', 'created_by', 'max_participants')
ORDER BY column_name; 