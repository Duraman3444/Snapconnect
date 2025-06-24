-- Quick Fix for Foreign Key Relationships
-- Run this if you already have tables created but are getting foreign key errors

-- =============================================================================
-- DROP AND RECREATE TABLES WITH PROPER FOREIGN KEYS
-- =============================================================================

-- Drop tables in correct order (due to dependencies)
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;

-- Recreate conversations table with proper foreign key names
CREATE TABLE conversations (
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

-- Recreate messages table with proper foreign key names  
CREATE TABLE messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID NOT NULL,
    sender_id UUID NOT NULL,
    receiver_id UUID NOT NULL,
    content TEXT NOT NULL,
    message_type TEXT NOT NULL DEFAULT 'text',
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    read_at TIMESTAMP WITH TIME ZONE,
    is_read BOOLEAN DEFAULT FALSE,
    CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES profiles(id) ON DELETE CASCADE,
    CONSTRAINT messages_receiver_id_fkey FOREIGN KEY (receiver_id) REFERENCES profiles(id) ON DELETE CASCADE
);

-- Re-enable RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Recreate RLS policies
CREATE POLICY "Users can view their conversations" ON conversations FOR SELECT USING (
    auth.uid() = participant_one_id OR auth.uid() = participant_two_id
);

CREATE POLICY "Users can create conversations" ON conversations FOR INSERT WITH CHECK (
    auth.uid() = participant_one_id OR auth.uid() = participant_two_id
);

CREATE POLICY "Users can update their conversations" ON conversations FOR UPDATE USING (
    auth.uid() = participant_one_id OR auth.uid() = participant_two_id
);

CREATE POLICY "Users can view messages in their conversations" ON messages FOR SELECT USING (
    auth.uid() = sender_id OR auth.uid() = receiver_id
);

CREATE POLICY "Users can send messages" ON messages FOR INSERT WITH CHECK (
    auth.uid() = sender_id
);

CREATE POLICY "Users can update their received messages (mark as read)" ON messages FOR UPDATE USING (
    auth.uid() = receiver_id
);

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_conversations_participant_one ON conversations(participant_one_id);
CREATE INDEX IF NOT EXISTS idx_conversations_participant_two ON conversations(participant_two_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

-- Recreate triggers
CREATE TRIGGER handle_updated_at_conversations
    BEFORE UPDATE ON conversations
    FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER update_conversation_on_message
    AFTER INSERT ON messages
    FOR EACH ROW EXECUTE PROCEDURE public.update_conversation_timestamp();

-- Re-enable realtime
ALTER publication supabase_realtime ADD TABLE messages;
ALTER publication supabase_realtime ADD TABLE conversations;

SELECT 'Foreign key fix completed successfully!' as status; 