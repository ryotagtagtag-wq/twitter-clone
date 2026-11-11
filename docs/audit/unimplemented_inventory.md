# 未実装・未接続・未整備 洗い出し報告書

---

## 1. 概要

| 項目 | 内容 |
|------|------|
| **調査日** | 2026-11-12 |
| **調査対象** | ccrsxx/twitter-clone (フォーク運用: ryotagtagtag-wq/twitter-clone) |
| **調査範囲** | `src/` 全体、`functions/`、`firebase.json`、`firestore.rules`、`storage.rules`、`firestore.indexes.json`、`package.json`、`next.config.js`、`tsconfig.json`、設計ドキュメント (`docs/design/`) |
| **確認できなかった項目** | 以下の実行検証は環境制約により未実施: `npm run build`、`npm run lint`、`npm run test:ci` (Jest 設定のみでテストファイル 0 件)、本番 Firebase デプロイ後の動作 (Spark プラン制約、Storage ルールの `firestore.get()` 動作、カスタムクレーム反映) |

---

## 2. 一覧表

| ID | 区分 | 内容 | ファイルパスと行 | 影響 | 計画上の対応マイルストーン |
|----|------|------|------------------|------|---------------------------|
| A-01 | A | サイドバー: Explore, Notifications, Messages, Lists が `disabled: true` で無効化 | `src/components/sidebar/sidebar.tsx:32,39,45,57` | 高 | M3 (通知), M4 (DM), M5 (Explore/Lists) |
| A-02 | A | モバイルサイドバー: Lists, Settings, Help Center が `disabled: true` | `src/components/modal/mobile-sidebar-modal.tsx:35,49,55` | 高 | M5 (Lists), M6 (Settings), M7 (Help) |
| A-03 | A | 投稿オプション: GIF, Poll, Emoji, Schedule, Location が `disabled: true` | `src/components/input/input-options.tsx:27,32,37,42,47` | 中 | M8 (拡張投稿機能) |
| A-04 | A | `href="#"` フォールバック (username 未設定時) | `src/components/user/user-name.tsx:25`, `src/components/user/user-avatar.tsx:23` | 低 | M1 (プロフィール完成時解消) |
| A-05 | A | トレンド「More」ボタンが `cursor-not-allowed` で無効化 | `src/components/aside/aside-trends.tsx:55-68` | 低 | M5 (Explore/トレンド詳細) |
| A-06 | A | Analytics ボタン (ツイート統計) が `disabled` で機能なし | `src/components/tweet/tweet-stats.tsx:142-150` | 低 | M9 (アナリティクス) |
| B-01 | B | `/notifications` ページが存在しない (サイドバーリンクはあるが無効) | `src/components/sidebar/sidebar.tsx:36-40` | 高 | M3 (通知実装) |
| B-02 | B | `/messages` ページが存在しない (DM 機能未実装) | `src/components/sidebar/sidebar.tsx:41-46` | 高 | M4 (DM実装) |
| B-03 | B | `/explore` ページが存在しない | `src/components/sidebar/sidebar.tsx:28-34` | 中 | M5 (Explore実装) |
| B-04 | B | `/lists` ページが存在しない | `src/components/sidebar/sidebar.tsx:53-59`, `mobile-sidebar-modal.tsx:31-36` | 中 | M5 (Lists実装) |
| B-05 | B | `/settings` ページが存在しない | `src/components/modal/mobile-sidebar-modal.tsx:45-50` | 中 | M6 (設定画面) |
| B-06 | B | `/help-center` ページが存在しない | `src/components/modal/mobile-sidebar-modal.tsx:51-56` | 低 | M7 (ヘルプ) |
| B-07 | B | 通知型 (`notification.ts`)・会話型 (`conversation.ts`, `message.ts`) は型定義のみで実装なし | `src/lib/types/notification.ts`, `conversation.ts`, `message.ts` | 高 | M3, M4 で実装 |
| B-08 | B | `conversations`, `notifications` コレクション操作ユーティリティが `utils.ts` にない | `src/lib/firebase/utils.ts` | 高 | M3, M4 で追加 |
| B-09 | B | 投稿オプションの GIF/Poll/Emoji/Schedule/Location 機能未実装 | `src/components/input/input-options.tsx:24-48` | 中 | M8 (拡張投稿) |
| B-10 | B | Display モーダル (モバイルサイドバー「Display」ボタン) の中身が未確認 | `src/components/modal/display-modal.tsx` 参照要 | 低 | M6 (設定画面内で実装) |
| C-01 | C | `firestore.rules` の管理者判定がコメントアウト (ハードコード UID 削除済みだが `isAdmin()` 未実装) | `firestore.rules:7-13` | 高 | M1 (カスタムクレーム実装) |
| C-02 | C | `auth-context.tsx` で `user.username === 'ccrsxx'` で管理者判定 (暫定・ユーザー名依存) | `src/lib/context/auth-context.tsx:178` | 高 | M1 (カスタムクレーム移行) |
| C-03 | C | `storage.rules` の `dm-images` で `firestore.get()` 使用 (Spark プランで動作未確認) | `storage.rules:42-45` | 高 | M4 (本番検証必須、失敗時 Signed URL へフォールバック) |
| C-04 | C | `bookmarks` collectionGroup の `createdAt` インデックス追加済み (検証報告書指摘対応済み) | `firestore.indexes.json:158-168` | 高 | M0 (デプロイ済みなら完了、未なら即実行) |
| C-05 | C | Cloud Functions (`normalize-stats`, `notify-email`) は Spark プランではデプロイ・実行不可 | `functions/src/index.ts`, `phase0_recon.md:懸念1` | 高 | M2 (Blaze 移行) または Vercel API ルートへ移植 |
| C-06 | C | `firestore.rules` の `tweets` update ルールが許可リストベースだが配列中身検証が緩い | `firestore.rules:54-68` | 中 | M1 (現行維持 + 将来サブコレクション分離計画) |
| C-07 | C | `users/{document=**}` ワイルドカードでサブコレクション含め全権限 (検証報告書指摘) | 現行 `firestore.rules` (設計書では分離済み) | 高 | M1 (設計書のルールへ全面書き換え) |
| C-08 | C | ツイート削除時の統計整合 (`userLikes`, `userRetweets`, `bookmarks`, `userReplies`) は Cloud Functions `normalize-stats` 依存 | `functions/src/normalize-stats.ts` | 高 | M2 (Vercel API ルートで代替実装) |
| D-01 | D | `<Html lang='en'>` (英語固定) | `src/pages/_document.tsx:5` | 高 | M1 (ja に変更) |
| D-02 | D | サイドバー: "Home", "Explore", "Notifications", "Messages", "Bookmarks", "Lists", "Profile", "Tweet" | `src/components/sidebar/sidebar.tsx:24-59` | 高 | M1 (i18n 導入または一括置換) |
| D-03 | D | ツイートアクション: "Delete", "Pin to your profile", "Unpin from profile", "Follow @{username}", "Unfollow @{username}" | `src/components/tweet/tweet-actions.tsx:159-164, 225, 236-238, 255, 266` | 高 | M1 |
| D-04 | D | ツイート統計: "Reply", "Retweet", "Undo Retweet", "Like", "Unlike", "Analytics" | `src/components/tweet/tweet-stats.tsx:97-100, 112, 116, 130, 134, 147` | 高 | M1 |
| D-05 | D | 投稿フォーム: "What's happening?", "Tweet", "Reply", "Cancel", "Character limit", "Add", "Media", "GIF", "Poll", "Emoji", "Schedule", "Location" | `src/components/input/input.tsx:84-85, 114-122, 220-228`, `input-options.tsx:18-48` | 高 | M1 |
| D-06 | D | モーダル汎用: "Cancel", "Confirm" | `src/components/modal/action-modal.tsx` | 高 | M1 |
| D-07 | D | 返信モーダル: "Reply", "Replying to..." | `src/components/modal/tweet-reply-modal.tsx` | 高 | M1 |
| D-08 | D | ユーザーカード/フォローボタン: "Follow", "Following", "Unfollow @{username}?" | `src/components/user/user-card.tsx:45`, `src/components/ui/follow-button.tsx:57, 67, 43-44` | 高 | M1 |
| D-09 | D | トレンド: "Trends", "Settings", "Show more", "Trends for you", "Trending in...", "tweets" | `src/pages/trends.tsx:21-22`, `src/components/aside/aside-trends.tsx:46, 71-74, 78, 89` | 高 | M1 |
| D-10 | D | ツイート詳細: "Replying to @" | `src/components/view/view-tweet.tsx` | 高 | M1 |
| D-11 | D | ヘッダー: "Home", "Latest" | `src/components/home/main-header.tsx` | 高 | M1 |
| D-12 | D | ログイン: "Sign in to Twitter", "Continue with Google" | `src/components/login/login-main.tsx` | 高 | M1 |
| D-13 | D | 日付・相対時間: "K", "M", "B" 単位、`now`, `yesterday`, `today` 等英語表記 | `src/lib/date.ts:3-6, 93-115` | 高 | M1 (Intl.RelativeTimeFormat 'ja' へ) |
| D-14 | D | ユーザー名モーダル: "What should we call you?", "Change your username?", "Your @username is unique..." | `src/components/modal/username-modal.tsx:15-27` | 中 | M1 |
| D-15 | D | ブックマーク: "Save Tweets for later", "Don't let the good ones fly away!", "Clear all Bookmarks?", "This can't be undone..." | `src/pages/bookmarks.tsx:101-103, 67-70` | 中 | M1 |
| D-16 | D | モバイルサイドバー: "Topics", "Twitter Circle", "Settings and privacy", "Help center", "Display", "Log out", "Account info", "Profile" | `src/components/modal/mobile-sidebar-modal.tsx:20-57, 134-135, 195-197, 208-227` | 中 | M1 |
| D-17 | D | 検索バー: プレースホルダー "Search Twitter" 等 | `src/components/aside/search-bar.tsx` | 中 | M1 |
| D-18 | D | フォロー確認モーダル: "Unfollow @{username}?", "Their Tweets will no longer show up..." | `src/components/ui/follow-button.tsx:43-44` | 中 | M1 |
| D-19 | D | ユーザー検索ページ: "People" (タイトル), "Something went wrong" | `src/pages/people.tsx:35-36, 41` | 中 | M1 |
| D-20 | D | エラー表示: "Something went wrong", "Tweet not found" | `src/pages/home.tsx:42`, `src/pages/tweet/[id].tsx:67` | 中 | M1 |
| E-01 | E | 環境変数: `NEXT_PUBLIC_API_KEY`, `NEXT_PUBLIC_AUTH_DOMAIN`, `NEXT_PUBLIC_PROJECT_ID`, `NEXT_PUBLIC_STORAGE_BUCKET`, `NEXT_PUBLIC_MESSAGING_SENDER_ID`, `NEXT_PUBLIC_APP_ID`, `NEXT_PUBLIC_MEASUREMENT_ID`, `NEXT_PUBLIC_USE_EMULATOR`, `NEXT_PUBLIC_URL`, `TWITTER_API_KEY`, `TWITTER_API_SECRET`, `TWITTER_BEARER_TOKEN` | `src/lib/firebase/config.ts:2-8`, `src/lib/env.ts:4-5`, `phase0_recon.md:手順2` | 高 | M0 (`.env.example` 作成必須) |
| E-02 | E | `.env.example` が存在しない (全環境変数のテンプレート不在) | ルート直下 | 高 | M0 (即作成) |
| E-03 | E | `next.config.js` が最小構成 (`images.unoptimized: true` のみ) | `next.config.js:1-10` | 低 | M1 (必要に応じて拡張) |
| E-04 | E | `firebase.json` のエミュレータポートが検証報告書で変更済み (本番用に戻す必要あり) | `firebase.json:20-31` | 中 | M0 (デプロイ時は標準ポートに) |
| E-05 | E | `package.json` の `dev` スクリプトがポート 80 (root 権限必要) | `package.json:7` | 中 | M0 (3000 等へ変更推奨) |
| E-06 | E | `package.json` に `test:rules` (セキュリティルールテスト) スクリプトなし | `package.json:5-15` | 中 | M1 (追加) |
| F-01 | F | Jest 設定のみでテストファイル 0 件 (`npm run test:ci` は "No tests found") | `jest.config.js`, `phase0_recon.md:技術スタック` | 高 | M1 (テスト計画実装) |
| F-02 | F | ESLint/Prettier/tsc の実行未確認 (CI 未構築) | `package.json:11-12` | 中 | M1 (GitHub Actions 追加) |
| F-03 | F | `next build` 実行未確認 (ビルドエラーの有無不明) | - | 高 | M0 (即実行要) |
| G-01 | G | ツイート削除時: `userLikes`, `userRetweets`, `bookmarks`, `userReplies` の整合は Cloud Functions 依存 (Spark 不可) | `src/lib/firebase/utils.ts:108-113, 122-125`, `functions/src/normalize-stats.ts` | 高 | M2 (Vercel API ルートでバッチ削除実装) |
| G-02 | G | 無限スクロール終端時の空状態表示なし (`LoadMore` 非表示のみ) | `src/lib/hooks/useInfiniteScroll.tsx:89-101` | 中 | M1 (空状態 UI 追加) |
| G-03 | G | `useCollection`/`useDocument` の `onSnapshot` にエラーハンドリングなし (try/catch 不在) | `src/lib/hooks/useCollection.ts:73-89`, `useDocument.ts` | 高 | M1 (エラーコールバック追加) |
| G-04 | G | フォロー/アンフォロー、ブックマーク等のボタン操作にローディング表示なし | `src/components/ui/follow-button.tsx`, `tweet-stats.tsx` | 中 | M1 (ボタン loading 状態追加) |
| G-05 | G | 画像アップロード中の進捗表示なし (`uploadImages` は Promise.all で一括) | `src/lib/firebase/utils.ts:127-148` | 低 | M8 (進捗表示) |
| H-01 | H | 不在ページ: `/notifications`, `/messages`, `/explore`, `/lists`, `/settings`, `/help-center` (サイドバー/モバイルサイドバーの disabled リンクと対応) | `src/components/sidebar/sidebar.tsx`, `mobile-sidebar-modal.tsx` | 高 | M3-M7 で順次実装 |
| H-02 | H | `/search` ページが存在しない (検索機能未実装) | - | 高 | M5 (検索実装) |
| H-03 | H | `/user/[id]/index.tsx` 等のタブ切り替え (ツイート/メディア/リプライ/いいね) は実装済み | `src/pages/user/[id]/*.tsx` | - | 完了 |

