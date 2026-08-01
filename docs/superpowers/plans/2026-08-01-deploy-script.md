# Deploy Script Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an executable `./deploy.sh` Python command that stages all changes, makes a fixed-message commit when needed, and pushes the current branch to GitHub.

**Architecture:** A dependency-free Python entry point delegates each operation to Git through `subprocess.run`. Integration tests create temporary working and bare repositories so the complete command can be verified without touching the real repository or network.

**Tech Stack:** Python 3 standard library, Git, `unittest`

## Global Constraints

- The command must be invoked as `./deploy.sh`.
- The commit message must be `chore: update site`.
- The command must not run `npm run check`.
- The command must stage all worktree changes and push the current branch to `origin`.

---

### Task 1: Deploy Command

**Files:**
- Create: `deploy.sh`
- Create: `tests/test_deploy.py`

**Interfaces:**
- Consumes: Git available on `PATH`, a checked-out branch, and an `origin` remote.
- Produces: executable CLI command `./deploy.sh` returning zero on success and non-zero on Git errors.

- [ ] **Step 1: Write failing integration tests**

Create temporary Git repositories, copy `deploy.sh` into the worktree, invoke it from outside that worktree, and assert that the remote branch receives a `chore: update site` commit containing all changes. Invoke it again and assert that the command succeeds without creating another commit.

- [ ] **Step 2: Verify the tests fail**

Run: `python3 tests/test_deploy.py`

Expected: FAIL because the `deploy.sh` executable does not exist yet.

- [ ] **Step 3: Implement the command**

Use `pathlib.Path(__file__).resolve().parent` as the command working directory. Run `git remote get-url origin`, read the current branch with `git branch --show-current`, stage with `git add --all`, use `git diff --cached --quiet` to decide whether to commit, then run `git push --set-upstream origin <branch>`.

- [ ] **Step 4: Make the command executable**

Run: `chmod +x deploy.sh`

- [ ] **Step 5: Verify tests and inspect help-free execution behavior**

Run: `python3 tests/test_deploy.py`

Expected: all tests PASS, no network access, and no changes to the real repository's Git history.
