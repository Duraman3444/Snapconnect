import AsyncStorage from '@react-native-async-storage/async-storage';

export const checkTutorialCompleted = async (userId) => {
  try {
    if (!userId) return false;
    const completed = await AsyncStorage.getItem(`tutorial_completed_${userId}`);
    return completed === 'true';
  } catch (error) {
    console.error('Error checking tutorial completion:', error);
    return false;
  }
};

export const markTutorialCompleted = async (userId) => {
  try {
    if (!userId) return false;
    await AsyncStorage.setItem(`tutorial_completed_${userId}`, 'true');
    return true;
  } catch (error) {
    console.error('Error marking tutorial as completed:', error);
    return false;
  }
};

export const resetTutorialStatus = async (userId) => {
  try {
    if (!userId) return false;
    await AsyncStorage.removeItem(`tutorial_completed_${userId}`);
    return true;
  } catch (error) {
    console.error('Error resetting tutorial status:', error);
    return false;
  }
}; 