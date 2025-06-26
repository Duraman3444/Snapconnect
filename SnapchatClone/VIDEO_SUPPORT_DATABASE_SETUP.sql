-- ============================================================================
-- VIDEO SUPPORT DATABASE SETUP FOR SNAPCONNECT
-- ============================================================================
-- Run this script in your Supabase SQL Editor to add video support
-- This script adds video columns and updates storage configuration

-- ============================================================================
-- 1. ADD VIDEO COLUMNS TO EXISTING TABLES
-- ============================================================================

-- Add video_url column to messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS video_url TEXT;

-- Add video_url column to stories table  
ALTER TABLE stories ADD COLUMN IF NOT EXISTS video_url TEXT;

-- Add index for video messages for better performance
CREATE INDEX IF NOT EXISTS idx_messages_video_type ON messages(message_type) WHERE message_type = 'video';

-- Add index for video stories for better performance
CREATE INDEX IF NOT EXISTS idx_stories_video_type ON stories(type) WHERE type = 'video_story';

-- ============================================================================
-- 2. UPDATE STORAGE BUCKET CONFIGURATION
-- ============================================================================

-- Update media bucket to allow video types and increase size limit
UPDATE storage.buckets 
SET 
    public = true,
    file_size_limit = 104857600, -- 100MB for video files
    allowed_mime_types = ARRAY[
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
        'video/mp4', 'video/quicktime', 'video/avi', 'video/mov', 'video/webm'
    ]
WHERE id = 'media';

-- If media bucket doesn't exist, create it
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'media', 
    'media', 
    true, 
    104857600, -- 100MB
    ARRAY[
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
        'video/mp4', 'video/quicktime', 'video/avi', 'video/mov', 'video/webm'
    ]
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 104857600,
    allowed_mime_types = ARRAY[
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
        'video/mp4', 'video/quicktime', 'video/avi', 'video/mov', 'video/webm'
    ];

-- ============================================================================
-- 3. UPDATE STORAGE POLICIES FOR VIDEO SUPPORT
-- ============================================================================

-- Drop existing policies to recreate them with video support
DROP POLICY IF EXISTS "Public read access for media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload to media" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own media" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own media" ON storage.objects;

-- Create comprehensive storage policies for images and videos
CREATE POLICY "Public read access for media" ON storage.objects
    FOR SELECT USING (bucket_id = 'media');

CREATE POLICY "Authenticated users can upload media" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'media' 
        AND auth.role() = 'authenticated'
        AND (
            -- Allow image uploads
            (storage.foldername(name))[1] IN ('messages', 'stories') 
            OR 
            -- Allow video uploads
            (storage.foldername(name))[1] IN ('messages', 'stories')
        )
    );

CREATE POLICY "Users can update own media" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'media' 
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[2] = auth.uid()::text
    );

CREATE POLICY "Users can delete own media" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'media' 
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[2] = auth.uid()::text
    );

-- ============================================================================
-- 4. UPDATE EXISTING FUNCTIONS TO HANDLE VIDEO MESSAGES
-- ============================================================================

-- Drop existing function first to avoid return type conflicts
DROP FUNCTION IF EXISTS get_active_messages(uuid, uuid);

-- Create the get_active_messages function to include video messages
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
    is_ephemeral boolean,
    viewed_at timestamp with time zone,
    expires_at timestamp with time zone,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
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
        m.is_ephemeral,
        m.viewed_at,
        m.expires_at,
        m.created_at,
        m.updated_at
    FROM messages m
    WHERE m.conversation_id = conversation_uuid
      AND (
          -- Show all non-ephemeral messages
          NOT m.is_ephemeral
          OR 
          -- Show ephemeral messages that haven't expired
          (m.is_ephemeral AND (m.expires_at IS NULL OR m.expires_at > NOW()))
      )
      AND (
          -- User is sender or receiver
          m.sender_id = user_id OR m.receiver_id = user_id
      )
    ORDER BY m.created_at ASC;
