# 05 ClaudeOS 開発フロー（ClaudeOS Dev Flow）

## 1. 概要

AEGIS-SIGHT プロジェクトでは、ClaudeOS v4 による自律開発を採用する。
本ドキュメントでは、Monitor / Build / Verify / Improve の 4 フェーズループ、
Agent Teams による並列開発、WorkTree 運用について定義する。

---

## 2. ClaudeOS v4 アーキテクチャ

### 2.1 全体構成

```
┌─────────────────────────────────────────────────────┐
│                  ClaudeOS v4                         │
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │ Monitor  │→│  Build   │→│  Verify  │→ ...      │
│  │  (1h)    │  │  (2h)    │  │  (2h)    │          │
│  └──────────┘  └──────────┘  └──────────┘          │
│       ↑                           │                  │
│       │    ┌──────────┐           │                  │
│       └────│ Improve  │←──────────┘                  │
│            │  (3h)    │                              │
│            └──────────┘                              │
│                                                     │
│  ┌──────────────────────────────────────────┐       │
│  │           Agent Teams                     │       │
│  │  ┌────────┐ ┌────────┐ ┌────────┐       │       │
│  │  │Agent A │ │Agent B │ │Agent C │       │       │
│  │  │(feat)  │ │(fix)   │ │(test)  │       │       │
│  │  └────────┘ └────────┘ └────────┘       │       │
│  └──────────────────────────────────────────┘       │
│                                                     │
│  ┌──────────────────────────────────────────┐       │
│  │           WorkTree 並列開発               │       │
│  │  worktree-A  worktree-B  worktree-C     │       │
│  └──────────────────────────────────────────┘       │
│                                                     │
│  ┌──────────────────────────────────────────┐       │
│  │     GitHub Projects / Issues / PR         │       │
│  └──────────────────────────────────────────┘       │
│                                                     │
│  Runtime: 最大 8 時間 │ Loop Guard 優先              │
└─────────────────────────────────────────────────────┘
```

---

## 3. 4 フェーズループ

### 3.1 Monitor フェーズ（1 時間）

**目的**: 現在の状況を把握し、作業計画を立案する。

| タスク | 内容 |
|--------|------|
| GitHub Projects 確認 | Inbox / Backlog / Ready の Issue を確認 |
| Issue トリアージ | 優先順位の評価と割り当て |
| CI 状態確認 | 失敗している CI の特定 |
| 依存関係チェック | ブロッカーの特定と解消方針策定 |
| 作業計画策定 | Build フェーズの作業リストを作成 |

**アクション**:

```
1. gh issue list --state open --label "ready" でReady状態のIssueを取得
2. GitHub Projects のステータスを確認
3. CI の最新状態を確認
4. 作業計画を策定し、Issue のステータスを更新
   Inbox → Backlog → Ready → Development
```

### 3.2 Build フェーズ（2 時間）

**目的**: 計画に基づいて実装を行う。

| タスク | 内容 |
|--------|------|
| ブランチ作成 | feature/ または fix/ ブランチを作成 |
| WorkTree 作成 | 並列作業が必要な場合は WorkTree を作成 |
| 実装 | コーディング規約に従った実装 |
| テスト作成 | ユニットテスト / 統合テストの作成 |
| コミット | Conventional Commits に従ったコミット |
| PR 作成 | テンプレートに従った PR 作成 |

**アクション**:

```
1. git switch -c feature/<issue番号>-<説明>
2. 実装とテストを作成
3. ruff check / ruff format でLintチェック
4. pytest / pnpm test でテスト実行
5. git commit -m "feat(scope): ..."
6. gh pr create --title "..." --body "..."
7. GitHub Projects のステータスを Development に更新
```

### 3.3 Verify フェーズ（2 時間）

**目的**: CI による自動検証と品質確認を行う。

| タスク | 内容 |
|--------|------|
| CI 結果確認 | GitHub Actions の実行結果を監視 |
| テスト結果分析 | 失敗テストの原因分析 |
| カバレッジ確認 | カバレッジしきい値の達成確認 |
| セキュリティスキャン | 脆弱性スキャン結果の確認 |
| 自動修復 | CI 失敗時の自動修復 |

**アクション**:

