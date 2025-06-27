# SnapConnect - Second Brain Knowledge Base 🧠

**Version:** 1.0  
**Last Updated:** December 2024  
**Purpose:** Comprehensive knowledge base for SnapConnect development and maintenance

---

## 🎯 Project Overview & Vision

### What is SnapConnect?
SnapConnect is an **AI-powered social platform specifically designed for college students** to build meaningful academic and social connections using advanced RAG (Retrieval-Augmented Generation) technology.

### Strategic Position
- **Target Users:** Social Connectors (College Students, Ages 18-24)
- **Core Focus:** Academic success + Social connection through AI
- **Market:** 50K+ students across 100+ universities (12-month goal)
- **Competitive Edge:** RAG-powered intelligent matching and recommendations

### Vision Statement
To revolutionize college social networking by creating the most intelligent and supportive platform that helps students build meaningful connections, succeed academically, and thrive socially throughout their university experience.

---

## 🏗️ Technical Architecture

### Technology Stack

#### Frontend (React Native + Expo)
```json
{
  "react-native": "0.79.4",
  "expo": "~53.0.12",
  "react": "19.0.0",
  "nativewind": "^2.0.11",
  "tailwindcss": "^3.3.0"
}
```

#### Backend & Database
```json
{
  "@supabase/supabase-js": "^2.50.0",
  "openai": "^5.8.1",
  "axios": "^1.10.0"
}
```

#### Key Libraries
```json
{
  "expo-camera": "^16.1.8",
  "expo-av": "^15.1.6",
  "expo-image-picker": "~15.0.7",
  "react-native-view-shot": "^4.0.3",
  "@react-navigation/native": "^7.1.14"
}
```

### Architecture Pattern
```
┌─────────────────┐
│   App.js        │  ← Entry point & navigation
└─────────────────┘
         │
┌─────────────────┐
│  AuthProvider   │  ← Global authentication state
└─────────────────┘
         │
┌─────────────────┐
│  Screen Layer   │  ← Individual app screens (35+ screens)
└─────────────────┘
         │
┌─────────────────┐
│  Service Layer  │  ← RAG & Supabase services
└─────────────────┘
```

---

## 🚀 Development Setup

### Quick Start Commands
```bash
# Navigate to app directory
cd SnapchatClone

# Install dependencies
npm install

# Start development server
npm start
# or
expo start

# Platform-specific starts
npm run ios     # iOS simulator
npm run android # Android emulator  
npm run web     # Web browser
```

### Prerequisites Checklist
- ✅ Node.js (v16+)
- ✅ npm/yarn
- ✅ Expo CLI
- ✅ iOS Simulator or Android Emulator
- ✅ Supabase account (production)

---

## 📱 Features & Implementation Status

### 🎓 Core RAG-Powered Features

#### 1. Smart Study Group Formation
- **Status:** Conceptual/Planning phase
- **Implementation:** RAG-based matching algorithm
- **Files:** TutoringMarketplaceScreen.js (foundation exists)
- **Features:** Course enrollment analysis, compatibility scoring, meeting time optimization

#### 2. Intelligent Campus Event Discovery  
- **Status:** Basic implementation exists
- **Implementation:** Event recommendation engine
- **Files:** CampusScreen.js, SimpleCampusScreen.js
- **Features:** Interest-based filtering, social context analysis

#### 3. Academic Resource Sharing Network
- **Status:** Framework implemented
- **Implementation:** Course-specific resource sharing
- **Files:** CourseHashtagsScreen.js, TextbookExchangeScreen.js
- **Features:** Quality rating system, peer reviews

#### 4. Campus Social Navigation
- **Status:** Basic implementation
- **Implementation:** Location and activity recommendations
- **Files:** CampusScreen.js, RideSharingScreen.js
- **Features:** Mood-based suggestions, crowd predictions

#### 5. Course and Professor Insights
- **Status:** Implemented
- **Implementation:** Review aggregation and analysis
- **Files:** ProfessorReviewsScreen.js
- **Features:** Grade analysis, workload assessment

#### 6. Social Interest Matching
- **Status:** Foundation exists
- **Implementation:** Compatibility-based friend recommendations
- **Files:** FriendsScreen.js
- **Features:** Interest analysis, conversation starters

