## English

### 1. Overview

The team uses Lingma to configure OpenSpec, with skills docs stored under `.lingma/skills/`. Non-developers (PMs, QA, tech leads) need the latest skills docs, but manual `git pull`, credential setup, and conflict resolution are too high a barrier. This extension provides a sidebar panel to pull the latest docs with one click.

Design principles:

- **Read-only**: MVP only pulls; no complex write operations for non-developers.
- **Backup over conflicts**: local changes are backed up before a forced sync, so users always get a clean latest version without losing their work.
- **No command line**: one-click Git identity and credential setup.

### 2. Who It's For

| Role | Typical use |
|------|-------------|
| Product Manager | Pull latest spec docs for requirement review |
| QA | Check latest skills conventions and acceptance criteria |
| Tech Lead | Sync specs, review against implementation |
| Any non-Git collaborator | Get latest skills safely, zero barrier |

### 3. Typical Team Workflow

The extension fits the standard "main + feature branch + PR" model:

- **main is the single sync source.** Everyone uses **Pull** to sync the latest skills from `origin/main`. Pull is only allowed on main (the extension blocks pulls on non-main branches to avoid wiping branch work).
- **Edit skills via feature branch + PR.** To change skills, create a feature branch (e.g. `feat/update-review-spec`), edit there, push, and open a Pull Request on GitHub/GitLab.
- **Protect main.** Enable branch protection on main in your repo settings to forbid direct pushes — all changes go through PR review. This server-side guard is more reliable than the extension's check.
- **Pull from main after merge.** Once a PR is merged into main, collaborators switch back to main and click Pull to get the latest skills.


### 4. Implemented Features

- **One-click Pull**: sync latest skills from `origin/main` (`fetch` + `reset --hard origin/main`). The working tree stays clean after pulling.
- **Auto backup**: when local changes exist, only changed files are backed up before pulling, named `yyyy-MM-dd-id` (auto-incrementing per day), stored under `.lingma/.backup/`.
- **Sync status**: determined by diffing the working tree against `origin/main` — shows "up to date" or "update available", with status-aware icons.
- **Branch protection**: pulling on a non-main branch is blocked with a prompt, preventing `reset --hard` from destroying feature branch work.
- **Network awareness**: if the remote is unreachable during pull/refresh, it clearly flags "remote unreachable, status may be outdated" instead of failing silently.
- **Unsaved-file guard**: detects unsaved editor files before Pull, prompting to save first or save-and-continue.
- **Progress & debounce**: Pull/Refresh show progress; repeated clicks during an operation are ignored.
- **Auto refresh**: on startup, whenever the panel becomes visible, and after each Pull.
- **One-click Git identity & credential setup**: sets `user.name`, `user.email`, and enables credential storage; shows current identity if already configured.
- **Language switch**: toggle UI language via `opensync.language` (`zh-CN` / `en`).

### 5. Core Usage

**First-time setup**: open the panel from the activity bar → click "Configure Git Identity & Credential" → enter user name and email → enter credential once on first pull, saved thereafter.

**Daily pull** (on main): open the panel → click **Pull** → local changes are auto-backed-up first if any → status auto-refreshes when done.

**Check status**: click **Refresh**, or just switch back to the panel for an auto-refresh. Green check = up to date; download icon = update available; ⚠️ = remote unreachable.

**Edit skills**: switch to a feature branch, edit, push, open a PR on your platform, and after merge switch back to main and Pull.

**Switch language**: `Ctrl+,` → search `opensync` → set **Opensync: Language** to `en` or `zh-CN` → click Refresh once.

### 6. Future Features (TBD)

- Branch switch / create / push feature branch buttons (lightweight developer support)
- One-click jump to PR page after push
- Configurable sync path (currently fixed `.lingma/skills`)
- Instant-apply settings, auto backup cleanup
- Selectable credential strategy (plaintext / system credential manager)

### 7. Development

```bash
cd .\openspec-skills-sync\
npm install        # install dependencies
npm test           # run tests
npm run compile    # compile
```

### 8. Packaging & Internal Distribution

This extension is distributed internally as a `.vsix` file, without publishing to the public marketplace.

Packaging steps:

    npm install -g @vscode/vsce   # install the packaging tool (first time only)
    npm run compile               # compile the latest dist
    vsce package                  # generates openspec-skills-sync-<version>.vsix

Installation (for recipients):

In the VS Code Extensions panel, click the `...` menu in the top-right → **Install from VSIX...** → select the `.vsix` file.

Updating: bump the `version` field in `package.json`, then run `vsce package` again to produce a new package for distribution.

Debug: open this project (`openspec-skills-sync`) in VS Code → Run and Debug panel → select **Run Extension** → in the host window, open a Git repo containing `.lingma/skills/`. See `.vscode/launch.json`.