# Phase 0 偵察報告書: ccrsxx/twitter-clone リポジトリ調査

---

## 1. 技術スタック

| 項目 | 内容 | 確認ファイル |
|------|------|-------------|
| **フレームワーク** | Next.js 12.3.0 (Pages Router) | `package.json`, `next.config.js` |
| **言語** | TypeScript 4.7.4 (strict mode) | `tsconfig.json` |
| **スタイリング** | Tailwind CSS 3.2.4 (JIT, dark mode: class) | `tailwind.config.js` |
| **状態管理** | React Context + カスタムフック (`useAuth`, `useTheme`, `useModal`, `useCollection`, `useDocument`, `useArrayDocument`) | `src/lib/context/`, `src/lib/hooks/` |
| **データ取得** | Firebase SDK (client-side) + SWR (API routes) | `src/lib/firebase/`, `src/lib/api/trends.ts` |
| **リアルタイム** | Firestore `onSnapshot` (全購読は client 側) | `src/lib/hooks/useCollection.ts`, `useDocument.ts` |
| **UI ライブラリ** | @headlessui/react (Popover/Modal), @heroicons/react, framer-motion | `package.json` |
| **認証** | Firebase Authentication (Google OAuth のみ) | `src/lib/context/auth-context.tsx` |
| **データベース** | Cloud Firestore (v9 modular SDK) | `src/lib/firebase/collections.ts` |
| **ストレージ** | Firebase Cloud Storage (画像/GIF) | `src/lib/firebase/utils.ts` |
| **関数** | Cloud Functions (Node 16, TypeScript, リージョン: asia-southeast2) | `functions/src/index.ts`, `functions/package.json` |
| **テスト** | Jest + React Testing Library (設定のみ、テストファイルなし) | `jest.config.js`, `package.json` |
| **リンター/フォーマッタ** | ESLint (next/core-web-vitals), Prettier, husky + lint-staged | `package.json` |
| **デプロイ** | Vercel 推奨 (Firebase Hosting 併用可) | `README.md` |
| **パスエイリアス** | `@components/*`, `@lib/*`, `@styles/*` (baseUrl: `src`) | `tsconfig.json` |

### 主要スクリプト (`package.json`)

```json
{
  "dev": "next dev -p 80",
  "emulators": "firebase emulators:start --only firestore,auth,storage,functions",
  "dev:emulators": "concurrently npm:dev npm:emulators",
  "build": "next build",
  "test": "jest --watch",
  "test:ci": "jest --ci"
}
```

---

## 2. ディレクトリ構成 (主要)

```
twitter-clone/
├── src/
│   ├── pages/                    # Next.js Pages Router
│   │   ├── index.tsx             # ログインページ (AuthLayout)
│   │   ├── home.tsx              # ホームタイムライン (ProtectedLayout)
│   │   ├── tweet/[id].tsx        # ツイート詳細 + リプライ
│   │   ├── user/[id]/            # ユーザープロファイル配下
│   │   │   ├── index.tsx         # ツイート/メディア/リプライタブ
│   │   │   ├── with_replies.tsx
│   │   │   ├── media.tsx
│   │   │   ├── likes.tsx
│   │   │   ├── followers.tsx
│   │   │   └── following.tsx
│   │   ├── bookmarks.tsx         # ブックマーク一覧
│   │   ├── trends.tsx            # トレンドページ (Twitter API 連携)
│   │   ├── people.tsx            # ユーザー検索/推奨
│   │   └── api/trends/           # Twitter API プロキシ
│   ├── components/
│   │   ├── layout/               # レイアウトコンポーネント
│   │   ├── tweet/                # ツイート表示・アクション・統計
│   │   ├── view/                 # 詳細ビュー (ViewTweet, ViewParentTweet)
│   │   ├── user/                 # ユーザーカード/プロフィール/フォロー
│   │   ├── modal/                # モーダル汎用 + 専用 (返信, 削除, 編集等)
│   │   ├── input/                # ツイート作成フォーム (画像添付含む)
│   │   ├── aside/                # 右サイドバー (検索, トレンド, 推奨)
│   │   ├── sidebar/              # 左サイドバー (ナビゲーション定義)
│   │   ├── ui/                   # 汎用 UI (Button, Icon, Tooltip, Loading等)
│   │   ├── login/                # ログイン画面パーツ
│   │   └── home/                 # ホーム固有 (Header, Container等)
│   ├── lib/
│   │   ├── firebase/             # Firebase 初期化・コレクション・ユーティリティ
│   │   │   ├── app.ts            # initializeApp + エミュレータ接続
│   │   │   ├── config.ts         # 環境変数から設定取得
│   │   │   ├── collections.ts    # 型付きコレクション参照 (Converter 付き)
│   │   │   └── utils.ts          # 全書き込み操作 (バッチ, arrayUnion/Remove, increment)
│   │   ├── context/              # React Context (Auth, User, Theme, Window)
│   │   ├── hooks/                # カスタムフック (データ購読, モーダル, 無限スクロール等)
│   │   ├── api/                  # SWR 用 API フック (trends, auth)
│   │   ├── types/                # 型定義 (User, Tweet, Bookmark, Stats, Theme, File等)
│   │   └── utils.ts, date.ts, validation.ts, merge.ts, random.ts, env.ts
│   └── styles/
│       └── globals.scss          # CSS 変数定義 (テーマカラー, ダークモード)
├── functions/                    # Cloud Functions (TypeScript)
│   ├── src/
│   │   ├── index.ts              # エクスポート集約
│   │   ├── normalize-stats.ts    # ツイート削除時の統計整合性 (onDelete trigger)
│   │   ├── notify-email.ts       # 新規ツイート時メール通知 (onCreate trigger)
│   │   └── lib/                  # リージョン設定, 環境変数定義
│   └── package.json
├── firebase.json                 # エミュレータ/ルール/インデックス/Functions 設定
├── firestore.rules               # セキュリティルール
├── storage.rules                 # ストレージルール
├── firestore.indexes.json        # 複合インデックス定義
├── tailwind.config.js
├── next.config.js
├── tsconfig.json
└── README.md
```

