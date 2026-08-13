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

  const clean = (s: string) => (s ?? 'unknown').replace(/https?:\/\/\S+/g, '(链接已省略)');

  if (settings.provider === 'deepseek') {
    if (!settings.apiKey) {
      return '⚠️ 还没有配置大模型 API Key，先去「设置」里填一下 Key 我再陪你聊呀~';
    }
    try {
      return await deepseekLoop(systemPrompt, history, settings);
    } catch (e: any) {
      console.error('[LLM] Deepseek 调用失败', e);
      throw new Error(clean(e?.message));
    }
  }

  // Gemini / GLM 通道：填了 GLM Key 优先走智谱（国内直连、免费、不受 Google 限流影响），
  // GLM 失败或未配置时走 Gemini 兜底
  let glmErr: string | null = null;
  if (settings.glmApiKey) {
    try {
      return await glmLoop(systemPrompt, history, settings);
    } catch (e: any) {
      glmErr = e?.message ?? 'unknown';
      console.warn('[LLM] GLM 通道失败，尝试 Gemini 兜底', e);
    }
  }

  if (!settings.apiKey) {
    if (glmErr) throw new Error(clean(glmErr));
    return '⚠️ 还没有配置大模型 API Key，先去「设置」里填一下 Key 我再陪你聊呀~';
  }

  try {
    return await geminiLoop(systemPrompt, history, settings);
  } catch (e: any) {
    console.error('[LLM] Gemini 调用失败', e);
    throw new Error(clean(e?.message));
  }
}

// ---------------------------------------------------------------------------
// 智谱 GLM（国内直连，glm-4-flash 系列免费）—— OpenAI 兼容接口
// ---------------------------------------------------------------------------
const GLM_MODELS = ['glm-4.5-flash', 'glm-4-flash'];

async function glmLoop(
  systemPrompt: string,
  history: ChatTurn[],
  settings: AppSettings
): Promise<string> {
  const url = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
  const messages: any[] = [{ role: 'system', content: systemPrompt }];
  for (const h of history) messages.push({ role: h.role, content: h.text });

  let lastErr = '';
  for (const model of GLM_MODELS) {
    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${settings.glmApiKey}`,
        },
        body: JSON.stringify({ model, messages, temperature: 0.9 }),
      });
      const data = await resp.json().catch(() => null);
      if (!data) {
        lastErr = `HTTP ${resp.status}`;
        continue;
      }
      if (data.error) {
        const msg = String(data.error.message || data.error.code || '');
        if (/鉴权|认证|token|api.?key|unauthorized|invalid|401/i.test(msg)) {
          throw new Error(`⚠️ GLM Key 可能无效\n💡 请确认在 open.bigmodel.cn 控制台复制的 Key 完整无误`);
        }
        lastErr = msg.slice(0, 40);
        continue; // 换下一个免费模型
      }
      const text = data.choices?.[0]?.message?.content;
      if (text) return text;
      lastErr = '空回复';
    } catch (e: any) {
      if (e?.message?.includes('GLM Key')) throw e;
      lastErr = '网络异常';
      continue;
    }
  }
  throw new Error(`GLM 通道暂时不通（${lastErr}）`);
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

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  for (const model of modelsToTry) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${settings.apiKey}`;
    // 每个模型最多试 2 次：第一次遇到"每分钟超限"时等 5 秒再抢一次空位
    // （共享梯子出口 IP 的限流是波动的，隔几秒重试常常能挤进去）
    for (let attempt = 0; attempt < 2; attempt++) {
      if (attempt > 0) await sleep(5000);
      try {
        const resp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await resp.json().catch(() => null);

        if (!data) {
          failures.push(`${model.replace('gemini-', '')}：返回异常（HTTP ${resp.status}）`);
          break;
        }

        if (data.error) {
          const msg = data.error.message || '';
          // Key 无效 → 换模型也没用，直接报错
          if (/api key|key invalid|permission|auth/i.test(msg)) {
            throw new Error(`⚠️ API Key 可能无效\n💡 请确认在 aistudio.google.com 创建的 Key 已完整复制`);
          }
          const isMinute = /per.?minute|rate/i.test(msg) && !/per.?day|daily/i.test(msg);
          // 每分钟超限且还没重试过 → 等 5 秒重试一次这个模型
          if (isMinute && attempt === 0) continue;
          // 记录原因，换下一个模型（每个模型额度独立）
          if (/per.?day|daily/i.test(msg)) sawDailyQuota = true;
          failures.push(`${model.replace('gemini-', '')}：${shortReason(msg)}`);
          break;
        }

        // 成功！正常处理回复
        const parts: any[] = data.candidates?.[0]?.content?.parts ?? [];
        const text = parts.filter((p) => p.text).map((p) => p.text).join('');
        return text || '（对方好像卡住了，再发一句试试？）';
      } catch (e: any) {
        if (e?.message?.includes('API Key')) throw e;
        if (attempt === 0) continue; // 网络抖动 → 重试一次
        failures.push(`${model.replace('gemini-', '')}：网络异常`);
        break;
      }
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
