import { AppSettings } from '../utils/types';

export interface SearchResult {
  title: string;
  url: string;
  snippet?: string;
}

// ============================================================================
// 联网搜索（多引擎聚合）
// demo 模式完全免费：返回真实可点击的搜索页链接（YouTube / Spotify / X），
// 大模型会从中挑选合适的链接贴进回复，因此无需任何 API Key 也能"分享真实链接"。
// 填入 Serper / Brave 的免费 Key 后可返回更精准的真实网页。
// ============================================================================

export async function webSearch(
  query: string,
  settings: AppSettings
): Promise<SearchResult[]> {
  const q = query.trim();
  if (!q) return [];

  if (settings.searchProvider === 'serper' && settings.searchApiKey) {
    try {
      return await serperSearch(q, settings.searchApiKey);
    } catch (e) {
      console.warn('Serper 搜索失败，回退 demo 模式', e);
    }
  }
  if (settings.searchProvider === 'brave' && settings.searchApiKey) {
    try {
      return await braveSearch(q, settings.searchApiKey);
    } catch (e) {
      console.warn('Brave 搜索失败，回退 demo 模式', e);
    }
  }
  return demoSearch(q);
}

function demoSearch(q: string): SearchResult[] {
  const enc = encodeURIComponent(q);
  return [
    {
      title: `▶ YouTube：${q}`,
      url: `https://www.youtube.com/results?search_query=${enc}`,
      snippet: `在 YouTube 上搜索「${q}」的最新视频`,
    },
    {
      title: `🎵 Spotify：${q}`,
      url: `https://open.spotify.com/search/${enc}`,
      snippet: `在 Spotify 上收听与「${q}」相关的音乐`,
    },
    {
      title: `𝕏 / Twitter：${q}`,
      url: `https://twitter.com/search?q=${enc}&f=live`,
      snippet: `在 X(Twitter) 上查看关于「${q}」的实时推文`,
    },
  ];
}

async function serperSearch(q: string, key: string): Promise<SearchResult[]> {
  const res = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: { 'X-API-KEY': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ q, gl: 'kr', hl: 'ko' }),
  });
  const data = await res.json();
  const items: any[] = data.organic ?? [];
  return items.slice(0, 5).map((it) => ({
    title: it.title,
    url: it.link,
    snippet: it.snippet,
  }));
}

async function braveSearch(q: string, key: string): Promise<SearchResult[]> {
  const res = await fetch(
    `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(q)}&count=5`,
    { headers: { Accept: 'application/json', 'X-Subscription-Token': key } }
  );
  const data = await res.json();
  const items: any[] = data.web?.results ?? [];
  return items.map((it) => ({ title: it.title, url: it.url, snippet: it.description }));
}

// ============================================================================
// 图片搜索
// demo 模式使用 loremflickr（免费、无需 Key，按关键词返回真实图片）。
// 填入 Pexels / Unsplash 的免费 Key 可获得更贴合"表情包/萌宠"的结果。
// ============================================================================

export async function imageSearch(
  query: string,
  settings: AppSettings
): Promise<string> {
  const q = query.trim().replace(/\s+/g, ',');
  if (settings.imageProvider !== 'demo' && settings.imageApiKey) {
    try {
      if (settings.imageProvider === 'pexels') return await pexelsImage(q, settings.imageApiKey);
      if (settings.imageProvider === 'unsplash') return await unsplashImage(q, settings.imageApiKey);
    } catch (e) {
      console.warn('图片 API 失败，回退 loremflickr', e);
    }
  }
  // 真实可加载的免费图片（按关键词）
  return `https://loremflickr.com/600/400/${q}`;
}

async function pexelsImage(q: string, key: string): Promise<string> {
  const res = await fetch(
    `https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&per_page=1`,
    { headers: { Authorization: key } }
  );
  const data = await res.json();
  return data?.photos?.[0]?.src?.medium ?? `https://loremflickr.com/600/400/${q}`;
}

async function unsplashImage(q: string, key: string): Promise<string> {
  const res = await fetch(
    `https://api.unsplash.com/photos/random?query=${encodeURIComponent(q)}&count=1`,
    { headers: { Authorization: `Client-ID ${key}` } }
  );
  const data = await res.json();
  const first = Array.isArray(data) ? data[0] : null;
  return first?.urls?.regular ?? `https://loremflickr.com/600/400/${q}`;
}
