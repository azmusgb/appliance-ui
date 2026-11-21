<!-- classified-from: 2.7.0 -->
# Changelog

One heading per kit release, newest first: `## X.Y.Z — skippable` or `## X.Y.Z — needs consumer change (web|display): <what to do>`. The audience says which kit's consumers must act: the web apps or the display; leave it off only when everyone must.
"Skippable" means a consumer that is behind can move past this release without touching its own code (sync, rebuild,
look at the diff). Releases at or below 2.7.0 were never classified. The drift check treats them, and any release
missing here, as unclassified, so list every release, even a trivial one. When unsure, write "needs consumer change".

## 2.27.0 — needs consumer change (web): draw the Decisions group with `ApplianceNeeds.renderDecisions` once Pi Hub returns `decisions`, and pass `onAnswer`
Pi Hub amendment A33 (P1): the decision row. `ApplianceNeeds.renderDecisions(decisions, {onAnswer, here, resolve, allowOrigins, state})` draws a "Decisions (n)" group of open questions (`{id, question, options[], recommended, link, kind: "choice"|"text", answered_at?, answer?}`; rows with `answered_at` are not drawn): a choice row has two to four option buttons with the recommended one marked in words and a spec link, a text row has a box (500 characters) and one Send. A tap calls `onAnswer(id, answer)`, which returns a promise; the row is disabled and says so while it is pending, a second tap does not call again, success removes the row and says "Recorded: ..." in the group's status line, and a rejection or a resolved `false` keeps the row and says "Not recorded. Try again." An empty or missing list draws nothing; `state: "loading"` or `"error"` draws the group's own line (never an empty group). Question text goes in as text. `needs.css` gains the `ui-decisions` and `ui-decision` rules and takes `components.css` for the buttons and field. `PHRASES` gains the group's words (`decisions_heading`, `decisions_loading`, `decisions_unreadable`, `decision_*`), so `needs.h` gains the same defines; the display does not draw decisions and needs no change. Nothing changes for a consumer that does not call it. A consumer takes the group by calling it beside `renderList` with the `decisions` list and an `onAnswer` that rejects on any failed write.

## 2.26.0 — needs consumer change (web): draw the Assistant's admin pages as cards on one System page, the five tools as cards of Developer tools, and answer the retired ids through `redirect(id)`
Pi Hub amendment A27 (D1 to D3), the parts the owner has decided. In `pages.json`: `assistant-status` is gone; `assistant-system` (label "Assistant", `/assistant/system`, view `system`) is the one System page, and its five admin pages (`status` labelled "Assistant status", `models`, `developer-tools`, `assistant-settings`, `audit-log`) are `detail` rows opened from its cards, so no sub-tab row. `tools-files`, `tools-repository`, `tools-powershell`, `tools-browser` and `tools-n8n` are no pages: they are `cards` of `developer-tools` (same addresses and views; the n8n "Open in" moves to `developer-tools`). `changes-in-progress` and `changes-shipped` are no pages: they redirect to `changes` with a `stage`. A new top-level `redirects` list keeps every retired id resolving (`assistant-status` to `status`, the `tools-*` ids to their card, the two stages to Changes), checked by the build; `pages.js` exports `REDIRECTS` and `redirect(id)`. The Assistant has 23 rows (was 29). A test walks the list and fails any page more than two clicks inside its area. Signals and Claude Code are unchanged, and Developer tools is not pinned on Home (owner decisions open). A consumer that links to a retired id looks it up with `redirect(id)`; one that draws the System strip or the Assistant's tabs from `parent` stops finding the tools and the admin tabs there.

## 2.25.0 — skippable
`ApplianceConfirm.askTyped`: typed confirmation challenge for consequential and host-level actions (Pi Hub amendment A30 Phase 4 D3). The confirm button remains disabled until the person types the challenge word (e.g. "REBOOT") character-for-character. Web only.

## 2.24.0 — skippable
Conversation-first UI components for the Operational Assistant (Pi Hub amendment A30 Phase 2): `.ui-chat-thread`, `.ui-chat-msg` (with user, assistant, and streaming variants), `.ui-chat-composer` (input and action button with 44 px touch compliance), `.ui-disclosure` (<details>/<summary> disclosure container for route telemetry, models, and tool traces), and `.ui-result-card` (loading, error, and disabled states). Web only.

## 2.23.2 — skippable
The primary button's hover keeps its label legible. Hover mixed 12% of `onAccent` into `accent`, which in light mode lightened the fill under a white label to 4.09:1 (below 4.5:1). It now mixes 20% of `text` into `accent`: the fill darkens in light mode and lightens in dark, away from the label either way (light 6.60:1, dark 7.90:1), and moves the same way as the default button's hover. `docs/contrast.md` gains the hovered-primary row, and a test reads the hover rule from `components.css` and refuses a mix that drops the label under 4.5:1. The row's display column measures a state the Workshop display never draws (it has no hover). Web only.

