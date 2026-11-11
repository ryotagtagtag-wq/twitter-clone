import type { Timestamp, FirestoreDataConverter } from 'firebase/firestore';

export type Conversation = {
  /** 参加者 UID 配列 (固定 2 名、順不同) */
  participants: [string, string];
  /** 最後のメッセージ本文 (プレビュー用) */
  lastMessage: string;
  /** 最後のメッセージ送信時刻 */
  lastMessageAt: Timestamp;
  /** 未読数マップ: { [uid]: number } */
  unread: Record<string, number>;
  /** 作成時刻 */
  createdAt: Timestamp;
  /** 更新時刻 (最後のメッセージ追加時) */
  updatedAt: Timestamp;
};

export type ConversationWithParticipant = Conversation & {
  /** 相手ユーザー情報 (自分の UID を除く) */
  otherUser: {
    id: string;
    name: string;
    username: string;
    photoURL: string;
  };
};

export const conversationConverter: FirestoreDataConverter<Conversation> = {
  toFirestore(conv) {
    return { ...conv };
  },
  fromFirestore(snapshot, options) {
    const data = snapshot.data(options);
    return { ...data } as Conversation;
  }
};