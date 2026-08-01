#!/usr/bin/env python3
from __future__ import annotations

import subprocess
import sys
from pathlib import Path


REPOSITORY = Path(__file__).resolve().parent
COMMIT_MESSAGE = "chore: update site"


def git(*arguments: str, **options: object) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["git", *arguments],
        cwd=REPOSITORY,
        check=options.pop("check", True),
        text=True,
        **options,
    )


def main() -> int:
    try:
        git("remote", "get-url", "origin", stdout=subprocess.DEVNULL)
        branch = git(
            "branch", "--show-current", capture_output=True
        ).stdout.strip()
        if not branch:
            print("发布失败：当前仓库不在任何分支上。", file=sys.stderr)
            return 1

        print("正在暂存全部改动...")
        git("add", "--all")

        staged_changes = git("diff", "--cached", "--quiet", check=False)
        if staged_changes.returncode == 1:
            print(f"正在提交：{COMMIT_MESSAGE}")
            git("commit", "-m", COMMIT_MESSAGE)
        elif staged_changes.returncode == 0:
            print("没有需要提交的改动，跳过 commit。")
        else:
            return staged_changes.returncode

        print(f"正在推送 {branch} 到 origin...")
        git("push", "--set-upstream", "origin", branch)
        print("发布完成。")
        return 0
    except FileNotFoundError:
        print("发布失败：找不到 git 命令。", file=sys.stderr)
        return 1
    except subprocess.CalledProcessError as error:
        print(f"发布失败：git 命令退出，状态码 {error.returncode}。", file=sys.stderr)
        return error.returncode or 1


if __name__ == "__main__":
    raise SystemExit(main())
