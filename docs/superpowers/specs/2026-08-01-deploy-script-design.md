# Deploy Script Design

## Goal

Provide a root-level `./deploy.sh` command that publishes the current Git worktree to GitHub.

## Behavior

- Run as an executable Python 3 script without third-party dependencies.
- Resolve and operate from the repository containing the script, regardless of the caller's current directory.
- Require an `origin` remote and a checked-out branch.
- Stage all tracked, modified, deleted, and untracked files with `git add --all`.
- Create a commit with the fixed message `chore: update site` when staged changes exist.
- Skip commit creation when there are no staged changes.
- Push the current branch to `origin` and establish its upstream with `git push --set-upstream origin <branch>`.
- Stop immediately with a non-zero exit code when a Git command fails.
- Do not run `npm run check` or any other project validation command.

## Testing

Use Python's standard-library `unittest` in temporary local repositories. A local bare repository acts as `origin`, so tests exercise real Git behavior without network access. Cover publishing changes, publishing with no new changes, and invoking the script outside the project directory.
