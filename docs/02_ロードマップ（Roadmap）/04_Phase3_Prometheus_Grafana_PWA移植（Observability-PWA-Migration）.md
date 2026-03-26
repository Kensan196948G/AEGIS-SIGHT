# Phase3: Prometheus/Grafana・PWA移植（Observability & PWA Migration）

| 項目 | 内容 |
|------|------|
| フェーズ | Phase3 |
| 期間 | 1.5ヶ月（Week 3〜Week 8） |
| 目的 | IAMSのPrometheus/Grafana監視基盤とPWA機能をAEGIS-SIGHTへ移植 |
| 前提条件 | Phase1の設計書承認完了 |
| 完了条件 | 監視メトリクス収集稼働、Grafanaダッシュボード表示、PWAオフライン動作確認 |
| 並行関係 | Phase2（SAM・調達移植）と並行実施 |

---

## 1. スケジュール

```
Week 3-4              Week 5-6              Week 7-8
[Prometheus基盤]       [Grafana・アラート]     [PWA・統合]
├ Prometheus設定      ├ ダッシュボード構築    ├ Service Worker
├ Exporter実装        ├ アラートルール        ├ オフライン同期
├ メトリクス定義      ├ カスタムパネル        ├ 結合テスト
└ Docker統合          └ 通知連携              └ パフォーマンス
```

---

## 2. タスク一覧

### 2.1 Prometheus監視基盤構築（Week 3〜4）

| タスクID | タスク | 担当 | 期間 | 成果物 |
|----------|--------|------|------|--------|
| P3-001 | Prometheus Docker設定 | インフラエンジニア | 0.5日 | `docker/prometheus/prometheus.yml` |
| P3-002 | IAMS Prometheus設定の分析・移植 | インフラエンジニア | 1日 | 移植済み設定ファイル |
| P3-003 | Node Exporter設定（エンドポイント監視） | インフラエンジニア | 0.5日 | Node Exporter設定 |
| P3-004 | カスタムExporter実装（FastAPI） | バックエンドエンジニア | 1.5日 | `exporters/fastapi_exporter.py` |
| P3-005 | PowerShell Agent Exporter実装 | バックエンドエンジニア | 1.5日 | `exporters/powershell_exporter.py` |
| P3-006 | PostgreSQL Exporter設定 | インフラエンジニア | 0.5日 | pg_exporter設定 |
| P3-007 | エンドポイント監視メトリクス定義 | インフラエンジニア | 1日 | メトリクス仕様書 |
| P3-008 | サービスディスカバリ設定 | インフラエンジニア | 0.5日 | SD設定ファイル |
| P3-009 | Docker Compose統合 | インフラエンジニア | 0.5日 | `docker-compose.yml`更新 |
| P3-010 | Prometheus基盤テスト | QAエンジニア | 1日 | テスト結果 |

#### 監視メトリクス定義

| カテゴリ | メトリクス | 説明 | 収集間隔 |
|----------|-----------|------|----------|
| エンドポイント | `aegis_endpoint_status` | 端末オンライン/オフライン状態 | 60s |
| エンドポイント | `aegis_endpoint_cpu_usage` | CPU使用率 | 30s |
| エンドポイント | `aegis_endpoint_memory_usage` | メモリ使用率 | 30s |
| エンドポイント | `aegis_endpoint_disk_usage` | ディスク使用率 | 300s |
| エンドポイント | `aegis_endpoint_last_seen` | 最終通信時刻 | 60s |
| アプリケーション | `aegis_api_request_total` | API リクエスト数 | 15s |
| アプリケーション | `aegis_api_request_duration_seconds` | API 応答時間 | 15s |
| アプリケーション | `aegis_api_error_total` | APIエラー数 | 15s |
| データベース | `aegis_db_connections_active` | アクティブDB接続数 | 30s |
| データベース | `aegis_db_query_duration_seconds` | クエリ実行時間 | 30s |
| PowerShell Agent | `aegis_agent_task_total` | エージェントタスク実行数 | 60s |
| PowerShell Agent | `aegis_agent_task_errors` | エージェントタスクエラー数 | 60s |
| PowerShell Agent | `aegis_agent_collection_duration` | データ収集所要時間 | 60s |

### 2.2 Grafanaダッシュボード構築（Week 5〜6）

