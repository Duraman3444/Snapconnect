-- ===================================
-- GAMIFICATION FEATURES DATABASE SETUP
-- ===================================
-- This file sets up all tables and policies for gamification features
-- including study streaks, campus explorer badges, GPA challenges, and event rewards

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===================================
-- 1. STUDY STREAKS TABLES
-- ===================================

-- Table to track user study streaks
CREATE TABLE IF NOT EXISTS study_streaks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_study_date DATE,
    total_study_days INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table to track daily study check-ins
CREATE TABLE IF NOT EXISTS study_checkins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    study_date DATE NOT NULL,
    duration_minutes INTEGER,
    subject TEXT,
    notes TEXT,
    points_earned INTEGER DEFAULT 10,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, study_date)
);

-- ===================================
-- 2. CAMPUS EXPLORER BADGES
-- ===================================

-- Table for badge definitions
CREATE TABLE IF NOT EXISTS badge_definitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    icon TEXT NOT NULL,
    category TEXT NOT NULL, -- 'exploration', 'academic', 'social', 'activity'
    requirement_type TEXT NOT NULL, -- 'location_visit', 'event_attendance', 'streak', 'count'
    requirement_value INTEGER NOT NULL,
    points_reward INTEGER DEFAULT 100,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table to track user badge progress and achievements
CREATE TABLE IF NOT EXISTS user_badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    badge_id UUID REFERENCES badge_definitions(id) ON DELETE CASCADE NOT NULL,
    current_progress INTEGER DEFAULT 0,
    earned BOOLEAN DEFAULT FALSE,
    earned_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, badge_id)
);

-- Table to track campus location visits
CREATE TABLE IF NOT EXISTS location_visits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    location_name TEXT NOT NULL,
    location_type TEXT NOT NULL, -- 'library', 'dining', 'gym', 'academic', 'recreation'
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    visit_count INTEGER DEFAULT 1,
    first_visit_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_visit_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, location_name)
);

-- ===================================
-- 3. GPA CHALLENGES
-- ===================================

-- Table for challenge definitions
CREATE TABLE IF NOT EXISTS challenge_definitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    challenge_type TEXT NOT NULL, -- 'gpa', 'streak', 'exploration', 'social'
    target_value DECIMAL(3,2), -- For GPA challenges
    target_count INTEGER, -- For count-based challenges
    points_reward INTEGER NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    max_participants INTEGER,
    university TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table to track user challenge participation
CREATE TABLE IF NOT EXISTS user_challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    challenge_id UUID REFERENCES challenge_definitions(id) ON DELETE CASCADE NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    current_progress DECIMAL(5,2) DEFAULT 0,
    starting_value DECIMAL(3,2), -- Starting GPA for GPA challenges
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE,
    points_earned INTEGER DEFAULT 0,
    UNIQUE(user_id, challenge_id)
);

-- ===================================
-- 4. EVENT ATTENDANCE REWARDS
-- ===================================

-- Table to track event attendance and rewards
CREATE TABLE IF NOT EXISTS event_attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    event_id UUID, -- References campus_events table if it exists
    event_name TEXT NOT NULL,
    event_type TEXT NOT NULL, -- 'academic', 'social', 'career', 'sports'
    event_date DATE NOT NULL,
    points_earned INTEGER DEFAULT 50,
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===================================
-- 5. POINTS AND REWARDS SYSTEM
-- ===================================

-- Table to track user points
CREATE TABLE IF NOT EXISTS user_points (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    total_points INTEGER DEFAULT 0,
    available_points INTEGER DEFAULT 0, -- Points not yet spent
    lifetime_points INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Table for point transactions
CREATE TABLE IF NOT EXISTS point_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    points_change INTEGER NOT NULL, -- Positive for earning, negative for spending
    transaction_type TEXT NOT NULL, -- 'study_checkin', 'badge_earned', 'challenge_completed', 'event_attendance', 'reward_purchase'
    description TEXT NOT NULL,
    reference_id UUID, -- Reference to the source record (badge_id, challenge_id, etc.)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for reward shop items
CREATE TABLE IF NOT EXISTS reward_shop_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    cost_points INTEGER NOT NULL,
    category TEXT NOT NULL, -- 'food', 'services', 'privileges', 'merchandise'
    icon TEXT,
    available_quantity INTEGER, -- NULL for unlimited
    university TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table to track reward purchases
CREATE TABLE IF NOT EXISTS reward_purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    item_id UUID REFERENCES reward_shop_items(id) ON DELETE CASCADE NOT NULL,
    points_spent INTEGER NOT NULL,
    purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    redeemed BOOLEAN DEFAULT FALSE,
    redeemed_at TIMESTAMP WITH TIME ZONE,
    redemption_code TEXT
);

-- ===================================
-- 6. LEADERBOARDS
-- ===================================

