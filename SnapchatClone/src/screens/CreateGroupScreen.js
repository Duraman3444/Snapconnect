import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { useAuth } from '../context/SupabaseAuthContext';
import { useTheme } from '../context/ThemeContext';

export default function CreateGroupScreen({ navigation }) {
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [friends, setFriends] = useState([]);
  const [selectedFriends, setSelectedFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const { currentUser, supabase } = useAuth();
  const { currentTheme } = useTheme();

  useEffect(() => {
    loadFriends();
  }, [currentUser]);

  const loadFriends = async () => {
    if (!currentUser?.id) return;
    
    try {
      // Get accepted friendships where current user is involved
      const { data: friendshipsData, error } = await supabase
        .from('friendships')
        .select(`
          *,
          friend:profiles!friendships_friend_id_fkey(id, username, avatar_url),
          user:profiles!friendships_user_id_fkey(id, username, avatar_url)
        `)
        .or(`user_id.eq.${currentUser.id},friend_id.eq.${currentUser.id}`)
        .eq('status', 'accepted');

      if (error) {
        console.error('Error fetching friends:', error);
        return;
      }

      // Process friendships to get the friend (not current user)
      const processedFriends = friendshipsData.map(friendship => {
        const friend = friendship.user_id === currentUser.id 
          ? friendship.friend 
          : friendship.user;
        
        return {
          id: friend.id,
          username: friend.username,
          display_name: friend.username, // Use username as display_name fallback
          avatar_url: friend.avatar_url
        };
      });

      setFriends(processedFriends);
      setLoading(false);
    } catch (error) {
      console.error('Error loading friends:', error);
      setLoading(false);
    }
  };

  const toggleFriendSelection = (friend) => {
    setSelectedFriends(prev => {
      const isSelected = prev.some(f => f.id === friend.id);
      if (isSelected) {
        return prev.filter(f => f.id !== friend.id);
      } else {
        return [...prev, friend];
      }
    });
  };

  const createGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }

    if (selectedFriends.length === 0) {
      Alert.alert('Error', 'Please select at least one friend');
      return;
    }

    setCreating(true);

    try {
      const participantIds = selectedFriends.map(f => f.id);
      
      const { data: conversationId, error } = await supabase
        .rpc('create_group_conversation', {
          creator_id: currentUser.id,
          group_name: groupName,
          group_description: groupDescription || null,
          participant_ids: participantIds
        });

      if (error) {
        console.error('Error creating group:', error);
        Alert.alert('Error', 'Failed to create group');
        return;
      }

      // Navigate to the new group chat
      navigation.navigate('Chat', {
        conversationId,
        otherUser: null, // null for group chats
        isGroup: true,
        groupName: groupName
      });

    } catch (error) {
      console.error('Error creating group:', error);
      Alert.alert('Error', 'Failed to create group');
    } finally {
      setCreating(false);
    }
  };

  const renderFriendItem = ({ item }) => {
    const isSelected = selectedFriends.some(f => f.id === item.id);
    
    return (
      <TouchableOpacity
        style={[{
          backgroundColor: currentTheme.surface,
          marginHorizontal: 16,
          marginVertical: 4,
          borderRadius: 12,
          padding: 16,
          flexDirection: 'row',
          alignItems: 'center',
          borderWidth: 2,
          borderColor: isSelected ? currentTheme.primary : currentTheme.border,
        }]}
        onPress={() => toggleFriendSelection(item)}
        activeOpacity={0.7}
      >
        {/* Avatar */}
        <View style={[{
          backgroundColor: isSelected ? currentTheme.primary : currentTheme.textSecondary,
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
            {item.username?.charAt(0).toUpperCase() || '?'}
          </Text>
        </View>

        {/* Friend Info */}
        <View style={{ flex: 1 }}>
          <Text style={[{
            fontWeight: 'bold',
            fontSize: 16,
            color: currentTheme.text
          }]}>
            {item.display_name || item.username}
          </Text>
          <Text style={[{
            fontSize: 14,
            color: currentTheme.textSecondary
          }]}>
            @{item.username}
          </Text>
        </View>

        {/* Selection Indicator */}
        <View style={[{
          width: 24,
          height: 24,
          borderRadius: 12,
          backgroundColor: isSelected ? currentTheme.primary : 'transparent',
          borderWidth: 2,
          borderColor: currentTheme.primary,
          justifyContent: 'center',
          alignItems: 'center'
        }]}>
          {isSelected && (
            <Text style={[{
              color: currentTheme.background,
              fontWeight: 'bold',
              fontSize: 16
            }]}>
              ✓
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[{
        flex: 1,
        backgroundColor: currentTheme.background,
        justifyContent: 'center',
        alignItems: 'center'
      }]}>
        <Text style={[{ color: currentTheme.text }]}>Loading friends...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={[{ 
        flex: 1, 
        backgroundColor: currentTheme.background 
      }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={[{
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 50,
        paddingHorizontal: 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: currentTheme.border
      }]}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={[{
            padding: 8,
            marginRight: 16
          }]}
        >
          <Text style={[{
            fontSize: 18,
            color: currentTheme.primary,
            fontWeight: 'bold'
          }]}>
            Cancel
          </Text>
        </TouchableOpacity>
        
        <Text style={[{
          fontSize: 20,
          fontWeight: 'bold',
          color: currentTheme.text,
          flex: 1
        }]}>
          New Group
        </Text>

        <TouchableOpacity 
          onPress={createGroup}
          disabled={creating || !groupName.trim() || selectedFriends.length === 0}
          style={[{
            backgroundColor: (creating || !groupName.trim() || selectedFriends.length === 0) 
              ? currentTheme.textSecondary 
              : currentTheme.primary,
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 20
          }]}
        >
          <Text style={[{
            color: currentTheme.background,
            fontWeight: 'bold'
          }]}>
            {creating ? 'Creating...' : 'Create'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }}>
        {/* Group Info Section */}
        <View style={[{
          backgroundColor: currentTheme.surface,
          margin: 16,
          borderRadius: 16,
          padding: 16
        }]}>
          <Text style={[{
            fontSize: 18,
            fontWeight: 'bold',
            color: currentTheme.text,
            marginBottom: 16
          }]}>
            Group Information
          </Text>

          <TextInput
            style={[{
              backgroundColor: currentTheme.background,
              borderWidth: 1,
              borderColor: currentTheme.border,
              borderRadius: 12,
              padding: 12,
              fontSize: 16,
              color: currentTheme.text,
              marginBottom: 12
            }]}
            placeholder="Group Name (required)"
            placeholderTextColor={currentTheme.textSecondary}
            value={groupName}
            onChangeText={setGroupName}
            maxLength={50}
          />

          <TextInput
            style={[{
              backgroundColor: currentTheme.background,
              borderWidth: 1,
              borderColor: currentTheme.border,
              borderRadius: 12,
              padding: 12,
              fontSize: 16,
              color: currentTheme.text,
              height: 80,
              textAlignVertical: 'top'
            }]}
            placeholder="Group Description (optional)"
            placeholderTextColor={currentTheme.textSecondary}
            value={groupDescription}
            onChangeText={setGroupDescription}
            maxLength={200}
            multiline
          />
        </View>

        {/* Selected Friends */}
        {selectedFriends.length > 0 && (
          <View style={[{
            backgroundColor: currentTheme.surface,
            marginHorizontal: 16,
            marginBottom: 16,
            borderRadius: 16,
            padding: 16
          }]}>
            <Text style={[{
              fontSize: 16,
              fontWeight: 'bold',
              color: currentTheme.text,
              marginBottom: 12
            }]}>
              Selected ({selectedFriends.length})
            </Text>
            
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row' }}>
                {selectedFriends.map(friend => (
                  <TouchableOpacity
                    key={friend.id}
                    onPress={() => toggleFriendSelection(friend)}
                    style={[{
                      alignItems: 'center',
                      marginRight: 12,
                      padding: 8,
                      borderRadius: 12,
                      backgroundColor: currentTheme.background
                    }]}
                  >
                    <View style={[{
                      backgroundColor: currentTheme.primary,
                      borderRadius: 20,
                      width: 40,
                      height: 40,
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginBottom: 4
                    }]}>
                      <Text style={[{
                        color: currentTheme.background,
                        fontWeight: 'bold',
                        fontSize: 16
                      }]}>
                        {friend.username?.charAt(0).toUpperCase() || '?'}
                      </Text>
                    </View>
                    <Text style={[{
                      fontSize: 12,
                      color: currentTheme.text,
                      textAlign: 'center'
                    }]} numberOfLines={1}>
                      {friend.username}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Friends List */}
        <View style={[{
          backgroundColor: currentTheme.surface,
          marginHorizontal: 16,
          marginBottom: 16,
          borderRadius: 16,
          paddingTop: 16
        }]}>
          <Text style={[{
            fontSize: 16,
            fontWeight: 'bold',
            color: currentTheme.text,
            paddingHorizontal: 16,
            marginBottom: 12
          }]}>
            Select Friends
          </Text>

          {friends.length === 0 ? (
            <View style={[{
              padding: 32,
              alignItems: 'center'
            }]}>
              <Text style={[{
                fontSize: 16,
                color: currentTheme.textSecondary,
                textAlign: 'center'
              }]}>
                No friends available. Add some friends first!
              </Text>
            </View>
          ) : (
            <FlatList
              data={friends}
              keyExtractor={(item) => item.id}
              renderItem={renderFriendItem}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
} 