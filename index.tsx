import { registerRootComponent } from 'expo';
import App from './App';
import { AuthProvider } from './src/context/AuthContext';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const Root = () => (
  <SafeAreaProvider>
    <AuthProvider>
      <App />
    </AuthProvider>
  </SafeAreaProvider>
);

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(Root);
