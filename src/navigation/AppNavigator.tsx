import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { View, ActivityIndicator, Text } from 'react-native';
import { useAuthStore } from '../store/authStore';
import AuthNavigator from './AuthNavigator';
import TabNavigator from './TabNavigator';

const Stack = createStackNavigator();

const AppNavigator: React.FC = () => {
  const { isAuthenticated, isLoading, user, error, initializeAuth } = useAuthStore();

  useEffect(() => {
    console.log('🚀 AppNavigator: Setting up auth listener...');
    const unsubscribe = initializeAuth();
    return unsubscribe;
  }, [initializeAuth]);

  // Log auth state changes for debugging
  useEffect(() => {
    console.log('🔍 Auth State Changed:', {
      isAuthenticated,
      isLoading,
      hasUser: !!user,
      userUid: user?.uid,
      error
    });
  }, [isAuthenticated, isLoading, user, error]);

  if (isLoading) {
    console.log('⏳ AppNavigator: Showing loading screen...');
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center',
        backgroundColor: '#000000'
      }}>
        <ActivityIndicator size="large" color="#FFFC00" />
        <Text style={{ color: '#FFFC00', marginTop: 10 }}>Loading...</Text>
      </View>
    );
  }

  console.log(`🚦 AppNavigator: Rendering ${isAuthenticated ? 'Main' : 'Auth'} screens`);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <Stack.Screen name="Main" component={TabNavigator} />
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator; 