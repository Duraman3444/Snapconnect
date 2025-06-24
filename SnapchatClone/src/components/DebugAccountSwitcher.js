import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, Modal } from 'react-native';
import { useAuth } from '../context/SupabaseAuthContext';
import { useTheme } from '../context/ThemeContext';

const TEST_ACCOUNTS = [
  {
    id: 'alice',
    name: 'Alice Doe',
    email: 'alice.doe.test@gmail.com',
    password: 'TestUser123!',
    username: 'alice_doe',
    emoji: '👩'
  },
  {
    id: 'bob',
    name: 'Bob Smith',
    email: 'bob.smith.test@gmail.com',
    password: 'TestUser123!',
    username: 'bob_smith',
    emoji: '👨'
  },
  {
    id: 'charlie',
    name: 'Charlie Brown',
    email: 'charlie.brown.test@gmail.com',
    password: 'TestUser123!',
    username: 'charlie_brown',
    emoji: '🧑'
  }
];

export default function DebugAccountSwitcher() {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { currentUser, login, logout, signup, supabase } = useAuth();
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
        console.log('Login failed, trying to create account...', loginError.message);
        
        // Handle different login error types
        if (loginError.message.includes('Email not confirmed')) {
          Alert.alert('📧 Email Not Confirmed', 
            `Account ${account.name} exists but email needs confirmation.\n\nTo fix this:\n1. Go to Supabase Dashboard\n2. Run the SUPABASE_FIX.sql script\n3. Or manually confirm emails in Auth users table`);
          setIsVisible(false);
          setIsLoading(false);
          return;
        }
        
        try {
          await signup(account.email, account.password, account.username);
          Alert.alert('✅ Account Created', `Created and switched to ${account.name}!\n\nNote: If login fails, the email may need confirmation.`);
        } catch (signupError) {
          console.error('Signup error:', signupError);
          
          // Handle different signup error types
          if (signupError.message.includes('already been registered') || 
              signupError.message.includes('User already registered')) {
            Alert.alert('⚠️ Account Exists', 
              `Account ${account.name} exists but password might be different or email needs confirmation.\n\nTry:\n1. Running SUPABASE_FIX.sql in Supabase\n2. Checking Auth users in Supabase dashboard`);
          } else if (signupError.message.includes('For security purposes')) {
            Alert.alert('⏳ Rate Limited', 
              `Supabase rate limiting detected. Please wait a minute and try again.\n\nTip: Create accounts one at a time to avoid rate limits.`);
          } else {
            Alert.alert('❌ Error', `Failed to create ${account.name}: ${signupError.message}`);
          }
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
        'This will create test accounts one by one to avoid rate limits. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Create All',
            onPress: async () => {
              let successCount = 0;
              let existingCount = 0;
              let errorCount = 0;
              
              for (const account of TEST_ACCOUNTS) {
                try {
                  // Add delay to avoid rate limiting
                  if (successCount > 0) {
                    await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
                  }
                  
                  await signup(account.email, account.password, account.username);
                  console.log(`✅ Created account: ${account.name}`);
                  successCount++;
                } catch (error) {
                  if (error.message.includes('already been registered') || 
                      error.message.includes('User already registered')) {
                    console.log(`⚠️ Account ${account.name} already exists`);
                    existingCount++;
                  } else if (error.message.includes('For security purposes')) {
                    console.log(`⏳ Rate limited on account ${account.name}`);
                    errorCount++;
                    break; // Stop trying if rate limited
                  } else {
                    console.error(`❌ Failed to create ${account.name}:`, error.message);
                    errorCount++;
                  }
                }
              }
              
              let message = `Results:\n• Created: ${successCount} accounts\n• Existing: ${existingCount} accounts`;
              if (errorCount > 0) {
                message += `\n• Errors: ${errorCount} accounts`;
                message += `\n\n⚠️ Some accounts may need email confirmation. Run SUPABASE_FIX.sql in your Supabase dashboard.`;
              }
              
              Alert.alert('✅ Complete', message);
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

  const fixSupabaseIssues = async () => {
    try {
      setIsLoading(true);
      Alert.alert(
        '🔧 Fix Supabase Issues',
        'This will attempt to fix common Supabase issues like missing profiles and email confirmation.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Run Fixes',
            onPress: async () => {
              try {
                // Try to create missing profiles
                const { error: profilesError } = await supabase.rpc('create_missing_profiles');
                if (profilesError) {
                  console.error('Error creating missing profiles:', profilesError);
                }
                
                // Try to confirm test emails
                const { error: confirmError } = await supabase.rpc('confirm_test_emails');
                if (confirmError) {
                  console.error('Error confirming emails:', confirmError);
                }
                
                Alert.alert('✅ Fixes Applied', 
                  'Attempted to fix:\n• Missing profiles\n• Email confirmations\n\nNote: Some fixes may require running SUPABASE_FIX.sql manually in Supabase dashboard.');
              } catch (error) {
                Alert.alert('⚠️ Partial Fix', 
                  `Some fixes applied, but manual steps needed:\n\n1. Go to Supabase Dashboard\n2. SQL Editor\n3. Run SUPABASE_FIX.sql script\n\nError: ${error.message}`);
              }
              setIsVisible(false);
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('❌ Error', `Failed to run fixes: ${error.message}`);
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
            maxHeight: '85%',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25,
            shadowRadius: 8,
            elevation: 10
          }]}>
            {/* Header */}
            <View style={[{ alignItems: 'center', marginBottom: 20 }]}>
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
            <View style={[{ marginBottom: 20 }]}>
              <Text style={[{ fontSize: 18, fontWeight: 'bold', color: currentTheme.primary, marginBottom: 12 }]}>
                Test Accounts:
              </Text>
              {TEST_ACCOUNTS.map((account) => (
                <TouchableOpacity
                  key={account.id}
                  style={[{
                    backgroundColor: currentTheme.surface,
                    borderRadius: 12,
                    padding: 12,
                    marginBottom: 8,
                    flexDirection: 'row',
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: currentUser?.username === account.username ? currentTheme.primary : currentTheme.border
                  }]}
                  onPress={() => switchToAccount(account)}
                  disabled={isLoading}
                >
                  <Text style={[{ fontSize: 28, marginRight: 12 }]}>{account.emoji}</Text>
                  <View style={[{ flex: 1 }]}>
                    <Text style={[{ fontSize: 16, fontWeight: 'bold', color: currentTheme.primary }]}>
                      {account.name}
                    </Text>
                    <Text style={[{ color: currentTheme.textSecondary, fontSize: 12 }]}>
                      @{account.username}
                    </Text>
                  </View>
                  {currentUser?.username === account.username && (
                    <View style={[{ backgroundColor: currentTheme.primary, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 }]}>
                      <Text style={[{ color: currentTheme.background, fontSize: 10, fontWeight: 'bold' }]}>ACTIVE</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Actions */}
            <View style={[{ flexDirection: 'row', justifyContent: 'space-between', gap: 6, marginBottom: 16 }]}>
              <TouchableOpacity
                style={[{
                  backgroundColor: currentTheme.primary,
                  borderRadius: 12,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  flex: 1
                }]}
                onPress={createAllTestAccounts}
                disabled={isLoading}
              >
                <Text style={[{ color: currentTheme.background, fontWeight: 'bold', textAlign: 'center', fontSize: 12 }]}>
                  {isLoading ? '⏳' : '🔧 Create All'}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[{
                  backgroundColor: '#f59e0b',
                  borderRadius: 12,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  flex: 1
                }]}
                onPress={fixSupabaseIssues}
                disabled={isLoading}
              >
                <Text style={[{ color: 'white', fontWeight: 'bold', textAlign: 'center', fontSize: 12 }]}>
                  🔨 Fix Issues
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[{
                  backgroundColor: currentTheme.surface,
                  borderRadius: 12,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  borderWidth: 1,
                  borderColor: currentTheme.border,
                  flex: 1
                }]}
                onPress={() => setIsVisible(false)}
                disabled={isLoading}
              >
                <Text style={[{ color: currentTheme.primary, fontWeight: 'bold', textAlign: 'center', fontSize: 12 }]}>
                  Close
                </Text>
              </TouchableOpacity>
            </View>

            {/* Troubleshooting Box */}
            <View style={[{
              backgroundColor: '#fef3c7',
              borderRadius: 12,
              padding: 12,
              borderLeftWidth: 4,
              borderLeftColor: '#f59e0b'
            }]}>
              <Text style={[{ color: '#92400e', fontWeight: 'bold', marginBottom: 6, fontSize: 14 }]}>
                🚨 Troubleshooting Supabase Issues
              </Text>
              <Text style={[{ color: '#92400e', fontSize: 11, lineHeight: 14 }]}>
                • RLS Policy Errors: Run SUPABASE_FIX.sql{'\n'}
                • Email Not Confirmed: Click "Fix Issues"{'\n'}
                • Rate Limiting: Wait 1 minute between attempts{'\n'}
                • Profile Missing: Click "Fix Issues"
              </Text>
            </View>

            {/* Disclaimer */}
            <Text style={[{
              color: currentTheme.textSecondary,
              fontSize: 10,
              textAlign: 'center',
              marginTop: 12,
              fontStyle: 'italic'
            }]}>
              ⚠️ Debug mode only - includes Supabase fixes
            </Text>
          </View>
        </View>
      </Modal>
    </>
  );
} 