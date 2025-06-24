import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#000',
          padding: 32
        }}>
          <Text style={{
            fontSize: 48,
            marginBottom: 16
          }}>😵</Text>
          <Text style={{
            fontSize: 24,
            fontWeight: 'bold',
            color: '#FFD700',
            textAlign: 'center',
            marginBottom: 16
          }}>
            Something went wrong
          </Text>
          <Text style={{
            fontSize: 16,
            color: '#ccc',
            textAlign: 'center',
            marginBottom: 32
          }}>
            The app encountered an error. This usually happens with image loading or network issues.
          </Text>
          <TouchableOpacity
            onPress={() => this.setState({ hasError: false, error: null })}
            style={{
              backgroundColor: '#FFD700',
              borderRadius: 24,
              paddingHorizontal: 32,
              paddingVertical: 16
            }}
          >
            <Text style={{
              color: '#000',
              fontWeight: 'bold',
              fontSize: 16
            }}>
              Try Again
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 