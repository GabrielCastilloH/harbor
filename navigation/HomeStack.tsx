import { createNativeStackNavigator } from "@react-navigation/native-stack";
import HomeScreen from "../screens/HomeScreen";
import ReportScreen from "../screens/ReportScreen";
import { RootStackParamList } from "../types/navigation";
import Colors from "../constants/Colors";

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function HomeStack() {
  console.log("🧭 [HOME STACK] Rendering HomeStack");
  return (
    <Stack.Navigator
      initialRouteName="HomeScreen"
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="HomeScreen" component={HomeScreen} />
      <Stack.Screen
        name="ReportScreen"
        component={ReportScreen}
        options={{
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
}
