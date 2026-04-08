#!/bin/bash
# Usage: bash commit.sh "Your commit message"

GITHUB_USERNAME="flix2026"
GITHUB_TOKEN="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"
REPO="Flix-Vision"
COMMIT_MSG="${1:-Update}"

REMOTE="https://${GITHUB_USERNAME}:${GITHUB_TOKEN}@github.com/${GITHUB_USERNAME}/${REPO}.git"

if [ ! -d ".git" ]; then
    git init
    git remote add origin "$REMOTE"
else
    git remote set-url origin "$REMOTE"
fi

git add -A
git commit -m "$COMMIT_MSG"
git push -u origin main
