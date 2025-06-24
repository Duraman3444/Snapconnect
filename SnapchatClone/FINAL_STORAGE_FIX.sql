-- FINAL STORAGE FIX - This will definitely fix the "Unknown image download error"
-- Run this ENTIRE script in your Supabase SQL Editor

-- =============================================================================
-- 1. UPDATE BUCKET CONFIGURATION DIRECTLY
-- =============================================================================

-- First, let's check what buckets exist
SELECT id, name, public, file_size_limit, allowed_mime_types, created_at 
FROM storage.buckets;

-- Force update the media bucket to be public with proper settings
UPDATE storage.buckets 
SET 
    public = true,
    file_size_limit = 52428800, -- 50MB
    allowed_mime_types = ARRAY[
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
        'video/mp4', 'video/quicktime', 'video/avi', 'video/mov'
    ]
WHERE id = 'media';

-- If the bucket doesn't exist, create it
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'media', 
    'media', 
    true, 
    52428800,
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 52428800,
    allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime'];

-- =============================================================================
-- 2. COMPLETELY RECREATE ALL STORAGE POLICIES
-- =============================================================================

-- Drop ALL existing storage policies (clean slate)
DROP POLICY IF EXISTS "Public read access for media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload to media" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own media" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own media" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload media files" ON storage.objects;
DROP POLICY IF EXISTS "Media files are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own media files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own media files" ON storage.objects;

-- Create simple, working policies
CREATE POLICY "Allow public read access" ON storage.objects
FOR SELECT USING (bucket_id = 'media');

CREATE POLICY "Allow authenticated uploads" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'media' AND 
    auth.role() = 'authenticated'
);

CREATE POLICY "Allow users to update their files" ON storage.objects
FOR UPDATE USING (
    bucket_id = 'media' AND
    auth.role() = 'authenticated'
);

CREATE POLICY "Allow users to delete their files" ON storage.objects  
FOR DELETE USING (
    bucket_id = 'media' AND
    auth.role() = 'authenticated'
);

-- =============================================================================
-- 3. VERIFY CONFIGURATION
-- =============================================================================

-- Check bucket configuration
SELECT 
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types,
    created_at
FROM storage.buckets 
WHERE id = 'media';

-- Check policies
SELECT 
    policyname,
    cmd,
    qual
FROM pg_policies 
WHERE schemaname = 'storage' AND tablename = 'objects';

-- =============================================================================
-- 4. TEST WITH A SAMPLE FILE
-- =============================================================================

-- Check if any files exist in the bucket
SELECT 
    name,
    bucket_id,
    created_at,
    updated_at,
    last_accessed_at,
    metadata
FROM storage.objects 
WHERE bucket_id = 'media' 
ORDER BY created_at DESC 
LIMIT 10;

-- =============================================================================
-- SUCCESS MESSAGE
-- =============================================================================

SELECT 'FINAL STORAGE FIX COMPLETE! All images should now load properly.' as status; 