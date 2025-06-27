import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, Image, StyleSheet, PanResponder, Dimensions, Modal, ScrollView, SafeAreaView, Platform, TextInput } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Video } from 'expo-av';
import * as MediaLibrary from 'expo-media-library';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/SupabaseAuthContext';
import { useTheme } from '../context/ThemeContext';
import ragService from '../services/ragService';
import userProfileService from '../services/userProfileService';
import ViewShot from 'react-native-view-shot';

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
  
  // Photo editing states
  const [showPhotoEditor, setShowPhotoEditor] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState(0);
  const [textOverlay, setTextOverlay] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);
  const [textPosition, setTextPosition] = useState({ x: 50, y: 20 }); // percentage positions
  const [isDraggingText, setIsDraggingText] = useState(false);
  const cameraRef = useRef();
  const recordingTimerRef = useRef(null);
  const photoEditorRef = useRef();
  const initialTextPosition = useRef({ x: 50, y: 20 });
  const { currentUser, logout, supabase } = useAuth();
  const { currentTheme } = useTheme();
  
  // RAG-related state
  const [ragCaptions, setRagCaptions] = useState([]);
  const [selectedCaption, setSelectedCaption] = useState('');
  const [isGeneratingCaptions, setIsGeneratingCaptions] = useState(false);
  const [showCaptionModal, setShowCaptionModal] = useState(false);
  const [customCaption, setCustomCaption] = useState('');
  
  const wasRecording = useRef(false);

  // Color filters for photo editing
  const colorFilters = [
    { name: 'Normal', filter: 'none', style: {} },
    { name: 'Warm', filter: 'sepia', style: { tintColor: '#FFA500' } },
    { name: 'Cool', filter: 'hue-rotate', style: { tintColor: '#87CEEB' } },
    { name: 'Vintage', filter: 'sepia', style: { tintColor: '#8B4513', opacity: 0.8 } },
    { name: 'B&W', filter: 'grayscale', style: { tintColor: '#808080' } },
    { name: 'Vibrant', filter: 'saturate', style: { tintColor: '#FF69B4' } },
    { name: 'Dark', filter: 'brightness', style: { tintColor: '#2F2F2F', opacity: 0.7 } }
  ];

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
            setShowPhotoEditor(true);
            setShowActionModal(false);
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
    setShowPhotoEditor(false);
    setUploading(false);
    setRagCaptions([]);
    setSelectedCaption('');
    setShowCaptionModal(false);
    setCustomCaption('');
    setTextOverlay('');
    setShowTextInput(false);
    setSelectedFilter(0);
    setTextPosition({ x: 50, y: 20 });
    setIsDraggingText(false);
  };

  // RAG Feature #1: Smart Caption Generation
  const generateRAGCaptions = async (imageContext = 'photo') => {
    setIsGeneratingCaptions(true);
    try {
      // Get user profile for personalization
      const userProfile = await userProfileService.getMockUserProfile(currentUser.id);
      
      console.log('🤖 Generating RAG captions for:', imageContext);
      const result = await ragService.generateSmartCaption(imageContext, userProfile);
      
      setRagCaptions(result.suggestions);
      setShowCaptionModal(true);
      console.log('✅ Generated captions:', result.suggestions);
      
    } catch (error) {
      console.error('Error generating RAG captions:', error);
      Alert.alert('Caption Generation', 'Unable to generate smart captions. Please try again.');
      // Fallback captions
      setRagCaptions([
        'College life! 📚✨',
        'Making memories! 🎉',
        'Another day, another adventure! 🌟'
      ]);
      setShowCaptionModal(true);
    } finally {
      setIsGeneratingCaptions(false);
    }
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
    setShowPhotoEditor(false);
  };

  // Photo editing functions
  const handleFilterSwipe = (direction) => {
    if (direction === 'left') {
      setSelectedFilter((prev) => (prev + 1) % colorFilters.length);
    } else if (direction === 'right') {
      setSelectedFilter((prev) => (prev - 1 + colorFilters.length) % colorFilters.length);
    }
  };

  // AI Caption generation for photo editor
  const generateAICaptionForEditor = async () => {
    setIsGeneratingCaptions(true);
    try {
      // Get user profile for personalization
      const userProfile = await userProfileService.getMockUserProfile(currentUser.id);
      
      console.log('🤖 Generating AI caption in editor...');
      const result = await ragService.generateSmartCaption('photo', userProfile);
      
      // Set the first generated caption as text overlay
      if (result.suggestions && result.suggestions.length > 0) {
        setTextOverlay(result.suggestions[0]);
        console.log('✅ AI caption applied:', result.suggestions[0]);
        
        // Show success feedback
        Alert.alert('AI Caption Generated! 🤖', `Caption: "${result.suggestions[0]}"\n\nTap the text on the photo to edit it, or tap "Aa" to change it.`);
      }
      
    } catch (error) {
      console.error('Error generating AI caption:', error);
      // Fallback captions
      const fallbackCaptions = [
        'College life! 📚✨',
        'Making memories! 🎉',
        'Another day, another adventure! 🌟'
      ];
      const randomCaption = fallbackCaptions[Math.floor(Math.random() * fallbackCaptions.length)];
      setTextOverlay(randomCaption);
      
      Alert.alert('AI Caption Generated! 🤖', `Caption: "${randomCaption}"\n\nTap the text on the photo to edit it, or tap "Aa" to change it.`);
    } finally {
      setIsGeneratingCaptions(false);
    }
  };

  const proceedToShare = async () => {
    try {
      // Capture the edited photo with filters and text
      console.log('📸 Capturing edited photo...');
      const uri = await photoEditorRef.current.capture('file', {
        format: 'jpg',
        quality: 0.9,
      });
      
      console.log('📸 Captured edited photo:', uri);
      
      // Update the photo with the edited version
      setPhoto({
        uri: uri,
        width: photo.width || 1080,
        height: photo.height || 1920
      });
      
      // Proceed to sharing
      setShowPhotoEditor(false);
      setShowActionModal(true);
    } catch (error) {
      console.error('❌ Error capturing edited photo:', error);
      Alert.alert('Error', 'Failed to apply edits. Proceeding with original photo.');
      // Fallback to original photo
      setShowPhotoEditor(false);
      setShowActionModal(true);
    }
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

  const importPhotoFromGallery = async () => {
    try {
      console.log('📁 Starting photo import from gallery...');
      console.log('📁 Platform check - running on:', Platform.OS);
      
      // Check if we're running in Expo Go or web (common limitation)
      if (Platform.OS === 'web') {
        Alert.alert(
          'Not Available on Web',
          'Photo gallery access is not available when running on web. Please test on a mobile device or emulator.',
          [{ text: 'OK' }]
        );
        return;
      }
      
      // Check if ImagePicker is available
      if (!ImagePicker.launchImageLibraryAsync) {
        console.error('📁 ImagePicker.launchImageLibraryAsync not available');
        Alert.alert(
          'Feature Not Available',
          'Photo gallery access is not available in this environment. This feature works best on a real device or production build.',
          [{ text: 'OK' }]
        );
        return;
      }
      
      // First check current permission status with error handling
      let permissionResult;
      try {
        permissionResult = await ImagePicker.getMediaLibraryPermissionsAsync();
        console.log('📁 Current permission status:', permissionResult.status);
      } catch (permError) {
        console.error('📁 Error getting permissions:', permError);
        Alert.alert(
          'Permission Error',
          'Unable to check photo library permissions. This might be due to running in Expo Go or web environment.',
          [{ text: 'OK' }]
        );
        return;
      }
      
      let finalStatus = permissionResult.status;
      
      if (finalStatus !== 'granted') {
        console.log('📁 Requesting media library permission...');
        try {
          const requestResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
          finalStatus = requestResult.status;
          console.log('📁 Permission request result:', finalStatus);
        } catch (permError) {
          console.error('📁 Error requesting permissions:', permError);
          Alert.alert(
            'Permission Error',
            'Unable to request photo library permissions. Please check your device settings.',
            [{ text: 'OK' }]
          );
          return;
        }
      }

      if (finalStatus !== 'granted') {
        console.log('📁 Permission denied');
        Alert.alert(
          'Permission Required',
          'Photo library access was denied. Please enable it in your device settings to import photos.',
          [{ text: 'OK' }]
        );
        return;
      }

      console.log('📁 Permission granted, launching image picker...');
        
      // Launch image picker with corrected mediaType
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images', // Use string instead of enum to avoid casting issues
        allowsEditing: false,
        quality: 1.0,
        allowsMultipleSelection: false,
      });

      console.log('📁 Image picker result:', result);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedImage = result.assets[0];
        console.log('📁 Selected image:', selectedImage);
        
        // Set the selected image as the current photo
        if (selectedImage.uri) {
          setPhoto({
            uri: selectedImage.uri,
            width: selectedImage.width || 1080,
            height: selectedImage.height || 1920
          });
          setShowPhotoEditor(true);
          setShowActionModal(false);
          console.log('📁 Photo set successfully');
        } else {
          console.error('📁 No URI in selected image');
          Alert.alert('Error', 'Selected image is not valid.');
        }
      } else {
        console.log('📁 User cancelled or no image selected');
      }
    } catch (error) {
      console.error('📁 Error importing photo:', error);
      console.error('📁 Error stack:', error.stack);
      
      // Provide more helpful error messages based on common issues
      let errorMessage = 'Failed to import photo from gallery.';
      
      if (error.message.includes('not available') || error.message.includes('undefined')) {
        errorMessage = 'Photo gallery access is not available in this environment. Try running on a real device.';
      } else if (error.message.includes('permission')) {
        errorMessage = 'Permission denied. Please enable photo library access in device settings.';
      } else if (error.message.includes('cancelled')) {
        errorMessage = 'Photo selection was cancelled.';
      }
      
      Alert.alert(
        'Gallery Access Error', 
        errorMessage + '\n\nWould you like to try a test photo instead?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Use Test Photo', onPress: () => loadTestPhoto() }
        ]
      );
    }
  };

  // Enhanced MediaLibrary approach (primary gallery access)
  const importPhotoFromMediaLibrary = async () => {
    try {
      console.log('📁 Starting MediaLibrary photo import...');
      
      // Request permissions
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant permission to access your photos in device settings.');
        return;
      }

      console.log('📁 MediaLibrary permission granted, fetching photos...');

      // Get recent photos (more than 1 to give options)
      const album = await MediaLibrary.getAssetsAsync({
        mediaType: 'photo',
        first: 20, // Get more photos
        sortBy: 'creationTime',
      });

      console.log(`📁 Found ${album.assets.length} photos in gallery`);

      if (album.assets.length > 0) {
        // For now, use the most recent photo
        // Later we could add a photo selector UI
        const asset = album.assets[0];
        console.log('📁 Using most recent photo:', asset.filename);
        
        // Get asset info with local URI
        const assetInfo = await MediaLibrary.getAssetInfoAsync(asset);
        console.log('📁 Asset info retrieved:', assetInfo.filename);
        
        if (assetInfo.localUri || assetInfo.uri) {
          const photoUri = assetInfo.localUri || assetInfo.uri;
          console.log('📁 Using photo URI:', photoUri);
          
          setPhoto({
            uri: photoUri,
            width: assetInfo.width || 1080,
            height: assetInfo.height || 1920
          });
          setShowPhotoEditor(true);
          setShowActionModal(false);
          console.log('📁 Photo loaded successfully from MediaLibrary');
          
          Alert.alert(
            'Photo Imported',
            `Successfully imported: ${assetInfo.filename}`,
            [{ text: 'OK' }]
          );
        } else {
          console.error('📁 No valid URI found for asset');
          Alert.alert('Error', 'Could not access the photo file.');
        }
      } else {
        Alert.alert('No Photos', 'No photos found in your gallery. Please take some photos first.');
      }
    } catch (error) {
      console.error('📁 MediaLibrary error:', error);
      Alert.alert('Gallery Error', `Could not access gallery: ${error.message}`);
    }
  };

  // Simple test photo feature (works everywhere)
  const loadTestPhoto = () => {
    try {
      console.log('📁 Loading test photo...');
      
      // Use a simple colored rectangle as test image
      const testImageUri = 'data:image/svg+xml;utf8,<svg width="1080" height="1920" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="%23ff6b6b"/><text x="540" y="960" font-family="Arial" font-size="80" fill="white" text-anchor="middle">TEST PHOTO</text></svg>';
      
      setPhoto({
        uri: testImageUri,
        width: 1080,
        height: 1920
      });
      setShowPhotoEditor(true);
      setShowActionModal(false);
      console.log('📁 Test photo loaded successfully');
      
      Alert.alert(
        'Test Photo Loaded',
        'Using a test photo for demonstration. Try the MediaLibrary button for real gallery access.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('📁 Test photo error:', error);
      Alert.alert('Error', 'Unable to load test photo.');
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

  // Photo Editor Screen
  if (photo && showPhotoEditor) {
    const filterPanResponder = PanResponder.create({
      onStartShouldSetPanResponder: () => !isDraggingText,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return !isDraggingText && Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 20;
      },
      onPanResponderRelease: (_, gestureState) => {
        if (isDraggingText) return;
        const { dx } = gestureState;
        const swipeThreshold = screenWidth * 0.15;
        
        if (Math.abs(dx) > swipeThreshold) {
          if (dx > 0) {
            handleFilterSwipe('right');
          } else {
            handleFilterSwipe('left');
          }
        }
      },
    });

    // Text drag handler
    const textDragResponder = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        setIsDraggingText(true);
        // Store the initial position when drag starts
        initialTextPosition.current = { x: textPosition.x, y: textPosition.y };
      },
      onPanResponderMove: (event, gestureState) => {
        // Get the screen dimensions
        const screenHeight = Dimensions.get('window').height;
        
        // Calculate position change as percentage of screen from initial position
        const deltaX = (gestureState.dx / screenWidth) * 100;
        const deltaY = (gestureState.dy / screenHeight) * 100;
        
        // Calculate new position based on initial position + gesture delta
        const newX = Math.max(10, Math.min(90, initialTextPosition.current.x + deltaX));
        const newY = Math.max(15, Math.min(80, initialTextPosition.current.y + deltaY));
        
        setTextPosition({ x: newX, y: newY });
      },
      onPanResponderRelease: () => {
        setIsDraggingText(false);
      },
    });

    return (
      <View style={{ flex: 1, backgroundColor: 'black' }} {...filterPanResponder.panHandlers}>
        {/* ViewShot component to capture the edited photo */}
        <ViewShot 
          ref={photoEditorRef}
          options={{ format: "jpg", quality: 0.9 }}
          style={{ flex: 1 }}
        >
          {/* Photo with current filter overlay */}
          <View style={{ flex: 1, position: 'relative' }}>
            <Image source={{ uri: photo.uri }} style={{ flex: 1, width: '100%', height: '100%' }} resizeMode="cover" />
            
            {/* Filter overlay */}
            {selectedFilter > 0 && (
              <View 
                style={[
                  StyleSheet.absoluteFillObject,
                  {
                    backgroundColor: colorFilters[selectedFilter].style.tintColor || 'transparent',
                    opacity: colorFilters[selectedFilter].style.opacity || 0.3,
                    mixBlendMode: colorFilters[selectedFilter].filter === 'grayscale' ? 'multiply' : 'normal'
                  }
                ]} 
              />
            )}
            
                      {/* Text overlay */}
          {textOverlay && (
            <View
              style={{
                position: 'absolute',
                left: `${textPosition.x}%`,
                top: `${textPosition.y}%`,
                transform: [{ translateX: -50 }, { translateY: -50 }],
              }}
              {...textDragResponder.panHandlers}
            >
              <TouchableOpacity
                onPress={() => {
                  if (!isDraggingText) {
                    setShowTextInput(true);
                  }
                }}
                activeOpacity={isDraggingText ? 1 : 0.8}
                style={{
                  backgroundColor: isDraggingText ? 'rgba(107, 70, 193, 0.3)' : 'transparent',
                  borderRadius: 8,
                  borderWidth: isDraggingText ? 2 : 0,
                  borderColor: '#6B46C1',
                  borderStyle: isDraggingText ? 'dashed' : 'solid',
                }}
              >
                <Text 
                  style={{
                    color: 'white',
                    fontSize: 24,
                    fontWeight: 'bold',
                    textAlign: 'center',
                    textShadowColor: 'rgba(0, 0, 0, 0.75)',
                    textShadowOffset: { width: -1, height: 1 },
                    textShadowRadius: 10,
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                  }}
                >
                  {textOverlay}
                </Text>
              </TouchableOpacity>
            </View>
          )}
          </View>
        </ViewShot>

        {/* Top controls */}
        <View style={styles.photoEditorTopBar}>
          <TouchableOpacity
            style={styles.photoEditorButton}
            onPress={retakePhoto}
          >
            <Text style={styles.photoEditorButtonText}>✕</Text>
          </TouchableOpacity>
          
          <View style={styles.photoEditorTopRightControls}>
            <TouchableOpacity
              style={[styles.photoEditorButton, { 
                backgroundColor: isGeneratingCaptions ? '#6B46C1' : 'rgba(255, 255, 255, 0.2)',
                marginRight: 10
              }]}
              onPress={generateAICaptionForEditor}
              disabled={isGeneratingCaptions}
            >
              <Text style={[styles.photoEditorButtonText, { fontSize: 16 }]}>
                {isGeneratingCaptions ? '⏳' : '🤖'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.photoEditorButton, { backgroundColor: showTextInput ? '#6B46C1' : 'rgba(255, 255, 255, 0.2)' }]}
              onPress={() => setShowTextInput(!showTextInput)}
            >
              <Text style={styles.photoEditorButtonText}>Aa</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Filter indicator */}
        <View style={styles.filterIndicator}>
          <Text style={styles.filterName}>{colorFilters[selectedFilter].name}</Text>
          <View style={styles.filterDots}>
            {colorFilters.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.filterDot,
                  selectedFilter === index && styles.filterDotActive
                ]}
              />
            ))}
          </View>
          <Text style={styles.swipeHint}>← Swipe for filters →</Text>
          <Text style={[styles.swipeHint, { marginTop: 5, fontSize: 11 }]}>
            Tap 🤖 for AI caption • Tap Aa for text • Drag text to move • Tap text to edit
          </Text>
        </View>

        {/* Text input overlay */}
        {showTextInput && (
          <View style={styles.textInputOverlay}>
            <TextInput
              style={styles.textInput}
              placeholder="Add text..."
              placeholderTextColor="rgba(255, 255, 255, 0.7)"
              value={textOverlay}
              onChangeText={setTextOverlay}
              multiline={true}
              textAlign="center"
              autoFocus={true}
              onSubmitEditing={() => setShowTextInput(false)}
            />
          </View>
        )}

        {/* Bottom controls */}
        <View style={styles.photoEditorBottomBar}>
          <TouchableOpacity
            style={[styles.photoEditorButton, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}
            onPress={retakePhoto}
          >
            <Text style={styles.photoEditorButtonText}>🔄</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.photoEditorButton, { backgroundColor: '#6B46C1', paddingHorizontal: 30 }]}
            onPress={proceedToShare}
          >
            <Text style={[styles.photoEditorButtonText, { fontSize: 16 }]}>Done</Text>
          </TouchableOpacity>
        </View>
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
            <View style={[{ marginBottom: 20 }]}>
              <View style={[{ flexDirection: 'row' }]}>
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

      {/* RAG Caption Selection Modal */}
      <Modal
        visible={showCaptionModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCaptionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: currentTheme.surface }]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowCaptionModal(false)}
              >
                <Text style={[styles.modalCloseText, { color: currentTheme.text }]}>✕</Text>
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: currentTheme.text }]}>
                🤖 AI Smart Captions
              </Text>
              <View style={{ width: 30 }} />
            </View>
            
            <ScrollView style={styles.friendsList}>
              <View style={{ padding: 20 }}>
                <Text style={[{ fontSize: 16, fontWeight: 'bold', marginBottom: 15, color: currentTheme.text }]}>
                  Choose a caption or create your own:
                </Text>
                
                {/* Generated Captions */}
                {ragCaptions.map((caption, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[{
                      padding: 15,
                      marginBottom: 10,
                      borderRadius: 12,
                      backgroundColor: selectedCaption === caption ? currentTheme.primary : currentTheme.background,
                      borderWidth: 1,
                      borderColor: currentTheme.primary
                    }]}
                    onPress={() => setSelectedCaption(caption)}
                  >
                    <Text style={[{
                      fontSize: 16,
                      color: selectedCaption === caption ? currentTheme.background : currentTheme.text
                    }]}>
                      {caption}
                    </Text>
                  </TouchableOpacity>
                ))}
                
                {/* Custom Caption Input */}
                <View style={{ marginTop: 20 }}>
                  <Text style={[{ fontSize: 16, fontWeight: 'bold', marginBottom: 10, color: currentTheme.text }]}>
                    Or write your own:
                  </Text>
                  <TextInput
                    style={[{
                      borderWidth: 1,
                      borderColor: currentTheme.primary,
                      borderRadius: 12,
                      padding: 15,
                      fontSize: 16,
                      backgroundColor: currentTheme.background,
                      color: currentTheme.text,
                      minHeight: 50
                    }]}
                    placeholder="Write your caption here..."
                    placeholderTextColor={currentTheme.textSecondary}
                    value={customCaption}
                    onChangeText={setCustomCaption}
                    multiline={true}
                    onFocus={() => setSelectedCaption('')}
                  />
                </View>
                
                {/* Use Caption Button */}
                <TouchableOpacity
                  style={[{
                    backgroundColor: currentTheme.primary,
                    borderRadius: 12,
                    padding: 15,
                    marginTop: 20,
                    alignItems: 'center'
                  }]}
                  onPress={() => {
                    const finalCaption = customCaption || selectedCaption;
                    if (finalCaption) {
                      Alert.alert('Caption Selected', `Caption: "${finalCaption}"`);
                      // Here you could integrate with your story/snap posting logic
                      setShowCaptionModal(false);
                    } else {
                      Alert.alert('No Caption', 'Please select or write a caption first.');
                    }
                  }}
                >
                  <Text style={[{
                    color: currentTheme.background,
                    fontSize: 16,
                    fontWeight: '600'
                  }]}>
                    Use Caption
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
        
        <TouchableOpacity
          onPress={() => navigation.navigate('RAGHome')}
          style={{
            backgroundColor: 'rgba(107, 70, 193, 0.9)',
            borderRadius: 25,
            padding: 12,
            alignItems: 'center',
            minWidth: 50
          }}
        >
          <Text style={{ color: 'white', fontSize: 20 }}>🤖</Text>
          <Text style={{ color: 'white', fontSize: 10, marginTop: 2 }}>AI Hub</Text>
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
        
        {/* Right side indicator - Stories & Photo Import */}
        <View style={styles.rightSwipeIndicator}>
          <TouchableOpacity 
            onPress={() => navigation.navigate('Stories')}
            activeOpacity={0.7}
            style={{ alignItems: 'center', marginBottom: 6 }}
          >
            <Text className="text-white text-opacity-60 text-sm">📖</Text>
            <Text className="text-white text-opacity-60 text-xs">Stories</Text>
            <Text className="text-white text-opacity-60 text-xs">Swipe →</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={importPhotoFromMediaLibrary}
            activeOpacity={0.7}
            style={{ alignItems: 'center', marginBottom: 4 }}
          >
            <Text className="text-white text-opacity-60 text-sm">📱</Text>
            <Text className="text-white text-opacity-60 text-xs">Photos</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={importPhotoFromGallery}
            activeOpacity={0.7}
            style={{ alignItems: 'center', marginBottom: 4 }}
          >
            <Text className="text-white text-opacity-60 text-sm">📁</Text>
            <Text className="text-white text-opacity-60 text-xs">Picker</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={loadTestPhoto}
            activeOpacity={0.7}
            style={{ alignItems: 'center' }}
          >
            <Text className="text-white text-opacity-60 text-sm">🧪</Text>
            <Text className="text-white text-opacity-60 text-xs">Test</Text>
          </TouchableOpacity>
        </View>
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
          onPress={importPhotoFromMediaLibrary}
        >
          <Text style={{ fontSize: 20, fontWeight: 'bold' }}>📱</Text>
        </TouchableOpacity>
      </View>

      {/* RAG Caption Selection Modal */}
      <Modal
        visible={showCaptionModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCaptionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: currentTheme.surface }]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowCaptionModal(false)}
              >
                <Text style={[styles.modalCloseText, { color: currentTheme.text }]}>✕</Text>
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: currentTheme.text }]}>
                🤖 AI Smart Captions
              </Text>
              <View style={{ width: 30 }} />
            </View>
            
            <ScrollView style={styles.friendsList}>
              <View style={{ padding: 20 }}>
                <Text style={[{ fontSize: 16, fontWeight: 'bold', marginBottom: 15, color: currentTheme.text }]}>
                  Choose a caption or create your own:
                </Text>
                
                {/* Generated Captions */}
                {ragCaptions.map((caption, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[{
                      padding: 15,
                      marginBottom: 10,
                      borderRadius: 12,
                      backgroundColor: selectedCaption === caption ? currentTheme.primary : currentTheme.background,
                      borderWidth: 1,
                      borderColor: currentTheme.primary
                    }]}
                    onPress={() => setSelectedCaption(caption)}
                  >
                    <Text style={[{
                      fontSize: 16,
                      color: selectedCaption === caption ? currentTheme.background : currentTheme.text
                    }]}>
                      {caption}
                    </Text>
                  </TouchableOpacity>
                ))}
                
                {/* Custom Caption Input */}
                <View style={{ marginTop: 20 }}>
                  <Text style={[{ fontSize: 16, fontWeight: 'bold', marginBottom: 10, color: currentTheme.text }]}>
                    Or write your own:
                  </Text>
                  <TextInput
                    style={[{
                      borderWidth: 1,
                      borderColor: currentTheme.primary,
                      borderRadius: 12,
                      padding: 15,
                      fontSize: 16,
                      backgroundColor: currentTheme.background,
                      color: currentTheme.text,
                      minHeight: 50
                    }]}
                    placeholder="Write your caption here..."
                    placeholderTextColor={currentTheme.textSecondary}
                    value={customCaption}
                    onChangeText={setCustomCaption}
                    multiline={true}
                    onFocus={() => setSelectedCaption('')}
                  />
                </View>
                
                {/* Use Caption Button */}
                <TouchableOpacity
                  style={[{
                    backgroundColor: currentTheme.primary,
                    borderRadius: 12,
                    padding: 15,
                    marginTop: 20,
                    alignItems: 'center'
                  }]}
                  onPress={() => {
                    const finalCaption = customCaption || selectedCaption;
                    if (finalCaption) {
                      Alert.alert('Caption Selected', `Caption: "${finalCaption}"`);
                      // Here you could integrate with your story/snap posting logic
                      setShowCaptionModal(false);
                    } else {
                      Alert.alert('No Caption', 'Please select or write a caption first.');
                    }
                  }}
                >
                  <Text style={[{
                    color: currentTheme.background,
                    fontSize: 16,
                    fontWeight: '600'
                  }]}>
                    Use Caption
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
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

  // Photo Editor Styles
  photoEditorTopBar: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  photoEditorTopRightControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  photoEditorBottomBar: {
    position: 'absolute',
    bottom: 60,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  photoEditorButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoEditorButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  filterIndicator: {
    position: 'absolute',
    bottom: 160,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  filterName: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  filterDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 5,
  },
  filterDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    marginHorizontal: 3,
  },
  filterDotActive: {
    backgroundColor: 'white',
  },
  swipeHint: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    textAlign: 'center',
  },
  textInputOverlay: {
    position: 'absolute',
    bottom: 200,
    left: 20,
    right: 20,
    zIndex: 15,
  },
  textInput: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    color: 'white',
    fontSize: 18,
    padding: 15,
    borderRadius: 10,
    textAlign: 'center',
    maxHeight: 100,
  },
}); 