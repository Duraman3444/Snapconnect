import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, Alert } from 'react-native';
import { useAuth } from '../context/SupabaseAuthContext';
import { useTheme } from '../context/ThemeContext';

export default function HomeScreen({ navigation }) {
  const [snaps, setSnaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const { currentUser, supabase } = useAuth();
  const { currentTheme } = useTheme();

  useEffect(() => {
    if (!currentUser) return;

    loadSnaps();
    
    // Set up real-time subscription for new snaps
    const subscription = supabase
      .channel('snaps_channel')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'snaps',
        filter: `recipient_id=eq.${currentUser.id}`
      }, (payload) => {
        console.log('Real-time snap update:', payload);
        loadSnaps(); // Reload snaps when there's a change
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [currentUser]);

  const loadSnaps = async () => {
    if (!currentUser?.id) return;

    try {
      // Get snaps sent to current user that haven't expired and haven't been viewed
      const { data: snapsData, error } = await supabase
        .from('snaps')
        .select('*')
        .eq('recipient_id', currentUser.id)
        .eq('viewed', false)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching snaps:', error);
        setLoading(false);
        return;
      }

      setSnaps(snapsData || []);
      setLoading(false);
    } catch (error) {
      console.error('Error loading snaps:', error);
      setLoading(false);
    }
  };

  const viewSnap = async (snap) => {
    try {
      // Mark snap as viewed
      const { error } = await supabase
        .from('snaps')
        .update({ 
          viewed: true,
          viewed_at: new Date().toISOString()
        })
        .eq('id', snap.id);

      if (error) {
        console.error('Error marking snap as viewed:', error);
        Alert.alert('Error', 'Failed to view snap');
        return;
      }
      
      // Navigate to story view
      navigation.navigate('Stories', { snap });
      
      // Reload snaps to remove the viewed one
      loadSnaps();
    } catch (error) {
      Alert.alert('Error', 'Failed to view snap');
      console.error('View snap error:', error);
    }
  };

  const renderSnapItem = ({ item }) => (
    <TouchableOpacity
      style={[{ 
        backgroundColor: currentTheme.surface, 
        borderRadius: 16, 
        marginHorizontal: 16, 
        marginBottom: 16, 
        padding: 20, 
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
        borderWidth: 1, 
        borderColor: currentTheme.border 
      }]}
      onPress={() => viewSnap(item)}
    >
      <View style={[{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }]}>
        <View style={[{ backgroundColor: currentTheme.primary, borderRadius: 28, width: 56, height: 56, justifyContent: 'center', alignItems: 'center', marginRight: 16 }]}>
          <Text style={[{ color: currentTheme.background, fontWeight: 'bold', fontSize: 20 }]}>
            {item.sender_username?.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={[{ flex: 1 }]}>
          <Text style={[{ fontWeight: 'bold', fontSize: 20, color: currentTheme.primary }]}>
            {item.sender_username}
          </Text>
          <Text style={[{ color: currentTheme.textSecondary, fontSize: 14 }]}>
            {new Date(item.created_at).toLocaleTimeString()}
          </Text>
        </View>
        <View style={[{ backgroundColor: '#ef4444', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 }]}>
          <Text style={[{ color: 'white', fontSize: 12, fontWeight: 'bold' }]}>NEW</Text>
        </View>
      </View>
      <View style={[{ backgroundColor: currentTheme.border, borderRadius: 12, height: 160, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={[{ color: currentTheme.primary, fontSize: 32, marginBottom: 8 }]}>📸</Text>
        <Text style={[{ color: currentTheme.primary, fontSize: 18, fontWeight: '600' }]}>Tap to view snap</Text>
        <Text style={[{ color: currentTheme.textSecondary, fontSize: 14, marginTop: 4 }]}>
          Expires: {new Date(item.expires_at).toLocaleString()}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[{ flex: 1, backgroundColor: currentTheme.background }]}>
      {/* Header */}
      <View style={[{ backgroundColor: currentTheme.background, paddingTop: 56, paddingBottom: 24, paddingHorizontal: 24, borderBottomWidth: 1, borderBottomColor: currentTheme.border }]}>
        <View style={[{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }]}>
          <TouchableOpacity onPress={() => navigation.navigate('Camera')}>
            <Text style={[{ color: currentTheme.primary, fontSize: 18, fontWeight: '600' }]}>← Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
            <View style={[{ backgroundColor: currentTheme.primary, borderRadius: 20, padding: 8 }]}>
              <Text style={[{ color: currentTheme.background, fontWeight: 'bold', fontSize: 16 }]}>👤</Text>
            </View>
          </TouchableOpacity>
        </View>
        <View style={[{ alignItems: 'center' }]}>
          <Text style={[{ fontSize: 30, fontWeight: 'bold', color: currentTheme.primary, textAlign: 'center', marginBottom: 8 }]}>💬 Your Snaps</Text>
          <Text style={[{ color: currentTheme.textSecondary, textAlign: 'center' }]}>
            Welcome back, {currentUser?.username || 'Friend'}! 👋
          </Text>
        </View>
      </View>

      {/* Content */}
      {loading ? (
        <View style={[{ flex: 1, justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={[{ fontSize: 32, marginBottom: 16 }]}>⏳</Text>
          <Text style={[{ fontSize: 20, color: currentTheme.primary, fontWeight: '600' }]}>Loading your snaps...</Text>
          <Text style={[{ color: currentTheme.textSecondary, textAlign: 'center', marginTop: 8 }]}>Just a moment!</Text>
        </View>
      ) : snaps.length === 0 ? (
        <View style={[{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }]}>
          <Text style={[{ fontSize: 64, marginBottom: 24 }]}>📭</Text>
          <Text style={[{ fontSize: 24, color: currentTheme.primary, fontWeight: 'bold', textAlign: 'center', marginBottom: 16 }]}>
            No new snaps yet!
          </Text>
          <Text style={[{ color: currentTheme.textSecondary, textAlign: 'center', fontSize: 18, marginBottom: 32, lineHeight: 26 }]}>
            Add friends and start sharing moments to see snaps appear here. Your adventure awaits! ✨
          </Text>
          <TouchableOpacity
            style={[{ backgroundColor: currentTheme.primary, borderRadius: 24, paddingHorizontal: 32, paddingVertical: 16, marginBottom: 16 }]}
            onPress={() => navigation.navigate('Camera')}
          >
            <Text style={[{ color: currentTheme.background, fontWeight: 'bold', fontSize: 18 }]}>📷 Take Your First Snap</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[{ backgroundColor: currentTheme.surface, borderRadius: 24, paddingHorizontal: 32, paddingVertical: 16, borderWidth: 1, borderColor: currentTheme.border }]}
            onPress={() => navigation.navigate('Friends')}
          >
            <Text style={[{ color: currentTheme.primary, fontWeight: '600', fontSize: 18 }]}>👥 Find Friends</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={snaps}
          renderItem={renderSnapItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingTop: 20, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          onRefresh={loadSnaps}
          refreshing={loading}
        />
      )}

      {/* Bottom Navigation */}
      <View style={[{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: currentTheme.surface, borderTopWidth: 1, borderTopColor: currentTheme.border, shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 10 }]}>
        <View style={[{ flexDirection: 'row', justifyContent: 'around', paddingVertical: 16 }]}>
          <TouchableOpacity
            onPress={() => navigation.navigate('Friends')}
            style={[{ alignItems: 'center', flex: 1 }]}
          >
            <Text style={[{ fontSize: 24, marginBottom: 4 }]}>👥</Text>
            <Text style={[{ fontSize: 12, color: currentTheme.primary, fontWeight: '600' }]}>Friends</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={() => navigation.navigate('Camera')}
            style={[{ alignItems: 'center', flex: 1 }]}
          >
            <Text style={[{ fontSize: 24, marginBottom: 4 }]}>📷</Text>
            <Text style={[{ fontSize: 12, color: currentTheme.primary, fontWeight: '600' }]}>Camera</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={() => navigation.navigate('Stories')}
            style={[{ alignItems: 'center', flex: 1 }]}
          >
            <Text style={[{ fontSize: 24, marginBottom: 4 }]}>📖</Text>
            <Text style={[{ fontSize: 12, color: currentTheme.primary, fontWeight: '600' }]}>Stories</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('Profile')}
            style={[{ alignItems: 'center', flex: 1 }]}
          >
            <Text style={[{ fontSize: 24, marginBottom: 4 }]}>👤</Text>
            <Text style={[{ fontSize: 12, color: currentTheme.primary, fontWeight: '600' }]}>Profile</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
} 