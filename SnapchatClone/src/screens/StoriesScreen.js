import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, Alert, Dimensions, FlatList, PanResponder } from 'react-native';
import { Video } from 'expo-av';
import { useAuth } from '../context/SupabaseAuthContext';
import { useTheme } from '../context/ThemeContext';
import ImageWithFallback from '../components/ImageWithFallback';

const { width, height } = Dimensions.get('window');

export default function StoriesScreen({ navigation, route }) {
  const [timeLeft, setTimeLeft] = useState(10); // 10 seconds to view
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const { snap } = route?.params || {};
  const { currentUser, supabase } = useAuth();
  const { currentTheme } = useTheme();

  // Swipe gesture for navigation
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gestureState) => {
      return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 20;
    },
    onPanResponderRelease: (_, gestureState) => {
      const { dx } = gestureState;
      if (dx < -100) { // Swipe left to go back to camera
        navigation.goBack();
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
      // Get stories that haven't expired (within 24 hours) from friends and own stories
      const { data: storiesData, error } = await supabase
        .from('stories')
        .select('*')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading stories:', error);
        setLoading(false);
        return;
      }

      // Filter stories to only show from friends and self
      // For now, show all stories - you could add friend filtering here later
      setStories(storiesData || []);
      setLoading(false);
    } catch (error) {
      console.error('Load stories error:', error);
      setLoading(false);
    }
  };

  const addStoryViewer = async (storyId) => {
    if (!currentUser || !storyId) return;

    try {
      // Get current story to update viewers
      const { data: story, error: fetchError } = await supabase
        .from('stories')
        .select('viewers')
        .eq('id', storyId)
        .single();

      if (fetchError) {
        console.error('Error fetching story:', fetchError);
        return;
      }

      const currentViewers = story.viewers || [];
      if (!currentViewers.includes(currentUser.id)) {
        const updatedViewers = [...currentViewers, currentUser.id];
        
        const { error: updateError } = await supabase
          .from('stories')
          .update({ viewers: updatedViewers })
          .eq('id', storyId);

        if (updateError) {
          console.error('Error updating story viewers:', updateError);
        }
      }
    } catch (error) {
      console.error('Error adding story viewer:', error);
    }
  };

  const closeStory = () => {
    navigation.goBack();
  };

  const viewStory = (story) => {
    // Add current user as viewer
    addStoryViewer(story.id);
    navigation.push('Stories', { snap: story });
  };

  // If viewing a specific snap or story
  if (snap) {
    const isStory = snap.type === 'story';
    const isVideoStory = snap.type === 'video_story';
    const imageUrl = snap.image_url || snap.imageUrl;
    const videoUrl = snap.video_url || snap.videoUrl;
    const username = snap.username || snap.sender_username;
    const createdAt = snap.created_at || snap.createdAt;
    
    return (
      <View style={[{ flex: 1, backgroundColor: 'black' }]}>
        {/* Progress bar */}
        <View style={[{ position: 'absolute', top: 48, left: 16, right: 16, zIndex: 10 }]}>
          <View style={[{ backgroundColor: '#6b7280', height: 4, borderRadius: 2 }]}>
            <View 
              style={[{ backgroundColor: currentTheme.primary, height: 4, borderRadius: 2, width: `${(timeLeft / 10) * 100}%` }]}
            />
          </View>
        </View>

        {/* User info */}
        <View style={[{ position: 'absolute', top: 64, left: 16, right: 16, zIndex: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
          <View style={[{ flexDirection: 'row', alignItems: 'center' }]}>
            <View style={[{ backgroundColor: currentTheme.primary, borderRadius: 24, width: 48, height: 48, justifyContent: 'center', alignItems: 'center', marginRight: 12 }]}>
              <Text style={[{ color: currentTheme.background, fontWeight: 'bold', fontSize: 18 }]}>
                {username?.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View>
              <Text style={[{ color: 'white', fontWeight: 'bold', fontSize: 18 }]}>{username}</Text>
              <Text style={[{ color: '#d1d5db', fontSize: 14 }]}>
                {createdAt ? new Date(createdAt).toLocaleTimeString() : 'Just now'}
              </Text>
            </View>
          </View>
          
          <TouchableOpacity 
            onPress={closeStory}
            style={[{ backgroundColor: 'rgba(0, 0, 0, 0.6)', borderRadius: 20, width: 40, height: 40, justifyContent: 'center', alignItems: 'center' }]}
          >
            <Text style={[{ color: 'white', fontWeight: 'bold', fontSize: 20 }]}>×</Text>
          </TouchableOpacity>
        </View>

        {/* Snap/Story content */}
        {isVideoStory && videoUrl ? (
          <Video
            source={{ uri: videoUrl }}
            style={{ width, height }}
            useNativeControls={false}
            shouldPlay={true}
            isLooping={false}
            resizeMode="cover"
          />
        ) : (
          <ImageWithFallback
            source={{ uri: imageUrl }}
            style={{ width, height }}
            resizeMode="cover"
            fallbackText="📸"
            fallbackSubtext="Story couldn't load"
            onPress={closeStory}
          />
        )}

        {/* Timer display */}
        <View style={[{ position: 'absolute', bottom: 32, right: 16 }]}>
          <View style={[{ backgroundColor: 'rgba(0, 0, 0, 0.7)', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 }]}>
            <Text style={[{ color: currentTheme.primary, fontWeight: 'bold', fontSize: 18 }]}>{timeLeft}s</Text>
          </View>
        </View>
      </View>
    );
  }

  // Stories list view
  const renderStoryItem = ({ item }) => (
    <TouchableOpacity
      style={[{ backgroundColor: currentTheme.surface, borderRadius: 12, marginHorizontal: 16, marginBottom: 16, padding: 16, borderWidth: 1, borderColor: currentTheme.border }]}
      onPress={() => viewStory(item)}
    >
      <View style={[{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }]}>
        <View style={[{ backgroundColor: currentTheme.primary, borderRadius: 28, width: 56, height: 56, justifyContent: 'center', alignItems: 'center', marginRight: 16 }]}>
          <Text style={[{ color: currentTheme.background, fontWeight: 'bold', fontSize: 20 }]}>
            {item.username?.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={[{ flex: 1 }]}>
          <Text style={[{ fontWeight: 'bold', fontSize: 20, color: currentTheme.primary }]}>{item.username}</Text>
          <Text style={[{ color: currentTheme.textSecondary }]}>
            {new Date(item.created_at).toLocaleTimeString()}
          </Text>
          <Text style={[{ color: currentTheme.textSecondary, fontSize: 12, marginTop: 2 }]}>
            {(item.viewers || []).length} views
          </Text>
        </View>
      </View>
      <View style={[{ backgroundColor: currentTheme.border, borderRadius: 12, height: 192, justifyContent: 'center', alignItems: 'center' }]}>
        {item.type === 'video_story' && item.video_url ? (
          <Video
            source={{ uri: item.video_url }}
            style={[{ width: '100%', height: '100%', borderRadius: 12 }]}
            useNativeControls={false}
            shouldPlay={false}
            isLooping={false}
            resizeMode="cover"
          />
        ) : (
          <ImageWithFallback
            source={{ uri: item.image_url }}
            style={[{ width: '100%', height: '100%', borderRadius: 12 }]}
            resizeMode="cover"
            fallbackText="📖"
            fallbackSubtext="Story preview"
          />
        )}
        <View style={[{ position: 'absolute', bottom: 8, right: 8, backgroundColor: 'rgba(0, 0, 0, 0.6)', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4 }]}>
          <Text style={[{ color: 'white', fontSize: 12, fontWeight: 'bold' }]}>
            {item.type === 'video_story' ? '🎥 Video Story' : '📖 Tap to view'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const onRefresh = () => {
    setLoading(true);
    loadStories();
  };

  return (
    <View style={[{ flex: 1, backgroundColor: currentTheme.background }]} {...panResponder.panHandlers}>
      {/* Header */}
      <View style={[{ backgroundColor: currentTheme.background, paddingTop: 56, paddingBottom: 24, paddingHorizontal: 24, borderBottomWidth: 1, borderBottomColor: currentTheme.border }]}>
        <View style={[{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={[{ color: currentTheme.primary, fontSize: 18, fontWeight: '600' }]}>← Back</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onRefresh}>
            <Text style={[{ color: currentTheme.primary, fontSize: 18, fontWeight: '600' }]}>🔄 Refresh</Text>
          </TouchableOpacity>
        </View>
        <View style={[{ alignItems: 'center' }]}>
          <Text style={[{ fontSize: 30, fontWeight: 'bold', color: currentTheme.primary, textAlign: 'center', marginBottom: 8 }]}>📖 Stories</Text>
          <Text style={[{ color: currentTheme.textSecondary, textAlign: 'center' }]}>
            Discover moments from friends! ✨
          </Text>
        </View>
      </View>

      {/* Content */}
      {loading ? (
        <View style={[{ flex: 1, justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={[{ fontSize: 24, marginBottom: 16 }]}>⏳</Text>
          <Text style={[{ fontSize: 20, color: currentTheme.primary, fontWeight: '600' }]}>Loading stories...</Text>
          <Text style={[{ color: currentTheme.textSecondary, textAlign: 'center', marginTop: 8 }]}>Finding amazing moments!</Text>
        </View>
      ) : stories.length === 0 ? (
        <View style={[{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }]}>
          <Text style={[{ fontSize: 48, marginBottom: 24 }]}>📚</Text>
          <Text style={[{ fontSize: 24, color: currentTheme.primary, fontWeight: 'bold', textAlign: 'center', marginBottom: 16 }]}>
            No stories yet!
          </Text>
          <Text style={[{ color: currentTheme.textSecondary, textAlign: 'center', fontSize: 18, marginBottom: 32, lineHeight: 24 }]}>
            Stories from friends will appear here when they share their moments. Start sharing to inspire others! 🌟
          </Text>
          <TouchableOpacity
            style={[{ backgroundColor: currentTheme.primary, borderRadius: 24, paddingHorizontal: 32, paddingVertical: 16, marginBottom: 16 }]}
            onPress={() => navigation.navigate('Camera')}
          >
            <Text style={[{ color: currentTheme.background, fontWeight: 'bold', fontSize: 18 }]}>📷 Create a Story</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[{ backgroundColor: currentTheme.surface, borderRadius: 24, paddingHorizontal: 32, paddingVertical: 16, borderWidth: 1, borderColor: currentTheme.border }]}
            onPress={() => navigation.navigate('Friends')}
          >
            <Text style={[{ color: currentTheme.primary, fontWeight: '600', fontSize: 18 }]}>👥 Find Friends</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={stories}
          renderItem={renderStoryItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingTop: 20, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          onRefresh={onRefresh}
          refreshing={loading}
        />
      )}
    </View>
  );
} 