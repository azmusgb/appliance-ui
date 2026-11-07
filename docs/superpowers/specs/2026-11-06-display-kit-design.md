# Display kit: the kit's look, words and parts on the workshop display

Status: proposed 6 November 2026, for the owner's review. Adds a display build to the kit; changes no token, class or
phrase the web apps use, so it ships as minor versions. Amended 6 November 2026: K9 adds the controls for changing a
setting, including a pick-list, after the device review found named choices cycled with −/+. Amended 7 November 2026: K5 `Frame` draws Back at the top left on level two; Home is the tab bar's, never a header button; level one (a top screen whose navigation is the tab bar) has neither in its header, because the device showed a second, different placement of Back and Home on idle Home.

## Why

`DESIGN.md` already covers the 480 × 320 workshop display (one reading or one decision per screen, 48 px targets, at
most two levels, no text under 14 px, honest stale states), and the kit already builds `tokens.h` in RGB565. But the
display only follows those rules by hand (decided 5 Nov 2026), so it has drifted. Read on 6 Nov 2026 from
`azmusgb/bambuhelper-smart-display` `origin/main` (`9dfed3d`, Workshop OS 12.9.0 on the device):

- **Colours: two hand-written palettes, neither the kit's.**
  - `UI_*` comes from the v10 theme patch (`vendor/theme-v10/apply_smart_home_workshop_os_theme_v10_core.py:38-58`):
    graphite black and an **ember orange accent `#FF7A00`**.
  - `OS12V_*` comes from the OS12 visual overhaul (`apply_workshop_os12_visual_overhaul.py:55-65`), with different
    greys, cyan and red.
  - Raw RGB565 values recur through the screens: about 290 palette references in `firmware/platform/ui/tabs_pages.cppfrag`
    and 150 in `more_pages.cppfrag`.
  - The kit replaced orange with coolant teal on 1 Nov (Faceplate F2, which rejects orange because it fights the amber
    lamp), so the display and the web apps no longer look like one product.
- **Type: the pre-1.4 face.** `firmware/platform/fonts/inter_*.h` are Figtree VLW fonts at 10–26 px. The 22 px one
  alone is 92 KB. The kit has used Archivo since 1.4 (F4). The 10 px size breaks the 14 px floor.
- **The kit copy is old and unused by the firmware.** `assets/ui/` holds kit **1.4.0**, which only the web portal
  reads; nothing under `firmware/` includes `tokens.h`. The kit is at 2.9.0.
- **Words:** the Needs-you items come from Pi Hub's feed already worded, so they match. Everything the display words
  itself (state words, ages, button labels) is written by hand.
- **Parts:** each screen draws its own lamps, rows, buttons and readouts with LovyanGFX calls, so the same thing is
  drawn differently from screen to screen.

## Subject

The workshop display, a Waveshare ESP32-S3 3.5" (480 × 320, capacitive touch, dark only), read at arm's length while
your hands are busy. Its job matches the web Home: is anything wrong, and what is running, with one decision per
screen.

## Decisions

