// A UiCanvas over an in-memory RGB565 buffer, drawing text from the real VLW files in dist/display/fonts (display-kit K8).
// It also records what was drawn, so the checks can ask "was a check mark drawn" or "was any text under 14 px".
#pragma once
#include <cstdint>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <fstream>
#include <iterator>
#include <string>
#include <vector>
#include "display/ui.h"

struct VlwGlyph { int code, h, w, adv, dy, dx; size_t offset; };

struct VlwFont {
  std::vector<uint8_t> data;
  std::vector<VlwGlyph> glyphs;
  int ascent = 0, descent = 0, lineHeight = 0;

  static int32_t i32(const uint8_t* p) {
    return static_cast<int32_t>((uint32_t(p[0]) << 24) | (uint32_t(p[1]) << 16) | (uint32_t(p[2]) << 8) | uint32_t(p[3]));
  }
  // False if the file isn't a version 11 VLW whose glyph table and bitmaps account for every byte.
  bool load(const std::string& path) {
    std::ifstream f(path, std::ios::binary);
    if (!f) return false;
    data.assign(std::istreambuf_iterator<char>(f), std::istreambuf_iterator<char>());
    if (data.size() < 24 || i32(&data[4]) != 11) return false;
    const int count = i32(&data[0]);
    lineHeight = i32(&data[8]);
    ascent = i32(&data[16]);
    descent = i32(&data[20]);
    size_t bitmap = 24 + static_cast<size_t>(count) * 28;
    if (data.size() < bitmap) return false;
    for (int i = 0; i < count; i++) {
      const uint8_t* g = &data[24 + static_cast<size_t>(i) * 28];
      VlwGlyph v{i32(g), i32(g + 4), i32(g + 8), i32(g + 12), i32(g + 16), i32(g + 20), bitmap};
      bitmap += static_cast<size_t>(v.h) * static_cast<size_t>(v.w);
      glyphs.push_back(v);
    }
    return bitmap == data.size();
  }
  const VlwGlyph* find(int code) const {
    size_t lo = 0, hi = glyphs.size();
    while (lo < hi) {
      const size_t m = (lo + hi) / 2;
      if (glyphs[m].code < code) lo = m + 1; else hi = m;
    }
    return lo < glyphs.size() && glyphs[lo].code == code ? &glyphs[lo] : nullptr;
  }
};

struct TextCall { int x, baseline, width; UiFont font; uint16_t fg, bg; std::string s; };
struct LineCall { int x0, y0, x1, y1; uint16_t color; };

class MemCanvas : public UiCanvas {
 public:
  static constexpr int W = ui::kScreenW, H = ui::kScreenH;
  std::vector<uint16_t> px = std::vector<uint16_t>(W * H, 0);
  std::vector<TextCall> texts;
  std::vector<LineCall> lines;
  int missingGlyphs = 0;

  // Loads the five fonts from `dir`. False (and a message on stderr) if any is missing or malformed.
  bool loadFonts(const std::string& dir) {
    static const char* const names[5] = {UI_ARCHIVO_14_FILE, UI_ARCHIVO_16_FILE, UI_ARCHIVO_20_FILE, UI_ARCHIVO_26_FILE, UI_ARCHIVO_READOUT_34_FILE};
    for (int i = 0; i < 5; i++) {
      if (!fonts_[i].load(dir + "/" + names[i])) { std::fprintf(stderr, "cannot load font %s/%s\n", dir.c_str(), names[i]); return false; }
    }
    return true;
  }
  const VlwFont& font(UiFont f) const { return fonts_[static_cast<int>(f)]; }

  void clear(uint16_t color) {
    for (auto& p : px) p = color;
    texts.clear();
    lines.clear();
    missingGlyphs = 0;
  }
  uint16_t at(int x, int y) const { return px[static_cast<size_t>(y) * W + x]; }
  long count(uint16_t color, int x0 = 0, int y0 = 0, int x1 = W, int y1 = H) const {
    long n = 0;
    for (int y = y0; y < y1; y++) for (int x = x0; x < x1; x++) if (at(x, y) == color) n++;
    return n;
  }

