# バックアップ復旧手順（Backup & Recovery Procedure）

| 項目 | 内容 |
|------|------|
| プロジェクト | AEGIS-SIGHT（SKYSEA内製代替）+ IAMS選択移植 |
| 作成日 | 2026-03-27 |
| ステータス | Draft |
| RTO | 1時間以内 |
| RPO | 1時間以内 |

---

## 1. バックアップ方針

### 1.1 RTO/RPO定義

| 指標 | 目標値 | 説明 |
|------|--------|------|
| RTO（目標復旧時間） | 1時間以内 | 障害発生からサービス復旧までの最大許容時間 |
| RPO（目標復旧地点） | 1時間以内 | 障害発生時に許容されるデータ損失の最大時間幅 |

### 1.2 バックアップ対象

| 対象 | バックアップ方式 | 頻度 | 保持期間 |
|------|----------------|------|---------|
| PostgreSQLデータベース | pg_dump（論理） | 日次 | 30日 |
| PostgreSQL WAL | 継続アーカイブ | 連続 | 7日 |
| 環境変数ファイル | ファイルコピー | 変更時 | 永続 |
| Docker Compose設定 | Git管理 | 変更時 | 永続 |
| アップロードファイル | ファイルコピー | 日次 | 30日 |
| Grafanaダッシュボード | JSON エクスポート | 週次 | 90日 |
| Prometheus データ | スナップショット | 週次 | 30日 |

---

## 2. PostgreSQLバックアップ

### 2.1 日次フルバックアップ

```bash
#!/bin/bash
# scripts/backup_database.sh
# 日次データベースバックアップスクリプト

set -euo pipefail

# 設定
BACKUP_DIR="/opt/backups/database"
DB_CONTAINER="aegis-sight-db-1"
DB_NAME="aegis_sight_db"
DB_USER="aegis_user"
RETENTION_DAYS=30
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/aegis_sight_${DATE}.sql.gz"
LOG_FILE="/var/log/aegis-sight/backup.log"

# バックアップディレクトリ作成
mkdir -p "${BACKUP_DIR}"

echo "[$(date)] バックアップ開始: ${BACKUP_FILE}" >> "${LOG_FILE}"

# pg_dumpでバックアップ取得
docker exec "${DB_CONTAINER}" pg_dump \
  -U "${DB_USER}" \
  -d "${DB_NAME}" \
  --format=custom \
  --compress=9 \
  --verbose \
  2>> "${LOG_FILE}" \
  > "${BACKUP_FILE}"

# バックアップファイルサイズ検証
FILE_SIZE=$(stat -c %s "${BACKUP_FILE}" 2>/dev/null || echo "0")
if [ "${FILE_SIZE}" -lt 1024 ]; then
  echo "[$(date)] エラー: バックアップファイルが異常に小さい (${FILE_SIZE} bytes)" >> "${LOG_FILE}"
  exit 1
fi

# チェックサム生成
sha256sum "${BACKUP_FILE}" > "${BACKUP_FILE}.sha256"

echo "[$(date)] バックアップ完了: ${BACKUP_FILE} (${FILE_SIZE} bytes)" >> "${LOG_FILE}"

# 古いバックアップの削除
find "${BACKUP_DIR}" -name "aegis_sight_*.sql.gz" -mtime +${RETENTION_DAYS} -delete
find "${BACKUP_DIR}" -name "aegis_sight_*.sha256" -mtime +${RETENTION_DAYS} -delete

echo "[$(date)] 古いバックアップを削除 (${RETENTION_DAYS}日以上)" >> "${LOG_FILE}"
```

### 2.2 WAL（Write-Ahead Log）アーカイブ

```ini
# postgresql.conf（WALアーカイブ設定）
wal_level = replica
archive_mode = on
archive_command = 'cp %p /opt/backups/wal/%f'
archive_timeout = 300  # 5分ごとにWALをアーカイブ
```

### 2.3 バックアップスケジュール

| バックアップ | スケジュール | cron設定 |
|-------------|------------|---------|
| 日次フルバックアップ | 毎日 2:00 | `0 2 * * * /opt/aegis-sight/scripts/backup_database.sh` |
| WALアーカイブ | 連続（5分間隔） | PostgreSQL内蔵 |
| 環境変数バックアップ | 変更検知時 | `*/30 * * * * /opt/aegis-sight/scripts/backup_env.sh` |

### 2.4 バックアップ保管場所

