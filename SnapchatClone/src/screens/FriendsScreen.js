import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Alert, StyleSheet, PanResponder } from 'react-native';
import { db } from '../../firebaseConfig';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function FriendsScreen({ navigation }) {
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(false);
  const { currentUser } = useAuth();
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
    if (currentUser?.friends) {
      loadFriends();
    }
  }, [currentUser]);

  const loadFriends = async () => {
    try {
      if (!currentUser?.friends || currentUser.friends.length === 0) {
        setFriends([]);
        return;
      }

      // Get friends data using compat API
      const friendsData = [];
      for (const friendId of currentUser.friends) {
        const friendDoc = await db.collection('users').doc(friendId).get();
        if (friendDoc.exists) {
          friendsData.push({ id: friendDoc.id, ...friendDoc.data() });
        }
      }
      
      setFriends(friendsData);
    } catch (error) {
      console.error('Error loading friends:', error);
    }
  };

  const searchUsers = async () => {
    if (!searchText.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setLoading(true);
      
      // Search users using compat API
      const querySnapshot = await db.collection('users')
        .where('username', '>=', searchText.toLowerCase())
        .where('username', '<=', searchText.toLowerCase() + '\uf8ff')
        .get();
      
      const users = [];
      querySnapshot.forEach((doc) => {
        const userData = { id: doc.id, ...doc.data() };
        // Don't show current user in search results
        if (userData.id !== currentUser.uid) {
          users.push(userData);
        }
      });
      
      setSearchResults(users);
    } catch (error) {
      Alert.alert('Error', 'Failed to search users');
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const addFriend = async (friendId) => {
    try {
      // Add friend to current user's friends list using compat API
      await db.collection('users').doc(currentUser.uid).update({
        friends: [...(currentUser.friends || []), friendId]
      });
      
      // Add current user to friend's friends list
      const friendDoc = await db.collection('users').doc(friendId).get();
      const friendData = friendDoc.data();
      await db.collection('users').doc(friendId).update({
        friends: [...(friendData.friends || []), currentUser.uid]
      });
      
      Alert.alert('🎉 Success!', 'Friend added successfully!');
      loadFriends();
      setSearchText('');
      setSearchResults([]);
    } catch (error) {
      Alert.alert('Error', 'Failed to add friend');
      console.error('Add friend error:', error);
    }
  };

  const removeFriend = async (friendId) => {
    try {
      // Remove friend from current user's friends list
      const updatedFriends = currentUser.friends.filter(id => id !== friendId);
      await db.collection('users').doc(currentUser.uid).update({
        friends: updatedFriends
      });
      
      // Remove current user from friend's friends list
      const friendDoc = await db.collection('users').doc(friendId).get();
      const friendData = friendDoc.data();
      const updatedFriendFriends = friendData.friends.filter(id => id !== currentUser.uid);
      await db.collection('users').doc(friendId).update({
        friends: updatedFriendFriends
      });
      
      Alert.alert('Success', 'Friend removed');
      loadFriends();
    } catch (error) {
      Alert.alert('Error', 'Failed to remove friend');
      console.error('Remove friend error:', error);
    }
  };

  const isFriend = (userId) => {
    return currentUser?.friends?.includes(userId);
  };

  const renderSearchResult = ({ item }) => (
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
      
      <TouchableOpacity
        style={[{ paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24, backgroundColor: isFriend(item.id) ? '#ef4444' : currentTheme.primary }]}
        onPress={() => isFriend(item.id) ? removeFriend(item.id) : addFriend(item.id)}
      >
        <Text style={[{ fontWeight: 'bold', color: isFriend(item.id) ? 'white' : currentTheme.background }]}>
          {isFriend(item.id) ? '❌ Remove' : '➕ Add'}
        </Text>
      </TouchableOpacity>
    </View>
  );

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
      
      <TouchableOpacity
        style={[{ backgroundColor: '#ef4444', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 }]}
        onPress={() => removeFriend(item.id)}
      >
        <Text style={[{ color: 'white', fontWeight: 'bold' }]}>❌ Remove</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[{ flex: 1, backgroundColor: currentTheme.background }]} {...panResponder.panHandlers}>
      {/* Header */}
      <View style={[{ backgroundColor: currentTheme.background, paddingTop: 56, paddingBottom: 24, paddingHorizontal: 24, borderBottomWidth: 1, borderBottomColor: currentTheme.border }]}>
        <View style={[{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }]}>
          <View style={[{ width: 70 }]} />
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={[{ color: currentTheme.primary, fontSize: 18, fontWeight: '600' }]}>Back →</Text>
          </TouchableOpacity>
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
          <FlatList
            data={friends}
            renderItem={renderFriend}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            style={{ maxHeight: 200 }}
          />
        )}
      </View>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <View style={[{ flex: 1, paddingHorizontal: 16, paddingTop: 16 }]}>
          <Text style={[{ fontSize: 20, fontWeight: 'bold', color: currentTheme.primary, marginBottom: 16, textAlign: 'center' }]}>
            Search Results
          </Text>
          <FlatList
            data={searchResults}
            renderItem={renderSearchResult}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}

      {searchText.length > 0 && searchResults.length === 0 && !loading && (
        <View style={[{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }]}>
          <Text style={[{ fontSize: 32, marginBottom: 16 }]}>🔍</Text>
          <Text style={[{ fontSize: 18, color: currentTheme.textSecondary, textAlign: 'center' }]}>
            No users found with that username. Try a different search! 
          </Text>
        </View>
      )}
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