import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';

const CameraScreen: React.FC = () => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>📷</Text>
        <Text style={styles.mainText}>Camera</Text>
        <Text style={styles.subtitle}>
          Take photos and videos to share with friends
        </Text>
        
        <View style={styles.comingSoon}>
          <Text style={styles.comingSoonText}>Camera functionality coming soon!</Text>
          <Text style={styles.description}>
            This will include:
            {'\n'}• Photo & video capture
            {'\n'}• AR filters and effects
            {'\n'}• Direct sharing to friends
            {'\n'}• Story posting
          </Text>
        </View>
        
        <TouchableOpacity style={styles.placeholderButton}>
          <Text style={styles.buttonText}>Open Camera</Text>
        </TouchableOpacity>
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
  title: {
    fontSize: 80,
    marginBottom: 20,
  },
  mainText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFC00',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
  },
  comingSoon: {
    backgroundColor: '#1a1a1a',
    borderRadius: 15,
    padding: 20,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: '#333',
  },
  comingSoonText: {
    fontSize: 18,
    color: '#FFFC00',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
  },
  description: {
    fontSize: 14,
    color: '#999',
    lineHeight: 20,
  },
  placeholderButton: {
    backgroundColor: '#FFFC00',
    borderRadius: 25,
    paddingHorizontal: 40,
    paddingVertical: 15,
  },
  buttonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default CameraScreen; 