import SettingsScreen from "../screens/SettingsScreen";
import EditProfileScreen from "../screens/EditProfileScreen";
import SelfProfileScreen from "../screens/SelfProfileScreen";
import GroupSizeScreen from "../screens/GroupSizeScreen";
import Colors from "../constants/Colors";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

const Stack = createNativeStackNavigator();

export default function SettingsStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: Colors.primary100,
        },
        headerTintColor: Colors.black,
      }}
    >
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Profile"
        component={EditProfileScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="SelfProfile"
        component={SelfProfileScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="GroupSize"
        component={GroupSizeScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