### 📸 Advanced Photo Editing System
- **Status:** ✅ FULLY IMPLEMENTED
- **Files:** CameraScreen.js (1990 lines)
- **Features:** 
  - 7 professional filters (Normal, Warm, Cool, Vintage, B&W, Vibrant, Dark)
  - Text overlays with shadow effects
  - Gesture controls (swipe navigation)
  - High-quality capture (90% JPEG quality)
  - ViewShot integration

### 💬 Messaging & Communication
- **Status:** ✅ IMPLEMENTED
- **Files:** 
  - `ChatScreen.js` (1226 lines) - Individual conversations
  - `ChatsListScreen.js` (475 lines) - Message threads
  - `CreateGroupScreen.js` (449 lines) - Group creation
- **Features:**
  - Real-time messaging
  - Group conversations
  - Ephemeral messaging support
  - Media sharing

### 🎮 Gamification & Engagement
- **Status:** ✅ IMPLEMENTED  
- **Files:** 
  - `GamificationScreen.js` (601 lines)
  - `SeasonalFeaturesScreen.js` (374 lines)
  - `GradeCelebrationsScreen.js` (770 lines)
- **Features:**
  - Achievement system
  - Seasonal events
  - Grade celebrations
  - Leaderboards

### 🏥 Mental Health & Wellness
- **Status:** ✅ IMPLEMENTED
- **Files:** `MentalHealthScreen.js` (895 lines)
- **Features:**
  - Mood tracking
  - Resource recommendations
  - Crisis support integration
  - Peer support groups

### 🎓 Academic Features
- **Status:** ✅ IMPLEMENTED
- **Files:**
  - `SimpleAcademicScreen.js` (895 lines)
  - `AcademicCalendarScreen.js` (436 lines)  
  - `CourseHashtagsScreen.js` (696 lines)
- **Features:**
  - Course management
  - Academic calendar
  - Study scheduling
  - Course discussions

---

## 🗄️ Database & Backend Configuration

### Current Setup: Supabase
- **Configuration File:** `supabaseConfig.js`
- **Auth Provider:** `SupabaseAuthContext.js`
- **Database:** PostgreSQL with Row Level Security (RLS)

### Database Setup Scripts
```sql
-- Core database setup
COMPLETE_DATABASE_SETUP.sql
COMPLETE_DATABASE_FIX.sql

-- Messaging system
MESSAGING_SYSTEM_SETUP_GUIDE.md
FINAL_GROUP_MESSAGING_FIX.sql
EPHEMERAL_MESSAGING_SETUP.sql

-- Academic features  
ACADEMIC_CAMPUS_SETUP.sql
ACADEMIC_SOCIAL_FEATURES_SETUP.sql

-- Gamification
GAMIFICATION_DATABASE_SETUP.sql
SEASONAL_FEATURES_DATABASE_SETUP.sql

-- Video support
VIDEO_SUPPORT_DATABASE_SETUP.sql
```

### RAG Service Implementation
- **File:** `src/services/ragService.js`
- **AI Integration:** OpenAI API integration
- **Features:** Intelligent recommendations, content analysis, user matching

---

## 📂 Key Files & Directories

### 🔑 Critical Files

#### `App.js` - Application Entry Point
- Navigation setup
- Authentication routing  
- Theme provider integration
- Global app initialization

#### `supabaseConfig.js` - Backend Configuration
- Database connection settings
- Authentication configuration
- Storage bucket setup
- Real-time subscriptions

#### Core Context Providers
- `src/context/SupabaseAuthContext.js` - Authentication state
- `src/context/ThemeContext.js` - UI theme management

### 📱 Screen Categories

#### Authentication (2 screens)
- `LoginScreen.js` (143 lines)
- `SignupScreen.js` (131 lines)

#### Core Social Features (6 screens)
- `HomeScreen.js` (540 lines) - Main feed
- `CameraScreen.js` (1990 lines) - Photo capture & editing
- `StoriesScreen.js` (586 lines) - Story viewing
- `FriendsScreen.js` (547 lines) - Friend management
- `ProfileScreen.js` (616 lines) - User profile
- `RAGHomeScreen.js` (448 lines) - AI-powered home

#### Messaging (3 screens)
- `ChatScreen.js` (1226 lines) - Individual chats
- `ChatsListScreen.js` (475 lines) - Message threads
- `CreateGroupScreen.js` (449 lines) - Group creation

