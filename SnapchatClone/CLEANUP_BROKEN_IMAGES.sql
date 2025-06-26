-- CLEANUP BROKEN IMAGES - Remove bugged photos from database and storage
-- This script helps clean up failed image loading issues
-- Run this in your Supabase SQL Editor

-- =============================================================================
-- 1. DIAGNOSTIC QUERIES - Check current image state
-- =============================================================================

-- Check all images in storage
SELECT 
    name,
    bucket_id,
    created_at,
    updated_at,
    last_accessed_at,
    metadata->'size' as file_size_bytes,
    metadata->'mimetype' as mime_type
FROM storage.objects 
WHERE bucket_id = 'media' 
ORDER BY created_at DESC;

-- Check messages with image URLs
SELECT 
    id,
    message_type,
    image_url,
    created_at,
    sender_id,
    receiver_id,
    CASE 
        WHEN image_url LIKE '%/storage/v1/object/public/%' THEN 'public_url'
        WHEN image_url LIKE '%/storage/v1/object/sign/%' THEN 'signed_url'
        ELSE 'unknown_format'
    END as url_type
FROM messages 
WHERE message_type = 'image' AND image_url IS NOT NULL
ORDER BY created_at DESC;

-- Check stories with image URLs
SELECT 
    id,
    image_url,
    created_at,
    user_id,
    expires_at,
    CASE 
        WHEN image_url LIKE '%/storage/v1/object/public/%' THEN 'public_url'
        WHEN image_url LIKE '%/storage/v1/object/sign/%' THEN 'signed_url'
        ELSE 'unknown_format'
    END as url_type
FROM stories 
WHERE image_url IS NOT NULL
ORDER BY created_at DESC;

-- =============================================================================
-- 2. CLEANUP EXPIRED CONTENT
-- =============================================================================

-- Delete expired stories (older than 24 hours)
DELETE FROM stories 
WHERE expires_at IS NOT NULL AND expires_at < NOW();

-- Delete expired ephemeral messages
DELETE FROM messages 
WHERE is_ephemeral = TRUE 
  AND expires_at IS NOT NULL 
  AND expires_at < NOW();

-- =============================================================================
-- 3. CLEANUP ORPHANED DATABASE RECORDS
-- =============================================================================

-- Function to extract storage path from URL
CREATE OR REPLACE FUNCTION extract_storage_path(image_url TEXT)
RETURNS TEXT AS $$
BEGIN
    -- Handle public URLs
    IF image_url LIKE '%/storage/v1/object/public/media/%' THEN
        RETURN regexp_replace(image_url, '^.*/storage/v1/object/public/media/', '');
    END IF;
    
    -- Handle signed URLs  
    IF image_url LIKE '%/storage/v1/object/sign/media/%' THEN
        RETURN split_part(regexp_replace(image_url, '^.*/storage/v1/object/sign/media/', ''), '?', 1);
    END IF;
    
    -- Return null if format not recognized
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Find messages with broken image references (images not in storage)
WITH broken_message_images AS (
    SELECT 
        m.id,
        m.image_url,
        extract_storage_path(m.image_url) as storage_path
    FROM messages m
    WHERE m.message_type = 'image' 
      AND m.image_url IS NOT NULL
      AND NOT EXISTS (
          SELECT 1 FROM storage.objects o 
          WHERE o.bucket_id = 'media' 
            AND o.name = extract_storage_path(m.image_url)
      )
)
SELECT 
    'BROKEN MESSAGE IMAGES FOUND:' as status,
    COUNT(*) as count
FROM broken_message_images;

-- Find stories with broken image references
WITH broken_story_images AS (
    SELECT 
        s.id,
        s.image_url,
        extract_storage_path(s.image_url) as storage_path
    FROM stories s
    WHERE s.image_url IS NOT NULL
      AND NOT EXISTS (
          SELECT 1 FROM storage.objects o 
          WHERE o.bucket_id = 'media' 
            AND o.name = extract_storage_path(s.image_url)
      )
)
SELECT 
    'BROKEN STORY IMAGES FOUND:' as status,
    COUNT(*) as count
FROM broken_story_images;

-- =============================================================================
-- 4. REMOVE BROKEN DATABASE RECORDS
-- =============================================================================

-- Delete messages with broken image references
WITH broken_message_images AS (
    SELECT m.id
    FROM messages m
    WHERE m.message_type = 'image' 
      AND m.image_url IS NOT NULL
      AND NOT EXISTS (
          SELECT 1 FROM storage.objects o 
          WHERE o.bucket_id = 'media' 
            AND o.name = extract_storage_path(m.image_url)
      )
)
DELETE FROM messages 
WHERE id IN (SELECT id FROM broken_message_images);

