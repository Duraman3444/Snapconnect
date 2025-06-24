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
  Keyboard
} from 'react-native';
import { useAuth } from '../context/SupabaseAuthContext';
import { useTheme } from '../context/ThemeContext';

export default function ChatScreen({ navigation, route }) {
  const { conversationId, otherUser } = route.params || {};
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const { currentUser, supabase } = useAuth();
  const { currentTheme } = useTheme();
  const flatListRef = useRef();

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
                ? newMessage 
                : msg
            );
          } else {
            // New message from another user or missed message
            return [...prevMessages, newMessage];
          }
        });
        
        // Mark message as read if it's not from current user
        if (newMessage.sender_id !== currentUser?.id) {
          markMessageAsRead(newMessage.id);
        }
        
        // Scroll to bottom
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      })
      .subscribe();

    return () => {
      messagesChannel.unsubscribe();
    };
  }, [currentUser, conversationId]);

  const loadMessages = async () => {
    if (!currentUser?.id || !conversationId) return;
    
    try {
      const { data: messagesData, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
        setLoading(false);
        return;
      }

      setMessages(messagesData || []);
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
      await supabase
        .from('messages')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .eq('receiver_id', currentUser.id)
        .eq('is_read', false);
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const markMessageAsRead = async (messageId) => {
    try {
      await supabase
        .from('messages')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', messageId);
    } catch (error) {
      console.error('Error marking message as read:', error);
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
          message_type: 'text'
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
        setMessages(prevMessages => 
          prevMessages.map(msg => 
            msg.id === optimisticMessage.id ? data : msg
          )
        );
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

  const renderMessage = ({ item, index }) => {
    const isMyMessage = item.sender_id === currentUser?.id;
    const previousMessage = index > 0 ? messages[index - 1] : null;
    const showTimestamp = !previousMessage || 
      new Date(item.created_at) - new Date(previousMessage.created_at) > 5 * 60 * 1000; // 5 minutes

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
        
        <View style={[{
          flexDirection: isMyMessage ? 'row-reverse' : 'row',
          alignItems: 'flex-end',
          marginBottom: 4
        }]}>
          <View style={[{
            maxWidth: '80%',
            backgroundColor: isMyMessage ? currentTheme.primary : currentTheme.surface,
            borderRadius: 20,
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomRightRadius: isMyMessage ? 4 : 20,
            borderBottomLeftRadius: isMyMessage ? 20 : 4,
            shadowColor: currentTheme.text,
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.1,
            shadowRadius: 1,
            elevation: 1
          }]}>
            <Text style={[{
              fontSize: 16,
              color: isMyMessage ? currentTheme.background : currentTheme.text,
              lineHeight: 22
            }]}>
              {item.content}
            </Text>
            
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
        </View>
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
      <Text style={[{ fontSize: 48, marginBottom: 16 }]}>👋</Text>
      <Text style={[{
        fontSize: 20,
        fontWeight: 'bold',
        color: currentTheme.primary,
        marginBottom: 8,
        textAlign: 'center'
      }]}>
        Start the conversation!
      </Text>
      <Text style={[{
        fontSize: 16,
        color: currentTheme.textSecondary,
        textAlign: 'center'
      }]}>
        Send a message to {otherUser?.username}
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
            Online
          </Text>
        </View>
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
            placeholder="Type a message..."
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
            backgroundColor: newMessage.trim() && !sending ? currentTheme.primary : currentTheme.border,
            borderRadius: 24,
            width: 48,
            height: 48,
            justifyContent: 'center',
            alignItems: 'center'
          }]}
        >
          <Text style={[{
            fontSize: 20,
            color: newMessage.trim() && !sending ? currentTheme.background : currentTheme.textSecondary
          }]}>
            {sending ? '⏳' : '➤'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
} 