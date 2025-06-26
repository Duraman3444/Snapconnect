-- ===================================
-- SEASONAL COLLEGE FEATURES DATABASE SETUP
-- ===================================
-- This file sets up all tables for seasonal college features
-- including move-in coordination, spring break planning, finals support, 
-- graduation celebrations, and college sports

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===================================
-- 1. MOVE-IN DAY COORDINATION
-- ===================================

-- Table to track move-in schedules and coordination
CREATE TABLE IF NOT EXISTS move_in_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    move_in_date DATE NOT NULL,
    time_slot_start TIME NOT NULL,
    time_slot_end TIME NOT NULL,
    dorm_building TEXT NOT NULL,
    room_number TEXT,
    parking_pass_requested BOOLEAN DEFAULT FALSE,
    parking_assigned TEXT,
    helpers_needed INTEGER DEFAULT 0,
    status TEXT DEFAULT 'scheduled', -- 'scheduled', 'in_progress', 'completed'
    university TEXT,
    semester TEXT, -- 'fall_2024', 'spring_2025', etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, semester)
);

-- Table for move-in helper connections
CREATE TABLE IF NOT EXISTS move_in_helpers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requester_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    helper_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    move_in_date DATE NOT NULL,
    status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'declined', 'completed'
    message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    responded_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(requester_id, helper_id, move_in_date)
);

-- Table for move-in checklist items
CREATE TABLE IF NOT EXISTS move_in_checklists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    item_text TEXT NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    priority INTEGER DEFAULT 3, -- 1=high, 2=medium, 3=low
    category TEXT DEFAULT 'general', -- 'packing', 'paperwork', 'coordination', 'general'
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===================================
-- 2. SPRING BREAK PLANNING
-- ===================================

-- Table for spring break trip groups
CREATE TABLE IF NOT EXISTS spring_break_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organizer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    destination TEXT NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    max_participants INTEGER DEFAULT 10,
    current_participants INTEGER DEFAULT 1,
    estimated_cost_min DECIMAL(10,2),
    estimated_cost_max DECIMAL(10,2),
    accommodation_type TEXT, -- 'hotel', 'airbnb', 'hostel', 'camping'
    transportation_type TEXT, -- 'flight', 'car', 'bus', 'train'
    status TEXT DEFAULT 'planning', -- 'planning', 'booking', 'confirmed', 'completed', 'cancelled'
    is_public BOOLEAN DEFAULT TRUE,
    university TEXT,
    year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for spring break group participants
CREATE TABLE IF NOT EXISTS spring_break_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID REFERENCES spring_break_groups(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    status TEXT DEFAULT 'interested', -- 'interested', 'confirmed', 'paid', 'cancelled'
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    payment_status TEXT DEFAULT 'pending', -- 'pending', 'partial', 'paid'
    amount_paid DECIMAL(10,2) DEFAULT 0,
    UNIQUE(group_id, user_id)
);

-- Table for spring break destination popularity
CREATE TABLE IF NOT EXISTS spring_break_destinations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    destination_name TEXT NOT NULL,
    country TEXT,
    state_province TEXT,
    popularity_score INTEGER DEFAULT 0,
    average_cost DECIMAL(10,2),
    best_months TEXT[], -- Array of month names
    description TEXT,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(destination_name, country)
);

-- ===================================
-- 3. FINALS WEEK SUPPORT
-- ===================================

-- Table for study groups during finals
CREATE TABLE IF NOT EXISTS finals_study_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organizer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    subject TEXT NOT NULL,
    course_code TEXT,
    title TEXT NOT NULL,
    description TEXT,
    study_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    location TEXT NOT NULL,
    max_participants INTEGER DEFAULT 8,
    current_participants INTEGER DEFAULT 1,
    materials_needed TEXT,
    study_method TEXT, -- 'review', 'practice_problems', 'flashcards', 'discussion', 'mock_exam'
    difficulty_level TEXT DEFAULT 'intermediate', -- 'beginner', 'intermediate', 'advanced'
    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_pattern TEXT, -- 'daily', 'weekly', etc.
    university TEXT,
    semester TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for study group participants
