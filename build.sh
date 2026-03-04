#!/bin/bash
# Build a zip file for Chrome Web Store / Firefox AMO submission.
# Usage: bash build.sh

set -e

OUT="ntuitive.zip"
EXCLUDE="README.md|STORE_LISTING.md|build.sh|.gitignore|icon.png"

rm -f "$OUT"

FILES=$(git ls-files | grep -Ev "^($EXCLUDE)$" | tr '\n' ',')
FILES=${FILES%,}

powershell -Command "Compress-Archive -Path $FILES -DestinationPath $OUT -Force"
echo "Built $OUT"
