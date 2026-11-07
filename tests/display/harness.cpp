// The display kit's Mac harness (display-kit K8). Compiled by tests/display.test.mjs against dist/display, it
//   render <fonts dir> <out dir>   draws every scene to <out dir>/<scene>.rgb565 (480 x 320, little endian)
//   check <fonts dir>              asserts what the spec says about the parts, exits 1 listing each failure
//   age                            prints "seconds<TAB>text" for the age rules, compared with needs.js ago()
//   tints                          prints each chip tint as "kind bg value", compared with the contrast build's mix()
#include <cmath>
#include <cstdio>
#include <cstring>
#include <functional>
#include <string>
#include <utility>
#include <vector>
#include "mem_canvas.h"

using namespace ui;

// 2026-11-06 10:40:00 UTC, no offset: "since 07:12" is 3 h 28 min back, "since 3 Nov" three days.
static const Clock kNow{1793961600u, 0};
static const uint32_t kHour = 3600;

// ---------------------------------------------------------------- scenes

static void caption(MemCanvas& c, int x, int y, const char* s, uint16_t bg = UI_COLOR_BG) {
  c.text(x, y + ascent(UiFont::Fs3), s, UiFont::Fs3, UI_COLOR_MUTED, bg);
}

static void sceneChip(MemCanvas& c) {
  const uint16_t bgs[3] = {UI_COLOR_BG, UI_COLOR_SURFACE, UI_COLOR_SURFACE_2};
  for (int b = 0; b < 3; b++) {
    c.fillRect(0, b * 107, 480, 107, bgs[b]);
    int x = 16;
    const int y = b * 107 + 14;
    x += Chip::draw(c, x, y, ChipKind::Ok, UI_WORD_UP, false, bgs[b]) + 10;
    x += Chip::draw(c, x, y, ChipKind::Warn, UI_WORD_WAITING, false, bgs[b]) + 10;
    x += Chip::draw(c, x, y, ChipKind::Bad, UI_WORD_DOWN, false, bgs[b]) + 10;
    Chip::draw(c, x, y, ChipKind::Unknown, UI_WORD_UNKNOWN, false, bgs[b]);
    x = 16;
    x += Chip::draw(c, x, y + 44, ChipKind::Ok, UI_WORD_RUNNING, true, bgs[b]) + 10;
    x += Chip::draw(c, x, y + 44, ChipKind::Warn, nullptr, true, bgs[b]) + 10;
    Chip::draw(c, x, y + 44, ChipKind::Bad, nullptr, false, bgs[b]);
  }
}

static void sceneButton(MemCanvas& c) {
  const char* a = "Start";
  const char* b = "Cancel";
  const Rect r1{16, 16, Button::width(c, a), kTarget};
  Button::draw(c, r1, a, ButtonStyle::Primary, true);
  const Rect r2{r1.right() + kGap, 16, Button::width(c, b), kTarget};
  Button::draw(c, r2, b, ButtonStyle::Plain, true);
  caption(c, 16, 72, "primary, plain");
  Button::draw(c, Rect{16, 112, Button::width(c, a), kTarget}, a, ButtonStyle::Primary, false);
  Button::draw(c, Rect{r1.right() + kGap, 112, Button::width(c, b), kTarget}, b, ButtonStyle::Plain, false);
  caption(c, 16, 168, "disabled");
  Button::draw(c, Rect{16, 208, 20, 20}, "OK", ButtonStyle::Plain, true);  // asked for 20 x 20: drawn 48 x 48
  caption(c, 16, 264, "asked for 20 x 20, drawn at least 48 x 48");
  Button::draw(c, Rect{240, 208, 200, 64}, "Large", ButtonStyle::Primary, true);
}

static void sceneAgeLine(MemCanvas& c) {
  struct Row { const char* what; Reading r; Clock clock; };
  const uint32_t n = kNow.epoch;
  const Row rows[] = {
      {"live, just read", Reading::live("1", n), kNow},
      {"live, 4 min ago", Reading::live("1", n - 4 * 60 - 20), kNow},
      {"live, 50 min ago", Reading::live("1", n - 50 * 60), kNow},
      {"stale, earlier today", Reading::stale("1", n - 3 * kHour - 28 * 60), kNow},
      {"stale, another day", Reading::stale("1", n - 3 * 86400), kNow},
      {"unavailable", Reading::unavailable(), kNow},
      {"never read", Reading::neverRead(), kNow},
      {"clock not set", Reading::live("1", n), Clock{}},
  };
  int y = 16;
  for (const Row& row : rows) {
    c.text(16, y + ascent(UiFont::Fs3), row.what, UiFont::Fs3, UI_COLOR_TEXT, UI_COLOR_BG);
    AgeLine::draw(c, 240, y + ascent(UiFont::Fs3), row.r, row.clock, UI_COLOR_BG);
    y += 36;
  }
}

