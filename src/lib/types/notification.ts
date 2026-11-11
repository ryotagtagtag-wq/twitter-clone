import type { Timestamp, FirestoreDataConverter } from 'firebase/firestore';

export type NotificationType = 'like' | 'repost' | 'reply' | 'quote' | 'follow';

export type Notification = {
  /** 通知受信者 UID */
  recipientId: string;
  /** アクション実行者 UID */
  actorId: string;
  /** 通知種別 */
  type: NotificationType;
  /** 対象ツイート ID (follow 時は null) */
  targetPostId: string | null;
  /** 既読フラグ */
  read: boolean;
  /** 作成時刻 */
  createdAt: Timestamp;
};

export type NotificationWithActor = Notification & {
  actor: {
    id: string;
    name: string;
    username: string;
    photoURL: string;
  };
  /** 対象ツイート (type が follow 以外の場合) */
  targetPost?: {
    id: string;
    text: string | null;
    createdBy: string;
    createdAt: Timestamp;
  };
};

export const notificationConverter: FirestoreDataConverter<Notification> = {
  toFirestore(notif) {
    return { ...notif };
  },
  fromFirestore(snapshot, options) {
    const data = snapshot.data(options);
    return { ...data } as Notification;
  }
};

/**
 * 決定的通知 ID 生成関数 (クライアント・API ルート共通利用)
 * 重複通知防止・冪等性確保のため使用
 */
export function generateNotificationId(
  type: NotificationType,
  actorId: string,
  targetId: string // targetPostId または recipientId (follow 時)
): string {
  switch (type) {
    case 'like':
    case 'repost':
    case 'reply':
    case 'quote':
      return `${type}_${actorId}_${targetId}`;
    case 'follow':
      return `follow_${actorId}_${targetId}`;
    default:
      // 型安全性のため exhaustive check
      const _exhaustive: never = type;
      return _exhaustive;
  }
}

/**
 * 通知 ID から構成要素をパース (デバッグ・管理用)
 */
export function parseNotificationId(notificationId: string): {
  type: NotificationType;
  actorId: string;
  targetId: string;
} | null {
  const parts = notificationId.split('_');
  if (parts.length !== 3) return null;

  const [type, actorId, targetId] = parts;
  if (!['like', 'repost', 'reply', 'quote', 'follow'].includes(type)) return null;

  return { type: type as NotificationType, actorId, targetId };
}