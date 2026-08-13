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
    // 去掉超长链接，保留核心错误信息
    const clean = raw.replace(/https?:\/\/\S+/g, '(链接已省略)');
    return clean;
  }
}

// Gemini 模型名候选列表（按优先级排序，自动逐一尝试）
const GEMINI_MODEL_FALLBACKS = [
  'gemini-2.5-flash-preview',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-flash-latest',
];

// ---------------------------------------------------------------------------
// Gemini（function calling）—— 自动尝试多个模型名
// ---------------------------------------------------------------------------
async function geminiLoop(
  systemPrompt: string,
  history: ChatTurn[],
  settings: AppSettings
): Promise<string> {
  // 用户指定的模型优先，否则用候选列表逐个试
  const userModel = settings.model || '';
  const modelsToTry = userModel ? [userModel, ...GEMINI_MODEL_FALLBACKS.filter(m => m !== userModel)] : GEMINI_MODEL_FALLBACKS;

  const contents: any[] = history.map((h) => ({
    role: h.role === 'user' ? 'user' : 'model',
    parts: [{ text: h.text }],
  }));

  const baseBody = {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents,
    tools: [{ functionDeclarations: [WEB_SEARCH_TOOL] }],
    toolConfig: { functionCallingConfig: { mode: 'AUTO' } },
  };

  let lastError = '';

  for (const model of modelsToTry) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${settings.apiKey}`;

    for (let attempt = 0; attempt < 2; attempt++) { // 每个模型最多试 2 次
      try {
        const resp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(baseBody),
        });
        const data = await resp.json();

        if (data.error) {
          const msg = data.error.message || JSON.stringify(data.error);
          lastError = `模型「${model}」失败：${msg}`;
          // 如果是 Key 无效（不是模型问题），直接报错不再试其他模型
          if (/api key|invalid|auth/i.test(msg)) {
            throw new Error(`⚠️ API Key 可能无效（Google 说：${msg}）\n💡 请确认你在 aistudio.google.com 创建的 Key 已完整复制`);
          }
          break; // 这个模型不行，试下一个
        }

        // 成功了！正常处理回复
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
          continue; // 继续当前模型的循环，等待最终文本回复
        }
        return text || '（对方好像卡住了，再发一句试试？）';
      } catch (e: any) {
        if (e?.message?.includes('API Key')) throw e; // Key 问题直接抛出
        lastError = e?.message || String(e);
      }
    }
  }

  // 所有模型都失败了
  throw new Error(`所有模型都试过了还是不行 😢\n${lastError}\n\n请把这段话截图发给我，我帮你查原因`);
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
