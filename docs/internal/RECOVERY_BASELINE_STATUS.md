# Recovery Baseline Status

Date: 2026-06-02

## Branch creation

Requested branch: `recovery-baseline`  
Source branch used: `origin/phase-2b-opportunities-context` (most complete branch from prior comparison)

Result:
- Created successfully.
- Due to an existing local modification on `main` (`package-lock.json`), direct checkout was blocked.
- To avoid stashing/resetting or overwriting anything, the branch was created in a separate worktree:
  - Worktree path: `C:\CODE\ESTATEMIND\recovery-baseline`
  - HEAD: `1115878 Replace Spark useKV with shared opportunities context`

## Verification results

All commands below were run from `C:\CODE\ESTATEMIND\recovery-baseline`.

### 1) npm install

Command:
- `npm install`

Status: PASS

Output summary:
- Installed dependencies successfully.
- Warning: deprecated `lodash@4.18.0`.
- Audit summary: 6 vulnerabilities (4 moderate, 2 high).

### 2) npm run dev

Command:
- `npm run dev`

Status: FAIL

Exact error:
- `npm error Missing script: "dev"`
- `npm error To see a list of scripts, run: npm run`

Notes:
- In this branch, root scripts are workspace-style (`dev:web`, `build:web`) rather than `dev`/`build`.

### 3) npm run build

Command:
- `npm run build`

Status: FAIL

Exact error:
- `npm error Missing script: "build"`
- `npm error To see a list of scripts, run: npm run`

## Additional practical validation (monorepo scripts)

These were run to confirm the web app itself is operational in this branch layout:

### npm run dev:web

Status: PASS

Observed:
- Vite dev server started successfully.
- Local URL: `http://localhost:5000/`

### npm run build:web

Status: PASS (with warnings)

Observed warnings:
- Multiple icon-proxy warnings: `Fallback icon not found. Not proxying any icons`.
- CSS optimizer warnings about media query token parsing.
- Large chunk size warning (`>500 kB` after minification).

Build result:
- Completed successfully (`built in 10.76s`).

## Conclusion

- `recovery-baseline` branch was created successfully from the most complete source branch.
- Requested root-level checks:
  - `npm install`: works
  - `npm run dev`: fails (missing script)
  - `npm run build`: fails (missing script)
- Branch is functionally buildable/runnable via workspace scripts (`dev:web`, `build:web`).