-- View for study streak leaderboard
CREATE OR REPLACE VIEW study_streak_leaderboard AS
SELECT 
    u.id as user_id,
    p.username,
    s.current_streak,
    s.longest_streak,
    s.total_study_days,
    up.total_points,
    ROW_NUMBER() OVER (ORDER BY s.current_streak DESC, s.longest_streak DESC) as rank
FROM study_streaks s
JOIN auth.users u ON s.user_id = u.id
JOIN profiles p ON u.id = p.id
JOIN user_points up ON u.id = up.user_id
WHERE s.current_streak > 0
ORDER BY s.current_streak DESC, s.longest_streak DESC;

-- View for points leaderboard
CREATE OR REPLACE VIEW points_leaderboard AS
SELECT 
    u.id as user_id,
    p.username,
    up.total_points,
    up.lifetime_points,
    ss.current_streak,
    ROW_NUMBER() OVER (ORDER BY up.total_points DESC) as rank
FROM user_points up
JOIN auth.users u ON up.user_id = u.id
JOIN profiles p ON u.id = p.id
LEFT JOIN study_streaks ss ON u.id = ss.user_id
ORDER BY up.total_points DESC;

-- ===================================
-- 7. INSERT DEFAULT DATA
-- ===================================

-- Insert default badge definitions
INSERT INTO badge_definitions (name, description, icon, category, requirement_type, requirement_value, points_reward) VALUES
('Library Explorer', 'Visited all campus libraries', '📚', 'exploration', 'location_visit', 5, 200),
('Dining Discoverer', 'Tried all dining halls on campus', '🍕', 'exploration', 'location_visit', 8, 150),
('Gym Enthusiast', 'Visited the gym 10 times', '💪', 'activity', 'location_visit', 10, 100),
('Event Attendee', 'Attended 5 campus events', '🎉', 'social', 'event_attendance', 5, 150),
('Study Warrior', 'Maintained a 30-day study streak', '⚔️', 'academic', 'streak', 30, 300),
('Social Butterfly', 'Made 20 new connections', '🦋', 'social', 'count', 20, 200),
('Academic Achiever', 'Maintained GPA above 3.5', '🎓', 'academic', 'gpa', 35, 250),
('Campus Navigator', 'Visited 20 different campus locations', '🗺️', 'exploration', 'location_visit', 20, 300)
ON CONFLICT DO NOTHING;

-- Insert default reward shop items
INSERT INTO reward_shop_items (name, description, cost_points, category, icon) VALUES
('Free Coffee', 'Get a free coffee from any campus café', 100, 'food', '☕'),
('Library Private Room', '2-hour private study room reservation', 200, 'services', '📚'),
('Parking Pass', 'One-day premium parking pass', 300, 'privileges', '🚗'),
('Dining Hall Credit', '$10 credit for any dining hall', 250, 'food', '🍕'),
('Campus Gym Pass', 'Free day pass to premium gym facilities', 150, 'services', '🏋️'),
('Print Credits', '50 free pages of printing', 75, 'services', '🖨️'),
('Late Library Return', 'Waive one late fee for library books', 50, 'privileges', '📖'),
('Campus Tour Guide', 'Personal campus tour for family/friends', 400, 'services', '🎯')
ON CONFLICT DO NOTHING;

