import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, Image, StyleSheet, PanResponder, Dimensions, Modal, ScrollView, SafeAreaView } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Video } from 'expo-av';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/SupabaseAuthContext';
import { useTheme } from '../context/ThemeContext';

// Updated function to find the most recent FILE of any type, with extensive logging.
const findMostRecentFile = async (directory) => {
  let mostRecentFile = null;
  let maxModificationTime = 0;
  console.log(`[SEARCH] Starting search for most recent *file* in: ${directory}`);

  const search = async (dir) => {
    try {
      const items = await FileSystem.readDirectoryAsync(dir);
      console.log(`[SEARCH] Items in ${dir}: ${items.join(', ')}`);
      for (const item of items) {
        const itemPath = `${dir}${item}`;
        let info;
        try {
            info = await FileSystem.getInfoAsync(itemPath, { modificationTime: true });
        } catch (e) {
            console.log(`[SEARCH] Could not get info for ${itemPath}, skipping.`);
            continue;
        }

        if (info.isDirectory) {
          console.log(`[SEARCH] Found directory: ${itemPath}. Searching inside.`);
          await search(`${itemPath}/`);
        } else { // It's a file, of any type
          if (info.modificationTime && info.modificationTime > maxModificationTime) {
            maxModificationTime = info.modificationTime;
            mostRecentFile = { uri: info.uri, modificationTime: info.modificationTime, name: item };
            console.log(`[SEARCH] New most recent file found: ${mostRecentFile.name} (mod time: ${mostRecentFile.modificationTime})`);
          }
        }
      }
    } catch (error) {
      console.error(`[SEARCH] Error reading directory ${dir}:`, error);
    }
  };

  await search(directory.endsWith('/') ? directory : `${directory}/`);
  console.log(`[SEARCH] Search complete. Most recent file found:`, mostRecentFile?.name);
  return mostRecentFile;
};

