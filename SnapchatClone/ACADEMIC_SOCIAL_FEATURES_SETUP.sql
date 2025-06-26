-- Academic Social Features Database Setup
-- Run this script in your Supabase SQL editor after running ACADEMIC_CAMPUS_SETUP.sql

-- =============================================================================
-- 1. PROFESSOR REVIEWS SYSTEM
-- =============================================================================

-- Professors table
CREATE TABLE IF NOT EXISTS professors (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    department TEXT NOT NULL,
    university TEXT NOT NULL,
    email TEXT,
    office_location TEXT,
    biography TEXT,
    research_interests TEXT[],
    courses_taught TEXT[],
    average_rating DECIMAL(2,1) DEFAULT 0.0,
    total_reviews INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(name, university)
);

-- Professor reviews table
CREATE TABLE IF NOT EXISTS professor_reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    professor_id UUID REFERENCES professors(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    course_code TEXT NOT NULL,
    semester TEXT NOT NULL,
    year INTEGER NOT NULL,
    overall_rating INTEGER NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 5),
    difficulty_rating INTEGER NOT NULL CHECK (difficulty_rating >= 1 AND difficulty_rating <= 5),
    teaching_quality INTEGER NOT NULL CHECK (teaching_quality >= 1 AND teaching_quality <= 5),
    accessibility INTEGER NOT NULL CHECK (accessibility >= 1 AND accessibility <= 5),
    workload_rating INTEGER NOT NULL CHECK (workload_rating >= 1 AND workload_rating <= 5),
    review_text TEXT,
    would_recommend BOOLEAN DEFAULT FALSE,
    attendance_required BOOLEAN,
    extra_credit_offered BOOLEAN,
    tags TEXT[], -- ["engaging", "tough_grader", "helpful", "unclear", etc.]
    is_anonymous BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    helpful_votes INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(professor_id, user_id, course_code, semester, year)
);

-- Course reviews table (extends existing courses table)
CREATE TABLE IF NOT EXISTS course_reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    professor_id UUID REFERENCES professors(id) ON DELETE SET NULL,
    semester TEXT NOT NULL,
    year INTEGER NOT NULL,
    overall_rating INTEGER NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 5),
    difficulty_rating INTEGER NOT NULL CHECK (difficulty_rating >= 1 AND difficulty_rating <= 5),
    usefulness_rating INTEGER NOT NULL CHECK (usefulness_rating >= 1 AND usefulness_rating <= 5),
    workload_hours INTEGER, -- Hours per week
    grade_received TEXT,
    review_text TEXT,
    would_recommend BOOLEAN DEFAULT FALSE,
    tags TEXT[], -- ["interesting", "boring", "practical", "theoretical", etc.]
    is_anonymous BOOLEAN DEFAULT TRUE,
    helpful_votes INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(course_id, user_id, semester, year)
);

-- =============================================================================
-- 2. COURSE HASHTAGS SYSTEM
-- =============================================================================

-- Course hashtags table
CREATE TABLE IF NOT EXISTS course_hashtags (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    hashtag TEXT NOT NULL UNIQUE, -- e.g., "CHEM101", "MATH201"
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Posts table (for content that can be tagged with course hashtags)
CREATE TABLE IF NOT EXISTS posts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    post_type TEXT DEFAULT 'general' CHECK (post_type IN ('general', 'grade_celebration', 'study_tip', 'question', 'resource_share')),
    media_url TEXT,
    media_type TEXT CHECK (media_type IN ('image', 'video', 'document')),
    course_hashtags TEXT[], -- Array of course codes
    visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'friends', 'course_only')),
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    shares_count INTEGER DEFAULT 0,
    is_pinned BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP WITH TIME ZONE, -- For temporary posts
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Post interactions table
CREATE TABLE IF NOT EXISTS post_interactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    interaction_type TEXT NOT NULL CHECK (interaction_type IN ('like', 'comment', 'share', 'bookmark')),
    comment_text TEXT, -- Only for comment interactions
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(post_id, user_id, interaction_type) -- Prevent duplicate likes/bookmarks
);

-- =============================================================================
-- 3. GRADE CELEBRATIONS SYSTEM
-- =============================================================================

-- Grade achievements table
CREATE TABLE IF NOT EXISTS grade_achievements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
    achievement_type TEXT NOT NULL CHECK (achievement_type IN ('exam_grade', 'final_grade', 'project_grade', 'assignment_grade', 'gpa_milestone')),
    grade_value TEXT, -- "A+", "95%", "4.0", etc.
    assignment_name TEXT,
    celebration_message TEXT,
    share_with TEXT DEFAULT 'close_friends' CHECK (share_with IN ('public', 'friends', 'close_friends', 'private')),
    is_major_milestone BOOLEAN DEFAULT FALSE, -- Dean's list, graduation, etc.
    reactions_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Achievement reactions table
