import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, Alert, TextInput, Modal } from 'react-native';
import { useAuth } from '../context/SupabaseAuthContext';
import { useTheme } from '../context/ThemeContext';

export default function PartySafetyScreen({ navigation }) {
  const { currentUser, supabase } = useAuth();
  const { currentTheme } = useTheme();
  const [checkIns, setCheckIns] = useState([]);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [eventName, setEventName] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');

  useEffect(() => {
    loadCheckIns();
  }, []);

  const loadCheckIns = async () => {
    try {
      const { data, error } = await supabase
        .from('party_safety_checkins')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCheckIns(data || []);
    } catch (error) {
      console.error('Error loading check-ins:', error);
    }
  };

  const createCheckIn = async () => {
    if (!eventName || !eventLocation) {
      Alert.alert('Error', 'Please fill in event name and location');
      return;
    }

    try {
      const { error } = await supabase
        .from('party_safety_checkins')
        .insert({
          user_id: currentUser.id,
          event_name: eventName,
          location: eventLocation,
          emergency_contact: emergencyContact,
          status: 'active'
        });

      if (error) throw error;

      setShowCheckInModal(false);
      setEventName('');
      setEventLocation('');
      setEmergencyContact('');
      loadCheckIns();
      Alert.alert('Success', 'Check-in created! Stay safe! 🛡️');
    } catch (error) {
      Alert.alert('Error', 'Failed to create check-in');
    }
  };

  const updateCheckInStatus = async (checkInId, status) => {
    try {
      const { error } = await supabase
        .from('party_safety_checkins')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', checkInId);

      if (error) throw error;
      loadCheckIns();

      if (status === 'safe') {
        Alert.alert('Great!', 'Glad you\'re safe! 🎉');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update status');
    }
  };

  const renderCheckIn = ({ item }) => (
    <View style={[{
      backgroundColor: currentTheme.surface,
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: item.status === 'active' ? '#f59e0b' : item.status === 'safe' ? '#10b981' : currentTheme.border
    }]}>
      <View style={[{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }]}>
        <Text style={[{ fontSize: 24, marginRight: 12 }]}>
          {item.status === 'active' ? '🟡' : item.status === 'safe' ? '🟢' : '⚪'}
        </Text>
        <View style={[{ flex: 1 }]}>
          <Text style={[{ fontSize: 18, fontWeight: 'bold', color: currentTheme.primary }]}>
            {item.event_name}
          </Text>
          <Text style={[{ color: currentTheme.textSecondary, fontSize: 14 }]}>
            📍 {item.location}
          </Text>
        </View>
      </View>

      <Text style={[{ color: currentTheme.textSecondary, fontSize: 14, marginBottom: 16 }]}>
        Check-in: {new Date(item.created_at).toLocaleString()}
      </Text>

      {item.status === 'active' && (
        <View style={[{ flexDirection: 'row', gap: 12 }]}>
          <TouchableOpacity
            style={[{ backgroundColor: '#10b981', borderRadius: 12, padding: 12, flex: 1 }]}
            onPress={() => updateCheckInStatus(item.id, 'safe')}
          >
            <Text style={[{ color: 'white', textAlign: 'center', fontWeight: 'bold' }]}>
              ✅ I'm Safe
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[{ backgroundColor: '#ef4444', borderRadius: 12, padding: 12, flex: 1 }]}
            onPress={() => Alert.alert('Emergency', 'Emergency services would be contacted in a real app')}
          >
            <Text style={[{ color: 'white', textAlign: 'center', fontWeight: 'bold' }]}>
              🚨 Emergency
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

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
          🛡️ Party Safety
        </Text>
        <Text style={[{ color: currentTheme.textSecondary, textAlign: 'center', marginTop: 8 }]}>
          Check-in features for safe nights out
        </Text>
      </View>

      {/* Safety Tips */}
      <View style={[{ backgroundColor: '#fef3c7', padding: 16, margin: 16, borderRadius: 12 }]}>
        <Text style={[{ fontSize: 16, fontWeight: 'bold', color: '#d97706', marginBottom: 8 }]}>
          🚨 Safety Tips
        </Text>
        <Text style={[{ color: '#92400e', fontSize: 14 }]}>
          • Tell friends where you're going\n
          • Set check-in reminders\n
          • Never leave drinks unattended\n
          • Have a safe ride home planned
        </Text>
      </View>

      {/* Content */}
      <FlatList
        data={checkIns}
        renderItem={renderCheckIn}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        ListEmptyComponent={
          <View style={[{ alignItems: 'center', paddingVertical: 40 }]}>
            <Text style={[{ fontSize: 64, marginBottom: 16 }]}>🛡️</Text>
            <Text style={[{ fontSize: 20, fontWeight: 'bold', color: currentTheme.primary, marginBottom: 8 }]}>
              No check-ins yet
            </Text>
            <Text style={[{ color: currentTheme.textSecondary, textAlign: 'center' }]}>
              Create your first safety check-in when heading out
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
        onPress={() => setShowCheckInModal(true)}
      >
        <Text style={[{ fontSize: 24, color: currentTheme.background }]}>➕</Text>
      </TouchableOpacity>

      {/* Check-in Modal */}
      <Modal
        visible={showCheckInModal}
        animationType="slide"
        transparent={true}
      >
        <View style={[{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }]}>
          <View style={[{ backgroundColor: currentTheme.surface, borderRadius: 20, padding: 24 }]}>
            <Text style={[{ fontSize: 24, fontWeight: 'bold', color: currentTheme.primary, marginBottom: 20, textAlign: 'center' }]}>
              🛡️ Create Safety Check-in
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
              placeholder="Event name (e.g., Sarah's Party)"
              placeholderTextColor={currentTheme.textSecondary}
              value={eventName}
              onChangeText={setEventName}
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
              placeholder="Location"
              placeholderTextColor={currentTheme.textSecondary}
              value={eventLocation}
              onChangeText={setEventLocation}
            />

            <TextInput
              style={[{
                backgroundColor: currentTheme.background,
                borderRadius: 12,
                padding: 16,
                marginBottom: 20,
                borderWidth: 1,
                borderColor: currentTheme.border,
                color: currentTheme.text
              }]}
              placeholder="Emergency contact (optional)"
              placeholderTextColor={currentTheme.textSecondary}
              value={emergencyContact}
              onChangeText={setEmergencyContact}
            />

            <View style={[{ flexDirection: 'row', gap: 12 }]}>
              <TouchableOpacity
                style={[{ backgroundColor: currentTheme.border, borderRadius: 12, padding: 16, flex: 1 }]}
                onPress={() => setShowCheckInModal(false)}
              >
                <Text style={[{ color: currentTheme.text, textAlign: 'center', fontWeight: 'bold' }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[{ backgroundColor: currentTheme.primary, borderRadius: 12, padding: 16, flex: 1 }]}
                onPress={createCheckIn}
              >
                <Text style={[{ color: currentTheme.background, textAlign: 'center', fontWeight: 'bold' }]}>
                  Check In
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
} 