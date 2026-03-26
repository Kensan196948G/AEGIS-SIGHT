# AEGIS-SIGHT

**Autonomous Endpoint Governance & Integrated Sight**

SKYSEA Client View 同等機能を内製化した、エンタープライズ向けITエンドポイント統合管理システム。
IAMS（IntegratedITAssetServiceManagement）の有用機能を選択的に移植統合。

## 概要

| 項目 | 内容 |
|------|------|
| **対象組織** | みらい建設工業（約550名） |
| **管理対象** | Windows 11/10 クライアントPC 約500台 + サーバ群 |
| **技術スタック** | Python 3.12 (FastAPI) / Next.js 14 / PostgreSQL 16 / Docker |
| **準拠規格** | ISO 27001:2022 / ISO 20000-1:2018 / NIST CSF 2.0 / J-SOX |
| **開発方式** | ClaudeOS v4 自律型開発 |

## 主要機能

### 既存 AEGIS-SIGHT 機能
- IT資産管理（HW/SW情報自動収集）
- 操作ログ管理（ログオン/USB/ファイル操作）
- セキュリティ監視（Defender/BitLocker/パッチ）
- 統合ダッシュボード（Next.js + Entra ID SSO）

### IAMS 選択移植機能
- **Prometheus/Grafana** — インフラ可観測性・監視ダッシュボード
- **PWA対応** — オフラインUI（建設現場対応）
- **調達管理** — 調達→受領→廃棄ライフサイクル
- **SAMライセンス管理** — ライセンス期限・超過アラート
- **テスト資産** — 1,157件 Jest → pytest 変換

## ディレクトリ構成

```
AEGIS-SIGHT/
├── aegis-sight-api/          # FastAPI バックエンド
├── aegis-sight-web/          # Next.js フロントエンド
├── aegis-sight-agent/        # PowerShell Agent
├── aegis-sight-infra/        # Docker / Prometheus / Grafana
├── docs/                     # プロジェクトドキュメント
│   ├── 01_計画フェーズ（Planning）/
│   ├── 02_ロードマップ（Roadmap）/
│   ├── 03_要件定義（Requirements）/
│   ├── 04_アーキテクチャ設計（Architecture）/
│   ├── 05_詳細設計（Detailed-Design）/
│   ├── 06_開発ガイド（Development-Guide）/
│   ├── 07_テスト計画（Testing）/
│   ├── 08_リリース管理（Release-Management）/
│   ├── 09_運用管理（Operations）/
│   ├── 10_コンプライアンス（Compliance）/
│   └── 11_IAMS廃止計画（IAMS-Decommission）/
├── scripts/                  # ClaudeOS 自動化スクリプト
├── .github/workflows/        # CI/CD パイプライン
├── CLAUDE.md                 # ClaudeOS プロジェクト設定
└── README.md
```

## 開発ルール

- `main` への直接 push 禁止
- feature branch または Git WorkTree で開発
- PR 必須、CI 通過必須（lint / test / build / security）
- テストカバレッジ 80% 以上

## ドキュメント

詳細なプロジェクトドキュメントは [docs/](./docs/) フォルダを参照してください。

## ライセンス

Proprietary - みらい建設工業 IT部門
