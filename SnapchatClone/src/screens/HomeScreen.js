import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, Alert } from 'react-native';
import { db } from '../../firebaseConfig';
import { useAuth } from '../context/AuthContext';

export default function HomeScreen({ navigation }) {
  const [snaps, setSnaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const { currentUser, logout } = useAuth();

  useEffect(() => {
    if (!currentUser) return;

    // Listen to snaps from friends using compat API
    const unsubscribe = db.collection('snaps')
      .where('userId', '!=', currentUser.uid)
      .orderBy('createdAt', 'desc')
      .onSnapshot((querySnapshot) => {
        const snapsData = [];
        querySnapshot.forEach((doc) => {
          const snap = { id: doc.id, ...doc.data() };
          // Only show snaps that haven't expired and haven't been viewed by current user
          const expirationDate = snap.expiresAt?.toDate ? snap.expiresAt.toDate() : new Date(snap.expiresAt);
          if (expirationDate > new Date() && !snap.viewers?.includes(currentUser.uid)) {
            snapsData.push(snap);
          }
        });
        setSnaps(snapsData);
        setLoading(false);
      }, (error) => {
        console.error('Error fetching snaps:', error);
        setLoading(false);
      });

    return unsubscribe;
  }, [currentUser]);

  const viewSnap = async (snap) => {
    try {
      // Mark snap as viewed using compat API
      await db.collection('snaps').doc(snap.id).update({
        viewers: [...(snap.viewers || []), currentUser.uid]
      });
      
      // Navigate to story view
      navigation.navigate('Stories', { snap });
    } catch (error) {
      Alert.alert('Error', 'Failed to view snap');
      console.error('View snap error:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      Alert.alert('Error', 'Failed to logout');
    }
  };

  const renderSnapItem = ({ item }) => (
    <TouchableOpacity
      className="bg-snapGray rounded-xl mx-4 mb-4 p-4 shadow-lg border border-gray-600"
      onPress={() => viewSnap(item)}
    >
      <View className="flex-row items-center mb-4">
        <View className="bg-snapYellow rounded-full w-14 h-14 justify-center items-center mr-4">
          <Text className="text-black font-bold text-xl">
            {item.username?.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View className="flex-1">
          <Text className="font-bold text-xl text-snapYellow">{item.username}</Text>
          <Text className="text-gray-300 text-sm">
            {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleTimeString() : 'Just now'}
          </Text>
        </View>
      </View>
      <View className="bg-gray-800 rounded-xl h-48 justify-center items-center">
        <Text className="text-snapYellow text-2xl mb-2">📸</Text>
        <Text className="text-snapYellow text-lg font-semibold">Tap to view snap</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-snapBlack">
      {/* Header */}
      <View className="bg-snapBlack pt-14 pb-6 px-6 border-b border-gray-700">
        <View className="flex-row justify-between items-center mb-2">
          <TouchableOpacity onPress={() => navigation.navigate('Camera')}>
            <Text className="text-snapYellow text-lg font-semibold">← Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
            <View className="bg-snapYellow rounded-full p-2">
              <Text className="text-black font-bold text-lg">👤</Text>
            </View>
          </TouchableOpacity>
        </View>
        <View className="items-center">
          <Text className="text-3xl font-bold text-snapYellow text-center">💬 Your Snaps</Text>
          <Text className="text-gray-400 text-center mt-2">
            Welcome back, {currentUser?.username || 'Friend'}! 👋
          </Text>
        </View>
      </View>

      {/* Content */}
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <Text className="text-2xl mb-4">⏳</Text>
          <Text className="text-xl text-snapYellow font-semibold">Loading your snaps...</Text>
          <Text className="text-gray-400 text-center mt-2">Just a moment!</Text>
        </View>
      ) : snaps.length === 0 ? (
        <View className="flex-1 justify-center items-center px-8">
          <Text className="text-6xl mb-6">📭</Text>
          <Text className="text-2xl text-snapYellow font-bold text-center mb-4">
            No new snaps yet!
          </Text>
          <Text className="text-gray-400 text-center text-lg mb-8 leading-6">
            Add friends and start sharing moments to see snaps appear here. Your adventure awaits! ✨
          </Text>
          <TouchableOpacity
            className="bg-snapYellow rounded-full px-8 py-4 shadow-lg"
            onPress={() => navigation.navigate('Camera')}
          >
            <Text className="text-black font-bold text-lg">📷 Take Your First Snap</Text>
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
          data={snaps}
          renderItem={renderSnapItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingTop: 20, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Bottom Navigation */}
      <View className="absolute bottom-0 left-0 right-0 bg-snapGray border-t border-gray-600 shadow-lg">
        <View className="flex-row justify-around py-4">
          <TouchableOpacity
            onPress={() => navigation.navigate('Friends')}
            className="items-center flex-1"
          >
            <Text className="text-3xl mb-1">👥</Text>
            <Text className="text-xs text-snapYellow font-semibold">Friends</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={() => navigation.navigate('Camera')}
            className="items-center flex-1"
          >
            <Text className="text-3xl mb-1">📷</Text>
            <Text className="text-xs text-snapYellow font-semibold">Camera</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={() => navigation.navigate('Stories')}
            className="items-center flex-1"
          >
            <Text className="text-3xl mb-1">📖</Text>
            <Text className="text-xs text-snapYellow font-semibold">Stories</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('Profile')}
            className="items-center flex-1"
          >
            <Text className="text-3xl mb-1">👤</Text>
            <Text className="text-xs text-snapYellow font-semibold">Profile</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
} 