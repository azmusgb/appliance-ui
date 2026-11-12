<!-- classified-from: 2.7.0 -->
# Changelog

One heading per kit release, newest first: `## X.Y.Z — skippable` or `## X.Y.Z — needs consumer change (web|display): <what to do>`. The audience says which kit's consumers must act: the web apps or the display; leave it off only when everyone must.
"Skippable" means a consumer that is behind can move past this release without touching its own code (sync, rebuild,
look at the diff). Releases at or below 2.7.0 were never classified. The drift check treats them, and any release
missing here, as unclassified, so list every release, even a trivial one. When unsure, write "needs consumer change".

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