CREATE TABLE IF NOT EXISTS finals_study_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID REFERENCES finals_study_groups(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    status TEXT DEFAULT 'joined', -- 'joined', 'confirmed', 'attended', 'no_show'
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    contribution_notes TEXT,
    UNIQUE(group_id, user_id)
);

-- Table for stress level tracking during finals
CREATE TABLE IF NOT EXISTS stress_level_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    stress_level INTEGER CHECK (stress_level >= 1 AND stress_level <= 4), -- 1=calm, 2=okay, 3=stressed, 4=panic
    date_recorded DATE DEFAULT CURRENT_DATE,
    time_recorded TIME DEFAULT CURRENT_TIME,
    notes TEXT,
    coping_strategies TEXT[],
    semester TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, date_recorded, time_recorded)
);

-- Table for stress relief activities
CREATE TABLE IF NOT EXISTS stress_relief_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    activity_name TEXT NOT NULL,
    description TEXT,
    activity_type TEXT NOT NULL, -- 'physical', 'mental', 'social', 'creative'
    duration_minutes INTEGER,
    location TEXT,
    activity_date DATE,
    activity_time TIME,
    max_participants INTEGER,
    current_participants INTEGER DEFAULT 0,
    organizer TEXT,
    cost DECIMAL(8,2) DEFAULT 0,
    is_recurring BOOLEAN DEFAULT FALSE,
    university TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===================================
-- 4. GRADUATION CELEBRATIONS
-- ===================================

-- Table for graduation information
CREATE TABLE IF NOT EXISTS graduation_info (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    graduation_year INTEGER NOT NULL,
    graduation_semester TEXT NOT NULL, -- 'spring', 'summer', 'fall', 'winter'
    degree_type TEXT NOT NULL, -- 'bachelor', 'master', 'doctoral', 'certificate'
    major TEXT NOT NULL,
    minor TEXT,
    gpa DECIMAL(3,2),
    honors TEXT, -- 'summa_cum_laude', 'magna_cum_laude', 'cum_laude'
    ceremony_date DATE,
    ceremony_time TIME,
    ceremony_location TEXT,
    guest_tickets_allocated INTEGER DEFAULT 2,
    status TEXT DEFAULT 'upcoming', -- 'upcoming', 'completed'
    university TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, graduation_year, graduation_semester)
);

-- Table for senior-only events
CREATE TABLE IF NOT EXISTS senior_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_name TEXT NOT NULL,
    description TEXT,
    event_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME,
    location TEXT NOT NULL,
    event_type TEXT, -- 'social', 'academic', 'celebration', 'networking', 'service'
    max_attendees INTEGER,
    current_attendees INTEGER DEFAULT 0,
    cost DECIMAL(8,2) DEFAULT 0,
    dress_code TEXT,
    rsvp_required BOOLEAN DEFAULT TRUE,
    rsvp_deadline DATE,
    organizer TEXT,
    university TEXT,
    graduation_year INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for senior event RSVPs
CREATE TABLE IF NOT EXISTS senior_event_rsvps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES senior_events(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    status TEXT DEFAULT 'attending', -- 'attending', 'not_attending', 'maybe'
    plus_one BOOLEAN DEFAULT FALSE,
    plus_one_name TEXT,
    dietary_restrictions TEXT,
    special_requests TEXT,
    rsvp_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(event_id, user_id)
);

-- Table for graduation memory sharing
CREATE TABLE IF NOT EXISTS graduation_memories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    memory_text TEXT NOT NULL,
    memory_type TEXT DEFAULT 'story', -- 'story', 'photo', 'video', 'achievement'
    year_occurred INTEGER,
    semester_occurred TEXT,
    is_public BOOLEAN DEFAULT TRUE,
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    graduation_year INTEGER,
    university TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===================================
