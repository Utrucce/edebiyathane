/* Pıtrak Nüsha — sayfa kurgusu ve düzen motoru */
const FONTS = [
  { id: 'lora', name: 'Lora — zarif kitap yazısı', css: "'Lora Variable', Georgia, serif", word: 'Georgia' },
  { id: 'merri', name: 'Merriweather — okuması rahat', css: "'Merriweather Variable', Georgia, serif", word: 'Georgia' },
  { id: 'playfair', name: 'Playfair — gösterişli', css: "'Playfair Display Variable', Georgia, serif", word: 'Georgia' },
  { id: 'source', name: 'Source Serif — sade ve ciddi', css: "'Source Serif 4 Variable', Georgia, serif", word: 'Times New Roman' },
  { id: 'inter', name: 'Inter — temiz modern', css: "'Inter Variable', Arial, sans-serif", word: 'Calibri' },
  { id: 'nunito', name: 'Nunito — yumuşak', css: "'Nunito Variable', Arial, sans-serif", word: 'Calibri' },
];
const PAGES = { A4: [210, 297], A5: [148, 210], B5: [176, 250] };
const PLATFORMS = {
  instagram: { name: 'Instagram', base: 'https://instagram.com/', at: true },
  youtube: { name: 'YouTube', base: 'https://youtube.com/@', at: true },
  telegram: { name: 'Telegram', base: 'https://t.me/', at: true },
  x: { name: 'X', base: 'https://x.com/', at: true },
  tiktok: { name: 'TikTok', base: 'https://tiktok.com/@', at: true },
  facebook: { name: 'Facebook', base: 'https://facebook.com/', at: false },
  linkedin: { name: 'LinkedIn', base: 'https://linkedin.com/in/', at: false },
  whatsapp: { name: 'WhatsApp', base: 'https://wa.me/', at: false },
  web: { name: 'İnternet Sitesi', base: 'https://', at: false },
  mail: { name: 'E-posta', base: 'mailto:', at: false },
};
const LETTERS = ['A', 'B', 'C', 'D', 'E'];
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const mmPx = v => v * 96 / 25.4;

function newDoc(kind) {
  return {
    id: uid(), title: kind ? kind + ' — Yeni Nüsha' : 'Adsız Nüsha', kind: kind || 'Soru Bankası', updated: Date.now(),
    cover: { enabled: true, mode: 'color', image: null, showText: true, title: '', subtitle: '', author: '', bg: '#6b4426', fg: '#fbf4e8' },
    preface: { enabled: false, title: 'Önsöz', text: '', signature: '', links: [] },
    layout: { page: 'A4', columns: 2, margin: 14, rule: true, headerText: '', footerText: '', hfAlign: 'center', colHeader: '', colFooter: '', pageNum: 'center', numStyle: '1.', optStyle: 'A)', optCount: 4, answers: 'key' },
    type: { font: 'lora', size: 10.5, color: '#1d1a17', accent: '#6b4426', leading: 1.45, qGap: 4 },
    watermark: { enabled: false, kind: 'text', text: 'PITRAK NÜSHA', image: null, opacity: 12, angle: -30, size: 26, color: '#6b4426' },
    items: [],
  };
}
function newQuestion() { return { id: uid(), t: 'q', text: '', image: null, w: 0, h: 0, opts: ['', '', '', '', ''], answer: '', explain: '' }; }
const isBlank = q => q.t === 'q' && !(q.text || '').trim() && !q.image && !q.opts.some(o => (o || '').trim());
function newHeading() { return { id: uid(), t: 'h', text: '' }; }

function fontCss(doc) { return (FONTS.find(f => f.id === doc.type.font) || FONTS[0]).css; }
function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
function linkInfo(l) {
  const p = PLATFORMS[l.platform] || PLATFORMS.web; let v = (l.value || '').trim(); if (!v) return null;
  let url = v, label = v;
  if (/^(https?:|mailto:)/i.test(v)) { label = v.replace(/^(https?:\/\/|mailto:)(www\.)?/i, '').replace(/\/$/, ''); }
  else { v = v.replace(/^@/, ''); url = p.base + v; label = (p.at ? '@' : '') + v; }
  return { url, label, name: p.name };
}

