import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Alert, StyleSheet, PanResponder } from 'react-native';
import { useAuth } from '../context/SupabaseAuthContext';
import { useTheme } from '../context/ThemeContext';

export default function FriendsScreen({ navigation }) {
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [friends, setFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
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
      if (dx > 100) { // Swipe right to go back to camera
        navigation.navigate('Camera');
      }
    },
  });

  useEffect(() => {
    if (currentUser) {
      loadFriends();
      loadPendingRequests();
    }
  }, [currentUser]);

  const loadFriends = async () => {
    try {
      if (!currentUser?.id) return;

      // Get accepted friendships where current user is either user_id or friend_id
      const { data: friendships, error } = await supabase
        .from('friendships')
        .select(`
          *,
          user_profile:profiles!friendships_user_id_fkey(*),
          friend_profile:profiles!friendships_friend_id_fkey(*)
        `)
        .or(`user_id.eq.${currentUser.id},friend_id.eq.${currentUser.id}`)
        .eq('status', 'accepted');

      if (error) {
        console.error('Error loading friends:', error);
        return;
      }

      // Extract friend profiles (the other person in each friendship)
      const friendProfiles = friendships.map(friendship => {
        if (friendship.user_id === currentUser.id) {
          return friendship.friend_profile;
        } else {
          return friendship.user_profile;
        }
      }).filter(profile => profile); // Remove any null profiles

      setFriends(friendProfiles);
    } catch (error) {
      console.error('Error loading friends:', error);
    }
  };

  const loadPendingRequests = async () => {
    try {
      if (!currentUser?.id) return;

      // Get pending friend requests sent TO current user
      const { data: requests, error } = await supabase
        .from('friendships')
        .select(`
          *,
          user_profile:profiles!friendships_user_id_fkey(*)
        `)
        .eq('friend_id', currentUser.id)
        .eq('status', 'pending');

      if (error) {
        console.error('Error loading pending requests:', error);
        return;
      }

      const requestProfiles = requests.map(request => ({
        ...request.user_profile,
        friendship_id: request.id
      }));

      setPendingRequests(requestProfiles);
    } catch (error) {
      console.error('Error loading pending requests:', error);
    }
  };

  const searchUsers = async () => {
    if (!searchText.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setLoading(true);
      
      // Search users by username (case insensitive)
      const { data: users, error } = await supabase
        .from('profiles')
        .select('*')
        .ilike('username', `%${searchText.toLowerCase()}%`)
        .neq('id', currentUser.id) // Don't show current user
        .limit(20);
      
      if (error) {
        console.error('Search error:', error);
        Alert.alert('Error', 'Failed to search users');
        return;
      }

      setSearchResults(users || []);
    } catch (error) {
      Alert.alert('Error', 'Failed to search users');
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendFriendRequest = async (friendId) => {
    try {
      // Check if friendship already exists
      const { data: existing, error: checkError } = await supabase
        .from('friendships')
        .select('*')
        .or(`and(user_id.eq.${currentUser.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${currentUser.id})`);

      if (checkError) {
        console.error('Error checking existing friendship:', checkError);
        Alert.alert('Error', 'Failed to send friend request');
        return;
      }

      if (existing && existing.length > 0) {
        const friendship = existing[0];
        if (friendship.status === 'accepted') {
          Alert.alert('Info', 'You are already friends with this user');
        } else if (friendship.status === 'pending') {
          Alert.alert('Info', 'Friend request already sent');
        }
        return;
      }

      // Create new friend request
      const { error: insertError } = await supabase
        .from('friendships')
        .insert({
          user_id: currentUser.id,
          friend_id: friendId,
          status: 'pending'
        });

      if (insertError) {
        console.error('Error sending friend request:', insertError);
        Alert.alert('Error', 'Failed to send friend request');
        return;
      }
      
      Alert.alert('🎉 Success!', 'Friend request sent!');
      setSearchText('');
      setSearchResults([]);
    } catch (error) {
      Alert.alert('Error', 'Failed to send friend request');
      console.error('Send friend request error:', error);
    }
  };

  const acceptFriendRequest = async (friendshipId) => {
    try {
      const { error } = await supabase
        .from('friendships')
        .update({ status: 'accepted' })
        .eq('id', friendshipId);

      if (error) {
        console.error('Error accepting friend request:', error);
        Alert.alert('Error', 'Failed to accept friend request');
        return;
      }
      
      Alert.alert('🎉 Success!', 'Friend request accepted!');
      loadFriends();
      loadPendingRequests();
    } catch (error) {
      Alert.alert('Error', 'Failed to accept friend request');
      console.error('Accept friend request error:', error);
    }
  };

  const rejectFriendRequest = async (friendshipId) => {
    try {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId);

      if (error) {
        console.error('Error rejecting friend request:', error);
        Alert.alert('Error', 'Failed to reject friend request');
        return;
      }
      
      Alert.alert('Success', 'Friend request rejected');
      loadPendingRequests();
    } catch (error) {
      Alert.alert('Error', 'Failed to reject friend request');
      console.error('Reject friend request error:', error);
    }
  };

  const removeFriend = async (friendId) => {
    try {
      // Find and delete the friendship
      const { error } = await supabase
        .from('friendships')
        .delete()
        .or(`and(user_id.eq.${currentUser.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${currentUser.id})`);

      if (error) {
        console.error('Error removing friend:', error);
        Alert.alert('Error', 'Failed to remove friend');
        return;
      }
      
      Alert.alert('Success', 'Friend removed');
      loadFriends();
    } catch (error) {
      Alert.alert('Error', 'Failed to remove friend');
      console.error('Remove friend error:', error);
    }
  };

  const getFriendshipStatus = (userId) => {
    // Check if already friends
    const isFriend = friends.some(friend => friend.id === userId);
    if (isFriend) return 'friends';
    
    // Check if there's a pending request
    const hasPendingRequest = pendingRequests.some(request => request.id === userId);
    if (hasPendingRequest) return 'pending_incoming';
    
    return 'none';
  };

  const renderPendingRequest = ({ item }) => (
    <View style={[{ backgroundColor: currentTheme.surface, borderRadius: 12, marginHorizontal: 16, marginBottom: 12, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: currentTheme.border }]}>
      <View style={[{ flexDirection: 'row', alignItems: 'center', flex: 1 }]}>
        <View style={[{ backgroundColor: currentTheme.primary, borderRadius: 28, width: 56, height: 56, justifyContent: 'center', alignItems: 'center', marginRight: 16 }]}>
          <Text style={[{ color: currentTheme.background, fontWeight: 'bold', fontSize: 20 }]}>
            {item.username?.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={[{ flex: 1 }]}>
          <Text style={[{ fontWeight: 'bold', fontSize: 20, color: currentTheme.primary }]}>{item.username}</Text>
          <Text style={[{ color: currentTheme.textSecondary }]}>{item.email}</Text>
        </View>
      </View>
      
      <View style={[{ flexDirection: 'row', gap: 8 }]}>
        <TouchableOpacity
          style={[{ backgroundColor: currentTheme.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 }]}
          onPress={() => acceptFriendRequest(item.friendship_id)}
        >
          <Text style={[{ fontWeight: 'bold', color: currentTheme.background, fontSize: 12 }]}>✓ Accept</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[{ backgroundColor: '#ef4444', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 }]}
          onPress={() => rejectFriendRequest(item.friendship_id)}
        >
          <Text style={[{ fontWeight: 'bold', color: 'white', fontSize: 12 }]}>✗ Reject</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderSearchResult = ({ item }) => {
    const status = getFriendshipStatus(item.id);
    
    return (
      <View style={[{ backgroundColor: currentTheme.surface, borderRadius: 12, marginHorizontal: 16, marginBottom: 12, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: currentTheme.border }]}>
        <View style={[{ flexDirection: 'row', alignItems: 'center', flex: 1 }]}>
          <View style={[{ backgroundColor: currentTheme.primary, borderRadius: 28, width: 56, height: 56, justifyContent: 'center', alignItems: 'center', marginRight: 16 }]}>
            <Text style={[{ color: currentTheme.background, fontWeight: 'bold', fontSize: 20 }]}>
              {item.username?.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={[{ flex: 1 }]}>
            <Text style={[{ fontWeight: 'bold', fontSize: 20, color: currentTheme.primary }]}>{item.username}</Text>
            <Text style={[{ color: currentTheme.textSecondary }]}>{item.email}</Text>
          </View>
        </View>
        
        {status === 'friends' ? (
          <TouchableOpacity
            style={[{ backgroundColor: '#ef4444', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 24 }]}
            onPress={() => removeFriend(item.id)}
          >
            <Text style={[{ fontWeight: 'bold', color: 'white' }]}>❌ Remove</Text>
          </TouchableOpacity>
        ) : status === 'pending_incoming' ? (
          <View style={[{ backgroundColor: '#f59e0b', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 24 }]}>
            <Text style={[{ fontWeight: 'bold', color: 'white' }]}>⏳ Pending</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[{ backgroundColor: currentTheme.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 24 }]}
            onPress={() => sendFriendRequest(item.id)}
          >
            <Text style={[{ fontWeight: 'bold', color: currentTheme.background }]}>➕ Add</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const startChat = async (friend) => {
    if (!currentUser?.id || !friend?.id) {
      Alert.alert('Error', 'Unable to start chat - missing user information');
      return;
    }

    try {
      // Get or create conversation between current user and friend
      const { data: conversationId, error } = await supabase
        .rpc('get_or_create_conversation', {
          user_one: currentUser.id,
          user_two: friend.id
        });

      if (error) {
        console.error('Error creating conversation:', error);
        Alert.alert('Error', 'Failed to start chat');
        return;
      }

      console.log('Created/found conversation:', conversationId);

      // Navigate to chat screen - conversationId is now a direct UUID
      navigation.navigate('Chat', {
        conversationId,
        otherUser: friend
      });
    } catch (error) {
      console.error('Error starting chat:', error);
      Alert.alert('Error', 'Failed to start chat');
    }
  };

  const renderFriend = ({ item }) => (
    <View style={[{ backgroundColor: currentTheme.surface, borderRadius: 12, marginHorizontal: 16, marginBottom: 12, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: currentTheme.border }]}>
      <View style={[{ flexDirection: 'row', alignItems: 'center', flex: 1 }]}>
        <View style={[{ backgroundColor: currentTheme.primary, borderRadius: 28, width: 56, height: 56, justifyContent: 'center', alignItems: 'center', marginRight: 16 }]}>
          <Text style={[{ color: currentTheme.background, fontWeight: 'bold', fontSize: 20 }]}>
            {item.username?.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={[{ flex: 1 }]}>
          <Text style={[{ fontWeight: 'bold', fontSize: 20, color: currentTheme.primary }]}>{item.username}</Text>
          <Text style={[{ color: currentTheme.textSecondary }]}>{item.email}</Text>
        </View>
      </View>
      
      <View style={[{ flexDirection: 'row', gap: 8 }]}>
        <TouchableOpacity
          style={[{ backgroundColor: currentTheme.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 }]}
          onPress={() => startChat(item)}
        >
          <Text style={[{ color: currentTheme.background, fontWeight: 'bold', fontSize: 12 }]}>💬 Message</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[{ backgroundColor: '#ef4444', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 }]}
          onPress={() => removeFriend(item.id)}
        >
          <Text style={[{ color: 'white', fontWeight: 'bold', fontSize: 12 }]}>❌ Remove</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const onRefresh = () => {
    setRefreshing(true);
    Promise.all([loadFriends(), loadPendingRequests()]).finally(() => {
      setRefreshing(false);
    });
  };

  return (
    <View style={[{ flex: 1, backgroundColor: currentTheme.background }]} {...panResponder.panHandlers}>
      {/* Header */}
      <View style={[{ backgroundColor: currentTheme.background, paddingTop: 56, paddingBottom: 24, paddingHorizontal: 24, borderBottomWidth: 1, borderBottomColor: currentTheme.border }]}>
        <View style={[{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={[{ color: currentTheme.primary, fontSize: 18, fontWeight: '600' }]}>← Back</Text>
          </TouchableOpacity>
          
          <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
            <TouchableOpacity 
              onPress={() => navigation.navigate('Camera')}
              style={[{
                backgroundColor: currentTheme.primary,
                borderRadius: 20,
                paddingHorizontal: 16,
                paddingVertical: 8
              }]}
            >
              <Text style={[{
                color: currentTheme.background,
                fontWeight: 'bold',
                fontSize: 14
              }]}>
                📸 Camera
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity onPress={onRefresh}>
              <Text style={[{ color: currentTheme.primary, fontSize: 18, fontWeight: '600' }]}>🔄</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={[{ alignItems: 'center' }]}>
          <Text style={[{ fontSize: 30, fontWeight: 'bold', color: currentTheme.primary, textAlign: 'center', marginBottom: 8 }]}>👥 Friends</Text>
          <Text style={[{ color: currentTheme.textSecondary, textAlign: 'center' }]}>
            Connect with friends and share moments! ✨
          </Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={[{ paddingHorizontal: 16, paddingTop: 24 }]}>
        <View style={[{ backgroundColor: currentTheme.surface, borderRadius: 24, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16, borderWidth: 1, borderColor: currentTheme.border }]}>
          <TextInput
            style={[styles.searchInput, { color: currentTheme.text }]}
            placeholder="Search by username..."
            placeholderTextColor={currentTheme.textSecondary}
            value={searchText}
            onChangeText={setSearchText}
            onSubmitEditing={searchUsers}
          />
          <TouchableOpacity
            onPress={searchUsers}
            style={[{ backgroundColor: currentTheme.primary, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, marginLeft: 8 }]}
            disabled={loading}
          >
            <Text style={[{ color: currentTheme.background, fontWeight: 'bold' }]}>
              {loading ? '⏳' : '🔍'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={[]}
        renderItem={() => null}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListHeaderComponent={
          <View>
            {/* Pending Requests Section */}
            {pendingRequests.length > 0 && (
              <View style={[{ paddingHorizontal: 16, paddingTop: 24 }]}>
                <Text style={[{ fontSize: 20, fontWeight: 'bold', color: currentTheme.primary, marginBottom: 16, textAlign: 'center' }]}>
                  Friend Requests ({pendingRequests.length})
                </Text>
                {pendingRequests.map(request => (
                  <View key={request.id}>
                    {renderPendingRequest({ item: request })}
                  </View>
                ))}
              </View>
            )}

            {/* My Friends Section */}
            <View style={[{ paddingHorizontal: 16, paddingTop: 24 }]}>
              <Text style={[{ fontSize: 20, fontWeight: 'bold', color: currentTheme.primary, marginBottom: 16, textAlign: 'center' }]}>
                My Friends ({friends.length})
              </Text>
              
              {friends.length === 0 ? (
                <View style={[{ alignItems: 'center', paddingVertical: 32 }]}>
                  <Text style={[{ fontSize: 32, marginBottom: 16 }]}>👤</Text>
                  <Text style={[{ fontSize: 18, color: currentTheme.textSecondary, textAlign: 'center' }]}>
                    No friends yet! Start by searching above. 🔍
                  </Text>
                </View>
              ) : (
                friends.map(friend => (
                  <View key={friend.id}>
                    {renderFriend({ item: friend })}
                  </View>
                ))
              )}
            </View>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <View style={[{ paddingHorizontal: 16, paddingTop: 24 }]}>
                <Text style={[{ fontSize: 20, fontWeight: 'bold', color: currentTheme.primary, marginBottom: 16, textAlign: 'center' }]}>
                  Search Results ({searchResults.length})
                </Text>
                {searchResults.map(result => (
                  <View key={result.id}>
                    {renderSearchResult({ item: result })}
                  </View>
                ))}
              </View>
            )}

            {/* No Results Message */}
            {searchText.length > 0 && searchResults.length === 0 && !loading && (
              <View style={[{ justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32, paddingVertical: 40 }]}>
                <Text style={[{ fontSize: 32, marginBottom: 16 }]}>🔍</Text>
                <Text style={[{ fontSize: 18, color: currentTheme.textSecondary, textAlign: 'center' }]}>
                  No users found with that username. Try a different search! 
                </Text>
              </View>
            )}
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  searchInput: {
    flex: 1,
    fontSize: 18,
    textAlign: 'left',
  }
}); 