static void facePair(MemCanvas& c, bool second) {
  const uint32_t n = kNow.epoch;
  if (!second) {
    Faceplate::draw(c, Rect{12, 12, 456, 140}, "Nozzle", Reading::live("212", n - 20, "C"), Tone::Ok, UI_WORD_RUNNING, true, kNow);
    Faceplate::draw(c, Rect{12, 164, 456, 140}, "Disk used", Reading::live("97", n - 5 * 60, "%"), Tone::Bad, UI_WORD_DOWN, false, kNow);
  } else {
    Faceplate::draw(c, Rect{8, 8, 228, 148}, "Nozzle", Reading::stale("212", n - 3 * kHour - 28 * 60, "C"), Tone::Ok, UI_WORD_RUNNING, true, kNow);
    Faceplate::draw(c, Rect{244, 8, 228, 148}, "Bed", Reading::unavailable(), Tone::Ok, nullptr, false, kNow);
    Faceplate::draw(c, Rect{8, 164, 228, 148}, "Chamber", Reading::neverRead(), Tone::Ok, nullptr, false, kNow);
    Faceplate::draw(c, Rect{244, 164, 228, 148}, "Live, no value", Reading::live(nullptr, n), Tone::Ok, UI_WORD_UP, false, kNow);
  }
}
static void sceneFaceplateLive(MemCanvas& c) { facePair(c, false); }
static void sceneFaceplateHonest(MemCanvas& c) { facePair(c, true); }

static void sceneLampRowA(MemCanvas& c) {
  const uint32_t n = kNow.epoch;
  LampRow rows[] = {
      {"Printer", Reading::live(UI_WORD_RUNNING, n - 30), Tone::Ok, "Pause"},
      {"Pi temperature", Reading::live("72", n - 30, "C"), Tone::Warn, nullptr},
      {"Disk used", Reading::live("97", n - 30, "%"), Tone::Bad, "Free space"},
      {"A very long row label that has to give way to the value", Reading::live("Up", n - 30), Tone::Ok, "Restart"},
  };
  int y = 8;
  for (LampRow& r : rows) { r.draw(c, Rect{0, y, 480, LampRow::kHeight}, kNow, UI_COLOR_BG); y += LampRow::kHeight + 4; }
}
static void sceneLampRowB(MemCanvas& c) {
  const uint32_t n = kNow.epoch;
  LampRow rows[] = {
      {"Camera", Reading::stale("Up", n - 3 * kHour - 28 * 60), Tone::Ok, nullptr},
      {"Healthchecks", Reading::unavailable(), Tone::Ok, "Check"},
      {"Backup", Reading::neverRead(), Tone::Ok, nullptr},
      {"Network", Reading::live(UI_WORD_UP, n), Tone::Ok, nullptr},
  };
  int y = 8;
  for (LampRow& r : rows) { r.draw(c, Rect{0, y, 480, LampRow::kHeight}, kNow, UI_COLOR_BG); y += LampRow::kHeight + 4; }
}

// 2.11.1: warn is amber like attention, not the quiet grey it was; only bad is a different bar.
static_assert(NeedsRow::toneColor(NeedTone::Warn) == UI_COLOR_WARN, "a warn need is amber");
static_assert(NeedsRow::toneColor(NeedTone::Attention) == UI_COLOR_WARN, "an attention need is amber");
static_assert(NeedsRow::toneColor(NeedTone::Bad) == UI_COLOR_BAD, "a bad need is red");

static void sceneNeedsRow(MemCanvas& c) {
  const uint32_t n = kNow.epoch;
  NeedItem a; a.source = "Pi Hub"; a.tone = NeedTone::Bad; a.title = "The printer stopped"; a.detail = "Nozzle clog at layer 112"; a.asOf = n - 3 * kHour - 28 * 60;
  a.area = "Workshop"; a.actionKey = "judge_it";
  NeedItem b; b.source = "Local AI"; b.tone = NeedTone::Attention; b.title = "Local AI isn't answering"; b.detail = "The PC may be off or asleep"; b.asOf = n - 3 * 86400;
  b.actionKey = "source_down";
  NeedItem d; d.source = "Pi Hub"; d.tone = NeedTone::Warn; d.title = "A very long title that has to be cut with an ellipsis before it meets the action"; d.detail = "No time, no action key, own source";
  d.actionKey = "not_a_phrase";
  NeedsRow::draw(c, Rect{12, 8, 456, NeedsRow::kHeight}, a, kNow, "Pi Hub");
  NeedsRow::draw(c, Rect{12, 88, 456, NeedsRow::kHeight}, b, kNow, "Pi Hub");
  NeedsRow::draw(c, Rect{12, 168, 456, NeedsRow::kHeight}, d, kNow, "Pi Hub");
}

