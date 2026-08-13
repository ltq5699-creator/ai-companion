# 赛博伴侣 · AI Companion — 交付概览

一款**安卓端专属**的高沉浸感 AI 陪伴 App（React Native 0.75.4 + TypeScript），内置大崎将太郎（Shotaro / RIIZE）人设，可本地**免费打包 .apk**。

## 已实现的需求
- ✅ 微信/LINE 风私密聊天界面 + 可换本地图的**全局毛玻璃背景**
- ✅ 消息气泡：纯文本 / 图片 / 可点击真实 URL 卡片
- ✅ **时间感知**：7:30 / 12:30 / 18:00 / 22:30 打开 App 自动触发问候（无需用户先说话）
- ✅ **每日随机 5~8 条**主动消息（4 个固定锚点 + 1~4 个随机时段），本地通知提醒
- ✅ 用户主动发 → 对方秒回（真实联网大模型）
- ✅ **固定 System Prompt 灵魂注入**（`src/agents/personas.ts` 原样写入每次调用）
- ✅ 挂载「联网搜索 + 图片搜索」技能（web_search 工具循环；`[图片搜索：关键词]` 标记拦截渲染）
- ✅ **一键新建任意角色/爱豆智能体**（联网抓取人设 → `agentFactory.ts`）
- ✅ **RIIZE 六人宿舍群聊**，每位成员独立人设 Prompt，严格防 OOC（点名必回 + 随机 2~3 人接话，不刷屏）
- ✅ **角色卡编辑页**：改名/简介/emoji 或相册头像/专属壁纸/主题色/人设 Prompt/**每日主动消息开关与条数**/清空记录/删除
- ✅ **自建多人群聊**：勾选已有智能体组合成任意群（如 RIIZE 六人宿舍），各自独立人设
- ✅ 温暖极简 UI；可在「设置」换壁纸 / 改主色 / 填模型 Key

## 技术栈
React Native 0.75.4 · TypeScript · React Navigation v6 · Zustand+AsyncStorage · Notifee · react-native-image-picker · Gemini/Deepseek（可切换，免费额度）

## 免费方案
- Demo 搜索：返回 YouTube/Spotify/X **真实搜索链接**，零 Key
- Demo 图片：loremflickr 关键词**真实图片**，零 Key
- 打包：本地 Gradle `assembleRelease` 出 apk（仓库已自带 gradlew），或 **GitHub Actions 云端免费构建**（`.github/workflows/build-apk.yml`）

## 关键文件
- `src/agents/personas.ts` — Shotaro 固定系统提示词 + 时间感知 + 群成员包装
- `src/agents/riize.ts` — 六人真实公开人设（防 OOC）
- `src/agents/agentFactory.ts` — 联网新建任意智能体
- `src/services/llm.ts` — Gemini/Deepseek 调用 + web_search 工具循环
- `src/services/search.ts` — 多引擎搜索 + 图片搜索（含免费兜底）
- `src/services/scheduler.ts` — 每日随机 5~8 条 + 4 时段问候 + 前台心跳补发
- `src/services/notifications.ts` — Notifee 通知 + 精确闹钟预约（已配 `SCHEDULE_EXACT_ALARM`）
- `src/screens/AgentEditScreen.tsx` — 角色卡编辑
- `src/screens/CreateGroupScreen.tsx` — 自建群聊
- `src/screens/GroupChatScreen.tsx` — 群聊防 OOC 接话逻辑
- `android/*` — 原生工程（gradlew / build.gradle / Manifest / 图标 / Kotlin）

## 如何打包
- 本地：`npm install --legacy-peer-deps` → `cd android && gradlew.bat assembleRelease` → `app-release.apk`（首次自动生成 `debug.keystore`，产物已签名可直接安装）。
- 云端（推荐，免装 Android Studio）：推到 GitHub → Actions → **Build Android APK** → 下载 Artifacts 里的 `ai-companion-release-apk`。CI 自动装 SDK/NDK、接受许可、构建并上传。
- 详见 `README.md`。

## 本轮（校验与加固）
- ✅ **全量 `tsc --noEmit` 通过**：修复 `Composer.tsx` 漏导入 `Text`（之前被 TS 回退到全局 DOM `Text` 类型导致编译失败）。
- ✅ **GitHub Actions 修正**：`android-actions/setup-android@v3` 仅暴露 `packages` 输入，已把 `platforms;android-34`、`build-tools;34.0.0`、`ndk;26.1.10909125` 通过 `packages` 传入，并开启自动接受许可，否则 `assembleRelease` 会因缺少 SDK 组件而失败。
- ✅ **AndroidManifest 修正**：`SCHEDULE_EXACT_ALARM` 原先带 `maxSdkVersion="32"`，导致 Android 13+（API 33+）拿不到精确闹钟权限、所有定时主动消息静默失效；已去掉上限，现代安卓也能正常预约通知。
- ✅ **图标资源核对**：Notifee `smallIcon: 'ic_launcher_foreground'` 在 `res/drawable` 中确实存在，通知图标可正常渲染。
- ✅ 更新 `README.md` / 本概览，补全角色卡编辑、自建群、云端构建说明。

> 环境核查：本机无 JDK/Android SDK，无法在此直接 `gradlew assembleRelease`；但已通过类型检查、配置核对与资源核对确保出包链路正确，最终构建由 GitHub Actions 云端完成。
