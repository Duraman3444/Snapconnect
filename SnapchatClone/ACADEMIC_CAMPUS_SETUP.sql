-- Academic Calendar and Campus Features Database Setup
-- Run this script in your Supabase SQL editor

-- Academic Events Table
CREATE TABLE IF NOT EXISTS academic_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('assignment', 'exam', 'study_session', 'class')),
    course TEXT NOT NULL,
    date DATE NOT NULL,
    time TEXT,
    description TEXT,
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
    completed BOOLEAN DEFAULT FALSE,
    reminder_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Campus Events Table
CREATE TABLE IF NOT EXISTS campus_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    date DATE NOT NULL,
    time TEXT NOT NULL,
    location TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('academic', 'social', 'career', 'sports', 'cultural')),
    description TEXT,
    organizer TEXT NOT NULL,
    university TEXT NOT NULL,
    max_attendees INTEGER,
    current_attendees INTEGER DEFAULT 0,
    tags TEXT[], -- Array of tags for filtering
    image_url TEXT,
    registration_required BOOLEAN DEFAULT FALSE,
    registration_deadline DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Event RSVPs Table
CREATE TABLE IF NOT EXISTS event_rsvps (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID REFERENCES campus_events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'attending' CHECK (status IN ('attending', 'maybe', 'not_attending')),
    rsvp_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(event_id, user_id)
);

-- Dining Halls Table
CREATE TABLE IF NOT EXISTS dining_halls (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    university TEXT NOT NULL,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'limited')),
    crowd_level TEXT DEFAULT 'medium' CHECK (crowd_level IN ('low', 'medium', 'high')),
    hours TEXT NOT NULL,
    location TEXT,
    phone TEXT,
    menu_today TEXT,
    wait_time TEXT,
    rating DECIMAL(2,1) DEFAULT 0.0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Libraries Table
CREATE TABLE IF NOT EXISTS libraries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    university TEXT NOT NULL,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'limited')),
    available_seats INTEGER DEFAULT 0,
    total_seats INTEGER NOT NULL,
    floors INTEGER DEFAULT 1,
    hours TEXT NOT NULL,
    quiet_level TEXT DEFAULT 'moderate' CHECK (quiet_level IN ('silent', 'moderate', 'collaborative')),
    amenities TEXT[], -- Array of amenities
    location TEXT,
    phone TEXT,
    special_collections TEXT[],
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Study Groups Table
CREATE TABLE IF NOT EXISTS study_groups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    course TEXT NOT NULL,
    description TEXT,
    max_members INTEGER DEFAULT 6,
    current_members INTEGER DEFAULT 1,
    meeting_schedule TEXT,
    location TEXT,
    university TEXT NOT NULL,
    tags TEXT[], -- Array of tags
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Study Group Members Table
CREATE TABLE IF NOT EXISTS study_group_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id UUID REFERENCES study_groups(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member' CHECK (role IN ('creator', 'member')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(group_id, user_id)
);

-- Course Information Table
CREATE TABLE IF NOT EXISTS courses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    course_code TEXT NOT NULL,
    course_name TEXT NOT NULL,
    university TEXT NOT NULL,
    professor TEXT,
    semester TEXT,
    year INTEGER,
    credits INTEGER,
    description TEXT,
    difficulty_rating DECIMAL(2,1) DEFAULT 0.0,
    workload_hours INTEGER, -- Average hours per week
    grade_distribution JSONB, -- JSON object with grade percentages
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(course_code, university, semester, year)
);

-- User Course Enrollments Table
CREATE TABLE IF NOT EXISTS user_courses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    enrollment_status TEXT DEFAULT 'enrolled' CHECK (enrollment_status IN ('enrolled', 'completed', 'dropped')),
    grade TEXT,
    semester TEXT NOT NULL,
    year INTEGER NOT NULL,
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, course_id)
);

-- Add university field to users profile (extend existing users table)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS university TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS graduation_year INTEGER;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS major TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS class_year TEXT CHECK (class_year IN ('freshman', 'sophomore', 'junior', 'senior', 'graduate'));

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_academic_events_user_date ON academic_events(user_id, date);
CREATE INDEX IF NOT EXISTS idx_campus_events_university_date ON campus_events(university, date);
CREATE INDEX IF NOT EXISTS idx_dining_halls_university ON dining_halls(university);
CREATE INDEX IF NOT EXISTS idx_libraries_university ON libraries(university);
CREATE INDEX IF NOT EXISTS idx_study_groups_university ON study_groups(university);
CREATE INDEX IF NOT EXISTS idx_study_groups_course ON study_groups(course);
CREATE INDEX IF NOT EXISTS idx_courses_university ON courses(university);
CREATE INDEX IF NOT EXISTS idx_user_courses_user ON user_courses(user_id);

-- Row Level Security (RLS) Policies

-- Academic Events - Users can only see their own events
ALTER TABLE academic_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own academic events" ON academic_events
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own academic events" ON academic_events
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own academic events" ON academic_events
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own academic events" ON academic_events
    FOR DELETE USING (auth.uid() = user_id);

-- Campus Events - Public read, admin write
ALTER TABLE campus_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view campus events" ON campus_events
    FOR SELECT USING (TRUE);

-- Event RSVPs - Users can manage their own RSVPs
ALTER TABLE event_rsvps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own RSVPs" ON event_rsvps
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own RSVPs" ON event_rsvps
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own RSVPs" ON event_rsvps
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own RSVPs" ON event_rsvps
    FOR DELETE USING (auth.uid() = user_id);

-- Dining Halls - Public read
ALTER TABLE dining_halls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view dining halls" ON dining_halls
    FOR SELECT USING (TRUE);

-- Libraries - Public read
ALTER TABLE libraries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view libraries" ON libraries
    FOR SELECT USING (TRUE);

