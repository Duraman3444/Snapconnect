import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, Alert, Dimensions, FlatList, PanResponder, ScrollView, SafeAreaView } from 'react-native';
import { Video } from 'expo-av';
import { useAuth } from '../context/SupabaseAuthContext';
import { useTheme } from '../context/ThemeContext';
import ImageWithFallback from '../components/ImageWithFallback';
import AIAssistant from '../components/AIAssistant';
import FloatingAIButton from '../components/FloatingAIButton';
import ragService from '../services/ragService';
import userProfileService from '../services/userProfileService';

const { width, height } = Dimensions.get('window');

export default function StoriesScreen({ navigation, route }) {
  const [timeLeft, setTimeLeft] = useState(10); // 10 seconds to view
  const [stories, setStories] = useState([]);
  const [friendStories, setFriendStories] = useState([]);
  const [followingStories, setFollowingStories] = useState([]);
  const [loading, setLoading] = useState(true);
  // AI-related state
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [userProfile, setUserProfile] = useState({});
  const [storyIdeas, setStoryIdeas] = useState([]);
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
      loadUserProfile();
      generateStoryIdeas();
    }
  }, [snap, navigation]);

  const loadStories = async () => {
    if (!currentUser) return;

    try {
      console.log('📖 Loading stories for user:', currentUser.id);

      // Get stories that haven't expired (within 24 hours) - simple query first
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

      console.log('📖 Raw stories data:', storiesData?.length || 0, 'stories found');

      // Get user profiles separately to avoid join issues
      const userIds = [...new Set(storiesData?.map(story => story.user_id) || [])];
      console.log('📖 Unique user IDs:', userIds);

      let userProfiles = {};
      if (userIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username, display_name')
          .in('id', userIds);

        if (!profilesError && profiles) {
          profiles.forEach(profile => {
            userProfiles[profile.id] = profile;
          });
        }
        console.log('📖 User profiles loaded:', Object.keys(userProfiles).length);
      }

      // Get friends list separately
      const { data: friendships, error: friendsError } = await supabase
        .from('friendships')
        .select('user_id, friend_id')
        .or(`user_id.eq.${currentUser.id},friend_id.eq.${currentUser.id}`)
        .eq('status', 'accepted');

      const friendIds = new Set();
      if (friendships && !friendsError) {
        friendships.forEach(friendship => {
          if (friendship.user_id === currentUser.id) {
            friendIds.add(friendship.friend_id);
          } else {
            friendIds.add(friendship.user_id);
          }
        });
      }
      console.log('📖 Friend IDs:', Array.from(friendIds));

      // Separate stories into categories
      const friends = [];
      const following = [];
      const allStories = storiesData || [];

      // Group stories by user
      const storiesByUser = {};
      allStories.forEach(story => {
        const userId = story.user_id;
        if (!storiesByUser[userId]) {
          storiesByUser[userId] = [];
        }
        storiesByUser[userId].push(story);
      });

      console.log('📖 Stories grouped by user:', Object.keys(storiesByUser).length, 'users');

      // Create user story objects
      Object.keys(storiesByUser).forEach(userId => {
        const userStories = storiesByUser[userId];
        const latestStory = userStories[0]; // Most recent story
        const profile = userProfiles[userId];
        
        const storyUser = {
          id: userId,
          username: profile?.username || latestStory.username || `User${userId.slice(-4)}`,
          displayName: profile?.display_name || profile?.username || latestStory.username || `User ${userId.slice(-4)}`,
          stories: userStories,
          latestStory: latestStory,
          hasUnviewed: userStories.some(story => !(story.viewers || []).includes(currentUser.id))
        };

        if (friendIds.has(userId) || userId === currentUser.id) {
          friends.push(storyUser);
          console.log('📖 Added friend story:', storyUser.username);
        } else {
          following.push(storyUser);
          console.log('📖 Added following story:', storyUser.username);
        }
      });

      console.log('📖 Final results - Friends:', friends.length, 'Following:', following.length);
      
      setFriendStories(friends);
      setFollowingStories(following);
      setStories(allStories);
      setLoading(false);
    } catch (error) {
      console.error('Load stories error:', error);
      setLoading(false);
    }
  };

  const loadUserProfile = async () => {
    try {
      const profile = await userProfileService.getMockUserProfile(currentUser.id);
      setUserProfile(profile);
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const generateStoryIdeas = async () => {
    try {
      const profile = await userProfileService.getMockUserProfile(currentUser.id);
      const contentIdeas = await ragService.generateContentIdeas(
        profile,
        [],
        { platform: 'stories' }
      );
      setStoryIdeas(contentIdeas.ideas || []);
    } catch (error) {
      console.error('Error generating story ideas:', error);
    }
  };

  const handleAISuggestionSelect = (suggestion) => {
    Alert.alert('AI Story Idea', `"${suggestion}"\n\nWould you like to create a story with this idea?`, [
      { text: 'Maybe Later', style: 'cancel' },
      { text: 'Create Story', onPress: () => navigation.navigate('Camera') }
    ]);
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

  // Friend Story Circle Component
  const renderFriendStory = ({ item }) => (
    <TouchableOpacity
      style={{ alignItems: 'center', marginHorizontal: 8 }}
      onPress={() => viewStory(item.latestStory)}
    >
      <View style={[{
        width: 70,
        height: 70,
        borderRadius: 35,
        borderWidth: 3,
        borderColor: item.hasUnviewed ? currentTheme.primary : '#ddd',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: currentTheme.surface,
        marginBottom: 4
      }]}>
        <View style={[{
          width: 60,
          height: 60,
          borderRadius: 30,
          backgroundColor: currentTheme.primary,
          justifyContent: 'center',
          alignItems: 'center'
        }]}>
          <Text style={[{ color: currentTheme.background, fontWeight: 'bold', fontSize: 16 }]}>
            {item.username?.charAt(0).toUpperCase()}
          </Text>
        </View>
      </View>
      <Text style={[{ 
        color: currentTheme.text, 
        fontSize: 12, 
        textAlign: 'center',
        maxWidth: 70
      }]} numberOfLines={1}>
        {item.username}
      </Text>
    </TouchableOpacity>
  );

  // Following Story Card Component
  const renderFollowingStory = ({ item }) => (
    <TouchableOpacity
      style={[{
        backgroundColor: currentTheme.surface,
        borderRadius: 12,
        marginHorizontal: 16,
        marginBottom: 12,
        overflow: 'hidden',
        elevation: 2,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4
      }]}
      onPress={() => viewStory(item.latestStory)}
    >
      <View style={{ position: 'relative', height: 180 }}>
        {item.latestStory.type === 'video_story' && item.latestStory.video_url ? (
          <Video
            source={{ uri: item.latestStory.video_url }}
            style={{ width: '100%', height: '100%' }}
            useNativeControls={false}
            shouldPlay={false}
            isLooping={false}
            resizeMode="cover"
          />
        ) : (
          <ImageWithFallback
            source={{ uri: item.latestStory.image_url }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
            fallbackText="📖"
            fallbackSubtext="Story"
          />
        )}
        
        {/* Gradient overlay for better text visibility */}
        <View style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 60,
          background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)'
        }} />
        
        {/* User info overlay */}
        <View style={{
          position: 'absolute',
          bottom: 8,
          left: 8,
          right: 8,
          flexDirection: 'row',
          alignItems: 'center'
        }}>
          <View style={[{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: currentTheme.primary,
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 8
          }]}>
            <Text style={[{ color: currentTheme.background, fontWeight: 'bold', fontSize: 12 }]}>
              {item.username?.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[{ color: 'white', fontWeight: 'bold', fontSize: 14 }]}>
              {item.displayName}
            </Text>
            <Text style={[{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }]}>
              {item.stories.length} {item.stories.length === 1 ? 'story' : 'stories'}
            </Text>
          </View>
          {item.hasUnviewed && (
            <View style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: currentTheme.primary
            }} />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const onRefresh = () => {
    setLoading(true);
    loadStories();
  };

  return (
    <SafeAreaView style={[{ flex: 1, backgroundColor: currentTheme.background }]} {...panResponder.panHandlers}>
      {/* Header */}
      <View style={[{ 
        backgroundColor: currentTheme.background, 
        paddingHorizontal: 20, 
        paddingVertical: 12,
        borderBottomWidth: 1, 
        borderBottomColor: currentTheme.border,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between'
      }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={[{ color: currentTheme.primary, fontSize: 28, fontWeight: 'bold' }]}>👤</Text>
        </TouchableOpacity>
        
        <Text style={[{ fontSize: 18, fontWeight: 'bold', color: currentTheme.text }]}>Stories</Text>
        
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={onRefresh} style={{ marginRight: 15 }}>
            <Text style={[{ color: currentTheme.primary, fontSize: 20 }]}>🔍</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Friends')}>
            <View style={[{ 
              backgroundColor: currentTheme.primary, 
              width: 28, 
              height: 28, 
              borderRadius: 14, 
              justifyContent: 'center', 
              alignItems: 'center' 
            }]}>
              <Text style={[{ color: currentTheme.background, fontSize: 16, fontWeight: 'bold' }]}>+</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={{ marginLeft: 10 }}>
            <Text style={[{ color: currentTheme.primary, fontSize: 20 }]}>⋯</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      {loading ? (
        <View style={[{ flex: 1, justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={[{ fontSize: 24, marginBottom: 16 }]}>⏳</Text>
          <Text style={[{ fontSize: 20, color: currentTheme.primary, fontWeight: '600' }]}>Loading stories...</Text>
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          {/* Friends Section */}
          {friendStories.length > 0 && (
            <View style={{ paddingVertical: 16 }}>
              <Text style={[{ 
                fontSize: 16, 
                fontWeight: 'bold', 
                color: currentTheme.text,
                marginBottom: 12,
                marginHorizontal: 20
              }]}>
                Friends
              </Text>
              <FlatList
                data={friendStories}
                renderItem={renderFriendStory}
                keyExtractor={(item) => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16 }}
              />
            </View>
          )}

          {/* Following Section */}
          {followingStories.length > 0 && (
            <View style={{ paddingVertical: 8 }}>
              <Text style={[{ 
                fontSize: 16, 
                fontWeight: 'bold', 
                color: currentTheme.text,
                marginBottom: 12,
                marginHorizontal: 20
              }]}>
                Following
              </Text>
              <FlatList
                data={followingStories}
                renderItem={renderFollowingStory}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
              />
            </View>
          )}

          {/* Discover Section - Placeholder */}
          {(friendStories.length > 0 || followingStories.length > 0) && (
            <View style={{ paddingVertical: 16 }}>
              <Text style={[{ 
                fontSize: 16, 
                fontWeight: 'bold', 
                color: currentTheme.text,
                marginBottom: 12,
                marginHorizontal: 20
              }]}>
                Discover
              </Text>
              <View style={[{
                backgroundColor: currentTheme.surface,
                marginHorizontal: 16,
                borderRadius: 12,
                padding: 32,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: currentTheme.border
              }]}>
                <Text style={[{ fontSize: 40, marginBottom: 12 }]}>🌟</Text>
                <Text style={[{ 
                  fontSize: 16, 
                  fontWeight: 'bold', 
                  color: currentTheme.text,
                  marginBottom: 8,
                  textAlign: 'center'
                }]}>
                  Discover More
                </Text>
                <Text style={[{ 
                  color: currentTheme.textSecondary,
                  textAlign: 'center',
                  fontSize: 14
                }]}>
                  Find trending stories and content from around the world
                </Text>
              </View>
            </View>
          )}

          {/* Empty State */}
          {friendStories.length === 0 && followingStories.length === 0 && (
            <View style={[{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32, paddingVertical: 60 }]}>
              <Text style={[{ fontSize: 48, marginBottom: 24 }]}>📚</Text>
              <Text style={[{ fontSize: 24, color: currentTheme.primary, fontWeight: 'bold', textAlign: 'center', marginBottom: 16 }]}>
                No Stories Yet!
              </Text>
              <Text style={[{ color: currentTheme.textSecondary, textAlign: 'center', fontSize: 16, marginBottom: 32, lineHeight: 24 }]}>
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
          )}
          
          {/* Bottom padding for safe scrolling */}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* Floating AI Assistant Button */}
      <FloatingAIButton
        onPress={() => setShowAIAssistant(true)}
        visible={!snap} // Hide when viewing a specific snap
      />

      {/* AI Assistant Modal */}
      <AIAssistant
        visible={showAIAssistant}
        onClose={() => setShowAIAssistant(false)}
        context="stories"
        onSuggestionSelect={handleAISuggestionSelect}
        userProfile={userProfile}
        conversationData={{
          messages: [],
          chatType: 'assistant',
          relationship: 'ai_helper',
          context: {
            screen: 'stories',
            hasStories: stories.length > 0,
            friendStoriesCount: friendStories.length,
            storyIdeas: storyIdeas
          }
        }}
      />
    </SafeAreaView>
  );
} 