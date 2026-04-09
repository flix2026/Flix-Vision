#!/bin/bash

GITHUB_USERNAME="flix2026"
GITHUB_TOKEN="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"
REPO="Flix-Vision"

git config user.email "flix2026@users.noreply.github.com"
git config user.name "flix2026"
git remote set-url origin "https://${GITHUB_USERNAME}:${GITHUB_TOKEN}@github.com/${GITHUB_USERNAME}/${REPO}.git"

git add -A
git reset HEAD base.apk apk/ 2>/dev/null

git commit -m "Update $(date '+%Y-%m-%d %H:%M:%S')"
git push origin main --force