CREATE TABLE IF NOT EXISTS achievement_reactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    achievement_id UUID REFERENCES grade_achievements(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    reaction_type TEXT NOT NULL CHECK (reaction_type IN ('congrats', 'fire', 'clap', 'wow', 'heart')),
    message TEXT, -- Optional congratulatory message
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(achievement_id, user_id)
);

-- =============================================================================
-- 4. TUTORING MARKETPLACE SYSTEM
-- =============================================================================

-- Tutor profiles table
CREATE TABLE IF NOT EXISTS tutor_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    bio TEXT,
    subjects TEXT[] NOT NULL, -- Array of subjects they can tutor
    hourly_rate DECIMAL(5,2), -- Price per hour
    availability_schedule JSONB, -- JSON object with weekly schedule
    tutoring_experience TEXT,
    academic_achievements TEXT,
    teaching_methods TEXT,
    preferred_location TEXT CHECK (preferred_location IN ('online', 'in_person', 'both')),
    rating DECIMAL(2,1) DEFAULT 0.0,
    total_reviews INTEGER DEFAULT 0,
    total_sessions INTEGER DEFAULT 0,
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Tutoring requests table
CREATE TABLE IF NOT EXISTS tutoring_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    course_code TEXT,
    topic_description TEXT NOT NULL,
    session_type TEXT DEFAULT 'one_time' CHECK (session_type IN ('one_time', 'recurring', 'exam_prep', 'project_help')),
    preferred_schedule TEXT,
    budget_range TEXT,
    urgency_level TEXT DEFAULT 'medium' CHECK (urgency_level IN ('low', 'medium', 'high', 'urgent')),
    location_preference TEXT DEFAULT 'both' CHECK (location_preference IN ('online', 'in_person', 'both')),
    additional_notes TEXT,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'matched', 'in_progress', 'completed', 'cancelled')),
    matched_tutor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tutoring sessions table
CREATE TABLE IF NOT EXISTS tutoring_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tutor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    request_id UUID REFERENCES tutoring_requests(id) ON DELETE SET NULL,
    subject TEXT NOT NULL,
    session_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    duration_minutes INTEGER NOT NULL,
    session_type TEXT DEFAULT 'tutoring' CHECK (session_type IN ('tutoring', 'study_group', 'exam_prep', 'project_help')),
    location TEXT,
    session_notes TEXT,
    homework_assigned TEXT,
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show')),
    student_rating INTEGER CHECK (student_rating >= 1 AND student_rating <= 5),
    tutor_rating INTEGER CHECK (tutor_rating >= 1 AND tutor_rating <= 5),
    student_feedback TEXT,
    tutor_feedback TEXT,
    amount_paid DECIMAL(6,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tutor reviews table
CREATE TABLE IF NOT EXISTS tutor_reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tutor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id UUID REFERENCES tutoring_sessions(id) ON DELETE CASCADE,
    overall_rating INTEGER NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 5),
    communication_rating INTEGER NOT NULL CHECK (communication_rating >= 1 AND communication_rating <= 5),
    knowledge_rating INTEGER NOT NULL CHECK (knowledge_rating >= 1 AND knowledge_rating <= 5),
    helpfulness_rating INTEGER NOT NULL CHECK (helpfulness_rating >= 1 AND helpfulness_rating <= 5),
    punctuality_rating INTEGER NOT NULL CHECK (punctuality_rating >= 1 AND punctuality_rating <= 5),
    review_text TEXT,
    would_recommend BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tutor_id, student_id, session_id)
);

-- =============================================================================
-- 5. INDEXES FOR PERFORMANCE
-- =============================================================================

-- Professor reviews indexes
CREATE INDEX IF NOT EXISTS idx_professor_reviews_professor_id ON professor_reviews(professor_id);
CREATE INDEX IF NOT EXISTS idx_professor_reviews_user_id ON professor_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_professor_reviews_course ON professor_reviews(course_code);
CREATE INDEX IF NOT EXISTS idx_professor_reviews_rating ON professor_reviews(overall_rating);

-- Course reviews indexes
CREATE INDEX IF NOT EXISTS idx_course_reviews_course_id ON course_reviews(course_id);
CREATE INDEX IF NOT EXISTS idx_course_reviews_user_id ON course_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_course_reviews_rating ON course_reviews(overall_rating);

-- Posts indexes
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_type ON posts(post_type);
CREATE INDEX IF NOT EXISTS idx_posts_hashtags ON posts USING gin(course_hashtags);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);

