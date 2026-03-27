#!/bin/bash
# =============================================================================
# AEGIS-SIGHT - 開発セッションレポート生成スクリプト
# Git履歴・Issue/PR・CI結果からマークダウンレポートを出力する
# ClaudeOS Reporter から呼び出される
# =============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# 定数
# ---------------------------------------------------------------------------
REPO="Kensan196948G/AEGIS-SIGHT"
PROJECT_ROOT="/mnt/LinuxHDD/AEGIS-SIGHT"
SINCE="${1:-24 hours ago}"
OUTPUT="${2:-}"

# ---------------------------------------------------------------------------
# ヘルパー関数
# ---------------------------------------------------------------------------
log_info() { echo "[ClaudeOS][REPORT] $*" >&2; }

usage() {
  cat <<USAGE
Usage: dev-report.sh [SINCE] [OUTPUT_FILE]

SINCE        期間指定 (default: "24 hours ago")
             例: "2 days ago", "2024-01-01", "1 week ago"
OUTPUT_FILE  出力ファイルパス (default: stdout)

例:
  dev-report.sh                          # 過去24時間のレポート
  dev-report.sh "3 days ago"             # 過去3日間
  dev-report.sh "1 week ago" report.md   # 過去1週間, ファイルに保存
USAGE
  exit 1
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
fi

# ---------------------------------------------------------------------------
# データ収集
# ---------------------------------------------------------------------------
cd "$PROJECT_ROOT"
log_info "Generating report since: ${SINCE}"

# Git 統計
COMMIT_COUNT=$(git log --since="$SINCE" --oneline 2>/dev/null | wc -l || echo 0)
COMMIT_LOG=$(git log --since="$SINCE" --oneline --no-merges 2>/dev/null || echo "No commits")
AUTHORS=$(git log --since="$SINCE" --format='%aN' 2>/dev/null | sort -u || echo "N/A")
FILES_CHANGED=$(git log --since="$SINCE" --diff-filter=ACDMR --name-only --pretty=format: 2>/dev/null | sort -u | grep -v '^$' || echo "")
FILES_COUNT=$(echo "$FILES_CHANGED" | grep -c . 2>/dev/null || echo 0)

# 挿入・削除行数
DIFF_STAT=$(git log --since="$SINCE" --shortstat 2>/dev/null || echo "")
INSERTIONS=$(echo "$DIFF_STAT" | grep -oP '\d+ insertion' | awk '{sum+=$1} END {print sum+0}')
DELETIONS=$(echo "$DIFF_STAT" | grep -oP '\d+ deletion' | awk '{sum+=$1} END {print sum+0}')

# コンポーネント別変更
API_CHANGES=$(echo "$FILES_CHANGED" | grep -c "^aegis-sight-api/" 2>/dev/null || echo 0)
WEB_CHANGES=$(echo "$FILES_CHANGED" | grep -c "^aegis-sight-web/" 2>/dev/null || echo 0)
AGENT_CHANGES=$(echo "$FILES_CHANGED" | grep -c "^aegis-sight-agent/" 2>/dev/null || echo 0)
INFRA_CHANGES=$(echo "$FILES_CHANGED" | grep -c "^aegis-sight-infra/" 2>/dev/null || echo 0)
SCRIPTS_CHANGES=$(echo "$FILES_CHANGED" | grep -c "^scripts/" 2>/dev/null || echo 0)

# Issue/PR 統計 (gh CLI)
OPEN_ISSUES=$(gh issue list --repo "$REPO" --state open --limit 500 --json number -q 'length' 2>/dev/null || echo "N/A")
CLOSED_ISSUES_PERIOD=$(gh issue list --repo "$REPO" --state closed --limit 500 --json closedAt -q "[.[] | select(.closedAt >= \"$(date -d "$SINCE" -Iseconds 2>/dev/null || date -v-1d -Iseconds 2>/dev/null || echo '2024-01-01')\")] | length" 2>/dev/null || echo "N/A")
OPEN_PRS=$(gh pr list --repo "$REPO" --state open --limit 100 --json number -q 'length' 2>/dev/null || echo "N/A")
MERGED_PRS_PERIOD=$(gh pr list --repo "$REPO" --state merged --limit 100 --json mergedAt -q "[.[] | select(.mergedAt >= \"$(date -d "$SINCE" -Iseconds 2>/dev/null || date -v-1d -Iseconds 2>/dev/null || echo '2024-01-01')\")] | length" 2>/dev/null || echo "N/A")

# CI 結果
RECENT_RUNS=$(gh run list --repo "$REPO" --limit 10 --json databaseId,name,conclusion,status,createdAt 2>/dev/null || echo "[]")
CI_SUCCESS=$(echo "$RECENT_RUNS" | jq '[.[] | select(.conclusion == "success")] | length' 2>/dev/null || echo 0)
CI_FAILURE=$(echo "$RECENT_RUNS" | jq '[.[] | select(.conclusion == "failure")] | length' 2>/dev/null || echo 0)
CI_PENDING=$(echo "$RECENT_RUNS" | jq '[.[] | select(.status == "in_progress" or .status == "queued")] | length' 2>/dev/null || echo 0)

# 現在のブランチ
CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "N/A")

