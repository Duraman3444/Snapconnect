import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../supabaseConfig';

class UserProfileService {
  constructor() {
    this.profiles = new Map();
    this.activityHistory = new Map();
    this.preferences = new Map();
  }

  // Track user interactions for interest profiling
  async trackUserInteraction(userId, interaction) {
    try {
      const interactionData = {
        user_id: userId,
        type: interaction.type, // 'post_like', 'event_view', 'course_hashtag', etc.
        content: interaction.content,
        metadata: interaction.metadata || {},
        timestamp: new Date().toISOString()
      };

      const { error } = await supabase
        .from('user_interactions')
        .insert([interactionData]);

      if (error) {
        console.error('Error saving interaction:', error);
      }
      
      // Update user interest profile
      await this.updateUserInterests(userId, interaction);
      
    } catch (error) {
      console.error('Error tracking user interaction:', error);
    }
  }

  // Build comprehensive user interest profile
  async buildInterestProfile(userId) {
    try {
      const [interactions, courses, friends, posts] = await Promise.all([
        this.getUserInteractions(userId),
        this.getUserCourses(userId),
        this.getUserFriends(userId),
        this.getUserPosts(userId)
      ]);

      const interests = {
        academicInterests: this.extractAcademicInterests(courses, posts),
        socialInterests: this.extractSocialInterests(interactions, friends),
        activityPatterns: this.analyzeActivityPatterns(interactions),
        contentPreferences: this.analyzeContentPreferences(posts),
        lastUpdated: Date.now()
      };

      // Cache the profile
      await AsyncStorage.setItem(`interest_profile_${userId}`, JSON.stringify(interests));
      
      return interests;
    } catch (error) {
      console.error('Error building interest profile:', error);
      return null;
    }
  }

  // Enhanced user profile with college-specific data
  async getMockUserProfile(userId) {
    return {
      id: userId,
      username: 'college_student_' + userId.slice(-4),
      displayName: 'Alex Thompson',
      email: 'alex.thompson@university.edu',
      
      // Academic Information
      major: 'Computer Science',
      minor: 'Mathematics',
      year: 'Junior',
      gpa: 3.7,
      expectedGraduation: '2025-05',
      university: 'State University',
      
      // Personal Interests
      interests: [
        'Technology', 'Gaming', 'Photography', 'Music', 'Basketball', 
        'Artificial Intelligence', 'Web Development', 'Fitness'
      ],
      
      // Academic Goals
      goals: [
        'Maintain 3.8+ GPA',
        'Complete internship',
        'Join tech club',
        'Build portfolio projects'
      ],
      
      // Study Habits & Preferences
      studyHabits: [
        'Night owl', 'Prefers group study', 'Visual learner', 'Needs quiet environment'
      ],
      learningStyle: 'kinesthetic',
      preferredStudyTime: 'evening',
      
      // Social Preferences
      socialLevel: 'moderately social',
      personality: 'outgoing introvert',
      friendGroupSize: 'medium',
      socialExperience: 'moderate',
      
      // Campus Life
      diningPreferences: {
        cuisines: ['Italian', 'Asian', 'Mexican'],
        budget: 'moderate',
        eatingHabits: 'three meals + snacks',
        dietaryRestrictions: []
      },
      
      // Activity History
      recentActivities: [
        { type: 'study_session', subject: 'Data Structures', date: '2024-01-14' },
        { type: 'campus_event', name: 'Tech Talk', date: '2024-01-13' },
        { type: 'social_media_post', content: 'project demo', date: '2024-01-12' }
      ],
      
      // Skills & Experience
      skills: [
        'Python', 'JavaScript', 'React', 'Node.js', 'Git', 'SQL', 'Problem Solving'
      ],
      experience: [
        'Web Development Internship - Summer 2023',
        'Freelance Website Projects',
        'Computer Science Tutor'
      ],
      
      // Career Aspirations
      careerGoals: {
        industry: 'Technology',
        role: 'Software Engineer',
        timeline: 'Post-graduation',
        companies: ['Google', 'Microsoft', 'Startups']
      },
      
      // Campus Involvement
      campusActivities: [
        'Computer Science Club',
        'Photography Club',
        'Basketball Intramurals'
      ],
      
      // Academic Performance
      courses: [
        'Data Structures & Algorithms',
        'Computer Architecture',
        'Calculus III',
        'Physics II'
      ],
      
      // Social Network Data
      friendNetwork: {
        size: 45,
        closeConnections: 8,
        studyBuddies: 3,
        dormmates: 4
      },
      
      // Preferences for AI Features
      aiPreferences: {
        captionStyle: 'casual',
        contentTypes: ['academic', 'social', 'project'],
        privacyLevel: 'moderate',
        notificationFrequency: 'daily'
      },
      
      // Mental Health & Wellness
      wellnessData: {
        stressLevel: 6,
        sleepSchedule: 'irregular',
        exerciseFrequency: '3x per week',
        mentalHealthSupport: 'peer support'
      }
    };
  }

