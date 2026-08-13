import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Switch,
  Alert,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { useStore } from '../store/useStore';
import { Theme, Typography } from '../theme';
import { Avatar } from '../components/Avatar';

const EMOJI_CHOICES = ['🐶', '🐱', '🦊', '🐻', '🐼', '🐰', '🌸', '⭐️', '🔥', '🍀', '🎧', '🎬', '💎', '🌙'];
const COLOR_CHOICES = ['#FF8A7A', '#F5A25D', '#E8C05A', '#7BC49A', '#6FB3D2', '#9B8CE0', '#E58FB0', '#8E9AAF'];

/**
 * 角色卡编辑：改名 / 头像 / 简介 / 人设 Prompt / 主题色 / 专属壁纸 /
 * 每日主动消息开关与条数 / 清空聊天记录。
 */
export function AgentEditScreen({ route, navigation }: any) {
  const { agentId } = route.params;
  const agent = useStore((s) => s.agents.find((a) => a.id === agentId));
  const updateAgent = useStore((s) => s.updateAgent);
  const removeAgent = useStore((s) => s.removeAgent);
  const resetSession = useStore((s) => s.resetSession);

  const [name, setName] = useState(agent?.name ?? '');
  const [subtitle, setSubtitle] = useState(agent?.subtitle ?? '');
  const [prompt, setPrompt] = useState(agent?.systemPrompt ?? '');
  const [emoji, setEmoji] = useState(agent?.avatar ?? '🙂');
  const [avatarUri, setAvatarUri] = useState<string | null>(agent?.avatarUri ?? null);
  const [color, setColor] = useState(agent?.accentColor ?? Theme.primary);
  const [wallpaper, setWallpaper] = useState<string | null>(agent?.wallpaper ?? null);
  const [autoMessage, setAutoMessage] = useState(!!agent?.autoMessage);
  const [dailyMin, setDailyMin] = useState(String(agent?.dailyMin ?? 5));
  const [dailyMax, setDailyMax] = useState(String(agent?.dailyMax ?? 8));

  const isGroup = !!agent?.isGroup;
  const dirty = useMemo(() => !!agent, [agent]);

  if (!agent) {
    return (
      <View style={styles.container}>
        <Text style={{ padding: 30, color: Theme.textSub }}>角色不存在</Text>
      </View>
    );
  }

  const pick = async (target: 'avatar' | 'wallpaper') => {
    try {
      const res = await launchImageLibrary({ mediaType: 'photo', selectionLimit: 1 });
      if (res.didCancel || !res.assets?.length) return;
      const uri = res.assets[0].uri ?? null;
      if (!uri) return;
      if (target === 'avatar') setAvatarUri(uri);
      else setWallpaper(uri);
    } catch (e: any) {
      Alert.alert('选图失败', e?.message ?? '请检查相册权限');
    }
  };

  const save = () => {
    const min = Math.max(1, Math.min(20, parseInt(dailyMin, 10) || 5));
    const max = Math.max(min, Math.min(24, parseInt(dailyMax, 10) || 8));
    updateAgent(agent.id, {
      name: name.trim() || agent.name,
      subtitle: subtitle.trim(),
      systemPrompt: prompt,
      avatar: emoji,
      avatarUri,
      accentColor: color,
      wallpaper,
      autoMessage,
      dailyMin: min,
      dailyMax: max,
    });
    Alert.alert('已保存', '角色卡已更新 ✨', [{ text: '好', onPress: () => navigation.goBack() }]);
  };

  const clearHistory = () => {
    Alert.alert('清空聊天记录', `确定清空与「${agent.name}」的全部聊天记录吗？`, [
      { text: '取消', style: 'cancel' },
      { text: '清空', style: 'destructive', onPress: () => resetSession(agent.id) },
    ]);
  };

  const del = () => {
    Alert.alert('删除角色', `删除「${agent.name}」后聊天记录一并消失，确定吗？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: () => {
          removeAgent(agent.id);
          navigation.popToTop();
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Theme.bgDeep} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>角色卡</Text>
        <TouchableOpacity onPress={save} style={styles.saveBtn} disabled={!dirty}>
          <Text style={styles.saveText}>保存</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
        {/* 头像预览 */}
        <View style={styles.card}>
          <View style={styles.avatarRow}>
            <Avatar emoji={emoji} uri={avatarUri} color={color} size={72} />
            <View style={{ flex: 1, marginLeft: 14 }}>
              <TouchableOpacity style={[styles.smallBtn, { backgroundColor: color }]} onPress={() => pick('avatar')}>
                <Text style={styles.smallBtnText}>从相册选头像</Text>
              </TouchableOpacity>
              {!!avatarUri && (
                <TouchableOpacity style={styles.linkBtn} onPress={() => setAvatarUri(null)}>
                  <Text style={styles.linkText}>恢复 emoji 头像</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <Text style={styles.label}>emoji 头像</Text>
          <View style={styles.chips}>
            {EMOJI_CHOICES.map((e) => (
              <TouchableOpacity
                key={e}
                style={[styles.emojiChip, emoji === e && { borderColor: color, backgroundColor: color + '1A' }]}
                onPress={() => setEmoji(e)}
              >
                <Text style={{ fontSize: 20 }}>{e}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>主题色</Text>
          <View style={styles.chips}>
            {COLOR_CHOICES.map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.colorChip, { backgroundColor: c }, color === c && styles.colorChipActive]}
                onPress={() => setColor(c)}
              />
            ))}
          </View>
        </View>

        {/* 基本信息 */}
        <View style={styles.card}>
          <Text style={styles.label}>名字</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="角色名字" placeholderTextColor={Theme.textSub} />

          <Text style={styles.label}>一句话简介</Text>
          <TextInput
            style={styles.input}
            value={subtitle}
            onChangeText={setSubtitle}
            placeholder="例如：RIIZE 主舞 · 你的赛博伴侣"
            placeholderTextColor={Theme.textSub}
          />
        </View>

        {/* 人设 Prompt */}
        {!isGroup && (
          <View style={styles.card}>
            <Text style={styles.label}>人设 System Prompt（灵魂）</Text>
            <Text style={styles.hint}>
              这段文字每次对话都会原样注入模型。修改前建议先复制备份，改坏了会 OOC。
            </Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              value={prompt}
              onChangeText={setPrompt}
              multiline
              textAlignVertical="top"
              placeholder="在这里描述角色身份、语气红线、聊天逻辑…"
              placeholderTextColor={Theme.textSub}
            />
            <Text style={styles.counter}>{prompt.length} 字</Text>
          </View>
        )}

        {isGroup && (
          <View style={styles.card}>
            <Text style={styles.label}>群成员（各自独立人设，互不串味）</Text>
            {agent.members?.map((m) => (
              <View key={m.id} style={styles.memberRow}>
                <Avatar emoji={m.avatar} color={m.accentColor} size={36} />
                <View style={{ marginLeft: 10, flex: 1 }}>
                  <Text style={styles.memberName}>{m.name}</Text>
                  <Text style={styles.memberSub} numberOfLines={1}>
                    {m.subtitle}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* 专属壁纸 */}
        <View style={styles.card}>
          <Text style={styles.label}>专属聊天壁纸</Text>
          <Text style={styles.hint}>不设置则跟随「我的 - 全局壁纸」。</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
            <TouchableOpacity style={[styles.smallBtn, { backgroundColor: color, flex: 1 }]} onPress={() => pick('wallpaper')}>
              <Text style={styles.smallBtnText}>{wallpaper ? '换一张' : '选择图片'}</Text>
            </TouchableOpacity>
            {!!wallpaper && (
              <TouchableOpacity style={[styles.smallBtn, styles.ghostBtn, { flex: 1 }]} onPress={() => setWallpaper(null)}>
                <Text style={[styles.smallBtnText, { color: Theme.textSub }]}>清除</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* 主动消息 */}
        <View style={styles.card}>
          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>每天随机主动找我</Text>
              <Text style={styles.hint}>关闭后 TA 只在你说话时回复。</Text>
            </View>
            <Switch
              value={autoMessage}
              onValueChange={setAutoMessage}
              trackColor={{ true: color + '88', false: '#E6DAD5' }}
              thumbColor={autoMessage ? color : '#fff'}
            />
          </View>

          {autoMessage && (
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>每日最少</Text>
                <TextInput style={styles.input} value={dailyMin} onChangeText={setDailyMin} keyboardType="number-pad" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>每日最多</Text>
                <TextInput style={styles.input} value={dailyMax} onChangeText={setDailyMax} keyboardType="number-pad" />
              </View>
            </View>
          )}
        </View>

        {/* 危险操作 */}
        <View style={styles.card}>
          <TouchableOpacity style={styles.dangerRow} onPress={clearHistory}>
            <Text style={styles.dangerText}>清空聊天记录</Text>
          </TouchableOpacity>
          {agent.source === 'user' && (
            <TouchableOpacity style={[styles.dangerRow, { borderBottomWidth: 0 }]} onPress={del}>
              <Text style={[styles.dangerText, { color: '#D9534F' }]}>删除该角色</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
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
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 30, color: Theme.text, lineHeight: 32 },
  title: { flex: 1, fontSize: Typography.title, fontWeight: '800', color: Theme.text, textAlign: 'center' },
  saveBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: Theme.primary,
  },
  saveText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    shadowColor: Theme.shadow,
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 2,
  },
  avatarRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  label: { fontSize: 13, fontWeight: '700', color: Theme.text, marginTop: 10 },
  hint: { fontSize: 12, color: Theme.textSub, marginTop: 4, lineHeight: 17 },
  input: {
    marginTop: 8,
    backgroundColor: Theme.bg,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: Theme.text,
    borderWidth: 1,
    borderColor: Theme.bubbleAgentBorder,
  },
  textarea: { minHeight: 220, lineHeight: 21, fontSize: 13 },
  counter: { fontSize: 11, color: Theme.textSub, textAlign: 'right', marginTop: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  emojiChip: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.bg,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  colorChip: { width: 34, height: 34, borderRadius: 17, borderWidth: 3, borderColor: 'transparent' },
  colorChipActive: { borderColor: 'rgba(0,0,0,0.18)', transform: [{ scale: 1.08 }] },
  smallBtn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 14, alignItems: 'center' },
  ghostBtn: { backgroundColor: Theme.bg, borderWidth: 1, borderColor: Theme.bubbleAgentBorder },
  smallBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  linkBtn: { marginTop: 8, alignItems: 'center' },
  linkText: { color: Theme.textSub, fontSize: 12 },
  switchRow: { flexDirection: 'row', alignItems: 'center' },
  memberRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  memberName: { fontSize: 14, fontWeight: '700', color: Theme.text },
  memberSub: { fontSize: 12, color: Theme.textSub, marginTop: 2 },
  dangerRow: {
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Theme.bubbleAgentBorder,
  },
  dangerText: { fontSize: 14, color: Theme.primaryDark, fontWeight: '600' },
});
