import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, Image, StyleSheet } from 'react-native';
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
    <View className="flex-1 bg-black">
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

      {/* Left Side Navigation */}
      <View style={styles.leftNavigation}>
        <TouchableOpacity
          className="bg-black bg-opacity-60 rounded-full p-4 mb-6"
          onPress={() => navigation.navigate('Friends')}
        >
          <Text className="text-white text-3xl">👥</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          className="bg-black bg-opacity-60 rounded-full p-4"
          onPress={() => navigation.navigate('Home')}
        >
          <Text className="text-white text-3xl">💬</Text>
        </TouchableOpacity>
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
  leftNavigation: {
    position: 'absolute',
    left: 20,
    top: '35%',
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
}); 