-- Tutoring indexes
CREATE INDEX IF NOT EXISTS idx_tutor_profiles_subjects ON tutor_profiles USING gin(subjects);
CREATE INDEX IF NOT EXISTS idx_tutor_profiles_rating ON tutor_profiles(rating DESC);
CREATE INDEX IF NOT EXISTS idx_tutoring_requests_subject ON tutoring_requests(subject);
CREATE INDEX IF NOT EXISTS idx_tutoring_requests_status ON tutoring_requests(status);
CREATE INDEX IF NOT EXISTS idx_tutoring_sessions_tutor ON tutoring_sessions(tutor_id);
CREATE INDEX IF NOT EXISTS idx_tutoring_sessions_student ON tutoring_sessions(student_id);

-- Grade achievements indexes
CREATE INDEX IF NOT EXISTS idx_grade_achievements_user_id ON grade_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_grade_achievements_course_id ON grade_achievements(course_id);
CREATE INDEX IF NOT EXISTS idx_grade_achievements_type ON grade_achievements(achievement_type);

-- =============================================================================
-- 6. ROW LEVEL SECURITY POLICIES
-- =============================================================================

-- Professor reviews policies
ALTER TABLE professor_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view professor reviews" ON professor_reviews
    FOR SELECT USING (TRUE);

CREATE POLICY "Users can insert their own professor reviews" ON professor_reviews
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own professor reviews" ON professor_reviews
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own professor reviews" ON professor_reviews
    FOR DELETE USING (auth.uid() = user_id);

-- Course reviews policies
ALTER TABLE course_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view course reviews" ON course_reviews
    FOR SELECT USING (TRUE);

CREATE POLICY "Users can insert their own course reviews" ON course_reviews
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own course reviews" ON course_reviews
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own course reviews" ON course_reviews
    FOR DELETE USING (auth.uid() = user_id);

-- Posts policies
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view public posts" ON posts
    FOR SELECT USING (
        visibility = 'public' OR
        user_id = auth.uid() OR
        (visibility = 'friends' AND user_id IN (
            SELECT friend_id FROM friendships 
            WHERE user_id = auth.uid() AND status = 'accepted'
        ))
    );

CREATE POLICY "Users can insert their own posts" ON posts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own posts" ON posts
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts" ON posts
    FOR DELETE USING (auth.uid() = user_id);

-- Grade achievements policies
ALTER TABLE grade_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view shared grade achievements" ON grade_achievements
    FOR SELECT USING (
        share_with = 'public' OR
        user_id = auth.uid() OR
        (share_with = 'friends' AND user_id IN (
            SELECT friend_id FROM friendships 
            WHERE user_id = auth.uid() AND status = 'accepted'
        )) OR
        (share_with = 'close_friends' AND user_id IN (
            SELECT friend_id FROM friendships 
            WHERE user_id = auth.uid() AND status = 'accepted'
            -- Add close friends logic here if implemented
        ))
    );

CREATE POLICY "Users can insert their own grade achievements" ON grade_achievements
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own grade achievements" ON grade_achievements
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own grade achievements" ON grade_achievements
    FOR DELETE USING (auth.uid() = user_id);

-- Tutoring policies
ALTER TABLE tutor_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active tutor profiles" ON tutor_profiles
    FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Users can insert their own tutor profile" ON tutor_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tutor profile" ON tutor_profiles
    FOR UPDATE USING (auth.uid() = user_id);

ALTER TABLE tutoring_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view relevant tutoring requests" ON tutoring_requests
    FOR SELECT USING (
        status = 'open' OR
        student_id = auth.uid() OR
        matched_tutor_id = auth.uid()
    );

CREATE POLICY "Users can insert their own tutoring requests" ON tutoring_requests
    FOR INSERT WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Users can update their own or matched tutoring requests" ON tutoring_requests
    FOR UPDATE USING (
        auth.uid() = student_id OR
        auth.uid() = matched_tutor_id
    );

-- =============================================================================
-- 7. FUNCTIONS FOR AUTOMATIC HASHTAG DETECTION
-- =============================================================================

-- Function to extract course hashtags from text
CREATE OR REPLACE FUNCTION extract_course_hashtags(text_content TEXT)
RETURNS TEXT[] AS $$
DECLARE
    hashtags TEXT[];
    course_pattern TEXT := '#([A-Z]{2,6}[0-9]{2,4}[A-Z]?)';
BEGIN
    -- Extract course code patterns like #CHEM101, #MATH201, etc.
    SELECT array_agg(DISTINCT upper(matches[1]))
    INTO hashtags
    FROM regexp_matches(upper(text_content), course_pattern, 'g') AS matches;
    
    RETURN COALESCE(hashtags, ARRAY[]::TEXT[]);