```
1. gh run watch で CI の実行を監視
2. CI 失敗の場合:
   a. エラー内容を分析
   b. CI Manager が修復方針を決定
   c. Auto Repair で修正を実施
   d. 再コミット → 再Verify
3. 全チェックパスを確認
```

**失敗時のフロー**:

```
Verify 失敗
  ↓
CI Manager（エラー分析）
  ↓
Auto Repair（自動修正）
  ↓
再コミット
  ↓
再 Verify
  ↓
パス → Improve フェーズへ
失敗 → 再度 Auto Repair（最大3回）
```

### 3.4 Improve フェーズ（3 時間）

**目的**: コードの品質向上、リファクタリング、ドキュメント更新を行う。

| タスク | 内容 |
|--------|------|
| コードレビュー | 自動レビューによる品質改善提案 |
| リファクタリング | 技術的負債の解消 |
| ドキュメント更新 | API ドキュメント、設計書の更新 |
| パフォーマンス改善 | ボトルネックの特定と改善 |
| 次ループ計画 | 次の Monitor フェーズへの引き継ぎ |

**アクション**:

```
1. コードの品質メトリクスを確認
2. リファクタリング対象を特定
3. 改善の実施とテスト
4. ドキュメントの更新
5. GitHub Projects のステータスを更新
   Verify → Deploy Gate → Done
```

---

## 4. STABLE 判定

### 4.1 STABLE 条件

STABLE と判定されるためには以下の全条件を満たす必要がある:

| 条件 | 基準 |
|------|------|
| テスト | 全パス |
| CI | 全パス |
| Lint | エラー 0 |
| Build | 成功 |
| エラー | 0 件 |
| セキュリティ | 既知脆弱性 0 件 |

### 4.2 必要ループ回数（N）

変更の規模に応じて、STABLE 達成に必要なループ回数が異なる:

| 規模 | ループ回数 | 基準 |
|------|-----------|------|
| small | 2 回 | ドキュメント修正、設定変更、小規模バグ修正 |
| normal | 3 回 | 機能追加、中規模リファクタリング |
| critical | 5 回 | アーキテクチャ変更、セキュリティ対応、大規模機能 |

### 4.3 STABLE 達成後のアクション

```
STABLE 達成
  ↓
Deploy Gate に移行
  ↓
staging デプロイ
  ↓
スモークテスト
  ↓
production デプロイ（手動承認）
  ↓
Done に移行
```

---

## 5. Agent Teams

### 5.1 Agent の役割分担

| Agent | 役割 | 担当領域 |
|-------|------|---------|
| Main Agent | 開発統括 | 全体調整、計画策定、最終判断 |
| Backend Agent | バックエンド開発 | Python, FastAPI, SQLAlchemy, Celery |
| Frontend Agent | フロントエンド開発 | Next.js, TypeScript, Tailwind CSS |
| Agent Dev | エージェント開発 | PowerShell, Pester |
| CI Manager | CI/CD 管理 | GitHub Actions, 品質ゲート監視 |
| Review Agent | コードレビュー | 品質チェック、セキュリティレビュー |

### 5.2 Agent 間連携

```
Main Agent（統括）
  ├─ Backend Agent
  │    └─ WorkTree: ../AEGIS-SIGHT-backend-<feature>
  ├─ Frontend Agent
  │    └─ WorkTree: ../AEGIS-SIGHT-frontend-<feature>
  ├─ Agent Dev
  │    └─ WorkTree: ../AEGIS-SIGHT-agent-<feature>
  ├─ CI Manager
  │    └─ CI 失敗時の自動修復を担当
  └─ Review Agent
       └─ PR レビューを担当
```

### 5.3 Agent の起動と制御

```bash
# Main Agent の起動（ClaudeOS v4 ブートローダー）
claude --mode agent

# Agent Teams の並列作業はMain Agentが自動的に制御
# 各Agentは独立したWorktreeで作業する
```

---

## 6. WorkTree 並列開発

### 6.1 WorkTree の構成

```
/project-root/
  AEGIS-SIGHT/                          # main ワーキングツリー
  AEGIS-SIGHT-feature-42/               # feature/42 の WorkTree
  AEGIS-SIGHT-fix-78/                   # fix/78 の WorkTree
  AEGIS-SIGHT-refactor-55/              # refactor/55 の WorkTree
```

