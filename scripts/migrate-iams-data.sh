#!/bin/bash
# =============================================================================
# IAMS → AEGIS-SIGHT データ移行スクリプト
# 用途: IntegratedITAssetServiceManagement から AEGIS-SIGHT への選択的移植
# 対象: SAMライセンス管理・調達管理（Procurement）
# 注意: 冪等設計 (何度実行しても安全)
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="${SCRIPT_DIR}/../logs/iams-migration-$(date +%Y%m%d_%H%M%S).log"
mkdir -p "$(dirname "$LOG_FILE")"

# ─── カラー出力 ───
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[$(date '+%H:%M:%S')]${NC} $*" | tee -a "$LOG_FILE"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*" | tee -a "$LOG_FILE"; }
error() { echo -e "${RED}[ERROR]${NC} $*" | tee -a "$LOG_FILE"; }
info() { echo -e "${BLUE}[INFO]${NC} $*" | tee -a "$LOG_FILE"; }

# ─── 設定 ───
IAMS_DB_URL="${IAMS_DATABASE_URL:-postgresql://postgres:password@localhost:5433/iams}"
AEGIS_DB_URL="${DATABASE_URL:-postgresql://postgres:password@localhost:5432/aegis_sight}"
DRY_RUN="${DRY_RUN:-false}"
BATCH_SIZE="${BATCH_SIZE:-500}"

# ─── ヘルプ ───
usage() {
    cat <<EOF
IAMS → AEGIS-SIGHT データ移行スクリプト

使用方法:
  $0 [options]

オプション:
  --dry-run         実際の変更なしで実行（確認用）
  --sam-only        SAMライセンスデータのみ移行
  --procurement-only 調達管理データのみ移行
  --batch-size N    バッチサイズ (デフォルト: 500)
  --help            このヘルプを表示

環境変数:
  IAMS_DATABASE_URL  IAMSデータベースURL
  DATABASE_URL       AEGIS-SIGHTデータベースURL
  DRY_RUN            true で dry-run モード

例:
  DRY_RUN=true $0
  $0 --sam-only
  $0 --batch-size 100
EOF
    exit 0
}

# ─── 引数解析 ───
MIGRATE_SAM=true
MIGRATE_PROCUREMENT=true

while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run) DRY_RUN=true ;;
        --sam-only) MIGRATE_PROCUREMENT=false ;;
        --procurement-only) MIGRATE_SAM=false ;;
        --batch-size) BATCH_SIZE="$2"; shift ;;
        --help) usage ;;
        *) error "不明なオプション: $1"; exit 1 ;;
    esac
    shift
done

# ─── DB接続確認 ───
check_db_connection() {
    local db_url="$1"
    local db_name="$2"
    if psql "$db_url" -c "SELECT 1" &>/dev/null; then
        log "$db_name 接続OK"
        return 0
    else
        error "$db_name 接続失敗: $db_url"
        return 1
    fi
}

# ─── テーブル存在確認 ───
table_exists() {
    local db_url="$1"
    local table="$2"
    psql "$db_url" -tAc "SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='$table')" 2>/dev/null | grep -q 't'
}

# ─── レコード数取得 ───
count_records() {
    local db_url="$1"
    local table="$2"
    psql "$db_url" -tAc "SELECT COUNT(*) FROM $table" 2>/dev/null || echo "0"
}

# ─── SAMライセンスデータ移行 ───
migrate_sam_licenses() {
    log "SAMライセンスデータ移行開始..."

    if ! table_exists "$IAMS_DB_URL" "software_licenses"; then
        warn "IAMS: software_licenses テーブルが存在しません。スキップ。"
        return 0
    fi

    local iams_count
    iams_count=$(count_records "$IAMS_DB_URL" "software_licenses")
    info "IAMS SAMレコード数: $iams_count"

    if [ "$DRY_RUN" = "true" ]; then
        warn "[DRY-RUN] SAMライセンス $iams_count 件を移行予定（実行なし）"
        return 0
    fi

    # 移行SQL (冪等: ON CONFLICT DO NOTHING)
    psql "$AEGIS_DB_URL" <<SQL
INSERT INTO software_licenses (
    id, name, vendor, product_key, license_type,
    total_seats, used_seats, purchase_date, expiry_date,
    purchase_price, status, notes, created_at, updated_at
)
SELECT
    gen_random_uuid(),
    name,
    vendor,
    product_key,
    license_type,
    total_seats,
    used_seats,
    purchase_date,
    expiry_date,
    purchase_price,
    status,
    notes,
    created_at,
    updated_at
FROM dblink('$IAMS_DB_URL', '
    SELECT name, vendor, product_key, license_type,
           total_seats, used_seats, purchase_date, expiry_date,
           purchase_price, status, notes, created_at, updated_at
    FROM software_licenses
    WHERE deleted_at IS NULL
') AS iams_data(
    name text, vendor text, product_key text, license_type text,
    total_seats int, used_seats int, purchase_date date, expiry_date date,
    purchase_price numeric, status text, notes text,
    created_at timestamptz, updated_at timestamptz
)
ON CONFLICT (product_key) DO NOTHING;
SQL

    local migrated_count
    migrated_count=$(count_records "$AEGIS_DB_URL" "software_licenses")
    log "SAMライセンス移行完了: $migrated_count 件（AEGIS-SIGHT）"
}

