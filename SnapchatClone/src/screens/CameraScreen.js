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
  const [showActionModal, setShowActionModal] = useState(false);
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

    if (currentUser) {
      loadFriends();
    }
  }, [currentUser]);

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync();
        setPhoto(photo);
        setShowActionModal(true);
      } catch (error) {
        Alert.alert('Error', 'Failed to take picture');
        console.error('Take picture error:', error);
      }
    }
  };

  // Send photo as ephemeral message to specific friend
  const sendPhotoMessage = async (friend) => {
    if (!photo || !friend) return;

    try {
      setUploading(true);
      
      console.log('Original photo URI:', photo.uri);

      // ✅ STEP 1: Upload photo to Supabase Storage using ArrayBuffer approach
      const fileName = `messages/${currentUser.id}/${Date.now()}.jpg`;
      
      // Use ArrayBuffer for reliable upload
      const response = await fetch(photo.uri);
      const arrayBuffer = await response.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      console.log('Message photo file size:', uint8Array.length, 'bytes');

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('media')
        .upload(fileName, uint8Array, {
          contentType: 'image/jpeg',
        });

      if (uploadError) {
        console.error('Photo upload error:', uploadError);
        throw uploadError;
      }

      console.log('Photo upload successful:', uploadData);

      // ✅ STEP 2: Get public URL
      const { data: urlData } = supabase.storage
        .from('media')
        .getPublicUrl(fileName);

      const publicUrl = urlData.publicUrl;
      console.log('Generated photo message URL:', publicUrl);

      // ✅ FALLBACK: If public URL might not work, also generate a signed URL
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('media')
        .createSignedUrl(fileName, 60 * 60 * 24 * 7); // 7 days

      let finalImageUrl = publicUrl;
      if (signedUrlData && !signedUrlError) {
        console.log('Generated signed URL as fallback:', signedUrlData.signedUrl);
        // For now, let's try the signed URL since public URLs are failing
        finalImageUrl = signedUrlData.signedUrl;
      }

      // ✅ STEP 3: Get or create conversation
      const { data: conversationId, error: convError } = await supabase
        .rpc('get_or_create_conversation', {
          user_one: currentUser.id,
          user_two: friend.id
        });

      if (convError) {
        console.error('Conversation error:', convError);
        throw convError;
      }

      console.log('Conversation ID for photo:', conversationId);

      if (!conversationId) {
        throw new Error('Failed to create conversation');
      }

      // ✅ STEP 4: Send photo message with uploaded URL
      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId, 
          sender_id: currentUser.id,
          receiver_id: friend.id,
          content: '📸 Photo',
          message_type: 'image',
          image_url: finalImageUrl, // ← NOW USING UPLOADED URL!
          is_ephemeral: true
        });

      if (messageError) {
        console.error('Message insert error:', messageError);
        throw messageError;
      }
      
      Alert.alert('Success', `Photo sent to ${friend.username}!`);
      setPhoto(null);
      setShowActionModal(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to send photo: ' + error.message);
      console.error('Send photo error:', error);
    } finally {
      setUploading(false);
    }
  };

  // Post photo as story
  const uploadStory = async () => {
    if (!photo) return;

    try {
      setUploading(true);
      
      console.log('Uploading story from URI:', photo.uri);
      
      // Use the same approach that works for messages
      const fileName = `stories/${currentUser.id}/${Date.now()}.jpg`;
      
      // Try reading the file as ArrayBuffer for more reliable upload
      const response = await fetch(photo.uri);
      const arrayBuffer = await response.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      console.log('Story file size:', uint8Array.length, 'bytes');

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('media')
        .upload(fileName, uint8Array, {
          contentType: 'image/jpeg',
        });

      if (uploadError) {
        console.error('Story upload error:', uploadError);
        throw uploadError;
      }

      console.log('Story upload successful:', uploadData);

      // Get public URL - UPDATED METHOD
      const { data: urlData } = supabase.storage
        .from('media')
        .getPublicUrl(fileName);

      const publicUrl = urlData.publicUrl;
      console.log('Generated story URL:', publicUrl);

      // ✅ FALLBACK: Generate signed URL for stories too
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('media')
        .createSignedUrl(fileName, 60 * 60 * 24 * 7); // 7 days

      let finalStoryUrl = publicUrl;
      if (signedUrlData && !signedUrlError) {
        console.log('Generated signed story URL as fallback:', signedUrlData.signedUrl);
        // Use signed URL since public URLs are failing
        finalStoryUrl = signedUrlData.signedUrl;
      }
      
      // Save story data to Supabase
      const { error: insertError } = await supabase.from('stories').insert({
        user_id: currentUser.id,
        username: currentUser.username || 'Anonymous',
        image_url: finalStoryUrl,
        type: 'story',
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
        viewers: []
      });

      if (insertError) {
        console.error('Story database insert error:', insertError);
        throw insertError;
      }
      
      Alert.alert('Success', 'Story posted!');
      setPhoto(null);
      setShowActionModal(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to post story: ' + error.message);
      console.error('Upload story error:', error);
    } finally {
      setUploading(false);
    }
  };

  const retakePhoto = () => {
    setPhoto(null);
    setShowActionModal(false);
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

  // Photo preview and action modal
  if (photo && showActionModal) {
    return (
      <View className="flex-1 bg-black">
        <Image source={{ uri: photo.uri }} className="flex-1" />
        
        {/* Action Modal */}
        <View style={styles.photoActionModal}>
          <View style={[{ 
            backgroundColor: currentTheme.surface, 
            borderRadius: 20, 
            padding: 20,
            margin: 20,
            maxHeight: '70%'
          }]}>
            <Text style={[{ 
              fontSize: 20, 
              fontWeight: 'bold', 
              marginBottom: 20, 
              textAlign: 'center',
              color: currentTheme.text
            }]}>
              Share Photo
            </Text>
            
            {/* Action Buttons */}
            <View style={[{ flexDirection: 'row', marginBottom: 20 }]}>
              <TouchableOpacity
                style={[{ 
                  flex: 1, 
                  backgroundColor: currentTheme.primary, 
                  borderRadius: 15, 
                  paddingVertical: 12,
                  marginRight: 8
                }]}
                onPress={uploadStory}
                disabled={uploading}
              >
                <Text style={[{ 
                  color: currentTheme.background, 
                  fontWeight: '600', 
                  textAlign: 'center',
                  fontSize: 16
                }]}>
                  📖 Post Story
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[{ 
                  flex: 1, 
                  backgroundColor: currentTheme.background, 
                  borderRadius: 15, 
                  paddingVertical: 12,
                  borderWidth: 2,
                  borderColor: currentTheme.primary,
                  marginLeft: 8
                }]}
                onPress={retakePhoto}
              >
                <Text style={[{ 
                  color: currentTheme.primary, 
                  fontWeight: '600', 
                  textAlign: 'center',
                  fontSize: 16
                }]}>
                  🔄 Retake
                </Text>
              </TouchableOpacity>
            </View>

            {/* Friends List for Sending */}
            <Text style={[{ 
              fontSize: 16, 
              fontWeight: 'bold', 
              marginBottom: 12,
              color: currentTheme.text
            }]}>
              Send to Friends:
            </Text>
            
            <ScrollView style={[{ maxHeight: 200 }]}>
              {friends.map((friend) => (
                <TouchableOpacity
                  key={friend.id}
                  style={[{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    marginVertical: 2,
                    borderRadius: 12,
                    backgroundColor: currentTheme.background
                  }]}
                  onPress={() => sendPhotoMessage(friend)}
                  disabled={uploading}
                >
                  <View style={[{
                    backgroundColor: currentTheme.primary,
                    borderRadius: 25,
                    width: 50,
                    height: 50,
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: 12
                  }]}>
                    <Text style={[{
                      color: currentTheme.background,
                      fontWeight: 'bold',
                      fontSize: 18
                    }]}>
                      {friend.username?.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={[{
                    fontSize: 16,
                    fontWeight: '500',
                    color: currentTheme.text
                  }]}>
                    {friend.username}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {friends.length === 0 && (
              <Text style={[{
                textAlign: 'center',
                color: currentTheme.textSecondary,
                fontStyle: 'italic',
                marginVertical: 20
              }]}>
                Add friends to send photos to them!
              </Text>
            )}
          </View>
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
        <TouchableOpacity onPress={() => navigation.navigate('ChatsList')}>
          <View style={[{ borderRadius: 20, padding: 8 }, { backgroundColor: currentTheme.primary }]}>
            <Text style={[{ fontWeight: 'bold', fontSize: 18 }, { color: currentTheme.background }]}>💬</Text>
          </View>
        </TouchableOpacity>
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
  photoActionModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 