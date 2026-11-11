# セキュリティルール テスト計画 (Phase 1)

> **目的**: `firestore.rules` / `storage.rules` の許可・拒否を **対 (ペア) で** 列挙し、Emulator で自動検証可能な形にする。

---

## 1. テスト実行環境

- **ツール**: Firebase Emulator Suite (Firestore, Auth, Storage)
- **フレームワーク**: Jest + `@firebase/rules-unit-testing` (v3 系)
- **実行コマンド**: `npm run test:rules` (package.json に追加予定)
- **前提**: `firebase.json` のエミュレータポート設定済み (Firestore: 18080, Auth: 9099, Storage: 9199)

---

## 2. テストケース一覧 (許可・拒否の対)

### 2.1 `tweets` コレクション

| # | 操作 | 条件 | 期待結果 | テスト ID |
|---|------|------|----------|-----------|
| 1 | **create** | 本人 (`createdBy == uid`), 有効データ | ✅ 許可 | `tweets-create-owner-ok` |
| 2 | **create** | 他人 (`createdBy != uid`) | ❌ 拒否 | `tweets-create-other-deny` |
| 3 | **create** | 本人だが `text` が 281 字以上 | ❌ 拒否 | `tweets-create-text-too-long` |
| 4 | **create** | 本人だが `images` 5 件以上 | ❌ 拒否 | `tweets-create-images-too-many` |
| 5 | **read** | 認証済みユーザー | ✅ 許可 | `tweets-read-auth-ok` |
| 6 | **read** | 未認証 | ❌ 拒否 | `tweets-read-unauth-deny` |
| 7 | **update** | 本人、本文 (`text`) 変更 | ✅ 許可 | `tweets-update-owner-text-ok` |
| 8 | **update** | 本人、配列 (`hashtags`) 変更 | ✅ 許可 | `tweets-update-owner-hashtags-ok` |
| 9 | **update** | **他人**、`userLikes` に自身 UID 追加 (いいね) | ✅ 許可 | `tweets-update-other-like-ok` |
| 10 | **update** | **他人**、`userRetweets` に自身 UID 追加 (リポスト) | ✅ 許可 | `tweets-update-other-retweet-ok` |
| 11 | **update** | **他人**、`userReplies` インクリメント (リプライ) | ✅ 許可 | `tweets-update-other-reply-ok` |
| 12 | **update** | **他人**、`text` 変更を試みる | ❌ 拒否 | `tweets-update-other-text-deny` |
| 13 | **update** | **他人**、`createdBy` 変更を試みる | ❌ 拒否 | `tweets-update-other-createdBy-deny` |
| 14 | **update** | **他人**、`userLikes` から**他人の** UID 削除を試みる | ❌ 拒否 | `tweets-update-other-remove-other-uid-deny` |
| 15 | **delete** | 本人 | ✅ 許可 | `tweets-delete-owner-ok` |
| 16 | **delete** | 他人 | ❌ 拒否 | `tweets-delete-other-deny` |

### 2.2 `users/{uid}` ドキュメント

| # | 操作 | 条件 | 期待結果 | テスト ID |
|---|------|------|----------|-----------|
| 17 | **read** | 本人 | ✅ 許可 | `users-read-owner-ok` |
| 18 | **read** | 他人 (認証済み) | ✅ 許可 | `users-read-other-ok` |
| 19 | **read** | 未認証 | ❌ 拒否 | `users-read-unauth-deny` |
| 20 | **write (create/update)** | 本人、全フィールド更新 | ✅ 許可 | `users-write-owner-all-ok` |
| 21 | **update** | **他人**、`followers` に自身 UID 追加 (フォロー) | ✅ 許可 | `users-update-other-follow-ok` |
| 22 | **update** | **他人**、`followers` から自身 UID 削除 (アンフォロー) | ✅ 許可 | `users-update-other-unfollow-ok` |
| 23 | **update** | **他人**、`followers` に**他人の** UID 追加を試みる | ❌ 拒否 | `users-update-other-add-other-uid-deny` |
| 24 | **update** | **他人**、`following` 変更を試みる | ❌ 拒否 | `users-update-other-following-deny` |
| 25 | **update** | **他人**、`bio` 等プロフィール変更を試みる | ❌ 拒否 | `users-update-other-profile-deny` |
| 26 | **delete** | あらゆるユーザー | ❌ 拒否 | `users-delete-deny` |

