import { AppSettings } from '../utils/types';
import { webSearch } from './search';

export interface ChatTurn {
  role: 'user' | 'assistant';
  text: string;
}

// 联网搜索工具定义（OpenAPI schema，Gemini / Deepseek 通用）
const WEB_SEARCH_TOOL = {
  name: 'web_search',
  description:
    '搜索互联网，获取最新搞笑短视频、好听音乐、沙雕推文或资讯的真实链接（必须返回 https 链接）。当需要给 User 分享物料时调用。',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string', description: '搜索关键词，例如「搞笑小狗表情包」「newjeans 新歌」' },
    },
    required: ['query'],
  },
};

// ============================================================================
// 统一入口：注入 System Prompt + 历史 + web_search 工具循环（最多 3 轮）
// ============================================================================

export async function generateReply(opts: {
  systemPrompt: string;
  history: ChatTurn[];
  settings: AppSettings;
}): Promise<string> {
  const { systemPrompt, history, settings } = opts;

  if (!settings.apiKey) {
    return '⚠️ 还没有配置大模型 API Key，先去「设置」里填一下 Gemini 或 Deepseek 的 Key 我再陪你聊呀~';
  }

  try {
    if (settings.provider === 'gemini') {
      return await geminiLoop(systemPrompt, history, settings);
    }
    return await deepseekLoop(systemPrompt, history, settings);
  } catch (e: any) {
    console.error('[LLM] 调用失败', e);
    const raw = e?.message ?? 'unknown';
    const clean = raw.replace(/https?:\/\/\S+/g, '(链接已省略)');
    // 错误向上抛出，由调用方（聊天界面/调度器）决定如何展示，避免被当成对方回复
    throw new Error(clean);
  }
}

// ---------------------------------------------------------------------------
// Gemini —— 多模型自动接力（每个模型的每日免费额度相互独立）
// 默认先用 flash-lite（免费额度最高），额度用尽自动换下一个模型，用户无感知
// ---------------------------------------------------------------------------
const GEMINI_FALLBACKS = [
  'gemini-2.5-flash-lite', // 免费额度最高（30 RPM / 最多 1500 次每天）
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-2.5-flash-preview',
];

async function geminiLoop(
  systemPrompt: string,
  history: ChatTurn[],
  settings: AppSettings
): Promise<string> {
  const userModel = (settings.model || '').trim();
  const modelsToTry = userModel
    ? [userModel, ...GEMINI_FALLBACKS.filter((m) => m !== userModel)]
    : GEMINI_FALLBACKS;

  const contents: any[] = history.map((h) => ({
    role: h.role === 'user' ? 'user' : 'model',
    parts: [{ text: h.text }],
  }));

  const body = {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents,
  };

  let sawDailyQuota = false;
  const failures: string[] = [];

  // 把 Google 的英文错误翻译成一句话中文原因（用于诊断清单）
  const shortReason = (msg: string): string => {
    if (/per.?day|daily/i.test(msg)) return '今日额度用完';
    if (/per.?minute|rate/i.test(msg)) return '每分钟超限';
    if (/quota|exceeded|limit|resource.?exhausted|429/i.test(msg)) return '额度超限';
    if (/not found|does not exist|not support|deprecat/i.test(msg)) return '模型已下线';
    if (/location|region|country/i.test(msg)) return '当前网络地区不支持';
    const clean = msg.replace(/https?:\/\/\S+/g, '').slice(0, 40);
    return clean ? `其他：${clean}` : '未知错误';
  };

  for (const model of modelsToTry) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${settings.apiKey}`;
    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await resp.json().catch(() => null);

      if (!data) {
        failures.push(`${model.replace('gemini-', '')}：返回异常（HTTP ${resp.status}）`);
        continue;
      }

      if (data.error) {
        const msg = data.error.message || '';
        // Key 无效 → 换模型也没用，直接报错
        if (/api key|key invalid|permission|auth/i.test(msg)) {
          throw new Error(`⚠️ API Key 可能无效\n💡 请确认在 aistudio.google.com 创建的 Key 已完整复制`);
        }
        // 记录原因，换下一个模型（每个模型额度独立）
        if (/per.?day|daily/i.test(msg)) sawDailyQuota = true;
        failures.push(`${model.replace('gemini-', '')}：${shortReason(msg)}`);
        continue;
      }

      // 成功！正常处理回复
      const parts: any[] = data.candidates?.[0]?.content?.parts ?? [];
      const text = parts.filter((p) => p.text).map((p) => p.text).join('');
      return text || '（对方好像卡住了，再发一句试试？）';
    } catch (e: any) {
      if (e?.message?.includes('API Key')) throw e;
      failures.push(`${model.replace('gemini-', '')}：网络异常`);
      continue;
    }
  }

  // 所有模型都失败了：列出每个模型的具体原因（截图发给开发者可一眼定位）
  const report = failures.map((f) => `• ${f}`).join('\n');
  if (sawDailyQuota) {
    throw new Error(
      `🌙 今天的免费聊天次数用完啦~\n${report}\n\n💡 明天下午 3 点左右自动恢复；想马上继续聊的话，可以去 aistudio.google.com 新建一个项目再建一把新 Key（每把 Key 额度独立）`
    );
  }
  throw new Error(
    `😢 刚才几个模型都没接上，原因如下：\n${report}\n\n💡 等 30 秒再发一条试试；一直不行就把这段话截图发给我`
  );
}

// ---------------------------------------------------------------------------
// Deepseek（tools）
// ---------------------------------------------------------------------------
async function deepseekLoop(
  systemPrompt: string,
  history: ChatTurn[],
  settings: AppSettings
): Promise<string> {
  const url = 'https://api.deepseek.com/chat/completions';
  const messages: any[] = [{ role: 'system', content: systemPrompt }];
  for (const h of history) messages.push({ role: h.role, content: h.text });

  const tools = [{ type: 'function', function: WEB_SEARCH_TOOL }];

  for (let i = 0; i < 3; i++) {
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${settings.apiKey}`,
      },
      body: JSON.stringify({ model: settings.model || 'deepseek-chat', messages, tools, tool_choice: 'auto' }),
    });
    const data = await resp.json();
    if (data.error) throw new Error(data.error.message);

    const msg = data.choices?.[0]?.message;
    if (msg?.tool_calls?.length) {
      messages.push(msg); // 携带 tool_calls 的 assistant 消息
      for (const tc of msg.tool_calls) {
        let args: any = {};
        try {
          args = JSON.parse(tc.function.arguments || '{}');
        } catch {}
        const results = await webSearch(String(args.query ?? ''), settings);
        const resultText =
          results.map((r) => `- ${r.title}: ${r.url}`).join('\n') || '（未找到相关结果）';
        messages.push({ role: 'tool', tool_call_id: tc.id, content: resultText });
      }
      continue;
    }
    return msg?.content || '（对方好像卡住了，再发一句试试？）';
  }
  return '（对方好像卡住了，再发一句试试？）';
}
