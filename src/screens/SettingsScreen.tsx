import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  StatusBar,
  Alert,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { useStore } from '../store/useStore';
import { Theme } from '../theme';

const SWATCHES = ['#FF8A7A', '#7FB5FF', '#FFB15C', '#C79BFF', '#7EE0C0', '#FF9BC2'];

function Segment<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.segment}>
      {options.map((o) => (
        <TouchableOpacity
          key={o.value}
          style={[styles.segItem, value === o.value && styles.segActive]}
          onPress={() => onChange(o.value)}
        >
          <Text style={[styles.segText, value === o.value && styles.segTextActive]}>{o.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export function SettingsScreen() {
  const settings = useStore((s) => s.settings);
  const update = useStore((s) => s.updateSettings);
  const resetSession = useStore((s) => s.resetSession);
  const agents = useStore((s) => s.agents);

  const pickWallpaper = async () => {
    try {
      const res = await launchImageLibrary({ mediaType: 'photo', selectionLimit: 1 });
      if (res.didCancel || !res.assets?.length) return;
      const uri = res.assets[0].uri;
      if (uri) update({ wallpaper: uri });
    } catch (e) {
      console.warn('选择壁纸失败', e);
    }
  };

  const clearAll = () => {
    Alert.alert('清空会话', '确定清空所有聊天记录？', [
      { text: '取消', style: 'cancel' },
      {
        text: '清空',
        style: 'destructive',
        onPress: () => agents.forEach((a) => resetSession(a.id)),
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <StatusBar barStyle="dark-content" backgroundColor={Theme.bgDeep} />
      <View style={styles.header}>
        <Text style={styles.title}>设置</Text>
        <Text style={styles.subtitle}>配置模型、搜索与外观</Text>
      </View>

      <Card title="大模型">
        <Row label="服务商">
          <Segment
            options={[
              { label: 'Gemini', value: 'gemini' },
              { label: 'Deepseek', value: 'deepseek' },
            ]}
            value={settings.provider}
            onChange={(v) => {
              update({ provider: v });
              if (v === 'gemini' && !settings.model.startsWith('gemini'))
                update({ model: 'gemini-1.5-flash' });
              if (v === 'deepseek' && !settings.model.startsWith('deepseek'))
                update({ model: 'deepseek-chat' });
            }}
          />
        </Row>
        <Row label="API Key">
          <TextInput
            style={styles.input}
            secureTextEntry
            value={settings.apiKey}
            onChangeText={(t) => update({ apiKey: t })}
            placeholder="粘贴你的 Key"
            placeholderTextColor={Theme.textSub}
          />
        </Row>
        <Row label="模型名">
          <TextInput
            style={styles.input}
            value={settings.model}
            onChangeText={(t) => update({ model: t })}
            placeholder="gemini-1.5-flash / deepseek-chat"
            placeholderTextColor={Theme.textSub}
          />
        </Row>
        <Text style={styles.hint}>
          Gemini Key：aistudio.google.com · Deepseek Key：platform.deepseek.com（均可免费额度）
        </Text>
      </Card>

      <Card title="联网搜索">
        <Row label="方案">
          <Segment
            options={[
              { label: '免费Demo', value: 'demo' },
              { label: 'Serper', value: 'serper' },
              { label: 'Brave', value: 'brave' },
            ]}
            value={settings.searchProvider}
            onChange={(v) => update({ searchProvider: v })}
          />
        </Row>
        {settings.searchProvider !== 'demo' && (
          <Row label="搜索 Key">
            <TextInput
              style={styles.input}
              secureTextEntry
              value={settings.searchApiKey}
              onChangeText={(t) => update({ searchApiKey: t })}
              placeholder="可选，填了更精准"
              placeholderTextColor={Theme.textSub}
            />
          </Row>
        )}
        <Text style={styles.hint}>Demo 模式无需 Key，直接返回 YouTube/Spotify/X 的真实搜索链接。</Text>
      </Card>

      <Card title="图片搜索">
        <Row label="方案">
          <Segment
            options={[
              { label: '免费Demo', value: 'demo' },
              { label: 'Pexels', value: 'pexels' },
              { label: 'Unsplash', value: 'unsplash' },
            ]}
            value={settings.imageProvider}
            onChange={(v) => update({ imageProvider: v })}
          />
        </Row>
        {settings.imageProvider !== 'demo' && (
          <Row label="图片 Key">
            <TextInput
              style={styles.input}
              secureTextEntry
              value={settings.imageApiKey}
              onChangeText={(t) => update({ imageApiKey: t })}
              placeholder="可选"
              placeholderTextColor={Theme.textSub}
            />
          </Row>
        )}
        <Text style={styles.hint}>Demo 使用 loremflickr 关键词真实图片，免费无需 Key。</Text>
      </Card>

      <Card title="外观">
        <Row label="全局壁纸">
          <TouchableOpacity style={styles.pickBtn} onPress={pickWallpaper}>
            <Text style={styles.pickText}>{settings.wallpaper ? '更换图片' : '选择图片'}</Text>
          </TouchableOpacity>
          {settings.wallpaper ? (
            <TouchableOpacity onPress={() => update({ wallpaper: null })}>
              <Text style={styles.clearText}>清除</Text>
            </TouchableOpacity>
          ) : null}
        </Row>
        <View style={styles.swatches}>
          {SWATCHES.map((c) => (
            <TouchableOpacity
              key={c}
              onPress={() => update({ accentColor: c })}
              style={[
                styles.swatch,
                { backgroundColor: c },
                settings.accentColor === c && styles.swatchActive,
              ]}
            />
          ))}
        </View>
      </Card>

      <TouchableOpacity style={styles.danger} onPress={clearAll}>
        <Text style={styles.dangerText}>清空所有会话记录</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={{ flex: 1, alignItems: 'flex-end' }}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.bg },
  header: { paddingTop: 50, paddingHorizontal: 20, paddingBottom: 10 },
  title: { fontSize: 28, fontWeight: '800', color: Theme.text },
  subtitle: { fontSize: 13, color: Theme.textSub, marginTop: 2 },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 14,
    marginTop: 14,
    borderRadius: 18,
    padding: 16,
  },
  cardTitle: { fontSize: 15, fontWeight: '800', color: Theme.text, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  rowLabel: { fontSize: 14, color: Theme.text, width: 80 },
  input: {
    flex: 1,
    backgroundColor: Theme.bg,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    color: Theme.text,
    borderWidth: 1,
    borderColor: Theme.bubbleAgentBorder,
  },
  hint: { fontSize: 11, color: Theme.textSub, marginTop: 6, lineHeight: 16 },
  segment: { flexDirection: 'row', gap: 6 },
  segItem: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: Theme.bg,
    borderWidth: 1,
    borderColor: Theme.bubbleAgentBorder,
  },
  segActive: { backgroundColor: Theme.primary, borderColor: Theme.primary },
  segText: { fontSize: 12, color: Theme.text },
  segTextActive: { color: '#fff', fontWeight: '700' },
  pickBtn: { backgroundColor: Theme.primarySoft, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
  pickText: { color: Theme.primaryDark, fontWeight: '700', fontSize: 13 },
  clearText: { color: Theme.textSub, fontSize: 12, marginLeft: 10 },
  swatches: { flexDirection: 'row', gap: 12, marginTop: 10 },
  swatch: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: '#fff' },
  swatchActive: { borderColor: Theme.text, transform: [{ scale: 1.12 }] },
  danger: {
    marginHorizontal: 14,
    marginTop: 20,
    backgroundColor: '#FFEAE6',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  dangerText: { color: Theme.primaryDark, fontWeight: '700' },
});
