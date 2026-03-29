import React, { useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Text } from "react-native";
import { useAuthStore } from "./src/store/authStore";
import LoginScreen from "./src/screens/LoginScreen";
import HomeScreen from "./src/screens/HomeScreen";
import CreateArenaScreen from "./src/screens/CreateArenaScreen";
import JoinArenaScreen from "./src/screens/JoinArenaScreen";
import HealthInputScreen from "./src/screens/HealthInputScreen";
import ArenaDetailScreen from "./src/screens/ArenaDetailScreen";
import LeaderboardScreen from "./src/screens/LeaderboardScreen";
import ReportScreen from "./src/screens/ReportScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import CheckInScreen from "./src/screens/CheckInScreen";
import FriendsScreen from "./src/screens/FriendsScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: { backgroundColor: "#1e293b", borderTopColor: "#334155" },
        tabBarActiveTintColor: "#6366f1",
        tabBarInactiveTintColor: "#64748b",
        headerStyle: { backgroundColor: "#0f172a" },
        headerTintColor: "#f8fafc",
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: "競技場", tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>⚔️</Text> }}
      />
      <Tab.Screen
        name="Health"
        component={HealthInputScreen}
        options={{ title: "健康數據", tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>📊</Text> }}
      />
      <Tab.Screen
        name="Friends"
        component={FriendsScreen}
        options={{ title: "好友", tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>👥</Text> }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: "我的", tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>👤</Text> }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const { user, loading, init } = useAuthStore();

  useEffect(() => { init(); }, []);

  if (loading) return null;

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: "#0f172a" },
          headerTintColor: "#f8fafc",
        }}
      >
        {user ? (
          <>
            <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
            <Stack.Screen name="ArenaDetail" component={ArenaDetailScreen} options={{ title: "競技場詳情" }} />
            <Stack.Screen name="CreateArena" component={CreateArenaScreen} options={{ title: "創建競技場" }} />
            <Stack.Screen name="JoinArena" component={JoinArenaScreen} options={{ title: "加入競技場" }} />
            <Stack.Screen name="Leaderboard" component={LeaderboardScreen} options={{ title: "排行榜" }} />
            <Stack.Screen name="Report" component={ReportScreen} options={{ title: "AI 戰報" }} />
            <Stack.Screen name="CheckIn" component={CheckInScreen} options={{ title: "打卡牆" }} />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
