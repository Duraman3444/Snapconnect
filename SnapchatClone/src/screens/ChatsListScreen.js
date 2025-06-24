import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { useAuth } from '../context/SupabaseAuthContext';
import { useTheme } from '../context/ThemeContext';

export default function ChatsListScreen({ navigation }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { currentUser, supabase } = useAuth();
  const { currentTheme } = useTheme();

  useEffect(() => {
    if (!currentUser?.id) return;

    loadConversations();
    
    // Set up real-time subscription for new messages and conversations
    const messagesChannel = supabase
      .channel('messages_channel')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'messages'
      }, (payload) => {
        console.log('Real-time message update:', payload);
        const message = payload.new || payload.old;
        
        // Only reload if this message involves the current user
        if (message && currentUser?.id && (message.sender_id === currentUser.id || message.receiver_id === currentUser.id)) {
          loadConversations();
        }
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'conversations'
      }, (payload) => {
        console.log('Real-time conversation update:', payload);
        const conversation = payload.new || payload.old;
        
        // Only reload if this conversation involves the current user
        if (conversation && currentUser?.id && (conversation.participant_one_id === currentUser.id || conversation.participant_two_id === currentUser.id)) {
          loadConversations();
        }
      })
      .subscribe();

    return () => {
      messagesChannel.unsubscribe();
    };
  }, [currentUser]);

  const loadConversations = async () => {
    if (!currentUser?.id) return;

    try {
      // Get all conversations where current user is a participant
      const { data: conversationsData, error } = await supabase
        .from('conversations')
        .select('*')
        .or(`participant_one_id.eq.${currentUser.id},participant_two_id.eq.${currentUser.id}`)
        .order('last_message_at', { ascending: false });

      if (error) {
        console.error('Error fetching conversations:', error);
        setLoading(false);
        return;
      }

      // Get user profiles and messages for each conversation
      const processedConversations = await Promise.all(
        conversationsData.map(async (conversation) => {
          // Get the other participant's profile
          const otherParticipantId = conversation.participant_one_id === currentUser.id 
            ? conversation.participant_two_id 
            : conversation.participant_one_id;

          const { data: otherParticipant } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', otherParticipantId)
            .single();

          // Get messages for this conversation
          const { data: messages } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conversation.id)
            .order('created_at', { ascending: false })
            .limit(50);

          // Get the latest message
          const lastMessage = messages && messages.length > 0 ? messages[0] : null;

          // Count unread messages
          const unreadCount = messages ? messages.filter(msg => 
            msg.sender_id !== currentUser?.id && !msg.is_read
          ).length : 0;

          return {
            ...conversation,
            otherParticipant,
            lastMessage,
            unreadCount
          };
        })
      );

      setConversations(processedConversations);
      setLoading(false);
    } catch (error) {
      console.error('Error loading conversations:', error);
      setLoading(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadConversations().finally(() => {
      setRefreshing(false);
    });
  };

  const formatLastMessageTime = (timestamp) => {
    if (!timestamp) return '';
    
    const messageDate = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - messageDate) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return messageDate.toLocaleDateString();
    }
  };

  const getLastMessagePreview = (lastMessage) => {
    if (!lastMessage) return 'Start a conversation...';
    
    if (lastMessage.message_type === 'image') {
      return '📸 Image';
    } else {
      return lastMessage.content.length > 50 
        ? `${lastMessage.content.substring(0, 50)}...` 
        : lastMessage.content;
    }
  };

  const openChat = (conversation) => {
    navigation.navigate('Chat', {
      conversationId: conversation.id,
      otherUser: conversation.otherParticipant
    });
  };

  const renderConversationItem = ({ item }) => (
    <TouchableOpacity
      style={[{
        backgroundColor: currentTheme.surface,
        marginHorizontal: 16,
        marginVertical: 6,
        borderRadius: 16,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: currentTheme.border,
        shadowColor: currentTheme.text,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2
      }]}
      onPress={() => openChat(item)}
      activeOpacity={0.7}
    >
      {/* Avatar */}
      <View style={[{
        backgroundColor: currentTheme.primary,
        borderRadius: 30,
        width: 60,
        height: 60,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16
      }]}>
        <Text style={[{
          color: currentTheme.background,
          fontWeight: 'bold',
          fontSize: 24
        }]}>
          {item.otherParticipant?.username?.charAt(0).toUpperCase() || '?'}
        </Text>
      </View>

      {/* Conversation Details */}
      <View style={[{ flex: 1 }]}>
        <View style={[{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }]}>
          <Text style={[{
            fontWeight: 'bold',
            fontSize: 18,
            color: currentTheme.primary
          }]}>
            {item.otherParticipant?.username || 'Unknown User'}
          </Text>
          
          {item.lastMessage && (
            <Text style={[{
              fontSize: 12,
              color: currentTheme.textSecondary
            }]}>
              {formatLastMessageTime(item.lastMessage.created_at)}
            </Text>
          )}
        </View>

        <View style={[{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
          <Text 
            style={[{
              fontSize: 14,
              color: currentTheme.textSecondary,
              flex: 1,
              marginRight: 8
            }]}
            numberOfLines={1}
          >
            {getLastMessagePreview(item.lastMessage)}
          </Text>
          
          {item.unreadCount > 0 && (
            <View style={[{
              backgroundColor: '#ef4444',
              borderRadius: 12,
              minWidth: 24,
              height: 24,
              justifyContent: 'center',
              alignItems: 'center',
              paddingHorizontal: 8
            }]}>
              <Text style={[{
                color: 'white',
                fontSize: 12,
                fontWeight: 'bold'
              }]}>
                {item.unreadCount > 99 ? '99+' : item.unreadCount}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={[{
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 32
    }]}>
      <Text style={[{ fontSize: 64, marginBottom: 16 }]}>💬</Text>
      <Text style={[{
        fontSize: 24,
        fontWeight: 'bold',
        color: currentTheme.primary,
        marginBottom: 8,
        textAlign: 'center'
      }]}>
        No Conversations Yet
      </Text>
      <Text style={[{
        fontSize: 16,
        color: currentTheme.textSecondary,
        textAlign: 'center',
        lineHeight: 24
      }]}>
        Start chatting with your friends! Go to the Friends screen and tap on a friend to start a conversation.
      </Text>
    </View>
  );

  return (
    <View style={[{ flex: 1, backgroundColor: currentTheme.background }]}>
      {/* Header */}
      <View style={[{
        backgroundColor: currentTheme.surface,
        paddingTop: 50,
        paddingBottom: 16,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: currentTheme.border,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
      }]}>
        <Text style={[{
          fontSize: 28,
          fontWeight: 'bold',
          color: currentTheme.primary
        }]}>
          💬 Chats
        </Text>
        
        <TouchableOpacity
          onPress={() => navigation.navigate('Friends')}
          style={[{
            backgroundColor: currentTheme.primary,
            borderRadius: 20,
            paddingHorizontal: 16,
            paddingVertical: 8
          }]}
        >
          <Text style={[{
            color: currentTheme.background,
            fontWeight: 'bold',
            fontSize: 14
          }]}>
            ➕ New Chat
          </Text>
        </TouchableOpacity>
      </View>

      {/* Conversations List */}
      <FlatList
        data={conversations}
        renderItem={renderConversationItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[{
          paddingVertical: 16,
          flexGrow: 1
        }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={currentTheme.primary}
          />
        }
        ListEmptyComponent={!loading ? renderEmptyState : null}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
} 