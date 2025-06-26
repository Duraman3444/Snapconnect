import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, Alert, TextInput, Modal } from 'react-native';
import { useAuth } from '../context/SupabaseAuthContext';
import { useTheme } from '../context/ThemeContext';

export default function RideSharingScreen({ navigation }) {
  const { currentUser, supabase } = useAuth();
  const { currentTheme } = useTheme();
  const [rides, setRides] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [destination, setDestination] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [maxPassengers, setMaxPassengers] = useState('3');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadRides();
  }, []);

  const loadRides = async () => {
    try {
      const { data, error } = await supabase
        .from('ride_sharing')
        .select(`
          *,
          driver:profiles!ride_sharing_driver_id_fkey(username),
          passengers:ride_passengers(
            passenger:profiles!ride_passengers_passenger_id_fkey(username)
          )
        `)
        .gte('departure_time', new Date().toISOString())
        .order('departure_time', { ascending: true });

      if (error) throw error;
      setRides(data || []);
    } catch (error) {
      console.error('Error loading rides:', error);
    }
  };

  const createRide = async () => {
    if (!destination || !departureTime) {
      Alert.alert('Error', 'Please fill in destination and departure time');
      return;
    }

    try {
      const { error } = await supabase
        .from('ride_sharing')
        .insert({
          driver_id: currentUser.id,
          destination,
          departure_time: departureTime,
          max_passengers: parseInt(maxPassengers),
          notes,
          status: 'open'
        });

      if (error) throw error;

      setShowCreateModal(false);
      setDestination('');
      setDepartureTime('');
      setMaxPassengers('3');
      setNotes('');
      loadRides();
      Alert.alert('Success', 'Ride created! 🚗');
    } catch (error) {
      Alert.alert('Error', 'Failed to create ride');
    }
  };

  const joinRide = async (rideId) => {
    try {
      const { error } = await supabase
        .from('ride_passengers')
        .insert({
          ride_id: rideId,
          passenger_id: currentUser.id
        });

      if (error) throw error;
      loadRides();
      Alert.alert('Success', 'You joined the ride! 🎉');
    } catch (error) {
      Alert.alert('Error', 'Failed to join ride');
    }
  };

  const renderRide = ({ item }) => {
    const isDriver = item.driver_id === currentUser.id;
    const hasJoined = item.passengers?.some(p => p.passenger.id === currentUser.id);
    const passengerCount = item.passengers?.length || 0;
    const isFull = passengerCount >= item.max_passengers;

    return (
      <View style={[{
        backgroundColor: currentTheme.surface,
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: currentTheme.border
      }]}>
        <View style={[{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }]}>
          <Text style={[{ fontSize: 24, marginRight: 12 }]}>🚗</Text>
          <View style={[{ flex: 1 }]}>
            <Text style={[{ fontSize: 18, fontWeight: 'bold', color: currentTheme.primary }]}>
              To: {item.destination}
            </Text>
            <Text style={[{ color: currentTheme.textSecondary, fontSize: 14 }]}>
              Driver: {item.driver?.username || 'Unknown'}
            </Text>
          </View>
          <View style={[{ alignItems: 'flex-end' }]}>
            <Text style={[{ color: currentTheme.primary, fontWeight: 'bold' }]}>
              {passengerCount}/{item.max_passengers}
            </Text>
            <Text style={[{ color: currentTheme.textSecondary, fontSize: 12 }]}>
              {isFull ? 'FULL' : 'OPEN'}
            </Text>
          </View>
        </View>

        <View style={[{ marginBottom: 16 }]}>
          <Text style={[{ color: currentTheme.textSecondary, fontSize: 14, marginBottom: 4 }]}>
            🕐 Departure: {new Date(item.departure_time).toLocaleString()}
          </Text>
          {item.notes && (
            <Text style={[{ color: currentTheme.textSecondary, fontSize: 14 }]}>
              📝 {item.notes}
            </Text>
          )}
        </View>

        {item.passengers?.length > 0 && (
          <View style={[{ marginBottom: 16 }]}>
            <Text style={[{ color: currentTheme.primary, fontWeight: 'bold', marginBottom: 8 }]}>
              Passengers:
            </Text>
            {item.passengers.map((passenger, index) => (
              <Text key={index} style={[{ color: currentTheme.textSecondary, fontSize: 14 }]}>
                • {passenger.passenger.username}
              </Text>
            ))}
          </View>
        )}

        {!isDriver && !hasJoined && !isFull && (
          <TouchableOpacity
            style={[{ backgroundColor: currentTheme.primary, borderRadius: 12, padding: 12 }]}
            onPress={() => joinRide(item.id)}
          >
            <Text style={[{ color: currentTheme.background, textAlign: 'center', fontWeight: 'bold' }]}>
              🚗 Join Ride
            </Text>
          </TouchableOpacity>
        )}

        {isDriver && (
          <View style={[{ backgroundColor: '#dbeafe', borderRadius: 12, padding: 12 }]}>
            <Text style={[{ color: '#1e40af', textAlign: 'center', fontWeight: 'bold' }]}>
              👑 Your Ride
            </Text>
          </View>
        )}

        {hasJoined && !isDriver && (
          <View style={[{ backgroundColor: '#dcfce7', borderRadius: 12, padding: 12 }]}>
            <Text style={[{ color: '#166534', textAlign: 'center', fontWeight: 'bold' }]}>
              ✅ You're in this ride
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
          🚗 Campus Rides
        </Text>
        <Text style={[{ color: currentTheme.textSecondary, textAlign: 'center', marginTop: 8 }]}>
          Coordinate rides for events and activities
        </Text>
      </View>

      {/* Content */}
      <FlatList
        data={rides}
        renderItem={renderRide}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        ListEmptyComponent={
          <View style={[{ alignItems: 'center', paddingVertical: 40 }]}>
            <Text style={[{ fontSize: 64, marginBottom: 16 }]}>🚗</Text>
            <Text style={[{ fontSize: 20, fontWeight: 'bold', color: currentTheme.primary, marginBottom: 8 }]}>
              No rides available
            </Text>
            <Text style={[{ color: currentTheme.textSecondary, textAlign: 'center' }]}>
              Be the first to offer or request a ride
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

      {/* Create Ride Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent={true}
      >
        <View style={[{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }]}>
          <View style={[{ backgroundColor: currentTheme.surface, borderRadius: 20, padding: 24 }]}>
            <Text style={[{ fontSize: 24, fontWeight: 'bold', color: currentTheme.primary, marginBottom: 20, textAlign: 'center' }]}>
              🚗 Offer a Ride
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
              placeholder="Destination (e.g., Downtown Mall)"
              placeholderTextColor={currentTheme.textSecondary}
              value={destination}
              onChangeText={setDestination}
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
              placeholder="Departure time (e.g., 2024-01-20 19:00)"
              placeholderTextColor={currentTheme.textSecondary}
              value={departureTime}
              onChangeText={setDepartureTime}
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
              placeholder="Max passengers"
              placeholderTextColor={currentTheme.textSecondary}
              value={maxPassengers}
              onChangeText={setMaxPassengers}
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
                onPress={createRide}
              >
                <Text style={[{ color: currentTheme.background, textAlign: 'center', fontWeight: 'bold' }]}>
                  Create Ride
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
} 