#!/bin/bash

# Script to deploy production version without dev elements

set -euo pipefail  # Exit on error, unset vars as errors, pipeline failures

echo "Creating production index.html from index-dev.html ..."

# Generate prod version by removing dev-only sections
chmod +w public/index.html  # Temporarily make writable for update
sed '/<!-- DEV-ONLY START -->/,/<!-- DEV-ONLY END -->/d' public/index-dev.html > public/index.html
chmod a-w public/index.html  # Revert to read-only

echo "Ready for > firebase deploy , continue to make all edits to index-dev.html"