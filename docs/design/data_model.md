# データモデル設計書 (Phase 1)

> **前提**: Firebase Spark プラン (無料) / Cloud Functions 不使用 / 通知送信は Vercel Next.js API ルート (Admin SDK) が担当

---

## 1. コレクション構成 (全体像)

| コレクション / サブコレクション | パス | ドキュメント ID | 用途 |
|--------------------------------|------|----------------|------|
| `users` | `/users/{uid}` | Auth UID | ユーザープロファイル (既存 + 変更なし) |
| `tweets` | `/tweets/{tweetId}` | 自動生成 | ツイート本文・メタデータ (既存 + 追加フィールド) |
| `bookmarks` | `/users/{uid}/bookmarks/{tweetId}` | tweetId | ブックマーク (既存・変更なし) |
| `stats` | `/users/{uid}/stats/stats` | 固定 `stats` | ユーザー集計配列 (既存・変更なし) |
| `conversations` | `/conversations/{conversationId}` | 自動生成 | DM 会話メタデータ (新規) |
| `messages` | `/conversations/{conversationId}/messages/{messageId}` | 自動生成 | DM メッセージ (新規) |
| `notifications` | `/notifications/{notificationId}` | 決定的 ID (下記) | 通知 (新規) |

---

## 2. 既存型の拡張・新規型定義

### 2.1 `Tweet` 拡張 (`src/lib/types/tweet.ts` へ追加)

```typescript
export type Tweet = {
  // 既存フィールド
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

  // === 追加フィールド ===
  /** 引用リポスト元の tweetId (null なら通常ツイート) */
  quotedPostId: string | null;
  /** 抽出済みハッシュタグ配列 (小文字正規化、# なし) */
  hashtags: string[];
  /** 全文検索用連結テキスト (text + ハッシュタグ + メンション等、小文字化) */
  searchText: string;
};
```

| フィールド | 型 | 必須 | 既定値 | 用途・備考 |
|-----------|-----|------|--------|-----------|
| `quotedPostId` | `string \| null` | 任意 | `null` | 引用リポスト時のみ設定。作成時のみ書き込み可、更新不可 |
| `hashtags` | `string[]` | 任意 | `[]` | クライアント側で抽出・正規化して書き込み。更新は本人のみ可 |
| `searchText` | `string` | 任意 | `''` | サーバーサイド検索 (Algolia 等) 導入前の暫定用。クライアント生成 |

> **互換性**: 既存文書にこれらフィールドがなくても `null` / `[]` / `''` として扱う。マイグレーションは**不要** (読み取り側でフォールバック)。

---

### 2.2 `User` (変更なし)

既存定義を維持。`following` / `followers` 配列の双方向更新ロジック (`manageFollow`) も現状維持。

---

### 2.3 `Bookmark` / `Stats` (変更なし)

既存定義を維持。

---

### 2.4 新規: `Conversation` (`src/lib/types/conversation.ts`)

```typescript
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

export const conversationConverter: FirestoreDataConverter<Conversation> = {
  toFirestore(conv) {
    return { ...conv };
  },
  fromFirestore(snapshot, options) {
    const data = snapshot.data(options);
    return { ...data } as Conversation;
  }
};
```

| フィールド | 型 | 必須 | 制約 |
|-----------|-----|------|------|
| `participants` | `[string, string]` | ✅ | 長さ 2 のタプル (順不同)。作成時のみ設定、更新不可 |
| `lastMessage` | `string` | ✅ | 空文字不可 |
| `lastMessageAt` | `Timestamp` | ✅ | - |
| `unread` | `Record<string, number>` | ✅ | キーは `participants` の 2 UID。初期値 `{ [uid1]: 0, [uid2]: 0 }` |
| `createdAt` | `Timestamp` | ✅ | `serverTimestamp()` |
| `updatedAt` | `Timestamp` | ✅ | `serverTimestamp()` (メッセージ追加毎に更新) |

**クエリ想定**:
- `where('participants', 'array-contains', uid)` → `orderBy('lastMessageAt', 'desc')` (会話一覧)

**必要インデックス** (firestore.indexes.json 追加分):
```json
{
  "collectionGroup": "conversations",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "participants", "arrayConfig": "CONTAINS" },
    { "fieldPath": "lastMessageAt", "order": "DESCENDING" }
  ]
}
```

---

### 2.5 新規: `Message` (`src/lib/types/message.ts`)

```typescript
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

export const messageConverter: FirestoreDataConverter<Message> = {
  toFirestore(msg) {
    return { ...msg };
  },
  fromFirestore(snapshot, options) {
    const data = snapshot.data(options);
    return { ...data } as Message;
  }
};
```

| フィールド | 型 | 必須 | 制約 |
|-----------|-----|------|------|
| `senderId` | `string` | ✅ | 親 `conversation.participants` に含まれること |
| `text` | `string` | ✅ | 空文字不可。最大長はクライアント/ルールで制限 |
| `imageUrl` | `string \| null` | 任意 | `null` 可。Storage `images/{userId}/{fileId}` パス |
| `createdAt` | `Timestamp` | ✅ | `serverTimestamp()` |
| `readBy` | `string[]` | ✅ | 初期値 `[senderId]`。受信者が既読にするたび `arrayUnion` で追加 |

