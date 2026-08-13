import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  StatusBar,
  Alert,
} from 'react-native';
import { useStore } from '../store/useStore';
import { Theme, Typography } from '../theme';
import { Avatar } from '../components/Avatar';
import { uid } from '../utils/messageParse';
import { Agent, GroupMember } from '../utils/types';

/**
 * 自建群聊：勾选已有智能体（含自动生成的角色）组成一个群。
 * 每位成员沿用自己的 System Prompt，保证在群里也不 OOC。
 */
export function CreateGroupScreen({ navigation }: any) {
  const agents = useStore((s) => s.agents);
  const addAgent = useStore((s) => s.addAgent);

  const candidates = agents.filter((a) => !a.isGroup);
  const [selected, setSelected] = useState<string[]>([]);
  const [name, setName] = useState('');

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const create = () => {
    if (selected.length < 2) {
      Alert.alert('至少选 2 位', '群聊需要两位以上成员才有意思～');
      return;
    }
    const members: GroupMember[] = candidates
      .filter((a) => selected.includes(a.id))
      .map((a) => ({
        id: a.id,
        name: a.name,
        avatar: a.avatar,
        systemPrompt: a.systemPrompt,
        accentColor: a.accentColor,
        subtitle: a.subtitle,
      }));

    const group: Agent = {
      id: 'group_' + uid(),
      name: name.trim() || members.map((m) => m.name.split(' ')[0]).join('、'),
      avatar: '👥',
      subtitle: `${members.length} 位成员 · 自建群`,
      systemPrompt: '',
      isGroup: true,
      members,
      autoMessage: false,
      createdAt: Date.now(),
      source: 'user',
      accentColor: members[0]?.accentColor ?? Theme.primary,
    };

    addAgent(group);
    navigation.replace('GroupChat', { agentId: group.id });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Theme.bgDeep} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>发起群聊</Text>
        <TouchableOpacity onPress={create} style={styles.saveBtn}>
          <Text style={styles.saveText}>创建({selected.length})</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.nameBox}>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="群名称（留空自动生成）"
          placeholderTextColor={Theme.textSub}
        />
      </View>

      <FlatList
        data={candidates}
        keyExtractor={(a) => a.id}
        contentContainerStyle={{ paddingBottom: 40 }}
        ListHeaderComponent={<Text style={styles.sectionTitle}>选择成员</Text>}
        renderItem={({ item }) => {
          const on = selected.includes(item.id);
          return (
            <TouchableOpacity style={styles.row} onPress={() => toggle(item.id)} activeOpacity={0.7}>
              <View style={[styles.check, on && { backgroundColor: Theme.primary, borderColor: Theme.primary }]}>
                {on && <Text style={styles.checkMark}>✓</Text>}
              </View>
              <Avatar emoji={item.avatar} uri={item.avatarUri} color={item.accentColor} size={44} />
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.sub} numberOfLines={1}>
                  {item.subtitle}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <Text style={styles.empty}>还没有可选角色，先去「智能体」点 + 新建吧～</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.bg },
  header: {
    paddingTop: 46,
    paddingBottom: 12,
    paddingHorizontal: 14,
    backgroundColor: Theme.bgDeep,
    flexDirection: 'row',
    alignItems: 'center',
  },
  back: { width: 36, alignItems: 'center' },
  backText: { fontSize: 30, color: Theme.text, lineHeight: 32 },
  title: { flex: 1, fontSize: Typography.title, fontWeight: '800', color: Theme.text, textAlign: 'center' },
  saveBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 14, backgroundColor: Theme.primary },
  saveText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  nameBox: { paddingHorizontal: 16, paddingTop: 14 },
  input: {
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Theme.text,
    borderWidth: 1,
    borderColor: Theme.bubbleAgentBorder,
  },
  sectionTitle: { fontSize: 13, color: Theme.textSub, marginLeft: 20, marginTop: 18, marginBottom: 6 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 14,
    marginVertical: 5,
    padding: 12,
    borderRadius: 18,
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.6,
    borderColor: Theme.bubbleAgentBorder,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: { color: '#fff', fontSize: 13, fontWeight: '800' },
  name: { fontSize: 15, fontWeight: '700', color: Theme.text },
  sub: { fontSize: 12, color: Theme.textSub, marginTop: 2 },
  empty: { textAlign: 'center', color: Theme.textSub, marginTop: 60, paddingHorizontal: 40, lineHeight: 22 },
});