-- Insert sample challenges
INSERT INTO challenge_definitions (title, description, challenge_type, target_count, points_reward, start_date, end_date) VALUES
('Study Streak Master', 'Maintain a 21-day study streak', 'streak', 21, 300, CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days'),
('Campus Explorer Challenge', 'Visit 15 different campus locations', 'exploration', 15, 200, CURRENT_DATE, CURRENT_DATE + INTERVAL '60 days'),
('Event Enthusiast', 'Attend 8 campus events this month', 'social', 8, 250, CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days')
ON CONFLICT DO NOTHING;

-- ===================================
-- 8. ROW LEVEL SECURITY POLICIES
-- ===================================

-- Enable RLS on all tables
ALTER TABLE study_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_purchases ENABLE ROW LEVEL SECURITY;

-- Policies for study_streaks
CREATE POLICY "Users can view their own study streaks" ON study_streaks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own study streaks" ON study_streaks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own study streaks" ON study_streaks FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policies for study_checkins
CREATE POLICY "Users can view their own study checkins" ON study_checkins FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own study checkins" ON study_checkins FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policies for user_badges
CREATE POLICY "Users can view their own badges" ON user_badges FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own badges" ON user_badges FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own badges" ON user_badges FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policies for location_visits
CREATE POLICY "Users can view their own location visits" ON location_visits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own location visits" ON location_visits FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own location visits" ON location_visits FOR UPDATE USING (auth.uid() = user_id);

-- Policies for user_challenges
CREATE POLICY "Users can view their own challenges" ON user_challenges FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own challenges" ON user_challenges FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own challenges" ON user_challenges FOR UPDATE USING (auth.uid() = user_id);

-- Policies for event_attendance
CREATE POLICY "Users can view their own event attendance" ON event_attendance FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own event attendance" ON event_attendance FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policies for user_points
CREATE POLICY "Users can view their own points" ON user_points FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own points" ON user_points FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own points" ON user_points FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policies for point_transactions
CREATE POLICY "Users can view their own point transactions" ON point_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own point transactions" ON point_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policies for reward_purchases
CREATE POLICY "Users can view their own reward purchases" ON reward_purchases FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own reward purchases" ON reward_purchases FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own reward purchases" ON reward_purchases FOR UPDATE USING (auth.uid() = user_id);

-- Public read access for definition tables
CREATE POLICY "Anyone can view badge definitions" ON badge_definitions FOR SELECT USING (true);
CREATE POLICY "Anyone can view challenge definitions" ON challenge_definitions FOR SELECT USING (true);
CREATE POLICY "Anyone can view reward shop items" ON reward_shop_items FOR SELECT USING (true);

-- ===================================
-- 9. FUNCTIONS AND TRIGGERS
-- ===================================

-- Function to update study streak
CREATE OR REPLACE FUNCTION update_study_streak()
RETURNS TRIGGER AS $$
BEGIN
    -- Update or insert study streak record
    INSERT INTO study_streaks (user_id, current_streak, longest_streak, last_study_date, total_study_days)
    VALUES (NEW.user_id, 1, 1, NEW.study_date, 1)
    ON CONFLICT (user_id) DO UPDATE SET
        current_streak = CASE 
            WHEN study_streaks.last_study_date = NEW.study_date - INTERVAL '1 day' THEN study_streaks.current_streak + 1
            ELSE 1
        END,
        longest_streak = CASE 
            WHEN study_streaks.last_study_date = NEW.study_date - INTERVAL '1 day' THEN 
                GREATEST(study_streaks.longest_streak, study_streaks.current_streak + 1)
            ELSE GREATEST(study_streaks.longest_streak, 1)
        END,
        last_study_date = NEW.study_date,
        total_study_days = study_streaks.total_study_days + 1,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for study streak updates
CREATE TRIGGER update_study_streak_trigger
    AFTER INSERT ON study_checkins
    FOR EACH ROW
    EXECUTE FUNCTION update_study_streak();

-- Function to award points
CREATE OR REPLACE FUNCTION award_points(user_uuid UUID, points INTEGER, trans_type TEXT, description TEXT, ref_id UUID DEFAULT NULL)
RETURNS VOID AS $$
BEGIN
    -- Update user points
    INSERT INTO user_points (user_id, total_points, available_points, lifetime_points)
    VALUES (user_uuid, points, points, points)
    ON CONFLICT (user_id) DO UPDATE SET
        total_points = user_points.total_points + points,
        available_points = user_points.available_points + points,
        lifetime_points = user_points.lifetime_points + points,
        updated_at = NOW();
    
    -- Record transaction
    INSERT INTO point_transactions (user_id, points_change, transaction_type, description, reference_id)
    VALUES (user_uuid, points, trans_type, description, ref_id);
END;
$$ LANGUAGE plpgsql;

-- Function to check and award badges
CREATE OR REPLACE FUNCTION check_badge_progress(user_uuid UUID, badge_type TEXT, progress_value INTEGER DEFAULT 1)
RETURNS VOID AS $$
DECLARE
    badge_record RECORD;
BEGIN
    FOR badge_record IN 
        SELECT bd.*, COALESCE(ub.current_progress, 0) as current_progress, COALESCE(ub.earned, false) as earned
        FROM badge_definitions bd
        LEFT JOIN user_badges ub ON bd.id = ub.badge_id AND ub.user_id = user_uuid
        WHERE bd.requirement_type = badge_type AND NOT COALESCE(ub.earned, false)
    LOOP
        -- Update progress
        INSERT INTO user_badges (user_id, badge_id, current_progress)
        VALUES (user_uuid, badge_record.id, LEAST(badge_record.current_progress + progress_value, badge_record.requirement_value))
        ON CONFLICT (user_id, badge_id) DO UPDATE SET
            current_progress = LEAST(user_badges.current_progress + progress_value, badge_record.requirement_value);
        
        -- Check if badge is earned
        IF badge_record.current_progress + progress_value >= badge_record.requirement_value THEN
            UPDATE user_badges 
            SET earned = true, earned_at = NOW()
            WHERE user_id = user_uuid AND badge_id = badge_record.id;
            
            -- Award points
            PERFORM award_points(user_uuid, badge_record.points_reward, 'badge_earned', 'Earned badge: ' || badge_record.name, badge_record.id);
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ===================================
-- COMPLETED SUCCESSFULLY
-- ===================================
-- Gamification database setup completed!
-- Features included:
-- ✓ Study streaks tracking
-- ✓ Campus explorer badges
-- ✓ GPA challenges system  
-- ✓ Event attendance rewards
-- ✓ Points and rewards shop
-- ✓ Leaderboards
-- ✓ Automated badge checking
-- ✓ Row Level Security policies 