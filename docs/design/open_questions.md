# 設計未決事項 (Open Questions) - Phase 1

> 司令 (kai) の判断を要する項目。選択肢と推奨を併記。

---

## 決定済み（司令承認）

### 1. 管理者判定
カスタムクレーム `admin: true` で判定する。ルールにハードコードされた UID は削除する。初代管理者は Admin SDK のローカルスクリプトで付与する。クレーム反映に最大 1 時間かかることを前提とする。

### 2. tweet 更新ルール
- 作成者本人は全フィールドを更新可能
- 本人以外は、`userLikes` と `userRetweets` に対し、自身の UID を 1 件だけ追加または削除できる
- 本人以外が `userReplies` を変更する場合は ±1 のみ許可する
- 本人以外が上記と他のフィールドを同時に変更した場合は拒否する
- 判定には `size()`、`hasAll()`、`in` を用いる。`diff().addedKeys()` は配列に使えないため使用しない

### 3. DM 画像の Storage 検証
`storage.rules` で `firestore.get()` を用いて会話参加者を検証する。本番環境での動作を確認し、失敗した場合は署名付き URL 方式へ切り替える。本番確認を完了条件とする。

### 4. 通知の冪等性
通知文書は `setDoc(merge: true)` で作成する。push 通知は、新規作成時、または既読から未読に戻った時のみ送信する。通知の作成・既読更新・削除は Vercel API ルート（Admin SDK）のみが行う。

### 5. 会話 ID
会話 ID は `conv_{uid1}_{uid2}` の形式とし、UID を昇順にソートして連結する。会話の作成は Vercel API ルートで行い、ルール側での ID 検証は行わない。

### 6. ハッシュタグ
クライアント側で生成する。正規化ロジックは `src/lib/utils/hashtag.ts` に集約する。タグは表示用であり、権限判定には用いない。

### 7. デプロイ順序
インデックスを先にデプロイし、作成完了を待ってからルールをデプロイする。手動運用とし、 CI 化は Phase 4 で検討する。

### 8. 既定値の扱い
converter で `??` を用いて `null`、`[]`、`''` へ正規化する。

### 既知の制約
本人以外による `userReplies` の ±1 の繰り返しは、Phase 1 では許容する。将来のサブコレクション分離で根本対策する。

---

## 1. 管理者判定の実装方式

### 背景
- 現行 `firestore.rules` は UID ハードコード (`Twt0A27bx9YcG4vu3RTsR7ifJzf2`) で管理者判定
- セキュリティ・運用観点から **ハードコードは削除必須**
- 新規機能 (DM/通知) でも管理者権限が必要になる可能性あり (例: 違反会話削除、通知一括既読等)

### 選択肢

| 方式 | 概要 | メリット | デメリット | 推奨度 |
|------|------|----------|------------|--------|
| **A. Firebase Auth カスタムクレーム** (`admin: true`) | `request.auth.token.admin == true` で判定 | - 標準的・推奨パターン<br>- ルール内で `request.auth.token` 参照可能<br>- 管理コンソール / Admin SDK で付与・取消容易 | - 付与には Admin SDK (Cloud Functions / Vercel API / ローカルスクリプト) 必要<br>- トークンリフレッシュまで反映されない (最大 1 時間) | ⭐⭐⭐ **推奨** |
| **B. 専用 `admins` コレクション** | `/admins/{uid}` 存在で判定 (`exists(get(...))`) | - 即時反映<br>- ルールのみで完結 (Admin SDK 不要) | - `firestore.get()` コスト発生 (読み取り上限)<br>- Spark プランで上限リスク<br>- ルールが複雑化 | ⭐⭐ |
| **C. 環境変数 + カスタム関数** | `functions.config().admin_uids` 等を参照する関数 | - 既存 Functions 活用可能 | - Functions 呼び出しコスト・レイテンシ<br>- Spark プランでは Functions デプロイ不可 (要 Blaze) | ⭐ |
| **D. 管理者機能をルールで制御しない** | 全て Vercel API ルート (Admin SDK) で実行、ルールは `allow ... if false` | - ルールがシンプル<br>- Spark プラン制約回避 | - 管理者操作も API 経由必須<br>- リアルタイム購読での管理者フィルタ不可 | ⭐⭐ (現実的妥協案) |

