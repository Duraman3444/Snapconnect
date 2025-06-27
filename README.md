# SnapConnect 👻

An AI-powered social platform specifically designed for college students to build meaningful academic and social connections. Using advanced RAG (Retrieval-Augmented Generation) technology, SnapConnect intelligently matches students with study partners, recommends relevant campus events, facilitates academic resource sharing, and helps students navigate campus social life more effectively.

## ✨ Core RAG-Powered Features

### 🎓 Smart Study Group Formation
- **AI Matching**: Automatically match with classmates based on course enrollment, study goals, and schedules
- **Compatibility Scoring**: Intelligent algorithms analyze learning styles and academic performance patterns
- **Success Metrics**: Track study group effectiveness and academic improvement

### 🎉 Intelligent Campus Event Discovery
- **Personalized Recommendations**: AI-powered event suggestions based on interests and social preferences
- **Social Context**: See which friends are attending and get relevance scores
- **Interest Analysis**: Machine learning algorithms predict event satisfaction

### 📚 Academic Resource Sharing Network
- **Course-Specific Resources**: Find and share notes, study guides, and project examples by course
- **Quality Rating System**: Peer reviews and professor endorsements for shared content
- **Performance Correlation**: Track academic success improvement through resource usage

### 🗺️ Campus Social Navigation
- **Contextual Recommendations**: Get personalized suggestions for campus spaces and activities based on mood and goals
- **Real-time Intelligence**: Crowd level predictions, friend availability, and social situation assessment
- **Mood-Based Matching**: AI analysis of current context and social needs

### 📊 Course and Professor Insights
- **Registration Support**: Intelligent course recommendations based on learning style and career goals
- **Academic Analytics**: Aggregated student experiences and outcome predictions
- **Difficulty Assessment**: Workload analysis and success probability scoring

### 🤝 Social Interest Matching
- **Friendship Recommendations**: Connect with students who share hobbies and interests
- **Compatibility Analysis**: Social graph analysis and personality matching
- **Conversation Starters**: AI-generated icebreakers and common interest identification

### 🔐 Authentication & Profile System
- **University Verification**: Student email authentication for campus-specific access
- **Academic Integration**: Course enrollment and interest profiling
- **Privacy Controls**: Granular settings for academic and social data sharing

### 🎨 User Experience
- **Modern UI**: Clean, minimalist design with Snapchat-inspired aesthetics
- **Customizable Themes**: Dark/Light mode toggle with multiple wallpaper options
- **Profile Management**: Comprehensive settings for account customization
- **Responsive Design**: Optimized for various screen sizes
- **Smooth Animations**: Fluid transitions and interactions
- **Accessibility**: User-friendly navigation and controls

### ⚙️ Profile & Settings
- **Account Management**: Change username, email, and password
- **Theme Customization**: Toggle between dark and light modes
- **Wallpaper Selection**: Choose from multiple color-themed wallpapers
- **Privacy Controls**: Manage your account privacy settings
- **Notification Settings**: Configure your notification preferences

### 📸 **NEW: Advanced Photo Editing System**
- **Immediate Editor**: Photo editing screen appears instantly after taking photos
- **7 Professional Filters**: Normal, Warm, Cool, Vintage, B&W, Vibrant, Dark with swipe navigation
- **Text Overlays**: Add styled text captions with shadow effects and multi-line support
- **Gesture Controls**: Swipe left/right to cycle through filters with visual feedback
- **High-Quality Capture**: ViewShot integration captures edited photos at 90% JPEG quality
- **Seamless Sharing**: All filters and text are permanently applied to shared photos and stories
- **Intuitive Interface**: Full-screen editing with top/bottom control bars and visual indicators

> 📚 **[View Complete Photo Editing Documentation](PHOTO_EDITING_SYSTEM_GUIDE.md)**

## 🎯 Target Demographic

### Primary Users: Social Connectors (College Students)
- **Age Range**: 18-24 years old
- **Education Level**: Currently enrolled in colleges/universities (undergraduate and graduate)
- **User Type**: Social Connectors who prioritize building and maintaining relationships
- **Tech Comfort**: Tech-native generation comfortable with mobile-first applications

### Key Characteristics:
- **Academic Focus**: Actively seeking study partners and academic collaboration
- **Social Goals**: Building new friendships and professional networks on campus
- **Campus Engagement**: Interested in campus activities, events, and student organizations
- **Work-Life Balance**: Need to balance academic responsibilities with social life
- **Authentic Connections**: Value meaningful relationships over superficial interactions

### User Personas:
1. **The Campus Connector**: Outgoing students involved in multiple organizations, seeking to expand their network
2. **The Academic Collaborator**: High-achieving students looking for serious study partners and academic support
3. **The Social Explorer**: Transfer students or newcomers seeking to integrate into campus community

