-- ============================================================================
-- MESSAGING SYSTEM FIX FOR SNAPCONNECT
-- ============================================================================
-- Run this script in your Supabase SQL Editor to fix messaging issues

-- ============================================================================
-- 1. ADD MISSING COLUMNS TO MESSAGES TABLE
-- ============================================================================

-- Add updated_at column to messages table if it doesn't exist
ALTER TABLE messages ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add media_url column to messages table if it doesn't exist
ALTER TABLE messages ADD COLUMN IF NOT EXISTS media_url TEXT;

-- Add media_type column to messages table if it doesn't exist
ALTER TABLE messages ADD COLUMN IF NOT EXISTS media_type TEXT;

-- Update existing messages to have updated_at = created_at if null
UPDATE messages SET updated_at = created_at WHERE updated_at IS NULL;

-- ============================================================================
-- 2. ADD MISSING COLUMNS TO STORIES TABLE
-- ============================================================================

-- Add media_url column to stories table if it doesn't exist
ALTER TABLE stories ADD COLUMN IF NOT EXISTS media_url TEXT;

-- Add media_type column to stories table if it doesn't exist
ALTER TABLE stories ADD COLUMN IF NOT EXISTS media_type TEXT;

-- ============================================================================
-- 3. CREATE OR UPDATE STORAGE BUCKETS
-- ============================================================================

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
-- 4. CREATE STORAGE POLICIES FOR NEW BUCKETS
-- ============================================================================

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
-- 5. CREATE UPDATED_AT TRIGGER FOR MESSAGES
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
-- 6. VERIFY TABLES STRUCTURE
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
        RAISE NOTICE '  %: % (public: %, size_limit: %)', rec.id, rec.name, rec.public, rec.file_size_limit;
    END LOOP;
END $$; 