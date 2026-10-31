# Repository workflow rules

- Work on a feature branch for changes in this workspace; the current contributor branch is `jameson`.
- Before pushing, pull the latest changes from the remote repository and resolve any conflicts locally.
- Commit the completed changes with a clear Conventional Commit-style message.
- Push only the feature branch (for example, `jameson`), never `main`.
- Open a pull request from the feature branch into `main`; do not push directly to `main`.
- Before handing off the PR, run the relevant checks and verify the PR status with GitHub CLI.