### 推奨: **A (カスタムクレーム) + D の併用**

- **通常操作**: カスタムクレームで判定 (ルール内 `request.auth.token.admin == true`)
- **重い/頻度低い管理操作** (一括削除、統計リセット等): Vercel API ルート (Admin SDK) で実行し、ルールでは許可しない
- **実装手順**:
  1. Vercel API ルート `/api/admin/set-claim` 作成 (Admin SDK で `setCustomUserClaims(uid, { admin: true })`)
  2. 最初の管理者は Firebase Console > Authentication > ユーザー詳細 > カスタムクレームで手動付与
  3. ルール内 `function isAdmin() { return request.auth.token.admin == true; }` を有効化

### 判断事項
- [ ] 方式 A を採用するか？
- [ ] 最初の管理者 UID を誰にするか？ (現行ハードコード UID `Twt0A27bx9YcG4vu3RTsR7ifJzf2` を継承するか、新規指定か)
- [ ] 管理者専用 API ルートを Phase 1 で作るか、Phase 2 (DM/通知実装時) に先送りするか？

---

## 2. `tweets` 更新ルールの厳密度

### 背景
- 現行設計: `affectedKeys()` で許可リスト (`userLikes`, `userRetweets`, `userReplies`, `hashtags`, `searchText`, `updatedAt`) をチェック
- **懸念**: Firestore ルールでは `arrayUnion`/`arrayRemove` かどうかを直接検知できない
- 本人以外が `userLikes` を `['uid1', 'uid2']` → `['uid1', 'uid3']` (他人の UID 入れ替え) 等に書き換えても検知困難

### 選択肢

| 方式 | 概要 | メリット | デメリット |
|------|------|----------|------------|
| **A. 現行設計のまま (緩いチェック)** | 許可キーのみ変更なら許可。配列の中身検証はアプリ側 (utils.ts) で担保 | - ルールシンプル<br>- 実装済み `manageLike/Retweet` がバッチで正しく書く前提 | - 悪意あるクライアントからの直接書き込みで配列汚染可能 |
| **B. `request.resource.data.userLikes` の差分配列サイズチェック** | `request.resource.data.userLikes.size() - resource.data.userLikes.size() <= 1` 等で 1 件のみ追加/削除に制限 | - ある程度の制約になる | - 複数同時いいね (稀) で失敗<br>- `arrayRemove` 時もサイズ差 1 制限必要<br>- ルールが冗長化 |
| **C. 専用「いいね/リポスト」用サブコレクション分離** | `tweets/{id}/likes/{uid}`, `tweets/{id}/retweets/{uid}` に分離し、ドキュメント単位で作成/削除のみ許可 | - ルールで厳密制御可能 (作成=追加、削除=削除のみ)<br>- 配列汚染リスクゼロ | - **大幅なデータモデル変更** (既存 `userLikes`/`userRetweets` 配列廃止)<br>- 既存クエリ (`array-contains`) 全書き換え必要<br>- インデックス再設計 |

### 推奨: **A (現行維持) + アプリ側厳守**

- Phase 1 では **ルール大幅変更を避け、現行 `manageLike/Retweet/Reply` のバッチ書き込みを信頼する**
- 将来的に「サブコレクション分離 (C)」へ移行する場合は **Phase 2 以降の大型リファクタ** として計画
- ルールには「将来厳格化予定」コメントを残す

### 判断事項
- [ ] 現行設計 (A) で進めるか？
- [ ] 「将来サブコレクション分離」をロードマップに入れるか？

---

## 3. DM 画像 Storage ルールの `firestore.get()` 本番可否

### 背景
- `storage.rules` で `dm-images/{conversationId}/...` の読み取り時に `firestore.get(/databases/(default)/documents/conversations/...)` で参加者検証
- **Spark プラン (無料) で Storage ルールからの Firestore 参照が許可されるか公式ドキュメントに明記なし**
- エミュレータでは動作するが、本番でブロックされる可能性あり

### 選択肢

