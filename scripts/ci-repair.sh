#!/bin/bash
# =============================================================================
# AEGIS-SIGHT - CI 失敗自動修復スクリプト
# 失敗したジョブを解析し、自動的に修復を試みる
# ClaudeOS CI Manager から呼び出される
# =============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# 定数
# ---------------------------------------------------------------------------
REPO="Kensan196948G/AEGIS-SIGHT"
BRANCH=$(git -C /mnt/LinuxHDD/AEGIS-SIGHT branch --show-current 2>/dev/null || echo "main")
PROJECT_ROOT="/mnt/LinuxHDD/AEGIS-SIGHT"

# ---------------------------------------------------------------------------
# ヘルパー関数
# ---------------------------------------------------------------------------
log_info()  { echo "[ClaudeOS][CI-REPAIR][INFO]  $*"; }
log_warn()  { echo "[ClaudeOS][CI-REPAIR][WARN]  $*" >&2; }
log_error() { echo "[ClaudeOS][CI-REPAIR][ERROR] $*" >&2; }

usage() {
  cat <<USAGE
Usage: ci-repair.sh [RUN_ID]

RUN_ID  (optional) GitHub Actions Run ID. If omitted, uses the latest failed run.

CI失敗時に自動修復を試みます:
  - lint失敗:  ruff --fix / eslint --fix を実行
  - test失敗:  失敗テストのログを収集・報告
  - build失敗: 依存関係の再インストール
  - 修復後:    自動 commit + push
USAGE
  exit 1
}

# ---------------------------------------------------------------------------
# Step 1: 失敗したRunを特定
# ---------------------------------------------------------------------------
RUN_ID="${1:-}"

if [[ -z "$RUN_ID" ]]; then
  log_info "No Run ID specified. Fetching latest failed run on branch '${BRANCH}'..."
  RUN_ID=$(gh run list --repo "$REPO" --branch "$BRANCH" --status failure \
    --limit 1 --json databaseId -q '.[0].databaseId' 2>/dev/null || echo "")

  if [[ -z "$RUN_ID" ]]; then
    log_info "No failed runs found on branch '${BRANCH}'."
    exit 0
  fi
fi

log_info "Analyzing Run ID: ${RUN_ID}"

# ---------------------------------------------------------------------------
# Step 2: 失敗ジョブのログを取得
# ---------------------------------------------------------------------------
RUN_INFO=$(gh run view "$RUN_ID" --repo "$REPO" --json jobs,conclusion,name 2>&1) || {
  log_error "Failed to fetch run info: $RUN_INFO"
  exit 1
}

RUN_NAME=$(echo "$RUN_INFO" | jq -r '.name // "unknown"')
log_info "Run: ${RUN_NAME} (${RUN_ID})"

FAILED_JOBS=$(echo "$RUN_INFO" | jq -r '.jobs[] | select(.conclusion == "failure") | .name')

if [[ -z "$FAILED_JOBS" ]]; then
  log_info "No failed jobs found in run ${RUN_ID}."
  exit 0
fi

log_info "Failed jobs:"
echo "$FAILED_JOBS" | while read -r job; do
  log_info "  - ${job}"
done

# ログ全文を取得
LOG_DIR=$(mktemp -d)
gh run view "$RUN_ID" --repo "$REPO" --log-failed > "${LOG_DIR}/failed.log" 2>/dev/null || true
FAILED_LOG="${LOG_DIR}/failed.log"

REPAIRS_MADE=0
REPAIR_SUMMARY=""