---

## 3. 日本語化の残り (ファイルごとの件数と代表例)

| ファイル | 件数 (推定) | 代表例 (種類) |
|----------|-------------|---------------|
| `src/components/sidebar/sidebar.tsx` | 8 | "Home", "Explore", "Notifications", "Messages", "Bookmarks", "Lists", "Profile", "Tweet" (ナビ項目) |
| `src/components/tweet/tweet-actions.tsx` | 6 | "Delete", "Pin to your profile", "Unpin from profile", "Follow @{username}", "Unfollow @{username}" (ボタン/メニュー) |
| `src/components/tweet/tweet-stats.tsx` | 6 | "Reply", "Retweet", "Undo Retweet", "Like", "Unlike", "Analytics" (ボタン/ツールチップ) |
| `src/components/input/input.tsx` | 8 | "What's happening?", "Tweet", "Reply", "Cancel", "Character limit", "Add" (プレースホルダー/ボタン/ラベル) |
| `src/components/input/input-options.tsx` | 6 | "Media", "GIF", "Poll", "Emoji", "Schedule", "Location" (ボタン/ツールチップ) |
| `src/components/modal/action-modal.tsx` | 2 | "Cancel", "Confirm" (ボタン) |
| `src/components/modal/tweet-reply-modal.tsx` | 2 | "Reply", "Replying to..." (タイトル/ラベル) |
| `src/components/user/user-card.tsx` | 2 | "Follow", "Following" (ボタン) |
| `src/components/ui/follow-button.tsx` | 3 | "Follow", "Following", "Unfollow @{username}?" (ボタン/モーダル文言) |
| `src/pages/trends.tsx` | 3 | "Trends", "Settings", "Show more" (タイトル/ボタン/リンク) |
| `src/components/aside/aside-trends.tsx` | 5 | "Trends for you", "Trending in...", "tweets", "More" (見出し/ラベル/ボタン) |
| `src/components/view/view-tweet.tsx` | 1 | "Replying to @" (ラベル) |
| `src/components/home/main-header.tsx` | 2 | "Home", "Latest" (タブ) |
| `src/components/login/login-main.tsx` | 2 | "Sign in to Twitter", "Continue with Google" (見出し/ボタン) |
| `src/lib/date.ts` | 10+ | "K", "M", "B", "now", "yesterday", "today", 相対時間単位 (フォーマッタ) |
| `src/components/modal/username-modal.tsx` | 4 | "What should we call you?", "Change your username?", "Your @username is unique...", "Skip"/"Cancel" (モーダル文言) |
| `src/pages/bookmarks.tsx` | 5 | "Save Tweets for later", "Don't let the good ones fly away!", "Clear all Bookmarks?", "This can't be undone...", "Clear" (見出し/説明/モーダル) |
| `src/components/modal/mobile-sidebar-modal.tsx` | 10+ | "Topics", "Twitter Circle", "Settings and privacy", "Help center", "Display", "Log out", "Account info", "Profile", "Following", "Followers" (ナビ/ボタン/ラベル) |
| `src/components/aside/search-bar.tsx` | 1 | "Search Twitter" (プレースホルダー) |
| `src/pages/people.tsx` | 2 | "People", "Something went wrong" (タイトル/エラー) |
| `src/pages/tweet/[id].tsx` | 1 | "Tweet not found" (エラー) |
| `src/pages/home.tsx` | 1 | "Something went wrong" (エラー) |
| `src/pages/_document.tsx` | 1 | `<Html lang='en'>` (HTML lang) |

