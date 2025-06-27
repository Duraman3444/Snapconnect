import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Dimensions,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/SupabaseAuthContext';
import ragService from '../services/ragService';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function AIAssistant({ 
  visible, 
  onClose, 
  onSuggestionSelect, 
  context = 'messaging',
  userProfile = {},
  conversationData = {} 
}) {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const { currentTheme } = useTheme();
  const { currentUser } = useAuth();

  const handleAskAI = async () => {
    if (!query.trim()) return;

    setLoading(true);
    try {
      // Use the RAG service to get AI response
      const aiResponse = await ragService.getAIResponse(query, currentUser?.id);
      setResponse(aiResponse);
      
      // Generate conversation suggestions based on the query and response
      const conversationSuggestions = generateConversationSuggestions(query, aiResponse);
      setSuggestions(conversationSuggestions);
    } catch (error) {
      console.error('AI Assistant Error:', error);
      Alert.alert('Error', 'Failed to get AI response. Please try again.');
      setResponse('Sorry, I encountered an error while processing your request.');
    } finally {
      setLoading(false);
    }
  };

  const generateConversationSuggestions = (userQuery, aiResponse) => {
    // Generate contextual conversation starters based on the AI interaction
    const suggestions = [];
    
    // Consider conversation context and user profile
    const recentMessages = conversationData.messages || [];
    const chatType = conversationData.chatType || 'individual';
    const relationship = conversationData.relationship || 'friend';
    
    if (userQuery.toLowerCase().includes('study') || userQuery.toLowerCase().includes('class')) {
      suggestions.push('Want to study together?');
      suggestions.push('What classes are you taking?');
      suggestions.push('How are your finals going?');
      if (chatType === 'group') {
        suggestions.push('Anyone up for a study group?');
      }
    }
    
    if (userQuery.toLowerCase().includes('food') || userQuery.toLowerCase().includes('eat')) {
      suggestions.push('Want to grab food?');
      suggestions.push('Know any good restaurants?');
      suggestions.push('Dining hall or takeout?');
      if (chatType === 'group') {
        suggestions.push('Food run anyone?');
      }
    }
    
    if (userQuery.toLowerCase().includes('event') || userQuery.toLowerCase().includes('party')) {
      suggestions.push('Going to any events this weekend?');
      suggestions.push('Want to check out that event together?');
      suggestions.push('Heard about any fun parties?');
      if (chatType === 'group') {
        suggestions.push('Group event this weekend?');
      }
    }
    
    // Context-aware suggestions based on conversation history
    if (recentMessages.length === 0) {
      suggestions.push('Hey, what\'s up?');
      suggestions.push('How\'s your day going?');
    } else if (recentMessages.length < 5) {
      suggestions.push('How are things going?');
      suggestions.push('What are you up to?');
    }
    
    // Default suggestions if no specific context
    if (suggestions.length === 0) {
      suggestions.push('Want to hang out?');
      suggestions.push('What\'s new?');
      suggestions.push('How\'s everything?');
    }
    
    // Remove duplicates and limit to 4 suggestions
    return [...new Set(suggestions)].slice(0, 4);
  };

  const handleSuggestionPress = (suggestion) => {
    if (onSuggestionSelect) {
      onSuggestionSelect(suggestion);
    }
    onClose();
  };

  const clearChat = () => {
    setQuery('');
    setResponse('');
    setSuggestions([]);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        style={[styles.container, { backgroundColor: currentTheme.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: currentTheme.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={[styles.closeButtonText, { color: currentTheme.primary }]}>Close</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: currentTheme.text }]}>AI Assistant</Text>
          <TouchableOpacity onPress={clearChat} style={styles.clearButton}>
            <Text style={[styles.clearButtonText, { color: currentTheme.accent }]}>Clear</Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={styles.contentContainer}>
          {/* AI Response */}
          {response ? (
            <View style={[styles.responseContainer, { backgroundColor: currentTheme.surface }]}>
              <Text style={[styles.responseLabel, { color: currentTheme.primary }]}>AI Response:</Text>
              <Text style={[styles.responseText, { color: currentTheme.text }]}>{response}</Text>
            </View>
          ) : (
            <View style={styles.welcomeContainer}>
              <Text style={[styles.welcomeTitle, { color: currentTheme.text }]}>👋 AI Assistant</Text>
              <Text style={[styles.welcomeSubtitle, { color: currentTheme.textSecondary }]}>
                Ask me anything about campus life, studies, or get conversation suggestions!
              </Text>
            </View>
          )}

          {/* Conversation Suggestions */}
          {suggestions.length > 0 && (
            <View style={styles.suggestionsContainer}>
              <View style={styles.suggestionsGrid}>
                {suggestions.map((suggestion, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[styles.suggestionCard, { backgroundColor: currentTheme.surface, borderColor: currentTheme.border }]}
                    onPress={() => handleSuggestionPress(suggestion)}
                  >
                    <Text style={[styles.suggestionText, { color: currentTheme.text }]}>
                      {suggestion}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </ScrollView>

        {/* Input Area */}
        <View style={[styles.inputContainer, { backgroundColor: currentTheme.background }]}>
          <View style={[styles.inputWrapper, { backgroundColor: currentTheme.surface, borderColor: currentTheme.border }]}>
            <TextInput
              style={[styles.textInput, { 
                color: currentTheme.text || '#FFFFFF',
                backgroundColor: 'transparent',
              }]}
              placeholder="Ask anything"
              placeholderTextColor={currentTheme.textSecondary || '#888888'}
              value={query}
              onChangeText={setQuery}
              multiline
              maxLength={500}
              returnKeyType="send"
              onSubmitEditing={() => {
                if (query.trim() && !loading) {
                  handleAskAI();
                }
              }}
              blurOnSubmit={false}
              autoCapitalize="sentences"
              autoCorrect={true}
              textAlignVertical="top"
            />
            {loading ? (
              <View style={styles.loadingIndicator}>
                <ActivityIndicator size="small" color={currentTheme.primary} />
              </View>
            ) : (
              query.trim() && (
                <TouchableOpacity
                  style={[styles.sendButton, { backgroundColor: currentTheme.primary }]}
                  onPress={handleAskAI}
                  disabled={loading}
                >
                  <Text style={styles.sendIcon}>→</Text>
                </TouchableOpacity>
              )
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    paddingTop: 50, // Account for status bar
  },
  closeButton: {
    padding: 5,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  clearButton: {
    padding: 5,
  },
  clearButtonText: {
    fontSize: 16,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  welcomeContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  welcomeSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  responseContainer: {
    marginVertical: 20,
    padding: 15,
    borderRadius: 12,
  },
  responseLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  responseText: {
    fontSize: 16,
    lineHeight: 22,
  },
  suggestionsContainer: {
    marginVertical: 20,
  },
  suggestionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  suggestionCard: {
    width: '48%',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    minHeight: 80,
    justifyContent: 'center',
  },
  suggestionText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'left',
  },
  inputContainer: {
    padding: 16,
    paddingBottom: 20,
    backgroundColor: 'transparent',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 44,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    maxHeight: 80,
    minHeight: 20,
    paddingVertical: 6,
    paddingRight: 8,
    lineHeight: 20,
  },
  loadingIndicator: {
    marginLeft: 8,
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendIcon: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 