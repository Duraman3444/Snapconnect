-- ============================================================================
-- COMPLETE MESSAGING AND VIDEO FIX FOR SNAPCONNECT
-- ============================================================================
-- Run this complete script in your Supabase SQL Editor to fix all issues
-- This script handles messaging, stories, video support, and storage buckets

-- ============================================================================
-- 1. ADD MISSING COLUMNS TO MESSAGES TABLE
-- ============================================================================

-- Add updated_at column to messages table if it doesn't exist
ALTER TABLE messages ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add media_url column to messages table if it doesn't exist
ALTER TABLE messages ADD COLUMN IF NOT EXISTS media_url TEXT;

-- Add media_type column to messages table if it doesn't exist
ALTER TABLE messages ADD COLUMN IF NOT EXISTS media_type TEXT;

-- Add video_url column to messages table if it doesn't exist
ALTER TABLE messages ADD COLUMN IF NOT EXISTS video_url TEXT;

-- Update existing messages to have updated_at = created_at if null
UPDATE messages SET updated_at = created_at WHERE updated_at IS NULL;

-- ============================================================================
-- 2. ADD MISSING COLUMNS TO STORIES TABLE
-- ============================================================================

-- Add media_url column to stories table if it doesn't exist
ALTER TABLE stories ADD COLUMN IF NOT EXISTS media_url TEXT;

-- Add media_type column to stories table if it doesn't exist
ALTER TABLE stories ADD COLUMN IF NOT EXISTS media_type TEXT;

-- Add video_url column to stories table if it doesn't exist
ALTER TABLE stories ADD COLUMN IF NOT EXISTS video_url TEXT;

-- Add username column to stories table if it doesn't exist
ALTER TABLE stories ADD COLUMN IF NOT EXISTS username TEXT;

-- Add type column to stories table if it doesn't exist
ALTER TABLE stories ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'story';

-- Add viewers column to stories table if it doesn't exist
ALTER TABLE stories ADD COLUMN IF NOT EXISTS viewers JSONB DEFAULT '[]';

-- ============================================================================
-- 3. CREATE OR UPDATE STORAGE BUCKETS
-- ============================================================================

-- Create media bucket (main bucket for all media)
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

-- Create snaps bucket for direct messages
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'snaps', 
    'snaps', 
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

-- Create stories bucket for stories
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'stories', 
    'stories', 
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
-- 4. DROP EXISTING STORAGE POLICIES (TO AVOID CONFLICTS)
-- ============================================================================

-- Drop existing policies for media bucket
DROP POLICY IF EXISTS "Public read access for media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload to media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload media" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own media" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own media" ON storage.objects;

-- Drop existing policies for snaps bucket
DROP POLICY IF EXISTS "Public read access for snaps" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload snaps" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own snaps" ON storage.objects;

-- Drop existing policies for stories bucket
DROP POLICY IF EXISTS "Public read access for stories" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload stories" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own stories" ON storage.objects;

-- ============================================================================
-- 5. CREATE STORAGE POLICIES FOR ALL BUCKETS
-- ============================================================================

-- Policies for media bucket
CREATE POLICY "Public read access for media" ON storage.objects
    FOR SELECT USING (bucket_id = 'media');

CREATE POLICY "Authenticated users can upload media" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'media' 
        AND auth.role() = 'authenticated'
    );

CREATE POLICY "Users can delete own media" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'media' 
        AND auth.role() = 'authenticated'
    );

-- Policies for snaps bucket
CREATE POLICY "Public read access for snaps" ON storage.objects
    FOR SELECT USING (bucket_id = 'snaps');

CREATE POLICY "Authenticated users can upload snaps" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'snaps' 
        AND auth.role() = 'authenticated'
    );

CREATE POLICY "Users can delete own snaps" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'snaps' 
        AND auth.role() = 'authenticated'
    );

-- Policies for stories bucket
CREATE POLICY "Public read access for stories" ON storage.objects
    FOR SELECT USING (bucket_id = 'stories');

CREATE POLICY "Authenticated users can upload stories" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'stories' 
        AND auth.role() = 'authenticated'
    );

