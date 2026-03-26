#!/bin/bash
# =============================================================================
# AEGIS-SIGHT - GitHub Project V2 ステータス自動更新スクリプト
# ClaudeOS Orchestrator から呼び出される
# =============================================================================

set -euo pipefail

ISSUE_NUMBER="${1:?Usage: project-sync.sh <ISSUE_NUMBER> <STATUS>}"
STATUS="${2:?Usage: project-sync.sh <ISSUE_NUMBER> <STATUS>}"
REPO="Kensan196948G/AEGIS-SIGHT"

# ステータスマッピング
declare -A STATUS_MAP=(
  ["inbox"]="Inbox"
  ["backlog"]="Backlog"
  ["ready"]="Ready"
  ["design"]="Design"
  ["development"]="Development"
  ["verify"]="Verify"
  ["deploy-gate"]="Deploy Gate"
  ["done"]="Done"
  ["blocked"]="Blocked"
)

MAPPED_STATUS="${STATUS_MAP[${STATUS,,}]:-$STATUS}"

echo "[ClaudeOS] Updating Issue #${ISSUE_NUMBER} → Status: ${MAPPED_STATUS}"

# Project V2 のアイテムIDを取得
PROJECT_NUMBER=$(gh project list --owner Kensan196948G --format json -q '.projects[0].number' 2>/dev/null || echo "")

if [ -z "$PROJECT_NUMBER" ]; then
  echo "[WARN] No GitHub Project found. Skipping status update."
  exit 0
fi

# Issue をProject に追加（既に追加済みの場合はスキップ）
ITEM_ID=$(gh project item-add "$PROJECT_NUMBER" \
  --owner Kensan196948G \
  --url "https://github.com/${REPO}/issues/${ISSUE_NUMBER}" \
  --format json -q '.id' 2>/dev/null || echo "")

if [ -z "$ITEM_ID" ]; then
  echo "[WARN] Could not add issue to project. Skipping."
  exit 0
fi

# ステータスフィールドを更新
gh project item-edit \
  --project-id "$PROJECT_NUMBER" \
  --id "$ITEM_ID" \
  --field-id "Status" \
  --single-select-option-id "$MAPPED_STATUS" 2>/dev/null || \
  echo "[WARN] Could not update status field. Manual update may be needed."

echo "[ClaudeOS] Status update complete: Issue #${ISSUE_NUMBER} → ${MAPPED_STATUS}"
