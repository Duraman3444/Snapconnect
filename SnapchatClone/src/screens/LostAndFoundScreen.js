import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, Alert, TextInput, Modal, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/SupabaseAuthContext';
import { useTheme } from '../context/ThemeContext';
import ragService from '../services/ragService';
import userProfileService from '../services/userProfileService';

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
  const [loadingAI, setLoadingAI] = useState(false);
  const [aiEnhancement, setAiEnhancement] = useState(null);

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
      // Mock data for demonstration
      setItems([
        {
          id: '1',
          reporter_id: 'user1',
          item_name: 'iPhone 13',
          description: 'Blue iPhone 13 with cracked screen protector',
          location: 'Library Study Room 3',
          category: 'electronics',
          type: 'lost',
          status: 'active',
          created_at: '2024-01-15T10:00:00Z',
          reporter: { username: 'student123' }
        },
        {
          id: '2',
          reporter_id: 'user2',
          item_name: 'Math Textbook',
          description: 'Calculus textbook with yellow highlighter marks',
          location: 'Engineering Building',
          category: 'books',
          type: 'found',
          status: 'active',
          created_at: '2024-01-14T15:30:00Z',
          reporter: { username: 'helper456' }
        }
      ]);
    }
  };

  // AI-Enhanced Item Description
  const generateAIDescription = async () => {
    if (!itemName || !description || !location) {
      Alert.alert('Missing Information', 'Please fill in item name, description, and location before using AI enhancement.');
      return;
    }

    setLoadingAI(true);
    try {
      const itemDetails = {
        name: itemName,
        category: category,
        description: description,
        location: location,
        timeLost: isLostItem ? 'Recently' : 'N/A'
      };

      const enhancement = await ragService.generateLostItemDescription(itemDetails);
      
      if (enhancement) {
        setAiEnhancement(enhancement);
        Alert.alert(
          '🤖 AI Enhancement Ready',
          'AI has generated an enhanced description and recovery tips. Review the suggestions below.',
          [{ text: 'Review', onPress: () => {} }]
        );

        // Track AI usage
        await userProfileService.trackActivity(currentUser.id, {
          type: 'ai_lost_found_enhancement',
          category: category,
          success: true
        });
      }
    } catch (error) {
      console.error('Error generating AI description:', error);
      Alert.alert('AI Error', 'Unable to enhance description at this time.');
    } finally {
      setLoadingAI(false);
    }
  };

  const reportItem = async () => {
    if (!itemName || !description || !location) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      // Use AI-enhanced description if available
      const finalDescription = aiEnhancement?.enhancedDescription || description;
      
      const { error } = await supabase
        .from('lost_and_found')
        .insert({
          reporter_id: currentUser.id,
          item_name: itemName,
          description: finalDescription,
          location,
          category,
          type: isLostItem ? 'lost' : 'found',
          status: 'active',
          ai_enhanced: aiEnhancement !== null
        });

      if (error) throw error;

      setShowReportModal(false);
      resetForm();
      loadItems();
      
      Alert.alert(
        'Success', 
        `Item ${isLostItem ? 'lost' : 'found'} report submitted! ${aiEnhancement ? '🤖 Enhanced with AI suggestions.' : '📋'}`
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to report item');
    }
  };

  const resetForm = () => {
    setItemName('');
    setDescription('');
    setLocation('');
    setCategory('electronics');
    setAiEnhancement(null);
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
              {item.ai_enhanced && ' 🤖'}
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
          AI-powered item recovery system
        </Text>
      </View>

      {/* Items List */}
      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 20 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={[{ alignItems: 'center', paddingVertical: 40 }]}>
            <Text style={[{ fontSize: 48, marginBottom: 16 }]}>🔍</Text>
            <Text style={[{ fontSize: 18, fontWeight: 'bold', color: currentTheme.primary, marginBottom: 8 }]}>
              No Items Reported
            </Text>
            <Text style={[{ color: currentTheme.textSecondary, textAlign: 'center' }]}>
              Be the first to report a lost or found item!
            </Text>
          </View>
        }
      />

      {/* Floating Action Button */}
      <TouchableOpacity
        style={[{
          position: 'absolute',
          bottom: 30,
          right: 30,
          backgroundColor: currentTheme.primary,
          borderRadius: 30,
          width: 60,
          height: 60,
          justifyContent: 'center',
          alignItems: 'center',
          elevation: 5,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 3.84,
        }]}
        onPress={() => setShowReportModal(true)}
      >
        <Text style={[{ color: currentTheme.background, fontSize: 24, fontWeight: 'bold' }]}>
          +
        </Text>
      </TouchableOpacity>

      {/* Report Item Modal */}
      <Modal
        visible={showReportModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={[{ flex: 1, backgroundColor: currentTheme.background }]}>
          <View style={[{
            backgroundColor: currentTheme.surface,
            paddingTop: 20,
            paddingBottom: 16,
            paddingHorizontal: 20,
            borderBottomWidth: 1,
            borderBottomColor: currentTheme.border
          }]}>
            <View style={[{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }]}>
              <TouchableOpacity onPress={() => { setShowReportModal(false); resetForm(); }}>
                <Text style={[{ color: currentTheme.primary, fontSize: 16, fontWeight: '600' }]}>Cancel</Text>
              </TouchableOpacity>
              <Text style={[{ fontSize: 18, fontWeight: 'bold', color: currentTheme.primary }]}>
                Report Item
              </Text>
              <TouchableOpacity onPress={reportItem}>
                <Text style={[{ color: currentTheme.primary, fontSize: 16, fontWeight: '600' }]}>Done</Text>
              </TouchableOpacity>
            </View>

            {/* Lost/Found Toggle */}
            <View style={[{ flexDirection: 'row', backgroundColor: currentTheme.background, borderRadius: 12, padding: 4 }]}>
              <TouchableOpacity
                style={[{
                  flex: 1,
                  backgroundColor: isLostItem ? '#f59e0b' : 'transparent',
                  borderRadius: 8,
                  padding: 12,
                  alignItems: 'center'
                }]}
                onPress={() => setIsLostItem(true)}
              >
                <Text style={[{ color: isLostItem ? 'white' : currentTheme.textSecondary, fontWeight: 'bold' }]}>
                  ❌ Lost Item
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[{
                  flex: 1,
                  backgroundColor: !isLostItem ? '#10b981' : 'transparent',
                  borderRadius: 8,
                  padding: 12,
                  alignItems: 'center'
                }]}
                onPress={() => setIsLostItem(false)}
              >
                <Text style={[{ color: !isLostItem ? 'white' : currentTheme.textSecondary, fontWeight: 'bold' }]}>
                  ✅ Found Item
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Form */}
          <View style={[{ flex: 1, padding: 20 }]}>
            {/* Item Name */}
            <View style={[{ marginBottom: 20 }]}>
              <Text style={[{ color: currentTheme.text, fontSize: 16, fontWeight: 'bold', marginBottom: 8 }]}>
                Item Name *
              </Text>
              <TextInput
                style={[{
                  backgroundColor: currentTheme.surface,
                  borderRadius: 12,
                  padding: 16,
                  fontSize: 16,
                  color: currentTheme.text,
                  borderWidth: 1,
                  borderColor: currentTheme.border
                }]}
                placeholder="e.g., iPhone 13, Math Textbook"
                placeholderTextColor={currentTheme.textSecondary}
                value={itemName}
                onChangeText={setItemName}
              />
            </View>

            {/* Category */}
            <View style={[{ marginBottom: 20 }]}>
              <Text style={[{ color: currentTheme.text, fontSize: 16, fontWeight: 'bold', marginBottom: 8 }]}>
                Category *
              </Text>
              <View style={[{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }]}>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat.value}
                    style={[{
                      backgroundColor: category === cat.value ? currentTheme.primary : currentTheme.surface,
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
                      fontWeight: '600'
                    }]}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Description */}
            <View style={[{ marginBottom: 20 }]}>
              <Text style={[{ color: currentTheme.text, fontSize: 16, fontWeight: 'bold', marginBottom: 8 }]}>
                Description *
              </Text>
              <TextInput
                style={[{
                  backgroundColor: currentTheme.surface,
                  borderRadius: 12,
                  padding: 16,
                  fontSize: 16,
                  color: currentTheme.text,
                  borderWidth: 1,
                  borderColor: currentTheme.border,
                  height: 100,
                  textAlignVertical: 'top'
                }]}
                placeholder="Describe the item in detail (color, size, condition, etc.)"
                placeholderTextColor={currentTheme.textSecondary}
                value={description}
                onChangeText={setDescription}
                multiline
              />
            </View>

            {/* Location */}
            <View style={[{ marginBottom: 20 }]}>
              <Text style={[{ color: currentTheme.text, fontSize: 16, fontWeight: 'bold', marginBottom: 8 }]}>
                Location *
              </Text>
              <TextInput
                style={[{
                  backgroundColor: currentTheme.surface,
                  borderRadius: 12,
                  padding: 16,
                  fontSize: 16,
                  color: currentTheme.text,
                  borderWidth: 1,
                  borderColor: currentTheme.border
                }]}
                placeholder="Where was it lost/found?"
                placeholderTextColor={currentTheme.textSecondary}
                value={location}
                onChangeText={setLocation}
              />
            </View>

            {/* AI Enhancement Button */}
            <TouchableOpacity
              style={[{
                backgroundColor: '#6366f1',
                borderRadius: 12,
                padding: 16,
                alignItems: 'center',
                marginBottom: 20,
                opacity: loadingAI ? 0.6 : 1
              }]}
              onPress={generateAIDescription}
              disabled={loadingAI}
            >
              {loadingAI ? (
                <>
                  <ActivityIndicator size="small" color="white" />
                  <Text style={[{ color: 'white', fontWeight: 'bold', marginTop: 8 }]}>
                    Generating AI Enhancement...
                  </Text>
                </>
              ) : (
                <Text style={[{ color: 'white', fontSize: 16, fontWeight: 'bold' }]}>
                  🤖 Enhance with AI
                </Text>
              )}
            </TouchableOpacity>

            {/* AI Enhancement Results */}
            {aiEnhancement && (
              <View style={[{ backgroundColor: currentTheme.surface, borderRadius: 12, padding: 16, marginBottom: 20 }]}>
                <Text style={[{ fontSize: 16, fontWeight: 'bold', color: currentTheme.primary, marginBottom: 12 }]}>
                  🤖 AI Enhancement Results
                </Text>
                
                {aiEnhancement.enhancedDescription && (
                  <View style={[{ marginBottom: 16 }]}>
                    <Text style={[{ fontWeight: 'bold', color: currentTheme.text, marginBottom: 4 }]}>
                      Enhanced Description:
                    </Text>
                    <Text style={[{ color: currentTheme.text, fontSize: 14 }]}>
                      {aiEnhancement.enhancedDescription}
                    </Text>
                  </View>
                )}

                {aiEnhancement.searchSuggestions && (
                  <View style={[{ marginBottom: 16 }]}>
                    <Text style={[{ fontWeight: 'bold', color: currentTheme.text, marginBottom: 4 }]}>
                      Suggested Search Locations:
                    </Text>
                    {aiEnhancement.searchSuggestions.map((location, index) => (
                      <Text key={index} style={[{ color: currentTheme.text, fontSize: 14, marginLeft: 8 }]}>
                        • {location}
                      </Text>
                    ))}
                  </View>
                )}

                {aiEnhancement.recoverTips && (
                  <View>
                    <Text style={[{ fontWeight: 'bold', color: currentTheme.text, marginBottom: 4 }]}>
                      Recovery Tips:
                    </Text>
                    {aiEnhancement.recoverTips.map((tip, index) => (
                      <Text key={index} style={[{ color: currentTheme.text, fontSize: 14, marginLeft: 8 }]}>
                        • {tip}
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
} 