/* Sayfa çerçevesi */
function pageBase(doc) {
  const [w, h] = PAGES[doc.layout.page];
  const p = el('div', 'page');
  p.style.width = w + 'mm'; p.style.height = h + 'mm';
  p.style.setProperty('--ff', fontCss(doc));
  p.style.setProperty('--fs', doc.type.size + 'pt');
  p.style.setProperty('--fg', doc.type.color);
  p.style.setProperty('--accent', doc.type.accent);
  p.style.setProperty('--lh', doc.type.leading);
  p.style.setProperty('--qgap', doc.type.qGap + 'mm');
  return p;
}
function addWatermark(doc, p) {
  const w = doc.watermark; if (!w.enabled) return;
  const d = el('div', 'wm'); d.style.opacity = w.opacity / 100;
  d.style.transform = `translate(-50%,-50%) rotate(${w.angle}deg)`;
  if (w.kind === 'image' && w.image) { const i = el('img'); i.src = w.image; i.style.width = w.size * 4 + 'mm'; d.appendChild(i); }
  else if (w.text) { d.textContent = w.text; d.style.fontSize = w.size * 2 + 'pt'; d.style.color = w.color; }
  p.appendChild(d);
}
function contentPage(doc, container, cols, state, plain) {
  const L = doc.layout, p = pageBase(doc);
  p.style.padding = L.margin + 'mm';
  addWatermark(doc, p);
  const ph = el('div', 'ph'); ph.style.textAlign = L.hfAlign;
  if (L.headerText) { ph.textContent = L.headerText; ph.classList.add('on'); }
  const body = el('div', 'pbody');
  const pf = el('div', 'pf'); pf.style.textAlign = L.hfAlign;
  const ft = el('span', 'pft', L.footerText || ''); const num = el('span', 'pfn'); num.dataset.pn = '1';
  if (L.pageNum === 'right' && L.footerText) { pf.classList.add('split'); }
  if (L.pageNum === 'center') { pf.classList.add('stack'); }
  pf.appendChild(ft); if (L.pageNum !== 'none') { pf.appendChild(num); if (L.pageNum === 'right') pf.classList.add('right'); }
  const colEls = [];
  for (let i = 0; i < cols; i++) {
    const c = el('div', 'col'); if (L.rule && i > 0) c.classList.add('ruled');
    if (L.colHeader && !plain) c.appendChild(el('div', 'colh', L.colHeader));
    const cc = el('div', 'colc'); c.appendChild(cc);
    if (L.colFooter && !plain) c.appendChild(el('div', 'colf', L.colFooter));
    body.appendChild(c); colEls.push(cc);
  }
  p.append(ph, body, pf); container.appendChild(p);
  state.pages.push(p);
  return { page: p, cols: colEls };
}

/* Blok üreticiler */
function qBlock(doc, q, no, withAns) {
  const L = doc.layout, d = el('div', 'q');
  const t = el('div', 'qtxt'); t.appendChild(el('b', 'qno', L.numStyle === 'Soru 1.' ? 'Soru ' + no + '.' : L.numStyle === '1)' ? no + ')' : no + '.')); t.append(' ' + (q.text || ''));
  d.appendChild(t);
  if (q.image) { const i = el('img', 'qimg'); i.src = q.image; if (q.w) { i.width = q.w; i.height = q.h; } d.appendChild(i); }
  const o = el('div', 'opts');
  for (let i = 0; i < L.optCount; i++) {
    if (!(q.opts[i] || '').trim() && !(i < 2)) continue;
    const r = el('div', 'opt'); r.appendChild(el('b', '', L.optStyle === 'A.' ? LETTERS[i] + '.' : L.optStyle === '(A)' ? '(' + LETTERS[i] + ')' : LETTERS[i] + ')'));
    r.append(' ' + (q.opts[i] || '')); o.appendChild(r);
  }
  d.appendChild(o);
  if (withAns) {
    const a = el('div', 'ans'); a.textContent = 'Cevap: ' + (q.answer || '—') + (q.explain ? ' · ' + q.explain : ''); d.appendChild(a);
  }
  return d;
}
function headingBlock(h) { return el('div', 'qh', h.text || ''); }

/* Akış: blokları sütunlara yerleştirir */
function makeFlow(doc, container, state, cols, plain) {
  let cur = null, ci = 0;
  const newPg = () => { cur = contentPage(doc, container, cols, state, plain); ci = 0; };
  return {
    brk() { cur = null; },
    put(block) {
      if (!cur) newPg();
      for (;;) {
        const c = cur.cols[ci]; c.appendChild(block);
        if (c.scrollHeight <= c.clientHeight + 1 || c.children.length === 1) return;
        c.removeChild(block);
        if (++ci >= cur.cols.length) newPg();
      }
    },
  };
}

