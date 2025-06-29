import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  KeyboardAvoidingView, 
  Platform,
  Alert,
  Keyboard,
  Image,
  Dimensions,
  ScrollView,
  Modal
} from 'react-native';
import { Video } from 'expo-av';
import { useAuth } from '../context/SupabaseAuthContext';
import { useTheme } from '../context/ThemeContext';
import ImageWithFallback from '../components/ImageWithFallback';
import AIAssistant from '../components/AIAssistant';
import FloatingAIButton from '../components/FloatingAIButton';
import ragService from '../services/ragService';
import userProfileService from '../services/userProfileService';

const { width: screenWidth } = Dimensions.get('window');

export default function ChatScreen({ navigation, route }) {
  const { conversationId, otherUser, isGroup, groupName, groupDescription } = route.params || {};
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [ephemeralMode, setEphemeralMode] = useState(true); // Default to ephemeral like Snapchat
  const [groupParticipants, setGroupParticipants] = useState([]);
  
  // AI-related state
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [userProfile, setUserProfile] = useState({});
  // Mood selection state
  const [showMoodSelector, setShowMoodSelector] = useState(false);
  const [selectedMood, setSelectedMood] = useState('friendly');
  
  const { currentUser, supabase } = useAuth();
  const { currentTheme } = useTheme();
  const flatListRef = useRef();
  const messageTimers = useRef(new Map()); // Track countdown timers for messages

  // Mood options for AI suggestions
  const moodOptions = [
    { id: 'friendly', name: 'Friendly', emoji: '😊', color: '#10b981', description: 'Warm and welcoming' },
    { id: 'playful', name: 'Playful', emoji: '😜', color: '#f59e0b', description: 'Fun and energetic' },
    { id: 'chill', name: 'Chill', emoji: '😎', color: '#06b6d4', description: 'Relaxed and casual' },
    { id: 'stressed', name: 'Stressed', emoji: '😤', color: '#ef4444', description: 'Overwhelmed or busy' },
    { id: 'flirty', name: 'Flirty', emoji: '😏', color: '#ec4899', description: 'Romantic and charming' },
    { id: 'sarcastic', name: 'Sarcastic', emoji: '🙄', color: '#8b5cf6', description: 'Witty and sharp' },
    { id: 'supportive', name: 'Supportive', emoji: '🤗', color: '#84cc16', description: 'Caring and encouraging' },
    { id: 'excited', name: 'Excited', emoji: '🤩', color: '#f97316', description: 'Enthusiastic and energetic' }
  ];

  // Safety check - if we don't have required data, go back
  React.useEffect(() => {
    if (!conversationId || !currentUser) {
      console.log('ChatScreen: Missing required data, navigating back');
      navigation.goBack();
      return;
    }
    // For 1-on-1 chats, we need otherUser. For groups, we don't.
    if (!isGroup && !otherUser) {
      console.log('ChatScreen: Missing otherUser for 1-on-1 chat, navigating back');
      navigation.goBack();
      return;
    }
  }, [conversationId, otherUser, isGroup, currentUser, navigation]);

  useEffect(() => {
    if (!currentUser?.id || !conversationId) return;

    loadMessages();
    markMessagesAsRead();
    loadUserProfile();
    
    // Load group participants if this is a group chat
    if (isGroup) {
      loadGroupParticipants();
    }
    
    // Set up real-time subscription for new messages
    const messagesChannel = supabase
      .channel(`messages_${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      }, (payload) => {
        console.log('New message received:', payload);
        const newMessage = payload.new;
        
        // Only add message if it's not already in the list (avoid duplicates)
        setMessages(prevMessages => {
          // Check if message already exists (by ID or by temp ID replacement)
          const messageExists = prevMessages.some(msg => 
            msg.id === newMessage.id || 
            (msg.sending && msg.sender_id === newMessage.sender_id && msg.content === newMessage.content)
          );
          
          if (messageExists) {
            // If it's a replacement for an optimistic message, replace it
            return prevMessages.map(msg => 
              (msg.sending && msg.sender_id === newMessage.sender_id && msg.content === newMessage.content) 
                ? { ...newMessage, time_remaining_seconds: calculateTimeRemaining(newMessage) }
                : msg
            );
          } else {
            // New message from another user or missed message
            const messageWithTimer = { ...newMessage, time_remaining_seconds: calculateTimeRemaining(newMessage) };
            return [...prevMessages, messageWithTimer];
          }
        });
        
        // Mark message as read if it's not from current user (and handle viewing for ephemeral)
        if (newMessage.sender_id !== currentUser?.id) {
          handleMessageViewed(newMessage.id);
        }
        
        // Scroll to bottom
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      }, (payload) => {
        console.log('Message deleted (ephemeral):', payload);
        const deletedMessage = payload.old;
        
        // Remove deleted message from local state
        setMessages(prevMessages => 
          prevMessages.filter(msg => msg.id !== deletedMessage.id)
        );
        
        // Clear any timer for this message
        if (messageTimers.current.has(deletedMessage.id)) {
          clearInterval(messageTimers.current.get(deletedMessage.id));
          messageTimers.current.delete(deletedMessage.id);
        }
      })
      .subscribe();

    // Set up real-time subscription for group participants changes
    let groupChannel = null;
    if (isGroup) {
      groupChannel = supabase
        .channel(`group_${conversationId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'group_participants',
          filter: `conversation_id=eq.${conversationId}`
        }, (payload) => {
          console.log('Group participants updated:', payload);
          loadGroupParticipants();
        })
        .subscribe();
    }

    return () => {
      messagesChannel.unsubscribe();
      if (groupChannel) {
        groupChannel.unsubscribe();
      }
      // Clear all timers
      messageTimers.current.forEach(timer => clearInterval(timer));
      messageTimers.current.clear();
    };
  }, [currentUser, conversationId, isGroup]);

  // Calculate time remaining for ephemeral messages
  const calculateTimeRemaining = (message) => {
    if (!message.is_ephemeral || !message.expires_at) return null;
    
    const expiresAt = new Date(message.expires_at);
    const now = new Date();
    const remaining = Math.max(0, Math.floor((expiresAt - now) / 1000));
    
    return remaining;
  };

  // Set up countdown timers for ephemeral messages
  const setupMessageTimer = (message) => {
    if (!message.is_ephemeral || !message.expires_at || messageTimers.current.has(message.id)) return;
    
    const timer = setInterval(() => {
      setMessages(prevMessages => {
        return prevMessages.map(msg => {
          if (msg.id === message.id) {
            const remaining = calculateTimeRemaining(msg);
            if (remaining <= 0) {
              // Message expired, it should be removed by database cleanup
              return null;
            }
            return { ...msg, time_remaining_seconds: remaining };
          }
          return msg;
        }).filter(Boolean);
      });
    }, 1000);
    
    messageTimers.current.set(message.id, timer);
  };

  // Load user profile for AI personalization
  const loadUserProfile = async () => {
    try {
      const profile = await userProfileService.getUserProfile(currentUser.id);
      setUserProfile(profile || {});
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  // Generate AI message suggestions with mood
  const generateAISuggestions = async (mood = selectedMood) => {
    try {
      const recentMessages = messages.slice(-5).map(m => m.content);
      const conversationContext = {
        recentMessages,
        chatType: isGroup ? 'group' : 'individual',
        relationship: 'friend',
        context: 'casual',
        mood: mood, // Include selected mood
        groupSize: isGroup ? groupParticipants.length : 2,
        conversationLength: messages.length
      };

      // Enhanced screen context for more detailed AI suggestions
      const screenContext = {
        screen: 'messaging',
        activity: 'requesting_suggestions',
        location: 'campus',
        conversationContext: {
          isGroup,
          groupName: isGroup ? groupName : null,
          messageCount: messages.length,
          ephemeralMode
        }
      };

      const result = await ragService.generateMessageSuggestions(
        conversationContext, 
        userProfile, 
        screenContext
      );
      
      setAiSuggestions(result.suggestions);
      setShowSuggestions(true);
      setShowMoodSelector(false); // Close mood selector
      
      // Log context explanation if available
      if (result.contextExplanation) {
        console.log('AI Context:', result.contextExplanation);
      }
    } catch (error) {
      console.error('Error generating AI suggestions:', error);
      // Fallback to basic suggestions with mood
      const moodBasedFallbacks = getMoodBasedFallbacks(mood);
      setAiSuggestions(moodBasedFallbacks);
      setShowSuggestions(true);
      setShowMoodSelector(false);
    }
  };

  // Fallback suggestions based on mood
  const getMoodBasedFallbacks = (mood) => {
    const fallbacks = {
      friendly: ["That's awesome! 😊", "How are you doing?", "Hope you're having a great day!", "Tell me more about that!"],
      playful: ["Haha that's hilarious! 😂", "You're so funny!", "Let's do something fun!", "Ready for an adventure? 🎉"],
      chill: ["Cool cool 😎", "No worries", "Sounds good to me", "Whatever works for you"],
      stressed: ["Ugh I feel you 😤", "So much to do!", "This is overwhelming", "Need a break ASAP"],
      flirty: ["You're looking good today 😏", "Hey gorgeous", "Miss you ❤️", "Can't wait to see you"],
      sarcastic: ["Oh really? 🙄", "How surprising...", "That's just great", "Wow, never saw that coming"],
      supportive: ["You've got this! 💪", "I believe in you", "Here if you need me 🤗", "You're amazing!"],
      excited: ["OMG YES! 🤩", "This is SO cool!", "I can't even! ✨", "BEST DAY EVER!"]
    };
    return fallbacks[mood] || fallbacks.friendly;
  };

  // Handle mood selection
  const handleMoodSelect = (mood) => {
    setSelectedMood(mood.id);
    generateAISuggestions(mood.id);
  };

  // Show mood selector instead of directly generating suggestions
  const showMoodSelection = () => {
    setShowMoodSelector(true);
  };

  // Handle AI suggestion selection
  const handleAISuggestionSelect = (suggestion) => {
    setNewMessage(suggestion);
    setShowSuggestions(false);
    setShowAIAssistant(false);
  };

  const loadMessages = async () => {
    if (!currentUser?.id || !conversationId) return;
    
    try {
      // Use the new function to get active (non-expired) messages
      const { data: messagesData, error } = await supabase
        .rpc('get_active_messages', {
          conversation_uuid: conversationId,
          user_id: currentUser.id
        });

      if (error) {
        console.error('Error fetching messages:', error);
        setLoading(false);
        return;
      }

      // Set up timers for ephemeral messages
      const messagesWithTimers = (messagesData || []).map(msg => {
        const messageWithTimer = { ...msg, time_remaining_seconds: calculateTimeRemaining(msg) };
        if (msg.is_ephemeral && msg.expires_at) {
          setupMessageTimer(messageWithTimer);
        }
        return messageWithTimer;
      });

      setMessages(messagesWithTimers);
      setLoading(false);
      
      // Scroll to bottom after loading
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 100);
    } catch (error) {
      console.error('Error loading messages:', error);
      setLoading(false);
    }
  };

  const loadGroupParticipants = async () => {
    if (!isGroup || !conversationId) return;
    
    try {
      const { data: participants, error } = await supabase
        .rpc('get_group_participants', { conversation_id: conversationId });
      
      if (error) {
        console.error('Error loading group participants:', error);
        return;
      }
      
      setGroupParticipants(participants || []);
    } catch (error) {
      console.error('Error loading group participants:', error);
    }
  };

  const markMessagesAsRead = async () => {
    if (!currentUser?.id || !conversationId) return;
    
    try {
      // For ephemeral messages, we handle viewing instead of just marking as read
      const unreadMessages = messages.filter(msg => 
        !msg.is_read && (
          // For 1-on-1: receiver is current user
          (!isGroup && msg.receiver_id === currentUser?.id) ||
          // For groups: receiver is null and sender is not current user
          (isGroup && msg.receiver_id === null && msg.sender_id !== currentUser?.id)
        )
      );
      
      for (const message of unreadMessages) {
        if (message.is_ephemeral) {
          await handleMessageViewed(message.id);
        } else {
          await supabase
            .from('messages')
            .update({ is_read: true, read_at: new Date().toISOString() })
            .eq('id', message.id);
        }
      }
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const handleMessageViewed = async (messageId) => {
    try {
      console.log('👻 Viewing ephemeral message:', messageId);
      
      const { data, error } = await supabase
        .rpc('mark_message_viewed', {
          message_id: messageId,
          viewer_id: currentUser?.id
        });

      if (error) {
        console.error('Error marking message as viewed:', error);
        Alert.alert('Error', 'Failed to view message');
        return;
      }
      
      console.log('✅ Message view result:', data);
      
      // If the message was successfully deleted, remove it immediately from local state
      // (in addition to the real-time DELETE event)
      if (data?.action === 'deleted') {
        setMessages(prevMessages => 
          prevMessages.filter(msg => msg.id !== messageId)
        );
        
        // Clear any timer for this message
        if (messageTimers.current.has(messageId)) {
          clearInterval(messageTimers.current.get(messageId));
          messageTimers.current.delete(messageId);
        }
        
        console.log('💨 Message deleted immediately after viewing');
      }
      
    } catch (error) {
      console.error('Error handling message view:', error);
      Alert.alert('Error', 'Failed to view message');
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || sending || !currentUser?.id) return;
    // For groups, we don't need otherUser. For 1-on-1, we do.
    if (!isGroup && !otherUser?.id) return;

    const messageContent = newMessage.trim();
    setNewMessage('');
    setSending(true);
    Keyboard.dismiss();

    // Create optimistic message to show immediately
    const optimisticMessage = {
      id: `temp-${Date.now()}`, // Temporary ID
      conversation_id: conversationId,
      sender_id: currentUser.id,
      receiver_id: isGroup ? null : otherUser.id, // null for group messages
      content: messageContent,
      message_type: 'text',
      created_at: new Date().toISOString(),
      is_read: false,
      is_ephemeral: ephemeralMode,
      expires_at: ephemeralMode ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : null,
      time_remaining_seconds: ephemeralMode ? 24 * 60 * 60 : null,
      sending: true // Flag to show this is being sent
    };

    // Add message to local state immediately
    setMessages(prevMessages => [...prevMessages, optimisticMessage]);

    // Scroll to bottom immediately
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      let data, error;
      
      if (isGroup) {
        // Use the group messaging function
        ({ data, error } = await supabase.rpc('send_group_message', {
          conversation_id: conversationId,
          sender_id: currentUser.id,
          content: messageContent,
          message_type: 'text'
        }));
        
        // If successful, get the full message data
        if (!error && data) {
          const { data: messageData, error: fetchError } = await supabase
            .from('messages')
            .select('*')
            .eq('id', data)
            .single();
          
          if (!fetchError) {
            data = messageData;
          }
        }
      } else {
        // Regular 1-on-1 message
        ({ data, error } = await supabase
          .from('messages')
          .insert({
            conversation_id: conversationId,
            sender_id: currentUser.id,
            receiver_id: otherUser.id,
            content: messageContent,
            message_type: 'text',
            is_ephemeral: ephemeralMode
          })
          .select()
          .single());
      }

      if (error) {
        console.error('Error sending message:', error);
        Alert.alert('Error', 'Failed to send message');
        setNewMessage(messageContent); // Restore message if failed
        
        // Remove the optimistic message and show error
        setMessages(prevMessages => 
          prevMessages.filter(msg => msg.id !== optimisticMessage.id)
        );
      } else {
        // Replace optimistic message with real message from database
        const messageWithTimer = { ...data, time_remaining_seconds: calculateTimeRemaining(data) };
        setMessages(prevMessages => 
          prevMessages.map(msg => 
            msg.id === optimisticMessage.id ? messageWithTimer : msg
          )
        );
        
        // Set up timer if ephemeral
        if (data.is_ephemeral && data.expires_at) {
          setupMessageTimer(messageWithTimer);
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
      setNewMessage(messageContent);
      
      // Remove the optimistic message
      setMessages(prevMessages => 
        prevMessages.filter(msg => msg.id !== optimisticMessage.id)
      );
    } finally {
      setSending(false);
    }
  };

  const formatMessageTime = (timestamp) => {
    const messageDate = new Date(timestamp);
    const now = new Date();
    const diffInDays = Math.floor((now - messageDate) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) {
      return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInDays === 1) {
      return 'Yesterday';
    } else {
      return messageDate.toLocaleDateString();
    }
  };

  const formatTimeRemaining = (seconds) => {
    if (!seconds || seconds <= 0) return '';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const getSenderDisplayName = (senderId) => {
    if (senderId === currentUser?.id) return 'You';
    
    if (isGroup) {
      const participant = groupParticipants.find(p => p.user_id === senderId);
      return participant?.username || 'Unknown';
    }
    
    return otherUser?.username || 'Unknown';
  };

  const renderMessage = ({ item, index }) => {
    const isMyMessage = item.sender_id === currentUser?.id;
    const previousMessage = index > 0 ? messages[index - 1] : null;
    const showTimestamp = !previousMessage || 
      new Date(item.created_at) - new Date(previousMessage.created_at) > 5 * 60 * 1000; // 5 minutes

    const isImageMessage = item.message_type === 'image';
    const isVideoMessage = item.message_type === 'video';
    
    // Show sender name for group messages when sender changes or after timestamp
    const showSenderName = isGroup && !isMyMessage && (
      !previousMessage || 
      previousMessage.sender_id !== item.sender_id ||
      showTimestamp
    );

    return (
      <View style={[{ 
        marginVertical: 2,
        paddingHorizontal: 16 
      }]}>
        {showTimestamp && (
          <View style={[{ alignItems: 'center', marginVertical: 8 }]}>
            <Text style={[{
              fontSize: 12,
              color: currentTheme.textSecondary,
              backgroundColor: currentTheme.surface,
              paddingHorizontal: 12,
              paddingVertical: 4,
              borderRadius: 12
            }]}>
              {formatMessageTime(item.created_at)}
            </Text>
          </View>
        )}
        
        {showSenderName && (
          <Text style={[{
            fontSize: 12,
            color: '#10b981',
            fontWeight: 'bold',
            marginBottom: 4,
            marginLeft: 8
          }]}>
            {getSenderDisplayName(item.sender_id)}
          </Text>
        )}
        
        <TouchableOpacity 
          style={[{
            flexDirection: isMyMessage ? 'row-reverse' : 'row',
            alignItems: 'flex-end',
            marginBottom: 4
          }]}
          onPress={() => {
            // If it's a received ephemeral message, mark as viewed when tapped
            if (item.is_ephemeral && !isMyMessage && !item.viewed_at) {
              console.log('👻 User tapped ephemeral message to view it');
              handleMessageViewed(item.id);
            }
          }}
          onLongPress={() => {
            // Show confirmation for ephemeral messages
            if (item.is_ephemeral && !isMyMessage && !item.viewed_at) {
              let alertMessage = 'This message will disappear after you view it.';
              if (isImageMessage) alertMessage = 'This photo will disappear after you view it.';
              if (isVideoMessage) alertMessage = 'This video will disappear after you view it.';
              
              Alert.alert(
                '👻 View Message?',
                alertMessage,
                [
                  { text: 'Cancel', style: 'cancel' },
                  { 
                    text: 'View & Delete', 
                    style: 'destructive',
                    onPress: () => handleMessageViewed(item.id)
                  }
                ]
              );
            }
          }}
        >
          <View style={[{
            maxWidth: (isImageMessage || isVideoMessage) ? '70%' : '80%',
            backgroundColor: (isImageMessage || isVideoMessage) ? 'transparent' : (isMyMessage ? currentTheme.primary : currentTheme.surface),
            borderRadius: 20,
            paddingHorizontal: (isImageMessage || isVideoMessage) ? 0 : 16,
            paddingVertical: (isImageMessage || isVideoMessage) ? 0 : 12,
            borderBottomRightRadius: isMyMessage ? 4 : 20,
            borderBottomLeftRadius: isMyMessage ? 20 : 4,
            shadowColor: currentTheme.text,
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.1,
            shadowRadius: 1,
            elevation: 1,
            // Add visual indicator for ephemeral messages
            borderWidth: item.is_ephemeral ? 2 : 0,
            borderColor: item.is_ephemeral ? (isMyMessage ? currentTheme.background : currentTheme.primary) : 'transparent'
          }]}>
            
            {/* Video Message */}
            {isVideoMessage && item.video_url ? (
              <View>
                <Video
                  source={{ uri: item.video_url }}
                  style={[{
                    width: screenWidth * 0.6,
                    height: screenWidth * 0.8,
                    borderRadius: 16,
                    backgroundColor: currentTheme.surface
                  }]}
                  useNativeControls={true}
                  shouldPlay={false}
                  isLooping={false}
                  resizeMode="cover"
                />
                
                {/* Video message overlay */}
                <View style={[{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  backgroundColor: 'rgba(0, 0, 0, 0.6)',
                  borderBottomLeftRadius: 16,
                  borderBottomRightRadius: 16,
                  paddingHorizontal: 12,
                  paddingVertical: 8
                }]}>
                  {item.is_ephemeral && (
                    <View style={[{ 
                      flexDirection: 'row', 
                      alignItems: 'center', 
                      justifyContent: 'space-between'
                    }]}>
                      <Text style={[{
                        fontSize: 10,
                        color: 'white',
                        opacity: 0.9
                      }]}>
                        👻 {isMyMessage ? 'Disappears when viewed' : 'Tap to view & delete'}
                      </Text>
                      {item.time_remaining_seconds > 0 && (
                        <Text style={[{
                          fontSize: 10,
                          color: 'white',
                          fontWeight: 'bold'
                        }]}>
                          {formatTimeRemaining(item.time_remaining_seconds)}
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              </View>
            ) : isVideoMessage ? (
              /* Fallback for missing video_url */
              <View style={[{
                width: screenWidth * 0.6,
                height: screenWidth * 0.8,
                borderRadius: 16,
                backgroundColor: currentTheme.surface,
                justifyContent: 'center',
                alignItems: 'center'
              }]}>
                <Text style={[{ fontSize: 32, marginBottom: 8 }]}>🎥</Text>
                <Text style={[{ color: currentTheme.textSecondary, fontSize: 14 }]}>Video not available</Text>
              </View>
            ) : 
            
            /* Image Message */
            isImageMessage && item.image_url ? (
              <View>
                <ImageWithFallback
                  source={{ uri: item.image_url }}
                  style={[{
                    width: screenWidth * 0.6,
                    height: screenWidth * 0.8,
                    borderRadius: 16,
                    backgroundColor: currentTheme.surface
                  }]}
                  resizeMode="cover"
                  fallbackText="📸"
                  fallbackSubtext="Image couldn't load"
                />
                
                {/* Image message overlay */}
                <View style={[{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  backgroundColor: 'rgba(0, 0, 0, 0.6)',
                  borderBottomLeftRadius: 16,
                  borderBottomRightRadius: 16,
                  paddingHorizontal: 12,
                  paddingVertical: 8
                }]}>
                  {item.is_ephemeral && (
                    <View style={[{ 
                      flexDirection: 'row', 
                      alignItems: 'center', 
                      justifyContent: 'space-between'
                    }]}>
                      <Text style={[{
                        fontSize: 10,
                        color: 'white',
                        opacity: 0.9
                      }]}>
                        👻 {isMyMessage ? 'Disappears when viewed' : 'Tap to view & delete'}
                      </Text>
                      {item.time_remaining_seconds > 0 && (
                        <Text style={[{
                          fontSize: 10,
                          color: 'white',
                          fontWeight: 'bold'
                        }]}>
                          {formatTimeRemaining(item.time_remaining_seconds)}
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              </View>
            ) : isImageMessage ? (
              /* Fallback for missing image_url */
              <View style={[{
                width: screenWidth * 0.6,
                height: screenWidth * 0.8,
                borderRadius: 16,
                backgroundColor: currentTheme.surface,
                justifyContent: 'center',
                alignItems: 'center'
              }]}>
                <Text style={[{ fontSize: 32, marginBottom: 8 }]}>📸</Text>
                <Text style={[{ color: currentTheme.textSecondary, fontSize: 14 }]}>Image not available</Text>
              </View>
            ) : (
              /* Text Message */
              <View>
                <Text style={[{
                  fontSize: 16,
                  color: isMyMessage ? currentTheme.background : currentTheme.text,
                  lineHeight: 22
                }]}>
                  {item.content}
                </Text>
                
                {/* Ephemeral message indicator */}
                {item.is_ephemeral && (
                  <View style={[{ 
                    flexDirection: 'row', 
                    alignItems: 'center', 
                    marginTop: 4,
                    justifyContent: 'space-between'
                  }]}>
                    <Text style={[{
                      fontSize: 10,
                      color: isMyMessage ? currentTheme.background : currentTheme.textSecondary,
                      opacity: 0.7
                    }]}>
                      👻 {isMyMessage ? 'Disappears when viewed' : 'Tap to view & delete'}
                    </Text>
                    {item.time_remaining_seconds > 0 && (
                      <Text style={[{
                        fontSize: 10,
                        color: isMyMessage ? currentTheme.background : currentTheme.primary,
                        fontWeight: 'bold'
                      }]}>
                        {formatTimeRemaining(item.time_remaining_seconds)}
                      </Text>
                    )}
                  </View>
                )}
              </View>
            )}
            
            {/* Sending indicator */}
            {item.sending && (
              <View style={[{ 
                flexDirection: 'row', 
                alignItems: 'center', 
                marginTop: 4 
              }]}>
                <Text style={[{
                  fontSize: 10,
                  color: isMyMessage ? currentTheme.background : currentTheme.textSecondary,
                  opacity: 0.7
                }]}>
                  Sending...
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={[{
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 32
    }]}>
      <Text style={[{ fontSize: 48, marginBottom: 16 }]}>
        {isGroup ? '👥' : (ephemeralMode ? '👻' : '👋')}
      </Text>
      <Text style={[{
        fontSize: 20,
        fontWeight: 'bold',
        color: isGroup ? '#10b981' : currentTheme.primary,
        marginBottom: 8,
        textAlign: 'center'
      }]}>
        {isGroup 
          ? 'Welcome to the group!'
          : (ephemeralMode ? 'Send a disappearing message!' : 'Start the conversation!')
        }
      </Text>
      <Text style={[{
        fontSize: 16,
        color: currentTheme.textSecondary,
        textAlign: 'center'
      }]}>
        {isGroup
          ? `Send a message to start chatting with ${groupParticipants.filter(p => p.is_active && p.user_id !== currentUser?.id).length} members`
          : (ephemeralMode 
            ? `Photos and messages will disappear after 24 hours or when viewed by ${otherUser?.username}`
            : `Send a message to ${otherUser?.username}`
          )
        }
      </Text>
    </View>
  );

  return (
    <KeyboardAvoidingView 
      style={[{ flex: 1, backgroundColor: currentTheme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={[{
        backgroundColor: currentTheme.surface,
        paddingTop: 50,
        paddingBottom: 16,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: currentTheme.border,
        flexDirection: 'row',
        alignItems: 'center'
      }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[{
            marginRight: 16,
            padding: 8
          }]}
        >
          <Text style={[{ fontSize: 24, color: currentTheme.primary }]}>←</Text>
        </TouchableOpacity>
        
        <View style={[{
          backgroundColor: isGroup ? '#10b981' : currentTheme.primary,
          borderRadius: 22,
          width: 44,
          height: 44,
          justifyContent: 'center',
          alignItems: 'center',
          marginRight: 12,
          position: 'relative'
        }]}>
          <Text style={[{
            color: currentTheme.background,
            fontWeight: 'bold',
            fontSize: 18
          }]}>
            {isGroup 
              ? (groupName?.charAt(0).toUpperCase() || 'G')
              : (otherUser?.username?.charAt(0).toUpperCase() || '?')
            }
          </Text>
          {isGroup && (
            <View style={[{
              position: 'absolute',
              bottom: -2,
              right: -2,
              backgroundColor: '#10b981',
              borderRadius: 6,
              width: 12,
              height: 12,
              justifyContent: 'center',
              alignItems: 'center',
              borderWidth: 1,
              borderColor: currentTheme.surface
            }]}>
              <Text style={[{
                color: 'white',
                fontSize: 8,
                fontWeight: 'bold'
              }]}>
                👥
              </Text>
            </View>
          )}
        </View>
        
        <View style={[{ flex: 1 }]}>
          <Text style={[{
            fontSize: 20,
            fontWeight: 'bold',
            color: isGroup ? '#10b981' : currentTheme.primary
          }]}>
            {isGroup ? (groupName || 'Group Chat') : (otherUser?.username || 'Unknown User')}
          </Text>
          <Text style={[{
            fontSize: 14,
            color: currentTheme.textSecondary
          }]}>
            {isGroup 
              ? `${groupParticipants.filter(p => p.is_active).length} members`
              : (ephemeralMode ? '👻 Disappearing messages' : 'Online')
            }
          </Text>
        </View>

        {/* Group info or Ephemeral mode toggle */}
        {isGroup ? (
          <TouchableOpacity
            onPress={() => {
              // TODO: Navigate to group info screen
              Alert.alert('Group Info', `Members:\n${groupParticipants.filter(p => p.is_active).map(p => `• ${p.username}`).join('\n')}`);
            }}
            style={[{
              padding: 8,
              borderRadius: 20,
              backgroundColor: currentTheme.background,
              borderWidth: 1,
              borderColor: '#10b981'
            }]}
          >
            <Text style={[{
              color: '#10b981',
              fontSize: 16
            }]}>
              ℹ️
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={() => setEphemeralMode(!ephemeralMode)}
            style={[{
              padding: 8,
              borderRadius: 20,
              backgroundColor: ephemeralMode ? currentTheme.primary : currentTheme.background,
              borderWidth: 1,
              borderColor: currentTheme.primary
            }]}
          >
            <Text style={[{
              color: ephemeralMode ? currentTheme.background : currentTheme.primary,
              fontSize: 16
            }]}>
              {ephemeralMode ? '👻' : '💬'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[{
          paddingVertical: 16,
          flexGrow: 1
        }]}
        ListEmptyComponent={!loading ? renderEmptyState : null}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
      />

      {/* Message Input */}
      <View style={[{
        backgroundColor: currentTheme.surface,
        paddingHorizontal: 16,
        paddingVertical: 12,
        paddingBottom: Platform.OS === 'ios' ? 34 : 12,
        borderTopWidth: 1,
        borderTopColor: currentTheme.border,
        flexDirection: 'row',
        alignItems: 'flex-end'
      }]}>
        {/* Camera Button */}
        <TouchableOpacity
          onPress={() => navigation.navigate('Camera')}
          style={[{
            backgroundColor: currentTheme.primary,
            borderRadius: 22,
            width: 44,
            height: 44,
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 12
          }]}
        >
          <Text style={[{
            color: currentTheme.background,
            fontSize: 18,
            fontWeight: 'bold'
          }]}>
            📸
          </Text>
        </TouchableOpacity>

        <View style={[{
          flex: 1,
          backgroundColor: currentTheme.background,
          borderRadius: 24,
          borderWidth: 1,
          borderColor: currentTheme.border,
          marginRight: 12,
          paddingHorizontal: 16,
          paddingVertical: 8,
          maxHeight: 120
        }]}>
          <TextInput
            style={[{
              fontSize: 16,
              color: currentTheme.text,
              minHeight: 24,
              maxHeight: 100
            }]}
            placeholder={ephemeralMode ? "Send a disappearing message..." : "Type a message..."}
            placeholderTextColor={currentTheme.textSecondary}
            value={newMessage}
            onChangeText={setNewMessage}
            multiline
            returnKeyType="send"
            onSubmitEditing={sendMessage}
            blurOnSubmit={false}
          />
        </View>

        {/* AI Suggestions Button */}
        <TouchableOpacity
          onPress={showMoodSelection}
          style={[{
            backgroundColor: '#4A90E2',
            borderRadius: 22,
            width: 44,
            height: 44,
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 8,
            shadowColor: '#4A90E2',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.6,
            shadowRadius: 4,
            elevation: 6,
          }]}
        >
          <Text style={[{
            fontSize: 18
          }]}>
            🤖
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          onPress={sendMessage}
          disabled={!newMessage.trim() || sending}
          style={[{
            backgroundColor: currentTheme.primary,
            borderRadius: 22,
            width: 44,
            height: 44,
            justifyContent: 'center',
            alignItems: 'center',
            opacity: (!newMessage.trim() || sending) ? 0.5 : 1
          }]}
        >
          <Text style={[{
            color: currentTheme.background,
            fontSize: 18,
            fontWeight: 'bold'
          }]}>
            {sending ? '...' : '➤'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* AI Suggestions Quick Bar */}
      {showSuggestions && aiSuggestions.length > 0 && (
        <View style={[{
          backgroundColor: currentTheme.surface,
          paddingVertical: 8,
          paddingHorizontal: 16,
          borderTopWidth: 1,
          borderTopColor: currentTheme.border,
          paddingBottom: Platform.OS === 'ios' ? 34 : 8,
        }]}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 8 }}
          >
            {aiSuggestions.map((suggestion, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => handleAISuggestionSelect(suggestion)}
                style={[{
                  backgroundColor: '#4A90E2',
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 20,
                  marginHorizontal: 4,
                  maxWidth: screenWidth * 0.7
                }]}
              >
                <Text style={[{
                  color: 'white',
                  fontSize: 14,
                  fontWeight: '600'
                }]}>
                  {suggestion}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              onPress={() => setShowSuggestions(false)}
              style={[{
                backgroundColor: currentTheme.textSecondary,
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 20,
                marginHorizontal: 4,
              }]}
            >
              <Text style={[{
                color: 'white',
                fontSize: 14,
                fontWeight: '600'
              }]}>
                ✕
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {/* Floating AI Assistant Button */}
      <FloatingAIButton
        onPress={() => setShowAIAssistant(true)}
        visible={!showSuggestions}
      />

      {/* AI Assistant Modal */}
      <AIAssistant
        visible={showAIAssistant}
        onClose={() => setShowAIAssistant(false)}
        context="messaging"
        onSuggestionSelect={handleAISuggestionSelect}
        userProfile={userProfile}
        conversationData={{
          messages,
          chatType: isGroup ? 'group' : 'individual',
          relationship: 'friend'
        }}
      />

      {/* Mood Selector Modal */}
      <Modal
        visible={showMoodSelector}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowMoodSelector(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'flex-end'
        }}>
          <View style={{
            backgroundColor: currentTheme.surface,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingHorizontal: 20,
            paddingTop: 20,
            paddingBottom: Platform.OS === 'ios' ? 40 : 20,
            maxHeight: '70%'
          }}>
            {/* Header */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 20
            }}>
              <Text style={{
                fontSize: 20,
                fontWeight: 'bold',
                color: currentTheme.text
              }}>
                🎭 Add Your Mood to Context
              </Text>
              <TouchableOpacity
                onPress={() => setShowMoodSelector(false)}
                style={{
                  backgroundColor: currentTheme.border,
                  borderRadius: 15,
                  width: 30,
                  height: 30,
                  justifyContent: 'center',
                  alignItems: 'center'
                }}
              >
                <Text style={{ color: currentTheme.text, fontSize: 16 }}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Context Explanation */}
            <View style={{
              backgroundColor: currentTheme.background,
              borderRadius: 12,
              padding: 12,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: currentTheme.border
            }}>
              <Text style={{
                fontSize: 14,
                color: currentTheme.textSecondary,
                marginBottom: 4
              }}>
                AI will respond to your conversation context first, then add your mood flavor:
              </Text>
              <Text style={{
                fontSize: 16,
                fontWeight: 'bold',
                color: currentTheme.primary
              }}>
                {moodOptions.find(m => m.id === selectedMood)?.emoji} Current mood: {moodOptions.find(m => m.id === selectedMood)?.name}
              </Text>
            </View>

            {/* Mood Grid */}
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                justifyContent: 'space-between'
              }}>
                {moodOptions.map((mood) => (
                  <TouchableOpacity
                    key={mood.id}
                    onPress={() => handleMoodSelect(mood)}
                    style={{
                      width: '48%',
                      backgroundColor: selectedMood === mood.id ? mood.color : currentTheme.background,
                      borderRadius: 16,
                      padding: 16,
                      marginBottom: 12,
                      borderWidth: 2,
                      borderColor: selectedMood === mood.id ? mood.color : currentTheme.border,
                      alignItems: 'center'
                    }}
                  >
                    <Text style={{
                      fontSize: 32,
                      marginBottom: 8
                    }}>
                      {mood.emoji}
                    </Text>
                    <Text style={{
                      fontSize: 16,
                      fontWeight: 'bold',
                      color: selectedMood === mood.id ? 'white' : currentTheme.text,
                      marginBottom: 4,
                      textAlign: 'center'
                    }}>
                      {mood.name}
                    </Text>
                    <Text style={{
                      fontSize: 12,
                      color: selectedMood === mood.id ? 'rgba(255,255,255,0.8)' : currentTheme.textSecondary,
                      textAlign: 'center'
                    }}>
                      {mood.description}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Quick Generate Button */}
              <TouchableOpacity
                onPress={() => generateAISuggestions(selectedMood)}
                style={{
                  backgroundColor: '#4A90E2',
                  borderRadius: 20,
                  paddingVertical: 16,
                  marginTop: 16,
                  alignItems: 'center'
                }}
              >
                <Text style={{
                  color: 'white',
                  fontSize: 16,
                  fontWeight: 'bold'
                }}>
                  🤖 Generate Context-Based Suggestions
                </Text>
                <Text style={{
                  color: 'rgba(255,255,255,0.8)',
                  fontSize: 12,
                  marginTop: 4
                }}>
                  with {moodOptions.find(m => m.id === selectedMood)?.name.toLowerCase()} mood
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
} 