#!/bin/bash
# =============================================================================
# AEGIS-SIGHT - Issue/PR 自動ラベル付与スクリプト
# 変更パスとブランチ名に基づいてラベルを自動的に付与する
# ClaudeOS Dev Factory から呼び出される
# =============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# 定数
# ---------------------------------------------------------------------------
REPO="Kensan196948G/AEGIS-SIGHT"

# パスベースのラベルマッピング
declare -A PATH_LABELS=(
  ["aegis-sight-api/"]="backend"
  ["aegis-sight-web/"]="frontend"
  ["aegis-sight-agent/"]="agent"
  ["aegis-sight-infra/"]="infra"
  ["scripts/"]="ci"
  [".github/"]="ci"
  ["docs/"]="documentation"
)

# ブランチプレフィックスベースのラベルマッピング
declare -A BRANCH_LABELS=(
  ["feat/"]="enhancement"
  ["feature/"]="enhancement"
  ["fix/"]="bug"
  ["bugfix/"]="bug"
  ["hotfix/"]="bug"
  ["docs/"]="documentation"
  ["doc/"]="documentation"
  ["refactor/"]="refactor"
  ["chore/"]="chore"
  ["ci/"]="ci"
  ["test/"]="enhancement"
  ["security/"]="security"
)

# ---------------------------------------------------------------------------
# ヘルパー関数
# ---------------------------------------------------------------------------
log_info()  { echo "[ClaudeOS][INFO]  $*"; }
log_warn()  { echo "[ClaudeOS][WARN]  $*" >&2; }
log_error() { echo "[ClaudeOS][ERROR] $*" >&2; }

usage() {
  cat <<USAGE
Usage: auto-label.sh <PR_NUMBER>

PR_NUMBER  GitHub Pull Request 番号

変更ファイルのパスとブランチ名からラベルを自動付与します。

パスベース:
  aegis-sight-api/  -> backend
  aegis-sight-web/  -> frontend
  aegis-sight-agent/ -> agent
  aegis-sight-infra/ -> infra
  scripts/, .github/ -> ci
  docs/             -> documentation

ブランチプレフィックス:
  feat/, feature/   -> enhancement
  fix/, bugfix/     -> bug
  docs/             -> documentation
  refactor/         -> refactor
USAGE
  exit 1
}

# ---------------------------------------------------------------------------
# 引数チェック
# ---------------------------------------------------------------------------
if [[ $# -lt 1 ]]; then
  usage
fi

PR_NUMBER="$1"

if [[ ! "$PR_NUMBER" =~ ^[0-9]+$ ]]; then
  log_error "PR_NUMBER must be a number: $PR_NUMBER"
  exit 1
fi

log_info "Analyzing PR #${PR_NUMBER} for auto-labeling..."

# ---------------------------------------------------------------------------
# Step 1: PR 情報を取得
# ---------------------------------------------------------------------------
PR_INFO=$(gh pr view "$PR_NUMBER" --repo "$REPO" --json headRefName,files,labels 2>&1) || {
  log_error "Failed to fetch PR #${PR_NUMBER}: $PR_INFO"
  exit 1
}

BRANCH_NAME=$(echo "$PR_INFO" | jq -r '.headRefName // empty')
EXISTING_LABELS=$(echo "$PR_INFO" | jq -r '.labels[].name' 2>/dev/null || true)

log_info "Branch: ${BRANCH_NAME}"
log_info "Existing labels: ${EXISTING_LABELS:-none}"

# ---------------------------------------------------------------------------
# Step 2: 変更ファイルからラベルを決定
# ---------------------------------------------------------------------------
CHANGED_FILES=$(echo "$PR_INFO" | jq -r '.files[].path' 2>/dev/null || true)
declare -A LABELS_TO_ADD=()

# パスベースのラベル判定
if [[ -n "$CHANGED_FILES" ]]; then
  while IFS= read -r filepath; do
    for path_prefix in "${!PATH_LABELS[@]}"; do
      if [[ "$filepath" == ${path_prefix}* ]]; then
        label="${PATH_LABELS[$path_prefix]}"
        LABELS_TO_ADD["$label"]=1
        log_info "  Path match: ${filepath} -> ${label}"
      fi
    done
  done <<< "$CHANGED_FILES"
fi

# ---------------------------------------------------------------------------
# Step 3: ブランチ名からラベルを決定
# ---------------------------------------------------------------------------
if [[ -n "$BRANCH_NAME" ]]; then
  for prefix in "${!BRANCH_LABELS[@]}"; do
    if [[ "$BRANCH_NAME" == ${prefix}* ]]; then
      label="${BRANCH_LABELS[$prefix]}"
      LABELS_TO_ADD["$label"]=1
      log_info "  Branch match: ${BRANCH_NAME} -> ${label}"
    fi
  done
fi

# ---------------------------------------------------------------------------
# Step 4: 既存ラベルを除外して新規ラベルのみ付与
# ---------------------------------------------------------------------------
NEW_LABELS=()
for label in "${!LABELS_TO_ADD[@]}"; do
  if ! echo "$EXISTING_LABELS" | grep -qx "$label"; then
    NEW_LABELS+=("$label")
  else
    log_info "  Skipping (already exists): ${label}"
  fi
done

if [[ ${#NEW_LABELS[@]} -eq 0 ]]; then
  log_info "No new labels to add."
  exit 0
fi

# ラベルをカンマ区切りで結合
LABEL_CSV=$(IFS=,; echo "${NEW_LABELS[*]}")

log_info "Adding labels: ${LABEL_CSV}"

# ---------------------------------------------------------------------------
# Step 5: ラベルを付与
# ---------------------------------------------------------------------------
gh pr edit "$PR_NUMBER" --repo "$REPO" --add-label "$LABEL_CSV" 2>&1 || {
  log_warn "gh pr edit failed. Trying gh api fallback..."
  for label in "${NEW_LABELS[@]}"; do
    gh api "repos/${REPO}/issues/${PR_NUMBER}/labels" \
      -f "labels[]=${label}" 2>/dev/null || \
      log_warn "Failed to add label: ${label}"
  done
}

log_info "Auto-labeling complete for PR #${PR_NUMBER}"
log_info "Labels added: ${LABEL_CSV}"
