import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import HomeScreen from '../screens/HomeScreen';
import ChatScreen from '../screens/ChatScreen';
import SettingsStack from './SettingsStack';


const Tab = createBottomTabNavigator();

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: Colors.primary500,
        },
        headerTintColor: Colors.secondary500,
        tabBarStyle: { backgroundColor: Colors.primary500 },
        tabBarActiveTintColor: Colors.secondary500,
        tabBarInactiveTintColor: Colors.accent500,
      }}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen} 
        options={{
          tabBarIcon: ({color, size}) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen 
        name="Chat" 
        component={ChatScreen}
        options={{
          tabBarIcon: ({color, size}) => (
            <Ionicons name="chatbubbles" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen 
        name="Settings" 
        component={SettingsStack}
        options={{
          headerShown: false,
          tabBarIcon: ({color, size}) => (
            <Ionicons name="settings" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}