| タスクID | タスク | 担当 | 期間 | 成果物 |
|----------|--------|------|------|--------|
| P3-011 | Grafana Docker設定・プロビジョニング | インフラエンジニア | 0.5日 | Grafana設定ファイル |
| P3-012 | IAMS Grafanaダッシュボードの分析・移植 | インフラエンジニア | 1日 | 移植済みダッシュボードJSON |
| P3-013 | エンドポイント概要ダッシュボード | インフラエンジニア | 1日 | `dashboards/endpoint-overview.json` |
| P3-014 | 端末詳細ダッシュボード | インフラエンジニア | 1日 | `dashboards/endpoint-detail.json` |
| P3-015 | アプリケーション性能ダッシュボード | インフラエンジニア | 0.5日 | `dashboards/app-performance.json` |
| P3-016 | SAM・調達ダッシュボード | インフラエンジニア | 0.5日 | `dashboards/sam-procurement.json` |
| P3-017 | アラートルール定義 | インフラエンジニア | 1日 | アラートルールYAML |
| P3-018 | 通知チャネル設定（メール、Teams） | インフラエンジニア | 0.5日 | 通知設定 |
| P3-019 | Grafana RBAC設定 | インフラエンジニア | 0.5日 | ロール・権限設定 |
| P3-020 | ダッシュボードテスト | QAエンジニア | 0.5日 | テスト結果 |

#### ダッシュボード一覧

| ダッシュボード名 | 対象ユーザー | 主要パネル |
|-----------------|-------------|-----------|
| エンドポイント概要 | 管理者 | オンライン/オフライン端末数、アラート一覧、端末マップ |
| 端末詳細 | 管理者・ヘルプデスク | CPU/メモリ/ディスク推移、インストール済みソフト、最終アクセス |
| アプリケーション性能 | 開発者・SRE | API応答時間、エラー率、DB接続数 |
| SAM・調達 | 管理者 | ライセンス使用率、調達ステータス、コスト推移 |

#### アラートルール

| アラート名 | 条件 | 重要度 | 通知先 |
|-----------|------|--------|--------|
| エンドポイント長時間オフライン | `aegis_endpoint_last_seen` > 24h | Warning | 管理者メール |
| エンドポイント未通信 | `aegis_endpoint_last_seen` > 72h | Critical | 管理者メール + Teams |
| CPU高負荷 | `aegis_endpoint_cpu_usage` > 90% 持続5min | Warning | 管理者メール |
| ディスク容量逼迫 | `aegis_endpoint_disk_usage` > 85% | Warning | 管理者メール |
| API高エラー率 | `aegis_api_error_total` rate > 5% | Critical | 開発チーム Teams |
| API応答遅延 | `aegis_api_request_duration_seconds` p95 > 500ms | Warning | 開発チーム Teams |
| ライセンス期限切れ間近 | 残日数 < 30日 | Warning | 管理者メール |

### 2.3 PWA実装（Week 5〜7）

| タスクID | タスク | 担当 | 期間 | 成果物 |
|----------|--------|------|------|--------|
| P3-021 | IAMS PWA実装の分析 | フロントエンドエンジニア | 0.5日 | PWA分析レポート |
| P3-022 | Service Worker実装 | フロントエンドエンジニア | 2日 | `public/sw.js` |
| P3-023 | Web App Manifest作成 | フロントエンドエンジニア | 0.5日 | `public/manifest.json` |
| P3-024 | キャッシュ戦略実装 | フロントエンドエンジニア | 1.5日 | キャッシュモジュール |
| P3-025 | オフラインページ実装 | フロントエンドエンジニア | 1日 | オフラインフォールバック |
| P3-026 | IndexedDB同期ストア実装 | フロントエンドエンジニア | 2日 | `lib/sync-store.ts` |
| P3-027 | Background Sync実装 | フロントエンドエンジニア | 1.5日 | 同期キューモジュール |
| P3-028 | Push通知実装 | フロントエンドエンジニア | 1日 | プッシュ通知モジュール |
| P3-029 | PWAインストール促進UI | フロントエンドエンジニア | 0.5日 | インストールバナー |

#### キャッシュ戦略

| リソース種別 | 戦略 | 説明 |
|-------------|------|------|
| 静的アセット（JS/CSS/画像） | Cache First | ビルドハッシュで更新検知 |
| API レスポンス（参照系） | Stale While Revalidate | キャッシュ返却後にバックグラウンド更新 |
| API レスポンス（更新系） | Network First | オフライン時はキューイング |
| HTMLページ | Network First | オフライン時はキャッシュ版を表示 |
| 監視データ | Network Only | リアルタイム性が必要 |

#### オフライン同期設計

```
[オンライン時]
  ブラウザ → FastAPI → PostgreSQL

[オフライン時]
  ブラウザ → IndexedDB（ローカルキュー）

[復帰時]
  IndexedDB → Background Sync → FastAPI → PostgreSQL
  競合検出 → Last-Write-Wins / ユーザー選択
```

### 2.4 監視API実装（Week 5〜6）

| タスクID | タスク | 担当 | 期間 | 成果物 |
|----------|--------|------|------|--------|
| P3-030 | Prometheus Query API ラッパー | バックエンドエンジニア | 1日 | `routers/monitoring/metrics.py` |
| P3-031 | アラート管理API | バックエンドエンジニア | 0.5日 | `routers/monitoring/alerts.py` |
| P3-032 | エンドポイントステータスAPI | バックエンドエンジニア | 0.5日 | `routers/monitoring/endpoints.py` |
| P3-033 | 監視API単体テスト | QAエンジニア | 0.5日 | `tests/monitoring/` |