**合計: 約 95 箇所** (重複含む主要画面優先)

> **注**: 完全な抽出には `grep -rP '(?<!["\'>])[A-Z][a-z]{2,}(?![^<]*</)' src/components --include="*.tsx"` 等の追加調査が必要。

---

## 4. 環境変数の一覧

| 変数名 | 参照箇所 | `.env.example` 有無 |
|--------|----------|---------------------|
| `NEXT_PUBLIC_API_KEY` | `src/lib/firebase/config.ts:2` | ❌ なし |
| `NEXT_PUBLIC_AUTH_DOMAIN` | `src/lib/firebase/config.ts:3` | ❌ なし |
| `NEXT_PUBLIC_PROJECT_ID` | `src/lib/firebase/config.ts:4` | ❌ なし |
| `NEXT_PUBLIC_STORAGE_BUCKET` | `src/lib/firebase/config.ts:5` | ❌ なし |
| `NEXT_PUBLIC_MESSAGING_SENDER_ID` | `src/lib/firebase/config.ts:6` | ❌ なし |
| `NEXT_PUBLIC_APP_ID` | `src/lib/firebase/config.ts:7` | ❌ なし |
| `NEXT_PUBLIC_MEASUREMENT_ID` | `src/lib/firebase/config.ts:8` | ❌ なし |
| `NEXT_PUBLIC_USE_EMULATOR` | `src/lib/env.ts:4` | ❌ なし |
| `NEXT_PUBLIC_URL` | `src/lib/env.ts:7` | ❌ なし |
| `TWITTER_API_KEY` | `phase0_recon.md:手順2` (トレンド API 用) | ❌ なし |
| `TWITTER_API_SECRET` | `phase0_recon.md:手順2` | ❌ なし |
| `TWITTER_BEARER_TOKEN` | `phase0_recon.md:手順2` | ❌ なし |
| `EMAIL_API` | `functions/.env` (検証用ダミー、本番は Secret Manager) | ❌ なし |
| `EMAIL_API_PASSWORD` | 同上 | ❌ なし |
| `TARGET_EMAIL` | 同上 | ❌ なし |