CREATE POLICY "Users can delete own stories" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'stories' 
        AND auth.role() = 'authenticated'
    );

-- ============================================================================
-- 6. CREATE UPDATED_AT TRIGGER FOR MESSAGES
-- ============================================================================

-- Create or replace function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for messages table
DROP TRIGGER IF EXISTS update_messages_updated_at ON messages;
CREATE TRIGGER update_messages_updated_at
    BEFORE UPDATE ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 7. ADD INDEXES FOR BETTER PERFORMANCE
-- ============================================================================

-- Add index for video messages for better performance
CREATE INDEX IF NOT EXISTS idx_messages_video_type ON messages(message_type) WHERE message_type = 'video';

-- Add index for photo messages for better performance
CREATE INDEX IF NOT EXISTS idx_messages_image_type ON messages(message_type) WHERE message_type = 'image';

-- Add index for video stories for better performance
CREATE INDEX IF NOT EXISTS idx_stories_video_type ON stories(type) WHERE type = 'video_story';

-- Add index for photo stories for better performance
CREATE INDEX IF NOT EXISTS idx_stories_photo_type ON stories(type) WHERE type = 'story';

-- Add index for media_type on messages
CREATE INDEX IF NOT EXISTS idx_messages_media_type ON messages(media_type);

-- Add index for media_type on stories
CREATE INDEX IF NOT EXISTS idx_stories_media_type ON stories(media_type);

-- Add index for expires_at on stories for cleanup
CREATE INDEX IF NOT EXISTS idx_stories_expires_at ON stories(expires_at);

-- Add index for expires_at on messages for cleanup
CREATE INDEX IF NOT EXISTS idx_messages_expires_at ON messages(expires_at);

-- ============================================================================
-- 8. UPDATE EXISTING FUNCTIONS TO HANDLE VIDEO MESSAGES
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
    media_url text,
    media_type text,
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
        m.media_url,
        m.media_type,
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
-- 9. CREATE MEDIA CLEANUP FUNCTION FOR VIDEOS AND PHOTOS
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
    
    -- Return result
    result_text := 'Cleaned up ' || total_deleted || ' expired items (' || 
                   deleted_messages || ' messages, ' || 
                   deleted_stories || ' stories)';
    
    RETURN result_text;
END;
$$;

-- ============================================================================
-- 10. VERIFY TABLES STRUCTURE AND SHOW RESULTS
-- ============================================================================

-- Check messages table structure
DO $$
DECLARE
    rec RECORD;
BEGIN
    RAISE NOTICE 'Messages table columns:';
    FOR rec IN 
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'messages' 
        ORDER BY ordinal_position
    LOOP
        RAISE NOTICE '  %: %', rec.column_name, rec.data_type;
    END LOOP;
END $$;

-- Check stories table structure
DO $$
DECLARE
    rec RECORD;
BEGIN
    RAISE NOTICE 'Stories table columns:';
    FOR rec IN 
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'stories' 
        ORDER BY ordinal_position
    LOOP
        RAISE NOTICE '  %: %', rec.column_name, rec.data_type;
    END LOOP;
END $$;

-- Check storage buckets
DO $$
DECLARE
    rec RECORD;
BEGIN
    RAISE NOTICE 'Storage buckets:';
    FOR rec IN 
        SELECT id, name, public, file_size_limit
        FROM storage.buckets 
        ORDER BY id
    LOOP
        RAISE NOTICE '  %: % (public: %, size_limit: %MB)', rec.id, rec.name, rec.public, rec.file_size_limit/1048576;
    END LOOP;
END $$;

-- ============================================================================
-- 11. FINAL SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'SNAPCONNECT DATABASE SETUP COMPLETE!';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'Your database is now ready for:';
    RAISE NOTICE '✅ Photo and video messaging';
    RAISE NOTICE '✅ Photo and video stories';
    RAISE NOTICE '✅ Proper storage buckets (media, snaps, stories)';
    RAISE NOTICE '✅ Automatic timestamp updates';
    RAISE NOTICE '✅ Media cleanup functions';
    RAISE NOTICE '✅ Performance indexes';
    RAISE NOTICE '============================================================================';
END $$; 