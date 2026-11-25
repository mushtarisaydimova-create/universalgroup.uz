/* ==========================================================================
   universalgroup.uz — Portfolio Engine (Live Websites, 360° & Makets)
   --------------------------------------------------------------------------
   - Showcases live interactive website previews for:
     temurid360.uz, avtoyol.foto, registon360.uz, vr-ar.uz, technocorp.uz
     (plus any websites added via the Portfolio Admin Panel).
   - Showcases 4+ image mockup cards labeled "Maket" (ready for image upload).
   - Continuous 360° panoramic rotation on 360° projects (respects the public
     Settings "Heavy 360° animations" toggle in real time).
   - Re-renders automatically when language ('uz'/'ru') or admin data changes.
   ========================================================================== */
(() => {
  'use strict';
  const { icon, esc, observe, $, $$, t, loc } = window.Vanta;
  let uid = 0;

  const isHeavyOff = () => matchMedia('(prefers-reduced-motion: reduce)').matches || window.Store.getPrefs().motion === 'reduced';
  const rng = (seed) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

  /* ---------- SVG 360° Architectural Skyline ---------- */
  const W = 2000, H = 500, BASE = 430;
  const minaret = (x, h, w = 18) => {
    const top = BASE - h;
    return `<path d="M${x - w / 2},${BASE} L${x - w * 0.38},${top + 22} L${x + w * 0.38},${top + 22} L${x + w / 2},${BASE} Z"/>
      <rect x="${x - w * 0.62}" y="${top + 14}" width="${w * 1.24}" height="9" rx="2"/>
      <path d="M${x - w * 0.36},${top + 14} Q${x - w * 0.4},${top - 4} ${x},${top - 12} Q${x + w * 0.4},${top - 4} ${x + w * 0.36},${top + 14} Z"/>`;
  };
  const dome = (cx, baseY, r, id, ribs = true) => {
    const drum = r * 0.75;
    const y = baseY - drum;
    const path = `M${cx - r},${y} C${cx - r * 1.18},${y - r * 0.9} ${cx - r * 0.45},${y - r * 1.45} ${cx},${y - r * 1.75} C${cx + r * 0.45},${y - r * 1.45} ${cx + r * 1.18},${y - r * 0.9} ${cx + r},${y} Z`;
    let ribLines = '';
    if (ribs) for (let k = -3; k <= 3; k++) ribLines += `<path d="M${cx + k * r * 0.27},${y} Q${cx + k * r * 0.33},${y - r * 1.05} ${cx},${y - r * 1.72}" fill="none" stroke="rgba(15,5,35,.55)" stroke-width="2"/>`;
    return `<rect x="${cx - r * 0.86}" y="${y}" width="${r * 1.72}" height="${drum}" />
      <rect x="${cx - r * 0.86}" y="${y + drum * 0.28}" width="${r * 1.72}" height="${drum * 0.16}" fill="url(#${id}-tile)" opacity=".85"/>
      <path d="${path}" fill="url(#${id}-dome)"/>${ribLines}
      <path d="M${cx},${y - r * 1.75} V${y - r * 2.1}" stroke="#f0abfc" stroke-width="2"/><circle cx="${cx}" cy="${y - r * 2.14}" r="3" fill="#f0abfc"/>`;
  };
  const portal = (x, w, h, id) => {
    const l = x - w / 2, r = x + w / 2, top = BASE - h;
    const al = x - w * 0.3, ar = x + w * 0.3, spring = BASE - h * 0.48, apex = top + h * 0.16;
    return `<rect x="${l}" y="${top}" width="${w}" height="${h}"/>
      <rect x="${l + 6}" y="${top + 6}" width="${w - 12}" height="10" fill="url(#${id}-tile)" opacity=".8"/>
      <path d="M${al},${BASE} V${spring} Q${al},${apex + (spring - apex) * 0.25} ${x},${apex} Q${ar},${apex + (spring - apex) * 0.25} ${ar},${spring} V${BASE} Z" fill="url(#${id}-arch)"/>
      <path d="M${al + 10},${BASE} V${spring + 8} Q${al + 10},${apex + 20 + (spring - apex) * 0.25} ${x},${apex + 18} Q${ar - 10},${apex + 20 + (spring - apex) * 0.25} ${ar - 10},${spring + 8} V${BASE} Z" fill="none" stroke="url(#${id}-tile)" stroke-width="2.5" opacity=".9"/>`;
  };
  const wing = (x, w, h, id) => {
    let arches = '';
    const n = Math.max(2, Math.floor(w / 34));
    for (let k = 0; k < n; k++) {
      const ax = x + 10 + k * ((w - 20) / n) + 4, aw = (w - 20) / n - 8;
      arches += `<path d="M${ax},${BASE - 8} V${BASE - h * 0.55} Q${ax + aw / 2},${BASE - h * 0.8} ${ax + aw},${BASE - h * 0.55} V${BASE - 8} Z" fill="url(#${id}-arch)" opacity=".75"/>`;
    }
    return `<rect x="${x}" y="${BASE - h}" width="${w}" height="${h}"/>${arches}`;
  };

  function sceneSVG(scene) {
    const id = `pn${++uid}`;
    const rand = rng(scene === 'registon' ? 7 : 3);
    let stars = '';
    for (let i = 0; i < 110; i++) stars += `<circle cx="${(rand() * W).toFixed(1)}" cy="${(rand() * 260).toFixed(1)}" r="${(rand() * 1.4 + 0.3).toFixed(2)}" opacity="${(rand() * 0.7 + 0.2).toFixed(2)}"/>`;
    let hills = `M0,${BASE - 40}`;
    for (let x = 0; x <= W; x += 50) hills += ` L${x},${(BASE - 46 - Math.sin((x / W) * Math.PI * 6) * 18 - Math.sin((x / W) * Math.PI * 14) * 8).toFixed(1)}`;
    hills += ` L${W},${H} L0,${H} Z`;

    let arch = '';
    if (scene === 'registon') {
      arch += wing(250, 260, 120, id) + portal(380, 150, 230, id) + minaret(285, 300) + minaret(475, 300);
      arch += wing(640, 360, 110, id) + dome(820, BASE - 110, 70, id) + portal(820, 170, 210, id);
      arch += wing(1010, 260, 120, id) + portal(1140, 150, 230, id) + minaret(1045, 300) + minaret(1235, 300) + dome(1060, BASE - 120, 40, id) + dome(1220, BASE - 120, 40, id);
      arch += wing(1480, 280, 90, id) + dome(1620, BASE - 90, 55, id) + minaret(1500, 220, 14) + minaret(1745, 220, 14);
    } else {
      arch += wing(170, 300, 100, id) + dome(320, BASE - 100, 82, id) + minaret(190, 290) + minaret(450, 290);
      arch += portal(760, 210, 300, id) + minaret(645, 330, 22) + minaret(875, 330, 22);
      arch += wing(1060, 340, 120, id) + dome(1230, BASE - 120, 92, id) + portal(1230, 160, 190, id);
      arch += dome(1560, BASE - 50, 38, id) + dome(1650, BASE - 50, 44, id) + dome(1745, BASE - 50, 38, id) + wing(1520, 270, 50, id) + minaret(1840, 240, 14);
    }
    let lights = '';
    for (let i = 0; i < 65; i++) {
      const x = 160 + rand() * 1700, y = BASE - 20 - rand() * 90;
      lights += `<rect x="${x.toFixed(0)}" y="${y.toFixed(0)}" width="3" height="5" rx="1" opacity="${(0.4 + rand() * 0.6).toFixed(2)}"/>`;
    }

    return `<svg class="pano__tile" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="${id}-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#07021a"/><stop offset=".45" stop-color="#1f0a4a"/><stop offset=".75" stop-color="#5b1a8f"/><stop offset=".9" stop-color="#b03ab8"/><stop offset="1" stop-color="#f0a0d8"/></linearGradient>
        <linearGradient id="${id}-dome" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7dd3fc"/><stop offset=".5" stop-color="#6366f1"/><stop offset="1" stop-color="#3b0d6e"/></linearGradient>
        <linearGradient id="${id}-tile" x1="0" x2="1"><stop offset="0" stop-color="#22d3ee"/><stop offset=".5" stop-color="#c084fc"/><stop offset="1" stop-color="#22d3ee"/></linearGradient>
        <linearGradient id="${id}-arch" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a0f55"/><stop offset="1" stop-color="#7c3aed" stop-opacity=".55"/></linearGradient>
        <radialGradient id="${id}-glow" cx=".5" cy="1" r=".7"><stop offset="0" stop-color="#e04fd8" stop-opacity=".55"/><stop offset="1" stop-color="#e04fd8" stop-opacity="0"/></radialGradient>
        <filter id="${id}-blur"><feGaussianBlur stdDeviation="1.4"/></filter>
      </defs>
      <rect width="${W}" height="${H}" fill="url(#${id}-sky)"/>
      <g fill="#fff">${stars}</g>
      <circle cx="${scene === 'registon' ? 1380 : 560}" cy="110" r="34" fill="#fde7ff" opacity=".9"/>
      <circle cx="${scene === 'registon' ? 1380 : 560}" cy="110" r="70" fill="#f0abfc" opacity=".12"/>
      <ellipse cx="${W / 2}" cy="${BASE + 30}" rx="${W * 0.7}" ry="160" fill="url(#${id}-glow)"/>
      <path d="${hills}" fill="#2a0d52" opacity=".85"/>
      <g fill="#12052a">${arch}</g>
      <g fill="#fbcfe8" filter="url(#${id}-blur)">${lights}</g>
      <rect y="${BASE}" width="${W}" height="${H - BASE}" fill="#0a0318"/>
      <rect y="${BASE}" width="${W}" height="2" fill="#c084fc" opacity=".5"/>
    </svg>`;
  }

  /* ---------- Panorama Controller (Continuous 360° + Drag + Performance Toggle) ---------- */
  const panos = [];
  function mountPano(el) {
    const track = $('.pano__track', el);
    const needle = $('.pano__needle', el);
    const deg = $('.pano__deg', el);
    const DURATION = parseFloat(el.dataset.duration) || 50000;
    let anim = null, tileW = 0;

    function layout() {
      const first = track?.firstElementChild;
      if (!first) return;
      const h = el.clientHeight || 280;
      const ratio = first.tagName === 'IMG' ? (first.naturalWidth / first.naturalHeight || 2.2) : W / H;
      tileW = Math.max(320, Math.round(h * ratio));
      const copies = Math.max(2, Math.ceil((el.clientWidth || 600) / tileW) + 1);
      while (track.children.length < copies) track.appendChild(first.cloneNode(true));
      [...track.children].forEach((c) => { c.style.width = tileW + 'px'; c.style.height = h + 'px'; });
      const curTime = anim ? anim.currentTime : 0;
      anim?.cancel();
      anim = track.animate(
        [{ transform: 'translate3d(0,0,0)' }, { transform: `translate3d(${-tileW}px,0,0)` }],
        { duration: DURATION, iterations: Infinity }
      );
      anim.currentTime = curTime || 0;
      if (isHeavyOff()) anim.pause();
    }

    let dragging = false, lastX = 0, vel = 0, rate = 1, targetRate = 1;
    el.addEventListener('pointerdown', (e) => { dragging = true; lastX = e.clientX; vel = 0; el.setPointerCapture(e.pointerId); el.classList.add('is-dragging'); });
    el.addEventListener('pointermove', (e) => {
      if (!dragging || !anim) return;
      const dx = e.clientX - lastX; lastX = e.clientX;
      vel = dx;
      anim.currentTime = (anim.currentTime - (dx / tileW) * DURATION + DURATION * 1000) % DURATION;
    });
    const end = () => { dragging = false; el.classList.remove('is-dragging'); };
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
    el.addEventListener('pointerenter', () => { targetRate = 0.35; });
    el.addEventListener('pointerleave', () => { targetRate = 1; });
    el.addEventListener('keydown', (e) => {
      if (!anim) return;
      if (e.key === 'ArrowLeft') { anim.currentTime = (anim.currentTime - DURATION * 0.04 + DURATION) % DURATION; e.preventDefault(); }
      if (e.key === 'ArrowRight') { anim.currentTime = (anim.currentTime + DURATION * 0.04) % DURATION; e.preventDefault(); }
    });

    const api = {
      el,
      syncMotion() {
        if (!anim) return;
        if (isHeavyOff()) anim.pause();
        else anim.play();
      },
      tick() {
        if (!anim) return;
        if (!dragging && Math.abs(vel) > 0.2) {
          anim.currentTime = (anim.currentTime - (vel / tileW) * DURATION + DURATION * 1000) % DURATION;
          vel *= 0.94;
        }
        rate += (targetRate - rate) * 0.05;
        if (!isHeavyOff()) anim.playbackRate = rate;
        const p = ((anim.currentTime || 0) % DURATION) / DURATION;
        const d = Math.round(p * 360);
        if (needle) needle.style.transform = `rotate(${d}deg)`;
        if (deg) deg.textContent = String(d).padStart(3, '0') + '°';
      },
    };
    track?.querySelectorAll('img').forEach((img) => (img.complete ? null : img.addEventListener('load', layout, { once: true })));
    layout();
    new ResizeObserver(() => layout()).observe(el);
    panos.push(api);
  }
  (function loop() { panos.forEach((p) => p.el.isConnected && p.tick()); requestAnimationFrame(loop); })();
  window.Store.subscribePrefs(() => panos.forEach((p) => p.syncMotion()));

  function panoBlockHTML({ title, cover, scene = 'temurid' }) {
    const tile = cover ? `<img class="pano__tile" src="${esc(cover)}" alt="" draggable="false">` : sceneSVG(scene);
    return `<div class="pano" data-pano tabindex="0" role="img" aria-label="${esc(title)} — 360°" data-cursor="360°">
      <div class="pano__track">${tile}</div>
      <div class="pano__curve" aria-hidden="true"></div>
      <div class="pano__hud" aria-hidden="true">
        <span class="pano__badge">${icon('rotate')} 360°</span>
        <span class="pano__compass"><span class="pano__needle"></span><b>N</b></span>
        <span class="pano__deg">000°</span>
      </div>
      <span class="pano__cross" aria-hidden="true"></span>
      <span class="pano__hint" aria-hidden="true">${icon('move')} ${esc(t('pano_drag_hint'))}</span>
    </div>`;
  }

  /* ---------- Live Website Cards ---------- */
  function screenHTML(s) {
    if (s.kind === 'pano') {
      return panoBlockHTML({ title: loc(s.title), cover: s.cover, scene: s.scene || 'temurid' });
    }
    if (s.cover) return `<div class="shot" style="background-image:url('${esc(s.cover)}')" role="img" aria-label="${esc(loc(s.title))}"></div>`;
    return `<div class="art art--${esc(s.art || 'grid')}" style="--a:#c084fc;--b:#6d28d9"></div>
      <div class="ui-skel" aria-hidden="true">
        <div class="ui-skel__nav"><i></i><span></span><span></span><span></span></div>
        <div class="ui-skel__hero"><b></b><b></b><em></em></div>
      </div>`;
  }

  function siteCardHTML(s, wide, i) {
    const isPano = s.kind === 'pano';
    return `
    <article class="site-card ${wide ? 'is-wide' : ''} ${isPano ? 'is-pano' : ''}" data-kind="${esc(s.kind)}" data-reveal style="--i:${i % 2}">
      <div class="browser" ${isPano ? '' : 'data-tilt="4"'}>
        <div class="browser__bar">
          <span class="browser__dots"><i></i><i></i><i></i></span>
          <span class="browser__url">${icon('lock')}<span>${esc(s.domain || s.url)}</span></span>
          <span class="browser__live"><i></i>${esc(isPano ? t('live_360_badge') : t('live_badge'))}</span>
        </div>
        <div class="browser__screen">${screenHTML(s)}</div>
      </div>
      <div class="site-card__body">
        <div>
          <p class="project__cat">${esc(loc(s.category) || 'Website')}</p>
          <h3 class="site-card__title">${esc(loc(s.title))}</h3>
          <p class="project__summary">${esc(loc(s.description))}</p>
        </div>
        <div class="site-card__actions">
          <button class="btn btn--ghost btn--sm" type="button" data-preview="${esc(s.id)}">
            <span class="btn__label">${icon('monitor')} ${esc(t('btn_live_preview'))}</span>
          </button>
          <a class="btn btn--primary btn--sm" href="${esc(s.url)}" target="_blank" rel="noopener">
            <span class="btn__label">${esc(t('btn_visit_site'))} ${icon('external')}</span>
          </a>
        </div>
      </div>
    </article>`;
  }

  function renderSites(container, sites) {
    const out = [];
    for (let i = 0; i < sites.length; i++) {
      const s = sites[i];
      if (s.kind === 'pano') { out.push(siteCardHTML(s, true, i)); continue; }
      const next = sites[i + 1];
      if (next && next.kind !== 'pano') { out.push(siteCardHTML(s, false, 0), siteCardHTML(next, false, 1)); i++; }
      else out.push(siteCardHTML(s, true, i));
    }
    container.innerHTML = out.join('');
    $$('[data-pano]', container).forEach(mountPano);
    observe(container);
  }

  /* ---------- Maket (Mockup) Cards ---------- */
  const MAKET_ARTS = [
    { art: 'grid', a: '#c084fc', b: '#6d28d9' },
    { art: 'orb', a: '#e04fd8', b: '#7c3aed' },
    { art: 'circuit', a: '#22d3ee', b: '#7c3aed' },
    { art: 'road', a: '#f472b6', b: '#4f46e5' },
  ];
  function maketHTML(m, i) {
    const has = !!m.image;
    const preset = MAKET_ARTS[i % MAKET_ARTS.length];
    const sub = loc(m.subtitle) || t('maket_badge');
    const is360 = !!m.rot360;

    let inner = '';
    if (is360) {
      inner = panoBlockHTML({ title: loc(m.title), cover: m.image, scene: i % 2 === 0 ? 'temurid' : 'registon' });
    } else if (has) {
      inner = `<img class="maket__img" src="${esc(m.image)}" alt="${esc(loc(m.title))}" loading="lazy" draggable="false">`;
    } else {
      inner = `
        <div class="art art--${preset.art} maket__art" style="--a:${preset.a};--b:${preset.b}"></div>
        <div class="maket__placeholder">
          <span class="maket__ph-icon">${icon('image')}</span>
          <strong>${esc(loc(m.title))}</strong>
          <span>${esc(sub)} · ${esc(t('maket_ready'))}</span>
        </div>`;
    }

    return `
    <figure class="maket ${has ? 'has-image' : 'is-empty'} ${is360 ? 'is-pano' : ''}" ${is360 ? '' : 'data-tilt="8"'} data-reveal style="--i:${i};--kb:${i}">
      <div class="maket__frame">
        ${inner}
        <span class="maket__glare" aria-hidden="true"></span>
        ${!is360 ? `<span class="maket__label">${icon('layers')} ${esc(t('maket_badge'))}</span>` : ''}
        ${!is360 && has
          ? `<button class="maket__open" type="button" data-maket="${i}" data-cursor="view" aria-label="${esc(loc(m.title))}"></button>`
          : ''}
      </div>
      <figcaption class="maket__cap">
        <div>
          <span>${esc(loc(m.title))}</span>
          <small class="muted" style="display:block;font-family:var(--font-body);font-size:.76rem">${esc(sub)}</small>
        </div>
        <span class="maket__num">${is360 ? '360°' : String(i + 1).padStart(2, '0')}</span>
      </figcaption>
    </figure>`;
  }

  let maketList = [];
  function renderMakets(container, list) {
    maketList = list;
    container.innerHTML = list.map(maketHTML).join('');
    $$('[data-pano]', container).forEach(mountPano);
    observe(container);
  }

  /* ---------- Dialogs: Live Preview & Maket Lightbox ---------- */
  function dialog(cls) {
    const d = document.createElement('dialog');
    d.className = `modal ${cls}`;
    document.body.appendChild(d);
    d.addEventListener('click', (e) => { if (e.target === d || e.target.closest('[data-close]')) d.close(); });
    d.addEventListener('close', () => { window.Vanta.syncModalBodyState?.(); if (cls === 'modal--preview') d.innerHTML = ''; });
    return d;
  }
  let previewDlg, lightDlg;
  function openPreview(site) {
    previewDlg = previewDlg || dialog('modal--preview');
    previewDlg.setAttribute('aria-label', `${loc(site.title)} live preview`);
    previewDlg.innerHTML = `
      <div class="browser browser--modal">
        <div class="browser__bar">
          <span class="browser__dots"><i></i><i></i><i></i></span>
          <span class="browser__url">${icon('lock')}<span>${esc(site.domain || site.url)}</span></span>
          <a class="btn btn--primary btn--sm" href="${esc(site.url)}" target="_blank" rel="noopener"><span class="btn__label">${esc(t('btn_visit_site'))} ${icon('external')}</span></a>
          <button class="icon-btn" type="button" data-close aria-label="Close">${icon('x')}</button>
        </div>
        <div class="browser__screen browser__screen--live">
          <div class="live-loader"><span class="live-loader__ring"></span><p>${esc(t('loading_preview'))}</p><small>${esc(t('loading_preview_sub'))}</small></div>
          <iframe src="${esc(site.url)}" title="${esc(loc(site.title))}" loading="lazy" referrerpolicy="no-referrer" sandbox="allow-scripts allow-same-origin allow-popups allow-forms"></iframe>
        </div>
      </div>`;
    const frame = $('iframe', previewDlg);
    frame.addEventListener('load', () => previewDlg.classList.add('is-loaded'));
    previewDlg.classList.remove('is-loaded');
    previewDlg.showModal();
    window.Vanta.syncModalBodyState?.();
  }

  function openLight(i) {
    const withImg = maketList.map((m, idx) => ({ ...m, idx })).filter((m) => m.image);
    if (!withImg.length) return;
    lightDlg = lightDlg || dialog('modal--light');
    let pos = Math.max(0, withImg.findIndex((m) => m.idx === i));
    const draw = () => {
      const m = withImg[pos];
      lightDlg.setAttribute('aria-label', loc(m.title));
      lightDlg.innerHTML = `
        <div class="light">
          <img src="${esc(m.image)}" alt="${esc(loc(m.title))}">
          <div class="light__bar">
            <span class="tag">${icon('layers')} ${esc(loc(m.title))}</span>
            <div style="display:flex;gap:8px">
              ${withImg.length > 1 ? `<button class="icon-btn" type="button" data-step="-1">${icon('arrowLeft')}</button><button class="icon-btn" type="button" data-step="1">${icon('arrowRight')}</button>` : ''}
              <button class="icon-btn" type="button" data-close>${icon('x')}</button>
            </div>
          </div>
        </div>`;
    };
    lightDlg.onclick = (e) => {
      const st = e.target.closest('[data-step]');
      if (st) { pos = (pos + Number(st.dataset.step) + withImg.length) % withImg.length; draw(); }
    };
    draw();
    if (!lightDlg.open) { lightDlg.showModal(); window.Vanta.syncModalBodyState?.(); }
  }

  document.addEventListener('click', (e) => {
    const p = e.target.closest('[data-preview]');
    if (p) { const s = (window.Store.get().sites || []).find((x) => x.id === p.dataset.preview); if (s) openPreview(s); }
    const m = e.target.closest('[data-maket]');
    if (m) openLight(Number(m.dataset.maket));
  });

  /* ---------- Interactive Category Filters ---------- */
  function initPortfolioFilter() {
    const bar = $('[data-portfolio-filters]');
    if (!bar) return;
    bar.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-pfilter]');
      if (!btn) return;
      const mode = btn.dataset.pfilter;
      $$('[data-pfilter]', bar).forEach((b) => b.classList.toggle('is-active', b === btn));
      const sitesSec = $('#live-sites-section');
      const maketsSec = $('#makets');
      if (sitesSec) sitesSec.hidden = mode === 'maket';
      if (maketsSec) maketsSec.hidden = mode === 'pano' || mode === 'site';
      $$('[data-sites="all"] .site-card').forEach((card) => {
        if (mode === 'all') card.hidden = false;
        else if (mode === 'pano') card.hidden = card.dataset.kind !== 'pano';
        else if (mode === 'site') card.hidden = card.dataset.kind === 'pano';
      });
    });
  }

  function mount() {
    const data = window.Store.get();
    panos.length = 0;
    $$('[data-sites]').forEach((c) => {
      const mode = c.dataset.sites;
      const sites = mode === 'pano' ? (data.sites || []).filter((s) => s.kind === 'pano') : (data.sites || []);
      renderSites(c, sites);
    });
    $$('[data-makets]').forEach((c) => renderMakets(c, data.mockups || []));
    $$('[data-site-count]').forEach((el) => (el.textContent = (data.sites || []).length));
    $$('[data-maket-count]').forEach((el) => (el.textContent = (data.mockups || []).length));
  }

  mount();
  initPortfolioFilter();
  window.Store.subscribe(mount);
  window.Store.subscribePrefs(mount);
})();