  void fillRect(int x, int y, int w, int h, uint16_t color) override {
    for (int yy = y < 0 ? 0 : y; yy < y + h && yy < H; yy++)
      for (int xx = x < 0 ? 0 : x; xx < x + w && xx < W; xx++) px[static_cast<size_t>(yy) * W + xx] = color;
  }
  void fillRoundRect(int x, int y, int w, int h, int r, uint16_t color) override {
    if (r > w / 2) r = w / 2;
    if (r > h / 2) r = h / 2;
    for (int yy = y < 0 ? 0 : y; yy < y + h && yy < H; yy++) {
      for (int xx = x < 0 ? 0 : x; xx < x + w && xx < W; xx++) {
        // distance from the pixel centre to the nearest corner circle's centre, in half pixels
        const int cx = xx < x + r ? x + r : xx >= x + w - r ? x + w - r : xx;
        const int cy = yy < y + r ? y + r : yy >= y + h - r ? y + h - r : yy;
        const int dx = 2 * xx + 1 - 2 * cx, dy = 2 * yy + 1 - 2 * cy;
        if (dx * dx + dy * dy <= 4 * r * r) px[static_cast<size_t>(yy) * W + xx] = color;
      }
    }
  }
  void line(int x0, int y0, int x1, int y1, uint16_t color) override {
    lines.push_back({x0, y0, x1, y1, color});
    const int dx = std::abs(x1 - x0), dy = -std::abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    int err = dx + dy;
    for (;;) {
      if (x0 >= 0 && x0 < W && y0 >= 0 && y0 < H) px[static_cast<size_t>(y0) * W + x0] = color;
      if (x0 == x1 && y0 == y1) break;
      const int e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }
  void text(int x, int baseline, const char* s, UiFont f, uint16_t fg, uint16_t bg) override {
    texts.push_back({x, baseline, textWidth(s, f), f, fg, bg, s});
    const VlwFont& vf = font(f);
    int pen = x;
    for (const char* p = s; *p;) {
      int code, len;
      decode(p, code, len);
      p += len;
      const VlwGlyph* g = vf.find(code);
      if (!g) { missingGlyphs++; continue; }
      for (int gy = 0; gy < g->h; gy++) {
        for (int gx = 0; gx < g->w; gx++) {
          const int a = vf.data[g->offset + static_cast<size_t>(gy) * g->w + gx];
          const int xx = pen + g->dx + gx, yy = baseline - g->dy + gy;
          if (!a || xx < 0 || xx >= W || yy < 0 || yy >= H) continue;
          px[static_cast<size_t>(yy) * W + xx] = a == 255 ? fg : mixAlpha(fg, bg, a);
        }
      }
      pen += g->adv;
    }
  }
  int textWidth(const char* s, UiFont f) override {
    const VlwFont& vf = font(f);
    int w = 0;
    for (const char* p = s; *p;) {
      int code, len;
      decode(p, code, len);
      p += len;
      const VlwGlyph* g = vf.find(code);
      if (g) w += g->adv;
    }
    return w;
  }

 private:
  VlwFont fonts_[5];
  static void decode(const char* p, int& code, int& len) {
    const unsigned char c = static_cast<unsigned char>(p[0]);
    if (c < 0x80) { code = c; len = 1; }
    else if ((c >> 5) == 6 && p[1]) { code = ((c & 31) << 6) | (p[1] & 63); len = 2; }
    else if ((c >> 4) == 14 && p[1] && p[2]) { code = ((c & 15) << 12) | ((p[1] & 63) << 6) | (p[2] & 63); len = 3; }
    else { code = '?'; len = 1; }
  }
  // fg over bg at coverage a/255, per channel in 8 bits, back to RGB565 (what a smooth-font draw with a set background does).
  static uint16_t mixAlpha(uint16_t fg, uint16_t bg, int a) {
    auto ch = [a](int f, int b) { return (f * a + b * (255 - a) + 127) / 255; };
    return ui::pack565(ch(ui::expand5(fg >> 11), ui::expand5(bg >> 11)), ch(ui::expand6((fg >> 5) & 63), ui::expand6((bg >> 5) & 63)),
                       ch(ui::expand5(fg & 31), ui::expand5(bg & 31)));
  }
};
