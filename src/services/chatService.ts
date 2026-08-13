import { AppSettings, ChatSession, Message } from '../utils/types';
import { generateReply, ChatTurn } from './llm';
import { imageSearch } from './search';
import { parseImageTokens, uid } from '../utils/messageParse';
import { buildAgentSystemPrompt, buildTimeContext, TimeContext } from '../agents/personas';

// 将历史消息转成 LLM 可读的 turns（仅取文本类消息，最近 12 条）
export function buildHistory(session?: ChatSession): ChatTurn[] {
  if (!session) return [];
  return session.messages
    .filter((m) => m.type === 'text' && m.text)
    .slice(-12)
    .map((m) => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      text: m.text ?? '',
    }));
}

export interface ReplyParams {
  systemPrompt: string;
  history: ChatTurn[];
  settings: AppSettings;
  ctx: TimeContext;
  greeting?: boolean;
  senderId?: string;
  senderName?: string;
}

// 核心：调用大模型 + 解析图片标记，返回若干条待插入的消息（文本 + 图片）
export async function replyOnce(p: ReplyParams): Promise<Message[]> {
  const fullSystem = buildAgentSystemPrompt(p.systemPrompt, p.ctx, { greeting: p.greeting });
  const text = await generateReply({
    systemPrompt: fullSystem,
    history: p.history,
    settings: p.settings,
  });

  const { cleanText, imageQueries } = parseImageTokens(text);
  const msgs: Message[] = [];
  const base = Date.now();

  if (cleanText) {
    msgs.push({
      id: uid(),
      role: 'agent',
      type: 'text',
      text: cleanText,
      createdAt: base,
      senderId: p.senderId,
      senderName: p.senderName,
    });
  }

  for (const q of imageQueries) {
    try {
      const url = await imageSearch(q, p.settings);
      msgs.push({
        id: uid(),
        role: 'agent',
        type: 'image',
        imageUrl: url,
        createdAt: Date.now(),
        senderId: p.senderId,
        senderName: p.senderName,
      });
    } catch (e) {
      console.warn('图片搜索失败', e);
    }
  }
  return msgs;
}

// 便捷：基于当前时间构造上下文
export function nowContext(): TimeContext {
  return buildTimeContext(new Date());
}
