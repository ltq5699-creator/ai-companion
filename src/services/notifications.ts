import notifee, { AndroidImportance, TriggerType } from '@notifee/react-native';

const CHANNEL_ID = 'companion';

let channelReady = false;
async function ensureChannel() {
  if (channelReady) return;
  await notifee.createChannel({
    id: CHANNEL_ID,
    name: '伴侣消息',
    importance: AndroidImportance.HIGH,
    vibration: true,
  });
  channelReady = true;
}

/** Android 13+ 需要运行时申请通知权限，静默失败不影响聊天 */
export async function requestNotificationPermission() {
  try {
    await notifee.requestPermission();
    await ensureChannel();
  } catch (e) {
    console.warn('[notify] 申请通知权限失败（已忽略）', e);
  }
}

// 立即显示一条"新消息"通知
export async function showMessageNotification(title: string, body: string) {
  try {
    await ensureChannel();
    await notifee.displayNotification({
      title,
      body,
      android: {
        channelId: CHANNEL_ID,
        smallIcon: 'ic_launcher_foreground',
        pressAction: { id: 'default' },
      },
    });
  } catch (e) {
    console.warn('[notify] 展示通知失败（已忽略）', e);
  }
}

// 在指定时间触发一条通知（用于"随机主动发消息"的可见提醒）
export async function scheduleMessageNotification(
  id: string,
  title: string,
  body: string,
  timestamp: number
) {
  try {
    if (timestamp <= Date.now() + 5000) return;
    await ensureChannel();
    await notifee.createTriggerNotification(
      {
        id,
        title,
        body,
        android: {
          channelId: CHANNEL_ID,
          smallIcon: 'ic_launcher_foreground',
          pressAction: { id: 'default' },
        },
      },
      { type: TriggerType.TIMESTAMP, timestamp, alarmManager: true }
    );
  } catch (e) {
    // 高版本 Android 缺少精确闹钟权限等情况下降级为不弹通知，不影响聊天
    console.warn('[notify] 预约通知失败（已忽略）', e);
  }
}

export async function cancelAllNotifications() {
  try {
    await notifee.cancelTriggerNotifications();
  } catch {
    /* 老版本没有该 API，忽略 */
  }
  try {
    await notifee.cancelAllNotifications();
  } catch (e) {
    console.warn('[notify] 取消通知失败（已忽略）', e);
  }
}
