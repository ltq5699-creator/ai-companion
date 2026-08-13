import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { useStore } from '../store/useStore';
import { Agent } from '../utils/types';
import { Theme } from '../theme';
import { Avatar } from '../components/Avatar';
import { formatTime } from '../utils/messageParse';

export function ChatListScreen({ navigation }: any) {
  const agents = useStore((s) => s.agents);
  const sessions = useStore((s) => s.sessions);

  const preview = (a: Agent) => {
    const m = sessions[a.id]?.messages?.slice(-1)[0];
    if (!m) return a.subtitle ?? '开始你们的专属对话吧~';
    if (m.type === 'image') return '[图片]';
    return m.text ?? '';
  };

  const open = (a: Agent) => {
    navigation.navigate(a.isGroup ? 'GroupChat' : 'Chat', { agentId: a.id });
  };

  // 最近聊过的排前面，没聊过的按创建顺序垫底
  const ordered = [...agents].sort(
    (x, y) => (sessions[y.id]?.updatedAt ?? 0) - (sessions[x.id]?.updatedAt ?? 0)
  );
  const totalUnread = Object.values(sessions).reduce((n, s) => n + (s?.unread ?? 0), 0);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Theme.bgDeep} />
      <View style={styles.header}>
        <Text style={styles.title}>消息</Text>
        <Text style={styles.subtitle}>
          {totalUnread > 0 ? `有 ${totalUnread} 条新消息在等你 💌` : '你的赛博伴侣们'}
        </Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('CreateGroup')}>
          <Text style={styles.addText}>+</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={ordered}
        keyExtractor={(a) => a.id}
        contentContainerStyle={{ paddingBottom: 20 }}
        renderItem={({ item }) => {
          const unread = sessions[item.id]?.unread ?? 0;
          const last = sessions[item.id]?.updatedAt;
          return (
            <TouchableOpacity
              style={styles.row}
              onPress={() => open(item)}
              onLongPress={() => navigation.navigate('AgentEdit', { agentId: item.id })}
              activeOpacity={0.9}
            >
              <View>
                <Avatar emoji={item.avatar} uri={item.avatarUri} color={item.accentColor} size={52} />
                {item.autoMessage ? <View style={styles.onlineDot} /> : null}
              </View>
              <View style={styles.middle}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.preview} numberOfLines={1}>
                  {preview(item)}
                </Text>
              </View>
              <View style={styles.right}>
                {last ? <Text style={styles.time}>{formatTime(last)}</Text> : null}
                {unread > 0 ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{unread}</Text>
                  </View>
                ) : null}
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.bg },
  header: { paddingTop: 50, paddingHorizontal: 20, paddingBottom: 14 },
  title: { fontSize: 28, fontWeight: '800', color: Theme.text },
  subtitle: { fontSize: 13, color: Theme.textSub, marginTop: 2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: '#fff',
    marginHorizontal: 14,
    marginVertical: 5,
    borderRadius: 18,
    shadowColor: Theme.shadow,
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 2,
  },
  addBtn: {
    position: 'absolute',
    right: 18,
    top: 54,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Theme.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Theme.shadow,
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  addText: { color: '#fff', fontSize: 28, lineHeight: 30 },
  onlineDot: {
    position: 'absolute',
    right: 1,
    bottom: 1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#5FD08A',
    borderWidth: 2,
    borderColor: '#fff',
  },
  middle: { flex: 1, marginLeft: 12 },
  name: { fontSize: 16, fontWeight: '700', color: Theme.text },
  preview: { fontSize: 13, color: Theme.textSub, marginTop: 3 },
  right: { alignItems: 'flex-end', gap: 6 },
  time: { fontSize: 11, color: Theme.textSub },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Theme.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
});