END;
$$;

-- ============================================================================
-- 5. CREATE MEDIA CLEANUP FUNCTION FOR VIDEOS
-- ============================================================================

-- Drop existing cleanup function if it exists to avoid conflicts
DROP FUNCTION IF EXISTS cleanup_old_media();

-- Enhanced cleanup function that handles both images and videos
CREATE OR REPLACE FUNCTION cleanup_old_media()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_messages INTEGER := 0;
    deleted_stories INTEGER := 0;
    total_deleted INTEGER := 0;
    result_text TEXT;
BEGIN
    -- Delete expired ephemeral messages (images and videos)
    DELETE FROM messages 
    WHERE is_ephemeral = true 
      AND expires_at IS NOT NULL 
      AND expires_at < NOW();
    
    GET DIAGNOSTICS deleted_messages = ROW_COUNT;
    
    -- Delete expired stories (images and videos)  
    DELETE FROM stories 
    WHERE expires_at IS NOT NULL 
      AND expires_at < NOW();
    
    GET DIAGNOSTICS deleted_stories = ROW_COUNT;
    
    -- Calculate total
    total_deleted := deleted_messages + deleted_stories;
    
    -- Delete orphaned media files would need to be done via storage API
    -- This function only handles database cleanup
    
    result_text := 'Cleaned up ' || total_deleted || ' expired media records (' || deleted_messages || ' messages, ' || deleted_stories || ' stories)';
    
    RETURN result_text;
END;
$$;

-- ============================================================================
-- 6. CREATE FUNCTION TO GET MEDIA STATISTICS
-- ============================================================================

-- Drop existing function if it exists to avoid conflicts
DROP FUNCTION IF EXISTS get_media_stats();

-- Function to get media usage statistics
CREATE OR REPLACE FUNCTION get_media_stats()
RETURNS TABLE (
    total_messages INTEGER,
    image_messages INTEGER,
    video_messages INTEGER,
    total_stories INTEGER,
    image_stories INTEGER,
    video_stories INTEGER,
    ephemeral_messages INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*)::INTEGER FROM messages) as total_messages,
        (SELECT COUNT(*)::INTEGER FROM messages WHERE message_type = 'image') as image_messages,
        (SELECT COUNT(*)::INTEGER FROM messages WHERE message_type = 'video') as video_messages,
        (SELECT COUNT(*)::INTEGER FROM stories) as total_stories,
        (SELECT COUNT(*)::INTEGER FROM stories WHERE type = 'story') as image_stories,
        (SELECT COUNT(*)::INTEGER FROM stories WHERE type = 'video_story') as video_stories,
        (SELECT COUNT(*)::INTEGER FROM messages WHERE is_ephemeral = true) as ephemeral_messages;
END;
$$;

-- ============================================================================
-- 7. UPDATE RLS POLICIES FOR VIDEO MESSAGES
-- ============================================================================

-- The existing RLS policies should already cover video messages since they're
-- based on conversation_id and user relationships, but let's verify they exist

-- Ensure messages RLS policies exist
DO $$
BEGIN
    -- Check if messages RLS policies exist, if not create them
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'messages' 
        AND policyname = 'Users can view messages in their conversations'
    ) THEN
        CREATE POLICY "Users can view messages in their conversations" ON messages 
            FOR SELECT USING (
                sender_id = auth.uid() 
                OR receiver_id = auth.uid()
                OR conversation_id IN (
                    SELECT gp.conversation_id 
                    FROM group_participants gp 
                    WHERE gp.user_id = auth.uid()
                )
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'messages' 
        AND policyname = 'Users can send messages'
    ) THEN
        CREATE POLICY "Users can send messages" ON messages 
            FOR INSERT WITH CHECK (
                sender_id = auth.uid()
                AND (
                    -- 1-on-1 message
                    receiver_id IS NOT NULL
                    OR 
                    -- Group message
                    conversation_id IN (
                        SELECT gp.conversation_id 
                        FROM group_participants gp 
                        WHERE gp.user_id = auth.uid()
                    )
                )
            );
    END IF;