### Pain Points We Address:
- Difficulty finding compatible study partners across large campuses
- Missing out on relevant campus events and activities
- Challenges in building meaningful social connections
- Academic stress and need for peer support
- Social anxiety and integration challenges for new students

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Expo CLI
- iOS Simulator or Android Emulator (for testing)
- Supabase account (for production deployment)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/snapconnect.git
   cd snapconnect
   ```

2. **Install dependencies**
   ```bash
   cd SnapchatClone
   npm install
   ```

3. **Start the development server**
   ```bash
   npm start
   # or
   expo start
   ```

4. **Run on device/emulator**
   ```bash
   # For iOS
   npm run ios
   
   # For Android
   npm run android
   
   # For Web
   npm run web
   ```

## 🛠️ Technical Stack

### Frontend
- **React Native**: Cross-platform mobile development
- **Expo**: Development platform and toolchain
- **React Navigation**: Navigation and routing
- **NativeWind**: Tailwind CSS for React Native
- **Expo Camera**: Camera functionality
- **Expo Media Library**: Media access and management

### Backend & Database
- **Firebase Authentication**: User authentication and management
- **Cloud Firestore**: NoSQL document database
- **Firebase Storage**: File and media storage
- **Real-time Database**: Live data synchronization

### Development Tools
- **Babel**: JavaScript compiler
- **Tailwind CSS**: Utility-first CSS framework
- **Expo Development Tools**: Debugging and testing

## 📁 Project Structure

```
SnapchatClone/
├── App.js                 # Main application component
├── firebaseConfig.js      # Firebase configuration
├── src/
│   ├── components/        # Reusable UI components
│   ├── context/          # React contexts
│   │   ├── AuthContext.js     # Authentication context
│   │   └── ThemeContext.js    # Theme and appearance context
│   ├── screens/          # Application screens
│   │   ├── CameraScreen.js    # Main camera interface
│   │   ├── HomeScreen.js      # Home/chat feed
│   │   ├── FriendsScreen.js   # Friend management
│   │   ├── StoriesScreen.js   # Stories feed
│   │   ├── ProfileScreen.js   # User profile and settings
│   │   ├── LoginScreen.js     # User login
│   │   └── SignupScreen.js    # User registration
│   ├── hooks/            # Custom React hooks
│   └── services/         # API and external services
├── assets/               # Static assets (images, icons)
└── package.json          # Project dependencies
```

## 🔧 Configuration

### Firebase Setup (Production)
1. Create a new Firebase project
2. Enable Authentication (Email/Password)
3. Create a Firestore database
4. Setup Firebase Storage
5. Add your Firebase config to `firebaseConfig.js`

### Mock Mode (Development)
The app currently runs in mock mode for development purposes. All Firebase services are mocked to allow immediate testing without Firebase setup.

## 📱 App Flow

1. **Launch**: Users see the loading screen with SnapConnect branding
2. **Authentication**: New users sign up, existing users log in
3. **Camera**: Main interface - capture and share photos
4. **Navigation**: 
   - Left swipe: Friends screen
   - Right swipe: Stories feed
   - Top-right profile button: User profile and settings
   - Bottom navigation: Home feed with profile access
5. **Profile**: Customize themes, manage account, change settings
6. **Social**: Add friends, view stories, share content

## 🎯 Future Enhancements

### Academic Features
- **AI Study Scheduling**: Optimize study schedules using machine learning
- **Academic Performance Prediction**: Early intervention for academic success
- **LMS Integration**: Connect with university learning management systems
- **Tutoring Connections**: AI-powered tutor and mentor matching

### Social Intelligence
- **Advanced Group Formation**: Multi-criteria group formation for projects and activities
- **Social Skills Development**: Guided interactions for shy or introverted students
- **Mental Health Support**: Connect students with wellness resources and peer support
- **Campus Culture Integration**: Specialized onboarding for transfer and international students

### Campus Integration
- **Campus Services**: Integration with dining, transportation, and facility services
- **Career Networking**: Professional networking and internship matching
- **Alumni Connections**: Connect current students with alumni mentors
- **Campus Safety**: Emergency notifications and safety check-ins

### Technology Enhancements
- **Advanced RAG**: More sophisticated retrieval and generation algorithms
- **Voice Interaction**: Voice-powered queries and recommendations
- **AR Campus Navigation**: Augmented reality for campus wayfinding
- **Predictive Analytics**: Anticipate student needs and proactive recommendations

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by Snapchat's innovative approach to ephemeral content
- Built with love using React Native and Expo
- Firebase for providing robust backend services
- The open-source community for amazing tools and libraries

## 📞 Support

For support, questions, or feedback:
- Open an issue on GitHub
---

**Made with ❤️ for connecting people through moments**
