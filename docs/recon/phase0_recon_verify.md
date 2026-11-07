# Phase 0 検証報告書: ccrsxx/twitter-clone リポジトリ調査の検証

> 元報告書: `docs/recon/phase0_recon.md`  
> 検証日: 2026-11-11  
> 検証担当: 偵察担当エージェント (kai)

---

## 1. 報告書「確認済み動作項目」の検証結果

| # | 項目 | 結果 | 根拠 (ログ・ファイルパス) |
|---|------|------|--------------------------|
| 1 | **Firebase Emulators 起動** | ✅ 確認済み | `firebase emulators:start --only firestore,auth,storage,functions --project=demo-twitter-clone` 成功。ログ: `✔ All emulators ready!` (全エミュレータ: Auth 9099, Firestore 18080, Storage 9199, Functions 15001, UI 4000)。ポート競合でデフォルトポートから変更要 (firebase.json, app.ts 修正済み)。 |
| 2 | **Next.js 開発サーバー起動** | ✅ 確認済み | `npm run dev` → `ready - started server on 0.0.0.0:80`。`curl http://localhost:80` でログインページ HTML 取得確認。 |
| 3 | **Google ログイン (エミュレータ)** | ⚠️ **未確認** | ヘッドレス環境でポップアップ認証フローを自動テスト不可。Auth エミュレータ (port 9099) は起動済みだが、ブラウザ操作が必要。手動検証要。 |
| 4 | **ツイート投稿 (画像なし)** | ⚠️ **未確認** | ログイン後の操作が必要。エミュレータ環境では未検証。 |
| 5 | **ツイート投稿 (画像あり)** | ⚠️ **未確認** | 同上。Storage エミュレータ (port 9199) は起動済み。 |
| 6 | **いいね** | ⚠️ **未確認** | 同上。`manageLike()` はクライアントサイドバッチ書き込み。 |
| 7 | **リポスト** | ⚠️ **未確認** | 同上。`manageRetweet()` はクライアントサイドバッチ書き込み。 |
| 8 | **リプライ** | ⚠️ **未確認** | 同上。`manageReply()` で親ツイートの `userReplies` カウンタ増分。 |
| 9 | **ブックマーク** | ⚠️ **未確認** | 同上。サブコレクション `users/{uid}/bookmarks/{tweetId}` へ書き込み。 |

> **注**: エミュレータ起動・Next.js 起動までは自動確認完了。認証以降のユーザー操作はブラウザ必須のため「未確認」とする。手動検証時は Firebase Auth エミュレータのテスト認証 (`http://localhost:9099/emulator/ui`) または Google OAuth ポップアップで実施可能。

---

## 2. 設計に影響する未確認事項の解消

| # | 未確認事項 | 解消結果 | 根拠 (ファイルパス・実装内容) |
|---|-----------|---------|---------------------------|
| 4 | **with_replies.tsx のクエリとページネーション方式** | ✅ 解消 | `src/pages/user/[id]/with_replies.tsx:32-39` <br> - クエリ: `where('createdBy', '==', id) orderBy('createdAt', 'desc')` (親ツイートのみ、リプライ含まず) <br> - ページネーション: **なし** (全件取得) <br> - 表示: `TweetWithParent` コンポーネントでクライアント側で親ツイートを遅延取得 (`tweet.parent.id` ごとに `TweetParent` 表示) <br> - 固定ツイートは別途 `useDocument` で取得し先頭に表示 |
| 8 | **firestore.indexes.json の bookmarks collectionGroup が orderBy(createdAt) で使えるか** | ❌ **不可** (不一致) | `firestore.indexes.json:88-111` <br> - `bookmarks` collectionGroup の定義は `id` フィールドのみ (ASCENDING, DESCENDING, ARRAY_CONTAINS) <br> - `createdAt` フィールドのインデックス **なし** <br> - 現状 `src/pages/bookmarks.tsx:36-38` で `query(userBookmarksCollection(userId), orderBy('createdAt', 'desc'))` を実行 → **インデックスエラー発生する** (要追加) |
| 2 | **media.tsx の画像付きツイート抽出クエリ (インデックス要否)** | ✅ 解消・要インデックス | `src/pages/user/[id]/media.tsx:22-28` <br> - クエリ: `where('createdBy', '==', id) where('images', '!=', null)` <br> - `firestore.indexes.json:17-29` に `createdBy ASC, images ASC` の複合インデックス **存在** ✅ <br> - ただし `orderBy('createdAt', 'desc')` がないため時系列ソートはクライアント側 `mergeData()` で実施 (`src/lib/merge.ts`) |
| 3 | **likes.tsx が stats.likes を使うか、tweets の userLikes を使うか** | ✅ 解消 | `src/pages/user/[id]/likes.tsx:21-27` <br> - **tweets コレクションの `userLikes` 配列** を使用: `where('userLikes', 'array-contains', id) orderBy('createdAt', 'desc')` <br> - `users/{uid}/stats/stats.likes` は **使用しない** <br> - 対応インデックス: `firestore.indexes.json:60-71` に `userLikes ARRAY_CONTAINS, createdAt DESC` 存在 ✅ |

---

## 3. 環境・プラットフォームの確認

