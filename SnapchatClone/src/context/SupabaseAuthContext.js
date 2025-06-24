import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../supabaseConfig';

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
  const [session, setSession] = useState(null);

  const signup = async (email, password, username) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username.toLowerCase(),
          }
        }
      });

      if (error) throw error;

      // Insert user profile into profiles table
      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            username: username.toLowerCase(),
            email,
            created_at: new Date().toISOString(),
          });

        if (profileError) {
          console.error('Profile creation error:', profileError);
          // Don't throw here - user account is created, profile can be created later
        }
      }

      return data;
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  };

  const login = async (email, password, rememberMe = false) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (rememberMe) {
        await AsyncStorage.setItem('staySignedIn', 'true');
        await AsyncStorage.setItem('userEmail', email);
      } else {
        await AsyncStorage.removeItem('staySignedIn');
        await AsyncStorage.removeItem('userEmail');
      }

      return data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      // Clear stored preferences
      await AsyncStorage.removeItem('staySignedIn');
      await AsyncStorage.removeItem('userEmail');

      return true;
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  const updateUserProfile = async (updates) => {
    try {
      if (!currentUser) throw new Error('No user logged in');

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', currentUser.id);

      if (error) throw error;

      // Update local user state
      setCurrentUser(prev => ({ ...prev, ...updates }));

      return true;
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  };

  const getStoredEmail = async () => {
    try {
      const storedEmail = await AsyncStorage.getItem('userEmail');
      return storedEmail || '';
    } catch (error) {
      console.error('Error getting stored email:', error);
      return '';
    }
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setCurrentUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Supabase auth event:', event);
      
      setSession(session);
      setCurrentUser(session?.user ?? null);
      setLoading(false);

      // Fetch user profile if user is logged in
      if (session?.user) {
        try {
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (error) {
            console.error('Error fetching profile:', error);
          } else if (profile) {
            setCurrentUser(prev => ({ ...prev, ...profile }));
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const value = {
    currentUser,
    session,
    signup,
    login,
    logout,
    loading,
    getStoredEmail,
    updateUserProfile,
    supabase, // Expose supabase client for direct queries
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 