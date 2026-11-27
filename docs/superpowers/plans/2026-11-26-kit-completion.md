# appliance-ui: work the kit through to completion (fixed, improved, evolved)

> **Superseded 27 Nov 2026** by `2026-11-27-kit-owed.md`, which carries what was left of Phases 2 to 5. Kept for its record of Phases 0 and 1.

> **For agentic workers:** use superpowers:executing-plans or superpowers:subagent-driven-development to run this plan task by task. Steps use checkbox (`- [ ]`) syntax.

**Goal (owner, 26 Nov 2026):** "have appliance ui worked thru to completion: fixed, improved, evolved."

**What "complete" means here.** Written down so it can be checked, not felt:

1. **Fixed:** no known defect is open against the kit, and every consumer's copy is current or knowingly skippable (`npm run drift` shows no `behind` row that needs a change).
2. **Improved:** each finding from the audit in Phase 1 is either fixed in a release, or recorded as a decision with the reason it was left.
3. **Evolved:** each page or part the approved specs say the kit must carry (A35 M1b, A36, A37, spoken readout) exists in the kit, is used by a consumer, and has been seen in a browser.
4. **Held:** the kit's own gates pass on `main` (`npm ci && npm test`, literals, contrast) and the page list matches what each consumer draws.

This plan is not an amendment. It adds no page, no navigation model and no route. A phase that would need one stops and asks (see Decisions).

**Spec/baseline:** inside existing rules. Page names and the tool list are the kit's (`pages.json`, `tools.json`); an approved spec decides what a page does. Changing what an approved spec says needs an amendment, not a kit edit (`AGENTS.md`).

## State at 26 Nov 2026 (verified, not remembered)

