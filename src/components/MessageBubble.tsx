import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Message } from '../utils/types';
import { Theme } from '../theme';
import { extractUrls, formatTime } from '../utils/messageParse';
import { LinkCard } from './LinkCard';
import { Avatar } from './Avatar';

export function MessageBubble({ message, accentColor }: { message: Message; accentColor?: string }) {
  const isUser = message.role === 'user';

  if (message.type === 'image' && message.imageUrl) {
    return (
      <View style={[styles.row, isUser && styles.rowUser]}>
        {!isUser && <Avatar emoji="🐶" size={30} color={accentColor} />}
        <Image source={{ uri: message.imageUrl }} style={styles.image} resizeMode="cover" />
      </View>
    );
  }

  const urls = message.type === 'text' && message.text ? extractUrls(message.text) : [];
  const showName = !isUser && message.senderName;

  return (
    <View style={[styles.row, isUser && styles.rowUser]}>
      {!isUser && <Avatar emoji="🐶" size={30} color={accentColor} />}
      <View style={{ maxWidth: '78%' }}>
        {showName && <Text style={styles.sender}>{message.senderName}</Text>}
        <View
          style={[
            styles.bubble,
            isUser ? styles.bubbleUser : styles.bubbleAgent,
          ]}
        >
          <Text style={[styles.text, isUser ? styles.textUser : styles.textAgent]}>
            {message.text}
          </Text>
          <Text style={[styles.time, isUser ? styles.timeUser : styles.timeAgent]}>
            {formatTime(message.createdAt)}
          </Text>
        </View>
        {urls.map((u, i) => (
          <LinkCard key={i} url={u} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', marginVertical: 6, paddingHorizontal: 12 },
  rowUser: { justifyContent: 'flex-end' },
  bubble: {
    paddingVertical: 9,
    paddingHorizontal: 13,
    borderRadius: Theme.radius,
    borderWidth: 1,
  },
  bubbleAgent: {
    backgroundColor: Theme.bubbleAgent,
    borderColor: Theme.bubbleAgentBorder,
    borderBottomLeftRadius: 6,
  },
  bubbleUser: {
    backgroundColor: Theme.bubbleUser,
    borderColor: Theme.bubbleUser,
    borderBottomRightRadius: 6,
  },
  text: { fontSize: 15, lineHeight: 21 },
  textAgent: { color: Theme.text },
  textUser: { color: Theme.textOnPrimary },
  time: { fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
  timeAgent: { color: Theme.textSub },
  timeUser: { color: 'rgba(255,255,255,0.8)' },
  sender: { fontSize: 11, color: Theme.textSub, marginBottom: 2, marginLeft: 4 },
  image: {
    width: 200,
    height: 150,
    borderRadius: Theme.radius,
    borderWidth: 1,
    borderColor: Theme.bubbleAgentBorder,
  },
});
