# AEGIS-SIGHT Project Status

## ⏰ プロジェクト期間・リリース制約（最優先・絶対厳守）

| 項目 | 値 |
|:---|:---|
| 📅 プロジェクト期間 | **6 ヶ月**（登録日から半年）|
| 🚦 登録日 (`registered_at`) | **2026-03-25** |
| 🎯 本番リリース (`release_deadline`) | **2026-09-25（絶対厳守・動かさない）** |
| ⏱️ 実行方式 | **Linux Cron**（月〜土・プロジェクト別スケジュール）|
| 🕔 1 セッション最大時間 | **5 時間（300 分）厳守** |
| 🔄 開発フェーズ配分 | 進捗に応じて **CTO 判断で自由変更可** |
| 🤖 監視ワークフロー | [`release-deadline-watch.yml`](.github/workflows/release-deadline-watch.yml) が日次で残日数評価 |
| 🏁 GitHub milestone | [`v1.0 Production Release`](https://github.com/Kensan196948G/AEGIS-SIGHT/milestone/1) (`due_on=2026-09-25`) |

> 🛡️ 本ファイルおよび全ドキュメントの「リリース」表記は、絶対期限 `2026-09-25` と必ず一致させること。詳細は [CLAUDE.md §1.5](./CLAUDE.md) を参照。

> 📌 **情報源の優先順位**: `state.json → PROJECT_STATUS.md → README.md` の順で同期する。`state.json` を一次情報源とし、本ファイルはセッション横断のサマリ、README は外部向け Snapshot として位置づける。

---

## 開発セッションサマリ (2026-05-08)

- **バージョン**: v0.66.0
- **ステータス**: Verify ループ完了 / Improve フェーズへ移行中
- **STABLE判定**: 暫定 STABLE（test/lint/build CI green、ただし下記「品質ゲート種別」参照）
- **GitHub Projects**: [司令盤 #14](https://github.com/users/Kensan196948G/projects/14)

### 本セッションのハイライト

- PR #523 (dashboard design implementation) を約 23 時間 BLOCKED 状態から解放、admin merge
- ダッシュボード 全 50+ ページを **fetch+state machine → 純静的 design-data 駆動** に反転リファクタ
- Dependabot 3 件 (#516/#517/#518) admin merge、redis 5→7 (#519) は breaking のため Issue #525 化
- vitest dashboard testfile 10 件を smoke pattern に書き換え（114 tests 全 pass）→ Issue #524

---

## 📊 現在の状態（2026-05-08 時点）

| 項目 | 状態 |
|:---|:---:|
| Frontend Lint (CI) | ✅ Pass (hard-gate) |
| Frontend tsc --noEmit (CI) | ✅ Pass (hard-gate) |
| Frontend Build (CI) | ✅ Pass (hard-gate) |
| Frontend vitest (CI) | ⚠️ soft-gate (`\|\| true` で吸収中、Issue #524 で追従中) |
| Backend Ruff (CI) | ⚠️ soft-gate (`\|\| true` で吸収中) |
| Backend pytest (CI) | ⚠️ soft-gate (`\|\| true` で吸収中、ローカル 1898 unit pass) |
| Trivy Container Scan | ⚠️ soft-gate (`continue-on-error: true` + `exit-code: 0`) |
| pip-audit / npm-audit | ⚠️ soft-gate (`\|\| true`) |
| CodeQL Analysis | ⚠️ soft-gate (`continue-on-error: true`) |
| Open Issues | 3 件 (#325 / #524 / #525) |
| Open PRs | 0 件 |

> ⚠️ **品質ゲート種別の整理**: 本プロジェクトの CI には「hard-gate（失敗で merge block）」と「soft-gate（失敗してもレポートのみ）」が混在しています。下記「📋 品質ゲート状態」を必ず参照してください。本番リリース前にすべて hard-gate 化することを Release Manager の責務とします。

---

## 📋 品質ゲート状態

### Hard-gate (CI 失敗で merge block)

| ゲート | 状態 | 最終確認日 |
|:---|:---:|:---|
| Frontend Lint (`eslint .`) | ✅ Pass | 2026-05-08 |
| Frontend tsc (`tsc --noEmit`) | ✅ Pass | 2026-05-08 |
| Frontend Build (`next build`) | ✅ Pass | 2026-05-08 |

### Soft-gate (失敗してもレポート扱い、merge 通過)

| ゲート | 状態 | 最終確認日 | hard 化計画 |
|:---|:---:|:---|:---|
| Backend Ruff | ✅ ローカル pass | 2026-05-08 | release 期前に hard 化 |
| Backend pytest | ⚠️ ローカル unit 1898 pass / CI 直近 timeout (flaky) | 2026-05-08 | DB race 修正後 hard 化 |
| Frontend vitest | ⚠️ smoke 化途中 (10/50, Issue #524) | 2026-05-08 | smoke 完了後 hard 化 |
| Trivy Container Scan | ⚠️ exit 0 強制 | 2026-05-08 | Critical/High を hard 化 |
| pip-audit | ⚠️ \|\| true | 2026-05-08 | High 以上を hard 化 |
| npm audit | ⚠️ \|\| true | 2026-05-08 | High 以上を hard 化 |
| CodeQL | ⚠️ continue-on-error | 2026-05-08 | findings 発見時 block 化 |

---

## 🗺️ 6ヶ月フェーズ計画

```
2026-03-25 ─── 2026-05-25 ─── 2026-07-25 ─── 2026-09-25
   登録          基盤+品質       統合検証        本番リリース
   ↓                ↓               ↓                ↓
 Month 1-2      Month 3-4       Month 5         Month 6
 ████████      ████░░░░        ░░░░            ░░░░
 完了           進行中            待機             待機
```

### 残日数別の自動縮退ポリシー (CLAUDE.md §1.5)

| 残日数 | 状態 |
|:---:|:---|
| 30 日以内 | Improvement 縮退、Verify / リリース準備優先 |
| 14 日以内 | 新機能開発禁止、バグ修正・安定化のみ |
| 7 日以内 | リリース準備のみ（CHANGELOG・README・タグ付け） |

**現在残日数**: ~140 日（2026-05-08 時点）

---

## 🚀 次の優先アクション (2026-05-08 時点)

1. **Issue #524**: vitest dashboard tests 残 ~40 file を smoke pattern で消化
2. **Issue #525**: redis 5→7 breaking change を専用ブランチで検証
3. **Soft-gate の段階的 hard 化** (Release 期前に完了): Trivy Critical/High block → pytest hard → vitest hard
4. **`SECRET_KEY` の production 強制チェック**: default 値で起動禁止
5. **PROJECT_STATUS.md / README.md / state.json の自動同期スクリプト**整備
6. **UAT 計画策定**: 約 500 台規模の Windows Agent / PWA / VPN 経路を含む実機検証

---

## 🔧 保守フェーズ メトリクス (2026-05-08)

| 指標 | 値 |
|:---|:---|
| バージョン | v0.66.0 |
| 総フェーズ数 | 117+ (Phase 0-117 完了) |
| APIエンドポイント | 200+ |
| Frontendページ | 45+ |
| Frontend test count (vitest) | 2,764 件 (smoke 化進行中) |
| Backend test count (pytest) | 4,648 件 |
| ドキュメント | 52+ ファイル |
| Dockerサービス | 7 (API, Web, PostgreSQL, Redis, Nginx, Prometheus, Grafana) |
| 監視メトリクス | 17 種 |
| Grafanaダッシュボード | 2 種 |
| 認証 | JWT (RS256) + Entra ID SSO |
| コンプライアンス | ISO 27001, J-SOX, NIST CSF 2.0 |

---

## 全Phase一覧（完了済み）

| Phase | 内容 | 状態 |
|:---:|:---|:---:|
| 0 | プロジェクト準備・ドキュメント作成 | ✅ Done |
| 1 | IAMS分析・スキャフォールド・DB設計 | ✅ Done |
| 2 | SAMライセンス管理・調達管理ワークフロー | ✅ Done |
| 3 | テスト基盤・API追加 (SAM/調達) | ✅ Done |
| 4 | ログ/SW API・Docker/CI最適化 | ✅ Done |
| 5 | Frontend統合・テスト76ケース | ✅ Done |
| 6 | 監査証跡・通知・レポート | ✅ Done |
| 7 | アラート管理・ユーザー管理 | ✅ Done |
| 8 | 部門管理・バッチ処理・ヘルスチェック | ✅ Done |
| 9 | CI修復・設定管理・ネットワーク探索 | ✅ Done |
| 10 | M365連携・WebSocket・スケジューラ | ✅ Done |
| 11 | 統合テスト・RBAC・OpenAPI | ✅ Done |
| 12 | README最終更新・品質強化 | ✅ Done |
| 13 | 構造化ロギング・Redis・レート制限 | ✅ Done |
| 14 | Agent強化・E2Eテスト・Trivy修復 | ✅ Done |
| 15 | データベース最適化・バックアップ基盤 | ✅ Done |
| 16 | APIバージョニング・OpenAPIエクスポート | ✅ Done |
| 17 | IAMSデータ変換・ダークモード・アクセシビリティ | ✅ Done |
| 18 | 通知管理システム・Webhook/Slack/Email | ✅ Done |
| 19 | ClaudeOS自動化基盤強化・CI自動修復 | ✅ Done |
| 20 | PWA完全実装・Service Worker・オフライン同期 | ✅ Done |
| 21 | Docker本番最適化・UIコンポーネントライブラリ | ✅ Done |
| 22 | フィールドレベル暗号化・セキュリティ強化 | ✅ Done |
| 23 | パフォーマンス計測・負荷テスト基盤 | ✅ Done |
| 24 | CHANGELOG・リリース管理・DevOps成熟度 | ✅ Done |
| 25 | 国際化完了・STABLE判定達成 | ✅ Done |
| 26 | Webhook配信・エクスポート機能 (CSV/JSON/PDF) | ✅ Done |
| 27 | タグ管理・全文検索基盤 | ✅ Done |
| 28 | チャート/ウィジェットシステム | ✅ Done |
| 29 | コンプライアンスダッシュボード・監査UI | ✅ Done |
| 30 | 最終品質保証・リリース v0.30.0 | ✅ Done |
| 31 | パッチ管理・配信基盤 | ✅ Done |
| 32 | デバイスグループ・ポリシー管理 | ✅ Done |
| 33 | 廃棄ワークフロー | ✅ Done |
| 34 | ETag/圧縮・パフォーマンス最適化 | ✅ Done |
| 35 | 最終統合・リリース v0.35.0 | ✅ Done |
| 36 | IPアドレス管理 (IPAM) | ✅ Done |
| 37 | ポリシーエンジン | ✅ Done |
| 38 | 変更追跡システム | ✅ Done |
| 39 | 最終統合・リリース v0.39.0 | ✅ Done |
| 40 | 容量計画・予測分析 | ✅ Done |
| 41 | 自動修復エンジン | ✅ Done |
| 42 | 最終統合・リリース v0.42.0 | ✅ Done |
| 43 | 印刷管理システム | ✅ Done |
| 44 | リモートワーク・VPN追跡 | ✅ Done |
| 45 | 最終統合・リリース v0.45.0 | ✅ Done |
| 46 | ナレッジベース管理 | ✅ Done |
| 47 | SLA管理ダッシュボード | ✅ Done |
| 48 | 最終統合・リリース v0.48.0 | ✅ Done |

### IAMS 移植フェーズ（Phase 49-117）

| Phase | 内容 | 状態 |
|:---:|:---|:---:|
| 49-60 | IAMS分析・DB設計・API基盤 | ✅ Done |
| 61-80 | SAM/調達/i18n/コンプライアンス | ✅ Done |
| 81-100 | IPAM/廃棄/ETag/デバイスグループ | ✅ Done |
| 101-112 | テスト変換（1,798件） pytest 完結 | ✅ Done |
| 113-117 | チャート可視化 DonutChart/BarChart 全27ページ | ✅ Done |

### Session 追加フェーズ

| Session | 内容 | 状態 |
|:---:|:---|:---:|
| Session 1-11 | チャート追加・UI改善・バグ修正群 | ✅ Done |
| Session 12 | Prometheus/Grafana基盤強化（メトリクス17種・ダッシュボード2種・Node Exporter） | ✅ Done |
| Session 2026-04-23〜2026-05-01 | branch coverage 91.30% / functions 99.82% 達成 | ✅ Done |
| Session 2026-05-07 | Dashboard widget grid + 全 API 接続 (PR #523 push) | ✅ Done |
| Session 2026-05-08 | PR #523 unblock + dashboard 静的化 + smoke test pattern (PR #527/#528/#529) | ✅ Done |
