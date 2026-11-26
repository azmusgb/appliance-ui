// ApplianceSay (2.32.0, Pi Hub amendment A37; spec 2026-11-25-spoken-readout-design S1 and S2): a page says its reading
// as one or two sentences. compose() turns a structured reading into the words; a page never writes sentence text.
// The same input always gives the same strings: compose reads no clock (the caller passes opts.now) and nothing random.
// compose(input, opts) → { label, sentences: string[] (at most two, each at most 60 characters), loading }
//   input: { page: "printer", label, reading }
//        | { page: "home", label, asks (a whole number; anything else means the list couldn't be read), unread?: string[],
//            decisions?, conditions?: { tone: "bad"|"warn", title }[], printer?: reading }
//   reading: { state: "live"|"stale"|"unavailable"|"unknown"|"loading", as_of? (ms), source?, name? ("X2D"),
//     status?: "printing"|"paused"|"finished"|"failed"|"idle", percent?, job?, left_min?, done_at? (ms), finished_at? (ms),
//     plate_ask? }
//   opts: { now (ms), clock?(ms) → "10:30 AM", ago?(seconds) → "12 min ago" (pass ApplianceNeeds.ago) }
//   Without opts.now nothing can be compared with the present, so an estimate, a stale age and "its last print" are left out.
// A fact that is missing or unusable drops its clause; it is never drawn as zero, NaN or a dash. Stale is past tense
// with its age; unavailable, unknown and loading have their own output and never the live wording. A page the module
// does not know gets no sentences, so it keeps its plain title.
(() => {
  const LIMIT = 60;  // characters per sentence, after substitution
  const PHRASES = Object.freeze({
    printing: 'The {name} is {p}% through {job}.', printing_nop: 'The {name} is printing {job}.',
    eta_both: 'About {left} left, done around {time}.', eta_left: 'About {left} left.', eta_time: 'Done around {time}.',
    paused: 'The {name} is paused at {p}%.', paused_nop: 'The {name} is paused.',
    finished_at: 'The {name} finished {job} at {time}.', finished: 'The {name} finished {job}.', clear_plate: 'Clear the plate.',
    failed: 'The {name} stopped at {p}%.', failed_nop: 'The {name} stopped.',
    idle: 'The {name} is idle.', idle_last: 'Its last print finished at {time}.',
    stale_printing: 'The {name} was {p}% through {job} {age}.', stale_other: 'The {name} was {word} {age}.',
    stale_source: "{source} hasn't answered since {time}.",
    unavailable: "The {name} isn't answering.", unknown: "The {name} hasn't reported yet.",
    job_generic: 'its print', age_unknown: 'earlier',
    // Home. The count is the rows Home drew under "Needs you" (after Pi Hub A36, the asks).
    asks_none: 'Nothing needs you.', asks_none_here: 'Nothing needs you here.',
    asks_one: 'One thing needs you.', asks_many: '{N} things need you.', asks_unreadable: "Couldn't read what needs you.",
    decisions_one: 'One decision is waiting.', decisions_many: '{N} decisions are waiting.',
    not_read: "{name} wasn't read.",
    home_printing_eta: 'The {name} is {p}% through its print, done about {time}.', home_printing: 'The {name} is {p}% through its print.',
  });
  // What a status was, for a stale reading.
  const WAS = { printing: 'printing', paused: 'paused', finished: 'finished', failed: 'stopped', idle: 'idle' };
  const WORDS_TO_TWELVE = ['One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve'];

  const fill = (key, vals) => PHRASES[key].replace(/\{(\w+)\}/g, (m, k) => (Object.hasOwn(vals, k) ? String(vals[k]) : m));
  const text = v => (typeof v === 'string' ? v.trim() : '');
  const time = v => (typeof v === 'number' && Number.isFinite(v) ? v : null);
  const fits = s => s.length <= LIMIT;

  // "One" to "Twelve", then digits; anything that isn't a whole count of at least one is no word at all.
  function count(n) {
    if (typeof n !== 'number' || !Number.isInteger(n) || n < 1) return '';
    return n <= 12 ? WORDS_TO_TWELVE[n - 1] : String(n);
  }

  // Minutes as "24 min", "1 h" or "11 h 24 min"; under a minute or unusable is nothing.
  function duration(minutes) {
    if (typeof minutes !== 'number' || !Number.isFinite(minutes)) return '';
    const m = Math.round(minutes);
    if (m < 1) return '';
    const h = Math.floor(m / 60), rest = m % 60;
    return h ? (rest ? `${h} h ${rest} min` : `${h} h`) : `${rest} min`;
  }

  const defaultClock = ms => new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  // A whole percent from 0 to 100, or null: a string, NaN or an out-of-range number is not a reading.
  const percentOf = v => (typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 100 ? Math.round(v) : null);
  // The sentence with the job's own name where that fits, else with "its print".
  function withJob(key, vals, job) {
    const named = job ? fill(key, { ...vals, job }) : '';
    return named && fits(named) ? named : fill(key, { ...vals, job: PHRASES.job_generic });
  }

  function printer(reading, o) {
    const r = reading && typeof reading === 'object' ? reading : {};
    const name = text(r.name) || 'X2D';
    const clock = ms => { const t = o.clock(ms); return typeof t === 'string' ? t : ''; };
    if (r.state === 'unavailable') return [fill('unavailable', { name })];
    const status = Object.hasOwn(WAS, r.status) ? r.status : null;
    if ((r.state !== 'live' && r.state !== 'stale') || !status) return [fill('unknown', { name })];
    const p = percentOf(r.percent), job = text(r.job);

    if (r.state === 'stale') {
      const asOf = time(r.as_of);
      const said = asOf != null && o.now != null && typeof o.ago === 'function' ? o.ago(Math.max(0, (o.now - asOf) / 1000)) : null;
      const age = typeof said === 'string' && said ? said : PHRASES.age_unknown;
      const first = status === 'printing' && p != null ? withJob('stale_printing', { name, p, age }, job)
        : fill('stale_other', { name, word: WAS[status], age });
      const source = text(r.source), since = asOf != null ? clock(asOf) : '';
      const second = source && since ? fill('stale_source', { source, time: since }) : '';
      return [first, second].filter(s => s && fits(s));
    }

    const out = [];
    if (status === 'printing') {
      out.push(p != null ? withJob('printing', { name, p }, job) : withJob('printing_nop', { name }, job));
      const left = duration(r.left_min), doneAt = time(r.done_at);
      const done = doneAt != null && o.now != null && doneAt > o.now ? clock(doneAt) : '';
      if (left && done) out.push(fill('eta_both', { left, time: done }));
      else if (left) out.push(fill('eta_left', { left }));
      else if (done) out.push(fill('eta_time', { time: done }));
    } else if (status === 'paused') {
      out.push(p != null ? fill('paused', { name, p }) : fill('paused_nop', { name }));
    } else if (status === 'failed') {
      out.push(p != null ? fill('failed', { name, p }) : fill('failed_nop', { name }));
    } else if (status === 'finished') {
      const at = time(r.finished_at) != null ? clock(r.finished_at) : '';
      out.push(at ? withJob('finished_at', { name, time: at }, job) : withJob('finished', { name }, job));
      if (r.plate_ask === true) out.push(PHRASES.clear_plate);
    } else {
      out.push(fill('idle', { name }));
      const at = time(r.finished_at);
      if (at != null && o.now != null && new Date(at).toDateString() === new Date(o.now).toDateString()) {
        const t = clock(at);
        if (t) out.push(fill('idle_last', { time: t }));
      }
    }
    return out.filter(fits).slice(0, 2);
  }

  // A whole number of things, zero included, or null: a count that can't be read is never "nothing".
  const whole = v => (typeof v === 'number' && Number.isInteger(v) && v >= 0 ? v : null);
  const sentence = title => (/[.!?]$/.test(title) ? title : title + '.');

  function home(i, o) {
    const asks = whole(i.asks);
    if (asks == null) return [PHRASES.asks_unreadable];
    const unread = (Array.isArray(i.unread) ? i.unread : []).map(text).filter(Boolean);
    const decisions = whole(i.decisions) || 0;
    const first = asks === 1 ? PHRASES.asks_one : asks > 1 ? fill('asks_many', { N: count(asks) })
      : decisions === 1 ? PHRASES.decisions_one : decisions > 1 ? fill('decisions_many', { N: count(decisions) })
      : unread.length ? PHRASES.asks_none_here : PHRASES.asks_none;

    // The second sentence: the first of these that exists and fits. One that is too long is skipped, never cut.
    const conditions = (Array.isArray(i.conditions) ? i.conditions : []).filter(c => c && typeof c === 'object' && text(c.title));
    const titled = tone => conditions.filter(c => c.tone === tone).map(c => sentence(text(c.title)));
    const running = [];
    const r = i.printer && typeof i.printer === 'object' ? i.printer : {};
    const p = percentOf(r.percent);
    if (r.state === 'live' && r.status === 'printing' && p != null) {
      const name = text(r.name) || 'X2D', doneAt = time(r.done_at);
      const t = doneAt != null && o.now != null && doneAt > o.now ? o.clock(doneAt) : '';
      if (typeof t === 'string' && t) running.push(fill('home_printing_eta', { name, p, time: t }));
      running.push(fill('home_printing', { name, p }));
    }
    const second = [...unread.slice(0, 1).map(name => fill('not_read', { name })), ...titled('bad'), ...running, ...titled('warn')].find(fits);
    return second ? [first, second] : [first];
  }

  function compose(input, opts) {
    const i = input && typeof input === 'object' ? input : {};
    const given = opts && typeof opts === 'object' ? opts : {};
    const o = {
      now: time(given.now),
      clock: typeof given.clock === 'function' ? given.clock : defaultClock,
      ago: given.ago,
    };
    const label = text(i.label);
    if (i.page === 'printer') {
      if (i.reading && i.reading.state === 'loading') return { label, sentences: [], loading: true };
      return { label, sentences: printer(i.reading, o), loading: false };
    }
    if (i.page === 'home') return { label, sentences: home(i, o), loading: false };
    return { label, sentences: [], loading: false };
  }

  const api = { compose, count, duration, PHRASES };
  if (typeof window !== 'undefined') window.ApplianceSay = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