---

## 3. 既存データモデル

### 3.1 コレクション構成

| コレクション | パス | ドキュメント ID | 説明 |
|-------------|------|----------------|------|
| `users` | `/users/{uid}` | Firebase Auth UID | ユーザープロファイル (以下参照) |
| `tweets` | `/tweets/{tweetId}` | 自動生成 | ツイート本文・メタデータ |
| `bookmarks` | `/users/{uid}/bookmarks/{tweetId}` | tweetId | ユーザーごとのブックマーク (サブコレクション) |
| `stats` | `/users/{uid}/stats/stats` | 固定 `stats` | ユーザーごとの集計配列 (likes[], tweets[]) |

### 3.2 型定義 (抜粋)

#### `User` (`src/lib/types/user.ts`)

```typescript
export type User = {
  id: string;                    // Auth UID
  bio: string | null;
  name: string;
  theme: Theme | null;           // 'light' | 'dark' | 'dim'
  accent: Accent | null;         // 'blue' | 'green' | 'pink' | ...
  website: string | null;
  location: string | null;
  username: string;              // ユニーク, @ 除く
  photoURL: string;              // プロフィール画像 (Storage URL またはデフォルト)
  verified: boolean;             // 常に false (実装なし)
  following: string[];           // フォロー中 UID 配列 (自ユーザー文書に保持)
  followers: string[];           // フォロワー UID 配列 (自ユーザー文書に保持)
  createdAt: Timestamp;
  updatedAt: Timestamp | null;
  totalTweets: number;           // 総ツイート数 (増分カウンタ)
  totalPhotos: number;           // 総画像数 (増分カウンタ)
  pinnedTweet: string | null;    // 固定ツイート ID
  coverPhotoURL: string | null;  // ヘッダー画像
};
```

#### `Tweet` (`src/lib/types/tweet.ts`)

```typescript
export type Tweet = {
  id: string;
  text: string | null;           // 280 字 (管理者 560 字)
  images: ImagesPreview | null;  // 最大 4 件 [{id, src, alt, type}]
  parent: { id: string; username: string } | null;  // リプライ先
  userLikes: string[];           // いいねした UID 配列 (ツイート文書に保持)
  createdBy: string;             // 作成者 UID
  createdAt: Timestamp;
  updatedAt: Timestamp | null;
  userReplies: number;           // リプライ数 (増分カウンタ)
  userRetweets: string[];        // リツイートした UID 配列 (ツイート文書に保持)
};
```

#### `Bookmark` (`src/lib/types/bookmark.ts`)

```typescript
export type Bookmark = {
  id: string;        // tweetId と同一
  createdAt: Timestamp;
};
```

#### `Stats` (`src/lib/types/stats.ts`)

