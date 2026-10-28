// ApplianceNeeds: draws the "Needs you" list the same way in every app. Item data goes in through textContent only.
// item: {id, source, tone: "bad"|"attention"|"warn", title, detail, link?, action?: {key, link}, urgent?, as_of?}
(() => {
  const PHRASES = {
    judge: 'Judge the print', approve: 'Approve or drop', send: 'Send it to the printer', fix_plan: 'Fix the plan',
    look: 'Look at the printer', open_bambuddy: 'Open Bambuddy', check_pc: 'Check the PC', not_answering: "{name} isn't answering",
  };
  const EMPTY = 'Nothing needs you right now.';
  const TONES = { bad: 1, attention: 1, warn: 1 };

  // The resolver runs first. Keep a same-origin path, a #hash, or an http(s) URL the resolver itself produced
  // (an absolute URL that was already in the item is not trusted). Anything else: no link.
  function safeLink(link, opts) {
    const o = opts || {};
    if (typeof link !== 'string' || !link) return null;
    const href = o.resolve ? o.resolve(link) : link;
    if (typeof href !== 'string' || !href) return null;
    if (href[0] === '#') return { href, external: false };
    if (href[0] === '/') return /^\/[\/\\]/.test(href) ? null : { href, external: false };
    let u;
    try { u = new URL(href); } catch (e) { return null; }
    if ((u.protocol !== 'https:' && u.protocol !== 'http:') || href === link) return null;
    return { href, external: !o.here || u.origin !== o.here.origin };
  }

  const hereOf = (o, doc) => o.here || new URL(doc.defaultView.location.href);
  function el(doc, tag, cls, text) {
    const e = doc.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  const phrase = (key, item) => (PHRASES[key] || '').replace('{name}', item.source);

  function render(item, opts) {
    const o = opts || {};
    const doc = o.doc || document;
    const here = hereOf(o, doc);
    const li = el(doc, 'li', 'ui-need');
    li.dataset.tone = TONES[item.tone] ? item.tone : 'warn';
    const act = item.action;
    const link = safeLink(item.link || (act && act.link), { resolve: o.resolve, here });
    const box = link ? el(doc, 'a', 'ui-need__link') : el(doc, 'div', 'ui-need__link');
    if (link) {
      box.setAttribute('href', link.href);
      if (link.external) { box.target = '_blank'; box.rel = 'noopener'; }
    }
    box.append(el(doc, 'strong', 'ui-need__title', item.title), el(doc, 'span', 'ui-need__detail', item.detail));
    if (item.source && item.source !== o.self) box.append(el(doc, 'span', 'ui-need__meta', item.source));
    const words = act && phrase(act.key, item);
    if (words) box.append(el(doc, 'span', 'ui-need__action', words + (link && link.external ? ' ↗' : '')));
    else if (link && link.external) box.append(el(doc, 'span', 'ui-need__action', '↗'));
    li.append(box);
    return li;
  }

  function renderList(items, opts) {
    const o = opts || {};
    const doc = o.doc || document;
    const list = items || [];
    if (!list.length) return el(doc, 'p', 'ui-needs__empty', o.empty || EMPTY);
    const ul = el(doc, 'ul', 'ui-needs');
    const shown = o.max > 0 ? list.slice(0, o.max) : list;
    for (const it of shown) ul.append(render(it, o));
    if (o.more && shown.length < list.length) {
      const li = el(doc, 'li', 'ui-needs__more');
      const a = el(doc, 'a', null, o.more.label);
      a.setAttribute('href', o.more.href);
      li.append(a);
      ul.append(li);
    }
    return ul;
  }

  const api = { render, renderList, PHRASES, safeLink };
  if (typeof window !== 'undefined') window.ApplianceNeeds = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