# ---------------------------------------------------------------------------
# Step 3: Lint 失敗の修復
# ---------------------------------------------------------------------------
repair_lint() {
  log_info "=== Lint Repair ==="
  local repaired=0

  # Python lint (ruff)
  if grep -qi "ruff\|flake8\|pylint\|E501\|F401\|W291" "$FAILED_LOG" 2>/dev/null; then
    log_info "Detected Python lint failure. Running ruff --fix..."
    if command -v ruff &>/dev/null; then
      (cd "$PROJECT_ROOT/aegis-sight-api" && ruff check --fix . 2>&1) || true
      (cd "$PROJECT_ROOT/aegis-sight-api" && ruff format . 2>&1) || true
      repaired=1
      REPAIR_SUMMARY+="- Python lint: ruff --fix applied\n"
    else
      log_warn "ruff not found. Install with: pip install ruff"
    fi
  fi

  # TypeScript/JavaScript lint (eslint)
  if grep -qi "eslint\|prettier\|parsing error\|no-unused-vars" "$FAILED_LOG" 2>/dev/null; then
    log_info "Detected TypeScript/JS lint failure. Running eslint --fix..."
    if [[ -f "$PROJECT_ROOT/aegis-sight-web/node_modules/.bin/eslint" ]]; then
      (cd "$PROJECT_ROOT/aegis-sight-web" && npx eslint --fix 'app/**/*.{ts,tsx}' 'components/**/*.{ts,tsx}' 2>&1) || true
      repaired=1
      REPAIR_SUMMARY+="- TypeScript lint: eslint --fix applied\n"
    elif command -v npx &>/dev/null && [[ -f "$PROJECT_ROOT/aegis-sight-web/package.json" ]]; then
      log_info "Running npm install first..."
      (cd "$PROJECT_ROOT/aegis-sight-web" && npm install 2>&1) || true
      (cd "$PROJECT_ROOT/aegis-sight-web" && npx eslint --fix 'app/**/*.{ts,tsx}' 2>&1) || true
      repaired=1
      REPAIR_SUMMARY+="- TypeScript lint: eslint --fix applied (after npm install)\n"
    else
      log_warn "eslint not available in aegis-sight-web/"
    fi
  fi

  return $repaired
}

# ---------------------------------------------------------------------------
# Step 4: テスト失敗の解析
# ---------------------------------------------------------------------------
repair_test() {
  log_info "=== Test Failure Analysis ==="
  local repaired=0

  # pytest 失敗の解析
  if grep -qi "pytest\|FAILED\|AssertionError\|test_.*\.py" "$FAILED_LOG" 2>/dev/null; then
    log_info "Detected pytest failure. Collecting failed test info..."

    FAILED_TESTS=$(grep -oP '(?:FAILED|ERROR)\s+\S+' "$FAILED_LOG" 2>/dev/null | head -20 || true)
    if [[ -n "$FAILED_TESTS" ]]; then
      log_info "Failed tests:"
      echo "$FAILED_TESTS" | while read -r line; do
        log_info "  $line"
      done
      REPAIR_SUMMARY+="- pytest: ${FAILED_TESTS}\n"
    fi

    # missing module の自動修復
    MISSING_MODULES=$(grep -oP "ModuleNotFoundError: No module named '(\S+)'" "$FAILED_LOG" 2>/dev/null | \
      sed "s/ModuleNotFoundError: No module named '//;s/'//" || true)
    if [[ -n "$MISSING_MODULES" ]]; then
      log_info "Missing Python modules detected. Installing..."
      echo "$MISSING_MODULES" | while read -r mod; do
        log_info "  pip install ${mod}"
        pip install "$mod" 2>&1 || true
      done
      repaired=1
      REPAIR_SUMMARY+="- pytest: installed missing modules: ${MISSING_MODULES}\n"
    fi
  fi

  # Jest/Vitest 失敗の解析
  if grep -qi "jest\|vitest\|FAIL.*\.test\.\|expect(" "$FAILED_LOG" 2>/dev/null; then
    log_info "Detected JS test failure. Collecting info..."
    FAILED_JS_TESTS=$(grep -oP 'FAIL\s+\S+' "$FAILED_LOG" 2>/dev/null | head -20 || true)
    if [[ -n "$FAILED_JS_TESTS" ]]; then
      log_info "Failed JS tests:"
      echo "$FAILED_JS_TESTS" | while read -r line; do
        log_info "  $line"
      done
      REPAIR_SUMMARY+="- jest/vitest: ${FAILED_JS_TESTS}\n"
    fi
  fi

  return $repaired
}

