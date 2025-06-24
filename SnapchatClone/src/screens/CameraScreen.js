import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, Image, StyleSheet, PanResponder, Dimensions } from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import { storage, db } from '../../firebaseConfig';
import { useAuth } from '../context/AuthContext';

export default function CameraScreen({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState('back');
  const [photo, setPhoto] = useState(null);
  const [uploading, setUploading] = useState(false);
  const cameraRef = useRef();
  const { currentUser, logout } = useAuth();

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

  const uploadPhoto = async () => {
    if (!photo) return;

    try {
      setUploading(true);
      
      // Convert photo to blob
      const response = await fetch(photo.uri);
      const blob = await response.blob();
      
      // Upload to Firebase Storage using compat API
      const storageRef = storage.ref(`snaps/${currentUser.uid}/${Date.now()}.jpg`);
      await storageRef.put(blob);
      const downloadURL = await storageRef.getDownloadURL();
      
      // Save snap data to Firestore using compat API
      await db.collection('snaps').add({
        userId: currentUser.uid,
        username: currentUser.username || 'Anonymous',
        imageUrl: downloadURL,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
        viewers: []
      });
      
      Alert.alert('Success', 'Snap shared!');
      setPhoto(null);
    } catch (error) {
      Alert.alert('Error', 'Failed to share snap');
      console.error('Upload error:', error);
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
      <View className="flex-1 justify-center items-center bg-black px-8">
        <Text className="text-white text-lg text-center mb-4">
          We need your permission to show the camera
        </Text>
        <TouchableOpacity
          className="bg-snapYellow rounded-full px-6 py-3"
          onPress={requestPermission}
        >
          <Text className="text-black font-semibold">Grant Permission</Text>
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
            className="bg-white rounded-full px-6 py-3"
            onPress={retakePhoto}
          >
            <Text className="text-black font-semibold">Retake</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            className="bg-snapYellow rounded-full px-6 py-3"
            onPress={uploadPhoto}
            disabled={uploading}
          >
            <Text className="text-black font-semibold">
              {uploading ? 'Sharing...' : 'Share'}
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
        <Text className="text-2xl font-bold text-snapYellow">👻 SnapConnect</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Text className="text-snapYellow text-lg font-semibold">Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Swipe Indicators */}
      <View style={styles.swipeIndicators}>
        {/* Left swipe indicator */}
        <View style={styles.leftSwipeIndicator}>
          <Text className="text-white text-opacity-60 text-sm">👥</Text>
          <Text className="text-white text-opacity-60 text-xs">Swipe</Text>
          <Text className="text-white text-opacity-60 text-xs">←</Text>
        </View>
        
        {/* Right swipe indicator */}
        <View style={styles.rightSwipeIndicator}>
          <Text className="text-white text-opacity-60 text-sm">📖</Text>
          <Text className="text-white text-opacity-60 text-xs">Swipe</Text>
          <Text className="text-white text-opacity-60 text-xs">→</Text>
        </View>
      </View>

      {/* Bottom Camera Controls */}
      <View style={styles.bottomControls}>
        <TouchableOpacity
          className="bg-white bg-opacity-90 rounded-full p-4"
          onPress={toggleCameraFacing}
        >
          <Text className="text-black font-bold text-xl">🔄</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          className="bg-white rounded-full justify-center items-center"
          style={styles.captureButton}
          onPress={takePicture}
        >
          <View className="bg-black rounded-full" style={styles.captureButtonInner} />
        </TouchableOpacity>
        
        <TouchableOpacity
          className="bg-white bg-opacity-90 rounded-full p-4"
          onPress={() => navigation.navigate('Stories')}
        >
          <Text className="text-black font-bold text-xl">📖</Text>
        </TouchableOpacity>
      </View>
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
    paddingHorizontal: 40,
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
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 25,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  rightSwipeIndicator: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 25,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
}); 