  extractAcademicInterests(courses, posts) {
    const academic = {
      major: courses[0]?.major || 'Unknown',
      subjects: courses.map(c => c.subject) || [],
      studyHabits: this.inferStudyHabits(posts),
      academicGoals: this.inferAcademicGoals(posts)
    };
    return academic;
  }

  extractSocialInterests(interactions, friends) {
    const social = {
      eventTypes: this.getPreferredEventTypes(interactions),
      socialLevel: this.inferSocialLevel(interactions),
      friendGroups: this.analyzeFriendGroups(friends),
      campusAreas: this.getPreferredCampusAreas(interactions)
    };
    return social;
  }

  analyzeActivityPatterns(interactions) {
    // Analyze when user is most active
    const timePatterns = {};
    interactions.forEach(interaction => {
      const hour = new Date(interaction.timestamp).getHours();
      const timeSlot = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
      timePatterns[timeSlot] = (timePatterns[timeSlot] || 0) + 1;
    });

    return {
      mostActiveTime: Object.keys(timePatterns).reduce((a, b) => 
        timePatterns[a] > timePatterns[b] ? a : b, 'evening'),
      activityLevel: interactions.length > 10 ? 'high' : 'moderate'
    };
  }

  analyzeContentPreferences(posts) {
    const preferences = {
      postFrequency: posts.length > 5 ? 'high' : 'moderate',
      contentTypes: this.extractContentTypes(posts),
      captionStyle: this.analyzeCaptionStyle(posts)
    };
    return preferences;
  }

  // Helper methods for interest extraction
  inferStudyHabits(posts) {
    const studyPosts = posts.filter(p => 
      p.caption?.toLowerCase().includes('study') || 
      p.caption?.toLowerCase().includes('library') ||
      p.caption?.toLowerCase().includes('exam')
    );
    
    const habits = {
      preferredStudyTimes: this.analyzePostTimes(studyPosts),
      studyLocations: this.extractStudyLocations(studyPosts),
      groupVsSolo: studyPosts.length > 0 ? 'active' : 'unknown'
    };
    
    return habits;
  }

  inferAcademicGoals(posts) {
    // Look for goal-related keywords in posts
    const goalKeywords = ['graduation', 'internship', 'job', 'career', 'gpa', 'scholarship'];
    const goals = [];
    
    posts.forEach(post => {
      goalKeywords.forEach(keyword => {
        if (post.caption?.toLowerCase().includes(keyword) && !goals.includes(keyword)) {
          goals.push(keyword);
        }
      });
    });
    
    return goals.length > 0 ? goals : ['academic success'];
  }

  analyzePostTimes(posts) {
    const times = posts.map(p => new Date(p.created_at).getHours());
    const timeSlots = times.map(hour => 
      hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'
    );
    
    const counts = {};
    timeSlots.forEach(slot => {
      counts[slot] = (counts[slot] || 0) + 1;
    });
    
    return Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
  }

  extractStudyLocations(posts) {
    const locations = ['library', 'dorm', 'cafe', 'study room', 'home'];
    const found = [];
    
    posts.forEach(post => {
      locations.forEach(location => {
        if (post.caption?.toLowerCase().includes(location) && !found.includes(location)) {
          found.push(location);
        }
      });
    });
    
    return found.length > 0 ? found : ['library'];
  }

