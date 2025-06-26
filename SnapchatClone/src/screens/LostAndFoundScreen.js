import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, Alert, TextInput, Modal } from 'react-native';
import { useAuth } from '../context/SupabaseAuthContext';
import { useTheme } from '../context/ThemeContext';

export default function LostAndFoundScreen({ navigation }) {
  const { currentUser, supabase } = useAuth();
  const { currentTheme } = useTheme();
  const [items, setItems] = useState([]);
  const [showReportModal, setShowReportModal] = useState(false);
  const [isLostItem, setIsLostItem] = useState(true);
  const [itemName, setItemName] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState('electronics');

  const categories = [
    { value: 'electronics', label: '📱 Electronics' },
    { value: 'clothing', label: '👕 Clothing' },
    { value: 'books', label: '📚 Books' },
    { value: 'keys', label: '🔑 Keys' },
    { value: 'accessories', label: '💍 Accessories' },
    { value: 'other', label: '🎒 Other' }
  ];

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    try {
      const { data, error } = await supabase
        .from('lost_and_found')
        .select(`
          *,
          reporter:profiles!lost_and_found_reporter_id_fkey(username)
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Error loading items:', error);
    }
  };

  const reportItem = async () => {
    if (!itemName || !description || !location) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      const { error } = await supabase
        .from('lost_and_found')
        .insert({
          reporter_id: currentUser.id,
          item_name: itemName,
          description,
          location,
          category,
          type: isLostItem ? 'lost' : 'found',
          status: 'active'
        });

      if (error) throw error;

      setShowReportModal(false);
      setItemName('');
      setDescription('');
      setLocation('');
      setCategory('electronics');
      loadItems();
      Alert.alert('Success', `Item ${isLostItem ? 'lost' : 'found'} report submitted! 📋`);
    } catch (error) {
      Alert.alert('Error', 'Failed to report item');
    }
  };

  const markAsResolved = async (itemId) => {
    try {
      const { error } = await supabase
        .from('lost_and_found')
        .update({ status: 'resolved' })
        .eq('id', itemId);

      if (error) throw error;
      loadItems();
      Alert.alert('Great!', 'Item marked as resolved! 🎉');
    } catch (error) {
      Alert.alert('Error', 'Failed to update item');
    }
  };

  const renderItem = ({ item }) => {
    const isMyItem = item.reporter_id === currentUser.id;
    const categoryInfo = categories.find(c => c.value === item.category);

    return (
      <View style={[{
        backgroundColor: currentTheme.surface,
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: item.type === 'lost' ? '#f59e0b' : '#10b981'
      }]}>
        <View style={[{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }]}>
          <Text style={[{ fontSize: 24, marginRight: 12 }]}>
            {item.type === 'lost' ? '❌' : '✅'}
          </Text>
          <View style={[{ flex: 1 }]}>
            <Text style={[{ fontSize: 18, fontWeight: 'bold', color: currentTheme.primary }]}>
              {item.item_name}
            </Text>
            <Text style={[{ color: currentTheme.textSecondary, fontSize: 14 }]}>
              {item.type === 'lost' ? 'Lost' : 'Found'} by: {item.reporter?.username || 'Unknown'}
            </Text>
          </View>
          <View style={[{ alignItems: 'flex-end' }]}>
            <Text style={[{ fontSize: 16 }]}>
              {categoryInfo?.label || '🎒 Other'}
            </Text>
            <View style={[{ 
              backgroundColor: item.type === 'lost' ? '#fef3c7' : '#dcfce7',
              borderRadius: 8,
              paddingHorizontal: 8,
              paddingVertical: 4,
              marginTop: 4
            }]}>
              <Text style={[{ 
                fontSize: 12, 
                fontWeight: 'bold',
                color: item.type === 'lost' ? '#d97706' : '#166534'
              }]}>
                {item.type.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        <Text style={[{ color: currentTheme.text, fontSize: 16, marginBottom: 12 }]}>
          {item.description}
        </Text>

        <View style={[{ marginBottom: 16 }]}>
          <Text style={[{ color: currentTheme.textSecondary, fontSize: 14, marginBottom: 4 }]}>
            📍 Location: {item.location}
          </Text>
          <Text style={[{ color: currentTheme.textSecondary, fontSize: 14 }]}>
            📅 Reported: {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>

        <View style={[{ flexDirection: 'row', gap: 12 }]}>
          {!isMyItem && (
            <TouchableOpacity
              style={[{ backgroundColor: currentTheme.primary, borderRadius: 12, padding: 12, flex: 1 }]}
              onPress={() => Alert.alert('Contact', 'In a real app, this would open messaging with the reporter')}
            >
              <Text style={[{ color: currentTheme.background, textAlign: 'center', fontWeight: 'bold' }]}>
                💬 Contact
              </Text>
            </TouchableOpacity>
          )}
          
          {isMyItem && (
            <TouchableOpacity
              style={[{ backgroundColor: '#10b981', borderRadius: 12, padding: 12, flex: 1 }]}
              onPress={() => markAsResolved(item.id)}
            >
              <Text style={[{ color: 'white', textAlign: 'center', fontWeight: 'bold' }]}>
                ✅ Mark Resolved
              </Text>
            </TouchableOpacity>
          )}
        </View>
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
          🔍 Lost & Found
        </Text>
        <Text style={[{ color: currentTheme.textSecondary, textAlign: 'center', marginTop: 8 }]}>
          Campus-wide lost item reporting and finding
        </Text>
      </View>

      {/* Stats Banner */}
      <View style={[{ flexDirection: 'row', padding: 16, gap: 16 }]}>
        <View style={[{ backgroundColor: '#fef3c7', borderRadius: 12, padding: 16, flex: 1 }]}>
          <Text style={[{ fontSize: 24, textAlign: 'center', marginBottom: 8 }]}>❌</Text>
          <Text style={[{ color: '#d97706', fontWeight: 'bold', textAlign: 'center' }]}>
            {items.filter(i => i.type === 'lost').length} Lost
          </Text>
        </View>
        <View style={[{ backgroundColor: '#dcfce7', borderRadius: 12, padding: 16, flex: 1 }]}>
          <Text style={[{ fontSize: 24, textAlign: 'center', marginBottom: 8 }]}>✅</Text>
          <Text style={[{ color: '#166534', fontWeight: 'bold', textAlign: 'center' }]}>
            {items.filter(i => i.type === 'found').length} Found
          </Text>
        </View>
      </View>

      {/* Content */}
      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        ListEmptyComponent={
          <View style={[{ alignItems: 'center', paddingVertical: 40 }]}>
            <Text style={[{ fontSize: 64, marginBottom: 16 }]}>🔍</Text>
            <Text style={[{ fontSize: 20, fontWeight: 'bold', color: currentTheme.primary, marginBottom: 8 }]}>
              No items reported yet
            </Text>
            <Text style={[{ color: currentTheme.textSecondary, textAlign: 'center' }]}>
              Be the first to report a lost or found item
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
        onPress={() => setShowReportModal(true)}
      >
        <Text style={[{ fontSize: 24, color: currentTheme.background }]}>➕</Text>
      </TouchableOpacity>

      {/* Report Item Modal */}
      <Modal
        visible={showReportModal}
        animationType="slide"
        transparent={true}
      >
        <View style={[{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }]}>
          <View style={[{ backgroundColor: currentTheme.surface, borderRadius: 20, padding: 24 }]}>
            <Text style={[{ fontSize: 24, fontWeight: 'bold', color: currentTheme.primary, marginBottom: 20, textAlign: 'center' }]}>
              📋 Report Item
            </Text>

            {/* Lost/Found Toggle */}
            <View style={[{ flexDirection: 'row', marginBottom: 20, backgroundColor: currentTheme.background, borderRadius: 8 }]}>
              <TouchableOpacity
                style={[{ 
                  flex: 1, 
                  padding: 12, 
                  backgroundColor: isLostItem ? '#f59e0b' : 'transparent',
                  borderRadius: 8
                }]}
                onPress={() => setIsLostItem(true)}
              >
                <Text style={[{ 
                  textAlign: 'center', 
                  fontWeight: 'bold',
                  color: isLostItem ? 'white' : currentTheme.text
                }]}>
                  ❌ Lost Item
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[{ 
                  flex: 1, 
                  padding: 12, 
                  backgroundColor: !isLostItem ? '#10b981' : 'transparent',
                  borderRadius: 8
                }]}
                onPress={() => setIsLostItem(false)}
              >
                <Text style={[{ 
                  textAlign: 'center', 
                  fontWeight: 'bold',
                  color: !isLostItem ? 'white' : currentTheme.text
                }]}>
                  ✅ Found Item
                </Text>
              </TouchableOpacity>
            </View>

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
              placeholder="Item name"
              placeholderTextColor={currentTheme.textSecondary}
              value={itemName}
              onChangeText={setItemName}
            />

            <TextInput
              style={[{
                backgroundColor: currentTheme.background,
                borderRadius: 12,
                padding: 16,
                marginBottom: 16,
                borderWidth: 1,
                borderColor: currentTheme.border,
                color: currentTheme.text,
                height: 80,
                textAlignVertical: 'top'
              }]}
              placeholder="Description"
              placeholderTextColor={currentTheme.textSecondary}
              value={description}
              onChangeText={setDescription}
              multiline
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
              placeholder="Location where lost/found"
              placeholderTextColor={currentTheme.textSecondary}
              value={location}
              onChangeText={setLocation}
            />

            {/* Category Picker */}
            <Text style={[{ color: currentTheme.text, fontWeight: 'bold', marginBottom: 12 }]}>
              Category:
            </Text>
            <View style={[{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }]}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.value}
                  style={[{
                    backgroundColor: category === cat.value ? currentTheme.primary : currentTheme.background,
                    borderRadius: 20,
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderWidth: 1,
                    borderColor: currentTheme.border
                  }]}
                  onPress={() => setCategory(cat.value)}
                >
                  <Text style={[{
                    color: category === cat.value ? currentTheme.background : currentTheme.text,
                    fontSize: 14,
                    fontWeight: category === cat.value ? 'bold' : 'normal'
                  }]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={[{ flexDirection: 'row', gap: 12 }]}>
              <TouchableOpacity
                style={[{ backgroundColor: currentTheme.border, borderRadius: 12, padding: 16, flex: 1 }]}
                onPress={() => setShowReportModal(false)}
              >
                <Text style={[{ color: currentTheme.text, textAlign: 'center', fontWeight: 'bold' }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[{ backgroundColor: currentTheme.primary, borderRadius: 12, padding: 16, flex: 1 }]}
                onPress={reportItem}
              >
                <Text style={[{ color: currentTheme.background, textAlign: 'center', fontWeight: 'bold' }]}>
                  Report Item
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
} 