| 保管場所 | 用途 | パス |
|---------|------|------|
| ローカル | 即時復旧用 | /opt/backups/database/ |
| リモート | 災害対策用 | （NASまたはオブジェクトストレージ） |

---

## 3. データベース復旧手順

### 3.1 フルリストア手順

特定のバックアップファイルからデータベース全体を復旧する手順。

```bash
# ステップ1: 復旧対象のバックアップを特定
ls -lt /opt/backups/database/aegis_sight_*.sql.gz | head -5

# ステップ2: チェックサム検証
sha256sum -c /opt/backups/database/aegis_sight_20260327_020000.sql.gz.sha256
# 期待: OK

# ステップ3: アプリケーションを停止
cd /opt/aegis-sight
docker compose stop backend frontend

# ステップ4: 既存データベースの退避
docker compose exec db pg_dump -U aegis_user aegis_sight_db \
  | gzip > /opt/backups/pre_restore_$(date +%Y%m%d_%H%M%S).sql.gz

# ステップ5: 既存データベースを削除・再作成
docker compose exec db psql -U aegis_user -c "
  SELECT pg_terminate_backend(pid) FROM pg_stat_activity
  WHERE datname = 'aegis_sight_db' AND pid <> pg_backend_pid();"
docker compose exec db dropdb -U aegis_user aegis_sight_db
docker compose exec db createdb -U aegis_user aegis_sight_db

# ステップ6: バックアップからリストア
docker compose exec -T db pg_restore \
  -U aegis_user \
  -d aegis_sight_db \
  --verbose \
  < /opt/backups/database/aegis_sight_20260327_020000.sql.gz

# ステップ7: リストア結果確認
docker compose exec db psql -U aegis_user aegis_sight_db -c "
  SELECT schemaname, tablename, n_live_tup
  FROM pg_stat_user_tables
  ORDER BY n_live_tup DESC
  LIMIT 10;"

# ステップ8: アプリケーション再起動
docker compose up -d backend frontend

# ステップ9: ヘルスチェック
curl -s http://localhost:8000/api/v1/health/ready | jq .

# ステップ10: 動作確認
echo "復旧完了: $(date)" >> /var/log/aegis-sight/restore.log
```

### 3.2 PITR（Point-in-Time Recovery）手順

WALアーカイブを使用して、特定の時点までデータを復旧する手順。

```bash
# ステップ1: 復旧先の時刻を決定
# 例: 2026-03-27 10:30:00 の状態に復旧

# ステップ2: アプリケーションを停止
docker compose stop backend frontend

# ステップ3: PostgreSQLを停止
docker compose stop db

# ステップ4: 現在のデータディレクトリを退避
docker run --rm \
  -v aegis-sight_postgres_data:/data \
  -v /opt/backups/pitr_backup:/backup \
  alpine cp -a /data/. /backup/

# ステップ5: ベースバックアップからリストア
# （ベースバックアップのリストア手順は環境に依存）

# ステップ6: recovery.conf（PostgreSQL 16ではpostgresql.confに記載）
# recovery_target_time = '2026-03-27 10:30:00+09'
# restore_command = 'cp /opt/backups/wal/%f %p'
# recovery_target_action = 'promote'

# ステップ7: PostgreSQL起動（リカバリモード）
docker compose up -d db

# ステップ8: リカバリ完了を確認
docker compose logs db | grep "recovery"
# 期待: "database system is ready to accept connections"

# ステップ9: データ確認
docker compose exec db psql -U aegis_user aegis_sight_db -c "SELECT now();"

# ステップ10: アプリケーション再起動
docker compose up -d backend frontend
```

### 3.3 テーブル単位の復旧

特定テーブルのみを復旧する手順。

```bash
# ステップ1: バックアップからテーブルデータを抽出
docker compose exec -T db pg_restore \
  -U aegis_user \
  -d aegis_sight_db \
  --data-only \
  --table=<テーブル名> \
  --clean \
  < /opt/backups/database/aegis_sight_20260327_020000.sql.gz

# または、一時DBにリストアしてからコピー
docker compose exec db createdb -U aegis_user temp_restore
docker compose exec -T db pg_restore \
  -U aegis_user \
  -d temp_restore \
  < /opt/backups/database/aegis_sight_20260327_020000.sql.gz

docker compose exec db psql -U aegis_user aegis_sight_db -c "
  TRUNCATE TABLE <テーブル名>;
  INSERT INTO <テーブル名> SELECT * FROM dblink(
    'dbname=temp_restore user=aegis_user',
    'SELECT * FROM <テーブル名>'
  ) AS t(/* カラム定義 */);"

docker compose exec db dropdb -U aegis_user temp_restore
```

