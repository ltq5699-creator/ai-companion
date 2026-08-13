import React from 'react';
import { View, Image, StyleSheet, ViewStyle } from 'react-native';
import { Theme } from '../theme';

export function ChatBackground({
  wallpaper,
  children,
  style,
}: {
  wallpaper?: string | null;
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.container, style]}>
      {wallpaper ? (
        <>
          <Image source={{ uri: wallpaper }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          {/* 毛玻璃质感叠层 */}
          <View style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,238,232,0.62)' }]} />
        </>
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: Theme.bg }]} />
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
