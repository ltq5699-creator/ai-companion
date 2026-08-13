import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { useStore } from '../store/useStore';
import { Theme } from '../theme';
import { ChatBackground } from '../components/ChatBackground';
import { MessageBubble } from '../components/MessageBubble';
import { Composer } from '../components/Composer';
import { Avatar } from '../components/Avatar';
import { replyOnce, buildHistory, nowContext } from '../services/chatService';
import { buildGroupMemberSystemPrompt } from '../agents/personas';
import { uid } from '../utils/messageParse';
import { Message } from '../utils/types';

export function GroupChatScreen({ route, navigation }: any) {
  const { agentId } = route.params;
  const agent = useStore((s) => s.agents.find((a) => a.id === agentId));
  const session = useStore((s) => s.sessions[agentId]);
  const settings = useStore((s) => s.settings);
  const appendMessage = useStore((s) => s.appendMessage);
  const markRead = useStore((s) => s.markRead);

  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    markRead(agentId);
  }, [agentId, markRead]);
  useEffect(() => {
    listRef.current?.scrollToEnd({ animated: true });
  }, [session?.messages?.length, thinking]);

  if (!agent || !agent.members) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text>群聊不存在</Text>
      </View>
    );
  }

  const messages: Message[] = session?.messages ?? [];

  const send = async () => {
    const text = input.trim();
    if (!text || thinking) return;
    setInput('');
    setThinking(true);

    appendMessage(agentId, {
      id: uid(),
      role: 'user',
      type: 'text',
      text,
      createdAt: Date.now(),
    });

    const fresh = useStore.getState().sessions[agentId];
    const history = buildHistory(fresh);
    const ctx = nowContext();

    // 谁来接话：被点名的成员一定回；其余随机 2~3 人，避免每次六个人齐刷刷刷屏
    const all = agent.members ?? [];
    const mentioned = all.filter((m) =>
      text.toLowerCase().includes(m.name.split(' ')[0].toLowerCase())
    );
    let responders = mentioned;
    if (responders.length === 0) {
      const shuffled = [...all].sort(() => Math.random() - 0.5);
      const count = Math.min(all.length, 2 + Math.floor(Math.random() * 2)); // 2~3 人
      responders = shuffled.slice(0, count);
    }

    // 逐个回复：先出来的先冒泡，像真实群里你一句我一句
    for (const m of responders) {
      const msgs = await replyOnce({
        systemPrompt: buildGroupMemberSystemPrompt(m.name, m.systemPrompt, ctx),
        history,
        settings,
        ctx,
        senderId: m.id,
        senderName: m.name,
      });
      for (const msg of msgs) appendMessage(agentId, msg);
    }
    setThinking(false);
  };

  return (
    <ChatBackground wallpaper={agent.wallpaper ?? settings.wallpaper}>
      <StatusBar barStyle="dark-content" backgroundColor={Theme.bgDeep} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <View style={{ flexDirection: 'row' }}>
          {agent.members.slice(0, 4).map((m) => (
            <View key={m.id} style={{ marginLeft: -6 }}>
              <Avatar emoji={m.avatar} color={m.accentColor} size={30} />
            </View>
          ))}
        </View>
        <View style={{ marginLeft: 12, flex: 1 }}>
          <Text style={styles.name}>{agent.name}</Text>
          <Text style={styles.status}>{agent.members.length} 位成员 · 防 OOC</Text>
        </View>
        <TouchableOpacity
          style={styles.moreBtn}
          onPress={() => navigation.navigate('AgentEdit', { agentId: agent.id })}
        >
          <Text style={styles.moreText}>⋯</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ paddingVertical: 12 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>宿舍群聊开启 💖{'\n'}发句话，看他们怎么炸开锅～</Text>
          </View>
        }
        renderItem={({ item }) => (
          <MessageBubble
            message={item}
            accentColor={agent.members?.find((m) => m.id === item.senderId)?.accentColor}
          />
        )}
      />

      {thinking ? (
        <View style={styles.typing}>
          <ActivityIndicator size="small" color={Theme.primary} />
          <Text style={styles.typingText}>成员们正在抢话…</Text>
        </View>
      ) : null}

      <Composer value={input} onChange={setInput} onSend={send} placeholder="在群里说点什么…" />
    </ChatBackground>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 48,
    paddingBottom: 12,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,200,190,0.35)',
  },
  back: { paddingHorizontal: 8, paddingVertical: 2 },
  backText: { fontSize: 30, color: Theme.primary, lineHeight: 32 },
  name: { fontSize: 16, fontWeight: '800', color: Theme.text },
  status: { fontSize: 11, color: Theme.textSub },
  moreBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  moreText: { fontSize: 22, color: Theme.text, lineHeight: 24 },
  empty: { alignItems: 'center', marginTop: 60, paddingHorizontal: 40 },
  emptyText: { textAlign: 'center', color: Theme.textSub, lineHeight: 22 },
  typing: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 18, paddingBottom: 6 },
  typingText: { fontSize: 12, color: Theme.textSub },
});
