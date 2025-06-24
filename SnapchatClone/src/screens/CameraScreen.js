import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, Image, StyleSheet, PanResponder, Dimensions } from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import { storage, db } from '../../firebaseConfig';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function CameraScreen({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState('back');
  const [photo, setPhoto] = useState(null);
  const [uploading, setUploading] = useState(false);
  const cameraRef = useRef();
  const { currentUser, logout } = useAuth();
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
            style={[{ backgroundColor: 'white', borderRadius: 24, paddingHorizontal: 24, paddingVertical: 12 }]}
            onPress={retakePhoto}
          >
            <Text style={[{ color: 'black', fontWeight: '600' }]}>Retake</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[{ backgroundColor: currentTheme.primary, borderRadius: 24, paddingHorizontal: 24, paddingVertical: 12 }]}
            onPress={uploadPhoto}
            disabled={uploading}
          >
            <Text style={[{ color: currentTheme.background, fontWeight: '600' }]}>
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
}); 