```typescript
export type Stats = {
  likes: string[];      // いいねした tweetId 配列
  tweets: string[];     // リツイートした tweetId 配列
  updatedAt: Timestamp | null;
};
```

### 3.3 いいね・リポスト・フォローの保存方式

| 操作 | 保存先 | 方式 | 同期処理 |
|------|--------|------|----------|
| **いいね** | `tweets/{id}.userLikes[]` + `users/{uid}/stats/stats.likes[]` | 双方向配列 (arrayUnion/Remove) | `manageLike()` でバッチ書き込み |
| **リポスト** | `tweets/{id}.userRetweets[]` + `users/{uid}/stats/stats.tweets[]` | 双方向配列 | `manageRetweet()` でバッチ書き込み |
| **フォロー** | `users/{uid}.following[]` + `users/{targetUid}.followers[]` | 双方向配列 | `manageFollow()` でバッチ書き込み |
| **リプライ数** | `tweets/{parentId}.userReplies` | 単一カウンタ (increment) | `manageReply()` で更新 |
| **総ツイート/画像数** | `users/{uid}.totalTweets`, `totalPhotos` | 単一カウンタ (increment) | `manageTotalTweets/Photos()` で更新 |

> **注意**: すべてクライアントサイド (ブラウザ) から `writeBatch` で実行。Cloud Functions `normalize-stats.ts` は**ツイート削除時のみ**統計の整合性をとる (ユーザーの `stats` 配列から当該 tweetId を除去、ブックマークも削除)。

### 3.4 画像ストレージパス規則

```
gs://<bucket>/images/{userId}/{randomFileId}
```

- `src/lib/firebase/utils.ts:137` で `ref(storage, \`images/${userId}/${id}\`)` と生成
- `randomFileId` はクライアント側で生成 (`FileWithId` 型で `id` プロパティを付与)
- Content-Type: `image/*` または `video/*`、上限 50 MB (`storage.rules`)

---

## 4. 既存機能の実装箇所

| 機能 | 主要ファイル | 概要 |
|------|-------------|------|
| **認証 (Google OAuth)** | `src/lib/context/auth-context.tsx:161-168` | `signInWithPopup(GoogleAuthProvider)`。初回ログイン時ユーザー文書自動作成 (ユーザー名自動生成) |
| **認証状態管理** | `src/lib/context/auth-context.tsx:55-135` | `onAuthStateChanged` で監視。ユーザー文書を `onSnapshot` でリアルタイム購読。ブックマークも購読 |
| **ログアウト** | `src/lib/context/auth-context.tsx:170-176` | `signOutFirebase(auth)` |
| **ツイート作成** | `src/components/input/input.tsx:75-125` | `addDoc(tweetsCollection, tweetData)` + カウンタ増分バッチ。画像は `uploadImages()` で Storage へ |
| **ツイート表示 (ホーム)** | `src/pages/home.tsx:21-25`, `src/components/tweet/tweet.tsx` | `useInfiniteScroll` で `where('parent', '==', null)` + `orderBy('createdAt','desc')` をページネーション |
| **ツイート詳細 + リプライ** | `src/pages/tweet/[id].tsx:27-41`, `src/components/view/view-tweet.tsx` | `useDocument` で親ツイート、`useCollection` で `where('parent.id','==',id)` リプライ取得 |
| **いいね** | `src/components/tweet/tweet-stats.tsx:117-121`, `src/lib/firebase/utils.ts:223-256` | `manageLike('like'|'unlike', userId, tweetId)` → バッチで双方向配列更新 |
| **リポスト** | `src/components/tweet/tweet-stats.tsx:117-121`, `src/lib/firebase/utils.ts:188-221` | `manageRetweet('retweet'|'unretweet', userId, tweetId)` → バッチで双方向配列更新 |
| **フォロー/アンフォロー** | `src/components/ui/follow-button.tsx:25-31`, `src/lib/firebase/utils.ts:89-120` | `manageFollow('follow'|'unfollow', userId, targetId)` → バッチで双方向配列更新 |
| **リアルタイム購読** | `src/lib/hooks/useCollection.ts:73-89`, `useDocument.ts:57-71`, `auth-context.tsx:142-157` | すべて `onSnapshot`。`useCollection` は `includeUser:true` で作成者ユーザー文書を `getDoc` で結合 |
| **ブックマーク** | `src/pages/bookmarks.tsx:36-50`, `src/lib/firebase/utils.ts:258-272` | サブコレクション `users/{uid}/bookmarks/{tweetId}` にドキュメント作成/削除 |
| **プロフィール編集** | `src/components/modal/edit-profile-modal.tsx` (未読だが存在), `src/lib/firebase/utils.ts:47-75` | `updateUserData`, `updateUsername`, `updateUserTheme` で部分更新 |
| **固定ツイート** | `src/components/tweet/tweet-actions.tsx:122-128`, `src/lib/firebase/utils.ts:77-87` | `users/{uid}.pinnedTweet` に tweetId をセット/クリア |
| **トレンド取得** | `src/pages/api/trends/place/[id].ts`, `src/lib/api/trends.ts` | Twitter API v1.1 プロキシ (Bearer Token 必要)。SWR で 30 秒ごと再取得 |
| **サイドバー ナビゲーション** | `src/components/sidebar/sidebar.tsx:22-60` | `navLinks` 配列で定義。`disabled: true` の項目: Explore, Notifications, Messages, Lists |
| **ユーザー検索/推奨** | `src/pages/people.tsx:24-29` | `where('id', '!=', currentUserId)` で全ユーザー取得 (ページネーションあり) |
| **フォロワー/フォローイング一覧** | `src/components/user/user-follow.tsx:17-27` | `where('followers'|'following', 'array-contains', uid)` で逆引き検索 |

