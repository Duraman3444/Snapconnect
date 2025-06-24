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
      // Get all conversations where current user is a participant (1-on-1 and groups)
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

      // Get group conversations where user is a participant
      const { data: groupConversations, error: groupError } = await supabase
        .from('conversations')
        .select(`
          *,
          group_participants!inner(user_id, is_active)
        `)
        .eq('is_group', true)
        .eq('group_participants.user_id', currentUser.id)
        .eq('group_participants.is_active', true)
        .order('last_message_at', { ascending: false });

      if (groupError) {
        console.error('Error fetching group conversations:', groupError);
      }

      // Combine and deduplicate conversations
      const allConversations = [...conversationsData];
      if (groupConversations) {
        groupConversations.forEach(group => {
          if (!allConversations.find(conv => conv.id === group.id)) {
            allConversations.push(group);
          }
        });
      }

      // Sort by last message time
      allConversations.sort((a, b) => new Date(b.last_message_at) - new Date(a.last_message_at));

      // Get user profiles and messages for each conversation
      const processedConversations = await Promise.all(
        allConversations.map(async (conversation) => {
          let otherParticipant = null;
          let participantNames = [];

          if (conversation.is_group) {
            // For group chats, get all participants
            const { data: participants } = await supabase
              .rpc('get_group_participants', { conversation_id: conversation.id });
            
            participantNames = participants
              ?.filter(p => p.is_active && p.user_id !== currentUser.id)
              ?.map(p => p.username) || [];
          } else {
            // For 1-on-1 chats, get the other participant's profile
            const otherParticipantId = conversation.participant_one_id === currentUser.id 
              ? conversation.participant_two_id 
              : conversation.participant_one_id;

            const { data: otherParticipantData } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', otherParticipantId)
              .single();

            otherParticipant = otherParticipantData;
          }

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
            participantNames,
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
      otherUser: conversation.is_group ? null : conversation.otherParticipant,
      isGroup: conversation.is_group,
      groupName: conversation.group_name,
      groupDescription: conversation.group_description
    });
  };

  const getConversationDisplayName = (item) => {
    if (item.is_group) {
      return item.group_name || 'Group Chat';
    }
    return item.otherParticipant?.username || 'Unknown User';
  };

  const getConversationSubtitle = (item) => {
    if (item.is_group && item.participantNames?.length > 0) {
      return item.participantNames.slice(0, 3).join(', ') + 
        (item.participantNames.length > 3 ? ` and ${item.participantNames.length - 3} others` : '');
    }
    return item.otherParticipant?.username || '';
  };

  const getAvatarText = (item) => {
    if (item.is_group) {
      return item.group_name?.charAt(0).toUpperCase() || 'G';
    }
    return item.otherParticipant?.username?.charAt(0).toUpperCase() || '?';
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
        backgroundColor: item.is_group ? '#10b981' : currentTheme.primary, // Green for groups
        borderRadius: 30,
        width: 60,
        height: 60,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
        position: 'relative'
      }]}>
        <Text style={[{
          color: currentTheme.background,
          fontWeight: 'bold',
          fontSize: 24
        }]}>
          {getAvatarText(item)}
        </Text>
        {item.is_group && (
          <View style={[{
            position: 'absolute',
            bottom: -2,
            right: -2,
            backgroundColor: '#10b981',
            borderRadius: 8,
            width: 16,
            height: 16,
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: 2,
            borderColor: currentTheme.surface
          }]}>
            <Text style={[{
              color: 'white',
              fontSize: 10,
              fontWeight: 'bold'
            }]}>
              👥
            </Text>
          </View>
        )}
      </View>

      {/* Conversation Details */}
      <View style={[{ flex: 1 }]}>
        <View style={[{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }]}>
          <Text style={[{
            fontWeight: 'bold',
            fontSize: 18,
            color: item.is_group ? '#10b981' : currentTheme.primary
          }]}>
            {getConversationDisplayName(item)}
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
          <View style={{ flex: 1, marginRight: 8 }}>
            {item.is_group && getConversationSubtitle(item) && (
              <Text 
                style={[{
                  fontSize: 12,
                  color: currentTheme.textSecondary,
                  fontStyle: 'italic'
                }]}
                numberOfLines={1}
              >
                {getConversationSubtitle(item)}
              </Text>
            )}
            <Text 
              style={[{
                fontSize: 14,
                color: currentTheme.textSecondary,
                flex: 1
              }]}
              numberOfLines={1}
            >
              {getLastMessagePreview(item.lastMessage)}
            </Text>
          </View>
          
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
        
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            onPress={() => navigation.navigate('CreateGroup')}
            style={[{
              backgroundColor: '#10b981',
              borderRadius: 20,
              paddingHorizontal: 12,
              paddingVertical: 8
            }]}
          >
            <Text style={[{
              color: 'white',
              fontWeight: 'bold',
              fontSize: 14
            }]}>
              👥 Group
            </Text>
          </TouchableOpacity>
          
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