#### Academic Features (8 screens) 
- `SimpleAcademicScreen.js` (895 lines) - Academic dashboard
- `TutoringMarketplaceScreen.js` (1330 lines) - Tutoring platform
- `CourseHashtagsScreen.js` (696 lines) - Course discussions
- `ProfessorReviewsScreen.js` (850 lines) - Professor ratings
- `AcademicCalendarScreen.js` (436 lines) - Calendar integration
- `TextbookExchangeScreen.js` (62 lines) - Book trading
- `GradeCelebrationsScreen.js` (770 lines) - Achievement celebrations
- `ScholarshipAlertsScreen.js` (62 lines) - Scholarship notifications

#### Campus Life (10 screens)
- `CampusScreen.js` (721 lines) - Campus activities
- `SimpleCampusScreen.js` (1187 lines) - Simplified campus view
- `LostAndFoundScreen.js` (577 lines) - Lost items system
- `FoodDeliveryGroupsScreen.js` (389 lines) - Food ordering groups
- `RideSharingScreen.js` (348 lines) - Campus transportation
- `PartySafetyScreen.js` (294 lines) - Safety features
- `SplitBillCalculatorScreen.js` (62 lines) - Expense splitting
- `CampusJobBoardScreen.js` (62 lines) - Job postings
- `MentalHealthScreen.js` (895 lines) - Wellness support
- `MediaCleanupScreen.js` (414 lines) - Storage management

#### Career & Professional (4 screens)
- `SkillsShowcaseScreen.js` (62 lines) - Portfolio display
- `LinkedInIntegrationScreen.js` (62 lines) - Professional networking
- `InternshipSharingScreen.js` (62 lines) - Internship opportunities
- `CareerFairNetworkingScreen.js` (62 lines) - Career events

#### Gamification (2 screens)
- `GamificationScreen.js` (601 lines) - Achievement system
- `SeasonalFeaturesScreen.js` (374 lines) - Seasonal events

### 🛠️ Utility & Service Files

#### Services Directory
- `ragService.js` - RAG/AI functionality
- `userProfileService.js` - Profile management

#### Utils Directory  
- `imageDebugger.js` - Image debugging tools
- `mediaCleanup.js` - Storage cleanup utilities

#### Components Directory
- `AIAssistant.js` - AI chat interface
- `FloatingAIButton.js` - Quick AI access
- `ErrorBoundary.js` - Error handling
- `ImageWithFallback.js` - Robust image loading
- `DebugAccountSwitcher.js` - Development tool

---

## 🐛 Known Issues & Troubleshooting

### Common Development Issues

#### 1. Missing Start Script Error
**Issue:** `npm error Missing script: "start"`
**Solution:** 
```bash
# Always run from SnapchatClone directory, not root
cd SnapchatClone
npm start
```

#### 2. Supabase Connection Issues
**Files to Check:**
- `supabaseConfig.js` - Verify connection settings
- `SUPABASE_TROUBLESHOOTING.md` - Detailed debugging guide
- `EMERGENCY_RLS_FIX.sql` - Row Level Security fixes

#### 3. Image Upload Problems
**Debugging Files:**
- `src/utils/imageDebugger.js` - Image debugging utilities
- `EMERGENCY_AVATAR_FIX.sql` - Avatar upload fixes
- `RLS_PHOTO_FIX_CLEAN.sql` - Photo permissions

#### 4. Messaging System Issues
**Fix Scripts:**
- `COMPLETE_MESSAGING_VIDEO_FIX.sql`
- `FINAL_GROUP_MESSAGING_FIX.sql`
- `EPHEMERAL_MESSAGING_FIX_CLEAN.sql`

### Emergency Fix Procedures
1. **Database Issues:** Run `COMPLETE_DATABASE_FIX.sql`
2. **Storage Problems:** Execute `FINAL_STORAGE_FIX.sql`
3. **Broken Images:** Apply `CLEANUP_BROKEN_IMAGES.sql`
4. **Foreign Key Errors:** Use `DATABASE_FIX_FOREIGN_KEYS.sql`

---

## 🤖 RAG Implementation Deep Dive

