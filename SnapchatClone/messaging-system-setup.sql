-- SnapConnect Messaging System Database Setup
-- Run this SQL script in your Supabase SQL editor to add messaging functionality

-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    participant_one_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    participant_two_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(participant_one_id, participant_two_id),
    CHECK (participant_one_id != participant_two_id)
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    message_type TEXT NOT NULL DEFAULT 'text', -- 'text', 'image', 'snap'
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    read_at TIMESTAMP WITH TIME ZONE,
    is_read BOOLEAN DEFAULT FALSE
);

-- Enable Row Level Security
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Conversations RLS Policies
CREATE POLICY "Users can view their conversations" ON conversations FOR SELECT USING (
    auth.uid() = participant_one_id OR auth.uid() = participant_two_id
);

CREATE POLICY "Users can create conversations" ON conversations FOR INSERT WITH CHECK (
    auth.uid() = participant_one_id OR auth.uid() = participant_two_id
);

CREATE POLICY "Users can update their conversations" ON conversations FOR UPDATE USING (
    auth.uid() = participant_one_id OR auth.uid() = participant_two_id
);

-- Messages RLS Policies
CREATE POLICY "Users can view messages in their conversations" ON messages FOR SELECT USING (
    auth.uid() = sender_id OR auth.uid() = receiver_id
);

CREATE POLICY "Users can send messages" ON messages FOR INSERT WITH CHECK (
    auth.uid() = sender_id
);

CREATE POLICY "Users can update their received messages (mark as read)" ON messages FOR UPDATE USING (
    auth.uid() = receiver_id
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_conversations_participant_one ON conversations(participant_one_id);
CREATE INDEX IF NOT EXISTS idx_conversations_participant_two ON conversations(participant_two_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

-- Create function to update conversation timestamp when new message is sent
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

-- Create trigger to update conversation timestamp
CREATE TRIGGER update_conversation_on_message
    AFTER INSERT ON messages
    FOR EACH ROW EXECUTE PROCEDURE public.update_conversation_timestamp();

-- Create function to find or create conversation between two users
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

-- Create updated_at trigger for conversations
CREATE TRIGGER handle_updated_at_conversations
    BEFORE UPDATE ON conversations
    FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at(); 