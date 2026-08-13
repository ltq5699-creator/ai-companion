# 赛博伴侣 · AI Companion（React Native / Android）

一款**安卓端专属**的高沉浸感 AI 陪伴 App：内置大崎将太郎（Shotaro / RIIZE）人设，支持微信/LINE 风格私密聊天、毛玻璃壁纸、时间感知主动问候、每日随机 5~8 条主动消息、真实 URL 分享、图片表情包渲染；并可**一键新建任意动漫/爱豆智能体**、**自建多人群聊（严格防 OOC）**。

全部代码可**完全免费打包成 .apk**：本地用 Gradle 出包，或推到 GitHub 用 **Actions 云端免费构建**（无需本机装 Android Studio）。Demo 搜索/图片模式零 Key 即可用。

---

## 一、技术栈

| 维度 | 选型 | 说明 |
| --- | --- | --- |
| 框架 | React Native 0.75.4（CLI / 原生） | 安卓专属，完全免费，可本地 Gradle 出包 |
| 语言 | TypeScript | 类型安全（已通过 `tsc --noEmit` 全量校验） |
| 导航 | React Navigation v6 | 底部 Tab + 栈 |
| 状态/存储 | Zustand + AsyncStorage | 轻量、自动持久化（消息/设置/智能体） |
| UI | 自定义组件 + 毛玻璃叠层 | 温暖极简、可换壁纸、可换主题色 |
| 大模型 | Gemini / Deepseek（可切换） | 直接在前端调用，隐私可控、免费额度充足 |
| 联网搜索 | 多引擎聚合（web_search 工具） | Demo 模式返回 YouTube/Spotify/X 真实链接；可接 Serper/Brave |
| 图片搜索 | `[图片搜索：关键词]` 标记拦截 | Demo 用 loremflickr 真实图片；可接 Pexels/Unsplash |
| 通知/调度 | Notifee | 本地通知 + 每日随机时间预约（精确闹钟） |
| 壁纸/头像 | react-native-image-picker | 选本地图做全局毛玻璃背景、智能体头像/壁纸 |

---

## 二、环境准备（一次性）

1. 安装 **Node.js 18+**（推荐 20）。
2. 安装 **JDK 17**（RN 0.75 要求；本地出包时需要，云端构建由 CI 自动装）。
3. 本地出包还需安装 **Android Studio**，SDK Manager 中安装：
   - Android SDK Platform 34
   - Android SDK Build-Tools 34.0.0
   - NDK 26.1.10909125（自动）
   - 勾选「Android SDK Command-line Tools」
4. 配置环境变量（Windows 示例）：
   ```bat
   set ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk
   set PATH=%PATH%;%ANDROID_HOME%\platform-tools;%ANDROID_HOME%\cmdline-tools\latest\bin
   ```
5. 准备一台安卓手机（开启「开发者选项 → USB 调试」）或模拟器。
   > 不想装 Android Studio？直接看 **第四节的「云端免费构建」**，把仓库推到 GitHub 即可一键出包。

---

## 三、启动（仓库已自带 gradlew，开箱即用）

本仓库是**完整可构建工程**：`android/` 原生配置、`gradlew` / `gradlew.bat` / `gradle-wrapper.jar`（Gradle 8.8）一应俱全，**无需再用脚手架生成**。

```bash
# 1) 安装依赖（已含全部三方库；用 legacy-peer-deps 避免 RN 依赖树告警）
npm install --legacy-peer-deps

# 2) 本地跑起来看效果（需连真机/模拟器）
npm run android
```

如果想从官方脚手架重建，也可：

```bash
npx react-native@0.75.4 init AiCompanion
xcopy /E /Y ai-companion\src AiCompanion\src
copy  ai-companion\android\app\build.gradle   AiCompanion\android\app\build.gradle
copy  ai-companion\android\app\src\main\AndroidManifest.xml  AiCompanion\android\app\src\main\AndroidManifest.xml
copy  ai-companion\.github\workflows\build-apk.yml  AiCompanion\.github\workflows\build-apk.yml
cd AiCompanion && npm install --legacy-peer-deps
```

---

## 四、打包 .apk（完全免费）

### 方式 1：本地出包

```bash
# 连接手机或启动模拟器后
cd android
gradlew.bat assembleRelease        # Windows（macOS/Linux 用 ./gradlew）
# 产物：android/app/build/outputs/apk/release/app-release.apk
```

- `release` 构建**复用自动生成的 `debug.keystore`**（写在 `app/build.gradle`，首次构建由 JDK 的 keytool 现场生成），因此产物是**已签名的、可直接安装**的 APK，完全不用手动配密钥。
- 如需发布到应用商店，用 Android Studio 生成自己的 `upload-keystore.jks`，替换 `release` 签名配置即可。
- 真机安装：`adb install android\app\build\outputs\apk\release\app-release.apk`

### 方式 2：云端免费构建（GitHub Actions，无需本机装 Android Studio）

仓库已内置流水线 `.github/workflows/build-apk.yml`：

1. 把工程推到 GitHub（公开仓库 Actions 分钟数免费）。
2. 仓库 **Actions** 页 → **Build Android APK** → **Run workflow**（或 push 到 `main`/`master` 自动触发）。
3. CI 会自动：安装 Node 18 + JDK 17 → 装 Android SDK（platform-34 / build-tools 34.0.0 / NDK 26.1.10909125，自动接受许可）→ `npm install` → `gradlew assembleRelease` → 上传 APK 产物（保留 30 天）。
4. 在 Workflow 运行页的 **Artifacts** 里下载 `ai-companion-release-apk` 即可。

