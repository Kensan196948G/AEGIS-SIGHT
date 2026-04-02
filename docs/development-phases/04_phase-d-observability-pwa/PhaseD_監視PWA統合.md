# Phase D: 監視・PWA統合（Observability & PWA Integration）

| 項目 | 内容 |
|------|------|
| **フェーズ** | Phase D |
| **名称** | 📊 監視・PWA統合 |
| **期間** | 2026-06-01 〜 2026-07-31（2ヶ月） |
| **状態** | ⏳ 未開始 |
| **担当** | Architect / Developer / DevOps |

---

## 🎯 目標

IAMSのPrometheus/GrafanaとPWA機能をAEGIS-SIGHTに統合し、
インフラ可観測性とオフライン対応を実現する。

---

## 📋 主要タスク

### D-1: Prometheus/Grafana統合（Week 1-3）

| タスク | 内容 | 成果物 |
|--------|------|--------|
| Prometheusメトリクス収集設定 | AEGIS-SIGHT APIのメトリクス公開 | `/metrics` エンドポイント |
| Grafanaダッシュボード作成 | デバイス監視・アラートダッシュボード | Grafanaダッシュボード |
| アラートルール設定 | 閾値超過時の自動アラート | Prometheusルール |
| Docker Compose統合 | Prometheus/Grafana追加 | `docker-compose.yml` 更新 |

```yaml
# docker-compose.yml 追加予定
prometheus:
  image: prom/prometheus:latest
  ports:
    - "9090:9090"
  volumes:
    - ./prometheus/prometheus.yml:/etc/prometheus/prometheus.yml

grafana:
  image: grafana/grafana:latest
  ports:
    - "3001:3000"
  environment:
    - GF_SECURITY_ADMIN_PASSWORD=admin
```

### D-2: エンドポイント監視メトリクス（Week 2-4）

| メトリクス | 説明 | アラート閾値 |
|-----------|------|-----------|
| `device_online_count` | オンラインデバイス数 | < 450台でアラート |
| `device_offline_count` | オフラインデバイス数 | > 50台でアラート |
| `alert_critical_count` | クリティカルアラート数 | > 10件でアラート |
| `policy_violation_count` | ポリシー違反数 | > 0件でアラート |
| `license_expiring_count` | 期限切れ間近ライセンス数 | > 5件でアラート |
| `api_response_time_p95` | APIレスポンスタイム95パーセンタイル | > 500ms でアラート |

### D-3: PWA実装（Week 3-6）

| タスク | 内容 | 成果物 |
|--------|------|--------|
| Service Worker設定 | オフラインキャッシュ戦略 | `public/sw.js` |
| Web App Manifest | PWAメタデータ | `public/manifest.json` |
| オフラインページ | 接続切断時のフォールバック | `app/offline/page.tsx` |
| バックグラウンド同期 | オフライン操作の後で同期 | Service Worker Sync API |
| プッシュ通知 | 重要アラートのプッシュ | Service Worker Push API |

```json
// manifest.json
{
  "name": "AEGIS-SIGHT",
  "short_name": "AEGIS",
  "description": "エンドポイント管理システム",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#1a1a2e",
  "theme_color": "#0066cc",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

### D-4: オフライン資産確認機能（Week 5-7）

建設現場での端末管理要件に対応するオフライン機能。

| 機能 | 説明 | 技術 |
|------|------|------|
| デバイス一覧オフラインキャッシュ | 最新データを端末にキャッシュ | IndexedDB / Cache API |
| オフライン検索 | キャッシュデータの検索 | Fuse.js |
| 変更キュー | オフライン変更を後で同期 | Background Sync |
| 競合解決 | オンライン復帰時の競合処理 | Last-Write-Wins戦略 |

### D-5: テスト・ドキュメント（Week 7-8）

| タスク | 内容 |
|--------|------|
| Prometheusメトリクステスト | `/metrics` エンドポイントのpytestテスト |
| PWA E2Eテスト | Playwright + オフラインモード |
| Grafanaダッシュボード書き出し | JSON形式でバージョン管理 |
| 監視運用手順書 | `docs/09_運用管理/` 更新 |

---

## 📊 KPI目標

| KPI | 目標値 |
|-----|-------|
| Prometheusメトリクス収集数 | 20+メトリクス |
| Grafanaダッシュボード数 | 3+ダッシュボード |
| PWA Lighthouse スコア | 90+点 |
| オフラインキャッシュ対象 | デバイス一覧・アラート一覧 |
| Service Worker登録率 | 100%（対応ブラウザ） |

---

## 🔗 依存関係

| 依存先 | 理由 |
|--------|------|
| Phase B完了 | APIエンドポイント全実装が必要 |
| Phase C進行中 | IAMS監視関連テスト変換 |

---

*最終更新: 2026-04-02 | Phase D 設計中*