**クエリ想定**:
- 親 `conversation` の `participants` 検証後に `orderBy('createdAt', 'asc')` で取得 (リアルタイム購読)

**インデックス**: 単一フィールド (`createdAt ASC`) のみで足りるため **複合インデックス不要** (サブコレクション内の並び順は自動)。

---

### 2.6 新規: `Notification` (`src/lib/types/notification.ts`)

```typescript
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

export const notificationConverter: FirestoreDataConverter<Notification> = {
  toFirestore(notif) {
    return { ...notif };
  },
  fromFirestore(snapshot, options) {
    const data = snapshot.data(options);
    return { ...data } as Notification;
  }
};
```

| フィールド | 型 | 必須 | 制約 |
|-----------|-----|------|------|
| `recipientId` | `string` | ✅ | 通知を受け取るユーザー |
| `actorId` | `string` | ✅ | アクションを実行したユーザー (`recipientId` と異なること) |
| `type` | `NotificationType` | ✅ | 5 種のいずれか |
| `targetPostId` | `string \| null` | ✅ | `follow` 以外は必須ツイート ID。`follow` 時は `null` |
| `read` | `boolean` | ✅ | 初期値 `false`。受信者が既読操作で `true` に更新 |
| `createdAt` | `Timestamp` | ✅ | `serverTimestamp()` |

**決定的ドキュメント ID 形式** (重複防止・冪等性確保):

| type | ID 形式 (例) |
|------|-------------|
| `like` | `like_{actorId}_{targetPostId}` |
| `repost` | `repost_{actorId}_{targetPostId}` |
| `reply` | `reply_{actorId}_{targetPostId}` (親ツイート ID) |
| `quote` | `quote_{actorId}_{targetPostId}` (引用元ツイート ID) |
| `follow` | `follow_{actorId}_{recipientId}` |

> **注意**: 同一アクションの重複通知を防ぐため、作成は **Vercel API ルート (Admin SDK) のみ** が行う。クライアントからは作成・削除・更新不可。

**クエリ想定**:
- `where('recipientId', '==', uid)` → `orderBy('createdAt', 'desc')` (通知一覧)
- `where('recipientId', '==', uid).where('read', '==', false)` (未読数カウント)