---

## 5. セキュリティルールの現状

### `firestore.rules`

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAdmin() {
      return request.auth.uid == 'Twt0A27bx9YcG4vu3RTsR7ifJzf2';  // ハードコード
    }
    function isAuthorized(userId) {
      return request.auth != null && (userId == request.auth.uid || isAdmin());
    }
    function isValidText(text) { return text is string || text == null; }
    function isValidImages(images) { return (images is list && images.size() <= 4) || images == null; }

    match /tweets/{tweetId} {
      allow read, update: if request.auth != null;
      allow create: if isAuthorized(request.resource.data.createdBy)
                       && isValidText(request.resource.data.text)
                       && isValidImages(request.resource.data.images);
      allow delete: if isAuthorized(resource.data.createdBy);
    }

    match /users/{document=**} {   // ワイルドカードでサブコレクション含む全許可
      allow read, write: if request.auth != null;
    }
  }
}
```

**懸念点**:
- `users/{document=**}` でサブコレクション (`bookmarks`, `stats`) まで **認証済みなら全読み書き可能**。
- `tweets` の `update` が「認証済みなら誰でも」になっており、本文や `userLikes`/`userRetweets` 配列を任意ユーザーが書き換え可能。
- 管理者 UID がハードコード。

### `storage.rules`

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    function isAuthorized(userId) { ... }
    function isValidMedia() {
      return request.resource.contentType.matches('image/.*|video/.*')
             && request.resource.size < 50 * 1024 * 1024;
    }
    match /images/{userId}/{fileName} {
      allow read: if request.auth != null;
      allow create: if isAuthorized(userId) && isValidMedia();
      allow update, delete: if false;   // 更新・削除不可 (仕様)
    }
  }
}
```

- パスベースでユーザー隔離。削除は Functions 側 (`normalize-stats`) でのみ実行される想定。

### `firestore.indexes.json` (主要インデックス)

| コレクション | フィールド | 用途 |
|-------------|-----------|------|
| `tweets` | `createdBy ASC, createdAt DESC` | ユーザータイムライン |
| `tweets` | `parent ASC, createdAt DESC` | リプライツリー (親指定) |
| `tweets` | `parent.id ASC, createdAt DESC` | リプライツリー (親ID指定) |
| `tweets` | `userLikes ARRAY_CONTAINS, createdAt DESC` | いいね一覧 |
| `tweets` | `userRetweets ARRAY_CONTAINS, createdBy ASC` | リツイート一覧 |
| `bookmarks` (collectionGroup) | `id` 各種 | ブックマーク横断検索 |

---

## 6. ローカル環境の起動手順 (確認済み)

### 前提条件
- Node.js 18+ (`.nvmrc` なし、README は 16+ 推奨)
- Java JDK 11+ (Firebase Emulator 必須)
- Firebase CLI (`npm i -g firebase-tools`)
- Google Cloud プロジェクト (Firebase プロジェクト作成済み)

### 手順 (README.md 準拠 + 確認事項)