  getPreferredEventTypes(interactions) {
    const eventTypes = ['academic', 'social', 'sports', 'cultural', 'career'];
    const preferences = {};
    
    interactions.forEach(interaction => {
      if (interaction.type === 'event_view') {
        const eventType = interaction.metadata?.eventType;
        if (eventType && eventTypes.includes(eventType)) {
          preferences[eventType] = (preferences[eventType] || 0) + 1;
        }
      }
    });
    
    return Object.keys(preferences).sort((a, b) => preferences[b] - preferences[a]);
  }

  inferSocialLevel(interactions) {
    const socialInteractions = interactions.filter(i => 
      ['friend_add', 'message_send', 'group_join'].includes(i.type)
    ).length;
    
    if (socialInteractions > 20) return 'high';
    if (socialInteractions > 5) return 'moderate';
    return 'low';
  }

  analyzeFriendGroups(friends) {
    // Simple analysis based on friend count
    if (friends.length > 50) return 'large_network';
    if (friends.length > 15) return 'moderate_network';
    return 'small_network';
  }

  getPreferredCampusAreas(interactions) {
    const areas = ['library', 'gym', 'dining', 'quad', 'student center'];
    const preferences = {};
    
    interactions.forEach(interaction => {
      if (interaction.metadata?.location) {
        const location = interaction.metadata.location.toLowerCase();
        areas.forEach(area => {
          if (location.includes(area)) {
            preferences[area] = (preferences[area] || 0) + 1;
          }
        });
      }
    });
    
    return Object.keys(preferences).sort((a, b) => preferences[b] - preferences[a]);
  }

  extractContentTypes(posts) {
    const types = {
      photo: 0,
      video: 0,
      text: 0
    };
    
    posts.forEach(post => {
      if (post.media_url) {
        if (post.media_url.includes('video')) {
          types.video++;
        } else {
          types.photo++;
        }
      } else {
        types.text++;
      }
    });
    
    return Object.keys(types).sort((a, b) => types[b] - types[a]);
  }

  analyzeCaptionStyle(posts) {
    const totalLength = posts.reduce((sum, post) => 
      sum + (post.caption?.length || 0), 0
    );
    const avgLength = totalLength / posts.length;
    
    if (avgLength > 100) return 'detailed';
    if (avgLength > 50) return 'moderate';
    return 'brief';
  }

  // Database helper methods (these would interact with your actual database)
  async getUserInteractions(userId) {
    try {
      const { data, error } = await supabase
        .from('user_interactions')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .limit(100);
      
      return data || [];
    } catch (error) {
      console.error('Error getting user interactions:', error);
      return [];
    }
  }

  async getUserCourses(userId) {
    // Mock data for development
    return [
      { major: 'Computer Science', subject: 'Programming' },
      { major: 'Computer Science', subject: 'Data Structures' }
    ];
  }

  async getUserFriends(userId) {
    try {
      const { data, error } = await supabase
        .from('friendships')
        .select('*')
        .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
        .eq('status', 'accepted');
      
      return data || [];
    } catch (error) {
      console.error('Error getting user friends:', error);
      return [];
    }
  }

  async getUserPosts(userId) {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);
      
