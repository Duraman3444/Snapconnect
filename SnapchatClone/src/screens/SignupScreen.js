import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { useAuth } from '../context/SupabaseAuthContext';

export default function SignupScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();

  const handleSignup = async () => {
    if (!email || !password || !username) {
      Alert.alert('Missing Information', 'Please fill in all fields to get started');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Password Too Short', 'Password must be at least 6 characters long for security');
      return;
    }

    try {
      setLoading(true);
      console.log('Attempting signup with:', email, username);
      await signup(email, password, username);
      console.log('Signup successful');
    } catch (error) {
      console.error('Signup error:', error);
      Alert.alert('Signup Failed', error.message);
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
            👻 Join SnapConnect
          </Text>
          <Text className="text-gray-400 text-center text-lg">
            Start your journey of sharing moments! 🌟
          </Text>
        </View>
        
        <View className="space-y-4">
          <View>
            <Text className="text-snapYellow font-semibold mb-2 text-center">Username</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Choose a cool username..."
              placeholderTextColor="#666"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
          </View>

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
              placeholder="Create a secure password..."
              placeholderTextColor="#666"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>
          
          <TouchableOpacity
            className="bg-snapYellow rounded-full py-4 mt-8 shadow-lg"
            onPress={handleSignup}
            disabled={loading}
          >
            <Text className="text-black text-xl font-bold text-center">
              {loading ? '🔮 Creating Account...' : '🎉 Sign Up'}
            </Text>
          </TouchableOpacity>
          
          <View className="items-center mt-6">
            <Text className="text-gray-400 text-center mb-4">
              Already have an account?
            </Text>
            <TouchableOpacity
              className="bg-gray-700 rounded-full px-6 py-3"
              onPress={() => navigation.navigate('Login')}
            >
              <Text className="text-snapYellow text-center text-lg font-semibold">
                🚀 Log In
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
  }
}); 