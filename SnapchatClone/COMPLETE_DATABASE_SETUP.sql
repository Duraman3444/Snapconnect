-- SnapConnect Complete Database Setup
-- This script includes EVERYTHING: profiles, snaps, stories, friendships, AND messaging system
-- Run this entire script in your Supabase SQL editor

-- =============================================================================
-- 1. CREATE CORE TABLES
-- =============================================================================

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL,
    display_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    PRIMARY KEY (id)
);

-- Create snaps table
CREATE TABLE IF NOT EXISTS snaps (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    sender_username TEXT NOT NULL,
    recipient_id TEXT NOT NULL, -- Using TEXT for now, could be UUID later
    recipient_username TEXT NOT NULL,
    image_url TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'snap',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    viewed BOOLEAN DEFAULT FALSE,
    viewed_at TIMESTAMP WITH TIME ZONE
);

-- Create stories table
CREATE TABLE IF NOT EXISTS stories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    username TEXT NOT NULL,
    image_url TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'story',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    viewers JSONB DEFAULT '[]'::jsonb
);

-- Create friendships table
CREATE TABLE IF NOT EXISTS friendships (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    friend_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'blocked'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(user_id, friend_id)
);

-- =============================================================================
-- 2. CREATE MESSAGING TABLES
-- =============================================================================

-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    participant_one_id UUID NOT NULL,
    participant_two_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(participant_one_id, participant_two_id),
    CHECK (participant_one_id != participant_two_id),
    CONSTRAINT conversations_participant_one_id_fkey FOREIGN KEY (participant_one_id) REFERENCES profiles(id) ON DELETE CASCADE,
    CONSTRAINT conversations_participant_two_id_fkey FOREIGN KEY (participant_two_id) REFERENCES profiles(id) ON DELETE CASCADE
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID NOT NULL,
    sender_id UUID NOT NULL,
    receiver_id UUID NOT NULL,
    content TEXT NOT NULL,
    message_type TEXT NOT NULL DEFAULT 'text', -- 'text', 'image', 'snap'
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    read_at TIMESTAMP WITH TIME ZONE,
    is_read BOOLEAN DEFAULT FALSE,
    CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES profiles(id) ON DELETE CASCADE,
    CONSTRAINT messages_receiver_id_fkey FOREIGN KEY (receiver_id) REFERENCES profiles(id) ON DELETE CASCADE
);

-- =============================================================================
-- 3. CREATE STORAGE BUCKET
-- =============================================================================

-- Create storage bucket for media files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('media', 'media', true)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 4. ENABLE ROW LEVEL SECURITY
-- =============================================================================

-- Enable Row Level Security on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE snaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 5. CREATE RLS POLICIES - CORE TABLES
-- =============================================================================