# ---------------------------------------------------------------------------
# Step 5: Build 失敗の修復
# ---------------------------------------------------------------------------
repair_build() {
  log_info "=== Build Repair ==="
  local repaired=0

  # Python 依存関係の再インストール
  if grep -qi "pip\|requirements\|ModuleNotFoundError\|ImportError" "$FAILED_LOG" 2>/dev/null; then
    log_info "Detected Python dependency issue. Reinstalling..."
    if [[ -f "$PROJECT_ROOT/aegis-sight-api/requirements.txt" ]]; then
      (cd "$PROJECT_ROOT/aegis-sight-api" && pip install -r requirements.txt 2>&1) || true
      repaired=1
      REPAIR_SUMMARY+="- Python: reinstalled requirements.txt\n"
    fi
    if [[ -f "$PROJECT_ROOT/aegis-sight-api/pyproject.toml" ]]; then
      (cd "$PROJECT_ROOT/aegis-sight-api" && pip install -e '.[dev]' 2>&1) || true
      repaired=1
      REPAIR_SUMMARY+="- Python: reinstalled from pyproject.toml\n"
    fi
  fi

  # Node.js 依存関係の再インストール
  if grep -qi "npm\|node_modules\|Cannot find module\|ERR_MODULE_NOT_FOUND" "$FAILED_LOG" 2>/dev/null; then
    log_info "Detected Node.js dependency issue. Reinstalling..."
    if [[ -f "$PROJECT_ROOT/aegis-sight-web/package.json" ]]; then
      (cd "$PROJECT_ROOT/aegis-sight-web" && rm -rf node_modules && npm install 2>&1) || true
      repaired=1
      REPAIR_SUMMARY+="- Node.js: clean reinstall of node_modules\n"
    fi
  fi

  # Docker build 失敗
  if grep -qi "docker\|Dockerfile\|docker-compose\|build.*failed" "$FAILED_LOG" 2>/dev/null; then
    log_info "Detected Docker build issue."
    REPAIR_SUMMARY+="- Docker: build failure detected (manual review required)\n"
  fi

  return $repaired
}

# ---------------------------------------------------------------------------
# Step 6: 修復の実行
# ---------------------------------------------------------------------------
echo "$FAILED_JOBS" | while read -r job; do
  job_lower="${job,,}"

  case "$job_lower" in
    *lint*|*format*|*style*)
      repair_lint && REPAIRS_MADE=$((REPAIRS_MADE + 1))
      ;;
    *test*|*pytest*|*jest*|*vitest*)
      repair_test && REPAIRS_MADE=$((REPAIRS_MADE + 1))
      ;;
    *build*|*compile*|*docker*)
      repair_build && REPAIRS_MADE=$((REPAIRS_MADE + 1))
      ;;
    *)
      # ログの内容で判定
      repair_lint && REPAIRS_MADE=$((REPAIRS_MADE + 1))
      repair_test && REPAIRS_MADE=$((REPAIRS_MADE + 1))
      repair_build && REPAIRS_MADE=$((REPAIRS_MADE + 1))
      ;;
  esac
done

# ---------------------------------------------------------------------------
# Step 7: 修復があった場合、自動 commit + push
# ---------------------------------------------------------------------------
cd "$PROJECT_ROOT"

CHANGED=$(git diff --name-only 2>/dev/null || true)
STAGED=$(git diff --cached --name-only 2>/dev/null || true)

if [[ -n "$CHANGED" || -n "$STAGED" ]]; then
  log_info "Changes detected after repair. Creating auto-fix commit..."

  git add -A
  git commit -m "fix(ci): auto-repair by ClaudeOS CI Manager

Repairs applied:
$(echo -e "$REPAIR_SUMMARY")

Run ID: ${RUN_ID}
Branch: ${BRANCH}

Co-Authored-By: ClaudeOS CI Manager <noreply@claudeos.dev>"

  log_info "Pushing auto-fix to origin/${BRANCH}..."
  git push origin "$BRANCH" 2>&1 || {
    log_error "Push failed. Manual push required."
    exit 1
  }

  log_info "Auto-fix committed and pushed successfully."
else
  log_info "No file changes after repair attempt."
fi

# ---------------------------------------------------------------------------
# Step 8: レポート出力
# ---------------------------------------------------------------------------
log_info "========================================="
log_info "CI Repair Summary"
log_info "========================================="
log_info "Run ID:    ${RUN_ID}"
log_info "Run Name:  ${RUN_NAME}"
log_info "Branch:    ${BRANCH}"
log_info "Failed Jobs:"
echo "$FAILED_JOBS" | while read -r job; do
  log_info "  - ${job}"
done
if [[ -n "$REPAIR_SUMMARY" ]]; then
  log_info "Repairs:"
  echo -e "$REPAIR_SUMMARY" | while read -r line; do
    [[ -n "$line" ]] && log_info "  ${line}"
  done
fi
log_info "========================================="

# クリーンアップ
rm -rf "$LOG_DIR"
