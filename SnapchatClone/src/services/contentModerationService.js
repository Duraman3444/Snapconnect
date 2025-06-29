import ragService from './ragService';
import AsyncStorage from '@react-native-async-storage/async-storage';

class ContentModerationService {
  constructor() {
    this.moderationCache = new Map();
    this.distressKeywords = [
      'depressed', 'suicide', 'hurt myself', 'end it all', 'hopeless', 
      'worthless', 'kill myself', 'hate myself', 'can\'t go on', 'give up'
    ];
    this.bullyingKeywords = [
      'loser', 'stupid', 'ugly', 'worthless', 'nobody likes you',
      'kill yourself', 'you suck', 'hate you', 'freak', 'weirdo'
    ];
  }

  // Main content moderation function
  async moderateMessage(content, userId = null) {
    try {
      // Quick keyword check first
      const quickCheck = this.quickModerationCheck(content);
      if (quickCheck.requiresAttention) {
        // Use AI for detailed analysis
        return await this.aiModerationCheck(content, userId);
      }

      return {
        safe: true,
        confidence: 0.9,
        reason: 'Content appears safe',
        suggestion: null,
        flagged: false
      };
    } catch (error) {
      console.error('Content moderation error:', error);
      // Fail safe - allow content but log for review
      return {
        safe: true,
        confidence: 0.5,
        reason: 'Moderation service unavailable',
        suggestion: null,
        flagged: false,
        error: true
      };
    }
  }

  // Quick local check for obvious issues
  quickModerationCheck(content) {
    const lowerContent = content.toLowerCase();
    
    // Check for distress signals
    const hasDistressSignals = this.distressKeywords.some(keyword => 
      lowerContent.includes(keyword)
    );

    // Check for bullying language
    const hasBullyingLanguage = this.bullyingKeywords.some(keyword => 
      lowerContent.includes(keyword)
    );

    // Check for excessive profanity (basic check)
    const profanityCount = (lowerContent.match(/f\*\*k|sh\*t|damn|hell/g) || []).length;
    const hasSevereProfanity = lowerContent.includes('f***') || profanityCount > 3;

    return {
      requiresAttention: hasDistressSignals || hasBullyingLanguage || hasSevereProfanity,
      distressSignals: hasDistressSignals,
      bullyingLanguage: hasBullyingLanguage,
      severeProfanity: hasSevereProfanity
    };
  }

  // AI-powered detailed moderation
  async aiModerationCheck(content, userId = null) {
    const cacheKey = `moderation_${content.substring(0, 50)}`;
    
    // Check cache first
    if (this.moderationCache.has(cacheKey)) {
      return this.moderationCache.get(cacheKey);
    }

    const prompt = `As a content moderation AI for a college social app, analyze this message for safety concerns:

MESSAGE: "${content}"

Analyze for:
1. Bullying or harassment
2. Self-harm or distress signals
3. Inappropriate sexual content
4. Hate speech or discrimination
5. Threats or violence
6. Spam or promotional content

Return JSON:
{
  "safe": true/false,
  "confidence": 0.0-1.0,
  "concerns": ["list", "of", "issues"],
  "severity": "low/medium/high",
  "recommendation": "allow/flag/block",
  "supportResources": "if distress detected, suggest help",
  "explanation": "brief explanation for decision"
}

Be context-aware - this is college students chatting casually. Don't over-moderate normal conversation.`;

    try {
      const response = await ragService.callOpenAI(prompt);
      const result = ragService.parseJSONResponse(response);
      
      const moderationResult = {
        safe: result.safe || true,
        confidence: result.confidence || 0.8,
        reason: result.explanation || 'AI analysis completed',
        suggestion: result.supportResources || null,
        flagged: result.recommendation === 'flag' || result.recommendation === 'block',
        severity: result.severity || 'low',
        concerns: result.concerns || [],
        recommendation: result.recommendation || 'allow'
      };

      // Cache result for 1 hour
      this.moderationCache.set(cacheKey, moderationResult);
      setTimeout(() => this.moderationCache.delete(cacheKey), 60 * 60 * 1000);

      return moderationResult;
    } catch (error) {
      console.error('AI moderation failed:', error);
      // Return conservative result
      return {
        safe: false,
        confidence: 0.3,
        reason: 'Unable to verify content safety',
        suggestion: 'Please review your message for appropriate content',
        flagged: true,
        error: true
      };
    }
  }

