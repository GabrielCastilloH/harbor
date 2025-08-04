import { createNativeStackNavigator } from "@react-navigation/native-stack";
import HomeScreen from "../screens/HomeScreen";
import ReportScreen from "../screens/ReportScreen";
import { RootStackParamList } from "../types/navigation";
import Colors from "../constants/Colors";

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function HomeStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="HomeScreen" component={HomeScreen} />
      <Stack.Screen
        name="ReportScreen"
        component={ReportScreen}
        options={{
          headerShown: true,
          headerTitle: "Report User",
          headerStyle: {
            backgroundColor: Colors.primary100,
          },
          headerTintColor: Colors.black,
          headerBackTitle: "Back",
        }}
      />
    </Stack.Navigator>
  );
}
