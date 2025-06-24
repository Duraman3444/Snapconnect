import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { testSupabaseImageUrl } from '../utils/imageDebugger';

const ImageWithFallback = ({ 
  source, 
  style, 
  resizeMode = 'cover', 
  fallbackText = '📸', 
  fallbackSubtext = 'Image not available',
  onPress,
  ...props 
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleError = async (error) => {
    console.error('Image loading failed:', error.nativeEvent?.error || error);
    console.error('Failed URL:', source?.uri);
    
    // Run detailed debugging
    if (source?.uri) {
      console.log('Running URL diagnostics...');
      await testSupabaseImageUrl(source.uri);
    }
    
    setHasError(true);
    setIsLoading(false);
  };

  const handleLoad = () => {
    console.log('Image loaded successfully:', source?.uri);
    setHasError(false);
    setIsLoading(false);
  };

  const handleLoadStart = () => {
    console.log('Started loading image:', source?.uri);
    setIsLoading(true);
    setHasError(false);
  };

  // If there's an error or no source, show fallback
  if (hasError || !source?.uri) {
    return (
      <TouchableOpacity 
        style={[
          style,
          {
            backgroundColor: '#1a1a1a',
            justifyContent: 'center',
            alignItems: 'center',
            borderRadius: style?.borderRadius || 0,
          }
        ]}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <Text style={{ fontSize: 32, marginBottom: 8 }}>{fallbackText}</Text>
        <Text style={{ 
          color: '#888', 
          fontSize: 14, 
          textAlign: 'center',
          paddingHorizontal: 16
        }}>
          {fallbackSubtext}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={onPress ? 0.8 : 1}>
      <Image
        source={{
          uri: source.uri,
          cache: 'force-cache', // Force caching
        }}
        style={style}
        resizeMode={resizeMode}
        onError={handleError}
        onLoad={handleLoad}
        onLoadStart={handleLoadStart}
        {...props}
      />
      
      {/* Loading overlay */}
      {isLoading && (
        <View style={[
          {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            justifyContent: 'center',
            alignItems: 'center',
            borderRadius: style?.borderRadius || 0,
          }
        ]}>
          <Text style={{ color: 'white', fontSize: 12 }}>Loading...</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

export default ImageWithFallback; 