1. **依存関係インストール**
   ```bash
   npm ci
   cd functions && npm ci && cd ..
   ```

2. **環境変数設定** (`.env.development` 作成)
   ```env
   NEXT_PUBLIC_API_KEY=...
   NEXT_PUBLIC_AUTH_DOMAIN=...
   NEXT_PUBLIC_PROJECT_ID=...
   NEXT_PUBLIC_STORAGE_BUCKET=...
   NEXT_PUBLIC_MESSAGING_SENDER_ID=...
   NEXT_PUBLIC_APP_ID=...
   NEXT_PUBLIC_MEASUREMENT_ID=...  # 任意
   NEXT_PUBLIC_USE_EMULATOR=true   # エミュレータ使用時
   # Twitter API (トレンド用・任意)
   TWITTER_API_KEY=...
   TWITTER_API_SECRET=...
   TWITTER_BEARER_TOKEN=...
   ```

3. **Firebase ログイン & プロジェクト選択**
   ```bash
   firebase login
   firebase use <project-id>
   ```

4. **エミュレータ起動 (推奨: 開発用)**
   ```bash
   # ターミナル 1: Next.js + Emulators 同時起動
   npm run dev:emulators
   # または分離:
   # ターミナル 1: npm run emulators  (ポート: Auth 9099, Firestore 8080, Storage 9199, Functions 5001, UI 4000)
   # ターミナル 2: npm run dev       (http://localhost:80)
   ```

5. **本番デプロイ (ルール/インデックス/ストレージのみ)**
   ```bash
   firebase deploy --except functions
   ```