| 方式 | 概要 | メリット | デメリット |
|------|------|----------|------------|
| **A. 現行設計のまま (Firestore 参照)** | 参加者検証をルールで完結 | - セキュア (パス推測だけではアクセス不可)<br>- アプリ側ロジック不要 | - **本番で動作しないリスク**<br>- 読み取り上限 (5 万/日) 消費 |
| **B. 署名付き URL (Signed URL) 方式** | アップロード時 Vercel API で Signed URL 発行、有効期限付きでクライアントに返す。ルールは `allow read: if true` (または期限チェック) | - Spark プラン制約回避<br>- Firestore 参照不要<br>- 標準的なパターン | - Vercel API ルート実装必要<br>- URL 漏洩リスク (期限短縮で緩和)<br>- リアルタイム購読での画像表示に一手間 |
| **C. 公開読み取り許可 + パス非推測化** | `allow read: if request.auth != null` (認証済みなら誰でも)。パスに `conversationId` + ランダム文字列を含め推測困難に | - 実装最小<br>- 確実に動作 | - 会話非参加者が URL 入手すれば閲覧可能 (ただし推測困難) |

### 推奨: **A を採用し、本番デプロイ後に即座に検証。失敗なら B にフォールバック**

- Phase 1 では **A でルール記述** (コードとして正しい形を残す)
- デプロイ後、実環境で DM 画像アップロード・表示テストを実施
- 失敗 (403/400) なら **B (Signed URL)** へ切り替え (Vercel API 実装 1-2 時間)

### 判断事項
- [ ] まず A で進め、本番検証で決めるか？
- [ ] 検証失敗時のフォールバック実装 (B) を Phase 1 に含めるか、Phase 2 にするか？

---

## 4. 通知の決定的 ID による重複排除戦略

### 背景
- 通知 ID: `like_{actorId}_{postId}` 等の決定的形式
- 同一アクション (いいね→取り消し→再いいね) で同一 ID 再作成が発生
- Vercel API ルート (Admin SDK) で `setDoc(..., { merge: true })` または `runTransaction` で冪等処理必要

### 選択肢

| 方式 | 概要 | メリット | デメリット |
|------|------|----------|------------|
| **A. `setDoc(docRef, data, { merge: true })`** | 既存ドキュメントがあればマージ更新 (read → write) | - 実装簡単<br>- 既読フラグ (`read: false`) を維持したい場合に有利 | - 並行リクエストで競合時、最後の書き込み勝ち (問題なし) |
| **B. `runTransaction` で存在チェック後作成** | トランザクション内で `get` → なければ `set` | - 厳密な「初回のみ作成」保証 | - オーバーヘッド大<br>- 通知量多いとコスト増 |
| **C. `setDoc` (merge: false) + `catch` で `already-exists` 無視** | 作成失敗 (既存) を握りつぶす | - 最軽量 | - 既読フラグが `true` のまま再通知されない (仕様上 OK か要確認) |

### 推奨: **A (`merge: true`)**

- 「いいね取り消し→再いいね」で通知を再表示したい (未読に戻したい) 仕様なら `merge: true` で `read: false` に上書き
- 仕様が「一度既読なら再通知しない」なら C でも可

### 判断事項
- [ ] 再アクション時の通知挙動: **再表示 (未読化)** か **無視 (既読維持)** か？
- [ ] 決定に応じて Vercel API 実装方式を確定

---

## 5. `conversations.participants` の順序・正規化

### 背景
- 参加者 2 名の配列 `[uidA, uidB]` の順序は不定 (作成者が先頭とは限らない)
- `array-contains` クエリでは順序不問で検索可能
- しかし **会話作成時の重複防止** (A-B 間で既に会話があるかチェック) には順序非依存の比較が必要

### 選択肢

| 方式 | 概要 |
|------|------|
| **A. 作成時クライアント側でソートして正規化** | `participants: [uidA, uidB].sort()` で保存。重複チェックもソート済み配列で `where('participants', '==', sortedArray)` (完全一致) |
| **B. `array-contains-any` で両方向検索** | `where('participants', 'array-contains-any', [uidA, uidB])` でヒットすれば既存 (ただし 3 人以上の会話でもヒットするため要フィルタ) |
| **C. 会話 ID を決定的に生成** | `conversationId = [uidA, uidB].sort().join('_')` でドキュメント ID を固定。`get(docRef)` で存在チェック (最速・最確実) |

