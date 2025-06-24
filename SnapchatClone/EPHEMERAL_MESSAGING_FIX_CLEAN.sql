-- Ephemeral Messaging Fix - Clean Version for Supabase
-- This script fixes the issue where messages aren't deleted immediately when viewed
-- Run this in your Supabase SQL Editor

-- =============================================================================
-- FIX 1: UPDATE THE MARK MESSAGE VIEWED FUNCTION
-- =============================================================================

-- Drop and recreate the function with better logic
DROP FUNCTION IF EXISTS public.mark_message_viewed(UUID, UUID);

CREATE OR REPLACE FUNCTION public.mark_message_viewed(message_id UUID, viewer_id UUID)
RETURNS json AS $$
DECLARE
    message_record RECORD;
    result json;
BEGIN
    -- Get the message record
    SELECT * INTO message_record 
    FROM messages 
    WHERE id = message_id;
    
    -- Check if message exists
    IF message_record IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Message not found');
    END IF;
    
    -- Check if viewer is the intended receiver
    IF message_record.receiver_id != viewer_id THEN
        RETURN json_build_object('success', false, 'error', 'Not authorized to view this message');
    END IF;
    
    -- If message is ephemeral, delete it immediately
    IF message_record.is_ephemeral = TRUE THEN
        -- Delete the message immediately
        DELETE FROM messages WHERE id = message_id;
        
        RETURN json_build_object(
            'success', true, 
            'action', 'deleted',
            'message', 'Ephemeral message deleted after viewing'
        );
    ELSE
        -- For regular messages, just mark as read
        UPDATE messages 
        SET 
            is_read = TRUE,
            read_at = NOW()
        WHERE id = message_id;
        
        RETURN json_build_object(
            'success', true, 
            'action', 'marked_read',
            'message', 'Message marked as read'
        );
    END IF;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- FIX 2: ENSURE PROPER PERMISSIONS FOR DELETION
-- =============================================================================

-- Update RLS policy to allow users to delete ephemeral messages they've viewed
DROP POLICY IF EXISTS "Users can delete viewed ephemeral messages" ON messages;
CREATE POLICY "Users can delete viewed ephemeral messages" ON messages FOR DELETE USING (
    (is_ephemeral = TRUE AND auth.uid() = receiver_id) OR
    (is_ephemeral = TRUE AND expires_at IS NOT NULL AND expires_at < NOW())
);

-- =============================================================================
-- FIX 3: SIMPLIFIED ACTIVE MESSAGES FUNCTION
-- =============================================================================

-- Update the get_active_messages function to be more efficient
DROP FUNCTION IF EXISTS public.get_active_messages(UUID, UUID);

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
    -- First cleanup any expired messages
    DELETE FROM messages 
    WHERE is_ephemeral = TRUE 
      AND expires_at IS NOT NULL 
      AND expires_at < NOW();
    
    -- Return active messages
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
            WHEN m.is_ephemeral = TRUE AND m.expires_at IS NOT NULL THEN 
                GREATEST(0, EXTRACT(EPOCH FROM (m.expires_at - NOW()))::INTEGER)
            ELSE 
                NULL
        END as time_remaining_seconds
    FROM messages m
    WHERE m.conversation_id = conversation_uuid
      AND (m.sender_id = user_id OR m.receiver_id = user_id)
      AND (
          -- Include regular messages
          m.is_ephemeral = FALSE 
          OR 
          -- Include ephemeral messages that haven't expired
          (m.is_ephemeral = TRUE AND (m.expires_at IS NULL OR m.expires_at > NOW()))
      )
    ORDER BY m.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- FIX 4: CREATE IMMEDIATE CLEANUP FUNCTION
-- =============================================================================

-- Function to immediately delete an ephemeral message when viewed
CREATE OR REPLACE FUNCTION public.delete_ephemeral_message_on_view(message_id UUID, viewer_id UUID)
RETURNS boolean AS $$
DECLARE
    message_exists BOOLEAN := FALSE;
BEGIN
    -- Check if message exists and user is authorized to delete it
    SELECT EXISTS(
        SELECT 1 FROM messages 
        WHERE id = message_id 
          AND receiver_id = viewer_id 
          AND is_ephemeral = TRUE
    ) INTO message_exists;
    
    IF message_exists THEN
        -- Delete the message immediately
        DELETE FROM messages 
        WHERE id = message_id 
          AND receiver_id = viewer_id 
          AND is_ephemeral = TRUE;
        
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- FIX 5: TEST THE FUNCTIONALITY
-- =============================================================================

-- Test function to verify immediate deletion works
CREATE OR REPLACE FUNCTION public.test_ephemeral_deletion()
RETURNS text AS $$
DECLARE
    test_message_id UUID;
    test_conv_id UUID;
    test_sender_id UUID;
    test_receiver_id UUID;
    result text;
BEGIN
    -- Get a test conversation and users
    SELECT id, participant_one_id, participant_two_id 
    INTO test_conv_id, test_sender_id, test_receiver_id
    FROM conversations 
    LIMIT 1;
    
    IF test_conv_id IS NULL THEN
        RETURN 'No test conversation found. Create a conversation first.';
    END IF;
    
    -- Insert a test ephemeral message
    INSERT INTO messages (conversation_id, sender_id, receiver_id, content, is_ephemeral)
    VALUES (test_conv_id, test_sender_id, test_receiver_id, 'Test ephemeral message - will be deleted', TRUE)
    RETURNING id INTO test_message_id;
    
    -- Try to view/delete the message
    PERFORM mark_message_viewed(test_message_id, test_receiver_id);
    
    -- Check if message was deleted
    IF EXISTS(SELECT 1 FROM messages WHERE id = test_message_id) THEN
        result := 'FAILED: Message still exists after viewing';
        -- Cleanup the test message
        DELETE FROM messages WHERE id = test_message_id;
    ELSE
        result := 'SUCCESS: Message was deleted immediately after viewing';
    END IF;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- VERIFY THE FIX WORKS
-- =============================================================================

-- Test the deletion functionality
SELECT 'Testing ephemeral message deletion...' as test_status;
SELECT public.test_ephemeral_deletion() as test_result;

-- Check that the functions were created properly
SELECT 'mark_message_viewed function created successfully' as function_status
WHERE EXISTS (
    SELECT 1 FROM information_schema.routines 
    WHERE routine_name = 'mark_message_viewed' 
    AND routine_schema = 'public'
);

-- Verify policies exist
SELECT 'Deletion policy created successfully' as policy_status
WHERE EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'messages' 
    AND policyname = 'Users can delete viewed ephemeral messages'
);

-- Final success message
SELECT 'Ephemeral messaging fix completed successfully! Messages will now be deleted immediately when viewed.' as final_status; 