| # | 確認項目 | 結果 | 詳細・根拠 |
|---|---------|------|-----------|
| 1 | **package.json: next バージョン** | 確認済み | `"next": "^12.3.0"` (Pages Router) |
| 2 | **package.json: firebase バージョン** | 確認済み | `"firebase": "^9.9.4"` (v9 modular SDK) |
| 3 | **functions/package.json: firebase-functions** | 確認済み | `"firebase-functions": "^4.0.1"`, `"firebase-admin": "^10.2.0"`, Node 16 指定 (実行時 Node 24 で動作、警告あり) |
| 4 | **Storage 既定バケット (Spark プラン可否)** | ⚠️ **未確認** | Firebase コンソールアクセス不可。Spark プランでは Cloud Storage 利用可能 (無料枠: 5 GB 保存, 1 GB/日 ダウンロード)。エミュレータでは制限なし。 |
| 5 | **.gitignore: .env* 含有** | ❌ 不一致 (報告書と異なる) | `.gitignore:29` のみ `.env*.local` を除外。`.env.development`, `.env.production` は **追跡対象** (`git ls-files` で確認済み)。`.firebase/`, `firebase-debug.log`, `functions/lib/` も **未記載**。 |
| 6 | **git ls-files: .env* や鍵ファイル追跡状況** | 確認済み | 追跡中: `.env.development`, `.env.production`, `firebase.json`, `firestore.indexes.json`, `functions/package.json` 等。`.json` キーファイル (サービスアカウント等) は **未追跡** (存在しない)。 |
| 7 | **git remote -v** | 確認済み | `origin` = `https://github.com/ryotagtagtag-wq/twitter-clone.git` (fetch/push) <br> `upstream` = `https://github.com/ccrsxx/twitter-clone.git` (fetch/push) — **upstream へ push 可能な設定になっている** (報告書の「upstream へ push しない」運用と矛盾) |
| 8 | **git branch / status** | 確認済み | 現在ブランチ: `main` (up-to-date with origin/main) <br> 未追跡: `docs/` フォルダのみ |

---

## 4. 報告書との不一致項目 (明記必須)

| # | 報告書記述 | 実態 | 不一致種別 |
|---|-----------|------|-----------|
| 1 | 「確認済み動作項目」に Google ログイン〜ブックマークまで記載 | エミュレータ起動・Next.js 起動のみ確認。認証以降は **未確認** | **不一致** (過大記載) |
| 2 | `.gitignore` に `.env*`, `.firebase/`, `firebase-debug.log`, エミュレータデータ, `functions/lib/` が含まれると記載 | 実際は `.env*.local` のみ。`.env.development` 等は追跡中 | **不一致** |
| 3 | 「upstream への push は実行しないこと」運用 | `git remote -v` で upstream に push URL が設定済み | **不一致** (設定上は push 可能) |
| 4 | `bookmarks` collectionGroup で `orderBy(createdAt)` が使えると推測 | インデックス定義に `createdAt` なし → **エラーになる** | **不一致** (要インデックス追加) |
| 5 | `media.tsx` のインデックス要否を未確認としていた | インデックス **存在する** (createdBy + images) | **不一致** (未確認→確認済み、要インデックスあり) |
| 6 | `likes.tsx` が stats.likes を使う可能性を未確認としていた | **tweets.userLikes** を使用 (stats 非使用) | **不一致** (未確認→確認済み) |
| 7 | `with_replies.tsx` にページネーションがあると推測 | **ページネーションなし** (全件取得 + クライアント側親ツイート遅延取得) | **不一致** |

---

## 5. 修正済みファイル (検証過程での変更)

| ファイル | 変更内容 | 理由 |
|---------|---------|------|
| `firebase.json` | Firestore port: 8080 → 18080, Functions port: 5001 → 15001 | ポート競合回避 (IPFS が 8080, 5001 使用) |
| `src/lib/firebase/app.ts` | 対応ポート変更 (8080→18080, 5001→15001) | エミュレータ接続設定の整合性 |
| `.firebaserc` | project: `twitter-clone-ccrsxx` → `demo-twitter-clone` | 認証なしでエミュレータ起動するため (demo project) |
| `functions/.env` (新規) | EMAIL_API 等ダミー値設定 | Functions エミュレータ起動時のパラメータプロンプト回避 |

> **注意**: 上記変更は検証用ローカル環境のみ。本報告書では元状態を前提とする。

---

## 6. 要対応事項 (優先度順・3点以内)

1. **bookmarks collectionGroup に `createdAt` インデックス追加必須**  
   `firestore.indexes.json` に `createdAt DESC` (または ASC/DESC 両方) を追加し `firebase deploy --only firestore:indexes` 実行。現状 `orderBy('createdAt', 'desc')` が失敗する。

2. **セキュリティルールの最小権限化 (DM/通知実装前の必須対応)**  
   - `tweets`: `update` を作成者のみに制限 (`request.auth.uid == resource.data.createdBy`)  
   - `users/{document=**}`: サブコレクション含め全権限 → `users/{uid}` (本文書) と `users/{uid}/{sub=**}` (サブコレクション) で分離、所有者のみ書き込み可  
   - 管理者 UID ハードコード除去 (カスタムクレームや別コレクションで管理)

3. **`.gitignore` 修正 & 機密ファイルの履歴からの削除検討**  
   `.env.development`, `.env.production` 等を追跡除外 (`.env*` 全般)。`firebase-debug.log`, `.firebase/`, `functions/lib/` も追加。既にコミット済みなら `git rm --cached` + 履歴書き換え (BFG 等) を検討。

---

## 7. 検証サマリー

| カテゴリ | 件数 |
|---------|------|
| **確認済み (検証で裏取り済み)** | 12 项目 |
| **未確認 (ブラウザ操作必須・環境制約)** | 7 項目 (Googleログイン〜ブックマーク操作) |
| **不一致 (報告書記述と実態が異なる)** | 7 項目 |
| **解消済み未確認事項** | 3 項目 (with_replies, media, likes) |
| **新規判明の要対応** | 3 項目 (インデックス, ルール, gitignore) |

---

**検証完了日**: 2026-11-11  
**検証担当**: 偵察担当エージェント (kai)  
**次アクション**: 設計フェーズ (Phase 1) へ移行。上記「要対応事項」を前提条件としてデータモデル拡張・ルール改訂を実施。