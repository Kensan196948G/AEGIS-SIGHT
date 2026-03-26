# 03 Git 運用ルール（Git Workflow）

## 1. 概要

AEGIS-SIGHT プロジェクトにおける Git の運用ルールを定義する。
Feature Branch Workflow を採用し、main ブランチへの直接 push を禁止する。
全ての変更は Pull Request（PR）を経由してマージする。

---

## 2. ブランチ戦略

### 2.1 ブランチ構成

```
main
 ├── feature/<issue番号>-<説明>     # 機能開発
 ├── fix/<issue番号>-<説明>         # バグ修正
 ├── hotfix/<issue番号>-<説明>      # 緊急修正
 ├── refactor/<issue番号>-<説明>    # リファクタリング
 ├── docs/<issue番号>-<説明>        # ドキュメント
 └── chore/<issue番号>-<説明>       # 雑務（CI設定、依存更新等）
```

### 2.2 ブランチ命名規則

```
<プレフィックス>/<Issue番号>-<ケバブケースの説明>
```

**例:**

```
feature/42-user-authentication
fix/78-login-redirect-error
hotfix/101-critical-sql-injection
refactor/55-extract-user-service
docs/30-api-specification
chore/90-upgrade-fastapi
```

### 2.3 main ブランチの保護ルール

| ルール | 設定 |
|--------|------|
| 直接 push | 禁止 |
| PR 必須 | 有効 |
| レビュー承認数 | 1 名以上 |
| ステータスチェック必須 | CI（lint, test, build）全パス |
| force push | 禁止 |
| ブランチ削除（マージ後） | 自動削除 |

---

## 3. コミットメッセージ規約

### 3.1 フォーマット

[Conventional Commits](https://www.conventionalcommits.org/) を採用する。

```
<type>(<scope>): <subject>

<body>

<footer>
```

### 3.2 type 一覧

| type | 説明 |
|------|------|
| `feat` | 新機能の追加 |
| `fix` | バグ修正 |
| `docs` | ドキュメントの変更 |
| `style` | コードの意味に影響しない変更（空白、フォーマット等） |
| `refactor` | バグ修正でも機能追加でもないコード変更 |
| `perf` | パフォーマンス改善 |
| `test` | テストの追加・修正 |
| `build` | ビルドシステムや外部依存の変更 |
| `ci` | CI 設定の変更 |
| `chore` | その他の変更 |

### 3.3 scope 一覧

| scope | 対象 |
|-------|------|
| `backend` | Python / FastAPI |
| `frontend` | Next.js / TypeScript |
| `agent` | PowerShell エージェント |
| `db` | データベース / マイグレーション |
| `ci` | GitHub Actions |
| `docker` | Docker / Compose |
| `docs` | ドキュメント |

### 3.4 コミットメッセージの例

```
feat(backend): ユーザー認証APIを追加

JWT ベースの認証エンドポイント（/auth/login, /auth/refresh）を実装。
bcrypt によるパスワードハッシュとトークンリフレッシュ機能を含む。

Closes #42
```

```
fix(frontend): ログインリダイレクトの無限ループを修正

認証トークンの有効期限チェックに誤りがあり、
有効なトークンを持つユーザーもログインページにリダイレクトされていた。

Fixes #78
```

```
chore(ci): テストカバレッジのしきい値を80%に設定

Refs #90
```

### 3.5 ClaudeOS 自律開発時のコミット

ClaudeOS によるコミットには以下の Co-Author を付与する:

```
Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
```

---

## 4. Pull Request 規約

### 4.1 PR テンプレート

```markdown
## Summary
<!-- 変更内容の概要（1-3 行） -->

## Changes
<!-- 変更内容の詳細（箇条書き） -->
-

## Related Issues
<!-- 関連する Issue へのリンク -->
Closes #

## Test Plan
<!-- テスト方法 -->
- [ ] ユニットテスト追加・更新
- [ ] E2E テスト追加・更新
- [ ] ローカルで動作確認

## Screenshots
<!-- UI 変更がある場合はスクリーンショットを添付 -->

## Checklist
- [ ] コーディング規約に準拠している
- [ ] テストが追加されている
- [ ] ドキュメントが更新されている
- [ ] CI が全てパスしている
```

### 4.2 PR のルール

| ルール | 内容 |
|--------|------|
| タイトル | Conventional Commits と同じフォーマット |
| サイズ | 原則 400 行以内（大きい場合は分割） |
| レビュアー | 最低 1 名をアサイン |
| ラベル | `feature`, `fix`, `docs` 等の適切なラベルを付与 |
| CI 必須 | 全てのチェックがパスしていること |
| Draft PR | WIP の場合は Draft PR として作成 |

### 4.3 PR のライフサイクル

```
Draft PR 作成
  ↓
実装完了 → Ready for Review に変更
  ↓
レビュー実施
  ↓
承認 / 修正依頼
  ↓
CI パス確認
  ↓
Squash Merge → ブランチ自動削除
```

---

## 5. レビュー方針

### 5.1 レビュー観点

| カテゴリ | チェックポイント |
|----------|----------------|
| 正確性 | ロジックに誤りがないか、エッジケースが考慮されているか |
| セキュリティ | インジェクション、認証・認可の不備がないか |
| パフォーマンス | N+1 クエリ、不必要なループがないか |
| 可読性 | 命名、コメント、構造が適切か |
| テスト | テストが十分か、境界値テストがあるか |
| 規約準拠 | コーディング規約に従っているか |

### 5.2 レビューコメントのプレフィックス

| プレフィックス | 意味 |
|---------------|------|
| `must:` | 必ず修正が必要 |
| `should:` | 修正を推奨（理由があればスキップ可） |
| `nit:` | 細かい指摘（修正任意） |
| `question:` | 質問・確認事項 |
| `praise:` | 良い点の称賛 |

### 5.3 レビューの SLA

| 項目 | 目標 |
|------|------|
| 初回レビュー開始 | PR 作成から 4 時間以内 |
| レビュー完了 | PR 作成から 1 営業日以内 |
| hotfix | PR 作成から 1 時間以内 |

---

## 6. WorkTree 並列開発

ClaudeOS v4 の WorkTree 並列開発では以下のルールを適用する。

### 6.1 WorkTree の命名

```bash
# WorkTree ディレクトリ
git worktree add ../AEGIS-SIGHT-feature-42 feature/42-user-authentication
```

### 6.2 並列開発のルール

- 各 WorkTree は独立した feature ブランチで作業する
- 同一ファイルの同時編集を避ける（コンフリクト防止）
- マージ前に必ず `git rebase main` で最新化する
- WorkTree はマージ完了後に速やかに削除する

```bash
# WorkTree の一覧確認
git worktree list

# WorkTree の削除
git worktree remove ../AEGIS-SIGHT-feature-42
```

---

## 7. Git の便利コマンド集

```bash
# ブランチ作成と切り替え
git switch -c feature/42-user-authentication

# main の最新を取り込む
git fetch origin
git rebase origin/main

# コミットの修正（直前のみ）
git commit --amend

# インタラクティブリベース（ローカルコミットの整理）
git rebase -i origin/main

# 変更の一時退避
git stash
git stash pop

# 特定コミットの取り込み
git cherry-pick <commit-hash>

# ブランチの削除（マージ済み）
git branch -d feature/42-user-authentication
```