function coverPage(doc, container, state) {
  const C = doc.cover, p = pageBase(doc); p.classList.add('cover');
  p.style.background = C.bg; p.style.color = C.fg;
  if (C.mode === 'image' && C.image) { p.style.backgroundImage = `url(${C.image})`; p.style.backgroundSize = 'cover'; p.style.backgroundPosition = 'center'; }
  else { const f = el('div', 'cover-frame'); f.style.borderColor = C.fg; p.appendChild(f); }
  if (C.showText || C.mode !== 'image') {
    const box = el('div', 'cover-text');
    if (C.mode === 'image') box.classList.add('shade');
    box.appendChild(el('h1', '', C.title || doc.title));
    if (C.subtitle) box.appendChild(el('div', 'cs', C.subtitle));
    box.appendChild(el('div', 'orn', '✦'));
    if (C.author) box.appendChild(el('div', 'ca', C.author));
    p.appendChild(box);
  }
  container.appendChild(p); state.pages.push(p);
}

function prefacePages(doc, container, state) {
  const P = doc.preface, flow = makeFlow(doc, container, state, 1, true);
  const t = el('div', 'pref-title', P.title || 'Önsöz'); flow.put(t);
  (P.text || '').split(/\n{1,}/).filter(s => s.trim()).forEach(s => flow.put(el('p', 'pref-p', s.trim())));
  if (P.signature) flow.put(el('div', 'pref-sign', P.signature));
  const links = (P.links || []).map(linkInfo).filter(Boolean);
  if (links.length) {
    const row = el('div', 'sm-row');
    links.forEach(l => { const a = el('a', 'sm-link'); a.href = l.url; a.dataset.url = l.url; a.target = '_blank'; a.rel = 'noopener'; a.append(el('b', '', l.name), ' ' + l.label); row.appendChild(a); });
    flow.put(row);
  }
}

/* Ana üretici: tüm sayfaları container içine kurar */
function buildDoc(doc, container) {
  container.innerHTML = '';
  const state = { pages: [] }, first = {};
  if (doc.cover.enabled) coverPage(doc, container, state);
  if (doc.preface.enabled) prefacePages(doc, container, state);
  state.contentStart = state.pages.length;
  const cols = doc.layout.columns, flow = makeFlow(doc, container, state, cols);
  let no = 0, pendingH = null; const qs = [];
  doc.items.forEach(it => {
    if (it.t === 'h') { pendingH = it; return; }
    if (isBlank(it)) return;
    no++; qs.push({ q: it, no });
    const b = el('div', 'blk');
    if (pendingH) { b.appendChild(headingBlock(pendingH)); pendingH = null; }
    b.appendChild(qBlock(doc, it, no, doc.layout.answers === 'inline'));
    flow.put(b);
  });
  if (pendingH) flow.put(headingBlock(pendingH));
  if (qs.length && (doc.layout.answers === 'key' || doc.layout.answers === 'full')) {
    flow.brk();
    flow.put(el('div', 'qh', 'Cevap Anahtarı'));
    for (let i = 0; i < qs.length; i += 10) {
      const r = el('div', 'key-row');
      qs.slice(i, i + 10).forEach(x => r.appendChild(el('span', '', x.no + '-' + (x.q.answer || '—'))));
      flow.put(r);
    }
    if (doc.layout.answers === 'full') {
      const sol = qs.filter(x => x.q.explain);
      if (sol.length) flow.put(el('div', 'qh sub', 'Çözümler'));
      sol.forEach(x => { const d = el('div', 'sol'); d.appendChild(el('b', '', x.no + '. ')); d.append(x.q.explain); flow.put(d); });
    }
  }
  if (!state.pages.length || state.pages.length === state.contentStart && !doc.items.length) {
    const c = contentPage(doc, container, cols, state);
    const e = el('div', 'empty-note', 'Henüz soru eklenmedi. Soldan ilk sorunu yazarak başla.'); c.cols[0].appendChild(e);
  }
  let n = 0;
  state.pages.forEach((p, i) => { if (i >= state.contentStart) { n++; p.querySelectorAll('[data-pn]').forEach(e => e.textContent = n); } });
  return state.pages;
}

/* Tek soru kartı */
function buildSingle(doc, q, no, withAns) {
  const w = el('div', 'single');
  w.style.setProperty('--ff', fontCss(doc)); w.style.setProperty('--fs', doc.type.size + 'pt');
  w.style.setProperty('--fg', doc.type.color); w.style.setProperty('--accent', doc.type.accent); w.style.setProperty('--lh', doc.type.leading);
  w.appendChild(qBlock(doc, q, no, withAns));
  return w;
}