-- Delete stories with broken image references
WITH broken_story_images AS (
    SELECT s.id
    FROM stories s
    WHERE s.image_url IS NOT NULL
      AND NOT EXISTS (
          SELECT 1 FROM storage.objects o 
          WHERE o.bucket_id = 'media' 
            AND o.name = extract_storage_path(s.image_url)
      )
)
DELETE FROM stories 
WHERE id IN (SELECT id FROM broken_story_images);

-- =============================================================================
-- 5. IDENTIFY ORPHANED STORAGE FILES
-- =============================================================================

-- Find storage files not referenced by any database records
WITH orphaned_files AS (
    SELECT 
        o.name,
        o.created_at,
        o.metadata->'size' as file_size
    FROM storage.objects o
    WHERE o.bucket_id = 'media'
      AND NOT EXISTS (
          SELECT 1 FROM messages m 
          WHERE extract_storage_path(m.image_url) = o.name
      )
      AND NOT EXISTS (
          SELECT 1 FROM stories s 
          WHERE extract_storage_path(s.image_url) = o.name
      )
)
SELECT 
    'ORPHANED FILES FOUND:' as status,
    COUNT(*) as count,
    SUM(CAST(file_size AS BIGINT)) as total_bytes
FROM orphaned_files;

-- =============================================================================
-- 6. MAINTENANCE FUNCTIONS
-- =============================================================================

-- Function to clean up old content automatically
CREATE OR REPLACE FUNCTION cleanup_old_media()
RETURNS TEXT AS $$
DECLARE
    deleted_stories INT;
    deleted_messages INT;
    deleted_broken_messages INT;
    deleted_broken_stories INT;
BEGIN
    -- Delete expired stories
    DELETE FROM stories 
    WHERE expires_at IS NOT NULL AND expires_at < NOW();
    GET DIAGNOSTICS deleted_stories = ROW_COUNT;
    
    -- Delete expired ephemeral messages
    DELETE FROM messages 
    WHERE is_ephemeral = TRUE 
      AND expires_at IS NOT NULL 
      AND expires_at < NOW();
    GET DIAGNOSTICS deleted_messages = ROW_COUNT;
    
    -- Delete messages with broken image references
    WITH broken_message_images AS (
        SELECT m.id
        FROM messages m
        WHERE m.message_type = 'image' 
          AND m.image_url IS NOT NULL
          AND NOT EXISTS (
              SELECT 1 FROM storage.objects o 
              WHERE o.bucket_id = 'media' 
                AND o.name = extract_storage_path(m.image_url)
          )
    )
    DELETE FROM messages 
    WHERE id IN (SELECT id FROM broken_message_images);
    GET DIAGNOSTICS deleted_broken_messages = ROW_COUNT;
    
    -- Delete stories with broken image references
    WITH broken_story_images AS (
        SELECT s.id
        FROM stories s
        WHERE s.image_url IS NOT NULL
          AND NOT EXISTS (
              SELECT 1 FROM storage.objects o 
              WHERE o.bucket_id = 'media' 
                AND o.name = extract_storage_path(s.image_url)
          )
    )
    DELETE FROM stories 
    WHERE id IN (SELECT id FROM broken_story_images);
    GET DIAGNOSTICS deleted_broken_stories = ROW_COUNT;
    
    RETURN format('Cleanup completed: %s expired stories, %s expired messages, %s broken message images, %s broken story images', 
                  deleted_stories, deleted_messages, deleted_broken_messages, deleted_broken_stories);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permission to authenticated users
GRANT EXECUTE ON FUNCTION cleanup_old_media() TO authenticated;
GRANT EXECUTE ON FUNCTION extract_storage_path(TEXT) TO authenticated;

-- =============================================================================
-- 7. FINAL SUMMARY
-- =============================================================================

-- Show final statistics
SELECT 
    'CLEANUP SUMMARY' as section,
    (SELECT COUNT(*) FROM messages WHERE message_type = 'image') as total_image_messages,
    (SELECT COUNT(*) FROM stories WHERE image_url IS NOT NULL) as total_image_stories,
    (SELECT COUNT(*) FROM storage.objects WHERE bucket_id = 'media') as total_storage_files;

-- Success message
SELECT 'Image cleanup completed! Run cleanup_old_media() function regularly for maintenance.' as final_status; 