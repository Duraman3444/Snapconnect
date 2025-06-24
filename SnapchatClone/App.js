import React from 'react';
import { View, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator, CardStyleInterpolators } from '@react-navigation/stack';
import { AuthProvider, useAuth } from './src/context/SupabaseAuthContext';
import { ThemeProvider } from './src/context/ThemeContext';
import ErrorBoundary from './src/components/ErrorBoundary';

// Import screens
import LoginScreen from './src/screens/LoginScreen';
import SignupScreen from './src/screens/SignupScreen';
import HomeScreen from './src/screens/HomeScreen';
import CameraScreen from './src/screens/CameraScreen';
import StoriesScreen from './src/screens/StoriesScreen';
import FriendsScreen from './src/screens/FriendsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import ChatsListScreen from './src/screens/ChatsListScreen';
import ChatScreen from './src/screens/ChatScreen';

// Import debug components
import DebugAccountSwitcher from './src/components/DebugAccountSwitcher';

const Stack = createStackNavigator();

// Add this at the top after imports for debugging
if (__DEV__) {
  const originalXHR = global.XMLHttpRequest;
  global.XMLHttpRequest = class extends originalXHR {
    open(method, url, ...args) {
      if (url.includes('supabase.co/storage')) {
        console.log('🌐 Storage request:', method, url);
      }
      return super.open(method, url, ...args);
    }
  };
}

function LoadingScreen() {
  return (
    <View className="flex-1 justify-center items-center bg-snapBlack">
      <Text className="text-4xl font-bold text-snapYellow mb-4">👻</Text>
      <Text className="text-lg text-snapYellow">Loading SnapConnect...</Text>
    </View>
  );
}

function AppNavigator() {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {currentUser ? (
          // Authenticated user screens - Camera is now the main screen
          <>
            <Stack.Screen name="Camera" component={CameraScreen} />
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen 
              name="Stories" 
              component={StoriesScreen}
              options={{
                cardStyleInterpolator: ({ current, next, layouts }) => {
                  return {
                    cardStyle: {
                      transform: [
                        {
                          translateX: current.progress.interpolate({
                            inputRange: [0, 1],
                            outputRange: [layouts.screen.width, 0],
                          }),
                        },
                        {
                          translateX: next
                            ? next.progress.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0, -layouts.screen.width],
                              })
                            : 0,
                        },
                      ],
                    },
                  };
                },
                gestureEnabled: true,
                gestureDirection: 'horizontal',
                transitionSpec: {
                  open: {
                    animation: 'timing',
                    config: {
                      duration: 250,
                    },
                  },
                  close: {
                    animation: 'timing',
                    config: {
                      duration: 250,
                    },
                  },
                },
              }}
            />
            <Stack.Screen 
              name="Friends" 
              component={FriendsScreen}
              options={{
                cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
                gestureDirection: 'horizontal-inverted',
              }}
            />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="ChatsList" component={ChatsListScreen} />
            <Stack.Screen name="Chat" component={ChatScreen} />
          </>
        ) : (
          // Authentication screens
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Signup" component={SignupScreen} />
          </>
        )}
      </Stack.Navigator>
      
      {/* Debug Account Switcher - only visible in development */}
      <DebugAccountSwitcher />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <AppNavigator />
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