-- 5. COLLEGE SPORTS HUB
-- ===================================

-- Table for sports teams
CREATE TABLE IF NOT EXISTS sports_teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sport_name TEXT NOT NULL,
    team_name TEXT NOT NULL,
    division TEXT, -- 'Division I', 'Division II', etc.
    conference TEXT,
    season_type TEXT, -- 'fall', 'winter', 'spring', 'year_round'
    head_coach TEXT,
    home_venue TEXT,
    team_colors TEXT[],
    mascot TEXT,
    university TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(sport_name, university)
);

-- Table for sports events/games
CREATE TABLE IF NOT EXISTS sports_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID REFERENCES sports_teams(id) ON DELETE CASCADE NOT NULL,
    opponent_team TEXT NOT NULL,
    event_date DATE NOT NULL,
    event_time TIME NOT NULL,
    is_home_game BOOLEAN NOT NULL,
    venue TEXT NOT NULL,
    event_type TEXT DEFAULT 'regular', -- 'regular', 'playoff', 'championship', 'tournament'
    ticket_price DECIMAL(8,2),
    ticket_availability TEXT DEFAULT 'available', -- 'available', 'limited', 'sold_out'
    weather_dependent BOOLEAN DEFAULT FALSE,
    live_stream_url TEXT,
    status TEXT DEFAULT 'scheduled', -- 'scheduled', 'in_progress', 'completed', 'cancelled', 'postponed'
    home_score INTEGER,
    away_score INTEGER,
    attendance INTEGER,
    university TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for tailgate parties
CREATE TABLE IF NOT EXISTS tailgate_parties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organizer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    sports_event_id UUID REFERENCES sports_events(id) ON DELETE CASCADE NOT NULL,
    party_name TEXT NOT NULL,
    description TEXT,
    location TEXT NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME,
    max_attendees INTEGER DEFAULT 50,
    current_attendees INTEGER DEFAULT 1,
    bring_items TEXT, -- What attendees should bring
    provided_items TEXT, -- What organizer will provide
    cost_per_person DECIMAL(8,2) DEFAULT 0,
    is_public BOOLEAN DEFAULT TRUE,
    age_restriction INTEGER, -- Minimum age if applicable
    special_requirements TEXT,
    weather_backup_plan TEXT,
    contact_info TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for tailgate party attendees
CREATE TABLE IF NOT EXISTS tailgate_attendees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    party_id UUID REFERENCES tailgate_parties(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    status TEXT DEFAULT 'attending', -- 'attending', 'maybe', 'not_attending'
    bringing_items TEXT,
    plus_ones INTEGER DEFAULT 0,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(party_id, user_id)
);

-- ===================================
-- 6. SEASONAL PREFERENCES & SETTINGS
-- ===================================

-- Table for user seasonal preferences
CREATE TABLE IF NOT EXISTS seasonal_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    move_in_notifications BOOLEAN DEFAULT TRUE,
    spring_break_suggestions BOOLEAN DEFAULT TRUE,
    finals_stress_reminders BOOLEAN DEFAULT TRUE,
    graduation_updates BOOLEAN DEFAULT TRUE,
    sports_notifications BOOLEAN DEFAULT TRUE,
    preferred_sports TEXT[], -- Array of sports they're interested in
    stress_relief_reminders BOOLEAN DEFAULT TRUE,
    study_group_notifications BOOLEAN DEFAULT TRUE,
    tailgate_invitations BOOLEAN DEFAULT TRUE,
    seasonal_event_reminders BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- ===================================
-- 7. INSERT DEFAULT DATA
-- ===================================

