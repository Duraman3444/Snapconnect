import React, { useState, useContext } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  Alert, 
  ActivityIndicator 
} from 'react-native';
import { ThemeContext } from '../context/ThemeContext';
import { MediaCleanup } from '../utils/mediaCleanup';

export default function MediaCleanupScreen({ navigation }) {
  const { currentTheme } = useContext(ThemeContext);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState(null);
  
  const showAlert = (title, message) => {
    Alert.alert(title, message);
  };

  const testImageUrls = async () => {
    setIsLoading(true);
    setResults(null);
    
    try {
      console.log('🔍 Starting image URL tests...');
      const testResults = await MediaCleanup.testAllImageUrls();
      
      if (testResults) {
        setResults(testResults);
        const { summary } = testResults;
        showAlert(
          'Image Test Results',
          `Total: ${summary.total}\nWorking: ${summary.working}\nBroken: ${summary.broken}`
        );
      } else {
        showAlert('Error', 'Failed to test image URLs');
      }
    } catch (error) {
      console.error('Error testing URLs:', error);
      showAlert('Error', 'Failed to test image URLs: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const cleanupBrokenRecords = async () => {
    Alert.alert(
      'Confirm Cleanup',
      'This will delete all broken image records from the database. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            try {
              const success = await MediaCleanup.deleteBrokenImageRecords();
              if (success) {
                showAlert('Success', 'Broken image records have been cleaned up!');
              } else {
                showAlert('Error', 'Failed to cleanup broken records');
              }
            } catch (error) {
              console.error('Error during cleanup:', error);
              showAlert('Error', 'Cleanup failed: ' + error.message);
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  const getStorageStats = async () => {
    setIsLoading(true);
    
    try {
      const stats = await MediaCleanup.getStorageStats();
      if (stats) {
        showAlert(
          'Storage Statistics',
          `Total Files: ${stats.totalFiles}\nReferenced: ${stats.referencedFiles}\nOrphaned: ${stats.orphanedFiles}`
        );
      } else {
        showAlert('Error', 'Failed to get storage statistics');
      }
    } catch (error) {
      console.error('Error getting stats:', error);
      showAlert('Error', 'Failed to get stats: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteOrphanedFiles = async () => {
    Alert.alert(
      'Confirm Deletion',
      'This will permanently delete orphaned files from storage. This cannot be undone. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            try {
              await MediaCleanup.deleteOrphanedFiles();
              showAlert('Success', 'Orphaned files have been deleted!');
            } catch (error) {
              console.error('Error deleting files:', error);
              showAlert('Error', 'Failed to delete files: ' + error.message);
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  const runFullCleanup = async () => {
    Alert.alert(
      'Full Cleanup',
      'This will run a comprehensive cleanup process including URL testing and database cleanup. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Start Cleanup', 
          onPress: async () => {
            setIsLoading(true);
            setResults(null);
            
            try {
              console.log('🧹 Starting full cleanup...');
              const cleanupResults = await MediaCleanup.fullCleanup();
              
              if (cleanupResults) {
                setResults(cleanupResults.urlTests);
                const { summary } = cleanupResults.urlTests;
                const { storageStats } = cleanupResults;
                
                showAlert(
                  'Cleanup Complete',
                  `Images tested: ${summary.total}\nBroken removed: ${summary.broken}\nStorage files: ${storageStats?.totalFiles || 'N/A'}\nOrphaned: ${storageStats?.orphanedFiles || 'N/A'}`
                );
              } else {
                showAlert('Error', 'Cleanup process failed');
              }
            } catch (error) {
              console.error('Error during full cleanup:', error);
              showAlert('Error', 'Full cleanup failed: ' + error.message);
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  const buttonStyle = {
    backgroundColor: currentTheme.primary,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginVertical: 8,
    alignItems: 'center'
  };

  const buttonTextStyle = {
    color: currentTheme.background,
    fontSize: 16,
    fontWeight: '600'
  };

  const dangerButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#FF6B6B'
  };

  return (
    <View style={{ 
      flex: 1, 
      backgroundColor: currentTheme.background 
    }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: currentTheme.border
      }}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={{ 
            fontSize: 18, 
            color: currentTheme.primary,
            fontWeight: '600'
          }}>
            ← Back
          </Text>
        </TouchableOpacity>
        <Text style={{ 
          fontSize: 20, 
          fontWeight: 'bold', 
          color: currentTheme.text 
        }}>
          Media Cleanup
        </Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView style={{ 
        flex: 1, 
        padding: 20 
      }}>
        {/* Loading Indicator */}
        {isLoading && (
          <View style={{
            alignItems: 'center',
            padding: 20,
            backgroundColor: currentTheme.surface,
            borderRadius: 12,
            marginBottom: 20
          }}>
            <ActivityIndicator size="large" color={currentTheme.primary} />
            <Text style={{ 
              color: currentTheme.text, 
              marginTop: 10,
              fontSize: 16
            }}>
              Processing...
            </Text>
          </View>
        )}

        {/* Info Section */}
        <View style={{
          backgroundColor: currentTheme.surface,
          borderRadius: 12,
          padding: 16,
          marginBottom: 20
        }}>
          <Text style={{ 
            color: currentTheme.text,
            fontSize: 16,
            fontWeight: '600',
            marginBottom: 8
          }}>
            🛠️ Media Cleanup Tools
          </Text>
          <Text style={{ 
            color: currentTheme.textSecondary,
            fontSize: 14,
            lineHeight: 20
          }}>
            Use these tools to fix broken image loading issues by cleaning up invalid URLs and orphaned files.
          </Text>
        </View>

        {/* Test URLs Button */}
        <TouchableOpacity 
          style={buttonStyle}
          onPress={testImageUrls}
          disabled={isLoading}
        >
          <Text style={buttonTextStyle}>
            🔍 Test All Image URLs
          </Text>
        </TouchableOpacity>

        {/* Storage Stats Button */}
        <TouchableOpacity 
          style={buttonStyle}
          onPress={getStorageStats}
          disabled={isLoading}
        >
          <Text style={buttonTextStyle}>
            📊 Get Storage Statistics
          </Text>
        </TouchableOpacity>

        {/* Cleanup Broken Records Button */}
        <TouchableOpacity 
          style={dangerButtonStyle}
          onPress={cleanupBrokenRecords}
          disabled={isLoading}
        >
          <Text style={buttonTextStyle}>
            🗑️ Clean Broken Records
          </Text>
        </TouchableOpacity>

        {/* Delete Orphaned Files Button */}
        <TouchableOpacity 
          style={dangerButtonStyle}
          onPress={deleteOrphanedFiles}
          disabled={isLoading}
        >
          <Text style={buttonTextStyle}>
            🗂️ Delete Orphaned Files
          </Text>
        </TouchableOpacity>

        {/* Full Cleanup Button */}
        <TouchableOpacity 
          style={{
            ...buttonStyle,
            backgroundColor: '#4ECDC4',
            marginTop: 20
          }}
          onPress={runFullCleanup}
          disabled={isLoading}
        >
          <Text style={buttonTextStyle}>
            🧹 Run Full Cleanup
          </Text>
        </TouchableOpacity>

        {/* Results Section */}
        {results && (
          <View style={{
            backgroundColor: currentTheme.surface,
            borderRadius: 12,
            padding: 16,
            marginTop: 20
          }}>
            <Text style={{ 
              color: currentTheme.text,
              fontSize: 16,
              fontWeight: '600',
              marginBottom: 12
            }}>
              📊 Last Test Results
            </Text>
            
            <View style={{ 
              flexDirection: 'row',
              justifyContent: 'space-between',
              marginBottom: 8
            }}>
              <Text style={{ color: currentTheme.textSecondary }}>
                Total Images:
              </Text>
              <Text style={{ color: currentTheme.text, fontWeight: '600' }}>
                {results.summary.total}
              </Text>
            </View>
            
            <View style={{ 
              flexDirection: 'row',
              justifyContent: 'space-between',
              marginBottom: 8
            }}>
              <Text style={{ color: '#4ECDC4' }}>
                Working URLs:
              </Text>
              <Text style={{ color: '#4ECDC4', fontWeight: '600' }}>
                {results.summary.working}
              </Text>
            </View>
            
            <View style={{ 
              flexDirection: 'row',
              justifyContent: 'space-between'
            }}>
              <Text style={{ color: '#FF6B6B' }}>
                Broken URLs:
              </Text>
              <Text style={{ color: '#FF6B6B', fontWeight: '600' }}>
                {results.summary.broken}
              </Text>
            </View>
          </View>
        )}

        {/* Warning Section */}
        <View style={{
          backgroundColor: '#FFF3CD',
          borderRadius: 12,
          padding: 16,
          marginTop: 20,
          marginBottom: 40
        }}>
          <Text style={{ 
            color: '#856404',
            fontSize: 14,
            fontWeight: '600',
            marginBottom: 8
          }}>
            ⚠️ Important Notes
          </Text>
          <Text style={{ 
            color: '#856404',
            fontSize: 13,
            lineHeight: 18
          }}>
            • Always test URLs first before cleanup{'\n'}
            • Cleanup operations are permanent{'\n'}
            • Check console logs for detailed information{'\n'}
            • Run cleanup during low-usage periods
          </Text>
        </View>
      </ScrollView>
    </View>
  );
} 