> 提示：CI 里 `release` 同样复用自动生成的 `debug.keystore`，下载到的 APK 可直接侧载安装。

---

## 五、配置大模型 Key（免费额度）

打开 App → 「我的 → 设置」：

- **Gemini**：https://aistudio.google.com 免费申请 Key，模型填 `gemini-1.5-flash`。
- **Deepseek**：https://platform.deepseek.com 注册送额度，模型填 `deepseek-chat`。

不填 Key 时，App 会提示先配置；填后即可正常聊天与主动消息。

### 搜索 / 图片（默认免费 Demo，零 Key）
- 联网搜索选 `免费Demo`：直接返回 YouTube / Spotify / X 的**真实搜索链接**，模型会挑合适的贴进对话。
- 图片搜索选 `免费Demo`：用 loremflickr 按关键词返回**真实图片**（如 `[图片搜索：小狗 委屈 搞笑]`）。
- 想要更精准结果：把方案切到 `Serper`/`Brave`（搜索）或 `Pexels`/`Unsplash`（图片），填入对应免费 Key 即可，无需改代码。

---

## 六、核心功能映射

| 你的需求 | 实现位置 |
| --- | --- |
| 微信/LINE 风私密聊天 + 毛玻璃壁纸 | `screens/ChatScreen.tsx` + `components/ChatBackground.tsx` + `SettingsScreen` 选图 |
| 消息气泡（文本/图片/可点击 URL 卡片） | `components/MessageBubble.tsx` + `LinkCard.tsx` |
| 本地时间感知 · 4 个固定时段主动问候 | `services/scheduler.ts`（7:30/12:30/18:00/22:30）+ `agents/personas.ts` |
| 每日随机 5~8 条主动消息（可自定义条数） | `scheduler.ts` 的 `planDay()`（4 锚点 + 随机时段）；条数可在**角色卡**里用 `dailyMin`/`dailyMax` 改 |
| 用户发 → 对方秒回 | `ChatScreen.send()` → `chatService.replyOnce()` |
| 固定 System Prompt 灵魂注入 | `agents/personas.ts` 的人设 Prompt（原样写入每次调用） |
| 联网搜索 + 图片搜索技能挂载 | `services/llm.ts`（web_search 工具循环）+ `services/search.ts` |
| 一键新建任意角色智能体（联网抓人设） | `screens/AgentLibraryScreen.tsx` → `agents/agentFactory.ts` |
| **角色卡编辑**（改名/简介/头像/壁纸/主题色/人设/每日条数/清空/删除） | `screens/AgentEditScreen.tsx` + `store/useStore.ts` 的 `updateAgent` |
| **自建多人群聊**（勾选已有智能体组合） | `screens/CreateGroupScreen.tsx` → 生成 `members[]` 群 |
| RIIZE 六人宿舍群 · 防 OOC | `screens/GroupChatScreen.tsx` + `agents/riize.ts`（每人独立人设 Prompt，点名必回+随机 2~3 人接话） |
| 主动消息本地通知 + 精确闹钟 | `services/notifications.ts`（已声明 `SCHEDULE_EXACT_ALARM`，Android 12+ 可用） |

---

## 七、目录结构

```
ai-companion/
├─ .github/workflows/build-apk.yml   # 云端免费构建 APK（GitHub Actions）
├─ android/                          # 原生安卓工程（gradlew / build.gradle / Manifest / 图标）
├─ design/ui-preview.html            # 高保真 UI 预览（浏览器打开看效果，无需编译）
├─ src/
│  ├─ App.tsx                       # 根组件 + 前后台调度（AppState 心跳）
│  ├─ navigation/AppNavigator.tsx   # 导航（Tab + 栈）
│  ├─ screens/                      # 聊天列表/单聊/群聊/智能体库/角色卡编辑/自建群/设置
│  │   ├─ ChatListScreen.tsx
│  │   ├─ ChatScreen.tsx
│  │   ├─ GroupChatScreen.tsx
│  │   ├─ AgentLibraryScreen.tsx
│  │   ├─ AgentEditScreen.tsx       # 角色卡编辑
│  │   ├─ CreateGroupScreen.tsx     # 自建群聊
│  │   └─ SettingsScreen.tsx
│  ├─ components/                   # 气泡/链接卡/毛玻璃背景/头像/输入框
│  ├─ services/                     # llm / search / scheduler / chatService / notifications
│  ├─ agents/                       # personas(Shotaro灵魂) / riize(六人) / agentFactory(新建)
│  ├─ store/useStore.ts             # Zustand 状态与持久化
│  ├─ theme/index.ts                # 温暖极简视觉规范
│  └─ utils/                        # 类型 / 文本解析（图片标记、链接）
├─ app.json / index.js / package.json / tsconfig / babel / metro
└─ README.md
```

---

## 八、二次开发小贴士

- **改人设**：编辑 `src/agents/personas.ts` 对应人设 Prompt。
- **改主动消息频率**：在「角色卡编辑」页直接设 `每日主动消息 开关 + 条数（dailyMin/dailyMax，1~24）`；全局默认在 `scheduler.ts` 的 `planDay()` 里读这两个字段（缺省 5~8）。固定时段在 `ANCHORS` 数组。
- **加群成员 / 改群人设**：编辑 `src/agents/riize.ts`。
- **换主色**：「设置 → 外观」色块，或 `src/theme/index.ts` 的 `Theme.primary`。
- **接自己的后端**：把 `services/llm.ts` 的 `fetch` 换成你服务器的代理地址即可（Key 不过前端）。

> 说明：Shotaro / RIIZE 人设仅用于角色扮演聊天，内容保持友善、非涉性化，所有资料来自公开信息，不编造隐私。
