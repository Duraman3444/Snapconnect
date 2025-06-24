import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Alert, StyleSheet, PanResponder } from 'react-native';
import { db } from '../../firebaseConfig';
import { useAuth } from '../context/AuthContext';

export default function FriendsScreen({ navigation }) {
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(false);
  const { currentUser } = useAuth();

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
    <View className="bg-snapGray rounded-xl mx-4 mb-3 p-4 flex-row items-center justify-between border border-gray-600 shadow-lg">
      <View className="flex-row items-center flex-1">
        <View className="bg-snapYellow rounded-full w-14 h-14 justify-center items-center mr-4">
          <Text className="text-black font-bold text-xl">
            {item.username?.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View className="flex-1">
          <Text className="font-bold text-xl text-snapYellow">{item.username}</Text>
          <Text className="text-gray-300">{item.email}</Text>
        </View>
      </View>
      
      <TouchableOpacity
        className={`px-6 py-3 rounded-full shadow-md ${
          isFriend(item.id) ? 'bg-red-500' : 'bg-snapYellow'
        }`}
        onPress={() => isFriend(item.id) ? removeFriend(item.id) : addFriend(item.id)}
      >
        <Text className={`font-bold ${
          isFriend(item.id) ? 'text-white' : 'text-black'
        }`}>
          {isFriend(item.id) ? '❌ Remove' : '➕ Add'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderFriend = ({ item }) => (
    <View className="bg-snapGray rounded-xl mx-4 mb-3 p-4 flex-row items-center justify-between border border-gray-600 shadow-lg">
      <View className="flex-row items-center flex-1">
        <View className="bg-snapYellow rounded-full w-14 h-14 justify-center items-center mr-4">
          <Text className="text-black font-bold text-xl">
            {item.username?.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View className="flex-1">
          <Text className="font-bold text-xl text-snapYellow">{item.username}</Text>
          <Text className="text-gray-300">{item.email}</Text>
        </View>
      </View>
      
      <TouchableOpacity
        className="bg-red-500 px-6 py-3 rounded-full shadow-md"
        onPress={() => removeFriend(item.id)}
      >
        <Text className="text-white font-bold">❌ Remove</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View className="flex-1 bg-snapBlack" {...panResponder.panHandlers}>
      {/* Header */}
      <View className="bg-snapBlack pt-14 pb-6 px-6 border-b border-gray-700">
        <View className="flex-row items-center justify-between mb-4">
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text className="text-snapYellow text-lg font-semibold">← Back</Text>
          </TouchableOpacity>
        </View>
        <View className="items-center">
          <Text className="text-3xl font-bold text-snapYellow text-center mb-2">👥 Friends</Text>
          <Text className="text-gray-400 text-center">
            Connect with friends and share moments! ✨
          </Text>
        </View>
      </View>

      {/* Search Bar */}
      <View className="px-4 pt-6">
        <View className="bg-snapGray rounded-full flex-row items-center px-6 py-4 border border-gray-600 shadow-lg">
          <TextInput
            style={styles.searchInput}
            placeholder="Search by username..."
            placeholderTextColor="#888"
            value={searchText}
            onChangeText={setSearchText}
            onSubmitEditing={searchUsers}
          />
          <TouchableOpacity
            onPress={searchUsers}
            className="bg-snapYellow rounded-full px-4 py-2 ml-2"
            disabled={loading}
          >
            <Text className="text-black font-bold">
              {loading ? '⏳' : '🔍'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* My Friends Section */}
      <View className="px-4 pt-6">
        <Text className="text-xl font-bold text-snapYellow mb-4 text-center">
          My Friends ({friends.length})
        </Text>
        
        {friends.length === 0 ? (
          <View className="items-center py-8">
            <Text className="text-4xl mb-4">👤</Text>
            <Text className="text-lg text-gray-400 text-center">
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
        <View className="flex-1 px-4 pt-4">
          <Text className="text-xl font-bold text-snapYellow mb-4 text-center">
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
        <View className="flex-1 justify-center items-center px-8">
          <Text className="text-4xl mb-4">🔍</Text>
          <Text className="text-lg text-gray-400 text-center">
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
    color: 'white',
    textAlign: 'left',
  }
}); 