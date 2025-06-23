import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text } from 'react-native';
import CameraScreen from '../screens/Main/CameraScreen';
import ChatsScreen from '../screens/Main/ChatsScreen';
import StoriesScreen from '../screens/Main/StoriesScreen';
import DiscoverScreen from '../screens/Main/DiscoverScreen';
import ProfileScreen from '../screens/Main/ProfileScreen';

export type TabParamList = {
  Stories: undefined;
  Chats: undefined;
  Camera: undefined;
  Discover: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

// Temporary placeholder component
const PlaceholderScreen: React.FC<{ title: string }> = ({ title }) => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
    <Text style={{ color: 'white', fontSize: 18 }}>{title} Screen</Text>
  </View>
);

const TabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      initialRouteName="Camera"
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#000000',
          borderTopWidth: 0,
          height: 80,
          paddingBottom: 10,
        },
        tabBarActiveTintColor: '#FFFC00',
        tabBarInactiveTintColor: '#666666',
        tabBarShowLabel: false,
      }}
    >
      <Tab.Screen 
        name="Stories" 
        component={StoriesScreen}
        options={{
          tabBarIcon: ({ color }) => (
            <View style={{ alignItems: 'center' }}>
              <Text style={{ color, fontSize: 20 }}>📚</Text>
            </View>
          ),
        }}
      />
      <Tab.Screen 
        name="Chats" 
        component={ChatsScreen}
        options={{
          tabBarIcon: ({ color }) => (
            <View style={{ alignItems: 'center' }}>
              <Text style={{ color, fontSize: 20 }}>💬</Text>
            </View>
          ),
        }}
      />
      <Tab.Screen 
        name="Camera" 
        component={CameraScreen}
        options={{
          tabBarIcon: ({ color }) => (
            <View style={{ 
              alignItems: 'center', 
              justifyContent: 'center',
              backgroundColor: color === '#FFFC00' ? '#FFFC00' : '#333',
              borderRadius: 30,
              width: 60,
              height: 60,
              marginBottom: 10,
            }}>
              <Text style={{ color: color === '#FFFC00' ? '#000' : '#fff', fontSize: 24 }}>📷</Text>
            </View>
          ),
        }}
      />
      <Tab.Screen 
        name="Discover" 
        component={DiscoverScreen}
        options={{
          tabBarIcon: ({ color }) => (
            <View style={{ alignItems: 'center' }}>
              <Text style={{ color, fontSize: 20 }}>🔍</Text>
            </View>
          ),
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color }) => (
            <View style={{ alignItems: 'center' }}>
              <Text style={{ color, fontSize: 20 }}>👤</Text>
            </View>
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default TabNavigator; 