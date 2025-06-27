import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';

class CollegeRAGService {
  constructor() {
    // Try multiple ways to get the API key
    this.openaiApiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY || 
                       process.env.OPENAI_API_KEY ||
                       'sk-proj-df1PHhbycPVpSmzWZXnpgW7Xun2h208PpoF3qcR21CdklAFFGalK6zyBZ5v4Y2N4p_3pdqkaBPT3BlbkF3w8eZXzt+Fpj09Sls79mLUnrwskI0MMQG5DFBROLoPh665oxvb';
    this.userContext = {};
    this.knowledgeBase = {
      campusEvents: [],
      studySpots: [],
      courseInfo: [],
      studentInterests: [],
      userHistory: [],
      friendNetworks: [],
      academicProgress: []
    };
  }

  // 1. Smart Caption Generation for College Students
  async generateSmartCaption(imageContext, userProfile = {}) {
    try {
      const prompt = `
You are an AI assistant helping college students create authentic, engaging social media captions.

Student Profile:
- Major: ${userProfile.major || 'Unknown'}
- Year: ${userProfile.year || 'Freshman'}
- Interests: ${(userProfile.interests || []).join(', ') || 'General'}
- Campus: ${userProfile.campus || 'College'}
- Recent Activities: ${(userProfile.recentActivities || []).join(', ') || 'None'}

Image Context: ${imageContext}

Generate 3 different caption styles:
1. Casual/Funny (with emojis)
2. Motivational/Academic 
3. Social/Friend-focused

Each caption should:
- Be under 150 characters
- Feel authentic to college life
- Include relevant hashtags
- Match the image context
- Reference their major/interests when relevant

Return as JSON: {"casual": "...", "motivational": "...", "social": "..."}`;

      const response = await this.callOpenAI(prompt);
      const result = this.parseJSONResponse(response);
      
      return {
        suggestions: [
          result.casual || "Great moment! 📸",
          result.motivational || "Making memories! ✨", 
          result.social || "Good times with friends! 🎉"
        ],
        context: imageContext,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Error generating smart caption:', error);
      return {
        suggestions: [
          "College life! 📚✨",
          "Making memories! 🎉",
          "Another day, another adventure! 🌟"
        ],
        context: imageContext
      };
    }
  }

  // 2. Campus Event Suggestions with Personalization
  async suggestCampusEvents(userInterests = [], currentTime = new Date(), userHistory = []) {
    try {
      const prompt = `
You are a campus life advisor AI helping students discover relevant events based on their interests and history.

Student Profile:
- Interests: ${userInterests.join(', ')}
- Previous Events Attended: ${userHistory.map(h => h.eventType).join(', ')}
- Current Time: ${currentTime.toLocaleString()}
- Day of Week: ${currentTime.toLocaleDateString('en-US', { weekday: 'long' })}

Based on their interests and attendance history, suggest 3 personalized events:

Categories to consider:
- Academic (study groups, office hours, workshops)
- Social (parties, meetups, clubs)
- Cultural (concerts, art shows, lectures)
- Sports (games, intramurals, fitness)
- Career (job fairs, networking, internships)
- Service (volunteering, community service)

Return as JSON:
{
  "events": [
    {
      "title": "Event Name",
      "type": "academic/social/cultural/sports/career/service",
      "description": "Brief description",
      "time": "suggested time",
      "location": "typical campus location",
      "why": "personalized reason based on their interests",
      "confidence": "high/medium/low"
    }
  ]
}`;

      const response = await this.callOpenAI(prompt);
      const result = this.parseJSONResponse(response);
      
      return {
        recommendedEvents: result.events || [],
        generatedAt: Date.now(),
        personalizedFor: userInterests
      };
    } catch (error) {
      console.error('Error suggesting campus events:', error);
      return { recommendedEvents: [] };
    }
  }

  // 3. AI-Powered Tutoring Marketplace
  async generateTutoringRecommendations(studentProfile, academicNeeds = {}) {
    try {
      const prompt = `
You are an AI tutoring coordinator helping students find the best tutoring matches.

Student Profile:
- Major: ${studentProfile.major}
- Current Courses: ${(studentProfile.courses || []).join(', ')}
- GPA: ${studentProfile.gpa || 'Not provided'}
- Learning Style: ${studentProfile.learningStyle || 'Unknown'}
- Study Struggles: ${(academicNeeds.struggles || []).join(', ')}

Academic Needs:
- Subject: ${academicNeeds.subject}
- Specific Topics: ${(academicNeeds.topics || []).join(', ')}
- Goal: ${academicNeeds.goal || 'General improvement'}
- Timeline: ${academicNeeds.timeline || 'Flexible'}

Generate personalized tutoring recommendations:

Return as JSON:
{
  "tutorCriteria": {
    "preferredBackground": "ideal tutor background",
    "teachingStyle": "recommended teaching approach",
    "sessionStructure": "optimal session format"
  },
  "studyPlan": {
    "weeklyGoals": ["goal1", "goal2", "goal3"],
    "practiceAreas": ["area1", "area2"],
    "milestones": ["milestone1", "milestone2"]
  },
  "questions": ["question1", "question2", "question3"],
  "resources": ["resource1", "resource2"]
}`;

      const response = await this.callOpenAI(prompt);
      const result = this.parseJSONResponse(response);
      
      return {
        recommendations: result,
        generatedFor: studentProfile,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Error generating tutoring recommendations:', error);
      return { recommendations: null };
    }
  }

  // 4. Smart Lost & Found Assistant
  async generateLostItemDescription(itemDetails) {
    try {
      const prompt = `
You are an AI assistant helping students create detailed lost item descriptions to improve recovery chances.

Item Details:
- Name: ${itemDetails.name}
- Category: ${itemDetails.category}
- Basic Description: ${itemDetails.description}
- Last Seen Location: ${itemDetails.location}
- When Lost: ${itemDetails.timeLost}

Generate an enhanced description that includes:
1. Detailed physical description
2. Distinguishing features to look for
3. Suggested search locations based on the item and context
4. Tips for the person who lost it

Return as JSON:
{
  "enhancedDescription": "detailed description",
  "searchSuggestions": ["location1", "location2", "location3"],
  "identifyingFeatures": ["feature1", "feature2"],
  "recoverTips": ["tip1", "tip2", "tip3"]
}`;

      const response = await this.callOpenAI(prompt);
      const result = this.parseJSONResponse(response);
      
      return result;
    } catch (error) {
      console.error('Error generating lost item description:', error);
      return null;
    }
  }

  // 5. AI Campus Dining Recommendations
  async generateDiningRecommendations(userPreferences, timeOfDay, dietaryRestrictions = []) {
    try {
      const prompt = `
You are an AI campus dining advisor helping students make meal decisions.

Student Preferences:
- Favorite Cuisines: ${(userPreferences.cuisines || []).join(', ')}
- Budget Level: ${userPreferences.budget || 'moderate'}
- Dietary Restrictions: ${dietaryRestrictions.join(', ')}
- Time of Day: ${timeOfDay}
- Eating Habits: ${userPreferences.eatingHabits || 'regular'}

Generate personalized dining recommendations:

Return as JSON:
{
  "recommendations": [
    {
      "location": "dining hall name",
      "meal": "specific meal recommendation",
      "why": "reason for recommendation",
      "nutritionTip": "health advice",
      "budgetNote": "cost consideration"
    }
  ],
  "alternatives": ["option1", "option2"],
  "healthTip": "general nutrition advice"
}`;

      const response = await this.callOpenAI(prompt);
      const result = this.parseJSONResponse(response);
      
      return result;
    } catch (error) {
      console.error('Error generating dining recommendations:', error);
      return null;
    }
  }

  // 6. AI Career Services Integration
  async generateCareerAdvice(studentProfile, careerGoals = {}) {
    try {
      const prompt = `
You are an AI career counselor helping college students with career planning.

Student Profile:
- Major: ${studentProfile.major}
- Year: ${studentProfile.year}
- Skills: ${(studentProfile.skills || []).join(', ')}
- Interests: ${(studentProfile.interests || []).join(', ')}
- Experience: ${(studentProfile.experience || []).join(', ')}

Career Goals:
- Target Industry: ${careerGoals.industry || 'Exploring'}
- Desired Role: ${careerGoals.role || 'Open'}
- Timeline: ${careerGoals.timeline || 'Post-graduation'}

Generate personalized career advice:

Return as JSON:
{
  "careerPaths": [
    {
      "role": "job title",
      "industry": "industry name",
      "match": "why this fits",
      "steps": ["step1", "step2", "step3"]
    }
  ],
  "skillGaps": ["skill1", "skill2"],
  "networkingTips": ["tip1", "tip2"],
  "experienceOpportunities": ["opportunity1", "opportunity2"],
  "timelineAdvice": "graduation timeline suggestions"
}`;

      const response = await this.callOpenAI(prompt);
      const result = this.parseJSONResponse(response);
      
      return result;
    } catch (error) {
      console.error('Error generating career advice:', error);
      return null;
    }
  }

  // 7. AI Mental Health & Wellness Support
  async generateWellnessRecommendations(moodData, stressLevel, academicPressure) {
    try {
      const prompt = `
You are an AI wellness coach helping college students manage stress and maintain mental health.

Current State:
- Mood: ${moodData.current || 'neutral'}
- Stress Level: ${stressLevel}/10
- Academic Pressure: ${academicPressure || 'moderate'}
- Recent Stressors: ${(moodData.stressors || []).join(', ')}

Generate supportive wellness recommendations (not medical advice):

Return as JSON:
{
  "immediate": {
    "activities": ["activity1", "activity2", "activity3"],
    "breathing": "breathing exercise",
    "affirmation": "positive affirmation"
  },
  "daily": {
    "habits": ["habit1", "habit2"],
    "schedule": "suggested routine",
    "selfCare": ["care1", "care2"]
  },
  "resources": {
    "campusSupport": ["resource1", "resource2"],
    "apps": ["app1", "app2"],
    "techniques": ["technique1", "technique2"]
  },
  "warning": "when to seek professional help"
}`;

      const response = await this.callOpenAI(prompt);
      const result = this.parseJSONResponse(response);
      
      return result;
    } catch (error) {
      console.error('Error generating wellness recommendations:', error);
      return null;
    }
  }

  // 8. Smart Study Group Formation
  async findStudyBuddies(courseInfo, studyPreferences = {}, studentNetwork = []) {
    try {
      const prompt = `
You are an AI study coordinator helping college students find compatible study partners.

Course: ${courseInfo.name || 'Unknown Course'}
Subject: ${courseInfo.subject || 'General'}
Student's Study Preferences:
- Preferred study time: ${studyPreferences.time || 'flexible'}
- Study style: ${studyPreferences.style || 'group'}
- Location preference: ${studyPreferences.location || 'library'}
- Group size: ${studyPreferences.groupSize || '3-4 people'}
- Communication style: ${studyPreferences.communication || 'collaborative'}

Existing Network: ${studentNetwork.length} connections

Generate study group recommendations:

Return as JSON:
{
  "studyTips": ["tip1", "tip2", "tip3"],
  "idealPartnerTraits": ["trait1", "trait2", "trait3"],
  "suggestedLocations": ["location1", "location2", "location3"],
  "studySchedule": {
    "frequency": "suggested frequency",
    "duration": "suggested duration",
    "bestTimes": ["time1", "time2"]
  },
  "groupDynamics": {
    "roles": ["role1", "role2"],
    "structure": "session structure",
    "goals": ["goal1", "goal2"]
  }
}`;

      const response = await this.callOpenAI(prompt);
      const result = this.parseJSONResponse(response);
      
      return {
        studyTips: result.studyTips || [],
        partnerTraits: result.idealPartnerTraits || [],
        locations: result.suggestedLocations || [],
        schedule: result.studySchedule || {},
        dynamics: result.groupDynamics || {},
        courseContext: courseInfo
      };
    } catch (error) {
      console.error('Error finding study buddies:', error);
      return { studyTips: [], partnerTraits: [], locations: [] };
    }
  }

  // 9. AI-Powered Academic Content Ideas
  async generateContentIdeas(userProfile, recentActivity = [], socialContext = {}) {
    try {
      const prompt = `
You are a social media strategist for college students, creating authentic academic content.

Student Profile:
- Major: ${userProfile.major}
- Year: ${userProfile.year}
- Interests: ${userProfile.interests?.join(', ')}
- Academic Goals: ${(userProfile.goals || []).join(', ')}

Recent Activity: ${recentActivity.slice(0, 3).map(a => a.type).join(', ')}
Social Context: ${socialContext.platform || 'general'} content

Generate 5 authentic content ideas for academic social media:

Return as JSON:
{
  "contentIdeas": [
    {
      "title": "Content Title",
      "description": "What to post about",
      "suggestedCaption": "Example caption with personality",
      "hashtags": ["#tag1", "#tag2", "#tag3"],
      "bestTime": "when to post",
      "engagement": "expected engagement type",
      "authenticity": "why this feels genuine"
    }
  ]
}`;

      const response = await this.callOpenAI(prompt);
      const result = this.parseJSONResponse(response);
      
      return {
        ideas: result.contentIdeas || [],
        generatedFor: userProfile,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Error generating content ideas:', error);
      return { ideas: [] };
    }
  }

  // 10. Context-Aware Friend Recommendations
  async generateFriendSuggestions(userProfile, existingFriends = [], campusActivities = []) {
    try {
      const prompt = `
You are an AI social coordinator helping college students build meaningful connections.

Student Profile:
- Major: ${userProfile.major}
- Year: ${userProfile.year}
- Interests: ${(userProfile.interests || []).join(', ')}
- Clubs/Activities: ${campusActivities.join(', ')}
- Personality: ${userProfile.personality || 'friendly'}

Current Network: ${existingFriends.length} friends
Friend Types: ${existingFriends.map(f => f.relationship).join(', ')}

Generate friend connection strategies:

Return as JSON:
{
  "connectionOpportunities": [
    {
      "context": "where to meet",
      "approach": "how to connect",
      "commonGround": "shared interests",
      "activitySuggestion": "what to do together"
    }
  ],
  "networkingTips": ["tip1", "tip2", "tip3"],
  "socialEvents": ["event1", "event2"],
  "conversationStarters": ["starter1", "starter2"]
}`;

      const response = await this.callOpenAI(prompt);
      const result = this.parseJSONResponse(response);
      
      return result;
    } catch (error) {
      console.error('Error generating friend suggestions:', error);
      return null;
    }
  }

  // 11. Personalized Campus Location Recommendations
  async recommendCampusLocations(userProfile, currentContext = {}) {
    try {
      const prompt = `
You are an AI campus guide helping students discover the best spots for their needs.

Student Profile:
- Major: ${userProfile.major}
- Study Habits: ${(userProfile.studyHabits || []).join(', ')}
- Social Preferences: ${userProfile.socialLevel || 'balanced'}
- Schedule: ${userProfile.schedule || 'regular'}

Current Context:
- Time of Day: ${currentContext.timeOfDay || 'any'}
- Purpose: ${currentContext.purpose || 'study'}
- Noise Preference: ${currentContext.noiseLevel || 'quiet'}

Recommend personalized campus locations:

Return as JSON:
{
  "locations": [
    {
      "location": "specific place name",
      "type": "study/social/dining/recreation",
      "description": "what makes it special",
      "bestTime": "optimal time to visit",
      "tip": "insider tip",
      "reason": "why perfect for this student"
    }
  ]
}`;

      const response = await this.callOpenAI(prompt);
      const result = this.parseJSONResponse(response);
      
      return result;
    } catch (error) {
      console.error('Error recommending campus locations:', error);
      return { locations: [] };
    }
  }

  // 12. AI-Enhanced Party Safety & Social Planning
  async generateSafetyRecommendations(eventContext, userProfile) {
    try {
      const prompt = `
You are an AI safety advisor helping college students plan safe social activities.

Event Context:
- Type: ${eventContext.type || 'social gathering'}
- Size: ${eventContext.size || 'medium'}
- Location: ${eventContext.location || 'campus'}
- Time: ${eventContext.time || 'evening'}

Student Profile:
- Experience Level: ${userProfile.socialExperience || 'moderate'}
- Friend Group Size: ${userProfile.friendGroupSize || 'small'}

Generate safety recommendations and social tips:

Return as JSON:
{
  "safetyTips": ["tip1", "tip2", "tip3"],
  "buddySystem": {
    "strategy": "how to use buddy system",
    "checkIns": "when to check in",
    "signals": "emergency signals"
  },
  "socialTips": ["social1", "social2"],
  "emergencyPlan": {
    "contacts": "who to contact",
    "extraction": "how to leave safely",
    "resources": "campus resources"
  }
}`;

      const response = await this.callOpenAI(prompt);
      const result = this.parseJSONResponse(response);
      
      return result;
    } catch (error) {
      console.error('Error generating safety recommendations:', error);
      return null;
    }
  }

  // 13. Smart Message Suggestions for Chat
  async generateMessageSuggestions(conversationContext, userProfile = {}) {
    try {
      const prompt = `
You are an AI assistant helping college students with conversation suggestions.

Conversation Context:
- Recent Messages: ${(conversationContext.recentMessages || []).slice(-3).join(', ')}
- Chat Type: ${conversationContext.chatType || 'friend'}
- Relationship: ${conversationContext.relationship || 'friend'}
- Context: ${conversationContext.context || 'casual'}
- Mood: ${conversationContext.mood || 'friendly'}

Student Profile:
- Major: ${userProfile.major || 'Unknown'}
- Interests: ${(userProfile.interests || []).join(', ') || 'General'}
- Personality: ${userProfile.personality || 'friendly'}

Generate 3 different message suggestions:
1. Casual/Fun response
2. Thoughtful/Engaging response  
3. Question/Conversation starter

Each suggestion should:
- Be natural and authentic
- Match the conversation flow
- Be appropriate for college students
- Include emojis when appropriate
- Be under 100 characters

Return as JSON: {"casual": "...", "thoughtful": "...", "question": "..."}`;

      const response = await this.callOpenAI(prompt);
      const result = this.parseJSONResponse(response);
      
      return {
        suggestions: [
          result.casual || "Sounds good! 😊",
          result.thoughtful || "That's really interesting!",
          result.question || "What do you think about...?"
        ],
        context: conversationContext.context,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Error generating message suggestions:', error);
      return {
        suggestions: [
          "That's awesome! 😄",
          "I totally get that!",
          "Tell me more about that!"
        ]
      };
    }
  }

  // 14. Smart Caption Enhancement for Messages
  async enhanceMessageWithContext(message, conversationContext = {}) {
    try {
      const prompt = `
You are an AI assistant helping enhance messages with smart context.

Original Message: "${message}"
Conversation Context: ${conversationContext.topic || 'general chat'}
Relationship: ${conversationContext.relationship || 'friend'}
Current Mood: ${conversationContext.mood || 'neutral'}

Enhance this message to be more engaging while keeping the original meaning:
- Add appropriate emojis
- Make it more conversational
- Keep it authentic to college students
- Don't change the core message
- Keep it under 200 characters

Return just the enhanced message, no JSON.`;

      const response = await this.callOpenAI(prompt);
      return response.trim();
    } catch (error) {
      console.error('Error enhancing message:', error);
      return message; // Return original if enhancement fails
    }
  }

  // 15. Conversation Analysis and Mood Detection
  async analyzeConversation(messages = [], userProfile = {}) {
    try {
      const recentMessages = messages.slice(-10).map(m => 
        `${m.sender_name || 'User'}: ${m.content}`
      ).join('\n');

      const prompt = `
Analyze this college student conversation for mood, topics, and suggestions.

Recent Messages:
${recentMessages}

Student Profile: ${JSON.stringify(userProfile)}

Analyze and return insights as JSON:
{
  "mood": "happy/excited/stressed/worried/neutral/etc",
  "topics": ["topic1", "topic2"],
  "energy": "high/medium/low",
  "suggestions": {
    "conversation": ["suggestion1", "suggestion2"],
    "activities": ["activity1", "activity2"],
    "support": "any support needed"
  },
  "insights": "brief insight about the conversation"
}`;

      const response = await this.callOpenAI(prompt);
      const result = this.parseJSONResponse(response);
      
      return {
        analysis: result,
        timestamp: Date.now(),
        messageCount: messages.length
      };
    } catch (error) {
      console.error('Error analyzing conversation:', error);
      return {
        analysis: {
          mood: 'neutral',
          topics: ['general'],
          energy: 'medium',
          suggestions: {
            conversation: ['Keep the conversation going!'],
            activities: ['Maybe plan something fun together'],
            support: 'Looking good!'
          },
          insights: 'Having a great conversation!'
        }
      };
    }
  }

  // Helper method to call OpenAI API
  async callOpenAI(prompt) {
    if (!this.openaiApiKey || this.openaiApiKey === 'your_openai_api_key_here') {
      throw new Error('OpenAI API key not configured');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.openaiApiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful AI assistant specialized in college life and student support. Always respond with practical, actionable advice tailored to college students.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  // Helper method to parse JSON responses
  parseJSONResponse(response) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return {};
    } catch (error) {
      console.error('Error parsing JSON response:', error);
      return {};
    }
  }

  // Cache user context for personalization
  async cacheUserContext(userId, context) {
    try {
      await AsyncStorage.setItem(`user_context_${userId}`, JSON.stringify(context));
      this.userContext[userId] = context;
    } catch (error) {
      console.error('Error caching user context:', error);
    }
  }

  // Get cached user context
  async getUserContext(userId) {
    try {
      if (this.userContext[userId]) {
        return this.userContext[userId];
      }
      const cached = await AsyncStorage.getItem(`user_context_${userId}`);
      return cached ? JSON.parse(cached) : {};
    } catch (error) {
      console.error('Error getting user context:', error);
      return {};
    }
  }
}

export default new CollegeRAGService(); 