**必要インデックス** (firestore.indexes.json 追加分):
```json
{
  "collectionGroup": "notifications",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "recipientId", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "notifications",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "recipientId", "order": "ASCENDING" },
    { "fieldPath": "read", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

---

## 3. インデックス設計 (firestore.indexes.json 追加分のみ)

既存インデックスは **保持・変更しない**。以下を `indexes` 配列に **追加** する。

```json
// conversations
{
  "collectionGroup": "conversations",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "participants", "arrayConfig": "CONTAINS" },
    { "fieldPath": "lastMessageAt", "order": "DESCENDING" }
  ]
},
// notifications (通知一覧)
{
  "collectionGroup": "notifications",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "recipientId", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
},
// notifications (未読フィルタ)
{
  "collectionGroup": "notifications",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "recipientId", "order": "ASCENDING" },
    { "fieldPath": "read", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

> **bookmarks collectionGroup の `createdAt` インデックス** は検証報告書指摘の通り **既存 fieldOverrides に `createdAt` がないため追加必須**。以下を `fieldOverrides` 配列の `bookmarks` エントリ内 `indexes` に追加:
> ```json
> { "fieldPath": "createdAt", "order": "ASCENDING", "queryScope": "COLLECTION_GROUP" },
> { "fieldPath": "createdAt", "order": "DESCENDING", "queryScope": "COLLECTION_GROUP" }
> ```

---

## 4. 既存データとの差分・マイグレーション要否

| 項目 | 現状 | 設計後 | マイグレーション |
|------|------|--------|----------------|
| `tweets` フィールド | 既存 10 フィールド | +3 フィールド (`quotedPostId`, `hashtags`, `searchText`) | **不要** (読み取り側で `?? null` / `?? []` / `?? ''` フォールバック) |
| `users` | 変更なし | 変更なし | 不要 |
| `bookmarks` | 変更なし | 変更なし | 不要 (インデックス追加のみ) |
| `stats` | 変更なし | 変更なし | 不要 |
| `conversations` | 存在しない | 新規作成 | 新規コレクション (データなし) |
| `messages` | 存在しない | 新規作成 | 新規サブコレクション (データなし) |
| `notifications` | 存在しない | 新規作成 | 新規コレクション (データなし) |

> **注意**: `conversations` / `messages` / `notifications` は新規機能 (DM / 通知) 実装時に初めて書き込みが発生するため、既存ユーザーデータへの影響はゼロ。

---

## 5. ルール設計の要点 (firestore.rules / storage.rules へ反映)

### 5.1 `tweets` コレクション
- **create**: `createdBy == request.auth.uid` + バリデーション (text, images)
- **update**: **作成者以外も `userLikes` / `userRetweets` / `userReplies` 更新可能** (いいね・リポスト・リプライは他人の文書を更新するため)。制限は **フィールド単位** で行う:
  - `request.resource.data.diff(resource.data).affectedKeys()` が許可リスト (`userLikes`, `userRetweets`, `userReplies`, `hashtags`, `searchText`, `updatedAt`) の部分集合であること
  - 本人以外の変更は **配列への UID 追加/削除のみ** (`arrayUnion`/`arrayRemove` 相当) に限定
  - 本文 (`text`, `images`, `parent`, `quotedPostId`, `createdBy`, `createdAt`) は作成者のみ変更可
- **delete**: 作成者のみ
- **read**: 認証済みなら誰でも (公開ツイート前提)

### 5.2 `users` コレクション (ドキュメント直下)
- **自分の文書** (`request.auth.uid == uid`): 全フィールド読み書き可
- **他人の文書**: **読み取りのみ可**。書き込みは **`followers` 配列への自身 UID 追加/削除のみ** 許可 (フォロー/アンフォロー)
- `following` 配列は他人から書き込み不可 (自分の文書のみ更新)

### 5.3 `users/{uid}/bookmarks` / `users/{uid}/stats`
- **本人のみ** 読み書き可 (`request.auth.uid == uid`)

### 5.4 `conversations`
- **参加者のみ** (`request.auth.uid in resource.data.participants`) 読み書き可
- **create**: `request.resource.data.participants` に `request.auth.uid` を含むこと + 長さ 2
- **update**: `lastMessage`, `lastMessageAt`, `unread`, `updatedAt` のみ許可 (参加者自身のみ)

### 5.5 `messages` (サブコレクション)
- 親 `conversation` の `participants` に `request.auth.uid` を含むこと
- **create**: `senderId == request.auth.uid` のみ許可
- **update/delete**: 不許可 (メッセージ編集・削除は MVP 対象外。将来拡張時は `senderId == request.auth.uid` で許可)

### 5.6 `notifications`
- **recipientId 本人のみ** 読み取り可 (`request.auth.uid == resource.data.recipientId`)
- **クライアントからの create/update/delete: 全面禁止** (`allow create, update, delete: if false`)
- 作成・既読更新・削除は **Vercel API ルート (Admin SDK)** のみが実行

### 5.7 管理者判定
- ハードコード UID は **削除**。カスタムクレーム `admin: true` を推奨 (詳細は `open_questions.md`)

### 5.8 Storage (DM 画像)
- パス: `images/{userId}/{fileName}` (既存と同一)
- **DM 画像の読み取り**: 会話参加者のみ (`request.auth.uid in conversation.participants`) を Firestore 参照で検証
- **Spark プランでの Firestore 参照動作可否**: **未確認** (エミュレータでは動作するが、本番 Spark で `firestore.get()` が許可されるか要検証)

---

## 6. 実装側の変更ポイント (参考)

| ファイル | 変更内容 |
|----------|----------|
| `src/lib/types/tweet.ts` | `Tweet` 型に 3 フィールド追加、`tweetConverter` はそのまま (スプレッドで吸収) |
| `src/lib/types/conversation.ts` | 新規作成 |
| `src/lib/types/message.ts` | 新規作成 |
| `src/lib/types/notification.ts` | 新規作成 |
| `src/lib/firebase/collections.ts` | `conversationsCollection`, `messagesCollection`, `notificationsCollection` 追加 |
| `src/lib/firebase/utils.ts` | DM/通知用ユーティリティ関数追加 (将来実装時) |
| `firestore.rules` | 全面書き換え (既存ルール置き換え) |
| `storage.rules` | DM 画像読み取り条件追加 |
| `firestore.indexes.json` | 上記追加分のみマージ |

---

## 7. 未確認事項 (検証報告書準拠)

| # | 項目 | 理由 |
|---|------|------|
| 1 | **Storage ルールでの `firestore.get()` が Spark プランで動作するか** | DM 画像の参加者限定読み取りに Firestore 参照が必要。エミュレータでは動作するが、本番 Spark の制約 (1 日 5 万読み取り等) で失敗する可能性あり |
| 2 | **`conversations` の `participants` array-contains クエリのインデックス作成時間** | 新規インデックスは作成に数分〜数時間かかる。デプロイ順序に注意 |
| 3 | **通知の決定的 ID での重複排除 (冪等性) の実装詳細** | Vercel API ルート側で `setDoc` (merge: true) または `runTransaction` で実装予定。並行リクエスト時の挙動要確認 |
| 4 | **`userReplies` カウンタの増減と `messages` / `conversations` の整合性** | 現行 `manageReply` は `tweets.userReplies` のみ更新。DM 実装時は別カウンタ (`conversations.unread`) と分離されるため影響なし |

---

*作成日: 2026-11-11*  
*作成者: データ設計担当 (kai)*