## 2.23.1 — skippable
A dense Needs-you list stays inside its parent. `.ui-needs` had no column template, so in a dense list (`renderList(..., {dense: true})`) each row's one-line, unwrapped detail sized the grid's implicit column to its full text, and rows ran far past their card (538 px over at 1440 wide, 865 px on a 390 px phone, in Local AI's Home), pushing the action and the ellipsis out of sight. `.ui-needs` now sets `grid-template-columns:minmax(0,1fr)`, so the row is the list's width and the detail ellipsizes. Non-dense lists look the same: the demo screens are unchanged. An app that worked around this with its own column rule (Local AI's `#homeNeedsList .ui-needs`) can drop it after its next sync.

## 2.23.0 — needs consumer change (web): the Assistant's admin pages are drawn in Pi Hub's System strip, Atlas is its own Assistant page, and there is no `setup` section
Pi Hub amendment A27 (D1 to D3), step 1. In `pages.json`: the ten admin rows (`assistant-status`, now labelled "Assistant", with its tabs `models`, `developer-tools`, `assistant-settings`, `audit-log` and the five `tools-*` cards) have `area: system` and no `section`, so System's strip gains one page (the checker's cap for System is now eight); `atlas` is a page in the Assistant's Improve section, not a tab of Changes; the `setup` section is gone. No path, view id or row count changes, so no link breaks. A consumer that draws the Assistant's section strip from `section` stops showing Setup, and one that draws System's strip from `area` shows the Assistant page after Settings; the page's tabs come from `parent` as before.

## 2.22.0 — skippable
More contrast, when the person asks their device for it (`prefers-contrast: more`; Pi Hub amendment A22, step 13): `tokens.css` redraws `--ui-muted` as the text colour, `--ui-line` as `line2` and `--ui-line-2` as `fieldLine`, in both themes and under `data-theme`. `tokens.json` names the three in `contrastMore`; each points at a colour the kit already has, so `docs/contrast.md` gains no row. Web only: `tokens.h` is unchanged. Nothing changes for anyone who has not asked for more contrast. An app that kept its own more-contrast rule for muted text or lines can drop it once the stylesheet it covers reads `--ui-*`.

## 2.21.0 — needs consumer change (web): an app that keeps its own copy of the `pc_off` text drops it and reads the kit's `PHRASES`; "The PC is off or asleep" is now "The PC is asleep"
`ui-backbar` (Pi Hub amendment A22 6.4): the "← Pi Hub" bar for the platform's own pages that live outside Pi Hub's frame (the Assistant on its own address, Camera fit, the Privacy note), never for another product's page. One link in `<nav aria-label="Pi Hub">`, first in the document, 44 px high, not sticky, the arrow `aria-hidden` and the link named "Back to Pi Hub". `backbar.js` (a classic script, `window.ApplianceBackbar`) sends a visitor who came from a Pi Hub page back to that page, and leaves the link alone for any other referrer. The phrase table (A22 8.4): `pc_off` is "The PC is asleep" (was "The PC is off or asleep") and `pc_waking`, "The PC is waking up", is new; `needs.h` carries both, so the display shows the new words after its next sync with no change of its own.

## 2.20.0 — skippable
`literals.mjs`, the check behind Pi Hub amendment A22 1.5, is copied into each app beside `verify.mjs`. It counts what an app wrote by hand instead of taking from the kit, in eight categories (colour, type size, spacing, radius, shadow, motion, layer, and custom-property names that are not `--ui-*`), and compares each file's counts with the app's `.kit-literals-baseline.json`: a count that rises fails, a count that falls must be written back, a new file starts at zero. Nothing runs it until an app turns it on in its own PR, so a sync past this release changes no behaviour. No value or component changes.

## 2.19.0 — skippable
The values the apps wrote by hand (Pi Hub amendment A22 1.3), in `tokens.css` and `tokens.json`: eight steps of space `--ui-s-1` to `--ui-s-8` (4, 8, 12, 16, 24, 32, 48, 64 px on a phone, in rem), the pill radius `--ui-r-pill`, two shadows `--ui-shadow-1` (toast, popover) and `--ui-shadow-2` (sheet, dialog, palette) that differ by mode, `--ui-backdrop`, two durations `--ui-dur-1` (120 ms) and `--ui-dur-2` (220 ms), one easing `--ui-ease`, and four layers `--ui-z-bar` 50, `--ui-z-toast` 60, `--ui-z-sheet` 80, `--ui-z-palette` 90. Nothing existing changes value, and `--ui-space` stays. Web only: `tokens.h` is unchanged, because the display draws no sheet, shadow or animation from the kit. The palette's backdrop and its opening now use these values, so it opens in 120 ms on the kit's easing (was 140 ms ease-out). An app adopts the values in its own PRs; nothing here requires it.

## 2.18.0 — skippable
`ui-tabs--rows`: six tabs (Settings' groups, Pi Hub amendment A22 2.1) wrap onto full rows by the strip's own width: two to a row on a phone, three from 25.5 rem, all six from 51 rem. Rows are always full, and a long label wraps inside its segment and is never cut. The strip clips to its rounded corners, so a tab's focus ring is drawn inside it. Additive: `ui-tabs` alone is unchanged and stays two to five.

## 2.17.0 — needs consumer change (web): `toolsFor('documents')` and `toolsFor('media')` are now `toolsFor('household')`; a page's "Open in" row comes from its `tools` in `pages.js`
`pages.json`, the one list of the site's pages (Pi Hub amendment A22, section 3; step 12): every page's name, one-line purpose, address, role, ways in, old addresses and "Open in" tools, for Pi Hub, the Assistant and the Mac. The build checks it and writes `pages.json` and `pages.js` (`AREAS`, `PAGES`, `page(id)`); a sync copies both. Nothing reads them until an app does. In `tools.json`: the areas `documents` and `media` are `household`; Uptime Kuma and Homebox are `retired: true` and leave `toolsFor`; `n8n` and `comfy` are added with `via`, a path on the Assistant's origin, which `toolUrl` returns; the Assistant's purpose reads "Runs on the PC, which may be asleep". No class or token changes.

## 2.16.1 — skippable
The tool registry names the hub "Pi Hub" (it was "Home", which is also the start page's name). Pi Hub amendment A22, step 11: one name per thing. No class, token or behaviour changes; a consumer that shows the `hub` tool's name shows the new one after its next sync.

## 2.16.0 — skippable
`ui-tabs`, the web's tabs: the views of one area as two to five equal segments, 48 px high with 16 px labels, the selected one marked by an accent wash, accent text and a 3 px accent bar, as the display's `Tabs` (2.12). Additive; nothing that exists changes. Pi Hub's Lists page and its Room view Adjust panel (amendment A23) are the first users.

## 2.15.0 — needs consumer change (display): a screen that hard-codes the Switch row height (was 56 px) must use `Switch::kHeight` (now 48); re-check Stepper key positions
Switch and Stepper fit inside the 48 px row. Switch is 48 px high with a 48 x 28 track and a 20 px knob; Stepper keys are drawn 40 px inside their 48 px cells. Judged "needs" only because a layout that assumed the old height shifts; one that uses the constants is unaffected.

## 2.14.0 — skippable
`NeedTone::Info` joins the display's `NeedsRow`: the quiet muted bar the web keeps for info, ok and busy. Additive; existing tones draw as before.

## 2.13.0 — needs consumer change (display): stop drawing Back or Home on a level-one screen; Home is the tab bar's Home tab
`Frame` no longer draws Back or Home in a level-one header; Back is at the top left of a level-two screen only. Display screens built on the old header must drop their own level-one Back and Home handling.

## 2.12.0 — skippable
`Tabs`, the strip of a screen's views (two to five tabs, 48 px high), for the display. Additive; nothing that exists changes.

## 2.11.1 — skippable
A warn need draws amber like attention, not muted grey, on the web (`ui-need[data-tone=warn]`) and the display's `NeedsRow`. A colour fix; no markup or API change.

## 2.11.0 — skippable
The display kit (`dist/display/`) and `sync --display`. The web apps' sync leaves it out, and no token, class or phrase they use changes; the display repo adopts it when it is ready.

## 2.10.0 — skippable
`words.h` and `needs.h` for the display, and the state words and age rules in `ApplianceNeeds.WORDS` and `ApplianceNeeds.ago`. Additive; no token, class or phrase the web apps use changes.

## 2.9.0 — needs consumer change (web): stop relying on window breakpoints; the faceplate, Needs you and `ui-table--stack` switch by container, so each needs a container-sized parent, and anything measured in px against type or space tokens now scales with the rem root
Type, space and header tokens became rem on one fluid root curve, and the kit's window switches became container queries and `clamp()`. Pages that wrapped these parts in fixed-width or breakpoint CSS of their own will lay out differently.

## 2.8.0 — skippable
A new Needs phrase, `outside_alarm_quiet`. Additive: only Pi Hub amendment A1 renders it, and Pi Hub wires it in where A1 calls for it; no other consumer's markup, token or class changes.
