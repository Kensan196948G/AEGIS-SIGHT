#!/usr/bin/env bash
# =============================================================================
# AEGIS-SIGHT Release Script
#
# Usage:
#   ./scripts/release.sh <version>
#   ./scripts/release.sh 0.24.0
#   ./scripts/release.sh 0.24.0 --dry-run
#
# Requirements:
#   - gh CLI (authenticated)
#   - git
#   - docker (optional, for image tagging)
# =============================================================================

set -euo pipefail

# ---------- Color helpers ----------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

info()  { echo -e "${BLUE}[INFO]${NC}  $*"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*" >&2; }

# ---------- Parse arguments ----------
VERSION="${1:-}"
DRY_RUN=false

if [[ "${2:-}" == "--dry-run" ]]; then
    DRY_RUN=true
    warn "Dry-run mode enabled. No changes will be made."
fi

if [[ -z "$VERSION" ]]; then
    error "Usage: $0 <version> [--dry-run]"
    error "Example: $0 0.24.0"
    exit 1
fi

# Validate semver format
if ! [[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.]+)?$ ]]; then
    error "Invalid version format: $VERSION"
    error "Expected semver format: MAJOR.MINOR.PATCH[-prerelease]"
    exit 1
fi

TAG="v${VERSION}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

info "Preparing release $TAG for AEGIS-SIGHT"

# ---------- Pre-flight checks ----------
info "Running pre-flight checks..."

# Check we are on main branch
CURRENT_BRANCH=$(git branch --show-current)
if [[ "$CURRENT_BRANCH" != "main" ]]; then
    warn "Not on main branch (current: $CURRENT_BRANCH)."
    read -r -p "Continue anyway? [y/N] " response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        error "Aborted."
        exit 1
    fi
fi

# Check for uncommitted changes
if ! git diff --quiet || ! git diff --cached --quiet; then
    error "There are uncommitted changes. Please commit or stash first."
    exit 1
fi

# Check if tag already exists
if git rev-parse "$TAG" >/dev/null 2>&1; then
    error "Tag $TAG already exists."
    exit 1
fi

# Check gh CLI is available
if ! command -v gh &>/dev/null; then
    error "gh CLI is not installed. Please install: https://cli.github.com/"
    exit 1
fi

# Check gh authentication
if ! gh auth status &>/dev/null; then
    error "gh CLI is not authenticated. Run: gh auth login"
    exit 1
fi

ok "Pre-flight checks passed."

# ---------- Verify CHANGELOG ----------
info "Checking CHANGELOG.md..."

if [[ ! -f "CHANGELOG.md" ]]; then
    error "CHANGELOG.md not found. Please create it before releasing."
    exit 1
fi

if ! grep -q "\[${VERSION}\]" CHANGELOG.md; then
    error "Version $VERSION not found in CHANGELOG.md."
    error "Please add a section for [$VERSION] before releasing."
    exit 1
fi

ok "CHANGELOG.md contains entry for $VERSION."

# ---------- Update version.py ----------
VERSION_FILE="aegis-sight-api/app/version.py"
if [[ -f "$VERSION_FILE" ]]; then
    info "Updating $VERSION_FILE..."
    if [[ "$DRY_RUN" == false ]]; then
        sed -i "s/__version__ = \".*\"/__version__ = \"${VERSION}\"/" "$VERSION_FILE"
        ok "Updated $VERSION_FILE"
    else
        info "[DRY-RUN] Would update $VERSION_FILE"
    fi
fi

# ---------- Extract release notes from CHANGELOG ----------
info "Extracting release notes from CHANGELOG.md..."

RELEASE_NOTES=$(awk -v ver="$VERSION" '
    /^## \[/ {
        if (found) exit
        if ($0 ~ "\\[" ver "\\]") found=1
        next
    }
    found && /^---$/ { next }
    found { print }
' CHANGELOG.md)

if [[ -z "$RELEASE_NOTES" ]]; then
    warn "Could not extract release notes from CHANGELOG.md."
    RELEASE_NOTES="Release $TAG"
fi

info "Release notes preview:"
echo "---"
echo "$RELEASE_NOTES"
echo "---"

# ---------- Create git tag ----------
info "Creating git tag $TAG..."

if [[ "$DRY_RUN" == false ]]; then
    git tag -a "$TAG" -m "Release $TAG"
    ok "Created tag $TAG"

    info "Pushing tag to origin..."
    git push origin "$TAG"
    ok "Pushed tag $TAG"
else
    info "[DRY-RUN] Would create and push tag $TAG"
fi

# ---------- Create GitHub Release ----------
info "Creating GitHub Release..."

if [[ "$DRY_RUN" == false ]]; then
    gh release create "$TAG" \
        --title "Release $TAG" \
        --notes "$RELEASE_NOTES" \
        --latest
    ok "GitHub Release created: $TAG"
else
    info "[DRY-RUN] Would create GitHub Release $TAG"
fi

# ---------- Docker image tagging ----------
info "Tagging Docker images..."

IMAGES=("aegis-sight-api" "aegis-sight-web")

for IMAGE in "${IMAGES[@]}"; do
    if docker image inspect "${IMAGE}:latest" &>/dev/null; then
        if [[ "$DRY_RUN" == false ]]; then
            docker tag "${IMAGE}:latest" "${IMAGE}:${TAG}"
            docker tag "${IMAGE}:latest" "${IMAGE}:${VERSION}"
            ok "Tagged ${IMAGE}:${TAG} and ${IMAGE}:${VERSION}"
        else
            info "[DRY-RUN] Would tag ${IMAGE}:${TAG}"
        fi
    else
        warn "Docker image ${IMAGE}:latest not found. Skipping."
    fi
done

# ---------- Summary ----------
echo ""
echo "============================================="
echo -e "${GREEN}  Release $TAG completed successfully!${NC}"
echo "============================================="
echo ""
echo "  Tag:      $TAG"
echo "  Branch:   $CURRENT_BRANCH"
echo "  Commit:   $(git rev-parse --short HEAD)"
echo ""
echo "  GitHub:   https://github.com/Kensan196948G/AEGIS-SIGHT/releases/tag/$TAG"
echo ""

if [[ "$DRY_RUN" == true ]]; then
    warn "This was a dry run. No changes were made."
fi
