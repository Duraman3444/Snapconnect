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
  Dimensions
} from 'react-native';
import { useAuth } from '../context/SupabaseAuthContext';
import { useTheme } from '../context/ThemeContext';

const { width: screenWidth } = Dimensions.get('window');

export default function ChatScreen({ navigation, route }) {
  const { conversationId, otherUser } = route.params || {};
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [ephemeralMode, setEphemeralMode] = useState(true); // Default to ephemeral like Snapchat
  const { currentUser, supabase } = useAuth();
  const { currentTheme } = useTheme();
  const flatListRef = useRef();
  const messageTimers = useRef(new Map()); // Track countdown timers for messages

  // Safety check - if we don't have required data, go back
  React.useEffect(() => {
    if (!conversationId || !otherUser || !currentUser) {
      console.log('ChatScreen: Missing required data, navigating back');
      navigation.goBack();
      return;
    }
  }, [conversationId, otherUser, currentUser, navigation]);

  useEffect(() => {
    if (!currentUser?.id || !conversationId || !otherUser?.id) return;

    loadMessages();
    markMessagesAsRead();
    
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

    return () => {
      messagesChannel.unsubscribe();
      // Clear all timers
      messageTimers.current.forEach(timer => clearInterval(timer));
      messageTimers.current.clear();
    };
  }, [currentUser, conversationId]);

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

  const markMessagesAsRead = async () => {
    if (!currentUser?.id || !conversationId) return;
    
    try {
      // For ephemeral messages, we handle viewing instead of just marking as read
      const unreadMessages = messages.filter(msg => 
        !msg.is_read && msg.receiver_id === currentUser?.id
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
    if (!newMessage.trim() || sending || !currentUser?.id || !otherUser?.id) return;

    const messageContent = newMessage.trim();
    setNewMessage('');
    setSending(true);
    Keyboard.dismiss();

    // Create optimistic message to show immediately
    const optimisticMessage = {
      id: `temp-${Date.now()}`, // Temporary ID
      conversation_id: conversationId,
      sender_id: currentUser.id,
      receiver_id: otherUser.id,
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
      const { data, error } = await supabase
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
        .single();

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

  const renderMessage = ({ item, index }) => {
    const isMyMessage = item.sender_id === currentUser?.id;
    const previousMessage = index > 0 ? messages[index - 1] : null;
    const showTimestamp = !previousMessage || 
      new Date(item.created_at) - new Date(previousMessage.created_at) > 5 * 60 * 1000; // 5 minutes

    const isImageMessage = item.message_type === 'image';

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
              Alert.alert(
                '👻 View Message?',
                isImageMessage ? 'This photo will disappear after you view it.' : 'This message will disappear after you view it.',
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
            maxWidth: isImageMessage ? '70%' : '80%',
            backgroundColor: isImageMessage ? 'transparent' : (isMyMessage ? currentTheme.primary : currentTheme.surface),
            borderRadius: 20,
            paddingHorizontal: isImageMessage ? 0 : 16,
            paddingVertical: isImageMessage ? 0 : 12,
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
            
            {/* Image Message */}
            {isImageMessage && item.image_url ? (
              <View>
                <Image 
                  source={{ 
                    uri: item.image_url,
                    headers: {
                      'Cache-Control': 'no-cache',
                    },
                  }}
                  style={[{
                    width: screenWidth * 0.6,
                    height: screenWidth * 0.8,
                    borderRadius: 16,
                    backgroundColor: currentTheme.surface
                  }]}
                  resizeMode="cover"
                  onError={(error) => {
                    console.error('Chat image loading error:', error.nativeEvent?.error || error);
                    console.error('Failed URL:', item.image_url);
                  }}
                  onLoad={() => {
                    console.log('Chat image loaded successfully:', item.image_url);
                  }}
                  onLoadStart={() => {
                    console.log('Started loading chat image:', item.image_url);
                  }}
                  // Add these additional props for better compatibility
                  fadeDuration={0}
                  loadingIndicatorSource={{ uri: 'https://via.placeholder.com/300x400.png?text=Loading...' }}
                />
                
                {/* Fallback overlay if image fails */}
                <View style={[{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(0, 0, 0, 0.1)',
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderRadius: 16
                }]}>
                  {/* This will be transparent if image loads, visible if it fails */}
                </View>
                
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
        {ephemeralMode ? '👻' : '👋'}
      </Text>
      <Text style={[{
        fontSize: 20,
        fontWeight: 'bold',
        color: currentTheme.primary,
        marginBottom: 8,
        textAlign: 'center'
      }]}>
        {ephemeralMode ? 'Send a disappearing message!' : 'Start the conversation!'}
      </Text>
      <Text style={[{
        fontSize: 16,
        color: currentTheme.textSecondary,
        textAlign: 'center'
      }]}>
        {ephemeralMode 
          ? `Photos and messages will disappear after 24 hours or when viewed by ${otherUser?.username}`
          : `Send a message to ${otherUser?.username}`
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
          backgroundColor: currentTheme.primary,
          borderRadius: 22,
          width: 44,
          height: 44,
          justifyContent: 'center',
          alignItems: 'center',
          marginRight: 12
        }]}>
          <Text style={[{
            color: currentTheme.background,
            fontWeight: 'bold',
            fontSize: 18
          }]}>
            {otherUser?.username?.charAt(0).toUpperCase() || '?'}
          </Text>
        </View>
        
        <View style={[{ flex: 1 }]}>
          <Text style={[{
            fontSize: 20,
            fontWeight: 'bold',
            color: currentTheme.primary
          }]}>
            {otherUser?.username || 'Unknown User'}
          </Text>
          <Text style={[{
            fontSize: 14,
            color: currentTheme.textSecondary
          }]}>
            {ephemeralMode ? '👻 Disappearing messages' : 'Online'}
          </Text>
        </View>

        {/* Ephemeral mode toggle */}
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
    </KeyboardAvoidingView>
  );
} 