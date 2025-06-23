import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
} from 'react-native';

interface PlaceholderScreenProps {
  title: string;
  icon: string;
  description?: string;
}

export const PlaceholderScreen: React.FC<PlaceholderScreenProps> = ({ 
  title, 
  icon, 
  description 
}) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.icon}>{icon}</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>
          {description || `${title} functionality coming soon!`}
        </Text>
        
        <View style={styles.comingSoon}>
          <Text style={styles.comingSoonText}>Under Development</Text>
          <Text style={styles.subText}>
            This feature will be available in the next update
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  icon: {
    fontSize: 80,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFC00',
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
  },
  comingSoon: {
    backgroundColor: '#1a1a1a',
    borderRadius: 15,
    padding: 20,
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
  },
  comingSoonText: {
    fontSize: 16,
    color: '#FFFC00',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
}); 