# ─── 調達管理データ移行 ───
migrate_procurement() {
    log "調達管理データ移行開始..."

    if ! table_exists "$IAMS_DB_URL" "procurement_requests"; then
        warn "IAMS: procurement_requests テーブルが存在しません。スキップ。"
        return 0
    fi

    local iams_count
    iams_count=$(count_records "$IAMS_DB_URL" "procurement_requests")
    info "IAMS 調達レコード数: $iams_count"

    if [ "$DRY_RUN" = "true" ]; then
        warn "[DRY-RUN] 調達管理 $iams_count 件を移行予定（実行なし）"
        return 0
    fi

    # 移行SQL (冪等: ON CONFLICT DO NOTHING)
    psql "$AEGIS_DB_URL" <<SQL
INSERT INTO procurement_requests (
    id, title, description, requester_id, department_id,
    estimated_cost, status, priority, vendor_name,
    requested_date, approved_date, received_date, notes,
    created_at, updated_at
)
SELECT
    gen_random_uuid(),
    title,
    description,
    NULL,  -- requester_id は AEGIS-SIGHT ユーザーIDと要マッピング
    NULL,  -- department_id は AEGIS-SIGHT 部門IDと要マッピング
    estimated_cost,
    status,
    priority,
    vendor_name,
    requested_date,
    approved_date,
    received_date,
    CONCAT('[IAMS移行] ', COALESCE(notes, '')),
    created_at,
    updated_at
FROM dblink('$IAMS_DB_URL', '
    SELECT title, description, estimated_cost, status, priority,
           vendor_name, requested_date, approved_date, received_date,
           notes, created_at, updated_at
    FROM procurement_requests
    WHERE deleted_at IS NULL
') AS iams_data(
    title text, description text, estimated_cost numeric, status text,
    priority text, vendor_name text, requested_date date,
    approved_date date, received_date date, notes text,
    created_at timestamptz, updated_at timestamptz
)
ON CONFLICT DO NOTHING;
SQL

    local migrated_count
    migrated_count=$(count_records "$AEGIS_DB_URL" "procurement_requests")
    log "調達管理移行完了: $migrated_count 件（AEGIS-SIGHT）"
}

# ─── 整合性チェック ───
verify_migration() {
    log "移行後整合性チェック..."

    if [ "$MIGRATE_SAM" = "true" ] && table_exists "$AEGIS_DB_URL" "software_licenses"; then
        local sam_count
        sam_count=$(count_records "$AEGIS_DB_URL" "software_licenses")
        info "SAMライセンス（AEGIS-SIGHT）: $sam_count 件"
    fi

    if [ "$MIGRATE_PROCUREMENT" = "true" ] && table_exists "$AEGIS_DB_URL" "procurement_requests"; then
        local proc_count
        proc_count=$(count_records "$AEGIS_DB_URL" "procurement_requests")
        info "調達管理（AEGIS-SIGHT）: $proc_count 件"
    fi

    log "整合性チェック完了"
}

# ─── メイン処理 ───
main() {
    log "========================================="
    log "IAMS → AEGIS-SIGHT データ移行開始"
    log "DRY_RUN: $DRY_RUN"
    log "BATCH_SIZE: $BATCH_SIZE"
    log "========================================="

    if [ "$DRY_RUN" = "true" ]; then
        warn "DRY-RUN モードで実行中（データ変更なし）"
    fi

    # DB接続確認
    if ! check_db_connection "$IAMS_DB_URL" "IAMS DB"; then
        error "IAMS DBに接続できません。IAMS_DATABASE_URL を確認してください。"
        exit 1
    fi
    if ! check_db_connection "$AEGIS_DB_URL" "AEGIS-SIGHT DB"; then
        error "AEGIS-SIGHT DBに接続できません。DATABASE_URL を確認してください。"
        exit 1
    fi

    # dblink 拡張確認
    if [ "$DRY_RUN" = "false" ]; then
        psql "$AEGIS_DB_URL" -c "CREATE EXTENSION IF NOT EXISTS dblink;" &>/dev/null || true
    fi

    # 移行実行
    [ "$MIGRATE_SAM" = "true" ] && migrate_sam_licenses
    [ "$MIGRATE_PROCUREMENT" = "true" ] && migrate_procurement

    # 整合性チェック
    verify_migration

    log "========================================="
    log "移行完了 ✅"
    log "ログファイル: $LOG_FILE"
    log "========================================="
}

main "$@"