### 2.3 `users/{uid}/bookmarks` サブコレクション

| # | 操作 | 条件 | 期待結果 | テスト ID |
|---|------|------|----------|-----------|
| 27 | **read** | 本人 | ✅ 許可 | `bookmarks-read-owner-ok` |
| 28 | **read** | 他人 | ❌ 拒否 | `bookmarks-read-other-deny` |
| 29 | **create** | 本人 | ✅ 許可 | `bookmarks-create-owner-ok` |
| 30 | **create** | 他人 | ❌ 拒否 | `bookmarks-create-other-deny` |
| 31 | **delete** | 本人 | ✅ 許可 | `bookmarks-delete-owner-ok` |
| 32 | **delete** | 他人 | ❌ 拒否 | `bookmarks-delete-other-deny` |

### 2.4 `users/{uid}/stats` サブコレクション

| # | 操作 | 条件 | 期待結果 | テスト ID |
|---|------|------|----------|-----------|
| 33 | **read** | 本人 | ✅ 許可 | `stats-read-owner-ok` |
| 34 | **read** | 他人 | ❌ 拒否 | `stats-read-other-deny` |
| 35 | **write** | 本人 | ✅ 許可 | `stats-write-owner-ok` |
| 36 | **write** | 他人 | ❌ 拒否 | `stats-write-other-deny` |

### 2.5 `conversations` コレクション

| # | 操作 | 条件 | 期待結果 | テスト ID |
|---|------|------|----------|-----------|
| 37 | **read** | 参加者 | ✅ 許可 | `convs-read-participant-ok` |
| 38 | **read** | 非参加者 | ❌ 拒否 | `convs-read-non-participant-deny` |
| 39 | **create** | 参加者に自分を含む、長さ 2 | ✅ 許可 | `convs-create-valid-ok` |
| 40 | **create** | 参加者に自分**含まない** | ❌ 拒否 | `convs-create-no-self-deny` |
| 41 | **create** | 参加者 3 名以上 | ❌ 拒否 | `convs-create-too-many-deny` |
| 42 | **update** | 参加者、`lastMessage` 等許可フィールドのみ | ✅ 許可 | `convs-update-participant-ok` |
| 43 | **update** | 参加者、`participants` 変更を試みる | ❌ 拒否 | `convs-update-participants-deny` |
| 44 | **update** | 非参加者 | ❌ 拒否 | `convs-update-non-participant-deny` |
| 45 | **delete** | あらゆるユーザー | ❌ 拒否 | `convs-delete-deny` |

### 2.6 `conversations/{id}/messages` サブコレクション

| # | 操作 | 条件 | 期待結果 | テスト ID |
|---|------|------|----------|-----------|
| 46 | **read** | 親会話の参加者 | ✅ 許可 | `msgs-read-participant-ok` |
| 47 | **read** | 非参加者 | ❌ 拒否 | `msgs-read-non-participant-deny` |
| 48 | **create** | 参加者、`senderId == uid`、有効データ | ✅ 許可 | `msgs-create-sender-ok` |
| 49 | **create** | 参加者、`senderId != uid` (なりすまし) | ❌ 拒否 | `msgs-create-fake-sender-deny` |
| 50 | **create** | 非参加者 | ❌ 拒否 | `msgs-create-non-participant-deny` |
| 51 | **create** | 空テキスト | ❌ 拒否 | `msgs-create-empty-text-deny` |
| 52 | **update** | あらゆるユーザー (MVP では不許可) | ❌ 拒否 | `msgs-update-deny` |
| 53 | **delete** | あらゆるユーザー (MVP では不許可) | ❌ 拒否 | `msgs-delete-deny` |

### 2.7 `notifications` コレクション

| # | 操作 | 条件 | 期待結果 | テスト ID |
|---|------|------|----------|-----------|
| 54 | **read** | 受信者本人 (`recipientId == uid`) | ✅ 許可 | `notifs-read-recipient-ok` |
| 55 | **read** | 受信者以外 | ❌ 拒否 | `notifs-read-other-deny` |
| 56 | **create** | あらゆるクライアント | ❌ 拒否 | `notifs-create-deny` |
| 57 | **update** | あらゆるクライアント | ❌ 拒否 | `notifs-update-deny` |
| 58 | **delete** | あらゆるクライアント | ❌ 拒否 | `notifs-delete-deny` |

