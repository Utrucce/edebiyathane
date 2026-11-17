/* Pıtrak Nüsha — uygulama arayüzü */
(() => {
  const $ = s => document.querySelector(s);
  let doc = null, saveT = null, renderT = null, renderTok = 0, zoom = 0, openId = null, tab = 'sorular', singleTarget = null;
  let sheets = [];

  /* ---------- yardımcılar ---------- */
  const get = (p) => p.split('.').reduce((o, k) => o[k], doc);
  const set = (p, v) => { const k = p.split('.'); const last = k.pop(); k.reduce((o, x) => o[x], doc)[last] = v; };
  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => t.hidden = true, 2800); }
  function fmtDate(ts) { return new Date(ts).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }); }
  function qCount(d) { return d.items.filter(i => i.t === 'q').length; }

  function readImage(file, { max = 1200, png = false } = {}) {
    return new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onerror = rej;
      fr.onload = () => {
        const im = new Image();
        im.onerror = rej;
        im.onload = () => {
          const k = Math.min(1, max / Math.max(im.width, im.height));
          const w = Math.round(im.width * k), h = Math.round(im.height * k);
          const c = document.createElement('canvas'); c.width = w; c.height = h;
          const g = c.getContext('2d'); if (!png) { g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); }
          g.drawImage(im, 0, 0, w, h);
          res({ url: png ? c.toDataURL('image/png') : c.toDataURL('image/jpeg', 0.88), w, h });
        };
        im.src = fr.result;
      };
      fr.readAsDataURL(file);
    });
  }

  /* ---------- kayıt ve önizleme ---------- */
  function changed(structural) {
    $('#saveState').textContent = 'Yazılıyor…';
    clearTimeout(saveT);
    saveT = setTimeout(flush, 600);
    clearTimeout(renderT);
    renderT = setTimeout(renderPreview, structural ? 60 : 280);
  }
  async function flush() {
    clearTimeout(saveT); if (!doc) return;
    doc.updated = Date.now();
    try { await DB.put(JSON.parse(JSON.stringify(doc))); $('#saveState').textContent = 'Rafa kaldırıldı ✓'; }
    catch (e) { $('#saveState').textContent = 'Kaydedilemedi'; toast('Tarayıcı kaydı başarısız oldu. Yer açmayı dene.'); }
  }

  async function renderPreview() {
    const tok = ++renderTok;
    try { await Exp.ready(doc); } catch (e) {}
    if (tok !== renderTok) return;
    const r = $('#exportRoot'); r.innerHTML = '';
    const pages = buildDoc(doc, r);
    const holder = $('#pages'); holder.innerHTML = ''; sheets = [];
    pages.forEach(p => {
      const s = document.createElement('div'); s.className = 'sheet'; s.appendChild(p); holder.appendChild(s); sheets.push({ s, p });
    });
    r.innerHTML = '';
    applyZoom();
  }
  function fitScale() {
    const [w] = PAGES[doc.layout.page];
    return Math.min(1.4, Math.max(0.2, ($('#previewScroll').clientWidth - 28) / mmPx(w)));
  }
  function applyZoom() {
    if (!doc) return;
    const k = zoom || fitScale(), [w, h] = PAGES[doc.layout.page];
    sheets.forEach(({ s, p }) => { s.style.width = mmPx(w) * k + 'px'; s.style.height = mmPx(h) * k + 'px'; p.style.transform = `scale(${k})`; });
    $('#zoomLbl').textContent = zoom ? Math.round(k * 100) + '%' : 'Sığdır';
  }

  /* ---------- denetim parçaları ---------- */
  function row(label, node, hint) {
    const d = document.createElement('div'); d.className = 'f';
    if (label) { const l = document.createElement('label'); l.textContent = label; d.appendChild(l); }
    d.appendChild(node); if (hint) { const h = document.createElement('div'); h.className = 'hint-t'; h.textContent = hint; d.appendChild(h); } return d;
  }
  function mk(tag, props = {}, kids = []) { const e = document.createElement(tag); Object.assign(e, props); kids.forEach(k => e.append(k)); return e; }
  function txt(label, path, o = {}) {
    const i = mk(o.area ? 'textarea' : 'input', { value: get(path) || '', placeholder: o.ph || '', rows: o.rows || 4 });
    i.oninput = () => { set(path, i.value); changed(); }; return row(label, i, o.hint);
  }
  function sw(label, path, after) {
    const i = mk('input', { type: 'checkbox', checked: !!get(path) });
    i.onchange = () => { set(path, i.checked); changed(true); after && after(); };
    return mk('label', { className: 'check' }, [i, ' ' + label]);
  }
  function seg(label, path, opts, after) {
    const d = mk('div', { className: 'seg' });
    opts.forEach(([v, t]) => {
      const b = mk('button', { type: 'button', textContent: t, className: get(path) === v ? 'on' : '' });
      b.onclick = () => { set(path, v); [...d.children].forEach(x => x.classList.remove('on')); b.classList.add('on'); changed(true); after && after(); };
      d.appendChild(b);
    });
    return row(label, d);
  }
  function sel(label, path, opts) {
    const s = mk('select'); opts.forEach(([v, t]) => s.appendChild(mk('option', { value: v, textContent: t, selected: String(get(path)) === String(v) })));
    s.onchange = () => { const raw = s.value; set(path, typeof get(path) === 'number' ? Number(raw) : raw); changed(true); }; return row(label, s);
  }
  function rng(label, path, min, max, step, unit) {
    const i = mk('input', { type: 'range', min, max, step, value: get(path) });
    const o = mk('span', { className: 'rv', textContent: get(path) + ' ' + unit });
    i.oninput = () => { set(path, Number(i.value)); o.textContent = i.value + ' ' + unit; changed(); };
    return row(label, mk('div', { className: 'rng' }, [i, o]));
  }
  function col(label, path) {
    const i = mk('input', { type: 'color', value: get(path) }); i.oninput = () => { set(path, i.value); changed(); };
    return mk('label', { className: 'colr' }, [i, mk('span', { textContent: label })]);
  }
  function pickFile(label, onFile, o) {
    const i = mk('input', { type: 'file', accept: 'image/*', hidden: true });
    i.onchange = async () => { if (!i.files[0]) return; try { onFile(await readImage(i.files[0], o)); } catch (e) { toast('Görsel okunamadı.'); } i.value = ''; };
    const b = mk('button', { type: 'button', className: 'btn small', textContent: label }); b.onclick = () => i.click(); return mk('span', {}, [b, i]);
  }

  /* ---------- sekmeler ---------- */
  function buildTab() {
    const box = $('#tabPages'); box.innerHTML = '';
    const T = { sorular: tabSorular, kapak: tabKapak, onsoz: tabOnsoz, duzen: tabDuzen, yazi: tabYazi, muhur: tabMuhur }[tab];
    box.appendChild(T());
    document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
  }

  function tabKapak() {
    const d = mk('div', { className: 'tp' }); const C = 'cover.';
    d.append(sw('Nüshaya bir kapak eklensin', C + 'enabled', buildTab));
    if (!doc.cover.enabled) return d;
    d.append(seg('Kapağın dokusu', C + 'mode', [['color', 'Sade renk'], ['image', 'Kendi görselim']], buildTab));
    if (doc.cover.mode === 'image') {
      const info = mk('div', { className: 'muted small', textContent: doc.cover.image ? 'Görsel yerleşti ✓' : 'Henüz görsel seçilmedi' });
      const up = pickFile('Görsel seç', r => { doc.cover.image = r.url; changed(true); buildTab(); }, { max: 1800 });
      const rm = mk('button', { className: 'btn ghost small', textContent: 'Kaldır', onclick: () => { doc.cover.image = null; changed(true); buildTab(); } });
      d.append(row('Kapak görseli', mk('div', { className: 'inline' }, [up, rm, info])));
      d.append(sw('Yazılar görselin üstünde görünsün', C + 'showText', buildTab));
    }
    if (doc.cover.mode !== 'image' || doc.cover.showText) {
      d.append(txt('Kapak başlığı', C + 'title', { ph: doc.title }));
      d.append(txt('Alt başlık', C + 'subtitle', { ph: 'Örn. 2026 Güz Dönemi' }));
      d.append(txt('Hazırlayan', C + 'author', { ph: 'Ad Soyad / Kurum' }));
    }
    d.append(row('Renkler', mk('div', { className: 'inline' }, [col('Zemin', C + 'bg'), col('Yazı', C + 'fg')])));
    return d;
  }

  function tabOnsoz() {
    const d = mk('div', { className: 'tp' }); const P = 'preface.';
    d.append(sw('Bir önsöz eklensin', P + 'enabled', buildTab));
    if (!doc.preface.enabled) return d;
    d.append(txt('Başlık', P + 'title'));
    d.append(txt('Önsöz yazısı', P + 'text', { area: true, rows: 8, ph: 'Okurlarına birkaç içten söz…', hint: 'Her satır sonu yeni bir paragraf açar.' }));
    d.append(txt('İmza', P + 'signature', { ph: 'Ad Soyad' }));
    const list = mk('div', { className: 'links' });
    const draw = () => {
      list.innerHTML = '';
      doc.preface.links.forEach((l, i) => {
        const s = mk('select'); Object.entries(PLATFORMS).forEach(([k, v]) => s.appendChild(mk('option', { value: k, textContent: v.name, selected: l.platform === k })));
        s.onchange = () => { l.platform = s.value; changed(); };
        const v = mk('input', { value: l.value, placeholder: '@kullanıcı veya bağlantı' }); v.oninput = () => { l.value = v.value; changed(); };
        const x = mk('button', { className: 'icon-btn', textContent: '✕', title: 'Kaldır', onclick: () => { doc.preface.links.splice(i, 1); draw(); changed(true); } });
        list.appendChild(mk('div', { className: 'link-row' }, [s, v, x]));
      });
    };
    draw();
    const add = mk('button', { className: 'btn small', textContent: '+ Bağlantı ekle', onclick: () => { doc.preface.links.push({ platform: 'instagram', value: '' }); draw(); } });
    d.append(row('Sosyal medya (PDF’te tıklanabilir)', mk('div', {}, [list, add])));
    return d;
  }

  function tabDuzen() {
    const d = mk('div', { className: 'tp' }); const L = 'layout.';
    d.append(sel('Sayfa ölçüsü', L + 'page', [['A4', 'A4 — standart'], ['A5', 'A5 — cep kitabı'], ['B5', 'B5 — kitap boyu']]));
    d.append(seg('Sütun sayısı', L + 'columns', [[1, 'Tek'], [2, 'İki'], [3, 'Üç']]));
    d.append(sw('Sütunlar arasında ince çizgi olsun', L + 'rule'));
    d.append(rng('Kenar boşluğu', L + 'margin', 8, 28, 1, 'mm'));
    d.append(mk('h4', { textContent: 'Üst ve alt bilgi' }));
    d.append(txt('Sayfa üst bilgisi', L + 'headerText', { ph: 'Örn. Matematik · Türev' }));
    d.append(txt('Sayfa alt bilgisi', L + 'footerText', { ph: 'Örn. @kullanici' }));
    d.append(seg('Hizalama', L + 'hfAlign', [['left', 'Sol'], ['center', 'Orta'], ['right', 'Sağ']]));
    d.append(seg('Sayfa numarası', L + 'pageNum', [['center', 'Ortada'], ['right', 'Sağda'], ['none', 'Yok']]));
    d.append(txt('Her sütunun başına yazı', L + 'colHeader', { ph: 'Sütun üst yazısı' }));
    d.append(txt('Her sütunun sonuna yazı', L + 'colFooter', { ph: 'Sütun alt yazısı' }));
    d.append(mk('h4', { textContent: 'Soru biçimi' }));
    d.append(sel('Soru numarası', L + 'numStyle', [['1.', '1.'], ['1)', '1)'], ['Soru 1.', 'Soru 1.']]));
    d.append(sel('Şık biçimi', L + 'optStyle', [['A)', 'A)'], ['A.', 'A.'], ['(A)', '(A)']]));
    d.append(seg('Şık sayısı', L + 'optCount', [[4, 'Dört'], [5, 'Beş']], buildTab));
    d.append(sel('Cevaplar', L + 'answers', [['none', 'Gösterilmesin'], ['key', 'Sonda cevap anahtarı'], ['full', 'Anahtar ve çözümler'], ['inline', 'Her sorunun altında']]));
    return d;
  }

  function tabYazi() {
    const d = mk('div', { className: 'tp' }); const T = 'type.';
    d.append(sel('Yazı tipi', T + 'font', FONTS.map(f => [f.id, f.name])));
    d.append(rng('Yazı büyüklüğü', T + 'size', 8, 16, 0.5, 'pt'));
    d.append(rng('Satır aralığı', T + 'leading', 1.1, 2, 0.05, '×'));
    d.append(rng('Sorular arası boşluk', T + 'qGap', 1, 14, 0.5, 'mm'));
    d.append(row('Renkler', mk('div', { className: 'inline' }, [col('Yazı', T + 'color'), col('Vurgu (numara, başlık)', T + 'accent')])));
    const pre = mk('div', { className: 'swatches' });
    [['#6b4426', '#1d1a17'], ['#1e3a8a', '#111827'], ['#065f46', '#1f2937'], ['#7f1d1d', '#1c1917'], ['#111111', '#111111']].forEach(([a, c]) => {
      pre.appendChild(mk('button', { className: 'sw', style: `background:linear-gradient(135deg,${a} 50%,${c} 50%)`, title: 'Hazır renk', onclick: () => { doc.type.accent = a; doc.type.color = c; changed(); buildTab(); } }));
    });
    d.append(row('Hazır renk çiftleri', pre));
    return d;
  }

  function tabMuhur() {
    const d = mk('div', { className: 'tp' }); const W = 'watermark.';
    d.append(sw('Sayfalara filigran konulsun', W + 'enabled', buildTab));
    if (!doc.watermark.enabled) return d;
    d.append(seg('Filigran türü', W + 'kind', [['text', 'Yazı'], ['image', 'Görsel']], buildTab));
    if (doc.watermark.kind === 'image') {
      d.append(row('Görsel', mk('div', { className: 'inline' }, [pickFile('Görsel seç', r => { doc.watermark.image = r.url; changed(true); buildTab(); }, { max: 900, png: true }), mk('span', { className: 'muted small', textContent: doc.watermark.image ? 'Yerleşti ✓' : 'Seçilmedi' })])));
    } else {
      d.append(txt('Yazı', W + 'text'));
      d.append(row('', col('Renk', W + 'color')));
    }
    d.append(rng('Belirginlik', W + 'opacity', 3, 40, 1, '%'));
    d.append(rng('Eğim', W + 'angle', -90, 90, 1, '°'));
    d.append(rng('Büyüklük', W + 'size', 10, 60, 1, ''));
    return d;
  }

  /* ---------- sorular ---------- */
  function tabSorular() {
    const d = mk('div', { className: 'tp' });
    const bar = mk('div', { className: 'qbar' }, [
      mk('button', { className: 'btn primary small', textContent: '+ Soru', onclick: () => addItem(newQuestion()) }),
      mk('button', { className: 'btn small', textContent: '+ Bölüm başlığı', onclick: () => addItem(newHeading()) }),
      mk('button', { className: 'btn small', textContent: 'Toplu ekle', onclick: () => { $('#bulkText').value = ''; $('#dlgBulk').showModal(); } }),
    ]);
    d.append(bar);
    const list = mk('div', { className: 'qlist' }); d.append(list);
    if (!doc.items.length) list.append(mk('div', { className: 'empty', textContent: 'Sayfa bembeyaz bir yaprak gibi bekliyor. İlk sorunu ekleyerek başla.' }));
    let no = 0;
    doc.items.forEach((it, idx) => list.append(it.t === 'h' ? headCard(it, idx) : qCard(it, idx, ++no)));
    return d;
  }
  function addItem(it) { doc.items.push(it); openId = it.id; changed(true); buildTab(); setTimeout(() => { const e = $('.qcard.open'); e && e.scrollIntoView({ block: 'center', behavior: 'smooth' }); }, 50); }
  function moveItem(idx, dir) { const j = idx + dir; if (j < 0 || j >= doc.items.length) return; [doc.items[idx], doc.items[j]] = [doc.items[j], doc.items[idx]]; changed(true); buildTab(); }
  function ctrls(it, idx, extra = []) {
    return mk('div', { className: 'qctl' }, [
      ...extra,
      mk('button', { className: 'icon-btn', textContent: '↑', title: 'Yukarı', onclick: () => moveItem(idx, -1) }),
      mk('button', { className: 'icon-btn', textContent: '↓', title: 'Aşağı', onclick: () => moveItem(idx, 1) }),
      mk('button', { className: 'icon-btn', textContent: '⧉', title: 'Çoğalt', onclick: () => { const c = JSON.parse(JSON.stringify(it)); c.id = uid(); doc.items.splice(idx + 1, 0, c); openId = c.id; changed(true); buildTab(); } }),
      mk('button', { className: 'icon-btn danger', textContent: '🗑', title: 'Sil', onclick: () => { if (confirm('Bu öğe silinsin mi?')) { doc.items.splice(idx, 1); changed(true); buildTab(); } } }),
    ]);
  }
  function headCard(h, idx) {
    const c = mk('div', { className: 'qcard head' });
    const i = mk('input', { value: h.text, placeholder: 'Bölüm başlığı (örn. Türkçe)' }); i.oninput = () => { h.text = i.value; changed(); };
    c.append(mk('span', { className: 'tag', textContent: 'Bölüm' }), i, ctrls(h, idx)); return c;
  }
  function qCard(q, idx, no) {
    const open = openId === q.id, c = mk('div', { className: 'qcard' + (open ? ' open' : '') });
    const sum = mk('div', { className: 'qsum' }, [mk('b', { textContent: no + '.' }), mk('span', { className: 'qs', textContent: (q.text || '').slice(0, 60) || 'Boş soru — dokunup yaz' })]);
    sum.onclick = () => { openId = open ? null : q.id; buildTab(); };
    c.append(sum);
    if (!open) return c;
    const body = mk('div', { className: 'qbody' });
    const ta = mk('textarea', { rows: 3, value: q.text, placeholder: 'Soru metnini buraya yaz…' }); ta.oninput = () => { q.text = ta.value; sum.querySelector('.qs').textContent = ta.value.slice(0, 60) || 'Boş soru'; changed(); };
    body.append(ta);
    const imgInfo = mk('span', { className: 'muted small', textContent: q.image ? 'Görsel var ✓' : '' });
    const rm = mk('button', { className: 'btn ghost small', textContent: 'Görseli kaldır', hidden: !q.image, onclick: () => { q.image = null; q.w = q.h = 0; changed(true); buildTab(); } });
    body.append(mk('div', { className: 'inline' }, [pickFile('🖼 Görsel ekle', r => { q.image = r.url; q.w = r.w; q.h = r.h; changed(true); buildTab(); }, { max: 1100 }), rm, imgInfo]));
    for (let i = 0; i < doc.layout.optCount; i++) {
      const inp = mk('input', { value: q.opts[i] || '', placeholder: 'Şık ' + LETTERS[i] }); inp.oninput = () => { q.opts[i] = inp.value; changed(); };
      body.append(mk('div', { className: 'optrow' }, [mk('b', { textContent: LETTERS[i] }), inp]));
    }
    const ans = mk('div', { className: 'seg' });
    LETTERS.slice(0, doc.layout.optCount).forEach(L => { const b = mk('button', { type: 'button', textContent: L, className: q.answer === L ? 'on' : '' }); b.onclick = () => { q.answer = q.answer === L ? '' : L; [...ans.children].forEach(x => x.classList.toggle('on', x.textContent === q.answer)); changed(); }; ans.append(b); });
    body.append(row('Doğru cevap', ans));
    const ex = mk('input', { value: q.explain || '', placeholder: 'Kısa çözüm veya açıklama (isteğe bağlı)' }); ex.oninput = () => { q.explain = ex.value; changed(); };
    body.append(row('Çözüm notu', ex));
    body.append(ctrls(q, idx, [mk('button', { className: 'btn small', textContent: 'Tek Soru', onclick: () => { singleTarget = { q, no }; $('#dlgSingle').showModal(); } })]));
    c.append(body); return c;
  }

  function parseBulk(text) {
    const out = []; let cur = null;
    const push = () => { if (cur && cur.text.trim()) out.push(cur); cur = null; };
    text.split(/\r?\n/).forEach(raw => {
      const line = raw.trim(); if (!line) return;
      let m;
      if ((m = line.match(/^(\d+)\s*[.)]\s+(.*)$/))) { push(); cur = newQuestion(); cur.text = m[2]; }
      else if (!cur) { cur = newQuestion(); cur.text = line; }
      else if ((m = line.match(/^\(?([A-Ea-e])[).]\s*(.*)$/)) && cur) cur.opts[LETTERS.indexOf(m[1].toUpperCase())] = m[2];
      else if ((m = line.match(/^(cevap|yanıt|yanit|doğru cevap)\s*[:\-]\s*\(?([A-Ea-e])/i))) cur.answer = m[2].toUpperCase();
      else if ((m = line.match(/^(açıklama|aciklama|çözüm|cozum)\s*[:\-]\s*(.*)$/i))) cur.explain = m[2];
      else cur.text += '\n' + line;
    });
    push(); return out;
  }

  /* ---------- ana ekran / raf ---------- */
  async function drawShelf() {
    const all = (await DB.all()).sort((a, b) => b.updated - a.updated);
    const box = $('#shelfList'); box.innerHTML = '';
    if (!all.length) { box.append(mk('div', { className: 'empty', textContent: 'Rafın henüz bomboş. İlk nüshanı başlatınca burada saklanacak.' })); return; }
    all.forEach(d => {
      const thumb = mk('img', { src: d.cover && d.cover.mode === 'image' && d.cover.image ? d.cover.image : 'assets/pitrak.jpg', alt: '' });
      const info = mk('div', { className: 'ci' }, [mk('b', { textContent: d.title }), mk('span', { className: 'muted small', textContent: `${d.kind} · ${qCount(d)} soru · ${fmtDate(d.updated)}` })]);
      const act = mk('div', { className: 'ca' }, [
        mk('button', { className: 'icon-btn', title: 'Çoğalt', textContent: '⧉', onclick: async e => { e.stopPropagation(); const c = JSON.parse(JSON.stringify(d)); c.id = uid(); c.title += ' (kopya)'; c.updated = Date.now(); await DB.put(c); drawShelf(); } }),
        mk('button', { className: 'icon-btn danger', title: 'Sil', textContent: '🗑', onclick: async e => { e.stopPropagation(); if (confirm(`“${d.title}” rafından kaldırılsın mı?`)) { await DB.del(d.id); drawShelf(); } } }),
      ]);
      const card = mk('div', { className: 'shelf-card', onclick: () => openDoc(d) }, [thumb, info, act]); box.append(card);
    });
  }
  function show(v) { $('#home').hidden = v !== 'home'; $('#editor').hidden = v !== 'editor'; window.scrollTo(0, 0); }
  function openDoc(d) {
    doc = d; // eski kayıtlar için eksik alanları tamamla
    const def = newDoc(d.kind); ['cover', 'preface', 'layout', 'type', 'watermark'].forEach(k => doc[k] = Object.assign({}, def[k], doc[k]));
    openId = null; tab = 'sorular'; zoom = 0;
    $('#docTitle').value = doc.title; $('#saveState').textContent = 'Rafa kaldırıldı ✓';
    document.body.classList.remove('show-preview'); setMobile('panel');
    show('editor'); buildTab(); renderPreview();
  }
  async function startNew(kind) {
    const d = newDoc(kind); d.cover.subtitle = kind || ''; const q = newQuestion(); d.items.push(q);
    await DB.put(d); openDoc(d); openId = q.id; buildTab();
  }
  function setMobile(m) {
    document.querySelectorAll('#mobileSwitch button').forEach(b => b.classList.toggle('on', b.dataset.m === m));
    $('#editor').classList.toggle('m-preview', m === 'preview');
    if (m === 'preview') setTimeout(applyZoom, 30);
  }

  /* ---------- olaylar ---------- */
  $('#btnNew').onclick = () => startNew('Soru Bankası');
  document.querySelectorAll('.kind').forEach(b => b.onclick = () => startNew(b.dataset.kind));
  $('#btnBack').onclick = async () => { await flush(); doc = null; show('home'); drawShelf(); };
  $('#docTitle').oninput = e => { doc.title = e.target.value || 'Adsız Nüsha'; changed(); };
  document.querySelectorAll('#tabs button').forEach(b => b.onclick = () => { tab = b.dataset.tab; buildTab(); });
  document.querySelectorAll('#mobileSwitch button').forEach(b => b.onclick = () => setMobile(b.dataset.m));
  $('#zoomIn').onclick = () => { zoom = Math.min(2, (zoom || fitScale()) + 0.1); applyZoom(); };
  $('#zoomOut').onclick = () => { zoom = Math.max(0.2, (zoom || fitScale()) - 0.1); applyZoom(); };
  $('#zoomFit').onclick = () => { zoom = 0; applyZoom(); };
  window.addEventListener('resize', () => { if (doc) applyZoom(); });
  window.addEventListener('pagehide', () => { if (doc) flush(); });

  $('#bulkCancel').onclick = () => $('#dlgBulk').close();
  $('#bulkOk').onclick = () => {
    const qs = parseBulk($('#bulkText').value);
    if (!qs.length) { toast('Soru bulunamadı. Biçimi kontrol et.'); return; }
    doc.items.push(...qs); $('#dlgBulk').close(); changed(true); buildTab(); toast(qs.length + ' soru eklendi.');
  };

  $('#btnDownload').onclick = () => { $('#dlProgress').textContent = ''; $('#dlgDownload').showModal(); };
  $('#dlClose').onclick = () => $('#dlgDownload').close();
  async function runExport(btn, fn) {
    const all = document.querySelectorAll('#dlgDownload button'); all.forEach(b => b.disabled = true);
    try { await fn(m => $('#dlProgress').textContent = m); $('#dlProgress').textContent = 'Hazır! İndirmen başladı.'; }
    catch (e) { console.error(e); $('#dlProgress').textContent = 'Bir aksilik çıktı: ' + (e.message || e); }
    all.forEach(b => b.disabled = false);
  }
  $('#dlPdf').onclick = e => runExport(e.target, p => Exp.pdf(doc, p));
  $('#dlDocx').onclick = e => runExport(e.target, p => Exp.docx(doc, p));
  $('#dlBackup').onclick = () => { Exp.save(new Blob([JSON.stringify(doc)], { type: 'application/json' }), Exp.safe(doc.title) + '.pitrak'); };
  $('#sClose').onclick = () => $('#dlgSingle').close();
  async function runSingle(kind) {
    $('#dlgSingle').close(); toast('Soru hazırlanıyor…');
    try { await Exp.single(doc, singleTarget.q, singleTarget.no, $('#optSingleAns').checked, kind); } catch (e) { toast('Çıktı alınamadı.'); }
  }
  $('#sPng').onclick = () => runSingle('png'); $('#sPdf').onclick = () => runSingle('pdf');

  $('#btnImport').onclick = () => $('#importFile').click();
  $('#importFile').onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    try { const d = JSON.parse(await f.text()); if (!d.items || !d.layout) throw 0; d.id = uid(); d.updated = Date.now(); await DB.put(d); drawShelf(); toast('Yedek rafa yerleştirildi.'); }
    catch (er) { toast('Bu dosya bir Pıtrak yedeği gibi görünmüyor.'); }
    e.target.value = '';
  };

  let deferred;
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; $('#btnInstall').hidden = false; });
  $('#btnInstall').onclick = async () => { if (deferred) { deferred.prompt(); deferred = null; $('#btnInstall').hidden = true; } };

  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
  drawShelf();
})();