> **注意**: 秘密値は記載していない。変数名のみ。

---

## 5. 未確認事項

| # | 項目 | 理由 |
|---|------|------|
| 1 | `npm run build` の成否 | 実行環境で未確認。ビルドエラーの可能性あり (型エラー、未使用インポート等) |
| 2 | `npm run lint` / `npx tsc --noEmit` の成否 | 同上。ESLint/TypeScript エラーの有無不明 |
| 3 | `npm run test:ci` 実行結果 (テストファイル 0 件は確認済み) | Jest 設定のみ。テストコード未存在 |
| 4 | 本番 Firebase デプロイ後の `storage.rules` `firestore.get()` 動作 (Spark プラン) | エミュレータでは動作するが、本番の読み取り上限 (5 万/日) と権限でブロックされる可能性 |
| 5 | Cloud Functions (`normalize-stats`, `notify-email`) の本番デプロイ可否 | Spark プランでは Functions デプロイ不可 (Blaze 必須) |
| 6 | カスタムクレーム `admin: true` 付与後のルール動作 | Firebase Console / Admin SDK での付与手順・反映遅延 (最大 1 時間) の実測未確認 |
| 7 | インデックス作成完了待ち時間 (`conversations`, `notifications`, `bookmarks/createdAt`) | 数分〜数時間。デプロイ順序 (インデックス先行 → ルール) の実運用未確認 |
| 8 | Twitter API トレンド取得の本番動作 (Bearer Token 必須) | API キー未設定時のエラー表示のみ確認済み |

