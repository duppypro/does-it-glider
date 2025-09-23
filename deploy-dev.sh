#!/bin/bash

# Deploy development version with <!-- DEV-ONLY START/END --> elements

set -euo pipefail  # Exit on error, unset vars as errors, pipeline failures

echo "Switching to development index.html..."
chmod +w public/index.html  # Temporarily make writable for cp
cp public/index-dev.html public/index.html
chmod a-w public/index.html  # Revert to read-only

# also run the post-commit hook to update version and branch name files
echo "Updating version and branch name files..."
./hooks/install.sh && ./hooks/post-commit

echo "Dev deploy complete! Make all edits to index-dev.html"