import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, Modal } from 'react-native';
import { useAuth } from '../context/SupabaseAuthContext';
import { useTheme } from '../context/ThemeContext';

const TEST_ACCOUNTS = [
  {
    id: 'alice',
    name: 'Alice Doe',
    email: 'alice.doe@example.com',
    password: 'TestUser123!',
    username: 'alice_doe',
    emoji: '👩'
  },
  {
    id: 'bob',
    name: 'Bob Smith',
    email: 'bob.smith@example.com',
    password: 'TestUser123!',
    username: 'bob_smith',
    emoji: '👨'
  },
  {
    id: 'charlie',
    name: 'Charlie Brown',
    email: 'charlie.brown@example.com',
    password: 'TestUser123!',
    username: 'charlie_brown',
    emoji: '🧑'
  }
];

export default function DebugAccountSwitcher() {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { currentUser, login, logout, signup } = useAuth();
  const { currentTheme } = useTheme();

  const switchToAccount = async (account) => {
    try {
      setIsLoading(true);
      
      // First logout current user
      if (currentUser) {
        await logout();
      }

      // Try to login to the test account
      try {
        await login(account.email, account.password);
        Alert.alert('✅ Success', `Switched to ${account.name}!`);
      } catch (loginError) {
        // If login fails, the account might not exist - try to create it
        console.log('Login failed, trying to create account...', loginError.message);
        
        try {
          await signup(account.email, account.password, account.username);
          Alert.alert('✅ Account Created', `Created and switched to ${account.name}!`);
        } catch (signupError) {
          console.error('Signup error:', signupError);
          Alert.alert('❌ Error', `Failed to switch to ${account.name}: ${signupError.message}`);
        }
      }
      
      setIsVisible(false);
    } catch (error) {
      console.error('Switch account error:', error);
      Alert.alert('❌ Error', `Failed to switch accounts: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const createAllTestAccounts = async () => {
    try {
      setIsLoading(true);
      Alert.alert(
        '🔧 Create Test Accounts',
        'This will create all test accounts. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Create All',
            onPress: async () => {
              for (const account of TEST_ACCOUNTS) {
                try {
                  await signup(account.email, account.password, account.username);
                  console.log(`Created account: ${account.name}`);
                } catch (error) {
                  console.log(`Account ${account.name} might already exist:`, error.message);
                }
              }
              Alert.alert('✅ Complete', 'All test accounts created/verified!');
              setIsVisible(false);
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('❌ Error', `Failed to create accounts: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Only show in development mode
  if (__DEV__ !== true) {
    return null;
  }

  return (
    <>
      {/* Debug Button - floating button in bottom left */}
      <TouchableOpacity
        style={[{
          position: 'absolute',
          bottom: 100,
          left: 20,
          backgroundColor: '#ff6b6b',
          borderRadius: 30,
          width: 60,
          height: 60,
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 4,
          elevation: 5
        }]}
        onPress={() => setIsVisible(true)}
      >
        <Text style={[{ fontSize: 24 }]}>🔧</Text>
      </TouchableOpacity>

      {/* Account Switcher Modal */}
      <Modal
        visible={isVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsVisible(false)}
      >
        <View style={[{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'center',
          alignItems: 'center'
        }]}>
          <View style={[{
            backgroundColor: currentTheme.background,
            borderRadius: 20,
            padding: 24,
            width: '90%',
            maxWidth: 400,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25,
            shadowRadius: 8,
            elevation: 10
          }]}>
            {/* Header */}
            <View style={[{ alignItems: 'center', marginBottom: 24 }]}>
              <Text style={[{ fontSize: 24, fontWeight: 'bold', color: currentTheme.primary, marginBottom: 8 }]}>
                🔧 Debug Account Switcher
              </Text>
              <Text style={[{ color: currentTheme.textSecondary, textAlign: 'center' }]}>
                Quick switch between test accounts
              </Text>
              {currentUser && (
                <Text style={[{ color: currentTheme.primary, marginTop: 8, fontWeight: '600' }]}>
                  Currently: {currentUser.username || currentUser.email}
                </Text>
              )}
            </View>

            {/* Test Accounts */}
            <View style={[{ marginBottom: 24 }]}>
              <Text style={[{ fontSize: 18, fontWeight: 'bold', color: currentTheme.primary, marginBottom: 16 }]}>
                Test Accounts:
              </Text>
              {TEST_ACCOUNTS.map((account) => (
                <TouchableOpacity
                  key={account.id}
                  style={[{
                    backgroundColor: currentTheme.surface,
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: currentUser?.username === account.username ? currentTheme.primary : currentTheme.border
                  }]}
                  onPress={() => switchToAccount(account)}
                  disabled={isLoading}
                >
                  <Text style={[{ fontSize: 32, marginRight: 16 }]}>{account.emoji}</Text>
                  <View style={[{ flex: 1 }]}>
                    <Text style={[{ fontSize: 18, fontWeight: 'bold', color: currentTheme.primary }]}>
                      {account.name}
                    </Text>
                    <Text style={[{ color: currentTheme.textSecondary, fontSize: 14 }]}>
                      @{account.username}
                    </Text>
                    <Text style={[{ color: currentTheme.textSecondary, fontSize: 12 }]}>
                      {account.email}
                    </Text>
                  </View>
                  {currentUser?.username === account.username && (
                    <View style={[{ backgroundColor: currentTheme.primary, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4 }]}>
                      <Text style={[{ color: currentTheme.background, fontSize: 12, fontWeight: 'bold' }]}>ACTIVE</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Actions */}
            <View style={[{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }]}>
              <TouchableOpacity
                style={[{
                  backgroundColor: currentTheme.primary,
                  borderRadius: 12,
                  paddingHorizontal: 20,
                  paddingVertical: 12,
                  flex: 1
                }]}
                onPress={createAllTestAccounts}
                disabled={isLoading}
              >
                <Text style={[{ color: currentTheme.background, fontWeight: 'bold', textAlign: 'center' }]}>
                  {isLoading ? '⏳' : '🔧 Create All'}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[{
                  backgroundColor: currentTheme.surface,
                  borderRadius: 12,
                  paddingHorizontal: 20,
                  paddingVertical: 12,
                  borderWidth: 1,
                  borderColor: currentTheme.border,
                  flex: 1
                }]}
                onPress={() => setIsVisible(false)}
                disabled={isLoading}
              >
                <Text style={[{ color: currentTheme.primary, fontWeight: 'bold', textAlign: 'center' }]}>
                  Close
                </Text>
              </TouchableOpacity>
            </View>

            {/* Disclaimer */}
            <Text style={[{
              color: currentTheme.textSecondary,
              fontSize: 12,
              textAlign: 'center',
              marginTop: 16,
              fontStyle: 'italic'
            }]}>
              ⚠️ Debug mode only - not visible in production
            </Text>
          </View>
        </View>
      </Modal>
    </>
  );
} 