END $$;

-- ============================================================================
-- 8. CREATE HELPFUL VIEWS FOR MEDIA MANAGEMENT
-- ============================================================================

-- View for all media content (images and videos)
CREATE OR REPLACE VIEW media_content AS
SELECT 
    'message' as source_type,
    id,
    sender_id as user_id,
    message_type as media_type,
    COALESCE(image_url, video_url) as media_url,
    content as description,
    is_ephemeral,
    expires_at,
    created_at
FROM messages 
WHERE message_type IN ('image', 'video')
UNION ALL
SELECT 
    'story' as source_type,
    id,
    user_id,
    type as media_type,
    COALESCE(image_url, video_url) as media_url,
    username as description,
    false as is_ephemeral,
    expires_at,
    created_at
FROM stories
WHERE type IN ('story', 'video_story');

-- ============================================================================
-- 9. SET UP AUTOMATIC CLEANUP JOB (OPTIONAL)
-- ============================================================================

-- Drop existing function if it exists to avoid conflicts
DROP FUNCTION IF EXISTS schedule_media_cleanup();

-- Create a function that can be called by a cron job to clean up expired media
CREATE OR REPLACE FUNCTION schedule_media_cleanup()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Clean up expired ephemeral messages and stories
    PERFORM cleanup_old_media();
    
    -- Log the cleanup
    INSERT INTO public.system_logs (action, details, created_at)
    VALUES ('media_cleanup', 'Automated media cleanup executed', NOW())
    ON CONFLICT DO NOTHING;
END;
$$;

-- Create system_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS system_logs (
    id SERIAL PRIMARY KEY,
    action TEXT NOT NULL,
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 10. VERIFY SETUP
-- ============================================================================

-- Drop existing function if it exists to avoid conflicts
DROP FUNCTION IF EXISTS verify_video_support();

-- Function to verify video support setup
CREATE OR REPLACE FUNCTION verify_video_support()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result_text TEXT := '';
    messages_has_video BOOLEAN;
    stories_has_video BOOLEAN;
    bucket_supports_video BOOLEAN;
BEGIN
    -- Check if video columns exist
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' AND column_name = 'video_url'
    ) INTO messages_has_video;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'stories' AND column_name = 'video_url'
    ) INTO stories_has_video;
    
    -- Check if bucket supports video
    SELECT EXISTS (
        SELECT 1 FROM storage.buckets 
        WHERE id = 'media' 
        AND 'video/mp4' = ANY(allowed_mime_types)
    ) INTO bucket_supports_video;
    
    -- Build result
    result_text := 'Video Support Verification:' || E'\n';
    result_text := result_text || '- Messages table has video_url: ' || messages_has_video || E'\n';
    result_text := result_text || '- Stories table has video_url: ' || stories_has_video || E'\n';
    result_text := result_text || '- Storage bucket supports video: ' || bucket_supports_video || E'\n';
    
    IF messages_has_video AND stories_has_video AND bucket_supports_video THEN
        result_text := result_text || E'\n✅ Video support setup is complete!';
    ELSE
        result_text := result_text || E'\n❌ Video support setup is incomplete!';
    END IF;
    
    RETURN result_text;
END;
$$;

-- ============================================================================
-- FINAL NOTES
-- ============================================================================

-- Run this to verify everything is set up correctly:
-- SELECT verify_video_support();

-- Run this to get media statistics:
-- SELECT * FROM get_media_stats();

-- Run this to clean up expired media:
-- SELECT cleanup_old_media();

-- Enable RLS on tables if not already enabled
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_participants ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT SELECT ON media_content TO authenticated;
GRANT EXECUTE ON FUNCTION get_media_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_media() TO service_role;
GRANT EXECUTE ON FUNCTION verify_video_support() TO authenticated;

-- Success message
SELECT 'Video support database setup completed successfully! 🎥' as result; 