| | Choice | Why, and the alternative rejected |
|---|---|---|
| K1 One palette | The firmware takes every colour from the kit's `tokens.h` (`UI_COLOR_*`). The display's two palettes become one generated mapping to the tokens, then go. The accent becomes the kit's coolant teal. | One product (DESIGN.md). Rejected: keeping ember orange as a "workshop identity". F2 rejected orange for the whole kit because it fights the amber lamp, and a second accent would make the display a different product. |
| K2 Contrast after RGB565 | The build rounds each colour to RGB565 the way the panel shows it, and measures contrast on the rounded values. `docs/contrast.md` gains a display column, and the same gates apply: text 4.5:1, lamps, rings and fields 3:1. | RGB565 drops low bits, which can pull a pair under its threshold. A claim on the 24-bit value would be unmeasured for the display. |
| K3 Type | Archivo, rendered by the kit's build to LovyanGFX VLW fonts at the display's sizes: fs3 14, fs4 16, fs5 20, fs6 26, and a readout face at fs7 34 at 75% width. Latin only. Nothing under 14 px. | One typeface across the product (F4). Rejected: keeping Figtree, a second face for the same roles. Cost: flash. The 92 KB for one Figtree size today says to measure before committing; see the open question. |
| K4 Words | The kit builds `needs.h` (phrase keys and their text, from `src/needs.js`) and `words.h`. `words.h` holds the state words (Up, Down, Unknown, Running, Waiting) and the age rules ("now", "4 min ago", "since 10:32"), from one table that `needs.js` also reads. | The display then can't word a state differently from Pi Hub. Rejected: copying strings into the firmware, which is how they drift today. |
| K5 Parts | A header-only C++17 display kit in `dist/display/` that draws through a small `UiCanvas` interface: fill and round rects, a line, text in a kit font, text width. The parts: `Faceplate` (lamp, readout and unit, caption, age), `LampRow` (lamp, label, value, at most one action), `Chip` (ok, warn, bad, unknown; `live` adds a halo; unknown is a hollow dot), `Button` (primary or plain, at least 48 px, disabled state), `NeedsRow`, `AgeLine`, `Meter` (only with a real fraction) and `Frame` (header with Back at the top left on level two, Home being the tab bar's, level one with neither; two levels at most). | One drawing per idea, matching `ui-faceplate`, `ui-row--lamp`, `ui-chip` and `ui-btn`. The LovyanGFX adapter lives in the display repo, the only place that depends on it, so the kit stays testable on a Mac. Rejected: LVGL. It would mean rewriting the UI layer instead of moving it. |
| K6 Honest states in the parts | Parts take a `Reading` (value, observed at, and one of: live, stale, unavailable, never read) and draw the age or "Unknown" themselves. There is no way to draw an unknown reading as ok. | `DESIGN.md`: unknown never shows as Off, Healthy or Complete. Putting it in the part enforces it on every screen at once. |
| K7 Sync and guard | The display repo syncs the whole kit, including `dist/display/`, into `assets/ui/` through its existing `VERSION` hash list, and the firmware includes it from there. A firmware check fails on a raw `0x....` colour or a new palette constant in UI code. Unported files sit on an allow list that only shrinks. | The same sync and drift check Pi Hub and Local AI use (shared-look D4). |
| K9 Controls | Each kind of setting has one control. A number (brightness, volume, a temperature threshold) uses a `Stepper`: −/+ with the value centred. A named choice (time zone, date format, alert policy, gauge style) uses a `Picker`. A colour uses a `Picker` of named swatches. On/off uses a `Switch`. A clock time (night mode start and end) uses a `Picker` of times in 15-minute steps, so it is the same part, not a new one. See "The Picker" below. | −/+ on a named choice hides the options until you step through them, and that is what the 6 Nov device review found on Gauges, Time & locale and After a print. Rejected: keeping steppers for named choices as a documented exception. That would be a second way to make the same kind of choice. Rejected: a separate time wheel. It is a new gesture on a touch panel with no momentum scrolling, for two settings. |
| K8 Proof | The kit compiles the parts on the Mac against an in-memory RGB565 canvas, renders each part in each state, and compares the result with reference images (`demo/screens/display/*.png`, created on purpose like the web visual baselines). On the device, `/hub/show` and `/hub/frame.ppm` capture each ported screen for acceptance. | Mac renders catch drift in the kit; device captures are what the owner accepts. |

## The Picker

A full-screen view in the same `Frame`, so the header has the setting's name as its title and Back in its usual place.

- **Options:** one per row. Each row is at least 48 px tall and shows its label in full at 14 px or larger, never
  shrunk and never cut off. A colour option shows its swatch beside its name. The current choice has a check mark,
  so it is not marked by colour alone.
- **Layout:** four options per page is the expected layout, and 48 px is the enforced minimum. The header, tab bar,
  gaps and any two-line label must still fit in 320 px. Longer lists scroll, and any scroll controls are also at least
  48 px with 14 px text.
- **Opening:** the list opens with the current choice in view.
- **Choosing:** a tap applies the choice and returns to the page it came from, which shows the new value. Back returns
  without changing anything.
- **Failure:** if the choice can't be saved, the Picker stays open, the row shows that it wasn't saved and why, and the
  previous value remains selected. It never returns as if it were saved.
- **Unknown:** if the current value can't be read, no row is checked and the title line says "Current setting unknown".
  The first option is never pre-selected as if it were the current value.

The Mac render tests (K8) cover a list that fits, a list that scrolls with the choice below the first page, a colour
list, a long label, the failure state and the unknown state.

## Rejected

- **A separate display design system.** It is the drift we are removing.
- **Rendering the web kit on the device** (a browser or HTML renderer). Not possible on this MCU with acceptable
  memory and frame times.
- **Changing the display's information architecture here.** This moves the look, words and parts. What each screen
  shows stays as Workshop OS has it; the 12.x overhauls own that.

## Rollout

Each step is its own PR. The kit's steps can merge independently; the display steps go in order.

1. **appliance-ui 2.10.0: measure and word.** RGB565 contrast column and gate (K2), plus `needs.h` and `words.h` (K4).
   - Evidence: the contrast test and a header snapshot test.
2. **appliance-ui 2.11.0: the display parts.** `dist/display/` (K5, K6, and the K9 `Stepper`, `Switch` and
   `Picker`), the Archivo VLW fonts (K3) and the Mac render tests with reference images (K8).
   - Evidence: the render tests, and the font sizes in bytes, reported in the PR.
3. **Display: sync and palette.**
   - Sync the kit at 2.11 and add the LovyanGFX adapter.
   - Generate the mapping from `UI_*` and `OS12V_*` to tokens, so every screen takes the kit's colours (K1).
   - Add the raw-colour guard with today's allow list (K7).
   - **Visible change:** the accent turns teal and the greys move to the kit's graphite.
   - Evidence: exact-head CI, captures of every view from `/hub/views`, and the display's physical acceptance.
4. **Display: pilot on idle Home.** Idle Home on the parts, with Archivo (K3).
   - Idle Home is the closest to the web Home, with a faceplate-like card and the two Needs-you rows.
   - Evidence: the Home captures next to the web Home, and its allow-list entries removed.
5. **Display: the remaining screens,** a few per PR: Printer, the More pages and Lab judge. Each removes its
   allow-list entries. On the More pages, each setting moves to its K9 control: Gauges, the colour settings, Time &
   locale, After a print and the night-mode times move from −/+ to a `Picker`.
   - Done when the allow list is empty.

`DESIGN.md`'s display section changes with step 2, from "follows the rules by hand" to "uses `dist/display/`".

## Acceptance

The owner accepts on the device, not on a green build. After step 3 and again after step 5, compare the device next
to the web Home on a phone:
- one accent;
- the same lamp colours and words for the same states;
- no text under 14 px;
- Back and Home always in the same place.

Record it the way Workshop OS records physical acceptance (`releases/current.json` and its acceptance scripts), with
the date.

## Open questions for the owner

1. **The accent on the display (K1).** The recommendation is teal, like everything else. Say so if the workshop should
   keep orange, and the kit gets a documented exception instead.
2. **Fonts and flash (K3).** If the five Archivo sizes don't fit next to the current images, the fallback is fewer
   sizes (14, 20 and 34). The decision is made in step 2 on the measured bytes, not before.
