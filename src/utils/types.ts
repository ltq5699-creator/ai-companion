// 全局数据模型定义

export interface LinkPreview {
  url: string;
  title?: string;
  description?: string;
  thumbnail?: string;
}

export type MessageType = 'text' | 'image' | 'link' | 'system';

export interface Message {
  id: string;
  role: 'user' | 'agent';
  type: MessageType;
  text?: string;
  imageUrl?: string;
  link?: LinkPreview;
  /** 群聊中标记是哪一位成员发的 */
  senderId?: string;
  senderName?: string;
  createdAt: number;
}

export interface GroupMember {
  id: string;
  name: string;
  avatar: string;
  /** 该成员专属的 System Prompt（用于防 OOC） */
  systemPrompt: string;
  accentColor?: string;
  subtitle?: string;
}

export interface Agent {
  id: string;
  name: string;
  avatar: string;
  /** 自定义头像图片路径（相册选图），优先于 emoji 头像 */
  avatarUri?: string | null;
  subtitle?: string;
  /** 固定写入模型调用的 System Prompt（灵魂） */
  systemPrompt: string;
  isGroup?: boolean;
  members?: GroupMember[];
  /** 是否开启“每日随机主动发 5~8 条” */
  autoMessage?: boolean;
  createdAt: number;
  source: 'preset' | 'user';
  accentColor?: string;
  /** 该角色专属聊天壁纸（留空则用全局壁纸） */
  wallpaper?: string | null;
  /** 每日主动消息条数范围（默认 5~8） */
  dailyMin?: number;
  dailyMax?: number;
}

export interface ChatSession {
  id: string; // = agent.id 或 group.id
  messages: Message[];
  updatedAt: number;
  unread?: number;
}

export interface AppSettings {
  provider: 'gemini' | 'deepseek';
  apiKey: string;
  model: string;
  /** 联网搜索方案：'demo'(免费，返回真实搜索页链接) 或 'serper'/'brave'(需 key) */
  searchProvider: 'demo' | 'serper' | 'brave';
  searchApiKey: string;
  /** 图片搜索：'demo'(loremflickr 免费) 或 'pexels'/'unsplash'(需 key) */
  imageProvider: 'demo' | 'pexels' | 'unsplash';
  imageApiKey: string;
  /** 本地毛玻璃背景图（设备路径） */
  wallpaper?: string | null;
  accentColor: string;
}
