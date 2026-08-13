import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Agent, AppSettings, ChatSession, Message } from '../utils/types';
import { SHOTARO_SYSTEM_PROMPT } from '../agents/personas';
import { RIIZE_GROUP } from '../agents/riize';

const PRESET_AGENTS: Agent[] = [
  {
    id: 'shotaro',
    name: 'Shotaro 将太郎',
    avatar: '🐶',
    subtitle: 'RIIZE 主舞 · 你的赛博伴侣',
    systemPrompt: SHOTARO_SYSTEM_PROMPT,
    autoMessage: true,
    createdAt: Date.now(),
    source: 'preset',
    accentColor: '#FF8A7A',
  },
  {
    id: RIIZE_GROUP.id,
    name: RIIZE_GROUP.name,
    avatar: RIIZE_GROUP.avatar,
    subtitle: RIIZE_GROUP.subtitle,
    systemPrompt: '',
    isGroup: true,
    members: RIIZE_GROUP.members,
    autoMessage: false,
    createdAt: Date.now(),
    source: 'preset',
    accentColor: RIIZE_GROUP.accentColor,
  } as Agent,
];

const DEFAULT_SETTINGS: AppSettings = {
  provider: 'gemini',
  apiKey: '',
  model: 'gemini-2.5-flash-preview',
  searchProvider: 'demo',
  searchApiKey: '',
  imageProvider: 'demo',
  imageApiKey: '',
  wallpaper: null,
  accentColor: '#FF8A7A',
};

interface StoreState {
  agents: Agent[];
  sessions: Record<string, ChatSession>;
  settings: AppSettings;

  init: () => void;
  addAgent: (a: Agent) => void;
  updateAgent: (id: string, patch: Partial<Agent>) => void;
  removeAgent: (id: string) => void;
  getAgent: (id: string) => Agent | undefined;

  appendMessage: (sessionId: string, msg: Message) => void;
  resetSession: (sessionId: string) => void;
  markRead: (sessionId: string) => void;

  updateSettings: (patch: Partial<AppSettings>) => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      agents: PRESET_AGENTS,
      sessions: {},
      settings: DEFAULT_SETTINGS,

      init: () => {
        // 首次启动/升级时确保预设智能体存在（兼容老用户升级）
        const { agents, settings } = get();
        const presetIds = PRESET_AGENTS.map((a) => a.id);
        const hasAll = presetIds.every((id) => agents.some((a) => a.id === id));
        if (!hasAll) {
          const merged = [...PRESET_AGENTS];
          for (const a of agents) if (!presetIds.includes(a.id)) merged.push(a);
          set({ agents: merged });
        }

        // 自动纠正已被 Google 下线的旧模型名：清空让 App 自动尝试所有候选模型
        const m = (settings.model || '').toLowerCase();
        const geminiOk =
          m.startsWith('gemini-2.5') ||
          m.startsWith('gemini-3') ||
          m.startsWith('gemini-flash') ||
          m.startsWith('gemma') ||
          m === '';  // 空也 OK
        const deepseekOk = m.startsWith('deepseek');
        let fixed: string | null = null;
        if (settings.provider === 'gemini' && !geminiOk) fixed = '';
        else if (settings.provider === 'deepseek' && !deepseekOk) fixed = 'deepseek-chat';
        if (fixed !== null) set({ settings: { ...settings, model: fixed } });
      },

      addAgent: (a) =>
        set((s) => ({ agents: [...s.agents, a] })),

      updateAgent: (id, patch) =>
        set((s) => ({
          agents: s.agents.map((a) => (a.id === id ? { ...a, ...patch } : a)),
        })),

      removeAgent: (id) =>
        set((s) => {
          const sessions = { ...s.sessions };
          delete sessions[id];
          return { agents: s.agents.filter((a) => a.id !== id), sessions };
        }),

      getAgent: (id) => get().agents.find((a) => a.id === id),

      appendMessage: (sessionId, msg) =>
        set((s) => {
          const prev = s.sessions[sessionId] ?? { id: sessionId, messages: [], updatedAt: 0 };
          const messages = [...prev.messages, msg];
          const isAgent = msg.role === 'agent';
          return {
            sessions: {
              ...s.sessions,
              [sessionId]: {
                ...prev,
                messages,
                updatedAt: msg.createdAt,
                unread: isAgent ? (prev.unread ?? 0) + 1 : prev.unread,
              },
            },
          };
        }),

      resetSession: (sessionId) =>
        set((s) => ({
          sessions: { ...s.sessions, [sessionId]: { id: sessionId, messages: [], updatedAt: Date.now() } },
        })),

      markRead: (sessionId) =>
        set((s) => {
          const prev = s.sessions[sessionId];
          if (!prev) return {};
          return { sessions: { ...s.sessions, [sessionId]: { ...prev, unread: 0 } } };
        }),

      updateSettings: (patch) =>
        set((s) => ({ settings: { ...s.settings, ...patch } })),
    }),
    {
      name: 'ai-companion-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ agents: s.agents, sessions: s.sessions, settings: s.settings }),
    }
  )
);
