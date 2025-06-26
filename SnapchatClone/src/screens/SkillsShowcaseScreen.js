import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export default function SkillsShowcaseScreen({ navigation }) {
  const { currentTheme } = useTheme();

  return (
    <View style={[{ flex: 1, backgroundColor: currentTheme.background }]}>
      {/* Header */}
      <View style={[{ backgroundColor: currentTheme.background, paddingTop: 56, paddingBottom: 24, paddingHorizontal: 24, borderBottomWidth: 1, borderBottomColor: currentTheme.border }]}>
        <View style={[{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={[{ color: currentTheme.primary, fontSize: 18, fontWeight: '600' }]}>← Back</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
            <View style={[{ backgroundColor: currentTheme.primary, borderRadius: 20, padding: 8 }]}>
              <Text style={[{ color: currentTheme.background, fontWeight: 'bold', fontSize: 16 }]}>👤</Text>
            </View>
          </TouchableOpacity>
        </View>
        <View style={[{ alignItems: 'center' }]}>
          <Text style={[{ fontSize: 30, fontWeight: 'bold', color: currentTheme.primary, textAlign: 'center', marginBottom: 8 }]}>🏆 Skills Showcase</Text>
          <Text style={[{ color: currentTheme.textSecondary, textAlign: 'center' }]}>
            Highlight academic projects and achievements
          </Text>
        </View>
      </View>

      {/* Content */}
      <ScrollView style={[{ flex: 1 }]} contentContainerStyle={{ padding: 20 }}>
        <View style={[{ alignItems: 'center', paddingVertical: 40 }]}>
          <Text style={[{ fontSize: 64, marginBottom: 16 }]}>🏆</Text>
          <Text style={[{ fontSize: 24, color: currentTheme.primary, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 }]}>
            Skills Showcase
          </Text>
          <Text style={[{ color: currentTheme.textSecondary, textAlign: 'center', fontSize: 16, marginBottom: 24, lineHeight: 22 }]}>
            This feature is coming soon! You'll be able to showcase your academic projects and achievements.
          </Text>
          
          <View style={[{ backgroundColor: currentTheme.surface, borderRadius: 16, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: currentTheme.border }]}>
            <Text style={[{ fontSize: 18, fontWeight: 'bold', color: currentTheme.primary, marginBottom: 12 }]}>
              Coming Features:
            </Text>
            <Text style={[{ color: currentTheme.text, marginBottom: 8 }]}>• Portfolio creation tools</Text>
            <Text style={[{ color: currentTheme.text, marginBottom: 8 }]}>• Project documentation</Text>
            <Text style={[{ color: currentTheme.text, marginBottom: 8 }]}>• Skills verification system</Text>
            <Text style={[{ color: currentTheme.text, marginBottom: 8 }]}>• Achievement badges</Text>
            <Text style={[{ color: currentTheme.text }]}>• Peer endorsements</Text>
          </View>

          <TouchableOpacity
            style={[{ backgroundColor: currentTheme.primary, borderRadius: 24, paddingHorizontal: 32, paddingVertical: 16 }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={[{ color: currentTheme.background, fontWeight: 'bold', fontSize: 18 }]}>← Back to Home</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
} 