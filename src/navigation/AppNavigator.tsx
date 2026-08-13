import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet } from 'react-native';
import { ChatListScreen } from '../screens/ChatListScreen';
import { AgentLibraryScreen } from '../screens/AgentLibraryScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { ChatScreen } from '../screens/ChatScreen';
import { GroupChatScreen } from '../screens/GroupChatScreen';
import { AgentEditScreen } from '../screens/AgentEditScreen';
import { CreateGroupScreen } from '../screens/CreateGroupScreen';
import { Theme } from '../theme';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return (
    <View style={[styles.tabIcon, focused && styles.tabIconActive]}>
      <Text style={{ fontSize: 18 }}>{emoji}</Text>
    </View>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: Theme.primary,
        tabBarInactiveTintColor: Theme.textSub,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tab.Screen
        name="Messages"
        component={ChatListScreen}
        options={{ title: '消息', tabBarIcon: ({ focused }) => <TabIcon emoji="💬" focused={focused} /> }}
      />
      <Tab.Screen
        name="Agents"
        component={AgentLibraryScreen}
        options={{ title: '智能体', tabBarIcon: ({ focused }) => <TabIcon emoji="🧩" focused={focused} /> }}
      />
      <Tab.Screen
        name="Me"
        component={SettingsScreen}
        options={{ title: '我的', tabBarIcon: ({ focused }) => <TabIcon emoji="⚙️" focused={focused} /> }}
      />
    </Tab.Navigator>
  );
}

export function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen name="Chat" component={ChatScreen} />
      <Stack.Screen name="GroupChat" component={GroupChatScreen} />
      <Stack.Screen name="AgentEdit" component={AgentEditScreen} />
      <Stack.Screen
        name="CreateGroup"
        component={CreateGroupScreen}
        options={{ animation: 'slide_from_bottom' }}
      />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#fff',
    borderTopColor: 'rgba(255,200,190,0.35)',
    height: 60,
    paddingBottom: 6,
  },
  tabLabel: { fontSize: 11 },
  tabIcon: { width: 40, height: 30, alignItems: 'center', justifyContent: 'center' },
  tabIconActive: { transform: [{ scale: 1.08 }] },
});
