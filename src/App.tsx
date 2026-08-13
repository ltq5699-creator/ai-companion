import 'react-native-gesture-handler';
import React, { useEffect, useRef } from 'react';
import { AppState, AppStateStatus, StatusBar } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { AppNavigator } from './navigation/AppNavigator';
import { useStore } from './store/useStore';
import {
  bootstrapSchedules,
  startForegroundTicker,
  stopForegroundTicker,
} from './services/scheduler';
import { requestNotificationPermission } from './services/notifications';
import { Theme } from './theme';

const NavTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: Theme.bg, primary: Theme.primary },
};

export default function App() {
  const init = useStore((s) => s.init);
  const appState = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    init();
    requestNotificationPermission();
    // 规划当天主动消息、补发已过时段、预约本地通知
    bootstrapSchedules();
    // 前台心跳：App 开着时到点也会自然发消息
    startForegroundTicker();

    const sub = AppState.addEventListener('change', (next) => {
      const prev = appState.current;
      appState.current = next;
      if (prev.match(/inactive|background/) && next === 'active') {
        // 回到前台：重新对齐当天计划并补发
        bootstrapSchedules();
        startForegroundTicker();
      } else if (next.match(/inactive|background/)) {
        stopForegroundTicker();
      }
    });

    return () => {
      sub.remove();
      stopForegroundTicker();
    };
  }, [init]);

  return (
    <NavigationContainer theme={NavTheme}>
      <StatusBar barStyle="dark-content" backgroundColor={Theme.bgDeep} />
      <AppNavigator />
    </NavigationContainer>
  );
}