static void sceneMeter(MemCanvas& c) {
  struct Row { const char* what; Reading r; float f; };
  const uint32_t n = kNow.epoch;
  const Row rows[] = {
      {"0%", Reading::live("0", n), 0.0f}, {"42%", Reading::live("42", n), 0.42f}, {"100%", Reading::live("100", n), 1.0f},
      {"stale 60%", Reading::stale("60", n - 3 * kHour), 0.6f}, {"unavailable", Reading::unavailable(), 0.5f},
      {"no real fraction", Reading::live("x", n), NAN}, {"never read", Reading::neverRead(), 0.2f},
  };
  int y = 16;
  for (const Row& row : rows) {
    c.text(16, y + 14, row.what, UiFont::Fs3, UI_COLOR_TEXT, UI_COLOR_BG);
    if (!Meter::draw(c, Rect{200, y, 260, 20}, row.r, row.f)) c.text(200, y + 14, UI_WORD_UNKNOWN, UiFont::Fs3, UI_COLOR_UNKNOWN, UI_COLOR_BG);
    y += 40;
  }
}

static void sceneFrameLevel1(MemCanvas& c) {
  Frame::draw(c, "Printer", Level::One);
  caption(c, 16, 64, "Level::One: Back is drawn disabled, in its place; Home works");
}
static void sceneFrameLevel2(MemCanvas& c) {
  Frame::draw(c, "Time zone and a long setting name that has to be cut", Level::Two);
  Frame::draw(c, "Night mode", Level::Two, "Current setting unknown", UI_COLOR_UNKNOWN);
  caption(c, 16, 64, "Level::Two: Back and Home in the same two places");
}

static void sceneStepper(MemCanvas& c) {
  Stepper::draw(c, Rect{60, 16, 360, 56}, "60", "%", true, true, UI_COLOR_BG);
  Stepper::draw(c, Rect{60, 88, 360, 56}, "0", "%", false, true, UI_COLOR_BG);
  Stepper::draw(c, Rect{60, 160, 360, 56}, "100", "%", true, false, UI_COLOR_BG);
  Stepper::draw(c, Rect{60, 232, 360, 56}, nullptr, nullptr, true, true, UI_COLOR_BG);
}

static void sceneSwitch(MemCanvas& c) {
  Switch::draw(c, Rect{0, 16, 480, Switch::kHeight}, "Night mode", SwitchState::On, UI_COLOR_BG);
  Switch::draw(c, Rect{0, 88, 480, Switch::kHeight}, "Sound", SwitchState::Off, UI_COLOR_BG);
  Switch::draw(c, Rect{0, 160, 480, Switch::kHeight}, "Alerts", SwitchState::Unknown, UI_COLOR_BG);
}

static const PickerOption kDateFormats[] = {{"24 hour, day first"}, {"12 hour, month first"}, {"ISO 8601"}};
static const PickerOption kZones[] = {{"UTC"}, {"London"}, {"Paris"}, {"Athens"}, {"Moscow"}, {"Dubai"}, {"Delhi"}, {"Bangkok"}, {"Tokyo"}, {"Sydney"}, {"Auckland"}};
static const PickerOption kColours[] = {{"Teal", true, UI_COLOR_ACCENT}, {"Green", true, UI_COLOR_OK}, {"Amber", true, UI_COLOR_WARN}, {"Red", true, UI_COLOR_BAD}};
static const PickerOption kLong[] = {
    {"Keep the bed heated"},
    {"Cool down, then show the finished print on the display and tell me by email as well as a message"},
    {"Do nothing"},
    {"Averyveryverylongsinglewordthatcannotbebrokenatanyspaceandmustwrapbetweencharacters"},
};
static const PickerOption kAlerts[] = {{"Everything"}, {"Only what needs me"}, {"Nothing"}, {"Quiet hours"}};

static void scenePicker(MemCanvas& c, const char* title, const PickerOption* o, int n, int current, int fail = -1, const char* reason = nullptr) {
  Picker p(title, o, n, current);
  if (fail >= 0) p.failed(fail, reason);
  p.draw(c);
}
static void scenePickerFits(MemCanvas& c) { scenePicker(c, "Date format", kDateFormats, 3, 1); }
static void scenePickerFirstPage(MemCanvas& c) { scenePicker(c, "Time zone", kZones, 11, 2); }
static void scenePickerScrolls(MemCanvas& c) { scenePicker(c, "Time zone", kZones, 11, 9); }
static void scenePickerColours(MemCanvas& c) { scenePicker(c, "Accent colour", kColours, 4, 0); }
static void scenePickerLong(MemCanvas& c) { scenePicker(c, "After a print", kLong, 4, 0); }
static void scenePickerFailure(MemCanvas& c) { scenePicker(c, "Alert policy", kAlerts, 4, 1, 2, "no connection to the Pi"); }
static void scenePickerUnknown(MemCanvas& c) { scenePicker(c, "Alert policy", kAlerts, 4, -1); }
static void scenePickerEmpty(MemCanvas& c) { scenePicker(c, "Gauge style", nullptr, 0, -1); }

