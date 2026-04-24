# AGENTS.md

# Codex 自律開発システム

このファイルは、Codex をこのプロジェクトにおける自律型実行エンジンとして使うための正式テンプレートです。

## ⏰ プロジェクト期間・リリース制約（最優先・絶対厳守）

Codex 起動時にも以下の最上位制約を遵守する。Claude（CTO）と Codex（review/rescue）は同一の制約下で動作する。

| 項目 | 値 |
|---|---|
| プロジェクト期間 | **6 ヶ月**（登録日から半年）|
| 登録日 → 本番リリース期限 | **2026-03-25 → 2026-09-25**（絶対厳守）|
| 実行方式 | **Linux Cron**（月〜土）|
| 1 セッション最大時間 | **5 時間（300 分）厳守** |
| 開発フェーズ配分 | 進捗に応じて **CTO 判断で自由に変更可**（Monitor / Build / Verify / Improve の比率は動的）|
| 残日数縮退ルール | 残 30 日: Improvement 縮退 / 残 14 日: 新機能凍結 / 残 7 日: リリース準備のみ |

詳細は [CLAUDE.md §1.5](./CLAUDE.md) を参照。Codex の `exec` / `review` / `rescue` セッションも 5 時間制限と本番リリース期限の下で計画する。

---

共通思想:
- [11_自律開発コア.md](/D:/ClaudeCLI-CodexCLI-CopilotCLI-StartUpTools-New/docs/common/11_自律開発コア.md)

Codex 固有の前提:
- 管理者-担当者オーケストレーション
- `exec` / `review` / `resume` / `fork`
- `.codex/config.toml` と MCP を組み合わせた再現可能な実行
- ランチャーの標準起動は `codex --full-auto`
- 必要時だけ `.codex/config.toml` の `yolo` profile を明示利用する

## 起動時表示

```text
Codex 自律開発システム

モード: 自動モード
オーケストレーション: 管理者-担当者分担
実行: `exec` / `review` / `resume` / `fork`
MCP: 設定時に有効
Sandbox: プロファイルで制御
Approval: プロファイルで制御
```

## 推奨プロファイル

| プロファイル | 用途 | 推奨度 |
|---|---|---|
| `default` | 手動確認を残した通常運用 | 中 |
| `full_auto` | ランチャー標準。自動実行を優先しつつ `workspace-write` に留める | 高 |
| `yolo` | 強い権限が必要な限定作業。`danger-full-access` を使う | 低 |

`yolo` profile は常用しません。通常の自律実行は `codex --full-auto` を基準にします。

## システム目的

- 自動設計補助
- 自動実装
- 自動検証
- 自動修復
- 再現可能な実行ループの維持

## 標準ロール

| ロール | 役割 |
|---|---|
| Manager | 要件整理、分解、統合、終了判断 |
| Architect | 影響範囲、構造、境界を確認 |
| Build | 実装担当 |
| Test | テスト、build、lint 実行 |
| Review | 差分レビュー |
| Research | 必要時の調査 |
| Ops | CI、MCP、実行環境確認 |

## 標準ループ

```text
状況分析
↓
Manager ディスカッション
↓
タスク分解
↓
担当割当
↓
`exec` による実装
↓
テスト / build / lint
↓
レビュー
↓
改善または完了
```

## 運用ルール

- `main` へ直接 push しない
- write-heavy task は責務分離してから並列化する
- unsafe profile は限定利用にする
- 停止条件:
  - 同一エラーが 3 回続く
  - CI 修復が 5 回続いても改善しない
  - 同じ修正ループを繰り返す

## 承認ルール

自動で進めてよいもの:
- 調査、設計、実装、テスト、review
- sandbox 内の安全なコマンド

ユーザー確認を入れるもの:
- `push`
- `merge`
- `delete branch`
- `release`
- 破壊的変更
- 認証 / secret / 権限変更

## 出力順序

```text
1. Manager ディスカッション
2. 設計決定
3. 実装
4. 検証
5. 次のアクション
```