-- Study Groups - Public read, creator write
ALTER TABLE study_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active study groups" ON study_groups
    FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Users can insert study groups" ON study_groups
    FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can update their study groups" ON study_groups
    FOR UPDATE USING (auth.uid() = creator_id);

-- Study Group Members - Members can view, users can join
ALTER TABLE study_group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view study group members" ON study_group_members
    FOR SELECT USING (TRUE);

CREATE POLICY "Users can join study groups" ON study_group_members
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave study groups" ON study_group_members
    FOR DELETE USING (auth.uid() = user_id);

-- Courses - Public read
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view courses" ON courses
    FOR SELECT USING (TRUE);

-- User Courses - Users can manage their own enrollments
ALTER TABLE user_courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own courses" ON user_courses
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can enroll in courses" ON user_courses
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their course info" ON user_courses
    FOR UPDATE USING (auth.uid() = user_id);

-- Insert sample data for development
INSERT INTO campus_events (title, date, time, location, type, description, organizer, university, max_attendees) VALUES
('Welcome Week Career Fair', '2024-01-20', '10:00 AM - 4:00 PM', 'Student Union Ballroom', 'career', 'Meet recruiters from top tech companies and startups', 'Career Services', 'University Sample', 500),
('Chemistry 101 Study Group', '2024-01-21', '7:00 PM - 9:00 PM', 'Science Library Room 203', 'academic', 'Prepare for upcoming midterm exam', 'Chemistry Department', 'University Sample', 20),
('International Food Festival', '2024-01-22', '11:00 AM - 3:00 PM', 'Campus Quad', 'cultural', 'Taste authentic cuisine from around the world', 'International Student Association', 'University Sample', 300),
('Basketball vs State University', '2024-01-25', '7:00 PM - 9:00 PM', 'Campus Arena', 'sports', 'Cheer on our team in this crucial conference game', 'Athletics Department', 'University Sample', 5000);

INSERT INTO dining_halls (name, university, status, crowd_level, hours, location, menu_today, wait_time, rating) VALUES
('Student Union Food Court', 'University Sample', 'open', 'medium', '7:00 AM - 10:00 PM', 'Student Union Building', 'Pizza, Burgers, Salads, Asian Cuisine', '5-10 min', 4.2),
('North Campus Dining Hall', 'University Sample', 'open', 'high', '7:00 AM - 9:00 PM', 'North Campus', 'All-you-can-eat buffet, Grill, Vegetarian Options', '15-20 min', 4.5),
('Library Café', 'University Sample', 'open', 'low', '8:00 AM - 6:00 PM', 'Main Library', 'Coffee, Sandwiches, Pastries', '2-5 min', 4.0);

INSERT INTO libraries (name, university, status, available_seats, total_seats, floors, hours, quiet_level, amenities, location) VALUES
('Main Library', 'University Sample', 'open', 145, 400, 5, '24/7', 'silent', ARRAY['WiFi', 'Power outlets', 'Study rooms', 'Printing', 'Computer lab'], 'Campus Center'),
('Science Library', 'University Sample', 'open', 67, 150, 3, '6:00 AM - 2:00 AM', 'moderate', ARRAY['WiFi', 'Power outlets', 'Group study areas', 'Lab equipment'], 'Science Complex'),
('Law Library', 'University Sample', 'open', 89, 200, 4, '6:00 AM - 12:00 AM', 'silent', ARRAY['WiFi', 'Power outlets', 'Study rooms', 'Legal databases'], 'Law School Building');

INSERT INTO courses (course_code, course_name, university, professor, semester, year, credits, description, difficulty_rating, workload_hours) VALUES
('CHEM 101', 'General Chemistry I', 'University Sample', 'Dr. Smith', 'Fall', 2024, 4, 'Introduction to chemical principles and laboratory techniques', 3.5, 8),
('MATH 201', 'Calculus II', 'University Sample', 'Prof. Johnson', 'Fall', 2024, 4, 'Techniques of integration and series', 4.2, 10),
('ENG 102', 'English Composition', 'University Sample', 'Dr. Williams', 'Fall', 2024, 3, 'Academic writing and critical thinking', 2.8, 6),
('CS 150', 'Introduction to Programming', 'University Sample', 'Prof. Davis', 'Fall', 2024, 3, 'Programming fundamentals using Python', 3.0, 12);

-- Functions and Triggers

-- Function to update dining hall crowd levels based on time
CREATE OR REPLACE FUNCTION update_crowd_levels()
RETURNS void AS $$
BEGIN
    -- Simple logic to simulate crowd levels based on time of day
    UPDATE dining_halls 
    SET crowd_level = CASE 
        WHEN EXTRACT(hour FROM NOW()) BETWEEN 11 AND 13 THEN 'high'
        WHEN EXTRACT(hour FROM NOW()) BETWEEN 17 AND 19 THEN 'high'
        WHEN EXTRACT(hour FROM NOW()) BETWEEN 7 AND 9 THEN 'medium'
        WHEN EXTRACT(hour FROM NOW()) BETWEEN 19 AND 21 THEN 'medium'
        ELSE 'low'
    END,
    last_updated = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to update library seat availability (simulated)
CREATE OR REPLACE FUNCTION update_library_seats()
RETURNS void AS $$
BEGIN
    -- Simulate varying seat availability throughout the day
    UPDATE libraries 
    SET available_seats = GREATEST(
        0, 
        total_seats - FLOOR(
            total_seats * (
                0.3 + 0.4 * SIN(EXTRACT(hour FROM NOW()) * PI() / 12)
            )
        )::integer
    ),
    last_updated = NOW();
END;
$$ LANGUAGE plpgsql;

-- Schedule these functions to run periodically (you can set up cron jobs or use pg_cron)

COMMIT; 