struct Scene { const char* name; void (*draw)(MemCanvas&); };
static const Scene kScenes[] = {
    {"chip", sceneChip}, {"button", sceneButton}, {"ageline", sceneAgeLine},
    {"faceplate-live", sceneFaceplateLive}, {"faceplate-honest", sceneFaceplateHonest},
    {"lamprow-live", sceneLampRowA}, {"lamprow-honest", sceneLampRowB}, {"needsrow", sceneNeedsRow}, {"meter", sceneMeter},
    {"frame-level-1", sceneFrameLevel1}, {"frame-level-2", sceneFrameLevel2}, {"stepper", sceneStepper}, {"switch", sceneSwitch},
    {"picker-fits", scenePickerFits}, {"picker-first-page", scenePickerFirstPage}, {"picker-scrolls-below-first-page", scenePickerScrolls},
    {"picker-colours", scenePickerColours}, {"picker-long-label", scenePickerLong}, {"picker-failure", scenePickerFailure},
    {"picker-unknown", scenePickerUnknown}, {"picker-empty", scenePickerEmpty},
};

// ---------------------------------------------------------------- checks

static std::string gFontsDir;
static int gChecks = 0;
static std::vector<std::string> gFailures;
static void check(bool ok, const std::string& what) {
  gChecks++;
  if (!ok) gFailures.push_back(what);
}
#define CHECK(cond, what) check((cond), std::string(what))

static_assert(statusOf(Reading::stale("1", 1), Tone::Ok) == ChipKind::Unknown, "a stale reading is never ok");
static_assert(statusOf(Reading::unavailable(), Tone::Ok) == ChipKind::Unknown, "an unavailable reading is never ok");
static_assert(statusOf(Reading::neverRead(), Tone::Ok) == ChipKind::Unknown, "a never-read reading is never ok");
static_assert(statusOf(Reading{}, Tone::Ok) == ChipKind::Unknown, "a default Reading is unknown");
static_assert(statusOf(Reading::live(nullptr, 1), Tone::Ok) == ChipKind::Unknown, "a live reading with no value is unknown");
static_assert(statusOf(Reading::live("1", 1), Tone::Bad) == ChipKind::Bad, "a live reading takes its tone");
static_assert(Button::bounds(Rect{0, 0, 10, 10}).w == 48 && Button::bounds(Rect{0, 0, 10, 10}).h == 48, "buttons are at least 48 px");

static void checkFonts(MemCanvas& c) {
  const UiFont all[] = {UiFont::Fs3, UiFont::Fs4, UiFont::Fs5, UiFont::Fs6, UiFont::Readout};
  const int px[] = {14, 16, 20, 26, 34};
  for (int i = 0; i < 5; i++) {
    CHECK(fontPx(all[i]) == px[i] && fontPx(all[i]) >= 14, "font size " + std::to_string(i));
    const VlwFont& f = c.font(all[i]);
    CHECK(f.ascent == ascent(all[i]) && f.descent == descent(all[i]), "fonts.h metrics match the VLW header, font " + std::to_string(i));
    CHECK(f.find('A') && f.find('z') && f.find('0') && f.find(0xB7) && f.find(0x2026) && f.find(0x2212), "glyph coverage, font " + std::to_string(i));
    int prev = -1;
    bool sorted = true;
    for (const VlwGlyph& g : f.glyphs) { if (g.code <= prev) sorted = false; prev = g.code; }
    CHECK(sorted, "glyphs ascending, font " + std::to_string(i));
    CHECK(f.glyphs.empty() || f.glyphs.back().code < 0x3000, "Latin only, font " + std::to_string(i));
  }
}

static void checkButton() {
  const Rect b = Button::bounds(Rect{5, 6, 20, 30});
  CHECK(b.x == 5 && b.y == 6 && b.w == 48 && b.h == 48, "a small button grows to 48 x 48 from its top left");
  CHECK(Button::hit(Rect{0, 0, 20, 20}, true, 40, 40), "a tap in the grown area presses the button");
  CHECK(!Button::hit(Rect{0, 0, 100, 48}, false, 10, 10), "a disabled button isn't pressed");
}

static long lampColours(MemCanvas& c) {
  return c.count(UI_COLOR_OK) + c.count(UI_COLOR_WARN) + c.count(UI_COLOR_BAD);
}

