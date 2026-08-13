// 解析 AI 回复中的特殊标记，供前端渲染

const IMG_TOKEN = /\[图片搜索[:：]\s*([^\]\n]+)\]/g;

export interface ParsedText {
  /** 去掉图片标记后的干净文本 */
  cleanText: string;
  /** 需要渲染成图片的搜索关键词列表 */
  imageQueries: string[];
}

export function parseImageTokens(text: string): ParsedText {
  const imageQueries: string[] = [];
  const clean = text.replace(IMG_TOKEN, (_m, kw) => {
    imageQueries.push(String(kw).trim());
    return '';
  });
  return { cleanText: clean.trim(), imageQueries };
}

// 提取文本中的 https 链接
const URL_RE = /(https?:\/\/[^\s）)】]+)/g;
export function extractUrls(text: string): string[] {
  return (text.match(URL_RE) ?? []).map((u) => u.replace(/[。，、]$/, ''));
}

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function formatTime(ts: number): string {
  const d = new Date(ts);
  const h = d.getHours().toString().padStart(2, '0');
  const m = d.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}
