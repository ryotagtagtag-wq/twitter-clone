import type { Timestamp, FirestoreDataConverter } from 'firebase/firestore';
import type { ImagesPreview } from './file';
import type { User } from './user';

export type Tweet = {
  id: string;
  text: string | null;
  images: ImagesPreview | null;
  parent: { id: string; username: string } | null;
  userLikes: string[];
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp | null;
  userReplies: number;
  userRetweets: string[];

  // === Phase 1 追加フィールド (既存文書との互換性のためオプショナル・デフォルト付き) ===
  /** 引用リポスト元の tweetId (null なら通常ツイート) */
  quotedPostId?: string | null;
  /** 抽出済みハッシュタグ配列 (小文字正規化、# なし) */
  hashtags?: string[];
  /** 全文検索用連結テキスト (text + ハッシュタグ + メンション等、小文字化) */
  searchText?: string;
};

export type TweetWithUser = Tweet & { user: User };

export const tweetConverter: FirestoreDataConverter<Tweet> = {
  toFirestore(tweet) {
    return { ...tweet };
  },
  fromFirestore(snapshot, options) {
    const { id } = snapshot;
    const data = snapshot.data(options);

    // 既存文書との互換性: 新フィールドが無い場合はデフォルト値を付与
    return {
      id,
      ...data,
      quotedPostId: data.quotedPostId ?? null,
      hashtags: data.hashtags ?? [],
      searchText: data.searchText ?? ''
    } as Tweet;
  }
};
