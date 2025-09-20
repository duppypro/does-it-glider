#!/bin/sh
set -e

REPO_ROOT=$(git rev-parse --show-toplevel)

echo "Backing up existing hook(s)"
cp -p "$REPO_ROOT/.git/hooks/post-commit" "$REPO_ROOT/.git/hooks/post-commit.backup"

# Install the hook preserving its executable status and dates
echo "Installing hook(s) to .git/hooks"
cp -p "$REPO_ROOT/hooks/post-commit" "$REPO_ROOT/.git/hooks"

# Verify the installed hook exists and is executable
if [ -x "$REPO_ROOT/.git/hooks/post-commit" ]; then
    echo "SUCCESS $REPO_ROOT/.git/hooks/post-commit"
else
    echo "Warning: post-commit hook was not installed as executable. Run 'chmod +x $REPO_ROOT/.git/hooks/post-commit' to fix." >&2
    exit 2
fi
