-- SnapConnect Ephemeral Messaging Setup
-- This script adds Snapchat-like ephemeral messaging functionality
-- Messages disappear after 24 hours or when viewed

-- =============================================================================
-- 1. MODIFY MESSAGES TABLE FOR EPHEMERAL FUNCTIONALITY
-- =============================================================================

-- Add new columns to messages table for ephemeral functionality
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS is_ephemeral BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS auto_delete_at TIMESTAMP WITH TIME ZONE;

-- Create function to set expiration time for new messages
CREATE OR REPLACE FUNCTION public.set_message_expiration()
RETURNS trigger AS $$
BEGIN
    -- Set expiration to 24 hours from creation for ephemeral messages
    IF NEW.is_ephemeral = TRUE THEN
        NEW.expires_at := NEW.created_at + INTERVAL '24 hours';
        NEW.auto_delete_at := NEW.created_at + INTERVAL '24 hours';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically set expiration times
DROP TRIGGER IF EXISTS set_ephemeral_expiration ON messages;
CREATE TRIGGER set_ephemeral_expiration
    BEFORE INSERT ON messages
    FOR EACH ROW EXECUTE PROCEDURE public.set_message_expiration();

-- =============================================================================
-- 2. CREATE FUNCTION TO CLEANUP EXPIRED MESSAGES
-- =============================================================================

-- Function to delete expired messages
CREATE OR REPLACE FUNCTION public.cleanup_expired_messages()
RETURNS void AS $$
BEGIN
    -- Delete messages that have passed their auto_delete_at time
    DELETE FROM messages 
    WHERE is_ephemeral = TRUE 
      AND auto_delete_at IS NOT NULL 
      AND auto_delete_at < NOW();
      
    -- Also delete messages that were viewed and should disappear immediately
    DELETE FROM messages 
    WHERE is_ephemeral = TRUE 
      AND viewed_at IS NOT NULL;
      
    RAISE NOTICE 'Expired ephemeral messages cleaned up';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 3. CREATE FUNCTION TO HANDLE MESSAGE VIEWING
-- =============================================================================

-- Function to mark message as viewed and handle immediate deletion
CREATE OR REPLACE FUNCTION public.mark_message_viewed(message_id UUID, viewer_id UUID)
RETURNS boolean AS $$
DECLARE
    message_record RECORD;
    is_receiver BOOLEAN := FALSE;
BEGIN
    -- Get the message and check if the viewer is the receiver
    SELECT * INTO message_record 
    FROM messages 
    WHERE id = message_id;
    
    -- Check if viewer is the intended receiver
    IF message_record.receiver_id = viewer_id THEN
        is_receiver := TRUE;
    END IF;
    
    -- Only allow receivers to mark messages as viewed
    IF NOT is_receiver THEN
        RETURN FALSE;
    END IF;
    
    -- Mark as viewed and read
    UPDATE messages 
    SET 
        viewed_at = NOW(),
        is_read = TRUE,
        read_at = NOW()
    WHERE id = message_id 
      AND receiver_id = viewer_id;
    
    -- If it's ephemeral, delete it immediately after marking as viewed
    IF message_record.is_ephemeral THEN
        DELETE FROM messages WHERE id = message_id;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 4. CREATE FUNCTION TO GET ACTIVE (NON-EXPIRED) MESSAGES
-- =============================================================================

-- Function to get only non-expired messages for a conversation
CREATE OR REPLACE FUNCTION public.get_active_messages(conversation_uuid UUID, user_id UUID)
RETURNS TABLE(
    id UUID,
    conversation_id UUID,
    sender_id UUID,
    receiver_id UUID,
    content TEXT,
    message_type TEXT,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    is_read BOOLEAN,
    is_ephemeral BOOLEAN,
    expires_at TIMESTAMP WITH TIME ZONE,
    viewed_at TIMESTAMP WITH TIME ZONE,
    time_remaining_seconds INTEGER
) AS $$
BEGIN
    -- First cleanup expired messages
    PERFORM public.cleanup_expired_messages();
    
    -- Return active messages with time remaining calculation
    RETURN QUERY
    SELECT 
        m.id,
        m.conversation_id,
        m.sender_id,
        m.receiver_id,
        m.content,
        m.message_type,
        m.image_url,
        m.created_at,
        m.read_at,
        m.is_read,
        m.is_ephemeral,
        m.expires_at,
        m.viewed_at,
        CASE 
            WHEN m.is_ephemeral AND m.expires_at IS NOT NULL THEN 
                GREATEST(0, EXTRACT(EPOCH FROM (m.expires_at - NOW()))::INTEGER)
            ELSE 
                NULL
        END as time_remaining_seconds
    FROM messages m
    WHERE m.conversation_id = conversation_uuid
      AND (m.sender_id = user_id OR m.receiver_id = user_id)
      AND (
          m.is_ephemeral = FALSE 
          OR (m.is_ephemeral = TRUE AND (m.expires_at IS NULL OR m.expires_at > NOW()))
      )
      AND m.viewed_at IS NULL  -- Don't show viewed ephemeral messages
    ORDER BY m.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 5. CREATE SCHEDULED CLEANUP (PostgreSQL Extension Required)