### RAG Service Architecture
```javascript
// src/services/ragService.js structure
class RAGService {
  // Retrieval: Fetch relevant data
  async retrieveUserData(userId, context)
  
  // Augmentation: Process with AI
  async augmentWithAI(data, userQuery)
  
  // Generation: Create recommendations
  async generateRecommendations(augmentedData)
}
```

### AI Integration Points
1. **Study Group Matching:** Course + schedule + personality analysis
2. **Event Recommendations:** Interest + social graph + attendance patterns  
3. **Resource Discovery:** Course content + quality ratings + success metrics
4. **Social Matching:** Interest compatibility + social graph analysis
5. **Campus Navigation:** Real-time context + mood + social goals
6. **Academic Insights:** Performance data + learning style + outcome prediction

### RAG Data Sources
- User profiles and preferences
- Course enrollment and academic data
- Social interaction patterns
- Campus event and facility data
- Academic resource quality ratings
- Peer review and feedback data

---

## 📋 User Stories & Product Requirements

### Core User Personas

#### 1. The Campus Connector (Alex, 20)
- **Goals:** Meet like-minded students, discover events, build study groups
- **Pain Points:** Large campus navigation, relevant event discovery
- **Usage:** Daily sharing, active connection seeking, event participation

#### 2. The Academic Collaborator (Maya, 19)  
- **Goals:** Find study partners, academic support, balance social/academic life
- **Pain Points:** Finding serious study partners, academic stress management
- **Usage:** Study session sharing, classmate connections, academic groups

#### 3. The Social Explorer (Jordan, 21)
- **Goals:** Build social network, discover campus culture, overcome social anxiety
- **Pain Points:** Transfer student isolation, unfamiliar social dynamics
- **Usage:** Active feature exploration, inclusive activity seeking

### Success Metrics
- **User Acquisition:** 50K+ students across 100+ universities (12 months)
- **Academic Success:** 80% improved study group effectiveness
- **Social Connection:** 70% form 3+ new friendships per semester
- **Platform Engagement:** 25+ AI interactions per user per week
- **Student Retention:** 85% semester-to-semester retention
- **RAG Effectiveness:** 90% user satisfaction with AI recommendations

---

## 🚦 Current Development Status

### ✅ COMPLETED FEATURES
- **Photo Editing System** - Full implementation with 7 filters
- **Messaging Platform** - Real-time chat with groups and ephemeral messaging
- **Academic Dashboard** - Course management and professor reviews
- **Campus Features** - Event discovery and campus navigation
- **Gamification System** - Achievements and seasonal features
- **Mental Health Support** - Mood tracking and resource recommendations
- **User Authentication** - Supabase-powered auth system

### 🔄 IN PROGRESS
- **RAG Service Integration** - AI-powered recommendations
- **Study Group Matching** - Intelligent academic partnerships
- **Advanced Event Discovery** - Personalized campus activity suggestions

### 📋 PLANNED FEATURES
- **University Integrations** - LMS and campus service connections
- **Career Services** - Professional networking and internship matching
- **Advanced Analytics** - Academic success tracking and insights
- **Global Expansion** - International university support

---

## 🎯 Strategic Next Steps

### Immediate Priorities (Next 30 Days)
1. **Complete RAG Service Implementation**
   - Finish `ragService.js` integration
   - Implement study group matching algorithm
   - Add event recommendation engine

2. **Database Optimization**
   - Run latest database fix scripts
   - Optimize query performance
   - Implement proper indexing

3. **User Testing Preparation**
   - Set up analytics tracking
   - Prepare beta testing environment
   - Create user feedback collection system

### Medium-term Goals (3-6 Months)
1. **Pilot University Partnerships**
   - Launch at 2-3 universities
   - Gather user feedback and metrics
   - Refine RAG algorithms based on real usage

2. **Feature Enhancement**
   - Advanced AI recommendations
   - Professional networking features
   - Career services integration

3. **Platform Scaling**
   - Performance optimization
   - Infrastructure scaling
   - Multi-university support

### Long-term Vision (6-12 Months)
1. **Scale to 100+ Universities**
2. **Advanced AI Features** - Enhanced RAG capabilities
3. **University System Integrations** - LMS connections
4. **Professional Networking** - Career development features
5. **Global Expansion** - International university support

---

## 📚 Documentation Index