### 推奨: **C (決定的 ID)**

- ドキュメント ID に参加者 UID ソート連結を含める: `conv_${uids.sort().join('_')}`
- 作成時 `get(docRef)` → 存在すれば既存会話、なければ新規作成
- `array-contains` クエリも併用可能 (一覧取得用)

### 判断事項
- [ ] 方式 C で実装するか？ (会話 ID 形式: `conv_{uid1}_{uid2}` 等)

---

## 6. ハッシュタグ・メンション抽出・正規化の責務分担

### 背景
- `tweets.hashtags` (配列) と `searchText` (全文検索用連結) をクライアント側で生成して書き込む設計
- 将来 Algolia / Meilisearch 等導入時はサーバー側で生成したい

### 選択肢

| 方式 | 概要 |
|------|------|
| **A. クライアント完全生成 (現行案)** | `input.tsx` で正規表現抽出 → 正規化 (小文字、# 除去) → 書き込み |
| **B. Vercel API ルートで生成 (中継)** | クライアントは生テキスト送信 → API ルートで抽出・正規化 → Firestore 書き込み |
| **C. Cloud Functions (onCreate trigger) で生成** | Functions で自動付与 (Blaze 必須・Spark 不可) |

### 推奨: **A (クライアント生成) で Phase 1 完了、将来 B へ移行**

- Spark プラン制約で Functions 不可
- Vercel API ルート中継は「ツイート投稿 API」全体を置き換える大工事 (Phase 2 以降)
- まずはクライアント生成で動く形にし、将来的に API ルート移行パスを残す

### 判断事項
- [ ] 正規化ルール (小文字化、全角/半角、絵文字扱い等) を共通ユーティリティ (`src/lib/utils/hashtag.ts` 等) に切り出すか？

---

## 7. `bookmarks` collectionGroup インデックス追加のデプロイ順序

### 背景
- 検証報告書指摘: `bookmarks` に `createdAt` インデックスなし → `orderBy('createdAt', 'desc')` 失敗
- `firestore.indexes.json` に追加済み (fieldOverrides に `createdAt` ASC/DESC COLLECTION_GROUP)
- **インデックス作成は非同期・数分〜数時間かかる**

### 懸念
- ルールデプロイ (`firebase deploy --only firestore:rules`) とインデックスデプロイ (`firebase deploy --only firestore:indexes`) の順序
- インデックス作成完了前にルール適用すると、クエリがエラーになる可能性

### 推奨手順
1. `firebase deploy --only firestore:indexes` **先に実行**
2. Firebase Console > Firestore > Indexes で **「作成中」→「有効」になるまで待機**
3. 完了確認後、`firebase deploy --only firestore:rules` + `storage` 実行

### 判断事項
- [ ] この手順で CI/CD (GitHub Actions) に組み込むか、手動デプロイ運用にするか？

---

## 8. 既存 `tweets` 文書への新フィールド (`quotedPostId`, `hashtags`, `searchText`) 既定値扱い

### 背景
- マイグレーションなしで読み取り側でフォールバック (`?? null` / `?? []` / `?? ''`)
- TypeScript 型は `string | null` / `string[]` / `string` (非オプショナル) にしている

### 実装詳細
- `tweetConverter.fromFirestore` で `data.quotedPostId ?? null` 等を適用するか、コンポーネント側で `tweet.quotedPostId ?? null` とするか

### 推奨: **コンバータで正規化**

```typescript
fromFirestore(snapshot, options) {
  const data = snapshot.data(options);
  return {
    id: snapshot.id,
    ...data,
    quotedPostId: data.quotedPostId ?? null,
    hashtags: data.hashtags ?? [],
    searchText: data.searchText ?? ''
  } as Tweet;
}
```

- これで全コンポーネントが `undefined` チェック不要になる

### 判断事項
- [ ] コンバータ正規化で統一するか？

---

*作成日: 2026-11-11*  
*作成者: データ設計担当 (kai)*  
*次回更新: 司令の判断反映後*