-- RLS Photo Upload Fix - Clean Version
-- This script fixes Row Level Security policies to allow photo uploads
-- Run this in your Supabase SQL Editor (handles existing publications)

-- =============================================================================
-- 1. CREATE MISSING DATABASE FUNCTION
-- =============================================================================

-- Create the get_or_create_conversation function that's needed for photo messaging
CREATE OR REPLACE FUNCTION get_or_create_conversation(user_one UUID, user_two UUID)
RETURNS TABLE(id UUID, created_at TIMESTAMPTZ) AS $$
DECLARE
    conversation_record RECORD;
BEGIN
    -- Try to find existing conversation
    SELECT c.id, c.created_at INTO conversation_record
    FROM conversations c
    WHERE (c.user_one_id = get_or_create_conversation.user_one AND c.user_two_id = get_or_create_conversation.user_two)
       OR (c.user_one_id = get_or_create_conversation.user_two AND c.user_two_id = get_or_create_conversation.user_one)
    LIMIT 1;
    
    -- If conversation exists, return it
    IF FOUND THEN
        RETURN QUERY SELECT conversation_record.id, conversation_record.created_at;
        RETURN;
    END IF;
    
    -- Create new conversation if it doesn't exist
    INSERT INTO conversations (user_one_id, user_two_id, created_at, updated_at)
    VALUES (get_or_create_conversation.user_one, get_or_create_conversation.user_two, NOW(), NOW())
    RETURNING conversations.id, conversations.created_at INTO conversation_record;
    
    RETURN QUERY SELECT conversation_record.id, conversation_record.created_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 2. FIX MESSAGES TABLE RLS POLICIES
-- =============================================================================

-- Ensure messages table has proper DELETE policy for ephemeral messages
DROP POLICY IF EXISTS "Users can delete ephemeral messages" ON messages;
CREATE POLICY "Users can delete ephemeral messages" ON messages FOR DELETE USING (
    is_ephemeral = TRUE AND (
        auth.uid() = sender_id OR 
        auth.uid() = receiver_id OR
        (expires_at IS NOT NULL AND expires_at < NOW())
    )
);

-- Make sure users can insert messages they send
DROP POLICY IF EXISTS "Users can send messages" ON messages;
CREATE POLICY "Users can send messages" ON messages FOR INSERT WITH CHECK (
    auth.uid() = sender_id
);

-- Make sure users can view messages in their conversations
DROP POLICY IF EXISTS "Users can view their messages" ON messages;
CREATE POLICY "Users can view their messages" ON messages FOR SELECT USING (
    auth.uid() = sender_id OR auth.uid() = receiver_id
);

-- =============================================================================
-- 3. FIX STORIES TABLE RLS POLICIES  
-- =============================================================================

-- Allow users to insert their own stories
DROP POLICY IF EXISTS "Users can create stories" ON stories;
CREATE POLICY "Users can create stories" ON stories FOR INSERT WITH CHECK (
    auth.uid() = user_id
);

-- Allow users to view stories (all stories for now, can be restricted later)
DROP POLICY IF EXISTS "Users can view stories" ON stories;
CREATE POLICY "Users can view stories" ON stories FOR SELECT USING (true);

-- Allow users to update their own stories (for viewer counts)
DROP POLICY IF EXISTS "Users can update their stories" ON stories;
CREATE POLICY "Users can update their stories" ON stories FOR UPDATE USING (
    auth.uid() = user_id
);

-- Allow users to delete their own stories
DROP POLICY IF EXISTS "Users can delete their stories" ON stories;
CREATE POLICY "Users can delete their stories" ON stories FOR DELETE USING (
    auth.uid() = user_id
);

-- =============================================================================
-- 4. FIX STORAGE POLICIES
-- =============================================================================

-- Allow authenticated users to upload to media bucket
DROP POLICY IF EXISTS "Authenticated users can upload media" ON storage.objects;
CREATE POLICY "Authenticated users can upload media" ON storage.objects FOR INSERT WITH CHECK (
    bucket_id = 'media' AND auth.role() = 'authenticated'
);

-- Allow authenticated users to view media
DROP POLICY IF EXISTS "Authenticated users can view media" ON storage.objects;
CREATE POLICY "Authenticated users can view media" ON storage.objects FOR SELECT USING (
    bucket_id = 'media' AND auth.role() = 'authenticated'
);

-- Allow users to delete their own media
DROP POLICY IF EXISTS "Users can delete their media" ON storage.objects;
CREATE POLICY "Users can delete their media" ON storage.objects FOR DELETE USING (
    bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]
);

-- =============================================================================
-- 5. ENSURE CONVERSATIONS TABLE EXISTS AND HAS PROPER POLICIES
-- =============================================================================

-- Create conversations table if it doesn't exist
CREATE TABLE IF NOT EXISTS conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_one_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    user_two_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_one_id, user_two_id)
);

-- Enable RLS on conversations
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Allow users to view conversations they're part of
DROP POLICY IF EXISTS "Users can view their conversations" ON conversations;
CREATE POLICY "Users can view their conversations" ON conversations FOR SELECT USING (
    auth.uid() = user_one_id OR auth.uid() = user_two_id
);

-- Allow users to create conversations
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
CREATE POLICY "Users can create conversations" ON conversations FOR INSERT WITH CHECK (
    auth.uid() = user_one_id OR auth.uid() = user_two_id
);

-- =============================================================================
-- 6. CREATE MEDIA BUCKET IF IT DOESN'T EXIST
-- =============================================================================

-- Insert media bucket (will be ignored if it already exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 7. GRANT NECESSARY PERMISSIONS
-- =============================================================================

-- Grant execute permission on the function to authenticated users
GRANT EXECUTE ON FUNCTION get_or_create_conversation(UUID, UUID) TO authenticated;

-- =============================================================================
-- 8. DEBUG HELPER FUNCTIONS
-- =============================================================================

-- Function to check current user authentication
CREATE OR REPLACE FUNCTION debug_current_user()
RETURNS TABLE(user_id UUID, user_role TEXT) AS $$
BEGIN
    RETURN QUERY SELECT auth.uid(), auth.role();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION debug_current_user() TO authenticated;

-- =============================================================================
-- 9. TEST QUERIES (OPTIONAL - FOR VERIFICATION)
-- =============================================================================

-- You can run these queries to test if everything is working:
-- SELECT debug_current_user();
-- SELECT * FROM stories WHERE user_id = auth.uid();
-- SELECT * FROM messages WHERE sender_id = auth.uid() OR receiver_id = auth.uid();

SELECT 'RLS Photo Fix Applied Successfully!' AS status; 