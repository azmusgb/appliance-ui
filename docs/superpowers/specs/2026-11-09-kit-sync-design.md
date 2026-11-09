# Kit sync: making appliance-ui drift visible, cheap to fix and safe to skip

Date: 2026-11-09. Status: draft for the owner's approval.

## Why

appliance-ui is the one source of the home appliance's look. It is copied into each app by `scripts/sync.mjs`, which
writes a `VERSION` file of SHA-256 checksums and refuses to replace a newer copy. That model is right for this house:
the consumers are a Node app, a Flask app and ESP32 firmware (`tokens.h`, `words.h`), the repos deploy to different
machines, and local-first means no registry.

What fails is the human step. Nothing says a copy is stale, so copies fall behind. On 9 Nov the kit's main is 2.15.0 and
the consumers are:

| Consumer | Folder | Kit copy |
|---|---|---|
| pi-hub | `hub/static/ui` | 2.9.0 |
| LocalAI | `app/public/ui` | 2.7.0 |
| bambuhelper-smart-display | `assets/ui` | 2.11.0 |

The owner's complaint is the coordination that follows: "I keep having to coordinate across repos", mostly merge and
deploy ordering. Merging the repos was considered and rejected: the deploy targets stay separate, so a merge would not
remove the ordering problem, and pi-hub and LocalAI deploy by different routes (`git push pi main` and
`npm run ship -- <PR>`).

## Goals

1. **Drift is visible without asking.** One command lists every consumer's kit version against the kit's main. The same
   check runs where the owner already looks: the deploy preflight and each consumer's CI.
2. **Catching up is cheap.** A sync opens a small PR in a consumer, with the kit's changes since that copy in the
   description. The owner still merges it ("merge" is the owner's word; opening the PR is not approval).
3. **Skipping versions is safe.** Each kit release says whether a consumer can jump over it, so a copy two or three
   versions behind catches up in one sync, and the owner knows which releases need a consumer-side change first.
4. **A "what's live" view.** For each repo: the commit merged to main, the commit live on its target, and what still has
   to ship. It answers the merge-and-deploy-ordering question in one read-only place.

## Non-goals

- Merging pi-hub, LocalAI, print-lab or the smart display into one repository.
- Replacing the copy model with a package registry, git submodules or build-time fetching.
- New kit components, tokens or visual changes. No feature work on the kit until the sync is reliable.
- Rebuilding the smart display's firmware patch stack (`apply_*.py`). It is a separate project with its own design.
- Deploying anything. The view reads state; it never ships.

## Anti-goals (a failure even if it technically works)

- A check that nags so often the owner ignores it. A copy that is behind by a release with no consumer-facing change
  should read as "behind, safe to skip", not as a warning.
- Automation that merges, deploys or overwrites a newer copy. The deploy preflight and the "merge" rule still hold.
- A second source of truth for versions. The kit's `tokens.json` version and each consumer's `VERSION` file stay the
  only records.

## Parts

### 1. Drift status

`scripts/sync.mjs --status` already prints `folder  copy-version  kit-version` for `repo:folder` pairs. Extend it into one
command that:

- knows the consumer list (repo path or GitHub name, folder, deploy route) from one file in this repo,
- reads each consumer's `VERSION` from its main branch rather than a possibly stale local checkout (the first read of
  this design was wrong because a local checkout was 26 commits behind),
- also compares file checksums, so a hand-edited copy is reported as "modified here" instead of "current",
- exits non-zero only for the states a script should act on (modified copy, or behind across a release marked
  breaking), and zero with a plain report otherwise.

### 2. Where the check runs

- Pi Hub and Local AI deploy preflights: print the consumer's drift line; block only on the non-zero states above.
- Each consumer's CI: the existing `verify.mjs` / `verify.py` already check a copy. Add the version-against-main line.
- The "what's live" view (part 4) shows the same line per repo.

### 3. Sync PRs

A command run from this repo (`sync.mjs <repo> --dir <folder> --pr`) that, in a worktree created with `wt new`, copies
the kit in, runs the consumer's narrowest check, and opens a PR whose description lists the kit changes between the
copy's version and the kit's. It never merges, never pushes to main and never touches a consumer's deploy target.
Refusing to replace a newer copy stays as is.

### 4. Release notes with a skip rule