-- Insert default stress relief activities
INSERT INTO stress_relief_activities (activity_name, description, activity_type, duration_minutes, cost) VALUES
('Meditation Session', 'Guided meditation for stress relief', 'mental', 30, 0),
('Study Break Yoga', 'Gentle yoga to relieve study tension', 'physical', 45, 0),
('Therapy Dogs Visit', 'Pet therapy session with certified therapy dogs', 'social', 60, 0),
('Free Massage', 'Professional massage therapy for stress relief', 'physical', 20, 0),
('Art Therapy Workshop', 'Creative expression through art', 'creative', 90, 5),
('Walking Group', 'Group walk around campus for fresh air', 'physical', 30, 0),
('Tea and Talk Circle', 'Informal discussion group with herbal tea', 'social', 45, 0),
('Mindfulness Workshop', 'Learn mindfulness techniques for stress management', 'mental', 60, 0)
ON CONFLICT DO NOTHING;

-- Insert popular spring break destinations
INSERT INTO spring_break_destinations (destination_name, country, state_province, average_cost, best_months, description) VALUES
('Miami Beach', 'USA', 'Florida', 1000, ARRAY['March', 'April'], 'Beautiful beaches and vibrant nightlife'),
('Cancun', 'Mexico', 'Quintana Roo', 1250, ARRAY['March', 'April', 'May'], 'Tropical paradise with ancient Mayan ruins nearby'),
('Los Angeles', 'USA', 'California', 750, ARRAY['March', 'April', 'May'], 'Hollywood glamour and Pacific beaches'),
('New York City', 'USA', 'New York', 650, ARRAY['April', 'May'], 'The city that never sleeps - culture and entertainment'),
('Panama City Beach', 'USA', 'Florida', 800, ARRAY['March', 'April'], 'White sand beaches and spring break activities'),
('South Padre Island', 'USA', 'Texas', 700, ARRAY['March', 'April'], 'Texas coast destination with beach activities'),
('Jamaica', 'Jamaica', NULL, 1400, ARRAY['March', 'April', 'May'], 'Caribbean island with reggae culture and beaches'),
('Bahamas', 'Bahamas', NULL, 1300, ARRAY['March', 'April', 'May'], 'Crystal blue waters and island paradise')
ON CONFLICT DO NOTHING;

-- ===================================
-- 8. ROW LEVEL SECURITY POLICIES
-- ===================================

-- Enable RLS on all tables
ALTER TABLE move_in_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE move_in_helpers ENABLE ROW LEVEL SECURITY;
ALTER TABLE move_in_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE spring_break_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE spring_break_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE finals_study_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE finals_study_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE stress_level_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE graduation_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE senior_event_rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE graduation_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE tailgate_parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE tailgate_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE seasonal_preferences ENABLE ROW LEVEL SECURITY;

-- Policies for move-in features
CREATE POLICY "Users can manage their own move-in schedule" ON move_in_schedules FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view move-in helpers involving them" ON move_in_helpers FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = helper_id);
CREATE POLICY "Users can manage their own move-in checklist" ON move_in_checklists FOR ALL USING (auth.uid() = user_id);

-- Policies for spring break features
CREATE POLICY "Users can view public spring break groups" ON spring_break_groups FOR SELECT USING (is_public = true OR auth.uid() = organizer_id);
CREATE POLICY "Users can manage their own spring break groups" ON spring_break_groups FOR ALL USING (auth.uid() = organizer_id);
CREATE POLICY "Users can view their spring break participations" ON spring_break_participants FOR SELECT USING (auth.uid() = user_id);

-- Policies for finals features
CREATE POLICY "Users can view public study groups" ON finals_study_groups FOR SELECT USING (true);
CREATE POLICY "Users can manage their own study groups" ON finals_study_groups FOR ALL USING (auth.uid() = organizer_id);
CREATE POLICY "Users can manage their own stress tracking" ON stress_level_tracking FOR ALL USING (auth.uid() = user_id);

-- Policies for graduation features
CREATE POLICY "Users can manage their own graduation info" ON graduation_info FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view public graduation memories" ON graduation_memories FOR SELECT USING (is_public = true OR auth.uid() = user_id);
CREATE POLICY "Users can manage their own graduation memories" ON graduation_memories FOR ALL USING (auth.uid() = user_id);

