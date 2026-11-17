/* Pıtrak Nüsha — dışa aktarım (PDF, Word, tek soru) */
const Exp = (() => {
  const root = () => document.getElementById('exportRoot');
  const safe = s => (s || 'nusha').replace(/[\\/:*?"<>|]+/g, '').trim().replace(/\s+/g, '-').slice(0, 60) || 'nusha';
  function save(blob, name) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 8000);
  }
  async function ready(doc) {
    try { await document.fonts.load(`${doc.type.size}pt ${fontCss(doc).split(',')[0]}`); await document.fonts.load(`bold ${doc.type.size}pt ${fontCss(doc).split(',')[0]}`); await document.fonts.ready; } catch (e) {}
  }
  const shot = (node, scale) => html2canvas(node, { scale, backgroundColor: '#ffffff', useCORS: true, logging: false });

  async function pdf(doc, progress) {
    await ready(doc);
    const r = root(); const pages = buildDoc(doc, r);
    const [w, h] = PAGES[doc.layout.page];
    const P = new window.jspdf.jsPDF({ unit: 'mm', format: [w, h], orientation: 'portrait', compress: true });
    P.setProperties({ title: doc.title, creator: 'Pıtrak Nüsha' });
    try {
      for (let i = 0; i < pages.length; i++) {
        progress && progress(`Sayfa ${i + 1} / ${pages.length} işleniyor…`);
        const pg = pages[i], c = await shot(pg, 2);
        if (i) P.addPage([w, h], 'portrait');
        P.addImage(c.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, w, h, undefined, 'FAST');
        const pr = pg.getBoundingClientRect();
        pg.querySelectorAll('a[data-url]').forEach(a => {
          const b = a.getBoundingClientRect();
          P.link((b.left - pr.left) * w / pr.width, (b.top - pr.top) * h / pr.height, b.width * w / pr.width, b.height * h / pr.height, { url: a.dataset.url });
        });
        c.width = c.height = 0;
        await new Promise(r => setTimeout(r, 0));
      }
      save(P.output('blob'), safe(doc.title) + '.pdf');
    } finally { r.innerHTML = ''; }
  }

  function dataBytes(url) {
    const b = atob(url.split(',')[1]), u = new Uint8Array(b.length);
    for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u;
  }
  const imgType = url => /image\/png/.test(url) ? 'png' : 'jpg';
  const hex = c => (c || '#000000').replace('#', '');

  async function docx(doc, progress) {
    await ready(doc);
    const D = window.docx, L = doc.layout, T = doc.type;
    const wordFont = (FONTS.find(f => f.id === T.font) || FONTS[0]).word;
    const [pw, ph] = PAGES[L.page], tw = v => Math.round(v * 56.7);
    const size = Math.round(T.size * 2), line = Math.round(T.leading * 240);
    const sections = [];
    const base = { page: { size: { width: tw(pw), height: tw(ph) }, margin: { top: tw(L.margin), bottom: tw(L.margin), left: tw(L.margin), right: tw(L.margin) } } };
    const run = (text, o = {}) => {
      const parts = String(text || '').split('\n');
      return parts.map((t, i) => new D.TextRun({ text: t, break: i ? 1 : 0, font: wordFont, size, color: hex(T.color), ...o }));
    };
    const algn = { left: D.AlignmentType.LEFT, center: D.AlignmentType.CENTER, right: D.AlignmentType.RIGHT }[L.hfAlign];

    if (doc.cover.enabled) {
      progress && progress('Kapak hazırlanıyor…');
      const r = root(), tmp = document.createElement('div'); r.appendChild(tmp);
      const st = { pages: [] }; coverPage(doc, tmp, st);
      const c = await shot(st.pages[0], 2); r.innerHTML = '';
      const emu = v => Math.round(mmPx(v) * 9525);
      sections.push({
        properties: { page: { size: { width: tw(pw), height: tw(ph) }, margin: { top: 0, bottom: 0, left: 0, right: 0 } } },
        children: [new D.Paragraph({
          children: [new D.ImageRun({
            type: 'png', data: dataBytes(c.toDataURL('image/png')), transformation: { width: Math.round(mmPx(pw)), height: Math.round(mmPx(ph)) },
            floating: { horizontalPosition: { relative: D.HorizontalPositionRelativeFrom.PAGE, offset: 0 }, verticalPosition: { relative: D.VerticalPositionRelativeFrom.PAGE, offset: 0 }, behindDocument: true, allowOverlap: true },
          })],
        })],
      });
    }

    if (doc.preface.enabled) {
      const P = doc.preface, ch = [];
      ch.push(new D.Paragraph({ alignment: D.AlignmentType.CENTER, spacing: { after: 300 }, children: [new D.TextRun({ text: P.title || 'Önsöz', bold: true, size: size * 2, font: wordFont, color: hex(T.accent) })] }));
      (P.text || '').split(/\n+/).filter(s => s.trim()).forEach(s => ch.push(new D.Paragraph({ alignment: D.AlignmentType.JUSTIFIED, spacing: { after: 140, line }, children: run(s.trim()) })));
      if (P.signature) ch.push(new D.Paragraph({ alignment: D.AlignmentType.RIGHT, spacing: { before: 200 }, children: run(P.signature, { italics: true }) }));
      const links = (P.links || []).map(linkInfo).filter(Boolean);
      links.forEach(l => ch.push(new D.Paragraph({
        alignment: D.AlignmentType.CENTER, spacing: { before: 80 },
        children: [new D.TextRun({ text: l.name + ': ', bold: true, font: wordFont, size, color: hex(T.accent) }), new D.ExternalHyperlink({ link: l.url, children: [new D.TextRun({ text: l.label, style: 'Hyperlink', font: wordFont, size })] })],
      })));
      sections.push({ properties: base, children: ch });
    }

    const colW = (mmPx(pw - 2 * L.margin) - mmPx(8) * (L.columns - 1)) / L.columns;
    const ch = [];
    let no = 0;
    const kn = true;
    doc.items.forEach(it => {
      if (it.t === 'h') {
        ch.push(new D.Paragraph({ keepNext: true, spacing: { before: 160, after: 120 }, border: { bottom: { style: D.BorderStyle.SINGLE, size: 6, color: hex(T.accent), space: 2 } }, children: [new D.TextRun({ text: it.text || '', bold: true, size: size + 4, font: wordFont, color: hex(T.accent) })] }));
        return;
      }
      if (isBlank(it)) return;
      no++;
      const num = L.numStyle === 'Soru 1.' ? `Soru ${no}.` : L.numStyle === '1)' ? `${no})` : `${no}.`;
      ch.push(new D.Paragraph({ keepNext: true, keepLines: true, spacing: { line, after: 40 }, children: [new D.TextRun({ text: num + ' ', bold: true, font: wordFont, size, color: hex(T.accent) }), ...run(it.text)] }));
      if (it.image) {
        let w = it.w || 300, h = it.h || 200; const k = Math.min(1, colW / w, 260 / h); w = Math.round(w * k); h = Math.round(h * k);
        ch.push(new D.Paragraph({ keepNext: true, spacing: { after: 40 }, children: [new D.ImageRun({ type: imgType(it.image), data: dataBytes(it.image), transformation: { width: w, height: h } })] }));
      }
      const opts = []; for (let i = 0; i < L.optCount; i++) if ((it.opts[i] || '').trim() || i < 2) opts.push(i);
      opts.forEach((i, idx) => {
        const lab = L.optStyle === 'A.' ? LETTERS[i] + '.' : L.optStyle === '(A)' ? `(${LETTERS[i]})` : LETTERS[i] + ')';
        const last = idx === opts.length - 1;
        ch.push(new D.Paragraph({ keepNext: !last || L.answers === 'inline', keepLines: true, indent: { left: 240 }, spacing: { line, after: last && L.answers !== 'inline' ? tw(T.qGap) : 0 }, children: [new D.TextRun({ text: lab + ' ', bold: true, font: wordFont, size, color: hex(T.color) }), ...run(it.opts[i])] }));
      });
      if (L.answers === 'inline') ch.push(new D.Paragraph({ keepLines: true, indent: { left: 240 }, spacing: { after: tw(T.qGap) }, children: run('Cevap: ' + (it.answer || '—') + (it.explain ? ' · ' + it.explain : ''), { bold: true, color: hex(T.accent) }) }));
    });
    if (!doc.items.length) ch.push(new D.Paragraph({ children: run('') }));

    const qs = []; let n2 = 0; doc.items.forEach(i => { if (i.t === 'q' && !isBlank(i)) qs.push({ q: i, no: ++n2 }); });
    const tail = [];
    if (qs.length && (L.answers === 'key' || L.answers === 'full')) {
      tail.push(new D.Paragraph({ pageBreakBefore: true, keepNext: true, spacing: { after: 120 }, border: { bottom: { style: D.BorderStyle.SINGLE, size: 6, color: hex(T.accent), space: 2 } }, children: [new D.TextRun({ text: 'Cevap Anahtarı', bold: true, size: size + 4, font: wordFont, color: hex(T.accent) })] }));
      for (let i = 0; i < qs.length; i += 10) tail.push(new D.Paragraph({ spacing: { after: 60 }, children: run(qs.slice(i, i + 10).map(x => x.no + '-' + (x.q.answer || '—')).join('   ')) }));
      if (L.answers === 'full') {
        const sol = qs.filter(x => x.q.explain);
        if (sol.length) tail.push(new D.Paragraph({ keepNext: true, spacing: { before: 200, after: 100 }, children: [new D.TextRun({ text: 'Çözümler', bold: true, size: size + 2, font: wordFont, color: hex(T.accent) })] }));
        sol.forEach(x => tail.push(new D.Paragraph({ spacing: { after: 60, line }, children: [new D.TextRun({ text: x.no + '. ', bold: true, font: wordFont, size }), ...run(x.q.explain)] })));
      }
    }

    const hdrP = (txt) => new D.Paragraph({ alignment: algn, children: [new D.TextRun({ text: txt, font: wordFont, size: 18, color: '777777' })] });
    const ftKids = [];
    if (L.footerText) ftKids.push(new D.TextRun({ text: L.footerText + (L.pageNum !== 'none' ? '   ·   ' : ''), font: wordFont, size: 18, color: '777777' }));
    if (L.pageNum !== 'none') ftKids.push(new D.TextRun({ children: [D.PageNumber.CURRENT], font: wordFont, size: 18, color: '777777' }));
    const pnAlgn = L.pageNum === 'center' ? D.AlignmentType.CENTER : L.pageNum === 'right' ? D.AlignmentType.RIGHT : algn;
    sections.push({
      properties: { ...base, column: { count: L.columns, space: tw(8), separate: L.rule && L.columns > 1 }, page: { ...base.page, pageNumbers: { start: 1 } } },
      headers: L.headerText ? { default: new D.Header({ children: [hdrP(L.headerText)] }) } : undefined,
      footers: ftKids.length ? { default: new D.Footer({ children: [new D.Paragraph({ alignment: pnAlgn, children: ftKids })] }) } : undefined,
      children: ch.concat(tail),
    });

    progress && progress('Word dosyası paketleniyor…');
    const d = new D.Document({ creator: 'Pıtrak Nüsha', title: doc.title, sections });
    save(await D.Packer.toBlob(d), safe(doc.title) + '.docx');
  }

  async function single(doc, q, no, withAns, kind) {
    await ready(doc);
    const r = root(); r.innerHTML = '';
    const node = buildSingle(doc, q, no, withAns); r.appendChild(node);
    try {
      const c = await shot(node, 3), name = safe(doc.title) + '-soru-' + no;
      if (kind === 'png') { await new Promise(res => c.toBlob(b => { save(b, name + '.png'); res(); }, 'image/png')); }
      else {
        const w = c.width / 3 * 25.4 / 96, h = c.height / 3 * 25.4 / 96;
        const P = new window.jspdf.jsPDF({ unit: 'mm', format: [w, h], orientation: w > h ? 'l' : 'p', compress: true });
        P.addImage(c.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, w, h); save(P.output('blob'), name + '.pdf');
      }
    } finally { r.innerHTML = ''; }
  }
  return { pdf, docx, single, save, safe, ready };
})();
