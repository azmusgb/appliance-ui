# Rules for coding agents in appliance-ui

These hold for every agent (Claude Code, Codex, others). `README.md` has the commands in full; `DESIGN.md` is the
design contract every app follows.

- **This repo is the source; the apps hold copies.** A colour, size, component, phrase, page name or tool changes here
  (`src/`, `tokens.json`, `pages.json`, `tools.json`) and reaches an app by sync. Never edit an app's copy
  (`hub/static/ui`, `app/public/ui`, `assets/ui`, `tools/ui`), and never edit `dist/` by hand: `npm run build` writes
  it, and the rebuilt `dist/` is committed with the change.
- **Run `npm ci && npm test` before every PR and paste the counts.** It builds `dist/` and runs every check, among
  them the kit's own literals check and the display kit's rendered images. `npm run display:update` rewrites those
  images; run it only when the change is meant to alter them, and say so in the PR.
- **A change to what a consumer receives is a release.** Raise `version` in `tokens.json` and `package.json` together
  and add one `CHANGELOG.md` entry, newest first: `## X.Y.Z — skippable`, or
  `## X.Y.Z — needs consumer change (web): <what to do>` / `(display): <what to do>`. When unsure, write "needs
  consumer change" with no audience. A change to the docs alone is not a release.
- **Contrast is measured, never assumed.** After changing a colour in `tokens.json`, run `npm run contrast` and commit
  `docs/contrast.md`. Never state a ratio from memory.
- **`DESIGN.md` is the rules for every app.** The platform baseline and its approved amendments
  (`pi-hub/docs/superpowers/specs/2026-11-01-platform-product-architecture-design.md`) come first, then this repo's
  specs (`docs/superpowers/specs/`), then the contract. A rule that changes what an approved spec says needs an
  amendment; changing `DESIGN.md` is not enough.
- **A sync is its own PR in the consumer**, opened from here:
  `node scripts/sync.mjs <consumer checkout> --dir <folder> --pr` (`--dry-run` first prints the steps). It never
  merges; the owner does. `npm run drift` shows which consumers are behind.
- Branch off `main` and open a PR. Never push to `main`.
