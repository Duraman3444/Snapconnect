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

type LoginScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'Login'>;

interface Props {
  navigation: LoginScreenNavigationProp;
}

const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { signIn, isLoading, error, clearError, isAuthenticated } = useAuthStore();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    console.log('🚀 LoginScreen: Starting login process...');
    
    try {
      await signIn(email.trim(), password);
      console.log('✅ LoginScreen: Login completed successfully!');
      
      // The navigation should happen automatically via the AppNavigator
      // when isAuthenticated becomes true
      
    } catch (error: any) {
      console.error('❌ LoginScreen: Login failed:', error);
      // Error is already handled by the store
    }
  };

  // Test login with a user you created during signup
  const handleTestLogin = async () => {
    console.log('🧪 LoginScreen: Testing with sample credentials...');
    setEmail('test@example.com');
    setPassword('password123');
    
    try {
      await signIn('test@example.com', 'password123');
      console.log('✅ LoginScreen: Test login completed successfully!');
    } catch (error: any) {
      console.error('❌ LoginScreen: Test login failed:', error);
    }
  };

  const handleForgotPassword = () => {
    navigation.navigate('ForgotPassword');
  };

  const handleSignUp = () => {
    navigation.navigate('Signup');
  };

  // Monitor authentication state changes
  React.useEffect(() => {
    console.log('🔍 LoginScreen: Auth state changed:', {
      isAuthenticated,
      isLoading,
      hasError: !!error
    });
  }, [isAuthenticated, isLoading, error]);

  React.useEffect(() => {
    if (error) {
      console.error('❌ LoginScreen: Auth error:', error);
      Alert.alert('Login Failed', error);
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
          <Text style={styles.title}>SnapConnect</Text>
          <Text style={styles.subtitle}>Share Moments. Disappear. Discover More.</Text>
        </View>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#666"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
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
            onPress={handleLogin}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>
              {isLoading ? 'Logging in...' : 'Log In'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.testButton, isLoading && styles.buttonDisabled]}
            onPress={handleTestLogin}
            disabled={isLoading}
          >
            <Text style={styles.testButtonText}>
              🧪 Test Login
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={handleForgotPassword}
          >
            <Text style={styles.linkText}>Forgot Password?</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account?</Text>
          <TouchableOpacity onPress={handleSignUp}>
            <Text style={styles.signUpText}>Sign Up</Text>
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
    fontSize: 32,
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
  testButton: {
    backgroundColor: '#FFFC00',
    borderRadius: 25,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  testButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  linkButton: {
    alignItems: 'center',
    marginTop: 15,
  },
  linkText: {
    color: '#FFFC00',
    fontSize: 14,
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
  signUpText: {
    color: '#FFFC00',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 5,
  },
});

export default LoginScreen; 