import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { StackNavigationProp } from '@react-navigation/stack';
import { AuthStackParamList } from '../../navigation/AuthNavigator';

type SignupScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'Signup'>;

interface Props {
  navigation: SignupScreenNavigationProp;
}

const SignupScreen: React.FC<Props> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const { signUp, isLoading, error, clearError, isAuthenticated } = useAuthStore();

  const handleSignup = async () => {
    if (!email.trim() || !password.trim() || !username.trim() || !displayName.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    console.log('🚀 SignupScreen: Starting signup process...');
    
    try {
      await signUp(email.trim(), password, username.trim(), displayName.trim());
      console.log('✅ SignupScreen: Signup completed successfully!');
      
      // The navigation should happen automatically via the AppNavigator
      // when isAuthenticated becomes true
      
    } catch (error: any) {
      console.error('❌ SignupScreen: Signup failed:', error);
      Alert.alert('Signup Error', error.message || 'Something went wrong during signup');
    }
  };

  // Monitor authentication state changes
  React.useEffect(() => {
    console.log('🔍 SignupScreen: Auth state changed:', {
      isAuthenticated,
      isLoading,
      hasError: !!error
    });
  }, [isAuthenticated, isLoading, error]);

  React.useEffect(() => {
    if (error) {
      console.error('❌ SignupScreen: Auth error:', error);
      Alert.alert('Signup Failed', error);
      clearError();
    }
  }, [error, clearError]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join SnapConnect today</Text>
        </View>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Display Name"
            placeholderTextColor="#666"
            value={displayName}
            onChangeText={setDisplayName}
          />
          
          <TextInput
            style={styles.input}
            placeholder="Username"
            placeholderTextColor="#666"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />
          
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#666"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#666"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
          />

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleSignup}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>
              {isLoading ? 'Creating Account...' : 'Sign Up'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account?</Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.loginText}>Log In</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
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
    paddingHorizontal: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 50,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFC00',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  form: {
    marginBottom: 30,
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 15,
    fontSize: 16,
    color: '#fff',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#333',
  },
  button: {
    backgroundColor: '#FFFC00',
    borderRadius: 25,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: '#666',
  },
  buttonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    color: '#666',
    fontSize: 14,
  },
  loginText: {
    color: '#FFFC00',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 5,
  },
});

export default SignupScreen; 