import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Missing Information', 'Please fill in all fields to continue');
      return;
    }

    try {
      setLoading(true);
      console.log('Attempting login with:', email);
      await login(email, password);
      console.log('Login successful');
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Login Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-snapBlack"
    >
      <View className="flex-1 justify-center px-8">
        <View className="items-center mb-12">
          <Text className="text-5xl font-bold text-center mb-4 text-snapYellow">
            👻 SnapConnect
          </Text>
          <Text className="text-gray-400 text-center text-lg">
            Welcome back! Ready to share moments? ✨
          </Text>
        </View>
        
        <View className="space-y-4">
          <View>
            <Text className="text-snapYellow font-semibold mb-2 text-center">Email Address</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Enter your email..."
              placeholderTextColor="#666"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
          
          <View>
            <Text className="text-snapYellow font-semibold mb-2 text-center">Password</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Enter your password..."
              placeholderTextColor="#666"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>
          
          <TouchableOpacity
            className="bg-snapYellow rounded-full py-4 mt-8 shadow-lg"
            onPress={handleLogin}
            disabled={loading}
          >
            <Text className="text-black text-xl font-bold text-center">
              {loading ? '🔐 Logging in...' : '🚀 Log In'}
            </Text>
          </TouchableOpacity>
          
          <View className="items-center mt-6">
            <Text className="text-gray-400 text-center mb-4">
              Don't have an account yet?
            </Text>
            <TouchableOpacity
              className="bg-gray-700 rounded-full px-6 py-3"
              onPress={() => navigation.navigate('Signup')}
            >
              <Text className="text-snapYellow text-center text-lg font-semibold">
                ✨ Create Account
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  textInput: {
    backgroundColor: '#3A3A3A',
    borderRadius: 25,
    paddingHorizontal: 24,
    paddingVertical: 16,
    fontSize: 18,
    color: 'white',
    textAlign: 'center',
    marginBottom: 16,
    minHeight: 56,
    borderWidth: 2,
    borderColor: '#555',
  }
}); 