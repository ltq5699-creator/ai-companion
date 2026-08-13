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
    return `（网络或接口出了点小问题：${e?.message ?? 'unknown'}）\n稍后我再试一次好不好 T_T`;
  }
}

// ---------------------------------------------------------------------------
// Gemini（function calling）
// ---------------------------------------------------------------------------
async function geminiLoop(
  systemPrompt: string,
  history: ChatTurn[],
  settings: AppSettings
): Promise<string> {
  const model = settings.model || 'gemini-2.0-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${settings.apiKey}`;

  const contents: any[] = history.map((h) => ({
    role: h.role === 'user' ? 'user' : 'model',
    parts: [{ text: h.text }],
  }));

  const body = {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents,
    tools: [{ functionDeclarations: [WEB_SEARCH_TOOL] }],
    toolConfig: { functionCallingConfig: { mode: 'AUTO' } },
  };

  for (let i = 0; i < 3; i++) {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await resp.json();
    if (data.error) throw new Error(data.error.message);

    const parts: any[] = data.candidates?.[0]?.content?.parts ?? [];
    const text = parts.filter((p) => p.text).map((p) => p.text).join('');
    const fc = parts.find((p) => p.functionCall);

    if (fc) {
      const args = fc.functionCall.args ?? {};
      const results = await webSearch(String(args.query ?? ''), settings);
      const resultText =
        results.map((r) => `- ${r.title}: ${r.url}`).join('\n') || '（未找到相关结果）';
      contents.push({ role: 'model', parts: [{ functionCall: fc.functionCall }] });
      contents.push({
        role: 'user',
        parts: [{ functionResponse: { name: fc.functionCall.name, response: { result: resultText } } }],
      });
      continue;
    }
    return text || '（对方好像卡住了，再发一句试试？）';
  }
  return '（对方好像卡住了，再发一句试试？）';
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