### 確認済み動作項目
- `npm run dev:emulators` でエミュレータ UI (http://localhost:4000) が起動し、Firestore/Auth/Storage/Functions のタブが表示されること
- Next.js がポート 80 で起動し、ログインページが表示されること (管理者権限で実行しないとポート 80 は bind 失敗するため、実運用では `next dev -p 3000` 等へ変更推奨)
- Google OAuth ポップアップでログイン → ホームタイムライン遷移 → ツイート投稿・いいね・リポスト・リプライ・画像添付がエミュレータ上で動作すること
- `npm run test:ci` はテストファイルが 0 件のため「No tests found」で終了 (設定のみ存在)

### 既知の問題/注意点
- **ポート 80** は root 権限必要。開発時は `next dev -p 3000` 等に変更するか `sudo` 併用
- **Java JDK 11+** が未インストールだと `emulators:start` で `Java not found` エラー
- **Twitter API キー** 未設定時、トレンドページで "Sorry we could not find any trends" エラー表示
- **Cloud Functions** はエミュレータで動作確認可能だが、`notify-email.ts` は Gmail 認証情報 (`EMAIL_API`, `EMAIL_API_PASSWORD`, `TARGET_EMAIL`) が Functions 環境変数 (Secret Manager) に必要

---

## 7. 懸念事項

| # | 懸念 | 影響度 | 詳細 |
|---|------|--------|------|
| **1** | **Spark (無料) プランで Cloud Functions が制限付き** | 高 | Functions は Blaze (従量課金) プラン必須。`notify-email` (onCreate) と `normalize-stats` (onDelete) は無料枠ではデプロイ・実行不可。エミュレータでは動作するが本番デプロイ時は課金設定必要 |
| **2** | **セキュリティルールが緩すぎる (誰でもツイート更新可、ユーザー文書全権限)** | 高 | `tweets` の `allow update: if request.auth != null` で他人のツイート本文・配列を書き換え可能。`users/{document=**}` でサブコレクション含め全読み書き許可。DM/通知実装前に最低限の所有権チェック必須 |
| **3** | **型の不整合・any 的な箇所・テスト皆無** | 中 | `userConverter.fromFirestore` で `as User` キャストのみ。`useCollection` の `doc.data({ serverTimestamps: 'estimate' })` 戻り値を `T[]` とみなす。Jest 設定のみで実テストファイル 0 件。リファクタリング時の回帰検知手段なし |
| **4** | **日本語化対象の英語文字列がコンポーネント全体に散在** | 中 | UI 文字列が JSX にベタ書き (例: "Home", "Explore", "Notifications", "Tweet", "Reply", "Retweet", "Like", "Follow", "Bookmarks" 等)。i18n ライブラリ未導入。一括置換または next-intl 等導入が必要 |
| **5** | **検索/通知/DM/引用リポストの実装が完全に欠落** | 高 | 該当ページ (`/search`, `/notifications`, `/messages`) が存在しない。サイドバーの該当リンクは `disabled: true`。データモデル・ルール・API すべて新規設計必要 |
| **6** | **Cloud Functions のリージョン固定 (asia-southeast2)** | 低 | 日本国内からのレイテンシは許容だが、将来的にマルチリージョン展開時は要見直し |

---

## 8. 未確認事項

| # | 項目 | 理由 |
|---|------|------|
| **1** | **プロフィール編集モーダル (`edit-profile-modal.tsx`) の詳細実装** | ファイル存在確認のみ。画像アップロード (アバター/ヘッダー) の Storage パス・リサイズ処理・バリデーション詳細未読 |
| **2** | **メディアタブ (`user/[id]/media.tsx`) の実装** | 画像付きツイートのみフィルタするクエリ (`where('images', '!=', null)` 等) の有無・インデックス要否未確認 |
| **3** | **いいねタブ (`user/[id]/likes.tsx`) の実装** | `userStatsCollection` の `likes[]` 配列を使った逆引きクエリ (`array-contains`) の実装有無未確認 |
| **4** | **with_replies タブ (`user/[id]/with_replies.tsx`) の実装** | 親ツイート + リプライ混在表示のクエリ・ページネーション戦略未確認 |
| **5** | **`merge.ts` (mergeData) の詳細ロジック** | オーナー ツイートとリツイートをマージするソート・重複除外ロジック未読 |
| **6** | **`validation.ts` (getImagesData) の動画/GIF 対応詳細** | ファイル種別判定・サイズ制限・プレビュー生成の詳細未確認 |
| **7** | **`notify-email.ts` の実際の動作可否** | Gmail App Password 必須だが、Secret Manager への設定手順・本番デプロイ実績未確認 |
| **8** | **`firestore.indexes.json` の `bookmarks` collectionGroup インデックスが実用的か** | `id` フィールドのみのインデックスで `orderBy('createdAt')` 等が可能か未検証 |
| **9** | **Next.js 12 → 13+ (App Router) 移行の必要性・影響範囲** | 現行 Pages Router で動作。将来的な移行コスト未評価 |
| **10** | **Firebase SDK v9 → v10/11 へのアップグレード影響** | `firebase` パッケージ v9.9.4 固定。最新版での破壊的変更有無未確認 |

---

## 付録: 日本語化対象となる主な英語文字列の所在 (主要ファイル)

| ファイル | 主な英語文字列例 |
|---------|-----------------|
| `src/components/sidebar/sidebar.tsx` | "Home", "Explore", "Notifications", "Messages", "Bookmarks", "Lists", "Profile", "Tweet" |
| `src/components/tweet/tweet-actions.tsx` | "Delete", "Pin to your profile", "Unpin from profile", "Follow @{username}", "Unfollow @{username}" |
| `src/components/tweet/tweet-stats.tsx` | "Reply", "Retweet", "Undo Retweet", "Like", "Unlike", "Analytics" |
| `src/components/input/input.tsx` | "What's happening?", "Tweet", "Reply", "Cancel", "Character limit" 等 |
| `src/components/modal/action-modal.tsx` | モーダル汎用の "Cancel", "Confirm" 等 |
| `src/components/modal/tweet-reply-modal.tsx` | "Reply", "Replying to..." |
| `src/components/user/user-card.tsx` | "Follow", "Following" |
| `src/components/ui/follow-button.tsx` | "Follow", "Following", "Unfollow @{username}?" 等 |
| `src/pages/trends.tsx` | "Trends", "Settings", "Show more" |
| `src/components/aside/aside-trends.tsx` | "Trends for you", "Trending in...", "tweets" |
| `src/components/view/view-tweet.tsx` | "Replying to @" |
| `src/components/home/main-header.tsx` | "Home", "Latest" 等 |
| `src/components/login/login-main.tsx` | "Sign in to Twitter", "Continue with Google" |
| `src/lib/date.ts` (formatNumber) | "K", "M", "B" 単位表記 |

> **注**: 以上は主要ファイルのみ。網羅的な抽出には `grep -r '[A-Z][a-z]' src/components --include="*.tsx" | grep -v 'className\|iconName\|href\|import\|type\|interface'` 等の追加調査が必要。

---

**報告書作成日**: 2026-11-11
**調査対象コミット**: 現在のワークツリー状態 (git 管理下)
**作成者**: 偵察担当エージェント (kai)