# ---------------------------------------------------------------------------
# レポート生成
# ---------------------------------------------------------------------------
REPORT_DATE=$(date '+%Y-%m-%d %H:%M:%S')

REPORT=$(cat <<MARKDOWN
# AEGIS-SIGHT Development Report

**Generated**: ${REPORT_DATE}
**Period**: since ${SINCE}
**Branch**: ${CURRENT_BRANCH}

---

## Git Statistics

| Metric | Value |
|--------|-------|
| Commits | ${COMMIT_COUNT} |
| Files changed | ${FILES_COUNT} |
| Lines inserted | +${INSERTIONS} |
| Lines deleted | -${DELETIONS} |
| Authors | $(echo "$AUTHORS" | tr '\n' ', ' | sed 's/,$//' || echo "N/A") |

### Component Breakdown

| Component | Files Changed |
|-----------|--------------|
| Backend (aegis-sight-api) | ${API_CHANGES} |
| Frontend (aegis-sight-web) | ${WEB_CHANGES} |
| Agent (aegis-sight-agent) | ${AGENT_CHANGES} |
| Infrastructure (aegis-sight-infra) | ${INFRA_CHANGES} |
| Scripts | ${SCRIPTS_CHANGES} |

### Recent Commits

\`\`\`
${COMMIT_LOG}
\`\`\`

---

## Issues & Pull Requests

| Metric | Count |
|--------|-------|
| Open Issues | ${OPEN_ISSUES} |
| Issues closed (period) | ${CLOSED_ISSUES_PERIOD} |
| Open PRs | ${OPEN_PRS} |
| PRs merged (period) | ${MERGED_PRS_PERIOD} |

---

## CI/CD Status (Last 10 Runs)

| Status | Count |
|--------|-------|
| Success | ${CI_SUCCESS} |
| Failure | ${CI_FAILURE} |
| In Progress | ${CI_PENDING} |

### Recent Runs

$(echo "$RECENT_RUNS" | jq -r '.[] | "| \(.name) | \(.conclusion // .status) | \(.createdAt) |"' 2>/dev/null | head -10 | { echo "| Workflow | Result | Time |"; echo "|----------|--------|------|"; cat; } || echo "No CI data available")

---

## Summary

- **Commits**: ${COMMIT_COUNT} commits, ${FILES_COUNT} files changed (+${INSERTIONS}/-${DELETIONS})
- **Issues**: ${OPEN_ISSUES} open, ${CLOSED_ISSUES_PERIOD} closed this period
- **PRs**: ${OPEN_PRS} open, ${MERGED_PRS_PERIOD} merged this period
- **CI**: ${CI_SUCCESS} passed, ${CI_FAILURE} failed, ${CI_PENDING} pending

---

*Generated by ClaudeOS Dev Reporter*
MARKDOWN
)

# ---------------------------------------------------------------------------
# 出力
# ---------------------------------------------------------------------------
if [[ -n "$OUTPUT" ]]; then
  echo "$REPORT" > "$OUTPUT"
  log_info "Report saved to: ${OUTPUT}"
else
  echo "$REPORT"
fi

log_info "Report generation complete."