static void checkHonest() {
  // K6: nothing that is not live can draw a lamp colour, whatever tone is asked for, in any part that takes a Reading.
  MemCanvas c;
  c.loadFonts(gFontsDir);
  const uint32_t n = kNow.epoch;
  const Reading nots[] = {Reading::stale("5", n - 2 * kHour), Reading::unavailable(), Reading::neverRead(), Reading::live(nullptr, n), Reading{}};
  const Tone tones[] = {Tone::Ok, Tone::Warn, Tone::Bad};
  for (const Reading& r : nots) {
    for (Tone t : tones) {
      c.clear(UI_COLOR_BG);
      Faceplate::draw(c, Rect{12, 12, 456, 140}, "Reading", r, t, UI_WORD_UP, true, kNow);
      CHECK(lampColours(c) == 0, "Faceplate draws a lamp colour for a reading that is not live");
      bool word = false;
      for (const TextCall& tc : c.texts) if (tc.s == UI_WORD_UP) word = true;
      CHECK(!word, "Faceplate never says Up for a reading that is not live");
      c.clear(UI_COLOR_BG);
      LampRow row{"Row", r, t, nullptr};
      row.draw(c, Rect{0, 0, 480, LampRow::kHeight}, kNow, UI_COLOR_BG);
      CHECK(lampColours(c) == 0, "LampRow draws a lamp colour for a reading that is not live");
      c.clear(UI_COLOR_BG);
      CHECK(!Meter::draw(c, Rect{0, 0, 200, 20}, r, 0.5f) || r.known(), "Meter draws a bar for a reading with no value");
    }
  }
  // the positive control: a live one does draw its lamp
  c.clear(UI_COLOR_BG);
  Faceplate::draw(c, Rect{12, 12, 456, 140}, "Reading", Reading::live("5", n), Tone::Ok, UI_WORD_UP, false, kNow);
  CHECK(c.count(UI_COLOR_OK) > 0, "a live ok reading draws the ok lamp");
  // a stale value stays visible, with its age, and says Unknown on the lamp
  c.clear(UI_COLOR_BG);
  Faceplate::draw(c, Rect{12, 12, 456, 140}, "Reading", Reading::stale("212", n - 3 * kHour - 28 * 60, "C"), Tone::Ok, UI_WORD_UP, false, kNow);
  bool value = false, age = false, unknown = false;
  for (const TextCall& tc : c.texts) { value |= tc.s == "212"; age |= tc.s == "since 07:12"; unknown |= tc.s == UI_WORD_UNKNOWN; }
  CHECK(value && age && unknown, "a stale Faceplate shows the old value, its age, and Unknown on the lamp");
  // a never-read one says Unknown in place of the number, and no age is made up
  c.clear(UI_COLOR_BG);
  Faceplate::draw(c, Rect{12, 12, 456, 140}, "Reading", Reading::neverRead(), Tone::Ok, UI_WORD_UP, false, kNow);
  int unknowns = 0;
  for (const TextCall& tc : c.texts) if (tc.s == UI_WORD_UNKNOWN) unknowns++;
  CHECK(unknowns == 3, "a never-read Faceplate says Unknown on the lamp, as the reading and as its age");
  // an ok lamp for a live-but-no-value LampRow is unknown, not ok
  CHECK(statusOf(Reading::live("1", n), Tone::Ok) == ChipKind::Ok, "a live reading is ok");
}

static void checkControls(MemCanvas& c) {
  CHECK(Stepper::hit(Rect{0, 0, 360, 48}, nullptr, true, true, 24, 24) == StepperHit::None, "a Stepper with no value can't be stepped");
  CHECK(Stepper::hit(Rect{0, 0, 360, 48}, "5", true, true, 24, 24) == StepperHit::Dec, "Stepper minus");
  CHECK(Stepper::hit(Rect{0, 0, 360, 48}, "5", true, true, 340, 24) == StepperHit::Inc, "Stepper plus");
  CHECK(Stepper::hit(Rect{0, 0, 360, 48}, "5", false, true, 24, 24) == StepperHit::None, "a Stepper at its minimum can't go down");
  CHECK(Stepper::decRect(Rect{0, 0, 360, 48}).w >= 48 && Stepper::incRect(Rect{0, 0, 360, 48}).h >= 48, "Stepper keys are 48 px");
  CHECK(!Switch::hit(Rect{0, 0, 480, 56}, SwitchState::Unknown, 20, 20), "a Switch that is Unknown ignores taps");
  CHECK(Switch::hit(Rect{0, 0, 480, 56}, SwitchState::Off, 20, 20), "a Switch that is Off flips");
  c.clear(UI_COLOR_BG);
  Switch::draw(c, Rect{0, 0, 480, 56}, "Alerts", SwitchState::Unknown, UI_COLOR_BG);
  bool off = false, unknown = false;
  for (const TextCall& tc : c.texts) { off |= tc.s == UI_TEXT_OFF; unknown |= tc.s == UI_WORD_UNKNOWN; }
  CHECK(!off && unknown, "an Unknown Switch says Unknown, never Off");
  CHECK(c.count(UI_COLOR_MUTED, 400, 0, 480, 56) == 0 && c.count(UI_COLOR_ACCENT) == 0, "an Unknown Switch draws no knob");
  CHECK(Frame::backRect().w >= 48 && Frame::backRect().h >= 48 && Frame::homeRect().w >= 48, "Back and Home are at least 48 px");
  CHECK(Frame::hit(Level::One, 10, 10) == FrameHit::None && Frame::hit(Level::Two, 10, 10) == FrameHit::Back, "Back works at level two only");
  CHECK(Frame::hit(Level::One, 470, 10) == FrameHit::Home && Frame::hit(Level::Two, 470, 10) == FrameHit::Home, "Home works at both levels");
  CHECK(Frame::content(kTabBarH).y == kHeaderH && Frame::content(kTabBarH).bottom() == kScreenH - kTabBarH, "content sits between the header and the tab bar");
}

