import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, db } from '../../firebaseConfig';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [staySignedIn, setStaySignedIn] = useState(false);

  const signup = async (email, password, username) => {
    try {
      const userCredential = await auth.createUserWithEmailAndPassword(email, password);
      const user = userCredential.user;
      
      // Create user document in Firestore using compat API
      await db.collection('users').doc(user.uid).set({
        username: username.toLowerCase(),
        email,
        createdAt: new Date(),
        friends: []
      });
      
      return user;
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  };

  const login = async (email, password, rememberMe = false) => {
    try {
      const result = await auth.signInWithEmailAndPassword(email, password);
      
      // Store login preference
      if (rememberMe) {
        await AsyncStorage.setItem('staySignedIn', 'true');
        await AsyncStorage.setItem('userEmail', email);
        setStaySignedIn(true);
      } else {
        await AsyncStorage.removeItem('staySignedIn');
        await AsyncStorage.removeItem('userEmail');
        setStaySignedIn(false);
      }
      
      return result;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Clear stored login preferences
      await AsyncStorage.removeItem('staySignedIn');
      await AsyncStorage.removeItem('userEmail');
      setStaySignedIn(false);
      
      return await auth.signOut();
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  // Check stored login preferences on app load
  const checkStoredPreferences = async () => {
    try {
      const storedStaySignedIn = await AsyncStorage.getItem('staySignedIn');
      const storedEmail = await AsyncStorage.getItem('userEmail');
      
      if (storedStaySignedIn === 'true' && storedEmail) {
        setStaySignedIn(true);
      }
    } catch (error) {
      console.error('Error checking stored preferences:', error);
    }
  };

  useEffect(() => {
    checkStoredPreferences();
    
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      console.log('Auth state changed:', user?.uid || 'null');
      
      if (user) {
        try {
          // Get additional user info from Firestore using compat API
          const userDoc = await db.collection('users').doc(user.uid).get();
          if (userDoc.exists) {
            const userData = { ...user, ...userDoc.data() };
            setCurrentUser(userData);
            console.log('User authenticated with data:', userData.email);
          } else {
            setCurrentUser(user);
            console.log('User authenticated without additional data:', user.email);
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          setCurrentUser(user);
        }
      } else {
        setCurrentUser(null);
        console.log('User logged out');
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Get stored email for login convenience
  const getStoredEmail = async () => {
    try {
      const storedEmail = await AsyncStorage.getItem('userEmail');
      return storedEmail || '';
    } catch (error) {
      console.error('Error getting stored email:', error);
      return '';
    }
  };

  // Update user profile function
  const updateUserProfile = async (updates) => {
    try {
      if (!currentUser) throw new Error('No user logged in');
      
      // Update user document in Firestore
      await db.collection('users').doc(currentUser.uid).update(updates);
      
      // Update email in Firebase Auth if changed
      if (updates.email && updates.email !== currentUser.email) {
        await currentUser.updateEmail(updates.email);
      }
      
      // Refresh current user data
      const userDoc = await db.collection('users').doc(currentUser.uid).get();
      if (userDoc.exists) {
        const userData = { ...currentUser, ...userDoc.data() };
        setCurrentUser(userData);
      }
      
      return true;
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  };

  const value = {
    currentUser,
    signup,
    login,
    logout,
    loading,
    staySignedIn,
    getStoredEmail,
    updateUserProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 