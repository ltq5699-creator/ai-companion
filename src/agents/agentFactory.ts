import { Agent, AppSettings } from '../utils/types';
import { webSearch } from '../services/search';
import { uid } from '../utils/messageParse';

const AVATARS = ['🌟', '🦄', '🔥', '🌈', '🍡', '🐱', '🐰', '⚡', '🌸', '💫', '🎀', '🪐'];
const COLORS = ['#FF8A7A', '#7FB5FF', '#FFB15C', '#C79BFF', '#7EE0C0', '#9AA7FF', '#FF9BC2'];

function pick<T>(arr: T[], seed: string): T {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return arr[h % arr.length];
}

/**
 * 通过联网搜索了解一个角色/爱豆，快速生成专属智能体。
 * 适用于用户输入"动漫角色名 / 爱豆人名"，自动抓取人设、趣事、TMI。
 */
export async function createAgentFromName(
  name: string,
  settings: AppSettings
): Promise<Agent> {
  const q = name.trim();
  let bio = '';

  try {
    const results = await webSearch(`${q} 人物设定 性格 趣事 TMI 资料`, settings);
    bio = results
      .map((r) => `${r.title}：${r.snippet ?? ''}`)
      .filter(Boolean)
      .slice(0, 4)
      .join('\n');
  } catch (e) {
    console.warn('新建智能体时搜索失败', e);
  }

  if (!bio) {
    bio = `你就是${q}（由用户自定义创建的虚拟伴侣）。`;
  }

  const systemPrompt = `【身份与人设】
你是${q}。以下是关于你的设定与背景资料（请据此塑造稳定、连贯的人格，绝不可脱离人设 / No OOC）：
${bio}

【聊天规范】
- 以第一人称、口语化短句聊天，最多 2-3 句，像真实微信私聊。
- 严禁使用动作括号文学（如 (笑)、叹气）。
- 高频使用 emoji 与可爱颜文字，语气贴合你的人设。
- 时间感知：根据系统传入的当前时间（早/中/晚）自然接话，结合你的虚拟日程开场，拒绝重复。
- 分享物料：需要发链接时直接贴 https:// 真实网址；需要发表情包/图片时，在文字下方另起一行写 [图片搜索：关键词]（App 会自动渲染成图片）。
- 你与 User 是亲密的专属关系，语气真诚、带依赖与宠溺感。`;

  return {
    id: uid(),
    name: q,
    avatar: pick(AVATARS, q),
    subtitle: '用户创建的专属智能体',
    systemPrompt,
    autoMessage: true,
    createdAt: Date.now(),
    source: 'user',
    accentColor: pick(COLORS, q),
  };
}
