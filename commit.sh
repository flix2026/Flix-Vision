#!/bin/bash

GITHUB_USERNAME="flix2026"
GITHUB_TOKEN="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"
REPO="Flix-Vision"

git config --global user.email "flix2026@users.noreply.github.com"
git config --global user.name "flix2026"

REMOTE="https://${GITHUB_USERNAME}:${GITHUB_TOKEN}@github.com/${GITHUB_USERNAME}/${REPO}.git"

if [ ! -d ".git" ]; then
    git init
    git remote add origin "$REMOTE"
else
    git remote set-url origin "$REMOTE"
fi

git add -A
git commit -m "Update $(date '+%Y-%m-%d %H:%M:%S')"
git branch -M main
git push -u origin main --force
