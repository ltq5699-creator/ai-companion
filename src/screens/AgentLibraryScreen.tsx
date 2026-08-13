import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useStore } from '../store/useStore';
import { Theme } from '../theme';
import { Avatar } from '../components/Avatar';
import { createAgentFromName } from '../agents/agentFactory';
import { Alert } from 'react-native';

export function AgentLibraryScreen({ navigation }: any) {
  const agents = useStore((s) => s.agents);
  const settings = useStore((s) => s.settings);
  const addAgent = useStore((s) => s.addAgent);
  const removeAgent = useStore((s) => s.removeAgent);

  const [chooser, setChooser] = useState(false);
  const [modal, setModal] = useState(false);
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);

  const open = (a: any) => {
    navigation.navigate(a.isGroup ? 'GroupChat' : 'Chat', { agentId: a.id });
  };

  const create = async () => {
    const n = name.trim();
    if (!n || creating) return;
    setCreating(true);
    try {
      const a = await createAgentFromName(n, settings);
      addAgent(a);
      setModal(false);
      setName('');
      Alert.alert('创建成功', `已为你生成专属智能体「${a.name}」✨`);
    } catch (e: any) {
      Alert.alert('创建失败', e?.message ?? '请检查网络与 API Key');
    } finally {
      setCreating(false);
    }
  };

  const del = (a: any) => {
    Alert.alert('删除智能体', `确定删除「${a.name}」吗？`, [
      { text: '取消', style: 'cancel' },
      { text: '删除', style: 'destructive', onPress: () => removeAgent(a.id) },
    ]);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Theme.bgDeep} />
      <View style={styles.header}>
        <Text style={styles.title}>智能体库</Text>
        <Text style={styles.subtitle}>点右上角 + 新建角色或发起群聊</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setChooser(true)}>
          <Text style={styles.addText}>+</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={agents}
        keyExtractor={(a) => a.id}
        contentContainerStyle={{ paddingBottom: 30 }}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <TouchableOpacity
              style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}
              onPress={() => open(item)}
              onLongPress={() => navigation.navigate('AgentEdit', { agentId: item.id })}
            >
              <Avatar emoji={item.avatar} uri={item.avatarUri} color={item.accentColor} size={50} />
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.preview} numberOfLines={1}>
                  {item.subtitle}
                  {item.autoMessage ? ' · 每日主动找你' : ''}
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.navigate('AgentEdit', { agentId: item.id })}
              style={styles.editBtn}
            >
              <Text style={styles.editText}>编辑</Text>
            </TouchableOpacity>
            {item.source === 'user' && (
              <TouchableOpacity onPress={() => del(item)} style={styles.delBtn}>
                <Text style={styles.delText}>删除</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      />

      {/* + 号选择：新建角色 / 发起群聊 */}
      <Modal visible={chooser} transparent animationType="fade" onRequestClose={() => setChooser(false)}>
        <TouchableOpacity style={styles.mask} activeOpacity={1} onPress={() => setChooser(false)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>想做点什么？</Text>
            <TouchableOpacity
              style={styles.optionRow}
              onPress={() => {
                setChooser(false);
                setModal(true);
              }}
            >
              <Text style={styles.optionEmoji}>✨</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.optionTitle}>AI 生成新角色</Text>
                <Text style={styles.optionSub}>输入动漫角色 / 爱豆名字，联网抓取人设自动建卡</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.optionRow, { borderBottomWidth: 0 }]}
              onPress={() => {
                setChooser(false);
                navigation.navigate('CreateGroup');
              }}
            >
              <Text style={styles.optionEmoji}>👥</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.optionTitle}>发起群聊</Text>
                <Text style={styles.optionSub}>把多个角色拉进一个群，各说各话不串人设</Text>
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={modal} transparent animationType="slide" onRequestClose={() => setModal(false)}>
        <View style={styles.mask}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>新建智能体</Text>
            <Text style={styles.sheetTip}>输入动漫角色 / 爱豆人名，App 会自动联网了解其人设与趣事。</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="例如：五条悟 / 张艺兴 / 初音未来"
              placeholderTextColor={Theme.textSub}
              autoFocus
            />
            <View style={styles.sheetBtns}>
              <TouchableOpacity style={styles.cancel} onPress={() => setModal(false)}>
                <Text style={{ color: Theme.textSub }}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirm} onPress={create} disabled={creating}>
                {creating ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={{ color: '#fff', fontWeight: '700' }}>生成</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.bg },
  header: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 14,
    backgroundColor: Theme.bgDeep,
  },
  title: { fontSize: 28, fontWeight: '800', color: Theme.text },
  subtitle: { fontSize: 13, color: Theme.textSub, marginTop: 2 },
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: '#fff',
    marginHorizontal: 14,
    marginVertical: 5,
    borderRadius: 18,
  },
  name: { fontSize: 16, fontWeight: '700', color: Theme.text },
  preview: { fontSize: 12, color: Theme.textSub, marginTop: 3 },
  editBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Theme.bg,
    borderRadius: 12,
    marginRight: 8,
  },
  editText: { color: Theme.textSub, fontSize: 12, fontWeight: '700' },
  delBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#FFEAE6', borderRadius: 12 },
  delText: { color: Theme.primaryDark, fontSize: 12, fontWeight: '700' },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Theme.bubbleAgentBorder,
  },
  optionEmoji: { fontSize: 26 },
  optionTitle: { fontSize: 15, fontWeight: '700', color: Theme.text },
  optionSub: { fontSize: 12, color: Theme.textSub, marginTop: 3, lineHeight: 17 },
  mask: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', padding: 20, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  sheetTitle: { fontSize: 20, fontWeight: '800', color: Theme.text },
  sheetTip: { fontSize: 13, color: Theme.textSub, marginTop: 8, lineHeight: 19 },
  input: {
    marginTop: 14,
    backgroundColor: Theme.bg,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Theme.text,
    borderWidth: 1,
    borderColor: Theme.bubbleAgentBorder,
  },
  sheetBtns: { flexDirection: 'row', gap: 12, marginTop: 16 },
  cancel: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 14, backgroundColor: Theme.bg },
  confirm: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 14, backgroundColor: Theme.primary },
});
