# Changelog

このプロジェクトのすべての注目すべき変更はこのファイルに記録されます。

形式は [Keep a Changelog](https://keepachangelog.com/ja/1.1.0/) に基づき、
[セマンティック バージョニング](https://semver.org/lang/ja/) に準拠します。

## [Unreleased]

---

## [0.24.0] - 2026-03-27

### Added
- CHANGELOG.md、リリースノート、API リファレンス自動生成基盤
- リリーススクリプト (`scripts/release.sh`)
- バージョン一元管理 (`aegis-sight-api/app/version.py`)
- SECURITY.md、CODE_OF_CONDUCT.md

### Changed
- ドキュメント体系の整備・DevOps 成熟度向上

## [0.23.0] - 2026-03-27

### Added
- パフォーマンス計測フレームワーク ([#65](https://github.com/Kensan196948G/AEGIS-SIGHT/pull/65))
- 負荷テスト基盤 (Locust / k6 対応)
- API 型自動生成スクリプト (`scripts/generate-api-types.sh`)
- OpenAPI スキーマからの TypeScript 型定義生成

### Changed
- API レスポンス時間の計測・テレメトリ強化

## [0.22.0] - 2026-03-27

### Added
- フィールドレベル暗号化 (AES-256-GCM) ([#63](https://github.com/Kensan196948G/AEGIS-SIGHT/pull/63))
- IP アドレス制限ミドルウェア
- セッション管理・自動タイムアウト
- セキュリティヘッダー強化 (CSP, HSTS, X-Frame-Options)

### Changed
- 認証フロー全体のセキュリティ強化
- RS256 アルゴリズムによる JWT 署名

## [0.21.0] - 2026-03-27

### Added
- Docker 本番環境最適化 (`docker-compose.prod.yml`) ([#61](https://github.com/Kensan196948G/AEGIS-SIGHT/pull/61))
- マルチステージビルドによるイメージサイズ削減
- UI コンポーネントライブラリ拡充
- ユーティリティ関数 (`format-utils.ts`, `date-utils.ts`)

### Changed
- コンテナのヘルスチェック設定最適化
- Dockerfile のレイヤーキャッシュ改善

## [0.20.0] - 2026-03-27

### Added
- PWA (Progressive Web App) 完全実装 ([#59](https://github.com/Kensan196948G/AEGIS-SIGHT/pull/59))
- Service Worker によるオフラインキャッシュ
- オフラインデータ同期 (`lib/offline-storage.ts`)
- インストールプロンプト UI
- Web App Manifest (`public/manifest.json`)

### Changed
- README の全面更新・PWA 機能説明追加

## [0.19.0] - 2026-03-27

### Added
- ClaudeOS 自動化基盤強化 ([#57](https://github.com/Kensan196948G/AEGIS-SIGHT/pull/57))
- CI/CD パイプラインの自動修復機能
- GitHub Projects 連携スクリプト (`scripts/project-sync.sh`)
- 自動ラベリング (`scripts/auto-label.sh`)

### Changed
- ワークフローの安定性・再現性向上

## [0.18.0] - 2026-03-27

### Added
- 通知管理システム ([#55](https://github.com/Kensan196948G/AEGIS-SIGHT/pull/55))
- メールテンプレートエンジン
- 通知チャネル管理 API (`/api/v1/notifications`)
- 通知ルール設定 UI
- Webhook / Slack / Email チャネル対応

## [0.17.0] - 2026-03-27

### Added
- IAMS データ変換基盤 ([#53](https://github.com/Kensan196948G/AEGIS-SIGHT/pull/53))
- IAMS 既存データのマイグレーションツール
- ダークモード対応 (`lib/theme-context.tsx`)
- アクセシビリティ改善 (ARIA ラベル、キーボードナビゲーション)

### Changed
- UI テーマシステムの刷新

## [0.16.0] - 2026-03-27

### Added
- API バージョニング (`/api/v1/`) ([#51](https://github.com/Kensan196948G/AEGIS-SIGHT/pull/51))
- OpenAPI スキーマエクスポート (`scripts/export_openapi.py`)
- システムステータス UI ページ
- カスタムエラーページ (`error.tsx`, `not-found.tsx`)
- バージョン情報エンドポイント (`/api/v1/version`)

### Changed
- 全 API ルートを `/api/v1/` プレフィックスに統合

## [0.15.0] - 2026-03-27

### Added
- データベース最適化 ([#49](https://github.com/Kensan196948G/AEGIS-SIGHT/pull/49))
- データ保持ポリシー (`/api/v1/database`)
- 自動バックアップスクリプト (`scripts/backup_db.sh`)
- DB リストアスクリプト (`scripts/restore_db.sh`)
- Alembic マイグレーション基盤

### Changed
- クエリパフォーマンスの改善・インデックス最適化

## [0.14.0] - 2026-03-27

### Added
- Agent 機能強化 (`aegis-sight-agent`) ([#47](https://github.com/Kensan196948G/AEGIS-SIGHT/pull/47))
- E2E テスト 58 件追加
- Trivy セキュリティスキャン CI 修復

### Fixed
- Trivy CI パイプラインのエラー修正

## [0.13.0] - 2026-03-27

### Added
- 構造化ロギング (JSON 形式) ([#45](https://github.com/Kensan196948G/AEGIS-SIGHT/pull/45))
- Redis キャッシュ層
- レート制限ミドルウェア
- リクエストバリデーション強化

### Changed
- API レスポンスの一貫性向上

## [0.12.0] - 2026-03-27

### Changed
- README の最終更新・全フェーズ進捗反映 ([#43](https://github.com/Kensan196948G/AEGIS-SIGHT/pull/43))

## [0.11.0] - 2026-03-27

### Added
- 統合テストスイート ([#41](https://github.com/Kensan196948G/AEGIS-SIGHT/pull/41))
- RBAC (ロールベースアクセス制御)
- OpenAPI ドキュメント自動生成
- 包括的ドキュメント (docs/ 配下)

## [0.10.0] - 2026-03-27

### Added
- Microsoft 365 連携 (`/api/v1/m365`) ([#39](https://github.com/Kensan196948G/AEGIS-SIGHT/pull/39))
- WebSocket リアルタイム通知 (`/api/v1/ws`)
- スケジューラ管理 (`/api/v1/scheduler`)
- Azure AD 認証連携

## [0.9.0] - 2026-03-27

### Added
- 設定管理 API (`/api/v1/config`) ([#37](https://github.com/Kensan196948G/AEGIS-SIGHT/pull/37))
- ネットワーク探索機能 (`/api/v1/network`)

### Fixed
- CI パイプラインの安定化・エラー修正

## [0.8.0] - 2026-03-27

### Added
- 部門管理 API (`/api/v1/departments`) ([#35](https://github.com/Kensan196948G/AEGIS-SIGHT/pull/35))
- バッチ処理 API (`/api/v1/batch`)
- 詳細ヘルスチェック (`/health/detail`)

### Changed
- ヘルスチェックの応答情報拡充

## [0.7.0] - 2026-03-27

### Added
- アラート管理 API (`/api/v1/alerts`) ([#33](https://github.com/Kensan196948G/AEGIS-SIGHT/pull/33))
- ユーザー管理 API (`/api/v1/users`)
- ユーザー管理 UI ページ

## [0.6.0] - 2026-03-27

### Added
- 監査証跡 API (`/api/v1/audit`) ([#31](https://github.com/Kensan196948G/AEGIS-SIGHT/pull/31))
- 通知サービス基盤
- レポート生成 API (`/api/v1/reports`)

### Changed
- README の更新・機能説明追加

## [0.5.0] - 2026-03-27

### Added
- Frontend-Backend 統合 ([#12](https://github.com/Kensan196948G/AEGIS-SIGHT/pull/12))
- テスト 76 ケース追加
- Next.js フロントエンド実装
- API クライアント (`lib/api.ts`)

### Changed
- Docker Node.js ベースイメージを 20-alpine から 25-alpine に更新

## [0.4.0] - 2026-03-27

### Added
- ログ管理 API (`/api/v1/logs`) ([#10](https://github.com/Kensan196948G/AEGIS-SIGHT/pull/10))
- ソフトウェアインベントリ API (`/api/v1/software`)
- Docker Compose 開発/テスト/本番環境分離
- CI/CD パイプライン最適化

## [0.3.0] - 2026-03-27

### Added
- テスト基盤 (pytest + conftest) ([#8](https://github.com/Kensan196948G/AEGIS-SIGHT/pull/8))
- SAM (ソフトウェア資産管理) API (`/api/v1/sam`)
- 調達管理 API (`/api/v1/procurement`)
- Makefile による開発コマンド統一
- E2E テスト準備

## [0.2.0] - 2026-03-27

### Added
- Backend API 深化 ([#6](https://github.com/Kensan196948G/AEGIS-SIGHT/pull/6))
- 資産管理 API (`/api/v1/assets`)
- 認証 API (`/api/v1/auth`) - JWT トークン認証
- ダッシュボード API (`/api/v1/dashboard`)
- Frontend UI 基盤 (Next.js + Tailwind CSS)

### Changed
- README の全面刷新

## [0.1.0] - 2026-03-27

### Added
- プロジェクト基盤スキャフォールド ([#4](https://github.com/Kensan196948G/AEGIS-SIGHT/pull/4))
- FastAPI アプリケーション骨格
- PostgreSQL + Redis 構成
- Docker Compose 基本構成
- ヘルスチェックエンドポイント (`/health`)
- AEGIS-SIGHT x IAMS 選択的統合ドキュメント ([#2](https://github.com/Kensan196948G/AEGIS-SIGHT/pull/2))
- 包括的ドキュメント体系 (計画/要件/設計/運用)

## [0.0.0] - 2026-03-27

### Added
- Initial commit ([f374212](https://github.com/Kensan196948G/AEGIS-SIGHT/commit/f374212))

---

[Unreleased]: https://github.com/Kensan196948G/AEGIS-SIGHT/compare/v0.24.0...HEAD
[0.24.0]: https://github.com/Kensan196948G/AEGIS-SIGHT/compare/v0.23.0...v0.24.0
[0.23.0]: https://github.com/Kensan196948G/AEGIS-SIGHT/compare/v0.22.0...v0.23.0
[0.22.0]: https://github.com/Kensan196948G/AEGIS-SIGHT/compare/v0.21.0...v0.22.0
[0.21.0]: https://github.com/Kensan196948G/AEGIS-SIGHT/compare/v0.20.0...v0.21.0
[0.20.0]: https://github.com/Kensan196948G/AEGIS-SIGHT/compare/v0.19.0...v0.20.0
[0.19.0]: https://github.com/Kensan196948G/AEGIS-SIGHT/compare/v0.18.0...v0.19.0
[0.18.0]: https://github.com/Kensan196948G/AEGIS-SIGHT/compare/v0.17.0...v0.18.0
[0.17.0]: https://github.com/Kensan196948G/AEGIS-SIGHT/compare/v0.16.0...v0.17.0
[0.16.0]: https://github.com/Kensan196948G/AEGIS-SIGHT/compare/v0.15.0...v0.16.0
[0.15.0]: https://github.com/Kensan196948G/AEGIS-SIGHT/compare/v0.14.0...v0.15.0
[0.14.0]: https://github.com/Kensan196948G/AEGIS-SIGHT/compare/v0.13.0...v0.14.0
[0.13.0]: https://github.com/Kensan196948G/AEGIS-SIGHT/compare/v0.12.0...v0.13.0
[0.12.0]: https://github.com/Kensan196948G/AEGIS-SIGHT/compare/v0.11.0...v0.12.0
[0.11.0]: https://github.com/Kensan196948G/AEGIS-SIGHT/compare/v0.10.0...v0.11.0
[0.10.0]: https://github.com/Kensan196948G/AEGIS-SIGHT/compare/v0.9.0...v0.10.0
[0.9.0]: https://github.com/Kensan196948G/AEGIS-SIGHT/compare/v0.8.0...v0.9.0
[0.8.0]: https://github.com/Kensan196948G/AEGIS-SIGHT/compare/v0.7.0...v0.8.0
[0.7.0]: https://github.com/Kensan196948G/AEGIS-SIGHT/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/Kensan196948G/AEGIS-SIGHT/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/Kensan196948G/AEGIS-SIGHT/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/Kensan196948G/AEGIS-SIGHT/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/Kensan196948G/AEGIS-SIGHT/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/Kensan196948G/AEGIS-SIGHT/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/Kensan196948G/AEGIS-SIGHT/compare/v0.0.0...v0.1.0
[0.0.0]: https://github.com/Kensan196948G/AEGIS-SIGHT/releases/tag/v0.0.0