Each kit release carries a short entry (in a `CHANGELOG.md` here, which does not exist yet) naming what changed and one
of: **skippable** (nothing a consumer must do), or **needs a consumer change** with the change named (for example a
class renamed or a phrase added that consumers must render). The drift status and the sync PR description read these
entries. This is what makes "two or three versions behind, catch up in one go" safe.

### 5. What's live

A read-only report, per repo (pi-hub, LocalAI, print-lab, appliance-ui, bambuhelper-smart-display): the head of main,
the commit live on its target, open PRs waiting on the owner's "merge", and anything merged but not shipped. Deploy
state already exists as the `deploy_state` and `releases` tools in the home MCP server; the view should extend what they
return rather than add a second reader. Where it lives (this repo, home-mcp or pi-hub) is left to the builder, with one
constraint: it must run on the Mac without a deploy target being reachable, and say "unknown" for any target it
cannot reach rather than guess.

## Constraints

- Node 22 for scripts in this repo (`engines`), no new dependencies without a stated reason.
- Mac, Pi (10.0.0.30 over Tailscale) and the Windows PC (LocalAI at `C:\LocalAI\repo`) are the places state lives.
  Windows SSH lands in cmd.exe.
- LocalAI deploys only `release`, moved by `npm run ship -- <PR>`; its PC checkout must never hold local edits.
- Work happens in worktrees under `~/dev/.worktrees/<repo>/<branch>`; PRs are based on main, never stacked.
- Keep existing HTML IDs, class names and the kit's public files unchanged.

## Decisions made so far

By the owner: keep the repos separate; do drift check, sync PRs and release notes ("all"); design this and the
"what's live" view together, starting with the kit.

By me (to check): the copy model stays; sync PRs are opened, never merged; the consumer list lives in this repo; drift
is non-fatal unless a copy is hand-edited or a breaking release is skipped.

## Settled during review (my calls, for the owner to check)

- **Backfill.** The builder writes `CHANGELOG.md` entries for 2.8.0 to 2.15.0 from git history and classifies each as
  skippable or needs-a-consumer-change. The owner reviews that classification in the PR; a doubtful release is marked
  "needs a consumer change", the safe side.
- **Odd states.** A copy newer than the kit's main reads "ahead" and exits zero. A missing or malformed `VERSION` reads
  "unknown copy" and exits non-zero. A version absent from the changelog reads "unclassified" and exits zero, with the
  line printed.
- **"Modified here".** Compared against the checksums in the consumer's own `VERSION`, because the kit has one tag
  (`v1.0.0`) and no per-release checksums. Cutting a tag per release from now on is optional and left to the builder.
- **Reading main and offline.** Use `gh` (logged in as azmusgb) or `git fetch`, not the GitHub MCP server, which fails to
  connect. An unreachable consumer reads "unknown" and exits zero. No drift check ever blocks a deploy because the
  network is down.
- **Preflights.** The status command lives here. Each deploy preflight (pi-hub, LocalAI) gets a one-line call in its own
  PR, opened from a worktree and merged only on the owner's "merge". LocalAI's PC checkout is never edited.
- **Sync PR check.** Each consumer's entry in the consumer list names its narrowest check. If it can't run on the Mac
  (the smart display's firmware build, say), the PR still opens and says "unchecked". `sync.mjs` already copies all of
  `dist/` including `tokens.h`, `needs.h`, `words.h`, so nothing is regenerated.
- **Smart display "live".** Its live state is whatever flashed version the device or `release.json` reports; when that
  can't be read the view says "unknown", and that is an accepted permanent answer for it.
- **Open PRs.** Non-draft PRs only, read with `gh`.

## Left to the builder

File layout and names; how the consumer list is stored; how "breaking" is encoded in release notes; how the view is
rendered (CLI report, a Pi Hub page or both); how to read a Windows-hosted repo's live commit; test approach; PR
breakdown and order.

## Done means

- `node scripts/sync.mjs --status` (or its successor) prints one correct line per consumer, matching each repo's main.
- A consumer two releases behind gets a sync PR in one command, with its description naming the changes in between.
- A hand-edited copy and a skipped breaking release each produce the non-zero exit; a skippable gap does not.
- The "what's live" view shows, for the five repos, the commit on main, the live commit or "unknown", and unmerged PRs.
- `npm test` here passes, with tests covering the status, the checksum comparison and the skip rule.
