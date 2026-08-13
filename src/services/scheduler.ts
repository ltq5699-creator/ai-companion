import AsyncStorage from '@react-native-async-storage/async-storage';
import { useStore } from '../store/useStore';
import { buildTimeContext } from '../agents/personas';
import { buildHistory, replyOnce } from './chatService';
import { showMessageNotification, scheduleMessageNotification, cancelAllNotifications } from './notifications';

// ============================================================================
// 主动消息调度器
// - 每天 5~8 条：4 个固定时段(7:30/12:30/18:00/22:30) 必发问候 + 1~4 条随机时段
// - 打开 App 时补发所有"已过时间但未发送"的槽位
// - 同时为未来槽位预约本地通知，关闭 App 也能收到提醒
// ============================================================================

interface Slot {
  ts: number;
  delivered: boolean;
  kind: 'anchor' | 'random';
}

const ANCHORS = [
  { h: 7, m: 30 },
  { h: 12, m: 30 },
  { h: 18, m: 0 },
  { h: 22, m: 30 },
];

const slotKey = (agentId: string, date: Date) =>
  `slots:${agentId}:${date.toISOString().slice(0, 10)}`;

function loadSlots(agentId: string, date: Date): Promise<Slot[] | null> {
  return AsyncStorage.getItem(slotKey(agentId, date)).then((s) => (s ? JSON.parse(s) : null));
}
function saveSlots(agentId: string, date: Date, slots: Slot[]): Promise<void> {
  return AsyncStorage.setItem(slotKey(agentId, date), JSON.stringify(slots));
}

// 生成 1~(randomCount) 个落在 8:00~23:00 的随机时间，避开固定时段 ±45 分钟
function randomSlots(randomCount: number, date: Date): Slot[] {
  const out: Slot[] = [];
  let guard = 0;
  while (out.length < randomCount && guard < 200) {
    guard++;
    const minutes = 8 * 60 + Math.floor(Math.random() * (23 * 60 - 8 * 60));
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    const ts = new Date(date).setHours(h, m, 0, 0);
    const near = ANCHORS.some((a) => Math.abs(a.h * 60 + a.m - (h * 60 + m)) < 45);
    if (near) continue;
    if (out.some((s) => Math.abs(s.ts - ts) < 30 * 60 * 1000)) continue;
    out.push({ ts, delivered: false, kind: 'random' });
  }
  return out;
}

// 规划当天槽位（已规划则直接返回）
export async function planDay(agentId: string, date = new Date()): Promise<Slot[]> {
  const existing = await loadSlots(agentId, date);
  if (existing && existing.length) return existing;

  const anchors: Slot[] = ANCHORS.map((a) => {
    const d = new Date(date);
    d.setHours(a.h, a.m, 0, 0);
    return { ts: d.getTime(), delivered: false, kind: 'anchor' };
  });

  // 条数：默认 5~8，可在角色卡里自定义
  const agent = useStore.getState().agents.find((a) => a.id === agentId);
  const min = Math.max(1, agent?.dailyMin ?? 5);
  const max = Math.max(min, agent?.dailyMax ?? 8);
  const total = min + Math.floor(Math.random() * (max - min + 1));

  const keptAnchors = anchors.slice(0, Math.min(anchors.length, total));
  const randomCount = Math.max(0, total - keptAnchors.length);
  const all = [...keptAnchors, ...randomSlots(randomCount, date)].sort((a, b) => a.ts - b.ts);
  await saveSlots(agentId, date, all);
  return all;
}

// 为未来槽位预约本地通知
export async function scheduleTodayNotifications(agentId: string, agentName: string, date = new Date()) {
  const slots = await planDay(agentId, date);
  const now = Date.now();
  for (let i = 0; i < slots.length; i++) {
    const s = slots[i];
    if (s.ts > now && !s.delivered) {
      await scheduleMessageNotification(
        `slot-${agentId}-${i}`,
        agentName,
        '给你发了一条消息，快来看看呀~ 💌',
        s.ts
      );
    }
  }
}

// 补发所有已过时间但未发送的槽位（App 打开时调用）
export async function runCatchUp(agentId: string, date = new Date()): Promise<void> {
  const { agents, sessions, settings, appendMessage } = useStore.getState();
  const agent = agents.find((a) => a.id === agentId);
  if (!agent || !agent.autoMessage) return;

  const slots = await planDay(agentId, date);
  const now = Date.now();

  // 只补发"最近一个已到时间但尚未发送"的槽位，避免一次 burst
  let target = -1;
  for (let i = 0; i < slots.length; i++) {
    if (slots[i].ts <= now && !slots[i].delivered) target = i;
  }
  if (target < 0) return;

  const s = slots[target];
  const slotDate = new Date(s.ts);
  const ctx = buildTimeContext(slotDate);
  const greeting = s.kind === 'anchor';

  const newMsgs = await replyOnce({
    systemPrompt: agent.systemPrompt,
    history: buildHistory(sessions[agentId]),
    settings,
    ctx,
    greeting,
  });

  for (const m of newMsgs) appendMessage(agentId, m);

  const preview = newMsgs.find((m) => m.type === 'text')?.text ?? '给你发了一张图 📷';
  await showMessageNotification(agent.name, preview.slice(0, 80));

  slots[target].delivered = true;
  await saveSlots(agentId, date, slots);
}

// 应用启动 / 回到前台时：规划 + 补发 + 预约通知
export async function bootstrapSchedules() {
  const { agents } = useStore.getState();
  // 通知先整体清空一次，再按 agent 逐个重排，避免互相覆盖
  await cancelAllNotifications();
  for (const a of agents) {
    if (a.autoMessage && !a.isGroup) {
      await planDay(a.id);
      await runCatchUp(a.id);
      await scheduleTodayNotifications(a.id, a.name);
    }
  }
}

// ============================================================================
// 前台心跳：App 开着的时候，到点也要能自然地"叮"一条过来
// 每 60 秒检查一次是否有已到时间但未发送的槽位
// ============================================================================
let ticker: ReturnType<typeof setInterval> | null = null;

export function startForegroundTicker(intervalMs = 60 * 1000) {
  if (ticker) return;
  ticker = setInterval(async () => {
    const { agents } = useStore.getState();
    for (const a of agents) {
      if (a.autoMessage && !a.isGroup) {
        try {
          await runCatchUp(a.id);
        } catch {
          // 网络/Key 异常时静默跳过，下一轮再试
        }
      }
    }
  }, intervalMs);
}

export function stopForegroundTicker() {
  if (ticker) {
    clearInterval(ticker);
    ticker = null;
  }
}
