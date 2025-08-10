import { registerRootComponent } from 'expo';
import messaging from '@react-native-firebase/messaging';

import App from './App';

// Handle background messages for Stream Chat notifications
messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('🔔 Background message received:', remoteMessage);
  
  // For Stream Chat notifications, the message will be automatically displayed
  // by Firebase when the app is in the background
  // We don't need to manually display notifications here
});

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
