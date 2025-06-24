# 📸 Snapchat Clone

A React Native Snapchat clone built with Expo, Firebase, and NativeWind styling. Features real-time disappearing photos, user authentication, friends system, and more!

## ✨ Features

### Day 1 Features (Basic Setup)
- ✅ React Native with Expo
- ✅ NativeWind for styling (Tailwind CSS)
- ✅ Firebase Authentication (Email/Password)
- ✅ Basic navigation (Login, Home, Camera, Stories, Friends)
- ✅ User registration and login
- ✅ Protected routes

### Day 2 Features (Core Snapchat Features)
- ✅ Camera access with Expo Camera
- ✅ Photo capture and preview
- ✅ Upload photos to Firebase Storage
- ✅ Store photo metadata in Firestore
- ✅ Disappearing snaps (24-hour expiration)
- ✅ Friends system (add/remove friends)
- ✅ User search functionality
- ✅ Story viewer with timer
- ✅ Real-time feed updates

## 🚀 Getting Started

### Prerequisites

- Node.js (v14 or higher)
- Expo CLI: `npm install -g @expo/cli`
- Firebase account
- Mobile device with Expo Go app OR emulator

### Firebase Setup

1. **Create a Firebase project**
   - Go to [Firebase Console](https://console.firebase.google.com)
   - Create a new project
   - Enable Authentication, Firestore, and Storage

2. **Configure Authentication**
   - Go to Authentication > Sign-in method
   - Enable "Email/Password" provider

3. **Configure Firestore**
   - Go to Firestore Database
   - Create database in production mode
   - Set up these collections:
     - `users` - Store user profiles
     - `snaps` - Store snap metadata

4. **Configure Storage**
   - Go to Storage
   - Set up storage bucket for images

5. **Get your Firebase config**
   - Go to Project Settings > General
   - Scroll down to "Your apps"
   - Click "Web" and copy the config object

6. **Update firebaseConfig.js**
   ```javascript
   const firebaseConfig = {
     apiKey: "your-api-key",
     authDomain: "your-project.firebaseapp.com",
     projectId: "your-project-id",
     storageBucket: "your-project.appspot.com",
     messagingSenderId: "123456789",
     appId: "your-app-id"
   };
   ```

### Installation

1. **Clone and install dependencies**
   ```bash
   cd SnapchatClone
   npm install
   ```

2. **Update Firebase configuration**
   - Edit `firebaseConfig.js` with your Firebase credentials

3. **Start the development server**
   ```bash
   npm start
   ```

4. **Run on device/emulator**
   - Scan QR code with Expo Go app (iOS/Android)
   - Or press `i` for iOS simulator / `a` for Android emulator

## 📱 How to Use

### First Time Setup
1. Open the app
2. Sign up with email and password
3. Choose a unique username

### Taking and Sharing Snaps
1. Tap the Camera tab
2. Take a photo using the capture button
3. Review your photo
4. Tap "Share" to send to your story

### Adding Friends
1. Go to Friends tab
2. Search for users by username
3. Tap "Add" to send friend request
4. Friends can now see your snaps

### Viewing Snaps
1. Snaps from friends appear on Home feed
2. Tap a snap preview to view full screen
3. Snaps disappear after 10 seconds
4. Snaps expire after 24 hours

## 🏗️ Architecture

### Tech Stack
- **Frontend**: React Native with Expo
- **Styling**: NativeWind (Tailwind CSS for React Native)
- **Backend**: Firebase
  - Authentication: Email/Password
  - Database: Firestore
  - Storage: Firebase Storage
- **Navigation**: React Navigation 6

### Project Structure
```
src/
├── components/          # Reusable UI components
├── context/            # React Context (Auth)
├── hooks/              # Custom React hooks
├── screens/            # App screens
│   ├── LoginScreen.js
│   ├── SignupScreen.js
│   ├── HomeScreen.js
│   ├── CameraScreen.js
│   ├── StoriesScreen.js
│   └── FriendsScreen.js
└── services/           # API and utility functions
```

### Firebase Collections

**users**
```javascript
{
  username: string,
  email: string,
  createdAt: timestamp,
  friends: array<userId>
}
```

**snaps**
```javascript
{
  userId: string,
  username: string,
  imageUrl: string,
  createdAt: timestamp,
  expiresAt: timestamp,
  viewers: array<userId>
}
```

## 🎨 UI Design

The app uses Snapchat's signature color scheme:
- **Yellow**: `#FFFC00` (Snap Yellow)
- **Blue**: `#0CADE6` (Snap Blue)  
- **Purple**: `#7C3AED` (Snap Purple)

## 🔒 Security Features

- Firebase Authentication with email/password
- Firestore security rules (set up in Firebase Console)
- Photo expiration (24 hours)
- User-specific data access

## 📝 TODO / Future Features

- [ ] Push notifications
- [ ] Video snaps
- [ ] Snap replies
- [ ] Group chats
- [ ] Location sharing
- [ ] Filters and effects
- [ ] Snap memories/saved snaps

## 🐛 Troubleshooting

### Common Issues

1. **Camera not working**
   - Check permissions in app settings
   - Restart the app

2. **Firebase errors**
   - Verify your Firebase config
   - Check Firebase console for proper setup

3. **Styling issues**
   - Make sure NativeWind is properly configured
   - Check babel.config.js and tailwind.config.js

4. **Navigation errors**
   - Clear metro cache: `npx expo start --clear`

## 📄 License

This project is for educational purposes. Snapchat is a trademark of Snap Inc.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

---

**Happy Snapping! 📸👻** 