// src/words.json (the state words and the age rules) and the PHRASES in src/needs.js → dist/words.h and dist/needs.h.
// One table feeds the web (needs.js is built with it) and the display, so neither can word a state or an age its own way.
import fs from 'node:fs';
import path from 'node:path';

export const loadWords = root => JSON.parse(fs.readFileSync(path.join(root, 'src/words.json'), 'utf8'));

// The table's problems, as sentences; empty when it is sound. Text is ASCII (the display font is Latin only), has no
// printf directive of its own, and the rules run in order of `under` so the first match is the right one.
export function checkWords(w) {
  const out = [];
  const text = (where, s) => {
    if (typeof s !== 'string' || !s) out.push(`${where}: text is missing`);
    else if (/[^\x20-\x7e]/.test(s) || /["\\%]/.test(s)) out.push(`${where}: "${s}" must be plain ASCII without " \\ or %`);
  };
  for (const k of ['up', 'down', 'unknown', 'running', 'waiting']) text(`state.${k}`, w.state?.[k]);
  for (const k of Object.keys(w.state || {})) if (!['up', 'down', 'unknown', 'running', 'waiting'].includes(k)) out.push(`state.${k}: not a known state`);
  const controls = ['back', 'home', 'on', 'off', 'previous', 'next', 'current_unknown', 'not_saved', 'no_choices'];
  for (const k of controls) text(`control.${k}`, w.control?.[k]);
  for (const k of Object.keys(w.control || {})) if (!controls.includes(k)) out.push(`control.${k}: not a known control word`);
  text('age.since', w.age?.since);
  if (w.age?.since && !w.age.since.includes('{when}')) out.push('age.since: needs {when}');
  const rules = w.age?.ago;
  if (!Array.isArray(rules) || !rules.length) out.push('age.ago: needs at least one rule');
  else rules.forEach((r, i) => {
    text(`age.ago[${i}]`, r.text);
    if (!(Number.isInteger(r.under) && r.under > 0)) out.push(`age.ago[${i}]: under must be a whole number of seconds`);
    if (i && r.under <= rules[i - 1].under) out.push(`age.ago[${i}]: rules must run in order of under`);
    const counted = (r.text || '').includes('{n}');
    if (counted !== (r.per !== undefined)) out.push(`age.ago[${i}]: {n} and per go together`);
    if (r.per !== undefined && !(Number.isInteger(r.per) && r.per > 0)) out.push(`age.ago[${i}]: per must be a whole number of seconds`);
  });
  return out;
}

const cstr = s => JSON.stringify(s);
const fmt = s => s.replace('{n}', '%u').replace('{when}', '%s');

export function wordsH(w, banner) {
  return [`// ${banner}`, '#pragma once',
    '// The state words, the display controls\' words and the age rules, as the web words them (src/words.json). C and C++.',
    ...Object.entries(w.state).map(([k, v]) => `#define UI_WORD_${k.toUpperCase()} ${cstr(v)}`),
    '// The words on the display\'s own controls (Back, Home, a switch, the Picker); the web has no use for them yet.',
    ...Object.entries(w.control).map(([k, v]) => `#define UI_TEXT_${k.toUpperCase()} ${cstr(v)}`),
    '// An age in seconds is worded by the first rule whose `under` it is below: its text, with %u the whole number of',
    '// `per` seconds. Past the last rule, say UI_AGE_SINCE_FMT with the clock time (today) or the day (earlier) for %s.',
    'typedef struct { unsigned under; unsigned per; const char *fmt; } UiAgeRule;',
    'static const UiAgeRule UI_AGE_RULES[] = {',
    ...w.age.ago.map(r => `  { ${r.under}, ${r.per || 0}, ${cstr(fmt(r.text))} },`),
    '};',
    `#define UI_AGE_RULE_COUNT ${w.age.ago.length}`,
    `#define UI_AGE_SINCE_FMT ${cstr(fmt(w.age.since))}`, ''].join('\n');
}

// Placeholders stay as {name} in the text, as on the web: the caller fills them.
export function needsH(phrases, banner) {
  const keys = Object.keys(phrases);
  return [`// ${banner}`, '#pragma once',
    '// The Needs-you phrases an item\'s action.key names, with the web\'s words (src/needs.js). {name} in a text is the',
    '// item\'s source; a phrase that has it and an item without a source says nothing. C and C++.',
    ...keys.map(k => `#define UI_NEED_${k.toUpperCase()} ${cstr(phrases[k])}`),
    'typedef struct { const char *key; const char *text; } UiNeedPhrase;',
    'static const UiNeedPhrase UI_NEED_PHRASES[] = {',
    ...keys.map(k => `  { ${cstr(k)}, ${cstr(phrases[k])} },`),
    '};',
    `#define UI_NEED_PHRASE_COUNT ${keys.length}`, ''].join('\n');
}
