# SnapConnect 👻

A modern, feature-rich social media application inspired by Snapchat, built with React Native, Expo, and Firebase. SnapConnect allows users to capture, share, and connect through ephemeral photo sharing and real-time social interactions.

## ✨ Features

### 🔐 Authentication System
- **User Registration**: Create new accounts with email and password
- **Secure Login**: Firebase Authentication integration
- **User Profiles**: Personalized username and profile management
- **Session Management**: Persistent login state with automatic token refresh

### 📸 Camera & Media
- **Real-time Camera**: Native camera integration with Expo Camera
- **Photo Capture**: High-quality photo capture with front/back camera toggle
- **Media Library**: Save and access captured content
- **Photo Sharing**: Upload and share snaps with friends
- **Ephemeral Content**: Auto-expiring photos (24-hour lifespan)

### 👥 Social Features
- **Friend Management**: Add, remove, and manage friend connections
- **User Discovery**: Search users by username
- **Friend Lists**: View and organize your social network
- **Social Interactions**: Connect with friends through shared experiences

### 🏠 Content Feeds
- **Stories Feed**: Browse friend stories and updates
- **Home Feed**: Personalized content stream
- **Real-time Updates**: Live content synchronization
- **Interactive UI**: Intuitive swipe and tap navigation

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

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Expo CLI
- iOS Simulator or Android Emulator (for testing)
- Firebase account (for production deployment)

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

- **Video Support**: Record and share video snaps
- **Filters & Effects**: AR filters and photo effects
- **Chat System**: Direct messaging between friends
- **Group Features**: Group chats and shared stories
- **Push Notifications**: Real-time notifications
- **Location Features**: Snap Map and location sharing
- **Story Highlights**: Save favorite stories
- **Advanced Privacy**: Enhanced privacy controls

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
- Contact: [your-email@example.com]
- Documentation: [Link to detailed docs]

---

**Made with ❤️ for connecting people through moments**