static void checkMeter(MemCanvas& c) {
  const Reading live = Reading::live("1", kNow.epoch);
  c.clear(UI_COLOR_BG);
  CHECK(Meter::draw(c, Rect{0, 0, 200, 20}, live, 0.5f), "a real fraction draws");
  CHECK(!Meter::draw(c, Rect{0, 0, 200, 20}, live, NAN), "NaN isn't a fraction");
  CHECK(!Meter::draw(c, Rect{0, 0, 200, 20}, live, -0.1f) && !Meter::draw(c, Rect{0, 0, 200, 20}, live, 1.5f), "outside 0..1 isn't a fraction");
  CHECK(!Meter::draw(c, Rect{0, 0, 200, 20}, Reading::unavailable(), 0.5f), "an unavailable reading draws no bar");
}

// Counts pixels of `color` in the list area, below the header.
static void checkPicker(MemCanvas& c) {
  struct Case { const PickerOption* o; int n; };
  std::vector<PickerOption> forty, ninetySix;
  for (int i = 0; i < 40; i++) forty.push_back({"Option"});
  for (int i = 0; i < 96; i++) ninetySix.push_back({"A time"});
  const Case cases[] = {{nullptr, 0}, {kDateFormats, 3}, {kAlerts, 4}, {kZones, 5}, {kZones, 11}, {kColours, 4}, {kLong, 4}, {forty.data(), 40}, {ninetySix.data(), 96}};
  for (const Case& cs : cases) {
    for (int tab = 0; tab <= 1; tab++) {
      for (int cur = -1; cur < cs.n; cur++) {
        const std::string id = "count " + std::to_string(cs.n) + " current " + std::to_string(cur) + " tab " + std::to_string(tab);
        Picker p("Setting", cs.o, cs.n, cur, tab ? kTabBarH : 0);
        c.clear(UI_COLOR_BG);
        p.draw(c);
        const Rect area = Frame::content(tab ? kTabBarH : 0);
        // opens with the current choice in view
        if (cur >= 0) CHECK(p.firstVisible(c) <= cur && cur < p.endVisible(c), "opens with the current choice in view, " + id);
        // rows: at least 48 tall, inside the content area, never overlapping
        int prevBottom = area.y;
        bool rowsOk = true, inside = true;
        for (int i = p.firstVisible(c); i < p.endVisible(c); i++) {
          const Rect r = p.rowRect(c, i);
          rowsOk &= r.h >= 48 && r.y >= prevBottom;
          inside &= r.y >= area.y && r.bottom() <= area.bottom();
          prevBottom = r.bottom();
        }
        CHECK(rowsOk, "rows are at least 48 px and don't overlap, " + id);
        CHECK(inside, "rows fit in the content area, " + id);
        if (p.scrolls(c)) {
          const Rect a = p.previousRect(c), b = p.nextRect(c);
          CHECK(a.w >= 48 && a.h >= 48 && b.w >= 48 && b.h >= 48, "scroll keys are at least 48 px, " + id);
          CHECK(a.bottom() + kGap <= b.y, "scroll keys keep 8 px apart, " + id);
        }
        // Previous returns to the first page from wherever it opened, and Next then reaches every option
        for (int guard = 0; guard < 200 && p.firstVisible(c) > 0; guard++) {
          const Rect pv = p.previousRect(c);
          if (p.tap(c, pv.x + 4, pv.y + 4).event != PickerEvent::Scrolled) break;
        }
        CHECK(cs.n == 0 || p.firstVisible(c) == 0, "paging with Previous returns to the first page, " + id);
        std::vector<int> seen(static_cast<size_t>(cs.n), 0);
        for (int guard = 0; guard < 200; guard++) {
          for (int i = p.firstVisible(c); i < p.endVisible(c); i++) seen[static_cast<size_t>(i)]++;
          if (!p.scrolls(c) || p.endVisible(c) >= cs.n) break;
          const Rect nx = p.nextRect(c);
          if (p.tap(c, nx.x + 4, nx.y + 4).event != PickerEvent::Scrolled) break;
        }
        bool once = true;
        for (int s : seen) once &= s == 1;
        CHECK(once, "paging with Next shows every option exactly once, " + id);
      }
    }
  }

  // each option's row text is whole: wrapped lines concatenate back to the label, and sit inside the row
  {
    Picker p("After a print", kLong, 4, 0);
    c.clear(UI_COLOR_BG);
    p.draw(c);
    for (int i = 0; i < 4; i++) {
      const Rect r = p.rowRect(c, i);
      std::string joined;
      bool within = true;
      for (const TextCall& tc : c.texts) {
        if (tc.baseline <= r.y || tc.baseline > r.bottom() + 20 || tc.x >= r.right() || tc.font != Picker::kFont || tc.fg == UI_COLOR_MUTED) continue;
        if (tc.baseline - ascent(tc.font) < r.y || tc.baseline + descent(tc.font) > r.bottom()) within = false;
        if (tc.x + tc.width > r.right() - 52) within = false;
        if (!joined.empty() && tc.baseline > r.y) joined += " ";
        joined += tc.s;
      }
      const std::string label = kLong[i].label;
      std::string squeezed;
      for (char ch : joined) if (ch != ' ') squeezed += ch;
      std::string want;
      for (char ch : label) if (ch != ' ') want += ch;
      CHECK(squeezed == want, "a long label is shown in full, row " + std::to_string(i) + ": got '" + joined + "'");
      CHECK(within, "a long label stays inside its row, row " + std::to_string(i));
    }
    CHECK(c.missingGlyphs == 0, "no glyph missing from the fonts in the long-label picker");
  }

  // taps
  {
    Picker p("Date format", kDateFormats, 3, 1);
    c.clear(UI_COLOR_BG);
    p.draw(c);
    const Rect r2 = p.rowRect(c, 2);
    const PickerResult chose = p.tap(c, 100, r2.y + 10);
    CHECK(chose.event == PickerEvent::Chose && chose.index == 2, "a tap on a row chooses it");
    CHECK(p.current() == 1, "choosing doesn't move the current value: the app does that once it has saved");
    CHECK(p.tap(c, 10, 10).event == PickerEvent::Back, "Back reports Back");
    CHECK(p.tap(c, 470, 10).event == PickerEvent::Home, "Home reports Home");
    CHECK(p.current() == 1 && !p.hasFailure(), "Back and Home change nothing");
    CHECK(p.tap(c, 100, 300).event == PickerEvent::None, "a tap below the list does nothing");
  }

  // failure: stays open, says why, the previous value keeps its check mark
  {
    Picker p("Alert policy", kAlerts, 4, 1);
    c.clear(UI_COLOR_BG);
    p.draw(c);
    const Rect r2 = p.rowRect(c, 2);
    CHECK(p.tap(c, 100, r2.y + 10).event == PickerEvent::Chose, "the failure case starts with a tap");
    p.failed(2, "no connection to the Pi");
    c.clear(UI_COLOR_BG);
    p.draw(c);
    bool saidSo = false, saidWhy = false;
    for (const TextCall& tc : c.texts) { saidSo |= tc.s.find("Not saved") == 0; saidWhy |= tc.s.find("no connection to the Pi") != std::string::npos; }
    CHECK(saidSo && saidWhy, "the failed row says it wasn't saved, and why");
    CHECK(p.current() == 1 && p.hasFailure(), "after a failure the previous value is still the current one and the Picker is open");
    const Rect r1 = p.rowRect(c, 1);
    long checks = 0;
    for (const LineCall& l : c.lines) if (l.color == UI_COLOR_ACCENT_TEXT && l.y0 >= r1.y && l.y1 < r1.bottom() && l.y0 >= kHeaderH) checks++;
    CHECK(checks >= 3, "the previous value still has its check mark after a failure");
    const Rect rf = p.rowRect(c, 2);
    bool markOnFailed = false;
    for (const LineCall& l : c.lines) if (l.color == UI_COLOR_ACCENT_TEXT && l.y0 >= rf.y && l.y1 < rf.bottom() && l.y0 >= kHeaderH) markOnFailed = true;
    CHECK(!markOnFailed, "the row that failed is not checked");
    // and the next tap clears the message
    CHECK(p.tap(c, 100, p.rowRect(c, 0).y + 10).event == PickerEvent::Chose && !p.hasFailure(), "a new try clears the failure");
  }

  // unknown: no check mark, no row selected, the title line says so
  {
    Picker p("Alert policy", kAlerts, 4, -1);
    c.clear(UI_COLOR_BG);
    p.draw(c);
    long checks = 0, accentText = 0;
    for (const LineCall& l : c.lines) if (l.y0 >= kHeaderH) checks++;
    for (const TextCall& tc : c.texts) if (tc.baseline > kHeaderH && tc.fg == UI_COLOR_ACCENT_TEXT) accentText++;
    CHECK(checks == 0 && accentText == 0, "with the current value unknown no row is checked or marked");
    bool says = false;
    for (const TextCall& tc : c.texts) says |= tc.s == "Current setting unknown" && tc.baseline < kHeaderH;
    CHECK(says, "the title line says Current setting unknown");
    CHECK(p.current() == -1, "the first option is not pre-selected");
    // an out-of-range current is unknown too, never the nearest option
    Picker q("Alert policy", kAlerts, 4, 7);
    CHECK(q.current() == -1, "a current index outside the list is unknown");
  }
}