-- Profiles RLS Policies
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
CREATE POLICY "Users can view all profiles" ON profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Snaps RLS Policies
DROP POLICY IF EXISTS "Users can insert their own snaps" ON snaps;
CREATE POLICY "Users can insert their own snaps" ON snaps FOR INSERT WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "Users can view snaps sent to them or by them" ON snaps;
CREATE POLICY "Users can view snaps sent to them or by them" ON snaps FOR SELECT USING (
    auth.uid() = sender_id OR 
    recipient_id = auth.uid()::text OR 
    recipient_id IN (SELECT id::text FROM auth.users WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "Users can update snaps sent to them (mark as viewed)" ON snaps;
CREATE POLICY "Users can update snaps sent to them (mark as viewed)" ON snaps FOR UPDATE USING (
    recipient_id = auth.uid()::text OR 
    recipient_id IN (SELECT id::text FROM auth.users WHERE id = auth.uid())
);

-- Stories RLS Policies
DROP POLICY IF EXISTS "Users can insert their own stories" ON stories;
CREATE POLICY "Users can insert their own stories" ON stories FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view all stories" ON stories;
CREATE POLICY "Users can view all stories" ON stories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update their own stories" ON stories;
CREATE POLICY "Users can update their own stories" ON stories FOR UPDATE USING (auth.uid() = user_id);

-- Friendships RLS Policies
DROP POLICY IF EXISTS "Users can view their friendships" ON friendships;
CREATE POLICY "Users can view their friendships" ON friendships FOR SELECT USING (
    auth.uid() = user_id OR auth.uid() = friend_id
);

DROP POLICY IF EXISTS "Users can create friendships" ON friendships;
CREATE POLICY "Users can create friendships" ON friendships FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their friendships" ON friendships;
CREATE POLICY "Users can update their friendships" ON friendships FOR UPDATE USING (
    auth.uid() = user_id OR auth.uid() = friend_id
);

DROP POLICY IF EXISTS "Users can delete their friendships" ON friendships;
CREATE POLICY "Users can delete their friendships" ON friendships FOR DELETE USING (
    auth.uid() = user_id OR auth.uid() = friend_id
);

-- =============================================================================
-- 6. CREATE RLS POLICIES - MESSAGING TABLES
-- =============================================================================

-- Conversations RLS Policies
DROP POLICY IF EXISTS "Users can view their conversations" ON conversations;
CREATE POLICY "Users can view their conversations" ON conversations FOR SELECT USING (
    auth.uid() = participant_one_id OR auth.uid() = participant_two_id
);

DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
CREATE POLICY "Users can create conversations" ON conversations FOR INSERT WITH CHECK (
    auth.uid() = participant_one_id OR auth.uid() = participant_two_id
);

DROP POLICY IF EXISTS "Users can update their conversations" ON conversations;
CREATE POLICY "Users can update their conversations" ON conversations FOR UPDATE USING (
    auth.uid() = participant_one_id OR auth.uid() = participant_two_id
);

-- Messages RLS Policies
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;
CREATE POLICY "Users can view messages in their conversations" ON messages FOR SELECT USING (
    auth.uid() = sender_id OR auth.uid() = receiver_id
);

DROP POLICY IF EXISTS "Users can send messages" ON messages;
CREATE POLICY "Users can send messages" ON messages FOR INSERT WITH CHECK (
    auth.uid() = sender_id
);

DROP POLICY IF EXISTS "Users can update their received messages (mark as read)" ON messages;
CREATE POLICY "Users can update their received messages (mark as read)" ON messages FOR UPDATE USING (
    auth.uid() = receiver_id
);

-- =============================================================================
-- 7. CREATE STORAGE POLICIES
-- =============================================================================

DROP POLICY IF EXISTS "Users can upload media files" ON storage.objects;
CREATE POLICY "Users can upload media files" ON storage.objects FOR INSERT WITH CHECK (
    bucket_id = 'media' AND 
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Media files are publicly accessible" ON storage.objects;
CREATE POLICY "Media files are publicly accessible" ON storage.objects FOR SELECT USING (
    bucket_id = 'media'
);

DROP POLICY IF EXISTS "Users can update their own media files" ON storage.objects;
CREATE POLICY "Users can update their own media files" ON storage.objects FOR UPDATE USING (
    bucket_id = 'media' AND 
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can delete their own media files" ON storage.objects;
CREATE POLICY "Users can delete their own media files" ON storage.objects FOR DELETE USING (
    bucket_id = 'media' AND 
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- =============================================================================
-- 8. CREATE INDEXES FOR PERFORMANCE
-- =============================================================================

-- Core table indexes
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_snaps_sender_id ON snaps(sender_id);
CREATE INDEX IF NOT EXISTS idx_snaps_recipient_id ON snaps(recipient_id);
CREATE INDEX IF NOT EXISTS idx_snaps_expires_at ON snaps(expires_at);
CREATE INDEX IF NOT EXISTS idx_stories_user_id ON stories(user_id);
CREATE INDEX IF NOT EXISTS idx_stories_expires_at ON stories(expires_at);
CREATE INDEX IF NOT EXISTS idx_friendships_user_id ON friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend_id ON friendships(friend_id);

-- Messaging table indexes
CREATE INDEX IF NOT EXISTS idx_conversations_participant_one ON conversations(participant_one_id);
CREATE INDEX IF NOT EXISTS idx_conversations_participant_two ON conversations(participant_two_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

-- =============================================================================
-- 9. CREATE UTILITY FUNCTIONS
-- =============================================================================

-- Function for automatic profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, email, display_name)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    new.email,
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update conversation timestamp when new message is sent
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

-- Function to find or create conversation between two users
CREATE OR REPLACE FUNCTION public.get_or_create_conversation(user_one UUID, user_two UUID)
RETURNS UUID AS $$
DECLARE
    conversation_id UUID;
    ordered_user_one UUID;
    ordered_user_two UUID;
BEGIN
    -- Ensure consistent ordering (smaller UUID first)
    IF user_one < user_two THEN
        ordered_user_one := user_one;
        ordered_user_two := user_two;
    ELSE
        ordered_user_one := user_two;
        ordered_user_two := user_one;
    END IF;
    
    -- Try to find existing conversation
    SELECT id INTO conversation_id
    FROM conversations
    WHERE participant_one_id = ordered_user_one 
      AND participant_two_id = ordered_user_two;
    
    -- If no conversation exists, create one
    IF conversation_id IS NULL THEN
        INSERT INTO conversations (participant_one_id, participant_two_id)
        VALUES (ordered_user_one, ordered_user_two)
        RETURNING id INTO conversation_id;
    END IF;
    
    RETURN conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 10. CREATE TRIGGERS
-- =============================================================================

-- Create trigger to automatically create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS handle_updated_at_profiles ON profiles;
CREATE TRIGGER handle_updated_at_profiles
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at_friendships ON friendships;
CREATE TRIGGER handle_updated_at_friendships
  BEFORE UPDATE ON friendships
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at_conversations ON conversations;
CREATE TRIGGER handle_updated_at_conversations
    BEFORE UPDATE ON conversations
    FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Create trigger to update conversation timestamp
DROP TRIGGER IF EXISTS update_conversation_on_message ON messages;
CREATE TRIGGER update_conversation_on_message
    AFTER INSERT ON messages
    FOR EACH ROW EXECUTE PROCEDURE public.update_conversation_timestamp();

-- =============================================================================
-- 11. ENABLE REALTIME (Critical for messaging)
-- =============================================================================

-- Enable realtime for messaging tables
ALTER publication supabase_realtime ADD TABLE messages;
ALTER publication supabase_realtime ADD TABLE conversations;

-- Also enable for other tables if needed
ALTER publication supabase_realtime ADD TABLE profiles;
ALTER publication supabase_realtime ADD TABLE snaps;
ALTER publication supabase_realtime ADD TABLE stories;
ALTER publication supabase_realtime ADD TABLE friendships;

-- =============================================================================
-- 12. INSERT TEST DATA (Optional - for development)
-- =============================================================================

-- Uncomment the following section if you want to insert test data

/*
-- Insert test users (these will be created when users sign up through auth)
-- Test profiles will be automatically created by the trigger

-- You can manually insert some test friendships after creating test accounts:
-- INSERT INTO friendships (user_id, friend_id, status) VALUES 
--   ('user-uuid-1', 'user-uuid-2', 'accepted'),
--   ('user-uuid-2', 'user-uuid-3', 'accepted');
*/

-- =============================================================================
-- SETUP COMPLETE!
-- =============================================================================

-- Verify the setup
SELECT 'Setup completed successfully! The following tables have been created:' as status;
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('profiles', 'snaps', 'stories', 'friendships', 'conversations', 'messages')
ORDER BY table_name;

-- Check realtime publications
SELECT 'Realtime publications:' as info;
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
ORDER BY tablename; 