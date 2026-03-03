#!/usr/bin/env bash
# Usage:
#   ./scripts/pack.sh
#   ./scripts/pack.sh patch
#   ./scripts/pack.sh minor /tmp/releases
set -euo pipefail

BUMP_TYPE="${1:-none}"
OUTPUT_DIR="${2:-$(pwd)}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo ""
echo "=== @umi/components pack script ==="

# ----- 1. Bump version -----
if [ "$BUMP_TYPE" != "none" ]; then
  echo "[1/4] Bump version ($BUMP_TYPE)..."
  npm version "$BUMP_TYPE" --no-git-tag-version
else
  echo "[1/4] Version bump skipped."
fi

# ----- 2. Clean dist -----
echo "[2/4] Cleaning dist/..."
rm -rf dist

# ----- 3. Build -----
echo "[3/4] Building..."
npm run build

# ----- 4. Pack -----
echo "[4/4] Packing..."
TGZ=$(npm pack --pack-destination "$OUTPUT_DIR" 2>&1 | tail -n1)
TGZ_PATH="$OUTPUT_DIR/$TGZ"
SIZE_KB=$(du -k "$TGZ_PATH" | cut -f1)

echo ""
echo " OK  $TGZ (${SIZE_KB} KB)"
echo "     Path: $TGZ_PATH"
echo ""

VERSION=$(node -p "require('./package.json').version")
echo "Install via:"
echo "  npm install $TGZ_PATH"
echo "  # или после публикации:"
echo "  npm install @umi/components@$VERSION"