#### 監視 API エンドポイント

```
GET  /api/v1/monitoring/metrics                   # メトリクスクエリ
GET  /api/v1/monitoring/metrics/range              # 範囲メトリクスクエリ
GET  /api/v1/monitoring/endpoints                  # エンドポイント一覧（ステータス付き）
GET  /api/v1/monitoring/endpoints/{id}/metrics     # 特定端末メトリクス
GET  /api/v1/monitoring/alerts                     # アクティブアラート一覧
POST /api/v1/monitoring/alerts/{id}/acknowledge    # アラート確認
GET  /api/v1/monitoring/dashboard/summary          # ダッシュボードサマリ
```

### 2.5 統合・品質確認（Week 7〜8）

| タスクID | タスク | 担当 | 期間 | 成果物 |
|----------|--------|------|------|--------|
| P3-034 | Prometheus→Grafana結合テスト | QAエンジニア | 1日 | 結合テスト結果 |
| P3-035 | PWAオフライン動作テスト | QAエンジニア | 1日 | オフラインテスト結果 |
| P3-036 | PWA同期テスト（競合解決含む） | QAエンジニア | 1日 | 同期テスト結果 |
| P3-037 | 500台規模の負荷テスト（監視） | インフラエンジニア | 1日 | 負荷テストレポート |
| P3-038 | Lighthouse PWA監査 | フロントエンドエンジニア | 0.5日 | Lighthouseレポート |
| P3-039 | セキュリティレビュー | テックリード | 0.5日 | セキュリティレビューレポート |
| P3-040 | コードレビュー・リファクタリング | テックリード | 1日 | レビュー済みコード |
| P3-041 | Phase3完了レビュー・Go/No-Go判定 | PM・CTO・PO | 0.5日 | Phase3完了報告書 |

---

## 3. 成果物一覧

| 成果物 | 形式 | 説明 |
|--------|------|------|
| Prometheus設定 | YAML | スクレイプ設定、ルール、SD設定 |
| カスタムExporter | Python | FastAPI/PowerShell Agentメトリクス収集 |
| Grafanaダッシュボード | JSON | 4種類のダッシュボード |
| アラートルール | YAML | 7種類のアラートルール |
| 監視API | Python FastAPI | メトリクスクエリ、アラート管理 |
| Service Worker | TypeScript | キャッシュ・オフライン・同期 |
| PWA Manifest | JSON | アプリメタデータ |
| オフライン同期モジュール | TypeScript | IndexedDB + Background Sync |
| 単体テスト | pytest | 監視・同期の単体テスト |
| 結合テスト | pytest | Prometheus/Grafana/PWA結合テスト |
| Phase3完了報告書 | Markdown | 実装内容、テスト結果、残課題 |

---

## 4. 品質基準

| 項目 | 基準 |
|------|------|
| メトリクス収集率 | 99%以上（500台端末対象） |
| Prometheus収集遅延 | 収集間隔の2倍以内 |
| Grafanaダッシュボード表示速度 | 3秒以内（初回ロード） |
| PWA Lighthouse スコア | 90点以上 |
| オフライン動作 | 主要画面（一覧、詳細、登録）がオフラインで利用可能 |
| 同期信頼性 | データ損失ゼロ、競合解決100% |
| 単体テストカバレッジ | 80%以上 |
| アラート検知精度 | 誤検知率5%以下 |

---

## 5. リスクと対策

| リスク | 影響度 | 対策 |
|--------|--------|------|
| 500台端末のメトリクス負荷 | 高 | 収集間隔の最適化、ダウンサンプリング、保持期間設定 |
| Service Workerの複雑性 | 中 | Workboxライブラリ活用、段階的機能追加 |
| オフライン同期の競合 | 中 | Last-Write-Wins基本、重要データはユーザー選択 |
| ブラウザ互換性 | 低 | Chrome/Edge対象（みらい建設工業の標準ブラウザ） |
| Grafanaバージョン依存 | 低 | バージョン固定、プロビジョニングの自動化 |

---

## 6. マイルストーン

| マイルストーン | 時期 | 達成条件 |
|----------------|------|----------|
| M3-1: Prometheus稼働 | Week 4末 | 全Exporter動作、メトリクス収集開始 |
| M3-2: Grafana表示 | Week 6末 | 4種ダッシュボード表示、アラート発火確認 |
| M3-3: PWA基本動作 | Week 6末 | Service Worker登録、オフラインページ表示 |
| M3-4: PWA同期動作 | Week 7末 | IndexedDB保存、Background Sync動作 |
| M3-5: Phase3完了 | Week 8末 | 全機能実装、テスト通過、負荷テスト合格 |
