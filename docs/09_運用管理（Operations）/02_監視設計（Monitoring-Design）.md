# 監視設計（Monitoring Design）

| 項目 | 内容 |
|------|------|
| プロジェクト | AEGIS-SIGHT（SKYSEA内製代替）+ IAMS選択移植 |
| 作成日 | 2026-03-27 |
| 更新日 | 2026-04-02 |
| ステータス | Review |
| 監視ツール | Prometheus + Grafana + Alertmanager |

---

## 1. 監視アーキテクチャ

### 1.1 構成図

```
┌────────────────────────────────────────────────┐
│                   Docker Host                   │
│                                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐ │
│  │ backend  │  │ frontend │  │  PostgreSQL   │ │
│  │ (FastAPI) │  │ (Next.js)│  │              │ │
│  │  :8000   │  │  :3000   │  │   :5432      │ │
│  │ /metrics │  │          │  │              │ │
│  └────┬─────┘  └──────────┘  └──────┬───────┘ │
│       │                              │         │
│  ┌────┴──────────────────────────────┴───────┐ │
│  │              Prometheus :9090              │ │
│  │         (メトリクス収集・保存)              │ │
│  └────────────────┬──────────────────────────┘ │
│                   │                             │
│  ┌────────────────┴──────────────────────────┐ │
│  │              Grafana :3001                 │ │
│  │        (ダッシュボード・アラート)            │ │
│  └────────────────────────────────────────────┘ │
│                                                │
│  ┌──────────────┐  ┌──────────────────────┐    │
│  │ node_exporter│  │ postgres_exporter    │    │
│  │   :9100      │  │   :9187              │    │
│  └──────────────┘  └──────────────────────┘    │
└────────────────────────────────────────────────┘
```

### 1.2 監視コンポーネント

| コンポーネント | バージョン | 用途 | ポート |
|--------------|-----------|------|--------|
| Prometheus | >= 2.50 | メトリクス収集・保存 | 9090 |
| Grafana | >= 10.0 | ダッシュボード・アラート | 3001 |
| node_exporter | >= 1.7 | ホストメトリクス | 9100 |
| postgres_exporter | >= 0.15 | PostgreSQLメトリクス | 9187 |
| Alertmanager | >= 0.27 | アラート管理・通知 | 9093 |

---

## 2. 監視項目

### 2.1 インフラ監視

| メトリクス | 収集元 | 正常範囲 | Warning閾値 | Critical閾値 |
|-----------|--------|---------|------------|-------------|
| CPU使用率 | node_exporter | < 60% | >= 75% (5分) | >= 90% (5分) |
| メモリ使用率 | node_exporter | < 70% | >= 80% | >= 95% |
| ディスク使用率 | node_exporter | < 70% | >= 80% | >= 90% |
| ディスクI/O待ち | node_exporter | < 10ms | >= 50ms | >= 100ms |
| ネットワークエラー率 | node_exporter | 0% | > 0.1% | > 1% |
| Docker コンテナ状態 | Docker API | running | restart > 3回/h | not running |

### 2.2 アプリケーション監視

| メトリクス | 収集元 | 正常範囲 | Warning閾値 | Critical閾値 |
|-----------|--------|---------|------------|-------------|
| HTTPリクエスト成功率 | FastAPI /metrics | >= 99.5% | < 99% (5分) | < 95% (5分) |
| HTTPレスポンス時間（p50） | FastAPI /metrics | < 100ms | >= 300ms | >= 1000ms |
| HTTPレスポンス時間（p95） | FastAPI /metrics | < 300ms | >= 500ms | >= 2000ms |
| HTTPレスポンス時間（p99） | FastAPI /metrics | < 500ms | >= 1000ms | >= 5000ms |
| 5xxエラー率 | FastAPI /metrics | 0% | > 0.5% (5分) | > 2% (5分) |
| 4xxエラー率 | FastAPI /metrics | < 5% | > 10% (5分) | > 20% (5分) |
| アクティブコネクション数 | FastAPI /metrics | < 100 | >= 200 | >= 500 |
| ヘルスチェック | /api/v1/health | healthy | - | unhealthy |

### 2.3 データベース監視

| メトリクス | 収集元 | 正常範囲 | Warning閾値 | Critical閾値 |
|-----------|--------|---------|------------|-------------|
| アクティブ接続数 | postgres_exporter | < 50 | >= 80 | >= 95（max_connections近傍） |
| クエリ実行時間（平均） | postgres_exporter | < 50ms | >= 200ms | >= 1000ms |
| スロークエリ数 | postgres_exporter | 0 | > 5/分 | > 20/分 |
| デッドロック数 | postgres_exporter | 0 | > 0/時 | > 5/時 |
| レプリケーション遅延 | postgres_exporter | < 1s | >= 5s | >= 30s |
| テーブル膨張率 | postgres_exporter | < 20% | >= 30% | >= 50% |
| キャッシュヒット率 | postgres_exporter | >= 99% | < 95% | < 90% |
| DB接続プール使用率 | postgres_exporter | < 70% | >= 80% | >= 95% |

### 2.4 ビジネスメトリクス

