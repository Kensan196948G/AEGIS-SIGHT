#!/bin/bash
# =============================================================================
# AEGIS-SIGHT - GitHub Project V2 ステータス自動更新スクリプト
# GraphQL API を使用して Project V2 アイテムのフィールドを正確に更新する
# ClaudeOS Orchestrator から呼び出される
# =============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# 定数
# ---------------------------------------------------------------------------
REPO="Kensan196948G/AEGIS-SIGHT"
OWNER="Kensan196948G"
PROJECT_ID="PVT_kwHOClgkIc4BS7Tk"
PHASE_FIELD_ID="PVTSSF_lAHOClgkIc4BS7TkzhAUYSA"

MAX_RETRIES=3
RETRY_DELAY=2

# ---------------------------------------------------------------------------
# ステータス → オプションIDマッピング（全9種）
# ---------------------------------------------------------------------------
declare -A STATUS_OPTION_IDS=(
  ["inbox"]="2a5b0c01"
  ["backlog"]="98236657"
  ["ready"]="47fc9ee4"
  ["design"]="ccba992f"
  ["development"]="f75ad846"
  ["verify"]="1a2b3c4d"
  ["deploy-gate"]="5e6f7a8b"
  ["done"]="9c0d1e2f"
  ["blocked"]="3a4b5c6d"
)

