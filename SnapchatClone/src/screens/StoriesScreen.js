import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, Alert, Dimensions, FlatList, PanResponder } from 'react-native';
import { db } from '../../firebaseConfig';
import { useAuth } from '../context/AuthContext';

const { width, height } = Dimensions.get('window');

export default function StoriesScreen({ navigation, route }) {
  const [timeLeft, setTimeLeft] = useState(10); // 10 seconds to view
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const { snap } = route?.params || {};
  const { currentUser } = useAuth();

  // Swipe gesture for navigation
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gestureState) => {
      return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 20;
    },
    onPanResponderRelease: (_, gestureState) => {
      const { dx } = gestureState;
      if (dx < -100) { // Swipe left to go back to camera
        navigation.navigate('Camera');
      }
    },
  });

  useEffect(() => {
    if (snap) {
      // Viewing a specific snap
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            navigation.goBack();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    } else {
      // Load all available stories
      loadStories();
    }
  }, [snap, navigation]);

  const loadStories = async () => {
    if (!currentUser) return;

    try {
      const unsubscribe = db.collection('snaps')
        .where('userId', '!=', currentUser.uid)
        .orderBy('createdAt', 'desc')
        .onSnapshot((querySnapshot) => {
          const storiesData = [];
          querySnapshot.forEach((doc) => {
            const story = { id: doc.id, ...doc.data() };
            // Only show stories that haven't expired
            const expirationDate = story.expiresAt?.toDate ? story.expiresAt.toDate() : new Date(story.expiresAt);
            if (expirationDate > new Date()) {
              storiesData.push(story);
            }
          });
          setStories(storiesData);
          setLoading(false);
        }, (error) => {
          console.error('Error fetching stories:', error);
          setLoading(false);
        });

      return unsubscribe;
    } catch (error) {
      console.error('Load stories error:', error);
      setLoading(false);
    }
  };

  const closeStory = () => {
    navigation.goBack();
  };

  const viewStory = (story) => {
    navigation.push('Stories', { snap: story });
  };

  // If viewing a specific snap
  if (snap) {
    return (
      <View className="flex-1 bg-black">
        {/* Progress bar */}
        <View className="absolute top-12 left-4 right-4 z-10">
          <View className="bg-gray-600 h-1 rounded-full">
            <View 
              className="bg-snapYellow h-1 rounded-full"
              style={{ width: `${(timeLeft / 10) * 100}%` }}
            />
          </View>
        </View>

        {/* User info */}
        <View className="absolute top-16 left-4 right-4 z-10 flex-row items-center justify-between">
          <View className="flex-row items-center">
            <View className="bg-snapYellow rounded-full w-12 h-12 justify-center items-center mr-3">
              <Text className="text-black font-bold text-lg">
                {snap.username?.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View>
              <Text className="text-white font-bold text-lg">{snap.username}</Text>
              <Text className="text-gray-300 text-sm">
                {snap.createdAt?.toDate ? snap.createdAt.toDate().toLocaleTimeString() : 'Just now'}
              </Text>
            </View>
          </View>
          
          <TouchableOpacity 
            onPress={closeStory}
            className="bg-black bg-opacity-60 rounded-full w-10 h-10 justify-center items-center"
          >
            <Text className="text-white font-bold text-xl">×</Text>
          </TouchableOpacity>
        </View>

        {/* Snap image */}
        <TouchableOpacity 
          className="flex-1"
          onPress={closeStory}
          activeOpacity={1}
        >
          <Image 
            source={{ uri: snap.imageUrl || 'https://via.placeholder.com/300x400.png?text=No+Image' }} 
            style={{ width, height }}
            resizeMode="cover"
          />
        </TouchableOpacity>

        {/* Timer display */}
        <View className="absolute bottom-8 right-4">
          <View className="bg-black bg-opacity-70 rounded-full px-4 py-2">
            <Text className="text-snapYellow font-bold text-lg">{timeLeft}s</Text>
          </View>
        </View>
      </View>
    );
  }

  // Stories list view
  const renderStoryItem = ({ item }) => (
    <TouchableOpacity
      className="bg-snapGray rounded-xl mx-4 mb-4 p-4 shadow-lg border border-gray-600"
      onPress={() => viewStory(item)}
    >
      <View className="flex-row items-center mb-4">
        <View className="bg-snapYellow rounded-full w-14 h-14 justify-center items-center mr-4">
          <Text className="text-black font-bold text-xl">
            {item.username?.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View className="flex-1">
          <Text className="font-bold text-xl text-snapYellow">{item.username}</Text>
          <Text className="text-gray-300">
            {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleTimeString() : 'Just now'}
          </Text>
        </View>
      </View>
      <View className="bg-gray-800 rounded-xl h-48 justify-center items-center">
        <Text className="text-snapYellow text-2xl mb-2">📖</Text>
        <Text className="text-snapYellow text-lg font-semibold">Tap to view story</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-snapBlack" {...panResponder.panHandlers}>
      {/* Header */}
      <View className="bg-snapBlack pt-14 pb-6 px-6 border-b border-gray-700">
        <View className="flex-row justify-between items-center mb-2">
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text className="text-snapYellow text-lg font-semibold">← Back</Text>
          </TouchableOpacity>
        </View>
        <View className="items-center">
          <Text className="text-3xl font-bold text-snapYellow text-center mb-2">📖 Stories</Text>
          <Text className="text-gray-400 text-center">
            Discover moments from friends! ✨
          </Text>
        </View>
      </View>

      {/* Content */}
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <Text className="text-2xl mb-4">⏳</Text>
          <Text className="text-xl text-snapYellow font-semibold">Loading stories...</Text>
          <Text className="text-gray-400 text-center mt-2">Finding amazing moments!</Text>
        </View>
      ) : stories.length === 0 ? (
        <View className="flex-1 justify-center items-center px-8">
          <Text className="text-6xl mb-6">📚</Text>
          <Text className="text-2xl text-snapYellow font-bold text-center mb-4">
            No stories yet!
          </Text>
          <Text className="text-gray-400 text-center text-lg mb-8 leading-6">
            Stories from friends will appear here when they share their moments. Start sharing to inspire others! 🌟
          </Text>
          <TouchableOpacity
            className="bg-snapYellow rounded-full px-8 py-4 shadow-lg"
            onPress={() => navigation.navigate('Camera')}
          >
            <Text className="text-black font-bold text-lg">📷 Create a Story</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="bg-gray-700 rounded-full px-8 py-4 mt-4"
            onPress={() => navigation.navigate('Friends')}
          >
            <Text className="text-snapYellow font-semibold text-lg">👥 Find Friends</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={stories}
          renderItem={renderStoryItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingTop: 20, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
} 