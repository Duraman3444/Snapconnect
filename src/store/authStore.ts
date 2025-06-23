import { create } from 'zustand';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../services/firebase/config';
import { AuthService } from '../services/firebase/auth';
import { User, AuthUser } from '../types/User';

interface AuthState {
  // State
  user: User | null;
  authUser: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  
  // Actions
  signUp: (email: string, password: string, username: string, displayName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  clearError: () => void;
  setUser: (user: User | null) => void;
  setAuthUser: (authUser: AuthUser | null) => void;
  setLoading: (loading: boolean) => void;
  
  // Initialize auth listener
  initializeAuth: () => () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  // Initial state
  user: null,
  authUser: null,
  isLoading: true,
  isAuthenticated: false,
  error: null,
  
  // Sign up action
  signUp: async (email: string, password: string, username: string, displayName: string) => {
    set({ isLoading: true, error: null });
    try {
      console.log('🚀 Starting signup in auth store...');
      const user = await AuthService.signUp(email, password, username, displayName);
      console.log('✅ Signup successful, setting auth state...');
      
      // Set the user state immediately after successful signup
      set({ 
        user, 
        authUser: AuthService.getCurrentAuthUser(),
        isAuthenticated: true,
        isLoading: false,
        error: null
      });
      
      console.log('✅ Auth state updated successfully');
    } catch (error: any) {
      console.error('❌ Signup failed in auth store:', error);
      set({ 
        error: error.message, 
        isLoading: false,
        user: null,
        authUser: null,
        isAuthenticated: false
      });
      throw error;
    }
  },
  
  // Sign in action
  signIn: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      console.log('🚀 Starting signin in auth store...');
      const user = await AuthService.signIn(email, password);
      console.log('✅ Signin successful, setting auth state...');
      
      set({ 
        user, 
        authUser: AuthService.getCurrentAuthUser(),
        isAuthenticated: true,
        isLoading: false,
        error: null
      });
      
      console.log('✅ Auth state updated successfully');
    } catch (error: any) {
      console.error('❌ Signin failed in auth store:', error);
      set({ 
        error: error.message, 
        isLoading: false,
        user: null,
        authUser: null,
        isAuthenticated: false
      });
      throw error;
    }
  },
  
  // Sign out action
  signOut: async () => {
    set({ isLoading: true, error: null });
    try {
      await AuthService.signOut();
      set({ 
        user: null, 
        authUser: null,
        isAuthenticated: false,
        isLoading: false,
        error: null
      });
    } catch (error: any) {
      set({ 
        error: error.message, 
        isLoading: false 
      });
      throw error;
    }
  },
  
  // Update profile action
  updateProfile: async (updates: Partial<User>) => {
    const { user } = get();
    if (!user) throw new Error('No user logged in');
    
    set({ isLoading: true, error: null });
    try {
      await AuthService.updateUserProfile(user.uid, updates);
      set({ 
        user: { ...user, ...updates },
        isLoading: false 
      });
    } catch (error: any) {
      set({ 
        error: error.message, 
        isLoading: false 
      });
      throw error;
    }
  },
  
  // Reset password action
  resetPassword: async (email: string) => {
    set({ isLoading: true, error: null });
    try {
      await AuthService.resetPassword(email);
      set({ isLoading: false });
    } catch (error: any) {
      set({ 
        error: error.message, 
        isLoading: false 
      });
      throw error;
    }
  },
  
  // Clear error
  clearError: () => set({ error: null }),
  
  // Set user (for external updates)
  setUser: (user: User | null) => set({ 
    user, 
    isAuthenticated: !!user 
  }),
  
  // Set auth user (for external updates)
  setAuthUser: (authUser: AuthUser | null) => set({ authUser }),
  
  // Set loading state
  setLoading: (loading: boolean) => set({ isLoading: loading }),
  
  // Initialize auth state listener
  initializeAuth: () => {
    console.log('🔄 Initializing auth listener...');
    
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          console.log('👤 Firebase user detected:', firebaseUser.uid);
          
          // Check if we already have this user in our state
          const currentState = get();
          if (currentState.user && currentState.user.uid === firebaseUser.uid) {
            console.log('✅ User already in state, skipping fetch');
            return;
          }
          
          // Try to get user data from Firestore
          console.log('📖 Fetching user data from Firestore...');
          const user = await AuthService.getUserById(firebaseUser.uid);
          
          if (user) {
            console.log('✅ User data fetched successfully');
            set({
              user,
              authUser: AuthService.getCurrentAuthUser(),
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
          } else {
            console.log('⚠️ User exists in Firebase Auth but not in Firestore');
            // Don't set error here - this might be a timing issue during signup
            // Just set loading to false and let the signup process handle it
            set({
              isLoading: false,
            });
          }
        } else {
          console.log('👤 No Firebase user detected, signing out...');
          // User is signed out
          set({
            user: null,
            authUser: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
        }
      } catch (error) {
        console.error('❌ Error in auth state listener:', error);
        // Don't set error state here as it might interfere with normal flow
        // Just set loading to false
        set({
          isLoading: false,
        });
      }
    });
    
    console.log('✅ Auth listener initialized');
    return unsubscribe;
  },
})); 