  // Analyze conversation for distress patterns
  async detectDistressSignals(messages, userId) {
    try {
      const recentMessages = messages.slice(-10).map(m => m.content || m).join('\n');
      
      const prompt = `Analyze these recent messages for signs of depression, anxiety, or distress:

MESSAGES:
${recentMessages}

Look for patterns of:
- Depression or hopelessness
- Anxiety or panic
- Self-harm mentions
- Social isolation
- Academic/social stress
- Relationship problems

Return JSON:
{
  "concernLevel": "none/low/medium/high",
  "indicators": ["specific", "concerns", "found"],
  "recommendedAction": "none/check-in/resources/immediate-help",
  "supportMessage": "caring message to send",
  "resources": ["relevant", "support", "resources"]
}`;

      const response = await ragService.callOpenAI(prompt);
      const result = ragService.parseJSONResponse(response);

      // Log concerning patterns for review
      if (result.concernLevel !== 'none') {
        await this.logDistressPattern(userId, result);
      }

      return result;
    } catch (error) {
      console.error('Distress detection error:', error);
      return {
        concernLevel: 'none',
        error: true
      };
    }
  }

  // Generate supportive response suggestions
  async generateSupportiveResponse(concernType, severity = 'medium') {
    const prompt = `Generate a caring, supportive response for someone showing signs of ${concernType}.

Severity: ${severity}
Context: College student peer support

Requirements:
- Warm and caring tone
- Not preachy or clinical
- Encourages professional help if severe
- Offers friendship and listening
- 2-3 sentences max

Return 3 different supportive response options.`;

    try {
      const response = await ragService.callOpenAI(prompt);
      return response.split('\n').filter(line => line.trim());
    } catch (error) {
      console.error('Supportive response generation failed:', error);
      return [
        "I'm here for you if you want to talk ❤️",
        "You're not alone in this. Want to grab coffee and chat?",
        "Thinking of you. Let me know if you need anything 🤗"
      ];
    }
  }

  // Log concerning patterns for review
  async logDistressPattern(userId, analysis) {
    try {
      const logEntry = {
        userId,
        timestamp: new Date().toISOString(),
        concernLevel: analysis.concernLevel,
        indicators: analysis.indicators,
        recommendedAction: analysis.recommendedAction
      };

      // Store in AsyncStorage for now (in production, would send to backend)
      const existingLogs = await AsyncStorage.getItem('distress_logs') || '[]';
      const logs = JSON.parse(existingLogs);
      logs.push(logEntry);
      
      // Keep only last 100 entries
      if (logs.length > 100) {
        logs.splice(0, logs.length - 100);
      }
      
      await AsyncStorage.setItem('distress_logs', JSON.stringify(logs));
    } catch (error) {
      console.error('Failed to log distress pattern:', error);
    }
  }

  // Get campus support resources
  getCampusSupportResources() {
    return {
      crisis: {
        title: "Crisis Support",
        resources: [
          { name: "National Suicide Prevention Lifeline", contact: "988", available: "24/7" },
          { name: "Crisis Text Line", contact: "Text HOME to 741741", available: "24/7" },
          { name: "Campus Crisis Hotline", contact: "Call Campus Safety", available: "24/7" }
        ]
      },
      counseling: {
        title: "Campus Counseling",
        resources: [
          { name: "Student Counseling Center", contact: "Visit Student Services", available: "Mon-Fri 8-5" },
          { name: "Peer Support Groups", contact: "Check Student Portal", available: "Various times" },
          { name: "Mental Health First Aid", contact: "Campus Health Center", available: "Walk-in hours" }
        ]
      },
      academic: {
        title: "Academic Support",
        resources: [
          { name: "Academic Advisor", contact: "Schedule via Portal", available: "Office hours" },
          { name: "Tutoring Center", contact: "Visit Library", available: "Daily" },
          { name: "Study Groups", contact: "Join via SnapConnect", available: "Peer organized" }
        ]
      }
    };
  }

  // Clean up resources
  cleanup() {
    this.moderationCache.clear();
  }
}

export default new ContentModerationService(); 