      return data || [];
    } catch (error) {
      console.error('Error getting user posts:', error);
      return [];
    }
  }

  async updateUserInterests(userId, interaction) {
    try {
      // Update cached interests based on new interaction
      const cached = await AsyncStorage.getItem(`interest_profile_${userId}`);
      if (cached) {
        const profile = JSON.parse(cached);
        // Update profile based on interaction type
        // This is a simplified version - you could make this more sophisticated
        if (interaction.type === 'course_hashtag') {
          if (!profile.academicInterests.subjects.includes(interaction.content)) {
            profile.academicInterests.subjects.push(interaction.content);
          }
        }
        await AsyncStorage.setItem(`interest_profile_${userId}`, JSON.stringify(profile));
      }
    } catch (error) {
      console.error('Error updating user interests:', error);
    }
  }

  // Track user activity for better personalization
  async trackActivity(userId, activity) {
    try {
      let history = this.activityHistory.get(userId) || [];
      history.push({
        ...activity,
        timestamp: new Date().toISOString(),
        id: this.generateId()
      });
      
      // Keep only last 100 activities
      if (history.length > 100) {
        history = history.slice(-100);
      }
      
      this.activityHistory.set(userId, history);
      await AsyncStorage.setItem(`activity_${userId}`, JSON.stringify(history));
      
      return true;
    } catch (error) {
      console.error('Error tracking activity:', error);
      return false;
    }
  }

  // Get user activity history
  async getActivityHistory(userId, limit = 50) {
    try {
      let history = this.activityHistory.get(userId);
      if (!history) {
        const stored = await AsyncStorage.getItem(`activity_${userId}`);
        history = stored ? JSON.parse(stored) : [];
        this.activityHistory.set(userId, history);
      }
      
      return history.slice(-limit).reverse(); // Most recent first
    } catch (error) {
      console.error('Error getting activity history:', error);
      return [];
    }
  }

  // Update user preferences
  async updatePreferences(userId, preferences) {
    try {
      const existing = this.preferences.get(userId) || {};
      const updated = { ...existing, ...preferences };
      
      this.preferences.set(userId, updated);
      await AsyncStorage.setItem(`prefs_${userId}`, JSON.stringify(updated));
      
      return updated;
    } catch (error) {
      console.error('Error updating preferences:', error);
      return null;
    }
  }

  // Get user preferences
  async getPreferences(userId) {
    try {
      let prefs = this.preferences.get(userId);
      if (!prefs) {
        const stored = await AsyncStorage.getItem(`prefs_${userId}`);
        prefs = stored ? JSON.parse(stored) : {};
        this.preferences.set(userId, prefs);
      }
      
      return prefs;
    } catch (error) {
      console.error('Error getting preferences:', error);
      return {};
    }
  }

  // Generate academic insights for AI features
  async generateAcademicInsights(userId) {
    try {
      const profile = await this.getMockUserProfile(userId);
      const history = await this.getActivityHistory(userId);
      
      // Analyze study patterns
      const studySessions = history.filter(a => a.type === 'study_session');
      const socialEvents = history.filter(a => a.type === 'social_event');
      const academicPosts = history.filter(a => a.type === 'academic_post');
      
      return {
        studyPatterns: {
          frequency: studySessions.length,
          preferredSubjects: this.getTopSubjects(studySessions),
          studyTime: this.getPreferredStudyTime(studySessions),
          sessionLength: this.getAverageSessionLength(studySessions)
        },
        socialEngagement: {
          eventAttendance: socialEvents.length,
          networkGrowth: this.calculateNetworkGrowth(history),
          contentCreation: academicPosts.length
        },
        recommendations: {
          studyImprovement: this.generateStudyRecommendations(profile, studySessions),
          socialBalance: this.generateSocialRecommendations(profile, socialEvents),
          careerPrep: this.generateCareerRecommendations(profile)
        }
      };
    } catch (error) {
      console.error('Error generating academic insights:', error);
      return null;
    }
  }

  // Helper methods for analytics
  getTopSubjects(studySessions) {
    const subjectCount = {};
    studySessions.forEach(session => {
      const subject = session.subject || 'Unknown';
      subjectCount[subject] = (subjectCount[subject] || 0) + 1;
    });
    
    return Object.entries(subjectCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([subject]) => subject);
  }

  getPreferredStudyTime(studySessions) {
    const timeSlots = {
      morning: 0,
      afternoon: 0,
      evening: 0,
      night: 0
    };
    
    studySessions.forEach(session => {
      const hour = new Date(session.timestamp).getHours();
      if (hour < 12) timeSlots.morning++;
      else if (hour < 17) timeSlots.afternoon++;
      else if (hour < 21) timeSlots.evening++;
      else timeSlots.night++;
    });
    
    return Object.entries(timeSlots)
      .sort((a, b) => b[1] - a[1])[0][0];
  }

  getAverageSessionLength(studySessions) {
    if (studySessions.length === 0) return 0;
    
    const totalMinutes = studySessions.reduce((sum, session) => {
      return sum + (session.duration || 60); // Default 60 minutes
    }, 0);
    
    return Math.round(totalMinutes / studySessions.length);
  }

  calculateNetworkGrowth(history) {
    const friendEvents = history.filter(a => 
      a.type === 'friend_added' || a.type === 'social_connection'
    );
    
    return {
      newConnections: friendEvents.length,
      growthRate: friendEvents.length > 0 ? 'growing' : 'stable'
    };
  }

  generateStudyRecommendations(profile, studySessions) {
    const recommendations = [];
    
    if (studySessions.length < 3) {
      recommendations.push('Consider establishing a regular study schedule');
    }
    
    if (profile.gpa < 3.5) {
      recommendations.push('Focus on time management and study techniques');
    }
    
    recommendations.push('Join study groups for collaborative learning');
    
    return recommendations;
  }

  generateSocialRecommendations(profile, socialEvents) {
    const recommendations = [];
    
    if (socialEvents.length < 2) {
      recommendations.push('Try attending more campus events to build connections');
    }
    
    if (profile.campusActivities.length < 2) {
      recommendations.push('Consider joining clubs related to your interests');
    }
    
    return recommendations;
  }

  generateCareerRecommendations(profile) {
    const recommendations = [];
    
    if (profile.experience.length < 2) {
      recommendations.push('Seek internship or work experience opportunities');
    }
    
    if (!profile.skills.includes('Leadership')) {
      recommendations.push('Develop leadership skills through projects or organizations');
    }
    
    recommendations.push('Build a professional portfolio showcasing your work');
    
    return recommendations;
  }

  // Context-aware user data for AI features
  async getContextualUserData(userId, featureType) {
    try {
      const profile = await this.getMockUserProfile(userId);
      const history = await this.getActivityHistory(userId, 20);
      const preferences = await this.getPreferences(userId);
      
      // Return relevant data based on feature type
      switch (featureType) {
        case 'tutoring':
          return {
            academic: {
              major: profile.major,
              courses: profile.courses,
              gpa: profile.gpa,
              studyHabits: profile.studyHabits,
              learningStyle: profile.learningStyle
            },
            history: history.filter(h => h.type === 'study_session'),
            preferences: preferences.tutoring || {}
          };
          
        case 'social':
          return {
            social: {
              year: profile.year,
              interests: profile.interests,
              campusActivities: profile.campusActivities,
              socialLevel: profile.socialLevel,
              friendNetwork: profile.friendNetwork
            },
            history: history.filter(h => h.type === 'social_event'),
            preferences: preferences.social || {}
          };
          
        case 'career':
          return {
            career: {
              major: profile.major,
              year: profile.year,
              skills: profile.skills,
              experience: profile.experience,
              careerGoals: profile.careerGoals
            },
            history: history.filter(h => h.type === 'career_event'),
            preferences: preferences.career || {}
          };
          
        case 'wellness':
          return {
            wellness: profile.wellnessData,
            history: history.filter(h => h.type === 'wellness_activity'),
            preferences: preferences.wellness || {}
          };
          
        default:
          return { profile, history, preferences };
      }
    } catch (error) {
      console.error('Error getting contextual user data:', error);
      return null;
    }
  }

  // Generate unique IDs
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Clear user data (for testing/development)
  async clearUserData(userId) {
    try {
      this.profiles.delete(userId);
      this.activityHistory.delete(userId);
      this.preferences.delete(userId);
      
      await AsyncStorage.multiRemove([
        `activity_${userId}`,
        `prefs_${userId}`
      ]);
      
      return true;
    } catch (error) {
      console.error('Error clearing user data:', error);
      return false;
    }
  }

  // Main function used by AIAssistant
  async getUserProfile(userId) {
    try {
      // Check if we have a cached profile
      if (this.profiles.has(userId)) {
        return this.profiles.get(userId);
      }

      // Try to get from storage
      const cachedProfile = await AsyncStorage.getItem(`user_profile_${userId}`);
      if (cachedProfile) {
        const profile = JSON.parse(cachedProfile);
        this.profiles.set(userId, profile);
        return profile;
      }

      // Generate mock profile if none exists
      const mockProfile = await this.getMockUserProfile(userId);
      this.profiles.set(userId, mockProfile);
      
      // Cache it
      await AsyncStorage.setItem(`user_profile_${userId}`, JSON.stringify(mockProfile));
      
      return mockProfile;
    } catch (error) {
      console.error('Error getting user profile:', error);
      return await this.getMockUserProfile(userId);
    }
  }
}

export default new UserProfileService(); 