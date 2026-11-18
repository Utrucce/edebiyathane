// Edebiyat Oyunhânesi - Yazar Müzesi ve Monografi Motoru
let CANONICAL_AUTHOR_BIOS = {};
let currentAuthorPeriodFilter = 'all';
let currentMonographAuthor = null;

// Load canonical bios from JSON
fetch('./assets/author_bios.json')
  .then(res => res.json())
  .then(data => {
    CANONICAL_AUTHOR_BIOS = data;
  })
  .catch(err => {
    console.warn('Yazar biyografileri yerel yükleme:', err);
  });

function detectAuthorPeriod(author, works) {
  for (const [key, val] of Object.entries(CANONICAL_AUTHOR_BIOS)) {
    if (author.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(author.toLowerCase())) {
      return val.period;
    }
  }

  const categories = new Set(works.map(w => w.category).filter(Boolean));
  if (categories.has('Eski Türk Edebiyatı')) return 'Klasik Dîvân Edebiyatı';
  if (categories.has('Halk Edebiyatı')) return 'Türk Halk Edebiyatı';
  if (categories.has('Eski Türk Dili')) return 'Eski Türk Dili & İlk Metinler';
  if (categories.has('Eser-Yazar, Çocuk Edebiyatı')) return 'Cumhuriyet & Çocuk Edebiyatı';
  if (categories.has('Yeni Türk Edebiyatı')) return 'Yeni Türk Edebiyatı';

  const genres = new Set(works.map(w => w.genre).filter(Boolean));
  if (genres.has('Gazel') || genres.has('Kaside') || genres.has('Mesnevi')) return 'Dîvân Edebiyatı';
  if (genres.has('Koşma') || genres.has('Semai') || genres.has('Mani')) return 'Halk Edebiyatı';

  return 'Türk Edebiyatı';
}

function getAuthorHonorific(author, works) {
  for (const [key, val] of Object.entries(CANONICAL_AUTHOR_BIOS)) {
    if (author.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(author.toLowerCase())) {
      return val.title;
    }
  }
  const genres = [...new Set(works.map(w => w.genre).filter(Boolean))];
  const mainGenre = genres.length ? genres[0] : 'Edebiyatçı';
  return `${mainGenre} Ustası • Edebiyatımızın Değerli Kalemi`;
}

function generateAuthorMonograph(author) {
  const works = (typeof AUTHOR_WORKS !== 'undefined' && AUTHOR_WORKS.get(author)) || 
                (typeof LIBRARY_DIRECTORY_DATA !== 'undefined' && LIBRARY_DIRECTORY_DATA.filter(i => i.author === author)) || [];

  for (const [key, val] of Object.entries(CANONICAL_AUTHOR_BIOS)) {
    if (author.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(author.toLowerCase())) {
      return {
        author,
        title: val.title,
        period: val.period,
        movement: val.movement || 'Klasik Türk Edebiyatı',
        bio: val.bio,
        works: works
      };
    }
  }

  const period = detectAuthorPeriod(author, works);
  const genres = [...new Set(works.map(w => w.genre).filter(Boolean))];
  const genresStr = genres.length ? genres.join(', ') : 'Çeşitli edebi türler';
  const workNames = [...new Set(works.map(w => w.work || w.clue).filter(Boolean))];
  const sampleWorks = workNames.slice(0, 4).join(', ');

  const bioText = `${author}, ${period} geleneği içerisinde Türk edebiyatına kıymetli eserler kazandırmış müstesna yazarlarımızdandır. Kütüphanemizde yer alan kayıtlara göre bilhassa ${genresStr} alanlarında yetkin ürünler vermiştir. Edebi veriminde Türkçenin estetik inceliklerini başarıyla yansıtmış; edebiyat tarihi araştırmalarında ve sınav soru havuzlarında '${sampleWorks}' gibi kalıcı eserleriyle öne çıkmıştır. Eserlerinde dönemin toplumsal, kültürel ve sanatsal atmosferini zengin bir üslupla işlemiştir.`;

  return {
    author,
    title: getAuthorHonorific(author, works),
    period: period,
    movement: genres.length ? `${genres[0]} & Düşünce Geleneği` : 'Türk Edebiyatı',
    bio: bioText,
    works: works
  };
}

