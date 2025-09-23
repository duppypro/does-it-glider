#!/bin/bash

# Script to deploy production version without dev elements

set -euo pipefail  # Exit on error, unset vars as errors, pipeline failures

echo "Creating production index.html..."

# Generate prod version by removing dev-only sections
sed '/<!-- DEV-ONLY START -->/,/<!-- DEV-ONLY END -->/d' public/index.html > public/index-prod.html

echo "Backing up dev index.html..."
cp -p public/index.html public/index.dev.html

echo "Switching to prod index.html..."
cp -p public/index-prod.html public/index.html

# echo "Deploying to Firebase..."
# firebase deploy --only hosting

echo "Restoring dev index.html..."
mv public/index-dev.html public/index.html

echo "Cleaning up..."
rm -f public/index-prod.html

echo "Production deploy complete!"