---

## 6. 司令の判断が必要な事項 (上位 3 点)

1. **Cloud Functions 代替の実装場所**  
   `normalize-stats` (ツイート削除時の統計整合) と `notify-email` (新規ツイートメール通知) は Spark プランで動かない。Vercel Next.js API ルート (Admin SDK) で実装するか、Blaze プランへ移行するか。設計書 `data_model.md` では Vercel API ルート前提だが、司令のコスト/運用判断要。

2. **DM 画像の Storage アクセス制御方式**  
   `storage.rules` で `firestore.get()` を使う設計 (A) を採用し本番検証するか、最初から Signed URL 方式 (B) で実装するか。設計書 `open_questions.md` では「A で進め、失敗なら B へフォールバック」推奨だが、実装工数 (B は Vercel API 追加 1-2h) を許容するか判断要。

3. **i18n 導入 vs 一括文字列置換**  
   日本語化対象が約 95 箇所に散在。`next-intl` 等の i18n ライブラリ導入 (構造的・将来多言語対応可) か、grep 置換で一括日本語化 (即効・軽量) か。Phase 1 では後者、Phase 2 以降で前者移行が現実的だが、方針確定要。

---

## 付録: 区分別件数サマリー

| 区分 | 件数 |
|------|------|
| A: 無効化・仮置き | 6 |
| B: 未接続の機能 | 10 |
| C: Firebase 関連 | 8 |
| D: 日本語化の残り | 20 ファイル (約 95 箇所) |
| E: 環境・設定 | 6 |
| F: テストと品質 | 3 |
| G: 既存機能の穴 | 5 |
| H: ルーティングとページ | 3 |
| **合計** | **61 項目** (日本語化はファイル単位で 1 件カウント) |

---

*作成日: 2026-11-12*  
*作成者: 監査担当エージェント (kai)*