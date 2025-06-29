import ragService from './ragService';
import userProfileService from './userProfileService';
import AsyncStorage from '@react-native-async-storage/async-storage';

class SmartNotificationService {
  constructor() {
    this.notificationQueue = [];
    this.userActiveHours = new Map();
    this.lastNotificationTime = new Map();
    this.notificationPreferences = new Map();
  }

  // Generate contextual notification content
  async generateContextualNotification(userId, notificationType, context = {}) {
    try {
      const userProfile = await userProfileService.getUserProfile(userId);
      const currentTime = new Date();
      const timeOfDay = this.getTimeOfDay(currentTime);
      const dayOfWeek = currentTime.toLocaleDateString('en-US', { weekday: 'long' });

      const prompt = `Generate a contextual notification for a college student:

USER PROFILE:
- Major: ${userProfile.major || 'Student'}
- Interests: ${userProfile.interests?.join(', ') || 'General'}
- Year: ${userProfile.year || 'Undergrad'}
- Campus: ${userProfile.campus || 'Campus'}

NOTIFICATION CONTEXT:
- Type: ${notificationType}
- Time: ${timeOfDay} on ${dayOfWeek}
- Additional context: ${JSON.stringify(context)}

NOTIFICATION TYPES:
- friend_activity: Friend posted story, sent message, etc.
- campus_event: Upcoming events based on interests
- study_reminder: Academic deadlines, study groups
- social_prompt: Suggestions to connect with friends
- wellness_check: Mental health and wellness reminders
- achievement: Celebrating milestones and progress

Generate a notification that is:
- Relevant to their interests and schedule
- Appropriate for the time of day
- Engaging but not intrusive
- Uses college-appropriate language
- Includes relevant emoji (1-2 max)

Return JSON:
{
  "title": "Notification title (25 chars max)",
  "body": "Notification message (80 chars max)",
  "action": "suggested action user can take",
  "priority": "low/medium/high",
  "category": "social/academic/wellness/events",
  "timing": "immediate/delayed/scheduled"
}`;

      const response = await ragService.callOpenAI(prompt);
      const result = ragService.parseJSONResponse(response);
      
      return {
        title: result.title || this.getFallbackTitle(notificationType),
        body: result.body || this.getFallbackBody(notificationType),
        action: result.action || 'Open App',
        priority: result.priority || 'medium',
        category: result.category || 'general',
        timing: result.timing || 'immediate',
        timestamp: currentTime.toISOString(),
        userId: userId
      };
    } catch (error) {
      console.error('Smart notification generation failed:', error);
      return this.getFallbackNotification(notificationType, userId);
    }
  }

  // Determine optimal notification timing
  async getOptimalNotificationTime(userId, notificationType, urgency = 'medium') {
    try {
      // Get user's active hours from stored data
      const activeHours = await this.getUserActiveHours(userId);
      const lastNotification = this.lastNotificationTime.get(userId);
      const currentTime = new Date();

      // Don't send notifications during likely sleep hours (11 PM - 7 AM)
      const currentHour = currentTime.getHours();
      if (currentHour >= 23 || currentHour < 7) {
        if (urgency !== 'high') {
          // Schedule for next morning
          const nextMorning = new Date(currentTime);
          nextMorning.setDate(nextMorning.getDate() + 1);
          nextMorning.setHours(8, 0, 0, 0);
          return nextMorning;
        }
      }

      // Respect notification frequency limits
      if (lastNotification) {
        const timeSinceLastNotification = currentTime - lastNotification;
        const minInterval = this.getMinNotificationInterval(notificationType);
        
        if (timeSinceLastNotification < minInterval) {
          // Schedule for later
          return new Date(lastNotification.getTime() + minInterval);
        }
      }

      // Check if user is likely to be active now
      const isActiveTime = this.isUserLikelyActive(userId, currentTime, activeHours);
      if (!isActiveTime && urgency !== 'high') {
        // Schedule for next active period
        return this.getNextActiveTime(userId, activeHours);
      }

      return currentTime; // Send now
    } catch (error) {
      console.error('Optimal timing calculation failed:', error);
      return new Date(); // Default to immediate
    }
  }

  // Learn user's active hours from app usage
  async trackUserActivity(userId) {
    try {
      const currentTime = new Date();
      const hour = currentTime.getHours();
      const dayOfWeek = currentTime.getDay();

      // Get existing activity data
      const stored = await AsyncStorage.getItem(`activity_${userId}`) || '{}';
      const activityData = JSON.parse(stored);

      // Initialize if needed
      if (!activityData.hourlyActivity) {
        activityData.hourlyActivity = new Array(24).fill(0);
      }
      if (!activityData.dailyActivity) {
        activityData.dailyActivity = new Array(7).fill(0);
      }

      // Update activity counters
      activityData.hourlyActivity[hour]++;
      activityData.dailyActivity[dayOfWeek]++;
      activityData.lastActive = currentTime.toISOString();
      activityData.totalSessions = (activityData.totalSessions || 0) + 1;

      // Store updated data
      await AsyncStorage.setItem(`activity_${userId}`, JSON.stringify(activityData));
      this.userActiveHours.set(userId, activityData);
    } catch (error) {
      console.error('Activity tracking failed:', error);
    }
  }

  // Generate study reminders based on academic context
  async generateStudyReminder(userId, courseInfo = {}) {
    const context = {
      courseCode: courseInfo.code,
      examDate: courseInfo.nextExam,
      assignment: courseInfo.upcomingAssignment,
      difficulty: courseInfo.difficulty
    };

    return await this.generateContextualNotification(userId, 'study_reminder', context);
  }

