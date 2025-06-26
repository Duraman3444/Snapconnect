import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, Alert, TextInput, Modal } from 'react-native';
import { useAuth } from '../context/SupabaseAuthContext';
import { useTheme } from '../context/ThemeContext';

export default function FoodDeliveryGroupsScreen({ navigation }) {
  const { currentUser, supabase } = useAuth();
  const { currentTheme } = useTheme();
  const [groups, setGroups] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [restaurant, setRestaurant] = useState('');
  const [orderDeadline, setOrderDeadline] = useState('');
  const [deliveryLocation, setDeliveryLocation] = useState('');
  const [minOrder, setMinOrder] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('food_delivery_groups')
        .select(`
          *,
          organizer:profiles!food_delivery_groups_organizer_id_fkey(username),
          members:food_group_members(
            member:profiles!food_group_members_member_id_fkey(username)
          )
        `)
        .gte('order_deadline', new Date().toISOString())
        .order('order_deadline', { ascending: true });

      if (error) throw error;
      setGroups(data || []);
    } catch (error) {
      console.error('Error loading groups:', error);
    }
  };

  const createGroup = async () => {
    if (!restaurant || !orderDeadline || !deliveryLocation) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      const { error } = await supabase
        .from('food_delivery_groups')
        .insert({
          organizer_id: currentUser.id,
          restaurant,
          order_deadline: orderDeadline,
          delivery_location: deliveryLocation,
          min_order: parseFloat(minOrder) || 0,
          notes,
          status: 'open'
        });

      if (error) throw error;

      setShowCreateModal(false);
      setRestaurant('');
      setOrderDeadline('');
      setDeliveryLocation('');
      setMinOrder('');
      setNotes('');
      loadGroups();
      Alert.alert('Success', 'Food group created! 🍕');
    } catch (error) {
      Alert.alert('Error', 'Failed to create group');
    }
  };

  const joinGroup = async (groupId) => {
    try {
      const { error } = await supabase
        .from('food_group_members')
        .insert({
          group_id: groupId,
          member_id: currentUser.id
        });

      if (error) throw error;
      loadGroups();
      Alert.alert('Success', 'You joined the food group! 🎉');
    } catch (error) {
      Alert.alert('Error', 'Failed to join group');
    }
  };

  const renderGroup = ({ item }) => {
    const isOrganizer = item.organizer_id === currentUser.id;
    const hasJoined = item.members?.some(m => m.member.id === currentUser.id);
    const memberCount = item.members?.length || 0;
    const deadline = new Date(item.order_deadline);
    const isExpired = deadline < new Date();

    return (
      <View style={[{
        backgroundColor: currentTheme.surface,
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: isExpired ? '#ef4444' : currentTheme.border
      }]}>
        <View style={[{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }]}>
          <Text style={[{ fontSize: 24, marginRight: 12 }]}>🍕</Text>
          <View style={[{ flex: 1 }]}>
            <Text style={[{ fontSize: 18, fontWeight: 'bold', color: currentTheme.primary }]}>
              {item.restaurant}
            </Text>
            <Text style={[{ color: currentTheme.textSecondary, fontSize: 14 }]}>
              Organized by: {item.organizer?.username || 'Unknown'}
            </Text>
          </View>
          <View style={[{ alignItems: 'flex-end' }]}>
            <Text style={[{ color: currentTheme.primary, fontWeight: 'bold' }]}>
              {memberCount} members
            </Text>
            <Text style={[{ color: isExpired ? '#ef4444' : '#10b981', fontSize: 12, fontWeight: 'bold' }]}>
              {isExpired ? 'EXPIRED' : 'OPEN'}
            </Text>
          </View>
        </View>

        <View style={[{ marginBottom: 16 }]}>
          <Text style={[{ color: currentTheme.textSecondary, fontSize: 14, marginBottom: 4 }]}>
            ⏰ Order by: {deadline.toLocaleString()}
          </Text>
          <Text style={[{ color: currentTheme.textSecondary, fontSize: 14, marginBottom: 4 }]}>
            📍 Delivery: {item.delivery_location}
          </Text>
          {item.min_order > 0 && (
            <Text style={[{ color: currentTheme.textSecondary, fontSize: 14, marginBottom: 4 }]}>
              💰 Min order: ${item.min_order}
            </Text>
          )}
          {item.notes && (
            <Text style={[{ color: currentTheme.textSecondary, fontSize: 14 }]}>
              📝 {item.notes}
            </Text>
          )}
        </View>

        {item.members?.length > 0 && (
          <View style={[{ marginBottom: 16 }]}>
            <Text style={[{ color: currentTheme.primary, fontWeight: 'bold', marginBottom: 8 }]}>
              Members:
            </Text>
            {item.members.map((member, index) => (
              <Text key={index} style={[{ color: currentTheme.textSecondary, fontSize: 14 }]}>
                • {member.member.username}
              </Text>
            ))}
          </View>
        )}

        {!isOrganizer && !hasJoined && !isExpired && (
          <TouchableOpacity
            style={[{ backgroundColor: currentTheme.primary, borderRadius: 12, padding: 12 }]}
            onPress={() => joinGroup(item.id)}
          >
            <Text style={[{ color: currentTheme.background, textAlign: 'center', fontWeight: 'bold' }]}>
              🍕 Join Group
            </Text>
          </TouchableOpacity>
        )}

        {isOrganizer && (
          <View style={[{ backgroundColor: '#dbeafe', borderRadius: 12, padding: 12 }]}>
            <Text style={[{ color: '#1e40af', textAlign: 'center', fontWeight: 'bold' }]}>
              👑 Your Group
            </Text>
          </View>
        )}

        {hasJoined && !isOrganizer && (
          <View style={[{ backgroundColor: '#dcfce7', borderRadius: 12, padding: 12 }]}>
            <Text style={[{ color: '#166534', textAlign: 'center', fontWeight: 'bold' }]}>
              ✅ You're in this group
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[{ flex: 1, backgroundColor: currentTheme.background }]}>
      {/* Header */}
      <View style={[{ 
        backgroundColor: currentTheme.surface, 
        paddingTop: 56, 
        paddingBottom: 24, 
        paddingHorizontal: 24,
        borderBottomWidth: 1,
        borderBottomColor: currentTheme.border
      }]}>
        <View style={[{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={[{ color: currentTheme.primary, fontSize: 18, fontWeight: '600' }]}>← Back</Text>
          </TouchableOpacity>
        </View>
        <Text style={[{ fontSize: 28, fontWeight: 'bold', color: currentTheme.primary, textAlign: 'center' }]}>
          🍕 Food Groups
        </Text>
        <Text style={[{ color: currentTheme.textSecondary, textAlign: 'center', marginTop: 8 }]}>
          Coordinate group orders to split delivery fees
        </Text>
      </View>

      {/* Benefits Banner */}
      <View style={[{ backgroundColor: '#f0fdf4', padding: 16, margin: 16, borderRadius: 12 }]}>
        <Text style={[{ fontSize: 16, fontWeight: 'bold', color: '#15803d', marginBottom: 8 }]}>
          💰 Why join food groups?
        </Text>
        <Text style={[{ color: '#166534', fontSize: 14 }]}>
          • Split delivery fees with others\n
          • Meet minimum order requirements\n
          • Try new restaurants together\n
          • Make mealtime social
        </Text>
      </View>

      {/* Content */}
      <FlatList
        data={groups}
        renderItem={renderGroup}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        ListEmptyComponent={
          <View style={[{ alignItems: 'center', paddingVertical: 40 }]}>
            <Text style={[{ fontSize: 64, marginBottom: 16 }]}>🍕</Text>
            <Text style={[{ fontSize: 20, fontWeight: 'bold', color: currentTheme.primary, marginBottom: 8 }]}>
              No food groups yet
            </Text>
            <Text style={[{ color: currentTheme.textSecondary, textAlign: 'center' }]}>
              Start a group order and save on delivery fees
            </Text>
          </View>
        }
      />

      {/* Floating Action Button */}
      <TouchableOpacity
        style={[{
          position: 'absolute',
          bottom: 20,
          right: 20,
          backgroundColor: currentTheme.primary,
          borderRadius: 30,
          width: 60,
          height: 60,
          justifyContent: 'center',
          alignItems: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 3.84,
          elevation: 5
        }]}
        onPress={() => setShowCreateModal(true)}
      >
        <Text style={[{ fontSize: 24, color: currentTheme.background }]}>➕</Text>
      </TouchableOpacity>

      {/* Create Group Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent={true}
      >
        <View style={[{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }]}>
          <View style={[{ backgroundColor: currentTheme.surface, borderRadius: 20, padding: 24 }]}>
            <Text style={[{ fontSize: 24, fontWeight: 'bold', color: currentTheme.primary, marginBottom: 20, textAlign: 'center' }]}>
              🍕 Create Food Group
            </Text>

            <TextInput
              style={[{
                backgroundColor: currentTheme.background,
                borderRadius: 12,
                padding: 16,
                marginBottom: 16,
                borderWidth: 1,
                borderColor: currentTheme.border,
                color: currentTheme.text
              }]}
              placeholder="Restaurant name"
              placeholderTextColor={currentTheme.textSecondary}
              value={restaurant}
              onChangeText={setRestaurant}
            />

            <TextInput
              style={[{
                backgroundColor: currentTheme.background,
                borderRadius: 12,
                padding: 16,
                marginBottom: 16,
                borderWidth: 1,
                borderColor: currentTheme.border,
                color: currentTheme.text
              }]}
              placeholder="Order deadline (e.g., 2024-01-20 18:00)"
              placeholderTextColor={currentTheme.textSecondary}
              value={orderDeadline}
              onChangeText={setOrderDeadline}
            />

            <TextInput
              style={[{
                backgroundColor: currentTheme.background,
                borderRadius: 12,
                padding: 16,
                marginBottom: 16,
                borderWidth: 1,
                borderColor: currentTheme.border,
                color: currentTheme.text
              }]}
              placeholder="Delivery location"
              placeholderTextColor={currentTheme.textSecondary}
              value={deliveryLocation}
              onChangeText={setDeliveryLocation}
            />

            <TextInput
              style={[{
                backgroundColor: currentTheme.background,
                borderRadius: 12,
                padding: 16,
                marginBottom: 16,
                borderWidth: 1,
                borderColor: currentTheme.border,
                color: currentTheme.text
              }]}
              placeholder="Minimum order amount (optional)"
              placeholderTextColor={currentTheme.textSecondary}
              value={minOrder}
              onChangeText={setMinOrder}
              keyboardType="numeric"
            />

            <TextInput
              style={[{
                backgroundColor: currentTheme.background,
                borderRadius: 12,
                padding: 16,
                marginBottom: 20,
                borderWidth: 1,
                borderColor: currentTheme.border,
                color: currentTheme.text,
                height: 80,
                textAlignVertical: 'top'
              }]}
              placeholder="Notes (optional)"
              placeholderTextColor={currentTheme.textSecondary}
              value={notes}
              onChangeText={setNotes}
              multiline
            />

            <View style={[{ flexDirection: 'row', gap: 12 }]}>
              <TouchableOpacity
                style={[{ backgroundColor: currentTheme.border, borderRadius: 12, padding: 16, flex: 1 }]}
                onPress={() => setShowCreateModal(false)}
              >
                <Text style={[{ color: currentTheme.text, textAlign: 'center', fontWeight: 'bold' }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[{ backgroundColor: currentTheme.primary, borderRadius: 12, padding: 16, flex: 1 }]}
                onPress={createGroup}
              >
                <Text style={[{ color: currentTheme.background, textAlign: 'center', fontWeight: 'bold' }]}>
                  Create Group
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
} 