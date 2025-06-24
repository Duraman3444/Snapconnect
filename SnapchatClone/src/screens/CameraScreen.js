import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, Image, StyleSheet, PanResponder, Dimensions, Modal, ScrollView, SafeAreaView } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import { useAuth } from '../context/SupabaseAuthContext';
import { useTheme } from '../context/ThemeContext';

export default function CameraScreen({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState('back');
  const [photo, setPhoto] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [showFriendSelection, setShowFriendSelection] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState([]);
  const [friends, setFriends] = useState([]);
  const cameraRef = useRef();
  const { currentUser, logout, supabase } = useAuth();
  const { currentTheme } = useTheme();

  // Get screen dimensions for gesture detection
  const screenWidth = Dimensions.get('window').width;
  const swipeThreshold = screenWidth * 0.25; // 25% of screen width

  // Gesture handling for swipe navigation
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gestureState) => {
      // Only handle horizontal swipes
      return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 20;
    },
    onPanResponderRelease: (_, gestureState) => {
      // Only handle swipes if no photo is being previewed
      if (photo) return;

      const { dx, dy } = gestureState;
      
      // Check if it's a horizontal swipe (more horizontal than vertical movement)
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > swipeThreshold) {
        if (dx > 0) {
          // Swipe right -> Stories
          console.log('Swiped right - navigating to Stories');
          navigation.navigate('Stories');
        } else {
          // Swipe left -> Friends
          console.log('Swiped left - navigating to Friends');
          navigation.navigate('Friends');
        }
      }
    },
  });

  useEffect(() => {
    (async () => {
      if (!permission?.granted) {
        await requestPermission();
      }
      await MediaLibrary.requestPermissionsAsync();
    })();
  }, [permission, requestPermission]);

  // Load friends list
  useEffect(() => {
    const loadFriends = async () => {
      try {
        // Mock friends data - you can replace this with actual Firebase friends query
        const mockFriends = [
          { id: '1', username: 'alice_doe', displayName: 'Alice Doe', avatar: '👩' },
          { id: '2', username: 'bob_smith', displayName: 'Bob Smith', avatar: '👨' },
          { id: '3', username: 'charlie_brown', displayName: 'Charlie Brown', avatar: '🧑' },
          { id: '4', username: 'diana_prince', displayName: 'Diana Prince', avatar: '👩‍🦳' },
          { id: '5', username: 'eddie_murphy', displayName: 'Eddie Murphy', avatar: '👨‍🦱' },
        ];
        setFriends(mockFriends);
      } catch (error) {
        console.error('Error loading friends:', error);
      }
    };

    if (currentUser) {
      loadFriends();
    }
  }, [currentUser]);

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync();
        setPhoto(photo);
      } catch (error) {
        Alert.alert('Error', 'Failed to take picture');
        console.error('Take picture error:', error);
      }
    }
  };

  const showFriendSelectionModal = () => {
    setShowFriendSelection(true);
    setSelectedFriends([]);
  };

  const toggleFriendSelection = (friendId) => {
    setSelectedFriends(prev => {
      if (prev.includes(friendId)) {
        return prev.filter(id => id !== friendId);
      } else {
        return [...prev, friendId];
      }
    });
  };

  const sendSnapToSelectedFriends = async () => {
    if (!photo || selectedFriends.length === 0) {
      Alert.alert('Error', 'Please select at least one friend');
      return;
    }

    try {
      setUploading(true);
      
      // Convert photo to blob
      const response = await fetch(photo.uri);
      const blob = await response.blob();
      
      // Upload to Supabase Storage
      const fileName = `snaps/${currentUser.id}/${Date.now()}.jpg`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('media')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(fileName);
      
      // Create individual snaps for each selected friend
      const snapPromises = selectedFriends.map(friendId => {
        const selectedFriend = friends.find(f => f.id === friendId);
        return supabase.from('snaps').insert({
          sender_id: currentUser.id,
          sender_username: currentUser.username || 'Anonymous',
          recipient_id: friendId,
          recipient_username: selectedFriend?.username || 'Unknown',
          image_url: publicUrl,
          type: 'snap',
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
          viewed: false
        });
      });

      const results = await Promise.all(snapPromises);
      
      // Check if any inserts failed
      const hasErrors = results.some(result => result.error);
      if (hasErrors) {
        console.error('Some snaps failed to send:', results.filter(r => r.error));
      }
      
      const selectedFriendNames = selectedFriends.map(id => 
        friends.find(f => f.id === id)?.displayName || 'Unknown'
      ).join(', ');
      
      Alert.alert('Success', `Snap sent to ${selectedFriendNames}!`);
      setPhoto(null);
      setShowFriendSelection(false);
      setSelectedFriends([]);
    } catch (error) {
      Alert.alert('Error', 'Failed to send snap');
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  const uploadStory = async () => {
    if (!photo) return;

    try {
      setUploading(true);
      
      // Convert photo to blob
      const response = await fetch(photo.uri);
      const blob = await response.blob();
      
      // Upload to Supabase Storage
      const fileName = `stories/${currentUser.id}/${Date.now()}.jpg`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('media')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(fileName);
      
      // Save story data to Supabase
      const { error: insertError } = await supabase.from('stories').insert({
        user_id: currentUser.id,
        username: currentUser.username || 'Anonymous',
        image_url: publicUrl,
        type: 'story',
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
        viewers: []
      });

      if (insertError) throw insertError;
      
      Alert.alert('Success', 'Story shared with friends!');
      setPhoto(null);
    } catch (error) {
      Alert.alert('Error', 'Failed to share story');
      console.error('Upload story error:', error);
    } finally {
      setUploading(false);
    }
  };

  const retakePhoto = () => {
    setPhoto(null);
  };

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      Alert.alert('Error', 'Failed to logout');
    }
  };

  if (!permission) {
    return <View className="flex-1 justify-center items-center bg-black" />;
  }

  if (!permission.granted) {
    return (
      <View style={[{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }, { backgroundColor: currentTheme.background }]}>
        <Text style={[{ fontSize: 18, textAlign: 'center', marginBottom: 16 }, { color: currentTheme.text }]}>
          We need your permission to show the camera
        </Text>
        <TouchableOpacity
          style={[{ borderRadius: 24, paddingHorizontal: 24, paddingVertical: 12 }, { backgroundColor: currentTheme.primary }]}
          onPress={requestPermission}
        >
          <Text style={[{ fontWeight: '600' }, { color: currentTheme.background }]}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (photo) {
    return (
      <View className="flex-1 bg-black">
        <Image source={{ uri: photo.uri }} className="flex-1" />
        
        {/* Photo preview overlay */}
        <View style={styles.photoOverlay}>
          <TouchableOpacity
            style={[{ backgroundColor: 'white', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10 }]}
            onPress={retakePhoto}
          >
            <Text style={[{ color: 'black', fontWeight: '600', fontSize: 14 }]}>Retake</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[{ backgroundColor: currentTheme.primary, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10 }]}
            onPress={showFriendSelectionModal}
            disabled={uploading}
          >
            <Text style={[{ color: currentTheme.background, fontWeight: '600', fontSize: 14 }]}>
              📤 Snap
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[{ backgroundColor: '#FF6B6B', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10 }]}
            onPress={uploadStory}
            disabled={uploading}
          >
            <Text style={[{ color: 'white', fontWeight: '600', fontSize: 14 }]}>
              {uploading ? 'Sharing...' : '📖 Story'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black" {...panResponder.panHandlers}>
      <CameraView 
        style={StyleSheet.absoluteFillObject} 
        facing={facing} 
        ref={cameraRef}
      />
      
      {/* Top Header */}
      <View style={styles.topHeader}>
        <Text style={[{ fontSize: 24, fontWeight: 'bold' }, { color: currentTheme.primary }]}>👻 SnapConnect</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
          <View style={[{ borderRadius: 20, padding: 8 }, { backgroundColor: currentTheme.primary }]}>
            <Text style={[{ fontWeight: 'bold', fontSize: 18 }, { color: currentTheme.background }]}>👤</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Swipe Indicators */}
      <View style={styles.swipeIndicators}>
        {/* Left swipe indicator - Friends */}
        <TouchableOpacity 
          style={styles.leftSwipeIndicator}
          onPress={() => navigation.navigate('Friends')}
          activeOpacity={0.7}
        >
          <Text className="text-white text-opacity-60 text-sm">👥</Text>
          <Text className="text-white text-opacity-60 text-xs">Friends</Text>
          <Text className="text-white text-opacity-60 text-xs">← Swipe</Text>
        </TouchableOpacity>
        
        {/* Right swipe indicator - Stories */}
        <TouchableOpacity 
          style={styles.rightSwipeIndicator}
          onPress={() => navigation.navigate('Stories')}
          activeOpacity={0.7}
        >
          <Text className="text-white text-opacity-60 text-sm">📖</Text>
          <Text className="text-white text-opacity-60 text-xs">Stories</Text>
          <Text className="text-white text-opacity-60 text-xs">Swipe →</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom Camera Controls */}
      <View style={styles.bottomControls}>
        <TouchableOpacity
          style={[{ borderRadius: 25, padding: 16 }, { backgroundColor: 'rgba(255, 255, 255, 0.9)' }]}
          onPress={toggleCameraFacing}
        >
          <Text style={{ fontSize: 20, fontWeight: 'bold' }}>🔄</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.captureButton, { backgroundColor: 'white', justifyContent: 'center', alignItems: 'center', borderRadius: 42.5 }]}
          onPress={takePicture}
        >
          <View style={[styles.captureButtonInner, { backgroundColor: 'black', borderRadius: 37.5 }]} />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[{ borderRadius: 25, padding: 16 }, { backgroundColor: 'rgba(255, 255, 255, 0.9)' }]}
          onPress={() => navigation.navigate('Stories')}
        >
          <Text style={{ fontSize: 20, fontWeight: 'bold' }}>📖</Text>
        </TouchableOpacity>
      </View>

      {/* Friend Selection Modal */}
      <Modal
        visible={showFriendSelection}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFriendSelection(false)}
      >
        <View style={styles.modalOverlay}>
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity 
                onPress={() => setShowFriendSelection(false)}
                style={styles.modalCloseButton}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Send to Friends</Text>
              <TouchableOpacity 
                onPress={sendSnapToSelectedFriends}
                style={[styles.modalSendButton, { opacity: selectedFriends.length > 0 ? 1 : 0.5 }]}
                disabled={selectedFriends.length === 0 || uploading}
              >
                <Text style={styles.modalSendText}>
                  {uploading ? 'Sending...' : `Send (${selectedFriends.length})`}
                </Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.friendsList}>
              {friends.map((friend) => (
                <TouchableOpacity
                  key={friend.id}
                  style={[
                    styles.friendItem,
                    selectedFriends.includes(friend.id) && styles.friendItemSelected
                  ]}
                  onPress={() => toggleFriendSelection(friend.id)}
                >
                  <View style={styles.friendInfo}>
                    <Text style={styles.friendAvatar}>{friend.avatar}</Text>
                    <View style={styles.friendDetails}>
                      <Text style={styles.friendName}>{friend.displayName}</Text>
                      <Text style={styles.friendUsername}>@{friend.username}</Text>
                    </View>
                  </View>
                  
                  <View style={[
                    styles.friendCheckbox,
                    selectedFriends.includes(friend.id) && styles.friendCheckboxSelected
                  ]}>
                    {selectedFriends.includes(friend.id) && (
                      <Text style={styles.friendCheckmark}>✓</Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  topHeader: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 1,
  },

  bottomControls: {
    position: 'absolute',
    bottom: 60,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 50,
    zIndex: 1,
  },
  captureButton: {
    width: 85,
    height: 85,
  },
  captureButtonInner: {
    width: 75,
    height: 75,
  },
  photoOverlay: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  swipeIndicators: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 1,
  },
  leftSwipeIndicator: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 25,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  rightSwipeIndicator: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 25,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  
  // Friend Selection Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalCloseButton: {
    padding: 5,
  },
  modalCloseText: {
    fontSize: 20,
    color: '#666',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalSendButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  modalSendText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  friendsList: {
    flex: 1,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'white',
  },
  friendItemSelected: {
    backgroundColor: '#f0f8ff',
  },
  friendInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  friendAvatar: {
    fontSize: 32,
    marginRight: 12,
  },
  friendDetails: {
    flex: 1,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  friendUsername: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  friendCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendCheckboxSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  friendCheckmark: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
}); 