import type { Timestamp, FirestoreDataConverter } from 'firebase/firestore';

export type Message = {
  /** 送信者 UID */
  senderId: string;
  /** テキスト本文 (最大 2000 字等、別途バリデーション) */
  text: string;
  /** 画像 URL (Storage パスまたはダウンロード URL、任意) */
  imageUrl: string | null;
  /** 送信時刻 */
  createdAt: Timestamp;
  /** 既読者 UID 配列 (送信者は自動的に含む) */
  readBy: string[];
};

export type MessageWithSender = Message & {
  sender: {
    id: string;
    name: string;
    username: string;
    photoURL: string;
  };
};

export const messageConverter: FirestoreDataConverter<Message> = {
  toFirestore(msg) {
    return { ...msg };
  },
  fromFirestore(snapshot, options) {
    const data = snapshot.data(options);
    return { ...data } as Message;
  }
};