---

## 4. 復旧時間の見積もり

| 復旧シナリオ | データ量 | 推定時間 | 手順 |
|-------------|---------|---------|------|
| フルリストア（< 1GB） | ~1GB | 10-15分 | 3.1 |
| フルリストア（1-10GB） | 1-10GB | 15-30分 | 3.1 |
| フルリストア（> 10GB） | > 10GB | 30-60分 | 3.1 |
| PITR | 任意 | 20-40分 | 3.2 |
| テーブル単位復旧 | 小 | 5-10分 | 3.3 |

---

## 5. バックアップ検証

### 5.1 月次復元テスト

```bash
#!/bin/bash
# scripts/verify_backup.sh
# 月次バックアップ検証スクリプト

set -euo pipefail

LOG="/var/log/aegis-sight/backup_verify.log"
LATEST_BACKUP=$(ls -t /opt/backups/database/aegis_sight_*.sql.gz | head -1)

echo "[$(date)] バックアップ検証開始: ${LATEST_BACKUP}" >> "${LOG}"

# チェックサム検証
sha256sum -c "${LATEST_BACKUP}.sha256" >> "${LOG}" 2>&1

# テスト用DBにリストア
docker compose exec db createdb -U aegis_user verify_test_db 2>> "${LOG}"
docker compose exec -T db pg_restore \
  -U aegis_user \
  -d verify_test_db \
  < "${LATEST_BACKUP}" 2>> "${LOG}"

# データ件数確認
docker compose exec db psql -U aegis_user verify_test_db -c "
  SELECT tablename, n_live_tup
  FROM pg_stat_user_tables
  ORDER BY tablename;" >> "${LOG}"

# テストDB削除
docker compose exec db dropdb -U aegis_user verify_test_db 2>> "${LOG}"

echo "[$(date)] バックアップ検証完了: 正常" >> "${LOG}"
```

### 5.2 検証チェック項目

| # | チェック項目 | 方法 |
|---|------------|------|
| 1 | バックアップファイルの存在 | ls -la で確認 |
| 2 | ファイルサイズの妥当性 | 前回比較（大幅な増減がないか） |
| 3 | チェックサムの一致 | sha256sum -c で検証 |
| 4 | リストア可能性 | テストDBへのリストア |
| 5 | データ件数の妥当性 | テーブル行数の確認 |
| 6 | 最終バックアップ日時 | RPO以内であること |

---

## 6. 障害シナリオ別復旧手順

| 障害シナリオ | 復旧方法 | 推定RTO | データ損失 |
|-------------|---------|---------|-----------|
| DBプロセスクラッシュ | Docker再起動 | 5分 | なし（WALで自動復旧） |
| データ破損（一部テーブル） | テーブル単位復旧 | 15分 | RPO以内 |
| DBボリューム障害 | フルリストア | 30-60分 | RPO以内 |
| 誤操作（DELETE/DROP） | PITRまたはテーブル復旧 | 20-40分 | 操作前まで |
| ホスト障害 | 別ホストでフルリストア | 60分 | RPO以内 |
| ランサムウェア | リモートバックアップからリストア | 60-120分 | RPO以内 |

---

## 7. バックアップ監視

| 監視項目 | 閾値 | アラート |
|---------|------|---------|
| 日次バックアップ未実行 | 26時間以上経過 | Critical |
| バックアップファイルサイズ異常 | 前日比50%以上変動 | Warning |
| バックアップストレージ残量 | < 20% | Warning |
| WALアーカイブ遅延 | > 10分 | Warning |

---

## 8. チェックリスト

### バックアップ運用チェック

- [ ] 日次バックアップが正常に実行されているか
- [ ] バックアップファイルのサイズが妥当か
- [ ] チェックサムが正常か
- [ ] WALアーカイブが動作しているか
- [ ] バックアップストレージの残量が十分か
- [ ] 月次復元テストを実施したか
- [ ] リモートバックアップが存在するか
- [ ] RTO/RPO目標を達成可能な体制か
- [ ] バックアップスクリプトのcronが設定されているか
- [ ] バックアップ監視アラートが設定されているか