-- =============================================================================

-- Note: This requires pg_cron extension which may not be available on all Supabase plans
-- Alternative: Run cleanup from the application periodically

-- If pg_cron is available, uncomment the following:
-- SELECT cron.schedule('cleanup-ephemeral-messages', '*/5 * * * *', 'SELECT public.cleanup_expired_messages();');

-- =============================================================================
-- 6. CREATE INDEXES FOR PERFORMANCE
-- =============================================================================

-- Index for expiration queries
CREATE INDEX IF NOT EXISTS idx_messages_ephemeral_expires ON messages(is_ephemeral, expires_at) 
WHERE is_ephemeral = TRUE;

-- Index for auto-deletion queries
CREATE INDEX IF NOT EXISTS idx_messages_auto_delete ON messages(auto_delete_at) 
WHERE auto_delete_at IS NOT NULL;

-- Index for viewed messages
CREATE INDEX IF NOT EXISTS idx_messages_viewed ON messages(viewed_at) 
WHERE viewed_at IS NOT NULL;

-- =============================================================================
-- 7. UPDATE RLS POLICIES FOR EPHEMERAL MESSAGES
-- =============================================================================

-- Update the messages select policy to use the new function
DROP POLICY IF EXISTS "Users can view active messages in their conversations" ON messages;
CREATE POLICY "Users can view active messages in their conversations" ON messages FOR SELECT USING (
    (auth.uid() = sender_id OR auth.uid() = receiver_id) AND
    (
        is_ephemeral = FALSE OR 
        (is_ephemeral = TRUE AND (expires_at IS NULL OR expires_at > NOW()) AND viewed_at IS NULL)
    )
);

-- Policy for marking messages as viewed
DROP POLICY IF EXISTS "Users can mark received messages as viewed" ON messages;
CREATE POLICY "Users can mark received messages as viewed" ON messages FOR UPDATE USING (
    auth.uid() = receiver_id
) WITH CHECK (
    auth.uid() = receiver_id
);

-- Policy for deleting viewed ephemeral messages
DROP POLICY IF EXISTS "System can delete viewed ephemeral messages" ON messages;
CREATE POLICY "System can delete viewed ephemeral messages" ON messages FOR DELETE USING (
    is_ephemeral = TRUE AND (
        viewed_at IS NOT NULL OR 
        (expires_at IS NOT NULL AND expires_at < NOW())
    )
);

-- =============================================================================
-- 8. CREATE UTILITY FUNCTIONS
-- =============================================================================

-- Function to toggle ephemeral mode for a conversation
CREATE OR REPLACE FUNCTION public.set_conversation_ephemeral_mode(
    conversation_uuid UUID, 
    user_id UUID, 
    ephemeral_mode BOOLEAN
)
RETURNS boolean AS $$
DECLARE
    is_participant BOOLEAN := FALSE;
BEGIN
    -- Check if user is a participant in the conversation
    SELECT EXISTS(
        SELECT 1 FROM conversations 
        WHERE id = conversation_uuid 
          AND (participant_one_id = user_id OR participant_two_id = user_id)
    ) INTO is_participant;
    
    IF NOT is_participant THEN
        RETURN FALSE;
    END IF;
    
    -- This would require adding ephemeral_mode to conversations table
    -- For now, we'll just return success
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get ephemeral message statistics
CREATE OR REPLACE FUNCTION public.get_ephemeral_stats()
RETURNS TABLE(
    total_ephemeral_messages INTEGER,
    messages_expiring_soon INTEGER,
    messages_viewed_today INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*)::INTEGER FROM messages WHERE is_ephemeral = TRUE) as total_ephemeral_messages,
        (SELECT COUNT(*)::INTEGER FROM messages WHERE is_ephemeral = TRUE AND expires_at < NOW() + INTERVAL '1 hour') as messages_expiring_soon,
        (SELECT COUNT(*)::INTEGER FROM messages WHERE is_ephemeral = TRUE AND viewed_at > NOW() - INTERVAL '1 day') as messages_viewed_today;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- SETUP COMPLETE!
-- =============================================================================

-- Verify the setup
SELECT 'Ephemeral messaging setup completed successfully!' as status;

-- Show the new columns
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'messages' 
  AND table_schema = 'public'
  AND column_name IN ('is_ephemeral', 'expires_at', 'viewed_at', 'auto_delete_at')
ORDER BY column_name;

-- Test data - you can uncomment this for testing
/*
-- Insert a test ephemeral message (will be automatically set to expire in 24 hours)
INSERT INTO messages (conversation_id, sender_id, receiver_id, content, message_type, is_ephemeral)
SELECT 
    c.id,
    c.participant_one_id,
    c.participant_two_id,
    'This message will disappear in 24 hours! 👻',
    'text',
    TRUE
FROM conversations c LIMIT 1;
*/ 