### Setup & Configuration
- `README.md` - Main project documentation
- `SUPABASE_SETUP.md` - Backend configuration guide
- `SUPABASE_TROUBLESHOOTING.md` - Debugging guide

### Product & Strategy
- `PRODUCT_REQUIREMENTS_DOCUMENT.md` - Comprehensive PRD
- `STRATEGIC_FOCUS_SUMMARY.md` - Strategic decisions
- `PROJECT_STRUCTURE.md` - Codebase organization

### Feature Guides
- `PHOTO_EDITING_SYSTEM_GUIDE.md` - Photo editing documentation
- `MESSAGING_SYSTEM_SETUP_GUIDE.md` - Chat system guide
- `EPHEMERAL_MESSAGING_GUIDE.md` - Disappearing messages
- `GROUP_MESSAGING_SETUP_GUIDE.md` - Group chat setup
- `FRIEND_SYSTEM_TESTING_GUIDE.md` - Social features testing

### Academic Features
- `ACADEMIC_CAMPUS_FEATURES_GUIDE.md` - Campus feature documentation
- `ACADEMIC_SOCIAL_FEATURES_IMPLEMENTATION_GUIDE.md` - Academic social features
- `GAMIFICATION_SEASONAL_FEATURES_GUIDE.md` - Gamification system
- `RAG_IMPLEMENTATION_COMPLETE.md` - AI implementation guide

### Database & Infrastructure
- `COMPLETE_DATABASE_SETUP.sql` - Full database initialization
- `VIDEO_SUPPORT_README.md` - Video feature documentation
- `AI_SETUP_GUIDE.md` - AI integration guide

### Emergency & Maintenance
- `EMERGENCY_FIXES_GUIDE.md` - Critical issue resolution
- `RUN_GROUP_MESSAGING_FIXES.md` - Messaging system repairs
- `REAL_TIME_MESSAGING_FIX.md` - Real-time features

---

## 🤝 Contributing & Development

### Code Standards
- **React Native/Expo** development patterns
- **Functional components** with hooks
- **TailwindCSS** for styling
- **TypeScript** integration planned
- **ESLint** for code quality

### Git Workflow
- **Main branch:** Production-ready code
- **Feature branches:** Individual feature development
- **Pull requests:** Code review and integration
- **Semantic commits:** Clear commit messaging

### Testing Strategy
- **Manual testing:** Expo development environment
- **User testing:** University pilot programs
- **Performance testing:** Large dataset simulation
- **A/B testing:** Feature effectiveness measurement

---

## 🔐 Security & Privacy

### Data Protection
- **University email verification** for account creation
- **Row Level Security (RLS)** in Supabase
- **Encrypted sensitive data** storage
- **GDPR compliance** considerations

### User Privacy Controls
- **Granular privacy settings** for academic and social data
- **Selective profile visibility** controls
- **Data deletion** and account management
- **Anonymous feedback** options

---

## 📊 Analytics & Metrics

### Key Tracking Points
- **User engagement** - Daily/weekly active users
- **Feature adoption** - Screen usage and interaction rates
- **Academic success** - Study group effectiveness metrics
- **Social connection** - Friendship formation rates
- **RAG performance** - Recommendation accuracy and satisfaction

### Success Measurement
- **Academic outcomes** - GPA improvements, study effectiveness
- **Social outcomes** - New friendship formation, event attendance
- **Platform health** - User retention, engagement depth
- **AI effectiveness** - Recommendation click-through rates, user satisfaction

---

## 🌟 Competitive Advantages

### What Makes SnapConnect Unique
1. **AI-First Approach** - RAG technology for intelligent experiences
2. **College-Specific Focus** - Purpose-built for student needs
3. **Academic Integration** - Social networking + academic success
4. **Measurable Outcomes** - Clear metrics for success
5. **Scalable Intelligence** - AI improves with more data

### Market Differentiation
- **vs. General Social Media:** Education-focused, meaningful connections
- **vs. Study Apps:** Social component, comprehensive platform
- **vs. University Systems:** Modern UX, AI-powered, cross-institutional

---

**Last Updated:** December 2024  
**Next Review:** Quarterly  
**Maintainer:** Development Team  

---

*This document serves as the central knowledge base for SnapConnect. Keep it updated with major changes, new features, and strategic decisions.* 