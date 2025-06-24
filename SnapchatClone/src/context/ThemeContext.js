import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [wallpaper, setWallpaper] = useState('default');
  const [loading, setLoading] = useState(true);

  const wallpapers = {
    default: {
      name: 'Default',
      background: '#000000',
      primary: '#FFD700',
      secondary: '#1a1a1a'
    },
    blue: {
      name: 'Ocean Blue',
      background: '#0f172a',
      primary: '#0ea5e9',
      secondary: '#1e293b'
    },
    purple: {
      name: 'Purple Dreams',
      background: '#1e1b4b',
      primary: '#8b5cf6',
      secondary: '#312e81'
    },
    green: {
      name: 'Nature Green',
      background: '#0f1419',
      primary: '#10b981',
      secondary: '#1f2937'
    }
  };

  const themes = {
    dark: {
      background: isDarkMode ? wallpapers[wallpaper].background : '#ffffff',
      surface: isDarkMode ? wallpapers[wallpaper].secondary : '#f8fafc',
      primary: wallpapers[wallpaper].primary,
      text: isDarkMode ? '#ffffff' : '#0f172a',
      textSecondary: isDarkMode ? '#94a3b8' : '#64748b',
      border: isDarkMode ? '#374151' : '#e2e8f0'
    },
    light: {
      background: '#ffffff',
      surface: '#f8fafc',
      primary: '#0ea5e9',
      text: '#0f172a',
      textSecondary: '#64748b',
      border: '#e2e8f0'
    }
  };

  const currentTheme = isDarkMode ? themes.dark : themes.light;

  const toggleTheme = async () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    try {
      await AsyncStorage.setItem('theme', newMode ? 'dark' : 'light');
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };

  const changeWallpaper = async (wallpaperKey) => {
    if (wallpapers[wallpaperKey]) {
      setWallpaper(wallpaperKey);
      try {
        await AsyncStorage.setItem('wallpaper', wallpaperKey);
      } catch (error) {
        console.error('Error saving wallpaper preference:', error);
      }
    }
  };

  const loadPreferences = async () => {
    try {
      const storedTheme = await AsyncStorage.getItem('theme');
      const storedWallpaper = await AsyncStorage.getItem('wallpaper');
      
      if (storedTheme) {
        setIsDarkMode(storedTheme === 'dark');
      }
      
      if (storedWallpaper && wallpapers[storedWallpaper]) {
        setWallpaper(storedWallpaper);
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPreferences();
  }, []);

  const value = {
    isDarkMode,
    wallpaper,
    wallpapers,
    currentTheme,
    toggleTheme,
    changeWallpaper,
    loading
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}; 