static void checkText(MemCanvas& c) {
  // wrapText never drops text and never shrinks: lines rebuild the string, and each fits.
  const char* samples[] = {"short", "two words here that should wrap onto a second line for sure", "Averyveryverylongsinglewordthatcannotbebroken",
                           "ends with spaces   ", "  leading"};
  for (const char* s : samples) {
    TextLine tl[8];
    const int n = wrapText(c, s, UiFont::Fs4, 200, tl, 8);
    std::string joined, want;
    bool fits = true;
    for (int i = 0; i < n && i < 8; i++) {
      const std::string line(s + tl[i].start, tl[i].len);
      joined += line;
      fits &= c.textWidth(line.c_str(), UiFont::Fs4) <= 200;
    }
    for (const char* p = s; *p; p++) if (*p != ' ') want += *p;
    std::string got;
    for (char ch : joined) if (ch != ' ') got += ch;
    CHECK(got == want && fits, std::string("wrapText keeps all text and fits: ") + s);
  }
  char buf[kTextMax + 1];
  CHECK(ellipsize(c, "A long title that will not fit in sixty pixels", UiFont::Fs4, 60, buf, sizeof buf) && c.textWidth(buf, UiFont::Fs4) <= 60, "ellipsize fits");
  CHECK(!ellipsize(c, "Short", UiFont::Fs4, 200, buf, sizeof buf) && std::string(buf) == "Short", "ellipsize leaves what fits");
  // needPhrase: the web's rules
  char out[96];
  CHECK(needPhrase(out, sizeof out, "judge_it", nullptr) && std::string(out) == "Judge it", "needPhrase finds a key");
  CHECK(needPhrase(out, sizeof out, "source_down", "Local AI") && std::string(out) == "Local AI isn't answering", "needPhrase fills {name}");
  CHECK(!needPhrase(out, sizeof out, "source_down", nullptr) && out[0] == '\0', "a phrase that needs a name says nothing without one");
  CHECK(!needPhrase(out, sizeof out, "nope", "x") && out[0] == '\0', "an unknown key says nothing");
}