  // Generate social connection prompts
  async generateSocialPrompt(userId, friendActivity = {}) {
    const context = {
      friendName: friendActivity.friendName,
      activityType: friendActivity.type,
      timeSinceLastContact: friendActivity.daysSinceContact,
      mutualInterests: friendActivity.commonInterests
    };

    return await this.generateContextualNotification(userId, 'social_prompt', context);
  }

  // Generate wellness check-ins
  async generateWellnessCheckIn(userId, moodData = {}) {
    const context = {
      recentMood: moodData.averageMood,
      stressLevel: moodData.stressIndicators,
      socialActivity: moodData.socialEngagement,
      sleepPattern: moodData.sleepQuality
    };

    return await this.generateContextualNotification(userId, 'wellness_check', context);
  }

  // Helper methods
  getTimeOfDay(date = new Date()) {
    const hour = date.getHours();
    if (hour < 6) return 'early_morning';
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    if (hour < 21) return 'evening';
    return 'night';
  }

  async getUserActiveHours(userId) {
    try {
      const stored = await AsyncStorage.getItem(`activity_${userId}`);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  isUserLikelyActive(userId, currentTime, activityData) {
    if (!activityData?.hourlyActivity) return true; // Default to active if no data

    const currentHour = currentTime.getHours();
    const currentDayOfWeek = currentTime.getDay();
    
    // Check if this hour is typically active
    const hourlyActivity = activityData.hourlyActivity[currentHour] || 0;
    const avgHourlyActivity = activityData.hourlyActivity.reduce((a, b) => a + b, 0) / 24;
    
    // Check if this day is typically active
    const dailyActivity = activityData.dailyActivity[currentDayOfWeek] || 0;
    const avgDailyActivity = activityData.dailyActivity.reduce((a, b) => a + b, 0) / 7;

    return hourlyActivity >= avgHourlyActivity * 0.7 && dailyActivity >= avgDailyActivity * 0.7;
  }

  getNextActiveTime(userId, activityData) {
    const currentTime = new Date();
    const currentHour = currentTime.getHours();
    
    // Find next active hour
    if (activityData?.hourlyActivity) {
      const avgActivity = activityData.hourlyActivity.reduce((a, b) => a + b, 0) / 24;
      
      // Look for next active hour
      for (let i = 1; i <= 24; i++) {
        const checkHour = (currentHour + i) % 24;
        if (activityData.hourlyActivity[checkHour] >= avgActivity * 0.8) {
          const nextActiveTime = new Date(currentTime);
          nextActiveTime.setHours(checkHour, 0, 0, 0);
          if (nextActiveTime <= currentTime) {
            nextActiveTime.setDate(nextActiveTime.getDate() + 1);
          }
          return nextActiveTime;
        }
      }
    }

    // Default: next morning at 9 AM
    const nextMorning = new Date(currentTime);
    nextMorning.setHours(9, 0, 0, 0);
    if (nextMorning <= currentTime) {
      nextMorning.setDate(nextMorning.getDate() + 1);
    }
    return nextMorning;
  }

  getMinNotificationInterval(notificationType) {
    const intervals = {
      'friend_activity': 30 * 60 * 1000, // 30 minutes
      'campus_event': 2 * 60 * 60 * 1000, // 2 hours
      'study_reminder': 60 * 60 * 1000, // 1 hour
      'social_prompt': 4 * 60 * 60 * 1000, // 4 hours
      'wellness_check': 24 * 60 * 60 * 1000, // 24 hours
      'achievement': 60 * 60 * 1000 // 1 hour
    };
    return intervals[notificationType] || 60 * 60 * 1000; // Default 1 hour
  }

  getFallbackNotification(notificationType, userId) {
    const fallbacks = {
      'friend_activity': {
        title: '👋 Friend Activity',
        body: 'Someone you know is active on SnapConnect!',
        action: 'Check Friends',
        priority: 'medium'
      },
      'campus_event': {
        title: '🎉 Campus Events',
        body: 'New events happening on campus this week!',
        action: 'Browse Events',
        priority: 'low'
      },
      'study_reminder': {
        title: '📚 Study Time',
        body: 'Don\'t forget about your upcoming assignments!',
        action: 'View Calendar',
        priority: 'high'
      },
      'social_prompt': {
        title: '💬 Stay Connected',
        body: 'Reach out to a friend you haven\'t talked to!',
        action: 'Message Friends',
        priority: 'low'
      },
      'wellness_check': {
        title: '🤗 Check In',
        body: 'How are you feeling today?',
        action: 'Share Mood',
        priority: 'medium'
      }
    };

    return fallbacks[notificationType] || fallbacks['friend_activity'];
  }

  getFallbackTitle(notificationType) {
    const titles = {
      'friend_activity': '👋 Friend Update',
      'campus_event': '🎉 Campus Event',
      'study_reminder': '📚 Study Time',
      'social_prompt': '💬 Connect',
      'wellness_check': '🤗 Check In',
      'achievement': '🎊 Great Job!'
    };
    return titles[notificationType] || '📱 SnapConnect';
  }

  getFallbackBody(notificationType) {
    const bodies = {
      'friend_activity': 'Check out what your friends are up to!',
      'campus_event': 'New events happening on campus!',
      'study_reminder': 'Time to hit the books!',
      'social_prompt': 'Reach out to a friend today!',
      'wellness_check': 'How are you doing today?',
      'achievement': 'You\'re doing great!'
    };
    return bodies[notificationType] || 'New activity on SnapConnect!';
  }

  // Clean up resources
  cleanup() {
    this.userActiveHours.clear();
    this.lastNotificationTime.clear();
    this.notificationPreferences.clear();
    this.notificationQueue = [];
  }
}

export default new SmartNotificationService(); 