END;
$$ LANGUAGE plpgsql;

-- Function to auto-update course hashtags in posts
CREATE OR REPLACE FUNCTION update_post_hashtags()
RETURNS TRIGGER AS $$
BEGIN
    -- Extract hashtags from content
    NEW.course_hashtags := extract_course_hashtags(NEW.content);
    
    -- Update hashtag usage counts
    INSERT INTO course_hashtags (hashtag, usage_count)
    SELECT unnest(NEW.course_hashtags), 1
    ON CONFLICT (hashtag) 
    DO UPDATE SET usage_count = course_hashtags.usage_count + 1;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically detect and update hashtags
CREATE TRIGGER update_post_hashtags_trigger
    BEFORE INSERT OR UPDATE ON posts
    FOR EACH ROW
    EXECUTE FUNCTION update_post_hashtags();

-- =============================================================================
-- 8. SAMPLE DATA
-- =============================================================================

-- Sample professors
INSERT INTO professors (name, department, university, email, research_interests, courses_taught) VALUES
('Dr. Sarah Johnson', 'Chemistry', 'University Sample', 'sarah.johnson@university.edu', ARRAY['Organic Chemistry', 'Biochemistry'], ARRAY['CHEM 101', 'CHEM 201', 'CHEM 301']),
('Prof. Michael Chen', 'Mathematics', 'University Sample', 'michael.chen@university.edu', ARRAY['Calculus', 'Linear Algebra'], ARRAY['MATH 101', 'MATH 201', 'MATH 301']),
('Dr. Emily Rodriguez', 'Computer Science', 'University Sample', 'emily.rodriguez@university.edu', ARRAY['Machine Learning', 'Data Structures'], ARRAY['CS 101', 'CS 201', 'CS 301']),
('Prof. David Wilson', 'English', 'University Sample', 'david.wilson@university.edu', ARRAY['Literature', 'Writing'], ARRAY['ENG 101', 'ENG 201', 'ENG 301']);

-- Sample course hashtags
INSERT INTO course_hashtags (hashtag, usage_count) VALUES
('#CHEM101', 0),
('#MATH201', 0),
('#CS101', 0),
('#ENG102', 0);

-- Sample tutor profiles (you can add these after users are created)
-- INSERT INTO tutor_profiles (user_id, bio, subjects, hourly_rate, preferred_location) VALUES
-- ('{user_id}', 'Math tutor with 3 years experience', ARRAY['Mathematics', 'Calculus', 'Statistics'], 25.00, 'both');

-- =============================================================================
-- 9. UTILITY FUNCTIONS
-- =============================================================================

-- Function to get trending course hashtags
CREATE OR REPLACE FUNCTION get_trending_hashtags(limit_count INTEGER DEFAULT 10)
RETURNS TABLE(hashtag TEXT, usage_count INTEGER) AS $$
BEGIN
    RETURN QUERY
    SELECT ch.hashtag, ch.usage_count
    FROM course_hashtags ch
    ORDER BY ch.usage_count DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Function to match tutors with requests
CREATE OR REPLACE FUNCTION find_matching_tutors(request_id UUID)
RETURNS TABLE(
    tutor_id UUID,
    tutor_name TEXT,
    rating DECIMAL,
    hourly_rate DECIMAL,
    match_score INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tp.user_id,
        p.display_name,
        tp.rating,
        tp.hourly_rate,
        CASE 
            WHEN tr.subject = ANY(tp.subjects) THEN 10
            ELSE 0
        END as match_score
    FROM tutor_profiles tp
    JOIN profiles p ON tp.user_id = p.id
    JOIN tutoring_requests tr ON tr.id = request_id
    WHERE tp.is_active = TRUE
    AND tr.subject = ANY(tp.subjects)
    ORDER BY match_score DESC, tp.rating DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to update professor ratings
CREATE OR REPLACE FUNCTION update_professor_rating(prof_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE professors
    SET 
        average_rating = (
            SELECT ROUND(AVG(overall_rating), 1)
            FROM professor_reviews
            WHERE professor_id = prof_id
        ),
        total_reviews = (
            SELECT COUNT(*)
            FROM professor_reviews
            WHERE professor_id = prof_id
        )
    WHERE id = prof_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update professor ratings when reviews are added/updated
CREATE OR REPLACE FUNCTION trigger_update_professor_rating()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        PERFORM update_professor_rating(NEW.professor_id);
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM update_professor_rating(OLD.professor_id);
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_professor_rating_trigger
    AFTER INSERT OR UPDATE OR DELETE ON professor_reviews
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_professor_rating(); 