static int runCheck(const char* fonts) {
  MemCanvas c;
  if (!c.loadFonts(fonts)) return 2;
  gFontsDir = fonts;
  checkFonts(c);
  checkButton();
  checkHonest();
  checkControls(c);
  checkMeter(c);
  checkText(c);
  checkPicker(c);
  // every scene draws only glyphs the fonts have, and no text below 14 px
  for (const Scene& s : kScenes) {
    c.clear(UI_COLOR_BG);
    s.draw(c);
    CHECK(c.missingGlyphs == 0, std::string("scene ") + s.name + " uses a glyph the fonts lack");
    bool small = false;
    for (const TextCall& tc : c.texts) small |= fontPx(tc.font) < 14;
    CHECK(!small, std::string("scene ") + s.name + " has text under 14 px");
  }
  for (const std::string& f : gFailures) std::fprintf(stderr, "FAIL: %s\n", f.c_str());
  std::printf("%d checks, %zu failed\n", gChecks, gFailures.size());
  return gFailures.empty() ? 0 : 1;
}

static int runRender(const char* fonts, const char* outDir) {
  MemCanvas c;
  if (!c.loadFonts(fonts)) return 2;
  for (const Scene& s : kScenes) {
    c.clear(UI_COLOR_BG);
    s.draw(c);
    const std::string path = std::string(outDir) + "/" + s.name + ".rgb565";
    FILE* f = std::fopen(path.c_str(), "wb");
    if (!f) { std::fprintf(stderr, "cannot write %s\n", path.c_str()); return 2; }
    for (uint16_t p : c.px) { std::fputc(p & 255, f); std::fputc(p >> 8, f); }
    std::fclose(f);
    std::printf("%s\n", s.name);
  }
  return 0;
}

int main(int argc, char** argv) {
  const std::string mode = argc > 1 ? argv[1] : "";
  if (mode == "render" && argc == 4) return runRender(argv[2], argv[3]);
  if (mode == "check" && argc == 3) return runCheck(argv[2]);
  if (mode == "age") {
    const uint32_t offsets[] = {0, 1, 59, 60, 61, 119, 120, 240, 3599, 3600, 3 * 3600 + 28 * 60, 86399, 86400, 3 * 86400, 40 * 86400};
    for (uint32_t s : offsets) {
      char buf[48];
      ageText(buf, sizeof buf, kNow.epoch - s, kNow);
      std::printf("%u\t%s\n", s, buf);
    }
    return 0;
  }
  if (mode == "tints") {
    const uint16_t bgs[3] = {UI_COLOR_BG, UI_COLOR_SURFACE, UI_COLOR_SURFACE_2};
    const char* bn[3] = {"bg", "surface", "surface2"};
    const char* kn[4] = {"ok", "warn", "bad", "unknown"};
    const ChipKind ks[4] = {ChipKind::Ok, ChipKind::Warn, ChipKind::Bad, ChipKind::Unknown};
    for (int k = 0; k < 4; k++) for (int b = 0; b < 3; b++) std::printf("%s %s 0x%04X\n", kn[k], bn[b], Chip::tint(ks[k], bgs[b]));
    for (int b = 0; b < 3; b++) std::printf("accentSoft %s 0x%04X\n", bn[b], blend565(UI_COLOR_ACCENT, bgs[b], 14));
    return 0;
  }
  std::fprintf(stderr, "usage: harness render <fonts> <out> | check <fonts> | age | tints\n");
  return 64;
}