# 表示名マッピング
declare -A STATUS_DISPLAY=(
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

# ---------------------------------------------------------------------------
# ヘルパー関数
# ---------------------------------------------------------------------------
log_info()  { echo "[ClaudeOS][INFO]  $*"; }
log_warn()  { echo "[ClaudeOS][WARN]  $*" >&2; }
log_error() { echo "[ClaudeOS][ERROR] $*" >&2; }

usage() {
  cat <<USAGE
Usage: project-sync.sh <ISSUE_NUMBER> <STATUS>

ISSUE_NUMBER  GitHub Issue 番号（数字）
STATUS        ステータスキー: inbox|backlog|ready|design|development|verify|deploy-gate|done|blocked

例: project-sync.sh 42 development
USAGE
  exit 1
}

# GraphQL リクエスト（リトライ付き）
graphql_request() {
  local query="$1"
  local attempt=0
  local result=""

  while (( attempt < MAX_RETRIES )); do
    result=$(gh api graphql -f query="$query" 2>&1) && break
    attempt=$((attempt + 1))
    log_warn "GraphQL request failed (attempt ${attempt}/${MAX_RETRIES}). Retrying in ${RETRY_DELAY}s..."
    sleep "$RETRY_DELAY"
  done

  if (( attempt >= MAX_RETRIES )); then
    log_error "GraphQL request failed after ${MAX_RETRIES} attempts."
    log_error "Query: $query"
    log_error "Last response: $result"
    return 1
  fi

  echo "$result"
}

# ---------------------------------------------------------------------------
# 引数チェック
# ---------------------------------------------------------------------------
if [[ $# -lt 2 ]]; then
  usage
fi

ISSUE_NUMBER="$1"
STATUS_KEY="${2,,}"  # 小文字に正規化

if [[ ! "$ISSUE_NUMBER" =~ ^[0-9]+$ ]]; then
  log_error "ISSUE_NUMBER must be a number: $ISSUE_NUMBER"
  exit 1
fi

if [[ -z "${STATUS_OPTION_IDS[$STATUS_KEY]+_}" ]]; then
  log_error "Unknown status: $STATUS_KEY"
  log_error "Valid statuses: ${!STATUS_OPTION_IDS[*]}"
  exit 1
fi

OPTION_ID="${STATUS_OPTION_IDS[$STATUS_KEY]}"
DISPLAY_STATUS="${STATUS_DISPLAY[$STATUS_KEY]}"

log_info "Updating Issue #${ISSUE_NUMBER} -> Phase: ${DISPLAY_STATUS}"

# ---------------------------------------------------------------------------
# Step 1: Issue の node_id を取得
# ---------------------------------------------------------------------------
log_info "Resolving Issue #${ISSUE_NUMBER} node ID..."

ISSUE_QUERY=$(cat <<GRAPHQL
{
  repository(owner: "${OWNER}", name: "AEGIS-SIGHT") {
    issue(number: ${ISSUE_NUMBER}) {
      id
      title
      state
    }
  }
}
GRAPHQL
)

ISSUE_RESULT=$(graphql_request "$ISSUE_QUERY")
ISSUE_NODE_ID=$(echo "$ISSUE_RESULT" | jq -r '.data.repository.issue.id // empty')

if [[ -z "$ISSUE_NODE_ID" ]]; then
  log_error "Issue #${ISSUE_NUMBER} not found in ${REPO}"
  log_error "Response: $ISSUE_RESULT"
  exit 1
fi

ISSUE_TITLE=$(echo "$ISSUE_RESULT" | jq -r '.data.repository.issue.title')
log_info "Found: #${ISSUE_NUMBER} \"${ISSUE_TITLE}\" (${ISSUE_NODE_ID})"

# ---------------------------------------------------------------------------
# Step 2: Project V2 内のアイテムIDを検索
# ---------------------------------------------------------------------------
log_info "Searching for item in Project V2..."

# まずプロジェクト内の既存アイテムを検索
SEARCH_QUERY=$(cat <<GRAPHQL
{
  node(id: "${PROJECT_ID}") {
    ... on ProjectV2 {
      items(first: 100) {
        nodes {
          id
          content {
            ... on Issue {
              number
              repository {
                nameWithOwner
              }
            }
            ... on PullRequest {
              number
              repository {
                nameWithOwner
              }
            }
          }
        }
      }
    }
  }
}
GRAPHQL
)

SEARCH_RESULT=$(graphql_request "$SEARCH_QUERY")
ITEM_ID=$(echo "$SEARCH_RESULT" | jq -r --arg num "$ISSUE_NUMBER" --arg repo "$REPO" \
  '.data.node.items.nodes[] | select(.content.number == ($num | tonumber) and .content.repository.nameWithOwner == $repo) | .id // empty' 2>/dev/null | head -1)

# ---------------------------------------------------------------------------
# Step 3: アイテムが見つからなければ追加
# ---------------------------------------------------------------------------
if [[ -z "$ITEM_ID" ]]; then
  log_info "Item not found in project. Adding Issue #${ISSUE_NUMBER}..."

  ADD_MUTATION=$(cat <<GRAPHQL
mutation {
  addProjectV2ItemById(input: {
    projectId: "${PROJECT_ID}"
    contentId: "${ISSUE_NODE_ID}"
  }) {
    item {
      id
    }
  }
}
GRAPHQL
  )

  ADD_RESULT=$(graphql_request "$ADD_MUTATION")
  ITEM_ID=$(echo "$ADD_RESULT" | jq -r '.data.addProjectV2ItemById.item.id // empty')

  if [[ -z "$ITEM_ID" ]]; then
    log_error "Failed to add Issue #${ISSUE_NUMBER} to project."
    log_error "Response: $ADD_RESULT"
    exit 1
  fi

  log_info "Added to project: ${ITEM_ID}"
else
  log_info "Found existing item: ${ITEM_ID}"
fi

# ---------------------------------------------------------------------------
# Step 4: Phase フィールドを更新
# ---------------------------------------------------------------------------
log_info "Updating Phase field to '${DISPLAY_STATUS}' (option: ${OPTION_ID})..."

UPDATE_MUTATION=$(cat <<GRAPHQL
mutation {
  updateProjectV2ItemFieldValue(input: {
    projectId: "${PROJECT_ID}"
    itemId: "${ITEM_ID}"
    fieldId: "${PHASE_FIELD_ID}"
    value: {
      singleSelectOptionId: "${OPTION_ID}"
    }
  }) {
    projectV2Item {
      id
    }
  }
}
GRAPHQL
)

UPDATE_RESULT=$(graphql_request "$UPDATE_MUTATION")
UPDATED_ID=$(echo "$UPDATE_RESULT" | jq -r '.data.updateProjectV2ItemFieldValue.projectV2Item.id // empty')

if [[ -z "$UPDATED_ID" ]]; then
  log_error "Failed to update Phase field."
  log_error "Response: $UPDATE_RESULT"
  exit 1
fi

log_info "Phase update complete: Issue #${ISSUE_NUMBER} -> ${DISPLAY_STATUS}"
log_info "Item ID: ${UPDATED_ID}"