> **補足**: 通知の作成・既読更新・削除は **Vercel API ルート (Admin SDK)** が実行するため、ルール上は全面禁止で正しい。

### 2.8 Storage: `images/{userId}/{fileName}` (既存ツイート画像)

| # | 操作 | 条件 | 期待結果 | テスト ID |
|---|------|------|----------|-----------|
| 59 | **read** | 認証済み | ✅ 許可 | `storage-images-read-auth-ok` |
| 60 | **read** | 未認証 | ❌ 拒否 | `storage-images-read-unauth-deny` |
| 61 | **create** | 本人 (`userId == uid`), 画像/動画, < 50MB | ✅ 許可 | `storage-images-create-owner-ok` |
| 62 | **create** | 他人 (`userId != uid`) | ❌ 拒否 | `storage-images-create-other-deny` |
| 63 | **create** | 本人だが 50MB 超過 | ❌ 拒否 | `storage-images-create-too-large-deny` |
| 64 | **create** | 本人だが `application/pdf` 等非メディア | ❌ 拒否 | `storage-images-create-invalid-type-deny` |
| 65 | **update/delete** | あらゆるユーザー | ❌ 拒否 | `storage-images-write-deny` |

### 2.9 Storage: `dm-images/{conversationId}/{fileName}` (新規 DM 画像)

| # | 操作 | 条件 | 期待結果 | テスト ID |
|---|------|------|----------|-----------|
| 66 | **read** | 会話参加者 | ✅ 許可 | `storage-dm-read-participant-ok` |
| 67 | **read** | 非参加者 | ❌ 拒否 | `storage-dm-read-non-participant-deny` |
| 68 | **create** | 参加者, 画像/動画, < 50MB | ✅ 許可 | `storage-dm-create-participant-ok` |
| 69 | **create** | 非参加者 | ❌ 拒否 | `storage-dm-create-non-participant-deny` |
| 70 | **create** | 参加者だが 50MB 超過 | ❌ 拒否 | `storage-dm-create-too-large-deny` |
| 71 | **update/delete** | あらゆるユーザー | ❌ 拒否 | `storage-dm-write-deny` |

> ⚠️ **未確認項目**: `firestore.get()` を用いた会話参加者検証が **Spark プラン本番で動作するか** は Emulator では確認できない (Emulator は無制限)。本番デプロイ後に手動検証が必要。

---

## 3. テスト実装方針

```typescript
// tests/rules/tweets.test.ts (例)
import { assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { testEnv, alice, bob } from '../setup';

describe('tweets rules', () => {
  // 1. 本人作成 OK
  test('tweets-create-owner-ok', async () => {
    const db = alice.firestore();
    await assertSucceeds(db.collection('tweets').add({
      text: 'Hello',
      images: null,
      parent: null,
      userLikes: [],
      createdBy: alice.uid,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: null,
      userReplies: 0,
      userRetweets: [],
      quotedPostId: null,
      hashtags: [],
      searchText: 'hello'
    }));
  });

  // 2. 他人作成 NG
  test('tweets-create-other-deny', async () => {
    const db = bob.firestore();
    await assertFails(db.collection('tweets').add({
      text: 'Hello',
      createdBy: alice.uid, // bob が alice のふり
      // ...
    }));
  });
  // ... 以下同様
});
```

---

## 4. CI/CD 統合

- GitHub Actions: `firebase emulators:exec --project=demo --only=firestore,auth,storage -- npm run test:rules`
- Emulator 起動ポートは `firebase.json` 準拠 (18080, 9099, 9199)
- テスト失敗時は PR マージブロック

---

## 5. 手動検証が必要な項目 (Emulator では確認不可)

| 項目 | 理由 | 検証方法 |
|------|------|----------|
| Storage `dm-images` の `firestore.get()` 本番動作 | Spark プランの読み取り上限・権限 | 本番デプロイ後、実アカウントで DM 画像アップロード・表示 |
| インデックス作成完了待ち | 数分〜数時間かかる | Firebase Console > Firestore > Indexes でステータス確認 |
| カスタムクレーム `admin` 付与後の管理者ルール動作 | Auth 管理コンソール操作必要 | 管理者ユーザーにクレーム付与後、管理者向け機能で検証 |

---

*作成日: 2026-11-11*  
*作成者: データ設計担当 (kai)*