import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  updatePassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  User as FirebaseUser,
  UserCredential,
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, COLLECTIONS } from './config';
import { User, AuthUser, UserSettings } from '../../types/User';

export class AuthService {
  // Sign up with email and password
  static async signUp(
    email: string,
    password: string,
    username: string,
    displayName: string
  ): Promise<User> {
    try {
      console.log('🔥 Creating Firebase Auth user...');
      // Create Firebase user
      const userCredential: UserCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      
      const firebaseUser = userCredential.user;
      console.log('✅ Firebase Auth user created');
      
      console.log('📝 Updating Firebase profile...');
      // Update Firebase profile
      await updateProfile(firebaseUser, {
        displayName,
      });
      console.log('✅ Firebase profile updated');
      
      // Send email verification (temporarily disabled for testing)
      // await sendEmailVerification(firebaseUser);
      
      // Create user document in Firestore
      const defaultSettings: UserSettings = {
        privacy: {
          storyVisibility: 'friends',
          messageVisibility: 'friends',
          locationSharing: false,
        },
        notifications: {
          messages: true,
          stories: true,
          friendRequests: true,
        },
        theme: 'auto',
      };
      
      const now = new Date();
      const newUser: User = {
        uid: firebaseUser.uid,
        email,
        username: username.toLowerCase(),
        displayName,
        ...(firebaseUser.photoURL && { photoURL: firebaseUser.photoURL }),
        ...(firebaseUser.phoneNumber && { phoneNumber: firebaseUser.phoneNumber }),
        bio: '',
        interests: [],
        friends: [],
        blockedUsers: [],
        settings: defaultSettings,
        createdAt: now,
        lastSeen: now,
        isOnline: true,
      };
      
      // Create Firestore document with server timestamps
      const firestoreUser = {
        ...newUser,
        createdAt: serverTimestamp(),
        lastSeen: serverTimestamp(),
      };
      
      // Remove any undefined values recursively
      const cleanObject = (obj: any): any => {
        if (obj === null || obj === undefined) return null;
        if (typeof obj !== 'object') return obj;
        
        const cleaned: any = {};
        Object.entries(obj).forEach(([key, value]) => {
          if (value !== undefined) {
            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
              const cleanedNested = cleanObject(value);
              if (Object.keys(cleanedNested).length > 0) {
                cleaned[key] = cleanedNested;
              }
            } else {
              cleaned[key] = value;
            }
          }
        });
        return cleaned;
      };
      
      const cleanedFirestoreUser = cleanObject(firestoreUser);
      
      console.log('📝 Creating user document in Firestore...');
      console.log('🔍 User data being sent to Firestore:', JSON.stringify(cleanedFirestoreUser, null, 2));
      
      // Check for undefined values
      const hasUndefined = Object.entries(cleanedFirestoreUser).some(([key, value]) => {
        if (value === undefined) {
          console.error(`🚨 Found undefined value for key: ${key}`);
          return true;
        }
        if (typeof value === 'object' && value !== null) {
          const nestedUndefined = Object.entries(value).some(([nestedKey, nestedValue]) => {
            if (nestedValue === undefined) {
              console.error(`🚨 Found undefined value for nested key: ${key}.${nestedKey}`);
              return true;
            }
            return false;
          });
          return nestedUndefined;
        }
        return false;
      });
      
      if (hasUndefined) {
        console.error('🚨 Cannot save document with undefined values');
        throw new Error('Document contains undefined values');
      }
      
      try {
        await setDoc(doc(db, COLLECTIONS.USERS, firebaseUser.uid), cleanedFirestoreUser);
        console.log('✅ User document created successfully');
      } catch (firestoreError: any) {
        console.error('🚨 Firestore write failed:', firestoreError);
        throw firestoreError;
      }
      
      return newUser;
    } catch (error: any) {
      console.error('🚨 Signup error details:', error);
      console.error('🚨 Error code:', error.code);
      console.error('🚨 Error message:', error.message);
      console.error('🚨 Full error:', JSON.stringify(error, null, 2));
      throw new Error(this.getAuthErrorMessage(error.code) || error.message || 'Signup failed');
    }
  }
  
  // Sign in with email and password
  static async signIn(email: string, password: string): Promise<User> {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      // Update last seen and online status
      await this.updateUserStatus(firebaseUser.uid, true);
      
      // Get user data from Firestore
      const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, firebaseUser.uid));
      
      if (!userDoc.exists()) {
        throw new Error('User profile not found');
      }
      
      return userDoc.data() as User;
    } catch (error: any) {
      throw new Error(this.getAuthErrorMessage(error.code));
    }
  }
  
  // Sign out
  static async signOut(): Promise<void> {
    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        // Update online status to false
        await this.updateUserStatus(currentUser.uid, false);
      }
      await signOut(auth);
    } catch (error) {
      throw new Error('Failed to sign out');
    }
  }
  
  // Update user profile
  static async updateUserProfile(
    uid: string,
    updates: Partial<User>
  ): Promise<void> {
    try {
      const userRef = doc(db, COLLECTIONS.USERS, uid);
      await updateDoc(userRef, { ...updates, lastSeen: new Date() });
    } catch (error) {
      throw new Error('Failed to update user profile');
    }
  }
  
  // Update user online status
  static async updateUserStatus(uid: string, isOnline: boolean): Promise<void> {
    try {
      const userRef = doc(db, COLLECTIONS.USERS, uid);
      await updateDoc(userRef, {
        isOnline,
        lastSeen: new Date(),
      });
    } catch (error) {
      console.error('Failed to update user status:', error);
    }
  }
  
  // Send password reset email
  static async resetPassword(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
      throw new Error(this.getAuthErrorMessage(error.code));
    }
  }
  
  // Update password
  static async updatePassword(newPassword: string): Promise<void> {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('No user logged in');
      }
      await updatePassword(user, newPassword);
    } catch (error: any) {
      throw new Error(this.getAuthErrorMessage(error.code));
    }
  }
  
  // Get current auth user
  static getCurrentAuthUser(): AuthUser | null {
    const user = auth.currentUser;
    if (!user) return null;
    
    return {
      uid: user.uid,
      email: user.email || '',
      emailVerified: user.emailVerified,
      ...(user.displayName && { displayName: user.displayName }),
      ...(user.photoURL && { photoURL: user.photoURL }),
      ...(user.phoneNumber && { phoneNumber: user.phoneNumber }),
    };
  }
  
  // Get user by ID
  static async getUserById(uid: string): Promise<User | null> {
    try {
      const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, uid));
      return userDoc.exists() ? (userDoc.data() as User) : null;
    } catch (error) {
      console.error('Failed to get user:', error);
      return null;
    }
  }
  
  // Check if username is available
  static async isUsernameAvailable(username: string): Promise<boolean> {
    try {
      // In a real app, you'd want to create a separate collection for usernames
      // or use Cloud Functions to check uniqueness
      // For now, we'll do a simple query (not efficient for large datasets)
      return true; // Simplified for MVP
    } catch (error) {
      return false;
    }
  }
  
  // Convert Firebase Auth errors to user-friendly messages
  private static getAuthErrorMessage(errorCode: string): string {
    switch (errorCode) {
      case 'auth/user-not-found':
        return 'No account found with this email address';
      case 'auth/wrong-password':
        return 'Incorrect password';
      case 'auth/email-already-in-use':
        return 'An account with this email address already exists';
      case 'auth/weak-password':
        return 'Password should be at least 6 characters';
      case 'auth/invalid-email':
        return 'Invalid email address';
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Please try again later';
      case 'auth/network-request-failed':
        return 'Network error. Please check your connection';
      default:
        return 'An error occurred. Please try again';
    }
  }
} 