import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

export function Avatar({
  emoji,
  uri,
  color = '#FF8A7A',
  size = 44,
}: {
  emoji?: string;
  /** 自定义头像图片（本地相册或网络图），优先级高于 emoji */
  uri?: string | null;
  color?: string;
  size?: number;
}) {
  const shape = { width: size, height: size, borderRadius: size / 2 };

  if (uri) {
    return (
      <View style={[styles.avatar, shape, { backgroundColor: color + '22' }]}>
        <Image source={{ uri }} style={[shape, { position: 'absolute' }]} resizeMode="cover" />
      </View>
    );
  }

  return (
    <View style={[styles.avatar, shape, { backgroundColor: color + '22' }]}>
      <Text style={{ fontSize: size * 0.5 }}>{emoji ?? '🙂'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.85)',
    overflow: 'hidden',
  },
});
