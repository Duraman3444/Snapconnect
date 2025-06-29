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

  // 1. Smart Caption Generation for College Students - Enhanced with Detailed Context
  async generateSmartCaption(imageContext, userProfile = {}, screenContext = {}) {
    try {
      const currentTime = new Date();
      const timeOfDay = this.getTimeOfDay(currentTime);
      const dayOfWeek = currentTime.toLocaleDateString('en-US', { weekday: 'long' });
      const season = this.getSeason(currentTime);
      
      const prompt = `
You are an advanced AI caption generator specializing in authentic, engaging content for college students. Create highly personalized captions that feel natural and relatable.

=== CURRENT CONTEXT ===
Time: ${timeOfDay} (${dayOfWeek})
Season: ${season}
App Context: ${screenContext.screen || 'camera'} screen
Photo Session Type: ${screenContext.photoType || 'casual'}

=== STUDENT PROFILE ===
- Major/Field: ${userProfile.major || 'Student'}
- Academic Year: ${userProfile.year || 'Unknown'}
- Interests: ${(userProfile.interests || []).join(', ') || 'General college activities'}
- Campus: ${userProfile.campus || 'College'}
- Recent Activities: ${(userProfile.recentActivities || []).join(', ') || 'Daily college life'}
- Caption Style: ${userProfile.captionStyle || 'authentic'}

=== IMAGE CONTEXT ===
${typeof imageContext === 'string' ? imageContext : JSON.stringify(imageContext)}

=== DETAILED CAPTION GENERATION ===
Create 5 different caption styles with multiple variations each:

1. **Casual & Authentic**: Natural, conversational tone with relevant emojis
2. **Motivational & Academic**: Inspiring but relatable to student struggles
3. **Funny & Relatable**: College humor, self-aware but positive
4. **Aesthetic & Minimal**: Clean, simple, Instagram-worthy
5. **Story-Driven**: Captures the moment, tells a mini story

Each caption should:
- Feel genuinely written by a college student
- Consider the current time/day/season context
- Reflect current college trends and language
- Include appropriate emojis and hashtags when relevant
- Range from 15-140 characters
- Be specific to the image and student context
- Avoid generic phrases
- Reference their major/interests when relevant

Return as JSON:
{
  "casual": ["casual caption 1", "casual caption 2", "casual caption 3"],
  "motivational": ["inspiring caption 1", "inspiring caption 2"],
  "funny": ["humorous caption 1", "humorous caption 2"],
  "aesthetic": ["minimal caption 1", "minimal caption 2"],
  "story": ["story caption 1", "story caption 2"],
  "contextualNote": "explanation of how current context influenced these captions"
}`;

      const response = await this.callOpenAI(prompt);
      const result = this.parseJSONResponse(response);
      
      return {
        suggestions: [
          ...(result.casual || ["Capturing the moment ✨"]),
          ...(result.motivational || ["Every day is progress 💪"]), 
          ...(result.funny || ["College life in a nutshell 😅"]),
          ...(result.aesthetic || ["✨ simple moments ✨"]),
          ...(result.story || ["Another chapter in the books 📖"])
        ],
        contextualNote: result.contextualNote || "Captions tailored for current moment",
        categories: {
          casual: result.casual || [],
          motivational: result.motivational || [],
          funny: result.funny || [],
          aesthetic: result.aesthetic || [],
          story: result.story || []
        },
        context: {
          imageContext,
          timeContext: `${timeOfDay} on ${dayOfWeek}`,
          season,
          userProfile: userProfile.major || 'Student'
        },
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Error generating smart caption:', error);
      
      // Use enhanced fallback system with context
      const fallbackSuggestions = this.generateFallbackSuggestions('camera', userProfile);
      
      return {
        suggestions: fallbackSuggestions,
        contextualNote: `Fallback captions due to AI service issue: ${error.message}`,
        fallbackUsed: true,
        categories: {
          casual: fallbackSuggestions.slice(0, 2),
          motivational: fallbackSuggestions.slice(2, 3),
          funny: fallbackSuggestions.slice(3, 4),
          aesthetic: fallbackSuggestions.slice(4, 5),
          story: fallbackSuggestions.slice(0, 1)
        },
        context: {
          imageContext,
          timeContext: `${this.getTimeOfDay()} on ${new Date().toLocaleDateString('en-US', { weekday: 'long' })}`,
          season: this.getSeason(),
          userProfile: userProfile.major || 'Student'
        },
        timestamp: Date.now()
      };
    }
  }

  // Helper method to determine season
  getSeason(date = new Date()) {
    const month = date.getMonth();
    if (month >= 2 && month <= 4) return 'Spring';
    if (month >= 5 && month <= 7) return 'Summer';
    if (month >= 8 && month <= 10) return 'Fall';
    return 'Winter';
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
      console.log('Generating wellness recommendations for mood:', moodData.current, 'stress level:', stressLevel);
      
      const prompt = `
You are an AI wellness coach helping college students manage stress and maintain mental health.

Current State:
- Mood: ${moodData.current || 'neutral'}
- Stress Level: ${stressLevel}/10
- Academic Pressure: ${academicPressure || 'moderate'}
- Recent Stressors: ${(moodData.stressors || []).join(', ')}
${moodData.specificRequest ? `- Specific Request: "${moodData.specificRequest}"` : ''}

Generate supportive wellness recommendations (not medical advice). Be specific and actionable for college students.
${moodData.specificRequest ? `Pay special attention to their specific request and provide targeted advice for their situation.` : ''}

Return as valid JSON with this exact structure:
{
  "immediate": {
    "activities": ["Take 3 deep breaths", "Step outside for fresh air", "Listen to calming music"],
    "breathing": "specific breathing exercise instruction",
    "affirmation": "positive affirmation message"
  },
  "daily": {
    "habits": ["habit1", "habit2"],
    "schedule": "suggested routine",
    "selfCare": ["care1", "care2"]
  },
  "resources": {
    "campusSupport": ["Campus Counseling Center", "Student Wellness Services"],
    "apps": ["Headspace", "Calm"],
    "techniques": ["Mindfulness meditation", "Progressive muscle relaxation"]
  },
  "warning": "when to seek professional help"
}`;

      const response = await this.callOpenAI(prompt);
      
      if (!response || response.trim() === '') {
        console.warn('Empty response from OpenAI API');
        return null;
      }
      
      const result = this.parseJSONResponse(response);
      
      // Validate that we have the expected structure
      if (!result || typeof result !== 'object') {
        console.warn('Invalid JSON structure in response');
        return null;
      }
      
      // Ensure we have at least the immediate section
      if (!result.immediate && !result.daily && !result.resources) {
        console.warn('Response missing expected sections');
        return null;
      }
      
      console.log('Successfully generated wellness recommendations');
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

  // 12. Generate safety recommendations for events and campus activities
  async generateSafetyRecommendations(eventContext, userProfile) {
    try {
      const prompt = `
You are a campus safety advisor helping students stay safe during college activities.

Event Context:
- Type: ${eventContext.eventType || 'campus activity'}
- Location: ${eventContext.location || 'campus'}
- Time: ${eventContext.time || 'evening'}
- Group Size: ${eventContext.groupSize || 'small group'}

Student Profile:
- Experience Level: ${userProfile.campusExperience || 'new to campus'}
- Transportation: ${userProfile.transportation || 'walking'}

Generate comprehensive safety recommendations:

Return as JSON:
{
  "beforeEvent": ["safety tip 1", "safety tip 2"],
  "duringEvent": ["safety tip 1", "safety tip 2"],
  "transportation": ["transport safety tip 1", "transport safety tip 2"],
  "emergencyContacts": ["Campus Security: (555) 123-4567", "Local Emergency: 911"],
  "riskAssessment": "low/medium/high",
  "specificPrecautions": ["precaution 1", "precaution 2"]
}`;

      const response = await this.callOpenAI(prompt);
      const result = this.parseJSONResponse(response);
      
      return result;
    } catch (error) {
      console.error('Error generating safety recommendations:', error);
      return null;
    }
  }

  // 13. Generate intelligent seasonal feature recommendations - NEW
  async generateSeasonalRecommendations(season, featureType, userProfile = {}, userContext = {}) {
    try {
      const currentTime = new Date();
      const timeOfDay = this.getTimeOfDay(currentTime);
      const dayOfWeek = currentTime.toLocaleDateString('en-US', { weekday: 'long' });
      
      const prompt = `
You are an advanced college life AI assistant providing highly personalized seasonal recommendations.

=== SEASONAL CONTEXT ===
Current Season: ${season}
Feature Type: ${featureType}
Time: ${timeOfDay} (${dayOfWeek})
Academic Calendar Phase: ${this.getAcademicPhase(currentTime)}

=== USER PROFILE ===
Major: ${userProfile.major || 'General Studies'}
Year: ${userProfile.year || 'Sophomore'}
Interests: ${(userProfile.interests || []).join(', ') || 'General college activities'}
Past Seasonal Activities: ${(userProfile.seasonalHistory || []).join(', ') || 'None recorded'}
Campus Involvement: ${userProfile.involvement || 'Moderate'}

=== CURRENT CONTEXT ===
Location: ${userContext.location || 'On campus'}
Stress Level: ${userContext.stressLevel || 'Moderate'}
Social Activity: ${userContext.socialLevel || 'Regular'}
Budget Considerations: ${userContext.budget || 'Student budget'}

=== FEATURE-SPECIFIC RECOMMENDATIONS ===
Based on the season "${season}" and feature "${featureType}", provide:

1. **Immediate Actions** (2-3 specific steps they can take today)
2. **Weekly Planning** (activities for this week)
3. **Long-term Strategy** (planning for the next month)
4. **Personalized Tips** (based on their major and interests)
5. **Social Integration** (how to involve friends/make connections)
6. **Budget-Friendly Options** (cost-effective alternatives)
7. **Campus Resources** (specific college services to utilize)
8. **Success Metrics** (how to know they're making the most of this feature)

Make recommendations specific to college life, considering:
- Academic workload during this season
- Campus events and activities
- Social dynamics of college students
- Financial constraints typical of students
- Time management challenges
- Personal growth opportunities

Return as JSON:
{
  "immediateActions": ["action1", "action2", "action3"],
  "weeklyPlanning": ["weekly activity 1", "weekly activity 2"],
  "longTermStrategy": "comprehensive monthly strategy",
  "personalizedTips": ["tip based on major/interests", "another personalized tip"],
  "socialIntegration": ["social suggestion 1", "social suggestion 2"],
  "budgetFriendly": ["budget option 1", "budget option 2"],
  "campusResources": ["campus resource 1", "campus resource 2"],
  "successMetrics": ["metric 1", "metric 2"],
  "seasonalInsight": "why this is the perfect time for this activity",
  "nextSteps": "what to do after implementing these recommendations"
}`;

      const response = await this.callOpenAI(prompt);
      const result = this.parseJSONResponse(response);
      
      return {
        recommendations: result,
        season,
        featureType,
        generatedAt: Date.now(),
        personalizedFor: userProfile.major || 'College Student',
        timeContext: `${timeOfDay} on ${dayOfWeek}`,
        academicPhase: this.getAcademicPhase(currentTime)
      };
    } catch (error) {
      console.error('Error generating seasonal recommendations:', error);
      
      // Fallback seasonal recommendations
      return {
        recommendations: this.getSeasonalFallbackRecommendations(season, featureType),
        season,
        featureType,
        generatedAt: Date.now(),
        fallbackUsed: true,
        timeContext: `${timeOfDay} on ${dayOfWeek}`
      };
    }
  }

  // Helper: Determine academic calendar phase
  getAcademicPhase(date = new Date()) {
    const month = date.getMonth();
    const day = date.getDate();
    
    if (month >= 8 && month <= 11) return 'Fall Semester';
    if (month === 11 && day > 15) return 'Finals Week';
    if (month === 0) return 'Winter Break';
    if (month >= 1 && month <= 4) return 'Spring Semester';
    if (month === 4 && day > 15) return 'Finals Week';
    if (month >= 5 && month <= 7) return 'Summer Session';
    return 'Academic Break';
  }

  // Helper: Fallback seasonal recommendations when AI is unavailable
  getSeasonalFallbackRecommendations(season, featureType) {
    const fallbacks = {
      fall: {
        movein: {
          immediateActions: ["Confirm your move-in time slot", "Pack essentials in a separate bag", "Download your university app"],
          weeklyPlanning: ["Meet your roommate", "Explore dining options", "Join orientation activities"],
          longTermStrategy: "Focus on building relationships and establishing routines during your first month",
          personalizedTips: ["Make your dorm room feel like home", "Join clubs related to your major"],
          seasonalInsight: "Fall move-in is the perfect time to start fresh and build your college network"
        },
        sports: {
          immediateActions: ["Check the upcoming game schedule", "Connect with fellow fans", "Learn team traditions"],
          weeklyPlanning: ["Attend a tailgate party", "Watch games with friends", "Join student sections"],
          longTermStrategy: "Build school spirit and social connections through sports engagement",
          personalizedTips: ["Sports are a great way to connect with alumni", "Learn school chants and traditions"],
          seasonalInsight: "Fall sports season creates the strongest sense of campus community"
        }
      },
      spring: {
        spring: {
          immediateActions: ["Research destinations with friends", "Set a realistic budget", "Check passport validity"],
          weeklyPlanning: ["Plan group discussions", "Research travel deals", "Coordinate schedules"],
          longTermStrategy: "Plan a memorable but safe spring break experience that fits your budget",
          personalizedTips: ["Consider alternative spring breaks", "Plan activities that align with your interests"],
          seasonalInsight: "Spring break is the perfect time to recharge before final push to summer"
        },
        finals: {
          immediateActions: ["Create a study schedule", "Find your exam locations", "Form study groups"],
          weeklyPlanning: ["Focus on high-priority subjects", "Schedule breaks and self-care", "Review past materials"],
          longTermStrategy: "Manage stress while maximizing academic performance during finals",
          personalizedTips: ["Use active recall study methods", "Take care of your physical and mental health"],
          seasonalInsight: "Spring finals determine your academic year success - strategic preparation is key"
        }
      }
    };
    
    return fallbacks[season]?.[featureType] || {
      immediateActions: ["Take the first step", "Connect with others", "Plan ahead"],
      seasonalInsight: `${season} is a great time to focus on ${featureType} activities`
    };
  }

  // 14. Smart Message Suggestions for Chat - Enhanced with conversation-first context awareness
  async generateMessageSuggestions(conversationContext, userProfile = {}, screenContext = {}) {
    try {
      const currentTime = new Date();
      const timeOfDay = this.getTimeOfDay(currentTime);
      const dayOfWeek = currentTime.toLocaleDateString('en-US', { weekday: 'long' });
      const mood = conversationContext.mood || 'friendly';
      const recentMessages = conversationContext.recentMessages || [];
      
      // Analyze conversation context deeply
      const conversationAnalysis = this.analyzeConversationContext(recentMessages);
      
      const prompt = `
You are an advanced AI conversation assistant helping a college student craft authentic, contextually appropriate messages. Your PRIMARY goal is to respond meaningfully to the ACTUAL CONVERSATION CONTENT.

=== CONVERSATION ANALYSIS (MOST IMPORTANT) ===
Recent Messages: ${recentMessages.slice(-10).map((msg, i) => `${i+1}. "${msg}"`).join('\n')}

Conversation Flow Analysis:
- Main Topics: ${conversationAnalysis.topics.join(', ') || 'Getting to know each other'}
- Conversation Energy: ${conversationAnalysis.energy}
- Last Message Tone: ${conversationAnalysis.lastTone}
- Response Needed: ${conversationAnalysis.responseType}
- Key Discussion Points: ${conversationAnalysis.keyPoints.join(', ') || 'General conversation'}

=== SUPPORTING CONTEXT ===
User's Current Mood: ${mood} (should complement, not override conversation context)
Time: ${timeOfDay} (${dayOfWeek})
Chat Type: ${conversationContext.chatType || 'individual'} chat
Relationship: ${conversationContext.relationship || 'friend'}
Conversation Length: ${recentMessages.length} messages

=== USER PROFILE (Supporting Info) ===  
- Major: ${userProfile.major || 'Unknown'}
- Interests: ${(userProfile.interests || []).join(', ') || 'General interests'}
- Communication Style: ${userProfile.communicationStyle || 'casual'}

=== CONTEXT-FIRST MESSAGE GENERATION ===
Generate 5 message suggestions that PRIMARILY respond to the conversation content and flow:

**PRIORITY ORDER:**
1. **CONVERSATION RELEVANCE** (80%): Direct response to what's being discussed
2. **NATURAL FLOW** (15%): Continues the conversation naturally 
3. **MOOD ENHANCEMENT** (5%): Adds the user's mood as a subtle flavor

**RESPONSE TYPES TO GENERATE:**
1. **Direct Response**: Directly addresses the last message or main topic
2. **Follow-up Question**: Asks about something mentioned in conversation
3. **Related Share**: Shares something relevant to the discussion
4. **Conversation Deeper**: Takes current topic to a more meaningful level
5. **Natural Transition**: Smoothly shifts conversation while staying connected

Each suggestion should:
- FIRST: Be a natural, meaningful response to the conversation content
- SECOND: Reflect the user's ${mood} mood in tone and style
- THIRD: Consider time/context as minor adjustments
- Be authentic and feel like a real response from a college student
- Use appropriate emojis that match both context and mood
- Be 15-100 characters (natural texting length)
- Feel conversational, not AI-generated

CRITICAL: If the conversation is about something specific (classes, events, feelings, plans, etc.), your suggestions MUST directly relate to that topic. Don't ignore what they're talking about!

Return as JSON:
{
  "direct": "direct response to the conversation topic with ${mood} undertone",
  "followup": "question about something mentioned in the conversation",
  "share": "personal sharing related to what's being discussed",  
  "deeper": "takes current conversation topic to more meaningful level",
  "transition": "natural conversation flow continuation",
  "contextExplanation": "explain how you prioritized conversation content over mood"
}`;

      const response = await this.callOpenAI(prompt);
      const result = this.parseJSONResponse(response);
      
      return {
        suggestions: [
          result.direct || this.getContextualFallback(conversationAnalysis, mood, 'direct'),
          result.followup || this.getContextualFallback(conversationAnalysis, mood, 'followup'),
          result.share || this.getContextualFallback(conversationAnalysis, mood, 'share'),
          result.deeper || this.getContextualFallback(conversationAnalysis, mood, 'deeper'),
          result.transition || this.getContextualFallback(conversationAnalysis, mood, 'transition')
        ],
        contextExplanation: result.contextExplanation || `Context-focused suggestions based on: ${conversationAnalysis.mainFocus}`,
        conversationAnalysis: conversationAnalysis,
        mood: mood,
        primaryFactor: 'conversation_context',
        context: conversationContext.context,
        timeContext: `${timeOfDay} on ${dayOfWeek}`,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Error generating context-focused message suggestions:', error);
      
      // Enhanced fallback that still prioritizes context
      const conversationAnalysis = this.analyzeConversationContext(conversationContext.recentMessages || []);
      const mood = conversationContext.mood || 'friendly';
      const contextualFallbacks = this.generateContextualFallbacks(conversationAnalysis, mood);
      
      return {
        suggestions: contextualFallbacks.slice(0, 5),
        contextExplanation: `Context-based fallback suggestions focusing on: ${conversationAnalysis.mainFocus}`,
        fallbackUsed: true,
        conversationAnalysis: conversationAnalysis,
        mood: mood,
        primaryFactor: 'conversation_context',
        context: conversationContext.context,
        timeContext: `${this.getTimeOfDay()} on ${new Date().toLocaleDateString('en-US', { weekday: 'long' })}`,
        timestamp: Date.now()
      };
    }
  }

  // Helper method to call OpenAI API
  async callOpenAI(prompt) {
    if (!this.openaiApiKey || this.openaiApiKey === 'your_openai_api_key_here') {
      console.warn('OpenAI API key not configured, using fallback response');
      throw new Error('OpenAI API key not configured');
    }

    try {
      console.log('Making OpenAI API call...');
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.openaiApiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are an advanced AI assistant specialized in college life and student support. You provide highly detailed, personalized, and contextually aware advice tailored to college students. Always consider the current screen context, user activity, time of day, and social situation when providing recommendations. Your responses should be comprehensive, practical, and actionable. When requested to format as JSON, ensure the response is valid and well-structured with detailed explanations. Be conversational yet informative, and always consider the emotional and social aspects of college life.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 3000,
          temperature: 0.8
        })
      });

      console.log('OpenAI API response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenAI API error response:', errorText);
        
        if (response.status === 401) {
          throw new Error('OpenAI API authentication failed - invalid API key');
        } else if (response.status === 429) {
          throw new Error('OpenAI API rate limit exceeded - please try again later');
        } else if (response.status === 500) {
          throw new Error('OpenAI API server error - please try again later');
        } else {
          throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
        }
      }

      const data = await response.json();
      console.log('OpenAI API response received successfully');
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Invalid response structure from OpenAI API');
      }
      
      return data.choices[0].message.content;
    } catch (error) {
      console.error('OpenAI API call failed:', error);
      
      // Enhanced error handling with specific fallback strategies
      if (error.message.includes('network') || error.message.includes('fetch')) {
        throw new Error('Network connection issue - please check your internet connection and try again');
      }
      
      if (error.message.includes('rate limit')) {
        throw new Error('AI service is temporarily busy - please wait a moment and try again');
      }
      
      if (error.message.includes('authentication')) {
        throw new Error('AI service configuration issue - please contact support');
      }
      
      // Generic fallback
      throw new Error('AI service temporarily unavailable - falling back to default suggestions');
    }
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

  // Helper method to determine time of day context
  getTimeOfDay(date = new Date()) {
    const hour = date.getHours();
    if (hour >= 6 && hour < 12) return 'Morning';
    if (hour >= 12 && hour < 17) return 'Afternoon'; 
    if (hour >= 17 && hour < 22) return 'Evening';
    return 'Late Night';
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

  // Test function to check OpenAI API connectivity
  async testOpenAIConnection() {
    try {
      console.log('Testing OpenAI API connection...');
      console.log('API Key configured:', !!this.openaiApiKey);
      console.log('API Key starts with:', this.openaiApiKey ? this.openaiApiKey.substring(0, 10) + '...' : 'None');
      
      const testPrompt = 'Respond with just the word "connected" if you can read this message.';
      const response = await this.callOpenAI(testPrompt);
      
      console.log('OpenAI API test response:', response);
      return { success: true, response: response };
    } catch (error) {
      console.error('OpenAI API test failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Context builder helper for enhanced AI interactions
  buildScreenContext(screenName, activity, additionalContext = {}) {
    const currentTime = new Date();
    const timeOfDay = this.getTimeOfDay(currentTime);
    const dayOfWeek = currentTime.toLocaleDateString('en-US', { weekday: 'long' });
    const season = this.getSeason(currentTime);

    return {
      screen: screenName,
      activity: activity,
      timeOfDay,
      dayOfWeek,
      season,
      location: 'campus',
      timestamp: Date.now(),
      ...additionalContext
    };
  }

  // Main function used by AIAssistant - Enhanced with detailed context awareness
  async getAIResponse(query, userId, screenContext = {}) {
    try {
      const userContext = await this.getUserContext(userId);
      const currentTime = new Date();
      const timeOfDay = this.getTimeOfDay(currentTime);
      const dayOfWeek = currentTime.toLocaleDateString('en-US', { weekday: 'long' });
      
      const prompt = `
You are an advanced AI assistant helping a college student. Provide a detailed, personalized response that considers their current context and situation.

=== CURRENT CONTEXT ===
Screen: ${screenContext.screen || 'general'}
Activity: ${screenContext.activity || 'browsing'}
Time: ${timeOfDay} (${dayOfWeek})
Location Context: ${screenContext.location || 'campus'}

=== USER QUERY ===
"${query}"

=== USER PROFILE ===
${JSON.stringify(userContext, null, 2)}

=== RESPONSE GUIDELINES ===
1. Consider the current screen/activity context in your response
2. Provide specific, actionable advice tailored to college life
3. Include relevant timing considerations (if applicable)
4. Consider social and emotional aspects
5. If relevant, suggest follow-up actions or related features in the app
6. Be conversational but comprehensive
7. If this relates to a specific campus activity, provide detailed steps and tips
8. Consider the user's likely current mood and energy level based on time/context

Provide a detailed, helpful response that goes beyond basic advice:`;

      const response = await this.callOpenAI(prompt);
      return response || "I'm here to provide detailed guidance on campus life, studies, and everything college-related! What specific aspect would you like me to dive deeper into?";
    } catch (error) {
      console.error('Error getting AI response:', error);
      
      // Generate context-aware fallback response
      const context = screenContext.screen || 'general';
      const activity = screenContext.activity || 'browsing';
      
      const fallbackResponses = {
        messaging: "I'm here to help with conversation ideas! While my AI brain is taking a quick break, I'd suggest asking about their day, sharing something interesting you learned, or making plans to hang out. What kind of conversation are you looking to have?",
        camera: "Perfect moment for a photo! While my AI is recharging, here are some caption ideas: capture the moment, share your campus experience, or tell your story through the image. What's the vibe you're going for?",
        home: "Welcome to your campus hub! While my AI is temporarily offline, I'd recommend checking out campus events, connecting with friends, or exploring new opportunities. How can I help make your day awesome?",
        friends: "Making friends is one of the best parts of college! While my AI is taking a moment, try joining clubs, attending campus events, or simply being open to conversations. Authentic connections happen naturally - what interests you most about meeting new people?",
        general: "I'm your campus life assistant! While my AI brain is taking a quick break, I'm still here to help with college life, friendships, studies, and everything in between. What would you like guidance on?"
      };
      
      const fallbackResponse = fallbackResponses[context] || fallbackResponses.general;
      
      return `${fallbackResponse}\n\n💡 Note: AI services are temporarily limited, but I'm still here to help with campus life guidance!`;
    }
  }

  // Enhanced fallback system for AI suggestions
  generateFallbackSuggestions(context = 'general', userProfile = {}) {
    const currentHour = new Date().getHours();
    const timeOfDay = this.getTimeOfDay();
    
    const fallbackSuggestions = {
      messaging: [
        "That's really interesting! 😊",
        "Tell me more about that!",
        "How are you feeling about it?",
        `Want to hang out ${timeOfDay.toLowerCase()}?`,
        "What are your thoughts on this?"
      ],
      camera: [
        `${timeOfDay} vibes ✨`,
        "Living in the moment 📸",
        "Campus life captured 🎓",
        "Making memories 💫",
        "Another day, another story 📖"
      ],
      home: [
        "Check out what's happening on campus today! 🏫",
        "Time to connect with friends! 👥",
        "Explore new opportunities! 🌟",
        "Make the most of your day! ⭐",
        "Ready for an adventure? 🚀"
      ],
      friends: [
        "Great conversation starter: Ask about their favorite class!",
        "Try joining a club or study group to meet people",
        "Coffee shops are perfect for casual meetups ☕",
        "Don't forget to be yourself - authenticity attracts real friends!",
        "Common interests are the best foundation for friendships"
      ]
    };

    // Add time-specific suggestions
    if (currentHour < 12) {
      fallbackSuggestions[context].push("Good morning energy! ☀️");
    } else if (currentHour < 17) {
      fallbackSuggestions[context].push("Making the most of the afternoon! 🌤️");
    } else if (currentHour < 22) {
      fallbackSuggestions[context].push("Evening adventures await! 🌅");
    } else {
      fallbackSuggestions[context].push("Late night study vibes! 🌙");
    }

    return fallbackSuggestions[context] || fallbackSuggestions.general || [
      "Keep being awesome! 🌟",
      "You've got this! 💪",
      "Make today count! ⭐",
      "Stay positive! 😊"
    ];
  }

  // Helper functions for conversation analysis
  analyzeConversationContext(messages) {
    if (!messages || messages.length === 0) {
      return {
        topics: ['general conversation'],
        energy: 'neutral',
        lastTone: 'friendly',
        responseType: 'casual_response',
        keyPoints: ['starting conversation'],
        mainFocus: 'getting to know each other'
      };
    }

    const recentMessages = messages.slice(-5);
    const lastMessage = messages[messages.length - 1] || '';
    
    // Analyze topics and themes
    const topics = this.extractTopics(recentMessages);
    const energy = this.analyzeEnergy(recentMessages);
    const lastTone = this.analyzeTone(lastMessage);
    const responseType = this.determineResponseType(lastMessage);
    const keyPoints = this.extractKeyPoints(recentMessages);
    
    return {
      topics,
      energy,
      lastTone,
      responseType,
      keyPoints,
      mainFocus: topics[0] || 'general conversation',
      lastMessage: lastMessage.substring(0, 100) // First 100 chars for context
    };
  }

  extractTopics(messages) {
    const topicKeywords = {
      'classes': ['class', 'course', 'professor', 'homework', 'assignment', 'exam', 'test', 'study', 'lecture'],
      'social': ['party', 'hang out', 'friends', 'fun', 'weekend', 'plans', 'meet up', 'together'],
      'feelings': ['feel', 'sad', 'happy', 'excited', 'stressed', 'worried', 'love', 'hate', 'awesome'],
      'food': ['eat', 'food', 'hungry', 'dinner', 'lunch', 'restaurant', 'cooking', 'meal'],
      'work': ['work', 'job', 'busy', 'tired', 'project', 'deadline', 'meeting', 'boss'],
      'relationships': ['dating', 'crush', 'boyfriend', 'girlfriend', 'like', 'love', 'relationship'],
      'events': ['event', 'concert', 'movie', 'show', 'game', 'sport', 'match', 'competition'],
      'campus': ['campus', 'dorm', 'college', 'university', 'student', 'library', 'cafeteria']
    };

    const messageText = messages.join(' ').toLowerCase();
    const foundTopics = [];

    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      const matches = keywords.filter(keyword => messageText.includes(keyword));
      if (matches.length > 0) {
        foundTopics.push(topic);
      }
    }

    return foundTopics.length > 0 ? foundTopics : ['general conversation'];
  }

  analyzeEnergy(messages) {
    const messageText = messages.join(' ').toLowerCase();
    
    const highEnergyWords = ['excited', 'awesome', 'amazing', 'love', 'party', 'fun', '!', 'haha', 'lol'];
    const lowEnergyWords = ['tired', 'stressed', 'sad', 'boring', 'meh', 'whatever', 'ok', 'fine'];
    
    const highEnergyCount = highEnergyWords.filter(word => messageText.includes(word)).length;
    const lowEnergyCount = lowEnergyWords.filter(word => messageText.includes(word)).length;
    
    if (highEnergyCount > lowEnergyCount && highEnergyCount > 0) return 'high';
    if (lowEnergyCount > highEnergyCount && lowEnergyCount > 0) return 'low';
    return 'medium';
  }

  analyzeTone(message) {
    if (!message) return 'neutral';
    
    const msg = message.toLowerCase();
    
    if (msg.includes('?')) return 'questioning';
    if (msg.includes('!') || msg.includes('haha') || msg.includes('lol')) return 'excited';
    if (msg.includes('sad') || msg.includes('tired') || msg.includes('stressed')) return 'concerned';
    if (msg.includes('love') || msg.includes('awesome') || msg.includes('great')) return 'positive';
    if (msg.includes('ok') || msg.includes('sure') || msg.includes('whatever')) return 'casual';
    
    return 'friendly';
  }

  determineResponseType(message) {
    if (!message) return 'conversation_starter';
    
    const msg = message.toLowerCase();
    
    if (msg.includes('?')) return 'answer_question';
    if (msg.includes('what do you think') || msg.includes('opinion')) return 'give_opinion';
    if (msg.includes('plan') || msg.includes('want to') || msg.includes('should we')) return 'make_plans';
    if (msg.includes('sad') || msg.includes('stressed') || msg.includes('worried')) return 'show_support';
    if (msg.includes('excited') || msg.includes('awesome') || msg.includes('great news')) return 'show_enthusiasm';
    
    return 'continue_conversation';
  }

  extractKeyPoints(messages) {
    const points = [];
    messages.forEach(msg => {
      if (msg.includes('going to') || msg.includes('planning')) points.push('future plans');
      if (msg.includes('happened') || msg.includes('today') || msg.includes('yesterday')) points.push('recent events');
      if (msg.includes('feeling') || msg.includes('think')) points.push('personal thoughts');
      if (msg.includes('we should') || msg.includes('want to')) points.push('suggestions');
    });
    
    return points.length > 0 ? [...new Set(points)] : ['general chat'];
  }

  getContextualFallback(conversationAnalysis, mood, type) {
    const topic = conversationAnalysis.topics[0] || 'general';
    const energy = conversationAnalysis.energy;
    
    const contextualResponses = {
      classes: {
        direct: energy === 'low' ? "Ugh that sounds rough 😤" : "Oh nice! How's that going? 😊",
        followup: "What's your favorite class this semester?",
        share: "I'm dealing with similar stuff in my classes too!",
        deeper: "How are you feeling about your workload overall?",
        transition: "Speaking of classes, did you see what happened in..."
      },
      social: {
        direct: energy === 'high' ? "That sounds awesome! 🎉" : "Yeah, good to hang out 😊",
        followup: "Who else is going?",
        share: "I love doing stuff like that too!",
        deeper: "What's your ideal way to spend a weekend?",
        transition: "That reminds me, have you heard about..."
      },
      feelings: {
        direct: conversationAnalysis.lastTone === 'concerned' ? "I'm here for you 🤗" : "That's great to hear! 😊",
        followup: "How long have you been feeling this way?",
        share: "I totally get that feeling",
        deeper: "What's been helping you through this?",
        transition: "Speaking of feelings, how have you been lately overall?"
      },
      general: {
        direct: this.getMoodFallback(mood, 'casual'),
        followup: "Tell me more about that!",
        share: "I can relate to that",
        deeper: "How do you feel about all this?",
        transition: "That's interesting, it makes me think of..."
      }
    };
    
    return contextualResponses[topic]?.[type] || contextualResponses.general[type];
  }

  generateContextualFallbacks(conversationAnalysis, mood) {
    const suggestions = [
      this.getContextualFallback(conversationAnalysis, mood, 'direct'),
      this.getContextualFallback(conversationAnalysis, mood, 'followup'),
      this.getContextualFallback(conversationAnalysis, mood, 'share'),
      this.getContextualFallback(conversationAnalysis, mood, 'deeper'),
      this.getContextualFallback(conversationAnalysis, mood, 'transition')
    ];
    
    return suggestions;
  }

  getMoodFallback(mood, type) {
    const fallbacks = {
      friendly: {
        casual: "That's awesome! 😊",
        thoughtful: "How are you feeling about that?",
        supportive: "You're doing great! 🌟",
        activity: "Want to hang out later? 😄",
        deeper: "What's been the highlight of your day?"
      },
      playful: {
        casual: "Haha that's hilarious! 😂",
        thoughtful: "Ooh tell me more! 🤪",
        supportive: "You're so funny! 🎉",
        activity: "Let's do something fun! 😜",
        deeper: "What's the craziest thing that happened today?"
      },
      chill: {
        casual: "Cool cool 😎",
        thoughtful: "Sounds interesting",
        supportive: "You got this ✌️",
        activity: "Maybe we should chill later 👌",
        deeper: "What's your vibe lately?"
      },
      stressed: {
        casual: "Ugh I feel you 😤",
        thoughtful: "That sounds overwhelming 😩",
        supportive: "Take a deep breath, you got this 💪",
        activity: "Need a study break? 🤯",
        deeper: "How are you handling all this stress?"
      }
    };
    
    return fallbacks[mood]?.[type] || fallbacks.friendly[type] || "That's interesting!";
  }
}

export default new CollegeRAGService(); 