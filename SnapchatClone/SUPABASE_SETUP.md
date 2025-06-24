# SnapConnect - Supabase Setup Guide

## Issues Fixed

### 1. Camera Permissions Error ✅
**Problem**: `useCameraPermissions` hook was not being imported from `expo-camera`
**Solution**: Added the missing import in `CameraScreen.js`

### 2. Supabase RLS Policy Error ✅
**Problem**: Row Level Security was preventing profile creation during user signup
**Solution**: Created proper RLS policies and automatic profile creation trigger

### 3. Firebase References ✅
**Problem**: Camera screen still had Firebase storage and database references
**Solution**: Converted all Firebase calls to Supabase equivalents

## Supabase Database Setup

### Step 1: Run the SQL Script
1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `supabase-setup.sql`
4. Click "Run" to execute the script

### Step 2: Verify Setup
The script will create:
- ✅ `profiles` table with RLS policies
- ✅ `snaps` table with RLS policies  
- ✅ `stories` table with RLS policies
- ✅ `friendships` table with RLS policies
- ✅ `media` storage bucket with policies
- ✅ Automatic profile creation trigger
- ✅ Performance indexes

### Step 3: Test the App
1. Try creating a new account - profiles should be created automatically
2. Test camera functionality - permissions should work correctly
3. Test sending snaps and stories - should upload to Supabase storage

## Database Schema

### Tables Created:

1. **profiles**
   - Stores user profile information
   - Automatically created when user signs up
   - RLS: Users can view all profiles, insert/update their own

2. **snaps**
   - Stores snap messages between users
   - 24-hour expiration
   - RLS: Users can only see snaps they sent or received

3. **stories**
   - Stores user stories
   - 24-hour expiration
   - RLS: Anyone can view, only owner can modify

4. **friendships**
   - Manages friend relationships
   - Status: pending, accepted, blocked
   - RLS: Users can only see their own friendships

5. **media** storage bucket
   - Stores images for snaps and stories
   - Public read access
   - Users can only upload to their own folders

## Key Features Implemented

### Automatic Profile Creation
- Trigger automatically creates a profile when a user signs up
- Uses username from signup metadata or email prefix as fallback
- Fixes the "row violates row-level security policy" error

### Secure File Upload
- Users can only upload files to their own folders
- Files are publicly accessible for viewing
- Proper folder structure: `snaps/{user_id}/` and `stories/{user_id}/`

### Proper RLS Policies
- Users can only access their own data
- Snaps are only visible to sender and recipient
- Stories are publicly viewable but only editable by owner

## Camera Permissions Fix

The camera permissions issue was caused by missing import:
```javascript
// Before (causing error)
import { Camera, CameraType } from 'expo-camera';

// After (fixed)
import { Camera, CameraType, useCameraPermissions } from 'expo-camera';
```

## Migration from Firebase

### What was changed:
- ✅ Storage API: `storage.ref()` → `supabase.storage.from()`
- ✅ Database API: `db.collection().add()` → `supabase.from().insert()`
- ✅ Field names: `camelCase` → `snake_case` (Supabase convention)
- ✅ User ID: `currentUser.uid` → `currentUser.id`
- ✅ Timestamps: `new Date()` → `new Date().toISOString()`

### File upload flow:
1. Convert photo to blob
2. Upload to Supabase storage bucket
3. Get public URL
4. Save metadata to database with public URL

## Troubleshooting

### If profiles still aren't being created:
1. Check that the trigger was created successfully
2. Verify RLS policies are enabled
3. Make sure you're passing username in signup metadata

### If file uploads fail:
1. Verify the `media` bucket exists and is public
2. Check storage policies are correctly applied
3. Ensure user is authenticated before uploading

### If camera permissions still fail:
1. Make sure expo-camera version is compatible (v16.1.8+)
2. Restart the development server after making changes
3. Clear app cache if testing on device

## Next Steps

1. Run the SQL setup script in your Supabase dashboard
2. Test user registration - profiles should be created automatically
3. Test camera functionality and media uploads
4. Consider adding friend request functionality using the friendships table 