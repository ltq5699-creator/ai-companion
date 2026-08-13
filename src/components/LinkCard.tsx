import React from 'react';
import { View, Text, TouchableOpacity, Linking, StyleSheet } from 'react-native';
import { Theme } from '../theme';

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export function LinkCard({ url, title }: { url: string; title?: string }) {
  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={() => Linking.openURL(url).catch(() => {})}
    >
      <View style={styles.bar} />
      <Text style={styles.host} numberOfLines={1}>
        🔗 {hostOf(url)}
      </Text>
      {title ? <Text style={styles.title} numberOfLines={2}>{title}</Text> : null}
      <Text style={styles.url} numberOfLines={1}>
        {url}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 6,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: Theme.radiusSm,
    padding: 10,
    borderWidth: 1,
    borderColor: Theme.bubbleAgentBorder,
  },
  bar: {
    width: 4,
    height: 34,
    borderRadius: 2,
    backgroundColor: Theme.primary,
    marginRight: 8,
  },
  host: { fontSize: 12, color: Theme.primaryDark, fontWeight: '700' },
  title: { fontSize: 13, color: Theme.text, marginTop: 2, width: '100%' },
  url: { fontSize: 11, color: Theme.textSub, marginTop: 2, width: '100%' },
});
