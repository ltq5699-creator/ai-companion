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
import { uid } from '../utils/messageParse';
import { Message } from '../utils/types';

export function ChatScreen({ route, navigation }: any) {
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

  if (!agent) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text>智能体不存在</Text>
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
    try {
      const newMsgs = await replyOnce({
        systemPrompt: agent.systemPrompt,
        history,
        settings,
        ctx: nowContext(),
        recentMessages: fresh?.messages ?? [],
      });
      for (const m of newMsgs) appendMessage(agentId, m);
    } catch (e: any) {
      // 接口异常（额度超限/Key 无效/网络）时，把友好提示作为一条消息展示，不卡在"正在输入"
      appendMessage(agentId, {
        id: uid(),
        role: 'agent',
        type: 'text',
        text: e?.message ?? '（网络好像开小差了，稍后再发一条试试？）',
        createdAt: Date.now(),
      });
    } finally {
      setThinking(false);
    }
  };

  return (
    <ChatBackground wallpaper={agent.wallpaper ?? settings.wallpaper}>
      <StatusBar barStyle="dark-content" backgroundColor={Theme.bgDeep} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Avatar emoji={agent.avatar} uri={agent.avatarUri} color={agent.accentColor} size={36} />
        <View style={{ marginLeft: 10, flex: 1 }}>
          <Text style={styles.name}>{agent.name}</Text>
          <Text style={styles.status}>{thinking ? '正在输入…' : '在线'}</Text>
        </View>
        <TouchableOpacity
          style={styles.moreBtn}
          onPress={() => navigation.navigate('AgentEdit', { agentId: agent.id })}
        >
          <Text style={styles.moreText}>编辑</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ paddingVertical: 12 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              和 {agent.name} 的专属对话开始啦 💌{'\n'}随时发消息，Ta 会秒回你～
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <MessageBubble message={item} accentColor={agent.accentColor} />
        )}
      />

      {thinking ? (
        <View style={styles.typing}>
          <ActivityIndicator size="small" color={Theme.primary} />
          <Text style={styles.typingText}>{agent.name} 正在打字…</Text>
        </View>
      ) : null}

      <Composer value={input} onChange={setInput} onSend={send} placeholder={`和 ${agent.name} 说点什么…`} />
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
    height: 32,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  moreText: { fontSize: 14, fontWeight: '700', color: Theme.text, lineHeight: 18 },
  empty: { alignItems: 'center', marginTop: 60, paddingHorizontal: 40 },
  emptyText: { textAlign: 'center', color: Theme.textSub, lineHeight: 22 },
  typing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingBottom: 6,
  },
  typingText: { fontSize: 12, color: Theme.textSub },
});