function renderAuthorMuseum() {
  const container = document.getElementById('authorMuseumGrid');
  const countSpan = document.getElementById('authorMuseumCount');
  if (!container) return;

  const q = (document.getElementById('author-search-input')?.value || '').trim().toLowerCase();
  container.replaceChildren();

  const allAuthors = (typeof UNIQUE_AUTHORS !== 'undefined' && UNIQUE_AUTHORS) || 
                     (typeof AUTHOR_WORKS !== 'undefined' ? [...AUTHOR_WORKS.keys()] : []);

  const sorted = allAuthors.slice().sort((a,b) => a.localeCompare(b, 'tr'));

  const filtered = sorted.filter(author => {
    const works = (typeof AUTHOR_WORKS !== 'undefined' && AUTHOR_WORKS.get(author)) || [];
    const period = detectAuthorPeriod(author, works).toLowerCase();

    if (currentAuthorPeriodFilter !== 'all') {
      if (currentAuthorPeriodFilter === 'divan' && !period.includes('dîvân') && !period.includes('divan')) return false;
      if (currentAuthorPeriodFilter === 'halk' && !period.includes('halk')) return false;
      if (currentAuthorPeriodFilter === 'tanzimat' && !period.includes('tanzimat')) return false;
      if (currentAuthorPeriodFilter === 'servet' && !period.includes('servet') && !period.includes('fecr')) return false;
      if (currentAuthorPeriodFilter === 'milli' && !period.includes('millî') && !period.includes('milli')) return false;
      if (currentAuthorPeriodFilter === 'cumhuriyet' && !period.includes('cumhuriyet')) return false;
      if (currentAuthorPeriodFilter === 'cocuk' && !period.includes('çocuk') && !period.includes('cocuk')) return false;
    }

    if (q) {
      const matchName = author.toLowerCase().includes(q);
      const matchWork = works.some(w => (w.work || w.clue || '').toLowerCase().includes(q));
      return matchName || matchWork;
    }

    return true;
  });

  if (countSpan) {
    countSpan.textContent = `Toplam ${filtered.length} yazar sergileniyor.`;
  }

  const displaySlice = filtered.slice(0, 150);

  displaySlice.forEach(author => {
    const works = (typeof AUTHOR_WORKS !== 'undefined' && AUTHOR_WORKS.get(author)) || [];
    const period = detectAuthorPeriod(author, works);
    const honorific = getAuthorHonorific(author, works);
    const initials = author.split(/\s+/).filter(Boolean).slice(0,2).map(p => p[0]).join('').toUpperCase();

    const card = document.createElement('div');
    card.className = 'author-portrait-card';
    card.onclick = () => openAuthorMonograph(author);

    const header = document.createElement('div');
    header.className = 'author-card-header';
    header.innerHTML = `
      <div class="author-seal-badge">${initials}</div>
      <div class="author-card-info">
        <div class="author-card-name">${author}</div>
        <div class="author-card-title">${honorific}</div>
        <div class="author-card-period">🏛️ ${period}</div>
      </div>
    `;

    const meta = document.createElement('div');
    meta.className = 'author-card-meta';
    meta.innerHTML = `
      <span>📚 <b>${works.length}</b> kayıtlı eser</span>
      <span class="author-view-monograph-btn"><span>📜</span> İncele</span>
    `;

    card.append(header, meta);
    container.appendChild(card);
  });

  if (filtered.length > 150) {
    const moreNotice = document.createElement('div');
    moreNotice.style.gridColumn = '1 / -1';
    moreNotice.style.textAlign = 'center';
    moreNotice.style.padding = '14px';
    moreNotice.style.color = '#FFE082';
    moreNotice.style.fontSize = '13px';
    moreNotice.textContent = `⚡ İlk 150 yazar listelendi. Diğer yazarlar için yukarıdaki arama kutusunu kullanabilirsiniz.`;
    container.appendChild(moreNotice);
  }
}

function filterAuthorMuseum() {
  renderAuthorMuseum();
}

function setAuthorPeriodFilter(period, btn) {
  currentAuthorPeriodFilter = period;
  document.querySelectorAll('.author-period-pill').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderAuthorMuseum();
}

function openAuthorMonograph(author) {
  currentMonographAuthor = author;
  const data = generateAuthorMonograph(author);

  const modal = document.getElementById('authorMonographModal');
  if (!modal) return;

  const initials = author.split(/\s+/).filter(Boolean).slice(0,2).map(p => p[0]).join('').toUpperCase();
  document.getElementById('monoSeal').textContent = initials;
  document.getElementById('monoName').textContent = data.author;
  document.getElementById('monoHonorific').textContent = data.title;

  const badges = document.getElementById('monoBadges');
  badges.replaceChildren();
  const b1 = document.createElement('span'); b1.className = 'monograph-badge'; b1.textContent = `🏛️ ${data.period}`;
  const b2 = document.createElement('span'); b2.className = 'monograph-badge'; b2.textContent = `🎭 ${data.movement}`;
  badges.append(b1, b2);

  document.getElementById('monoBio').textContent = data.bio;

  const worksList = document.getElementById('monoWorksList');
  worksList.replaceChildren();
  document.getElementById('monoWorksCount').textContent = data.works.length;

  const uniqueWorks = [...new Map(data.works.map(w => [w.work || w.clue, w])).values()];
  uniqueWorks.forEach(w => {
    const tag = document.createElement('span');
    tag.className = 'monograph-work-tag';
    tag.innerHTML = `<span>📖</span> ${w.work || w.clue} ${w.genre ? `<span class="monograph-work-genre">${w.genre}</span>` : ''}`;
    worksList.appendChild(tag);
  });

  const cluesSection = document.getElementById('monoCluesSection');
  const cluesText = document.getElementById('monoClues');
  const clues = data.works.map(w => w.clue).filter(Boolean).slice(0, 6);
  if (clues.length) {
    cluesSection.hidden = false;
    cluesText.innerHTML = clues.map(c => `• ${c}`).join('<br>');
  } else {
    cluesSection.hidden = true;
  }

  modal.classList.add('active');
  if (typeof UIAudio !== 'undefined' && UIAudio.playPlaqueHover) UIAudio.playPlaqueHover();
}

function closeAuthorMonograph() {
  const modal = document.getElementById('authorMonographModal');
  if (modal) modal.classList.remove('active');
  if (typeof UIAudio !== 'undefined' && UIAudio.playClick) UIAudio.playClick();
}

function startQuizForAuthor(author) {
  closeAuthorMonograph();
  switchNavTab('library-view');
  const searchInput = document.getElementById('lib-search-input');
  if (searchInput) {
    searchInput.value = author;
    if (typeof renderLibrary === 'function') renderLibrary();
  }
}

// Hook into switchNavTab
const origSwitchNavTab = window.switchNavTab;
window.switchNavTab = function(viewId) {
  if (typeof origSwitchNavTab === 'function') origSwitchNavTab(viewId);
  if (viewId === 'author-museum-view') {
    renderAuthorMuseum();
  }
};
