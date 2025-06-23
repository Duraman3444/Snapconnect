import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';

// Firebase configuration for SnapConnect
const firebaseConfig = {
  apiKey: "AIzaSyDuMunm57Fd05d2mUcvP53tELj1fBsK9Kk",
  authDomain: "snapconnect-web.firebaseapp.com",
  projectId: "snapconnect-web",
  storageBucket: "snapconnect-web.firebasestorage.app",
  messagingSenderId: "827287147167",
  appId: "1:827287147167:web:305850f01b23349a2708aa",
  measurementId: "G-4LZGSRPX3C"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

// Export the app instance
export default app;

// Firebase Collections (for consistent naming)
export const COLLECTIONS = {
  USERS: 'users',
  MESSAGES: 'messages',
  CONVERSATIONS: 'conversations',
  STORIES: 'stories',
  STORY_HIGHLIGHTS: 'story_highlights',
  FRIEND_REQUESTS: 'friend_requests',
  USER_TOKENS: 'user_tokens', // For push notifications
  REPORTS: 'reports', // For content moderation
} as const;

// Firebase Storage paths
export const STORAGE_PATHS = {
  PROFILE_PHOTOS: 'profile_photos',
  MESSAGE_MEDIA: 'message_media',
  STORY_MEDIA: 'story_media',
  TEMP_UPLOADS: 'temp_uploads',
} as const; 