export default function CameraScreen({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState('back');
  const [photo, setPhoto] = useState(null);
  const [video, setVideo] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [maxRecordingTime] = useState(60); // 60 seconds max like Snapchat
  const [uploading, setUploading] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [friends, setFriends] = useState([]);
  const cameraRef = useRef();
  const recordingTimerRef = useRef(null);
  const { currentUser, logout, supabase } = useAuth();
  const { currentTheme } = useTheme();
  
  const wasRecording = useRef(false);

  useEffect(() => {
    const showVideoWarning = async () => {
      try {
        const hasSeenWarning = await AsyncStorage.getItem('@videoWarningSeen');
        if (!hasSeenWarning) {
          Alert.alert(
            "Video Recording Notice",
            "Video recording in development mode can be unreliable. If a recorded video isn't found, it's likely due to running in Expo Go. This feature works best in a production build of the app.",
            [{ text: "OK", onPress: () => AsyncStorage.setItem('@videoWarningSeen', 'true') }]
          );
        }
      } catch (e) {
        console.error("Failed to access AsyncStorage for video warning", e);
      }
    };

    showVideoWarning();
  }, []);

  // Debug state changes
  useEffect(() => {
    console.log('🎬 State changed - video:', !!video, 'showActionModal:', showActionModal);
  }, [video, showActionModal]);

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
      // Only handle swipes if no photo/video is being previewed and not recording
      if (photo || video || isRecording) return;

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

  // This effect will trigger after a recording stops to process the video.
  useEffect(() => {
    if (wasRecording.current && !isRecording) {
      handleVideoProcessing();
    }
    wasRecording.current = isRecording;
  }, [isRecording]);

  const handleVideoProcessing = async () => {
    console.log('🏁 Video recording finished. Processing...');
    
    await new Promise(resolve => setTimeout(resolve, 1000)); 

    console.log('🕵️‍♂️ Searching for the most recent file in cache...');
    const cacheDir = FileSystem.cacheDirectory;
    const foundFile = await findMostRecentFile(cacheDir);

    if (foundFile) {
      const now = Date.now() / 1000;
      const age = now - foundFile.modificationTime;
      console.log(`✅ Found most recent file: '${foundFile.name}', Age: ${age.toFixed(1)}s`);

      // Now, we explicitly check if the file is a video
      const isVideo = foundFile.name.toLowerCase().endsWith('.mp4') || foundFile.name.toLowerCase().endsWith('.mov');
      
      if (isVideo && age < maxRecordingTime + 15) {
        console.log(`✅ File is a recent video. Using it.`);
        setVideo({ uri: foundFile.uri });
        setShowActionModal(true);
        setPhoto(null);
        return;
      } else if (isVideo) {
        console.log(`[WARN] Found a video file, but it is too old (${age.toFixed(1)}s), discarding.`);
      } else {
        console.log(`[ERROR] Found a recent file, but it is not a video: ${foundFile.name}`);
      }
    }
    
    console.log('🚨 No recent *video* file found after search. Showing error.');
    Alert.alert("Recording Error", "Could not save the recorded video. This is likely an issue with running in the Expo Go app. Please try again, and consider creating a development build for reliable video support.");
    resetState();
  };

  // Simple Video Recording Logic - based on working tutorials
  const recordVideo = async () => {
    if (cameraRef.current && !isRecording) {
      try {
        console.log("📹 Starting video recording...");
        setIsRecording(true);
        setRecordingDuration(0);
        
        // Start timer
        recordingTimerRef.current = setInterval(() => {
          setRecordingDuration(prev => prev + 1);
        }, 1000);

        const videoRecordPromise = cameraRef.current.recordAsync();
        
        if (videoRecordPromise) {
          const data = await videoRecordPromise;
          const source = data.uri;
          if (source) {
            console.log("✅ Video recorded successfully:", source);
            setVideo({ uri: source });
            setPhoto(null);
            setShowActionModal(true);
          }
        }
      } catch (error) {
        console.error("❌ Video recording error:", error);
        Alert.alert("Recording Error", "Failed to record video.");
      }
    }
  };

  const stopVideoRecording = () => {
    if (cameraRef.current && isRecording) {
      console.log("🛑 Stopping video recording...");
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      cameraRef.current.stopRecording();
    }
  };

  const takePicture = async () => {
    if (cameraRef.current && !isRecording) {
        try {
            console.log("📸 Taking picture...");
            const photoData = await cameraRef.current.takePictureAsync();
            setPhoto(photoData);
            setVideo(null);
            setShowActionModal(true);
        } catch (error) {
            console.error("❌ Failed to take picture", error);
            Alert.alert('Error', 'Could not take picture.');
        }
    }
  };

  const resetState = () => {
    setPhoto(null);
    setVideo(null);
    setShowActionModal(false);
    setUploading(false);
  };
  
  // Generic upload function
  const uploadMedia = async (mediaUri, bucket, mediaType) => {
    try {
      console.log(`🌐 Storage request: POST https://qwyftjzaeettvxfmjieu.supabase.co/storage/v1/object/${bucket}/${currentUser.id}/${new Date().toISOString()}.${mediaType === 'photo' ? 'jpg' : 'mp4'}`);
      
      // Read the file as binary data
      const fileUri = mediaUri.startsWith('file://') ? mediaUri : `file://${mediaUri}`;
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      
      if (!fileInfo.exists) {
        throw new Error('File does not exist');
      }
      
      console.log(`📁 File info: size=${fileInfo.size}, exists=${fileInfo.exists}`);
      
      const fileName = `${currentUser.id}/${new Date().toISOString()}.${mediaType === 'photo' ? 'jpg' : 'mp4'}`;
      const contentType = mediaType === 'photo' ? 'image/jpeg' : 'video/mp4';
      
      // Use fetch with the file URI - this should work in React Native
      const response = await fetch(fileUri);
      if (!response.ok) {
        throw new Error(`Failed to read file: ${response.status}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      console.log(`📦 ArrayBuffer created: ${arrayBuffer.byteLength} bytes`);
      
      // Upload ArrayBuffer to Supabase
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, arrayBuffer, { 
          contentType,
          upsert: true 
        });
        
      if (uploadError) throw uploadError;
      
      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(fileName);
      if (!urlData || !urlData.publicUrl) throw new Error('Failed to get public URL.');
      
      console.log(`✅ Upload successful: ${urlData.publicUrl}`);
      return urlData.publicUrl;
    } catch (error) {
      console.error(`Error uploading to ${bucket}:`, error);
      Alert.alert('Upload Failed', `Could not upload your ${mediaType}.`);
      return null;
    }
  };

  // Send photo or video to a friend
  const sendSnap = async (friend) => {
    if (uploading) return;
    const media = photo || video;
    const mediaType = photo ? 'photo' : 'video';
    if (!media || !media.uri) return;
    setUploading(true);
    
    try {
      const publicUrl = await uploadMedia(media.uri, 'snaps', mediaType);
      if (publicUrl) {
        // Get or create conversation first
        const { data: conversationId, error: convError } = await supabase
          .rpc('get_or_create_conversation', {
            user_one: currentUser.id,
            user_two: friend.id
          });

        if (convError) {
          console.error('Conversation error:', convError);
          Alert.alert('Error', 'Failed to create conversation.');
          setUploading(false);
          return;
        }

        const { error } = await supabase.from('messages').insert({ 
          conversation_id: conversationId,
          sender_id: currentUser.id, 
          receiver_id: friend.id, 
          content: mediaType === 'photo' ? '📸 Photo' : '🎥 Video',
          message_type: mediaType === 'photo' ? 'image' : 'video',
          media_url: publicUrl, 
          media_type: mediaType,
          image_url: mediaType === 'photo' ? publicUrl : null,
          video_url: mediaType === 'video' ? publicUrl : null,
          is_ephemeral: true
        });
        
        if (error) {
          Alert.alert('Error', 'Failed to send snap.');
          console.error("Message insert error:", error);
        } else {
          Alert.alert('Success', `Snap sent to ${friend.username}!`);
          resetState();
        }
      }
    } catch (error) {
      console.error('Error in sendSnap:', error);
      Alert.alert('Error', 'Failed to send snap.');
    } finally {
      setUploading(false);
    }
  };

  // Upload photo or video as a story
  const uploadStory = async () => {
    if (uploading) return;
    const media = photo || video;
    const mediaType = photo ? 'photo' : 'video';
    if (!media || !media.uri) return;
    setUploading(true);
    
    try {
      const publicUrl = await uploadMedia(media.uri, 'stories', mediaType);
      if (publicUrl) {
        const { error } = await supabase.from('stories').insert({ 
          user_id: currentUser.id,
          username: currentUser.username || currentUser.email || 'Anonymous',
          media_url: publicUrl, 
          media_type: mediaType,
          image_url: mediaType === 'photo' ? publicUrl : null,
          video_url: mediaType === 'video' ? publicUrl : null,
          type: mediaType === 'photo' ? 'story' : 'video_story',
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          viewers: []
        });
        
        if (error) {
          Alert.alert('Error', 'Failed to post story.');
          console.error("Story insert error:", error);
        } else {
          Alert.alert('Success', 'Story posted!');
          resetState();
        }
      }
    } catch (error) {
      console.error('Error in uploadStory:', error);
      Alert.alert('Error', 'Failed to upload story.');
    } finally {
      setUploading(false);
    }
  };

  const retakePhoto = () => {
    console.log('Retaking photo/video');
    setPhoto(null);
    setVideo(null);
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

  // Photo/Video preview and action modal
  if ((photo || video) && showActionModal) {
    console.log('🎬 Rendering action modal - photo:', !!photo, 'video:', !!video, 'showActionModal:', showActionModal);
    if (video) {
      console.log('🎬 Video URI for modal:', video.uri);
    }
    
    return (
      <View className="flex-1 bg-black">
        {photo ? (
          <Image source={{ uri: photo.uri }} className="flex-1" />
        ) : video.uri === 'placeholder' ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#333' }}>
            <Text style={{ color: 'white', fontSize: 18 }}>📹</Text>
            <Text style={{ color: 'white', marginTop: 10 }}>Video Recording Complete</Text>
            <Text style={{ color: 'white', fontSize: 12, marginTop: 5 }}>Duration: {recordingDuration}s</Text>
          </View>
        ) : (
          <Video
            source={{ uri: video.uri }}
            style={{ flex: 1 }}
            useNativeControls={false}
            shouldPlay={true}
            isLooping={false}
            resizeMode="cover"
          />
        )}
        
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
              Share {photo ? 'Photo' : 'Video'}
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
                  {uploading ? 'Uploading...' : '📖 Post Story'}
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
                onPress={resetState}
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
                  onPress={() => sendSnap(friend)}
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
                Add friends to send photos and videos to them!
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
        <TouchableOpacity onPress={() => navigation.navigate('Home')}>
          <View style={[{ borderRadius: 20, padding: 8 }, { backgroundColor: currentTheme.primary }]}>
            <Text style={[{ fontWeight: 'bold', fontSize: 18 }, { color: currentTheme.background }]}>🏠</Text>
          </View>
        </TouchableOpacity>
        <Text style={[{ fontSize: 24, fontWeight: 'bold' }, { color: currentTheme.primary }]}>👻 SnapConnect</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
          <View style={[{ borderRadius: 20, padding: 8 }, { backgroundColor: currentTheme.primary }]}>
            <Text style={[{ fontWeight: 'bold', fontSize: 18 }, { color: currentTheme.background }]}>👤</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Quick Access Buttons for College Features */}
      <View style={{
        position: 'absolute',
        top: 100,
        right: 20,
        flexDirection: 'column',
        gap: 10
      }}>
        <TouchableOpacity
          onPress={() => navigation.navigate('AcademicCalendar')}
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            borderRadius: 25,
            padding: 12,
            alignItems: 'center',
            minWidth: 50
          }}
        >
          <Text style={{ color: 'white', fontSize: 20 }}>📅</Text>
          <Text style={{ color: 'white', fontSize: 10, marginTop: 2 }}>Calendar</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          onPress={() => navigation.navigate('Campus')}
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            borderRadius: 25,
            padding: 12,
            alignItems: 'center',
            minWidth: 50
          }}
        >
          <Text style={{ color: 'white', fontSize: 20 }}>🏫</Text>
          <Text style={{ color: 'white', fontSize: 10, marginTop: 2 }}>Campus</Text>
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
        
        <View style={{ alignItems: 'center' }}>
          <TouchableOpacity
            style={[styles.captureButton, { 
              backgroundColor: isRecording ? '#ff4444' : 'white',
              justifyContent: 'center',
              alignItems: 'center'
            }]}
            onPress={takePicture}
            onLongPress={recordVideo}
            onPressOut={stopVideoRecording}
          >
            <View style={[styles.captureButtonInner, { 
              backgroundColor: isRecording ? 'white' : 'black'
            }]} />
          </TouchableOpacity>
          
          {isRecording && (
            <View style={{ marginTop: 8, alignItems: 'center' }}>
              <Text style={{ color: 'white', fontSize: 14, fontWeight: 'bold' }}>
                {recordingDuration}s / {maxRecordingTime}s
              </Text>
            </View>
          )}
          
          {!isRecording && (
            <View style={{ marginTop: 8, alignItems: 'center' }}>
              <Text style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: 12, textAlign: 'center' }}>
                Tap for photo{'\n'}Hold for video
              </Text>
            </View>
          )}
        </View>
        
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
    borderRadius: 42.5
  },
  captureButtonInner: {
    width: 75,
    height: 75,
    borderRadius: 37.5
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