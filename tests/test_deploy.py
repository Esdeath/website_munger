from __future__ import annotations

import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEPLOY_SCRIPT = PROJECT_ROOT / "deploy.sh"


def run(*command: str, cwd: Path) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        command,
        cwd=cwd,
        check=True,
        text=True,
        capture_output=True,
    )


class DeployScriptTest(unittest.TestCase):
    def test_commits_all_changes_and_pushes_without_running_project_checks(self) -> None:
        self.assertTrue(DEPLOY_SCRIPT.is_file(), "deploy script should exist")

        with tempfile.TemporaryDirectory() as directory:
            temp = Path(directory)
            remote = temp / "origin.git"
            worktree = temp / "site"
            outside = temp / "outside"
            outside.mkdir()

            run("git", "init", "--bare", str(remote), cwd=temp)
            run("git", "init", "--initial-branch=main", str(worktree), cwd=temp)
            run("git", "config", "user.name", "Deploy Test", cwd=worktree)
            run("git", "config", "user.email", "deploy@example.com", cwd=worktree)
            run("git", "remote", "add", "origin", str(remote), cwd=worktree)

            (worktree / "package.json").write_text(
                '{"scripts":{"check":"exit 99"}}\n', encoding="utf-8"
            )
            (worktree / "old.txt").write_text("remove me\n", encoding="utf-8")
            run("git", "add", "--all", cwd=worktree)
            run("git", "commit", "-m", "initial", cwd=worktree)
            run("git", "push", "--set-upstream", "origin", "main", cwd=worktree)

            shutil.copy2(DEPLOY_SCRIPT, worktree / "deploy.sh")
            (worktree / "new.txt").write_text("published\n", encoding="utf-8")
            (worktree / "old.txt").unlink()

            first = run(str(worktree / "deploy.sh"), cwd=outside)

            self.assertIn("chore: update site", first.stdout)
            self.assertEqual(
                run(
                    "git",
                    "--git-dir",
                    str(remote),
                    "log",
                    "-1",
                    "--format=%s",
                    "main",
                    cwd=temp,
                ).stdout.strip(),
                "chore: update site",
            )
            remote_files = run(
                "git", "--git-dir", str(remote), "ls-tree", "-r", "--name-only", "main", cwd=temp
            ).stdout.splitlines()
            self.assertIn("deploy.sh", remote_files)
            self.assertIn("new.txt", remote_files)
            self.assertNotIn("old.txt", remote_files)

            revision = run(
                "git", "--git-dir", str(remote), "rev-parse", "main", cwd=temp
            ).stdout.strip()
            second = run(str(worktree / "deploy.sh"), cwd=outside)

            self.assertIn("没有需要提交的改动", second.stdout)
            self.assertEqual(
                run("git", "--git-dir", str(remote), "rev-parse", "main", cwd=temp).stdout.strip(),
                revision,
            )


if __name__ == "__main__":
    unittest.main()
