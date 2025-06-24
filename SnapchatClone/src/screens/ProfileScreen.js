import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
  Modal,
  Switch,
  StyleSheet,
  SafeAreaView
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { auth, db } from '../../firebaseConfig';

export default function ProfileScreen({ navigation }) {
  const { currentUser, logout } = useAuth();
  const { isDarkMode, wallpaper, wallpapers, currentTheme, toggleTheme, changeWallpaper } = useTheme();
  
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isWallpaperModalVisible, setIsWallpaperModalVisible] = useState(false);
  
  // Profile editing states
  const [newUsername, setNewUsername] = useState(currentUser?.username || '');
  const [newEmail, setNewEmail] = useState(currentUser?.email || '');
  
  // Password changing states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setNewUsername(currentUser.username || '');
      setNewEmail(currentUser.email || '');
    }
  }, [currentUser]);

  const handleSaveProfile = async () => {
    if (!newUsername.trim()) {
      Alert.alert('Error', 'Username cannot be empty');
      return;
    }

    try {
      setLoading(true);
      
      // Update user document in Firestore
      await db.collection('users').doc(currentUser.uid).update({
        username: newUsername.toLowerCase(),
        email: newEmail
      });

      // Update email in Firebase Auth if changed
      if (newEmail !== currentUser.email) {
        await currentUser.updateEmail(newEmail);
      }

      Alert.alert('Success', 'Profile updated successfully');
      setIsEditingProfile(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all password fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    try {
      setLoading(true);
      
      // Re-authenticate user with current password
      const credential = auth.EmailAuthProvider.credential(currentUser.email, currentPassword);
      await currentUser.reauthenticateWithCredential(credential);
      
      // Update password
      await currentUser.updatePassword(newPassword);
      
      Alert.alert('Success', 'Password updated successfully');
      setIsChangingPassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Error changing password:', error);
      if (error.code === 'auth/wrong-password') {
        Alert.alert('Error', 'Current password is incorrect');
      } else {
        Alert.alert('Error', 'Failed to change password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              Alert.alert('Error', 'Failed to logout');
            }
          }
        }
      ]
    );
  };

  const SettingItem = ({ title, subtitle, onPress, rightElement, disabled = false }) => (
    <TouchableOpacity
      style={[
        styles.settingItem,
        { backgroundColor: currentTheme.surface, borderBottomColor: currentTheme.border },
        disabled && { opacity: 0.5 }
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <View style={styles.settingContent}>
        <Text style={[styles.settingTitle, { color: currentTheme.text }]}>{title}</Text>
        {subtitle && (
          <Text style={[styles.settingSubtitle, { color: currentTheme.textSecondary }]}>
            {subtitle}
          </Text>
        )}
      </View>
      {rightElement}
    </TouchableOpacity>
  );

  const WallpaperOption = ({ wallpaperKey, wallpaperData, isSelected, onSelect }) => (
    <TouchableOpacity
      style={[
        styles.wallpaperOption,
        { backgroundColor: wallpaperData.background, borderColor: wallpaperData.primary },
        isSelected && { borderWidth: 3 }
      ]}
      onPress={() => onSelect(wallpaperKey)}
    >
      <View style={[styles.wallpaperPreview, { backgroundColor: wallpaperData.secondary }]}>
        <Text style={{ color: wallpaperData.primary, fontSize: 12, fontWeight: 'bold' }}>
          {wallpaperData.name}
        </Text>
      </View>
      {isSelected && (
        <View style={[styles.selectedIndicator, { backgroundColor: wallpaperData.primary }]}>
          <Text style={styles.checkmark}>✓</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: currentTheme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={[styles.backButton, { color: currentTheme.primary }]}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: currentTheme.text }]}>Profile</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* User Info Section */}
        <View style={[styles.section, { backgroundColor: currentTheme.surface }]}>
          <View style={styles.userInfo}>
            <View style={[styles.avatar, { backgroundColor: currentTheme.primary }]}>
              <Text style={styles.avatarText}>
                {(currentUser?.username || currentUser?.email || 'U').charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.userDetails}>
              <Text style={[styles.username, { color: currentTheme.text }]}>
                @{currentUser?.username || 'username'}
              </Text>
              <Text style={[styles.email, { color: currentTheme.textSecondary }]}>
                {currentUser?.email}
              </Text>
            </View>
          </View>
        </View>

        {/* Account Settings */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: currentTheme.textSecondary }]}>
            ACCOUNT SETTINGS
          </Text>
        </View>

        <SettingItem
          title="Edit Profile"
          subtitle="Change username and email"
          onPress={() => setIsEditingProfile(true)}
          rightElement={<Text style={[styles.arrow, { color: currentTheme.textSecondary }]}>→</Text>}
        />

        <SettingItem
          title="Change Password"
          subtitle="Update your password"
          onPress={() => setIsChangingPassword(true)}
          rightElement={<Text style={[styles.arrow, { color: currentTheme.textSecondary }]}>→</Text>}
        />

        {/* Appearance Settings */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: currentTheme.textSecondary }]}>
            APPEARANCE
          </Text>
        </View>

        <SettingItem
          title="Dark Mode"
          subtitle={isDarkMode ? "Dark theme enabled" : "Light theme enabled"}
          rightElement={
            <Switch
              value={isDarkMode}
              onValueChange={toggleTheme}
              trackColor={{ false: '#767577', true: currentTheme.primary }}
              thumbColor={isDarkMode ? '#ffffff' : '#f4f3f4'}
            />
          }
        />

        <SettingItem
          title="Wallpaper"
          subtitle={wallpapers[wallpaper]?.name || "Default"}
          onPress={() => setIsWallpaperModalVisible(true)}
          rightElement={<Text style={[styles.arrow, { color: currentTheme.textSecondary }]}>→</Text>}
        />

        {/* App Settings */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: currentTheme.textSecondary }]}>
            APP
          </Text>
        </View>

        <SettingItem
          title="Privacy Settings"
          subtitle="Manage your privacy"
          onPress={() => Alert.alert('Coming Soon', 'Privacy settings will be available soon!')}
          rightElement={<Text style={[styles.arrow, { color: currentTheme.textSecondary }]}>→</Text>}
        />

        <SettingItem
          title="Notifications"
          subtitle="Manage notification preferences"
          onPress={() => Alert.alert('Coming Soon', 'Notification settings will be available soon!')}
          rightElement={<Text style={[styles.arrow, { color: currentTheme.textSecondary }]}>→</Text>}
        />

        {/* Logout */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: currentTheme.textSecondary }]}>
            ACCOUNT
          </Text>
        </View>

        <SettingItem
          title="Logout"
          subtitle="Sign out of your account"
          onPress={handleLogout}
          rightElement={<Text style={[styles.arrow, { color: '#ef4444' }]}>→</Text>}
        />

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={isEditingProfile}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: currentTheme.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: currentTheme.border }]}>
            <TouchableOpacity onPress={() => setIsEditingProfile(false)}>
              <Text style={[styles.modalCancel, { color: currentTheme.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: currentTheme.text }]}>Edit Profile</Text>
            <TouchableOpacity onPress={handleSaveProfile} disabled={loading}>
              <Text style={[styles.modalSave, { color: currentTheme.primary }]}>
                {loading ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: currentTheme.text }]}>Username</Text>
              <TextInput
                style={[styles.input, { backgroundColor: currentTheme.surface, color: currentTheme.text, borderColor: currentTheme.border }]}
                value={newUsername}
                onChangeText={setNewUsername}
                placeholder="Enter username"
                placeholderTextColor={currentTheme.textSecondary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: currentTheme.text }]}>Email</Text>
              <TextInput
                style={[styles.input, { backgroundColor: currentTheme.surface, color: currentTheme.text, borderColor: currentTheme.border }]}
                value={newEmail}
                onChangeText={setNewEmail}
                placeholder="Enter email"
                placeholderTextColor={currentTheme.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Change Password Modal */}
      <Modal
        visible={isChangingPassword}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: currentTheme.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: currentTheme.border }]}>
            <TouchableOpacity onPress={() => setIsChangingPassword(false)}>
              <Text style={[styles.modalCancel, { color: currentTheme.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: currentTheme.text }]}>Change Password</Text>
            <TouchableOpacity onPress={handleChangePassword} disabled={loading}>
              <Text style={[styles.modalSave, { color: currentTheme.primary }]}>
                {loading ? 'Updating...' : 'Update'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: currentTheme.text }]}>Current Password</Text>
              <TextInput
                style={[styles.input, { backgroundColor: currentTheme.surface, color: currentTheme.text, borderColor: currentTheme.border }]}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Enter current password"
                placeholderTextColor={currentTheme.textSecondary}
                secureTextEntry
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: currentTheme.text }]}>New Password</Text>
              <TextInput
                style={[styles.input, { backgroundColor: currentTheme.surface, color: currentTheme.text, borderColor: currentTheme.border }]}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Enter new password"
                placeholderTextColor={currentTheme.textSecondary}
                secureTextEntry
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: currentTheme.text }]}>Confirm New Password</Text>
              <TextInput
                style={[styles.input, { backgroundColor: currentTheme.surface, color: currentTheme.text, borderColor: currentTheme.border }]}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm new password"
                placeholderTextColor={currentTheme.textSecondary}
                secureTextEntry
              />
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Wallpaper Selection Modal */}
      <Modal
        visible={isWallpaperModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: currentTheme.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: currentTheme.border }]}>
            <TouchableOpacity onPress={() => setIsWallpaperModalVisible(false)}>
              <Text style={[styles.modalCancel, { color: currentTheme.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: currentTheme.text }]}>Choose Wallpaper</Text>
            <TouchableOpacity onPress={() => setIsWallpaperModalVisible(false)}>
              <Text style={[styles.modalSave, { color: currentTheme.primary }]}>Done</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.wallpaperGrid}>
            {Object.entries(wallpapers).map(([key, wallpaperData]) => (
              <WallpaperOption
                key={key}
                wallpaperKey={key}
                wallpaperData={wallpaperData}
                isSelected={wallpaper === key}
                onSelect={(selectedKey) => {
                  changeWallpaper(selectedKey);
                }}
              />
            ))}
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  backButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    flex: 1,
  },
  headerSpacer: {
    width: 50,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 12,
    padding: 20,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  userDetails: {
    flex: 1,
  },
  username: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 13,
  },
  arrow: {
    fontSize: 16,
    marginLeft: 10,
  },
  bottomSpacer: {
    height: 50,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  modalCancel: {
    fontSize: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalSave: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalContent: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  wallpaperGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 20,
    gap: 15,
  },
  wallpaperOption: {
    width: '45%',
    height: 120,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  wallpaperPreview: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 8,
    borderRadius: 8,
  },
  selectedIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
}); 