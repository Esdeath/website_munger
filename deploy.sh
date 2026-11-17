#!/usr/bin/env bash
# 内容更新发布路径：提交并推送源码，然后构建、上传 OSS、刷新 CDN。
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

git add -A
if ! git diff --cached --quiet; then
  git commit -m "chore: update content"
else
  echo "No changes to commit; pushing existing commits."
fi
git push
npm run deploy:oss