### 6.2 WorkTree 操作

```bash
# WorkTree の作成
git worktree add ../AEGIS-SIGHT-feature-42 -b feature/42-user-auth

# WorkTree の一覧
git worktree list

# WorkTree での作業
cd ../AEGIS-SIGHT-feature-42
# ... 作業 ...

# WorkTree の削除（マージ後）
git worktree remove ../AEGIS-SIGHT-feature-42
```

### 6.3 並列開発のルール

| ルール | 内容 |
|--------|------|
| ファイル分離 | 同一ファイルの同時編集を避ける |
| ブランチ分離 | 各 WorkTree は独立したブランチ |
| 定期リベース | main の変更を定期的に取り込む |
| 速やかな削除 | マージ完了後は速やかに WorkTree を削除 |
| コンフリクト防止 | 作業前に影響範囲を確認 |

### 6.4 コンフリクト発生時の対応

```
コンフリクト検出
  ↓
Main Agent がコンフリクトを分析
  ↓
影響範囲の小さい方を先にマージ
  ↓
残りのブランチを rebase
  ↓
コンフリクト解消
  ↓
再テスト → 再Verify
```

---

## 7. GitHub Projects 連携

### 7.1 ステータスフロー

```
Inbox → Backlog → Ready → Development → Verify → Deploy Gate → Done
                                                          ↓
                                                       Blocked
```

### 7.2 各ステータスの定義

| ステータス | 定義 | 担当 |
|-----------|------|------|
| Inbox | 新規登録された Issue | 自動 |
| Backlog | トリアージ済み、優先順位決定済み | Monitor フェーズ |
| Ready | 実装可能な状態 | Monitor フェーズ |
| Development | 実装中 | Build フェーズ |
| Verify | CI / テスト検証中 | Verify フェーズ |
| Deploy Gate | デプロイ待ち | STABLE 判定後 |
| Done | 完了 | デプロイ後 |
| Blocked | ブロッカーあり | 随時 |

### 7.3 自動更新

```bash
# Issue のステータス更新（gh CLI）
gh issue edit <number> --add-label "status:development"

# PR とIssueの紐付け
# コミットメッセージまたはPRに "Closes #<number>" を含める
```

---

## 8. ランタイム管理

### 8.1 最大ランタイム

- 最大 **8 時間** の連続稼働
- **Loop Guard** が優先され、8 時間で強制終了
- CTO（人間）が最終判断権を持つ

### 8.2 タイムアロケーション

| フェーズ | 時間 | 累計 |
|---------|------|------|
| Monitor | 1h | 1h |
| Build | 2h | 3h |
| Verify | 2h | 5h |
| Improve | 3h | 8h |

### 8.3 Loop Guard

以下の条件で Loop Guard が発動する:

- 8 時間のランタイム到達
- 同一エラーが 3 回連続で発生
- CI が 5 回連続で失敗
- メモリ / リソースの制約に到達

### 8.4 強制終了時の出力

強制終了時には以下の最終報告を出力する:

```
# 最終報告

## 開発内容
- 実装した機能 / 修正の一覧

## テスト / CI 結果
- テスト結果のサマリ
- CI の最終状態

## PR / Merge
- 作成した PR の一覧
- マージ済み / 未マージの状態

## Deploy
- デプロイの状態

## 残課題
- 未完了のタスク
- 既知の問題

## 次フェーズ
- 次回の作業計画
- 推奨事項
```

---

## 9. ベストプラクティス

### 9.1 効率的なループ運用

- Monitor フェーズで作業を明確に定義し、Build フェーズでの迷いを減らす
- 小さな PR を頻繁に作成し、レビュー・マージのサイクルを早める
- Verify フェーズでの失敗は Auto Repair に任せ、人間の介入を最小化する

### 9.2 品質維持のポイント

- テストを先に書く（TDD）ことで、Build フェーズの手戻りを減らす
- Lint / Format はコミット前に自動実行する（pre-commit hook）
- カバレッジ 80% を下回らないよう継続的に監視する

### 9.3 コミュニケーション

- Issue のコメントに作業進捗を記録する
- PR の description に十分な情報を記載する
- ブロッカー発生時は速やかに Blocked ステータスに変更し、理由を明記する