| Item | Evidence |
|---|---|
| Kit `main` | 2.34.1, #64 merged (`41ff42f`). No open PRs, no open issues. |
| Kit gates | `npm test` on `main`: 356 tests, 356 pass, 0 fail (26 Nov, this session). |
| Consumers | `npm run drift`: pi-hub current at 2.34.1; LocalAI behind-skippable (copy 2.31.3); smart display and print-lab behind-skippable (copy 2.34.0). |
| Missions rows | 2.34.1 marks `missions` and `mission` `built: false` (so a consumer that doesn't draw them can sync). Pi Hub's H7 (pi-hub #362) draws them. With `built: false` Pi Hub's route test would fail on #362 (it draws pages the kit says aren't built). |
| Live Pi Hub | Kit 2.32.0 at `a75771f`/`7c57c7e`; main holds 2.34.1 plus H3 (not deployed). |
| Known kit-side findings (UI review of the Missions pages, 26 Nov) | Two accent-filled buttons on the Decisions tab (plate primary plus `renderDecisions`' recommended answer). "Decisions (n)" small heading beside the large "Answered (n)" (kit). A large gap between breadcrumb and plate at every width (shell; `page-trail` has no definition in the kit). |

Everything below the table is a plan, not a finding. Phase 1 exists because the table is only what one session happened to see.

## Global constraints (from `AGENTS.md`, `DESIGN.md`)

- This repo is the source. Never edit a consumer's copy; never edit `dist/` by hand (`npm run build` writes it, commit it).
- `npm ci && npm test` before every PR; paste the counts. `npm run display:update` only when the change is meant to alter the display's images, and say so.
- A change to what a consumer receives is a release: bump `version` in `tokens.json` and `package.json` together; one `CHANGELOG.md` entry, newest first (`## X.Y.Z — skippable` or `— needs consumer change (web|display): <what>`). Docs alone are not a release.
- After a colour change: `npm run contrast`, commit `docs/contrast.md`. Never quote a ratio from memory.
- No hand-written literal where the kit has a value; `npm run literals` must not grow.
- Every interactive part: keyboard reachable, visible focus, `prefers-reduced-motion` respected. Design every state: loading, empty, error, disabled, long content. A read that failed or is unknown is its own state.
- A sync is its own PR in the consumer, opened from here (`node scripts/sync.mjs <consumer checkout> --dir <folder> --pr`). It never merges.
- One PR per change, based on `main`. The owner merges and deploys: "merge N" for each.
- UI changes: width sweep and axe where the consumer has them; screenshots at phone, tablet, desktop, light and dark.

## Phases and PRs

Order is by dependency, then impact. Each PR names its acceptance as a check someone can run.

### Phase 0: unblock the Missions pages (kit 2.34.2)

Why first: Pi Hub's H7 PR (#362) cannot pass its route test while the kit says the pages are not built, and Pi Hub's `main` already carries 2.34.1.

- [ ] **K2.34.2** (`appliance-ui`): `pages.json` sets `missions` and `mission` back to built (drop `built: false`); regenerate `dist/pages.json`; `CHANGELOG.md` `## 2.34.2 — needs consumer change (pi-hub): draw /missions and /missions/<initiative> before syncing` (the 2.33.0 wording, with the version). A consumer that draws neither stays on 2.34.1.
  - Acceptance: `npm ci && npm test` exits 0 with the counts pasted; `tests/pages.test.mjs` asserts both rows are built; `npm run drift` classifies 2.34.2 as needs consumer change for pi-hub only.
- [ ] **Sync into pi-hub #362** (its own commit, from here): `node scripts/sync.mjs <pi-hub worktree> --dir hub/static/ui`, then merge `main` into the H7 branch (never rebase) and re-run H7's gates.
  - Acceptance: `tests/test_routes.py::test_the_router_draws_exactly_the_pages_the_server_lists` passes on #362; `verify.py` matches `VERSION`.
- Depends on: nothing. Blocks: H7 reaching `main`.

### Phase 1: audit the kit (read-only; output is a ranked findings file)

- [ ] **A1: kit audit report**, `docs/superpowers/specs/2026-11-26-kit-audit.md` (docs PR, not a release). Scope, each measured by script first:
  1. Every component in `src/components.css`, `needs.css`, `shell.css`, `palette.css`: states present (loading, empty, error, disabled, long content), focus ring, 44 px targets, reduced motion. Use `demo/` plus the existing `tests/demo-a11y.test.mjs`, `tests/components.test.mjs` as the harness; add checks, not opinion.
  2. Contrast: `npm run contrast` result against `docs/contrast.md`, light and dark, including hover and `warn`/`bad` on every surface.
  3. Kit literals: `npm run literals` baseline and any hand-written value in `src/`.
  4. Page list: every `pages.json` row against what each consumer draws (pi-hub, LocalAI, print-lab) via `cross-repo-check`; rows with `built: false` and the step that builds each.
  5. Words: `words.json` against each consumer's own strings (hard-coded phrases the kit already has).
  6. The Missions findings above, each placed (kit part, shell, or Pi Hub page).
  7. Display kit: rendered images (`display:update`) still match; `display` consumer drift.
  - Output: a ranked table (impact first), each row with file:line, evidence, owner repo (kit or consumer) and a proposed release. Rank by impact, not by size. Anything the baseline does not cover is marked "owner decision", not "task".
  - Acceptance: every row has evidence a reader can rerun; no row without an owner repo; the report states what was not measured.
- Depends on: nothing; can run alongside Phase 0.

### Phase 2: fix (kit 2.35.x, one release per theme, ranked by the audit)

Seed list (from the table above; the audit may add to and reorder it):

- [ ] **Decisions tab primary** (`renderDecisions`, `needs.css`): decide one primary per area. Either the plate's primary yields while a decision is open, or the recommended answer is not accent-filled when a plate primary exists. This changes a design rule, so it is an **owner decision** first (see Decisions); do not build it before then.
- [ ] **Decisions heading scale**: "Decisions (n)" and "Answered (n)" use one heading level and size.
- [ ] **Shell gap**: define `page-trail` (or remove its use) so the breadcrumb sits against the plate at every width; sweep at 320, 390, 820, 1366, 1920.
- [ ] Each audit finding ranked above "low", one PR per theme, each with a regression test that fails before (`/fix` for defects).
- Acceptance per release: `npm ci && npm test` counts; `npm run contrast` committed if colour changed; width sweep and axe against the demo; screenshots light and dark at phone, tablet, desktop; CHANGELOG entry with the right audience.
- Depends on: Phase 1 (ranking), except items marked as seeds, which may start once the owner decides.

### Phase 3: bring consumers current (syncs, one PR each, never merged by this plan)

- [ ] **LocalAI** (`app/public/ui`): copy 2.31.3 to current. Its own rules apply: local CI (`npm run ci -- <PR>`) is the merge gate; never `npm run ship`. The PC's checkout must stay clean.
- [ ] **print-lab** (`tools/ui`): 2.34.0 to current. Run its page tests; print-lab's pages are drawn by Pi Hub, so check `lab sync` is unaffected.
- [ ] **Smart display** (`assets/ui`, `--display`): 2.34.0 to current; `display:update` images reviewed.
- Acceptance per consumer: its own verify check against `VERSION`; `npm run drift` shows `current`; its tests pass with counts pasted.
- Depends on: Phase 0 (same kit version); a consumer with a `needs consumer change` release waits for that change.

### Phase 4: evolve (what the approved specs still owe the kit)

Take only items an approved spec names. Candidates found so far:

- [ ] **A35 M1b** after H7 merges: any part H7 had to hand-write that the kit should own (the mission plate, provenance line, event row). Rule: if two pages draw it, it moves here.
- [ ] **A36 / A37**: any D4/D5 part still unbuilt in the kit (check the specs' rollout tables; do not assume).
- [ ] **Spoken readout**: rollout steps after kit release two, per `docs/superpowers/specs/2026-11-25-spoken-readout-design.md`.
- Anything else that looks like evolution (a new component, a page, a navigation change) is **not** in this plan: propose it as a spec or an amendment and wait for the owner.
- Acceptance: each part has a demo page, tests, a consumer using it, and a browser check; the plan's "complete" criterion 3 is met by listing each spec item with its evidence.

### Phase 5: close out

- [ ] `npm run drift`: no consumer `behind` that needs a change.
- [ ] `npm ci && npm test` on `main`: counts recorded here.
- [ ] Re-run `cross-repo-check`; update the platform memory and `baseline-facts.md` "Last verified state" with the kit version and drift.
- [ ] Mark each of the four "complete" criteria met, with evidence, or open, with why.

## Sequence and dependencies

```
Phase 0 (2.34.2 + sync into #362) ──► H7 merges (owner) ──► Phase 4 (A35 parts)
Phase 1 (audit) ──► Phase 2 (fix releases) ──► Phase 3 (consumer syncs of the final version)
```

Phase 3 should sync once to the version Phase 2 ends on, to avoid three syncs per consumer; sync earlier only if a consumer is blocked.

## Decisions for the owner

1. **Decisions-tab primary.** A plate primary and a recommended answer are both accent-filled. Options: (a) the plate's primary becomes secondary while a decision is open; (b) the recommended answer is outlined when a plate primary exists; (c) leave both and document the exception in `DESIGN.md`. Recommendation: (a). It keeps one primary per area and the page's job (decide) clear. It changes a design rule.
2. **Release cadence.** One release per theme (more syncs, small reviews) or one 2.35.0 for the audit's fixes (fewer syncs). Recommendation: one release per theme, syncing consumers once at the end (Phase 3).
3. **Consumer syncs.** Open all three sync PRs together at the end, or each as its release lands. Recommendation: together at the end.

## Risks

- The audit may find more than a plan can hold. The ranking is the control: stop at the first rank the owner calls "enough" and record the rest.
- Another session also works in this repo (the 2.34.1 critique fixes came from one). Before any release: `ListAgents`, message any session with an open appliance-ui branch, and check `gh pr list`. A kit version number is claimed by whoever merges first; re-read `main` before bumping.
- A kit release a consumer cannot absorb breaks its tests (as 2.33.0 did for Pi Hub). Every release that adds or changes a page row states its audience in the CHANGELOG, and Phase 0 is the model.
- Syncing is merged-not-live: Pi Hub needs `deploy_state` and `git push pi main`; LocalAI needs `npm run ship`; the display needs its OTA. Each has its own preflight; none is part of this plan.

## Not verified at the time of writing

- No browser check of the kit demo this session; the contrast, literals and display checks were not re-run beyond `npm test`.
- Whether LocalAI's and print-lab's current pages depend on anything between their copy and 2.34.1 beyond what each CHANGELOG entry says.
- Whether the Decisions-tab and shell findings reproduce in the kit's own demo (they were seen on Pi Hub's Missions pages).