-- Policies for sports features
CREATE POLICY "Users can view public tailgate parties" ON tailgate_parties FOR SELECT USING (is_public = true OR auth.uid() = organizer_id);
CREATE POLICY "Users can manage their own tailgate parties" ON tailgate_parties FOR ALL USING (auth.uid() = organizer_id);
CREATE POLICY "Users can view their tailgate attendances" ON tailgate_attendees FOR SELECT USING (auth.uid() = user_id);

-- Policies for preferences
CREATE POLICY "Users can manage their own seasonal preferences" ON seasonal_preferences FOR ALL USING (auth.uid() = user_id);

-- Public read access for reference tables
CREATE POLICY "Anyone can view spring break destinations" ON spring_break_destinations FOR SELECT USING (true);
CREATE POLICY "Anyone can view stress relief activities" ON stress_relief_activities FOR SELECT USING (true);
CREATE POLICY "Anyone can view sports teams" ON sports_teams FOR SELECT USING (true);
CREATE POLICY "Anyone can view sports events" ON sports_events FOR SELECT USING (true);
CREATE POLICY "Anyone can view senior events" ON senior_events FOR SELECT USING (true);

-- ===================================
-- 9. FUNCTIONS AND TRIGGERS
-- ===================================

-- Function to update participant counts
CREATE OR REPLACE FUNCTION update_participant_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_TABLE_NAME = 'spring_break_participants' THEN
        UPDATE spring_break_groups 
        SET current_participants = (
            SELECT COUNT(*) FROM spring_break_participants 
            WHERE group_id = COALESCE(NEW.group_id, OLD.group_id) 
            AND status IN ('confirmed', 'paid')
        )
        WHERE id = COALESCE(NEW.group_id, OLD.group_id);
    ELSIF TG_TABLE_NAME = 'finals_study_participants' THEN
        UPDATE finals_study_groups 
        SET current_participants = (
            SELECT COUNT(*) FROM finals_study_participants 
            WHERE group_id = COALESCE(NEW.group_id, OLD.group_id)
        )
        WHERE id = COALESCE(NEW.group_id, OLD.group_id);
    ELSIF TG_TABLE_NAME = 'tailgate_attendees' THEN
        UPDATE tailgate_parties 
        SET current_attendees = (
            SELECT COUNT(*) + COALESCE(SUM(plus_ones), 0) FROM tailgate_attendees 
            WHERE party_id = COALESCE(NEW.party_id, OLD.party_id) 
            AND status = 'attending'
        )
        WHERE id = COALESCE(NEW.party_id, OLD.party_id);
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Triggers for participant count updates
CREATE TRIGGER update_spring_break_participants_count
    AFTER INSERT OR UPDATE OR DELETE ON spring_break_participants
    FOR EACH ROW
    EXECUTE FUNCTION update_participant_count();

CREATE TRIGGER update_study_participants_count
    AFTER INSERT OR UPDATE OR DELETE ON finals_study_participants
    FOR EACH ROW
    EXECUTE FUNCTION update_participant_count();

CREATE TRIGGER update_tailgate_attendees_count
    AFTER INSERT OR UPDATE OR DELETE ON tailgate_attendees
    FOR EACH ROW
    EXECUTE FUNCTION update_participant_count();

-- ===================================
-- COMPLETED SUCCESSFULLY
-- ===================================
-- Seasonal features database setup completed!
-- Features included:
-- ✓ Move-in day coordination
-- ✓ Spring break planning
-- ✓ Finals week support  
-- ✓ Graduation celebrations
-- ✓ College sports hub
-- ✓ Tailgate party coordination
-- ✓ Stress level tracking
-- ✓ Study group formation
-- ✓ Row Level Security policies
-- ✓ Automated participant counting 