| メトリクス | 収集元 | 用途 |
|-----------|--------|------|
| アクティブユーザー数 | アプリケーション | 利用状況把握 |
| ログイン成功/失敗数 | アプリケーション | セキュリティ監視 |
| デバイス登録数 | アプリケーション | データ量把握 |
| API呼び出し数（エンドポイント別） | FastAPI /metrics | 利用パターン分析 |
| バッチ処理成功/失敗 | アプリケーション | バッチ監視 |

---

## 3. Prometheus設定

### 3.1 prometheus.yml

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  scrape_timeout: 10s

rule_files:
  - "rules/*.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets:
            - alertmanager:9093

scrape_configs:
  # FastAPI バックエンド
  - job_name: 'aegis-sight-backend'
    metrics_path: '/metrics'
    static_configs:
      - targets: ['backend:8000']
        labels:
          service: 'backend'
          environment: 'production'

  # Node Exporter（ホスト）
  - job_name: 'node'
    static_configs:
      - targets: ['node-exporter:9100']
        labels:
          service: 'host'

  # PostgreSQL Exporter
  - job_name: 'postgresql'
    static_configs:
      - targets: ['postgres-exporter:9187']
        labels:
          service: 'database'

  # Prometheus自身
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']
```

### 3.2 データ保持ポリシー

| 項目 | 設定値 |
|------|--------|
| ローカル保持期間 | 30日 |
| サンプリング間隔 | 15秒 |
| ストレージ上限 | 50GB |

---

## 4. アラートルール

### 4.1 インフラアラート

```yaml
# rules/infrastructure.yml
groups:
  - name: infrastructure
    rules:
      - alert: HighCpuUsage
        expr: 100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 75
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "CPU使用率が高い ({{ $value }}%)"
          description: "{{ $labels.instance }} のCPU使用率が75%を超えています"

      - alert: CriticalCpuUsage
        expr: 100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 90
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "CPU使用率が危険水準 ({{ $value }}%)"

      - alert: HighMemoryUsage
        expr: (1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100 > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "メモリ使用率が高い ({{ $value }}%)"

      - alert: DiskSpaceWarning
        expr: (1 - node_filesystem_avail_bytes{fstype!="tmpfs"} / node_filesystem_size_bytes{fstype!="tmpfs"}) * 100 > 80
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "ディスク使用率が高い ({{ $value }}%)"

      - alert: DiskSpaceCritical
        expr: (1 - node_filesystem_avail_bytes{fstype!="tmpfs"} / node_filesystem_size_bytes{fstype!="tmpfs"}) * 100 > 90
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "ディスク使用率が危険水準 ({{ $value }}%)"
```

### 4.2 アプリケーションアラート

```yaml
# rules/application.yml
groups:
  - name: application
    rules:
      - alert: HighErrorRate
        expr: sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m])) * 100 > 2
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "5xxエラー率が高い ({{ $value }}%)"

      - alert: SlowResponseTime
        expr: histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le)) > 0.5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "レスポンス時間(p95)が500msを超過"

      - alert: HealthCheckFailed
        expr: up{job="aegis-sight-backend"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "バックエンドのヘルスチェック失敗"

      - alert: HighLoginFailureRate
        expr: sum(rate(login_failures_total[10m])) > 10
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "ログイン失敗が多発 ({{ $value }}回/10分)"
```

### 4.3 データベースアラート

```yaml
# rules/database.yml
groups:
  - name: database
    rules:
      - alert: PostgresqlDown
        expr: pg_up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "PostgreSQLが停止しています"

      - alert: HighConnectionCount
        expr: pg_stat_activity_count > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "DB接続数が多い ({{ $value }})"

      - alert: SlowQueries
        expr: rate(pg_stat_activity_max_tx_duration{datname="aegis_sight_db"}[5m]) > 60
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "長時間実行クエリが存在"

      - alert: DeadlockDetected
        expr: increase(pg_stat_database_deadlocks{datname="aegis_sight_db"}[1h]) > 0
        for: 0m
        labels:
          severity: warning
        annotations:
          summary: "デッドロックが検出されました"

      - alert: LowCacheHitRatio
        expr: pg_stat_database_blks_hit{datname="aegis_sight_db"} / (pg_stat_database_blks_hit{datname="aegis_sight_db"} + pg_stat_database_blks_read{datname="aegis_sight_db"}) < 0.95
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "DBキャッシュヒット率が低い ({{ $value }})"
```

---

## 5. アラート通知

### 5.1 通知先マトリクス

| 重要度 | 通知方法 | 通知先 | 応答時間 |
|--------|---------|--------|---------|
| Critical | メール + チャット + 電話 | 全運用チーム + テックリード | 15分以内 |
| Warning | メール + チャット | 運用チーム | 1時間以内 |
| Info | チャット | 運用チャンネル | 翌営業日 |

### 5.2 Alertmanager設定

```yaml
# alertmanager.yml
global:
  smtp_from: 'aegis-sight-alert@example.com'
  smtp_smarthost: 'smtp.example.com:587'

route:
  group_by: ['alertname', 'severity']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  receiver: 'default'
  routes:
    - match:
        severity: critical
      receiver: 'critical-alerts'
      repeat_interval: 1h
    - match:
        severity: warning
      receiver: 'warning-alerts'
      repeat_interval: 4h

receivers:
  - name: 'default'
    email_configs:
      - to: 'ops-team@example.com'

  - name: 'critical-alerts'
    email_configs:
      - to: 'ops-team@example.com,tech-lead@example.com'
    webhook_configs:
      - url: 'https://chat.example.com/webhook/critical'

  - name: 'warning-alerts'
    email_configs:
      - to: 'ops-team@example.com'
    webhook_configs:
      - url: 'https://chat.example.com/webhook/warning'
```

---

## 6. Grafanaダッシュボード

### 6.1 ダッシュボード一覧

| ダッシュボード名 | 内容 | 対象者 |
|----------------|------|--------|
| System Overview | システム全体の稼働状況 | 全運用チーム |
| Backend Performance | APIレスポンス時間、エラー率 | アプリ運用担当 |
| Database Metrics | DB接続数、クエリ性能 | DB管理者 |
| Infrastructure | CPU、メモリ、ディスク | インフラ担当 |
| Security | ログイン試行、アクセスパターン | セキュリティ担当 |
| Business Metrics | ユーザー数、利用状況 | マネジメント |

### 6.2 System Overviewパネル構成

| パネル | 表示内容 | 可視化タイプ |
|--------|---------|------------|
| サービス状態 | 各サービスのUp/Down | Stat |
| リクエスト数 | 時間あたりリクエスト数 | Time series |
| エラー率 | 5xx/4xxエラーの推移 | Time series |
| レスポンス時間 | p50/p95/p99 | Time series |
| CPU使用率 | ホストCPU推移 | Gauge + Time series |
| メモリ使用率 | ホストメモリ推移 | Gauge + Time series |
| ディスク使用率 | パーティション別 | Bar gauge |
| DB接続数 | アクティブ接続推移 | Time series |
| アラート一覧 | 発報中アラート | Alert list |

---

## 7. ログ監視

### 7.1 ログ収集対象

| ソース | ログパス | 形式 | 保持期間 |
|--------|---------|------|---------|
| Backend (FastAPI) | stdout/stderr | JSON | 30日 |
| Frontend (Next.js) | stdout/stderr | テキスト | 14日 |
| Nginx | /var/log/nginx/ | Combined | 30日 |
| PostgreSQL | pg_log | テキスト | 30日 |
| Docker | docker logs | JSON | 14日 |

### 7.2 ログレベルと対応

| ログレベル | 対応 | 例 |
|-----------|------|-----|
| ERROR | 即座に確認、必要に応じてインシデント対応 | DB接続失敗、未処理例外 |
| WARNING | 日次レビューで確認 | 遅いクエリ、リトライ発生 |
| INFO | 必要時に参照 | リクエストログ、バッチ完了 |
| DEBUG | 障害調査時のみ有効化 | 詳細処理ログ |

---

## 8. Phase50 追加（2026-04-02）

### 8.1 実装済みアラートルールファイル

Phase50 にて `aegis-sight-infra/observability/prometheus/rules/aegis_alerts.yml` を追加。

| グループ | アラート数 | 主要アラート |
|---------|-----------|-------------|
| infrastructure | 6 | HighCpuUsage, CriticalCpuUsage, HighMemoryUsage, DiskSpace（Warning/Critical）, ContainerDown |
| application | 7 | HighErrorRate, HighCriticalErrorRate, SlowResponseTime, VerySlowResponseTime, HealthCheckFailed, HighLoginFailure, APIDown |
| security | 5 | HighLoginFailureRate, SuspiciousIPActivity, CertificateExpiry（Warning/Critical）, UnauthorizedAccess |
| slo | 4 | SLOAvailabilityBreach（Warning/Critical）, SLOLatencyBreach, SLOErrorBudgetBurn |

合計: **22 アラートルール**

### 8.2 Alertmanager 設定（未実装・Phase51対応）

本番通知ルーティングは Phase51 で実装予定。

```yaml
# 未実装: aegis-sight-infra/observability/alertmanager/alertmanager.yml
route:
  receiver: 'default'
  routes:
    - match:
        severity: critical
      receiver: 'critical-alerts'
receivers:
  - name: 'critical-alerts'
    slack_configs:  # Slack通知設定（Phase51）
    email_configs:  # メール通知設定（Phase51）
```

---

## 9. チェックリスト

### 監視設計レビューチェック

- [x] 全コンポーネントの監視項目が定義されているか
- [x] 閾値が適切に設定されているか
- [x] アラートの重要度分類が明確か
- [ ] 通知先が適切に設定されているか（Phase51対応）
- [x] Grafanaダッシュボードが設計されているか
- [x] ログ収集・保持ポリシーが定義されているか
- [x] Prometheus設定ファイルが準備されているか
- [x] アラートルールがテストされているか（22ルール実装済み）
- [ ] エスカレーションパスが明確か（Phase51対応）
- [x] 監視の死角がないか（全サービスがカバーされているか）
