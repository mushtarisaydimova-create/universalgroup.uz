/* ==========================================================================
   universalgroup.uz — Core UI, I18n, Public Settings Modal & Motion Engine
   --------------------------------------------------------------------------
   - Strict 3-page navigation: Home (index.html), Portfolio (portfolio.html),
     Services & Client Profile (services.html) + Public Settings button.
   - Public Settings Modal accessible from the navbar on every page:
       1. Theme: Night (Dark, default) | Day (Light)
       2. Language: Uzbek ('uz', default) | Russian ('ru') ONLY
       3. Heavy 360° & Background Animations: ON (default) | OFF
       4. Text Size: Standard | Large
       5. Discreet Owner Access trigger guarded by custom verification check
          that unlocks and opens the Unified Admin Panel.
   ========================================================================== */
(() => {
  'use strict';

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const finePointer = matchMedia('(pointer: fine)').matches;
  const page = location.pathname.split('/').pop() || 'index.html';
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const content = () => window.Store.get();
  const t = (k, fb) => window.Store.t(k, fb);
  const loc = (v) => window.Store.loc(v);
  const isMotionReduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches || window.Store.getPrefs().motion === 'reduced';

  /* ---------- Icons ---------- */
  const ICONS = {
    arrow: '<path d="M7 17 17 7"/><path d="M7 7h10v10"/>',
    arrowRight: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
    arrowLeft: '<path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>',
    arrowUp: '<path d="m5 12 7-7 7 7"/><path d="M12 19V5"/>',
    arrowDown: '<path d="M12 5v14"/><path d="m19 12-7 7-7-7"/>',
    phone: '<path d="M13.83 16.57a1 1 0 0 0 1.21-.3l.36-.47A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.47.35a1 1 0 0 0-.29 1.23 14 14 0 0 0 6.39 6.39"/>',
    tg: '<path class="fill" d="M21.9 4.3 18.7 19.4c-.2 1-.9 1.3-1.7.8l-4.8-3.6-2.3 2.2c-.3.3-.5.5-1 .5l.3-4.9 8.9-8c.4-.3-.1-.5-.6-.2L6.5 13.1l-4.7-1.5c-1-.3-1-1 .2-1.5L20.5 3c.9-.3 1.6.2 1.4 1.3z"/>',
    lock: '<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    cube: '<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
    vr: '<path d="M3 8.5A2.5 2.5 0 0 1 5.5 6h13A2.5 2.5 0 0 1 21 8.5v6a2.5 2.5 0 0 1-2.5 2.5h-3.2a2 2 0 0 1-1.6-.8l-.9-1.2a1 1 0 0 0-1.6 0l-.9 1.2a2 2 0 0 1-1.6.8H5.5A2.5 2.5 0 0 1 3 14.5Z"/><circle cx="8" cy="11.5" r="1.5"/><circle cx="16" cy="11.5" r="1.5"/>',
    code: '<path d="m16 18 6-6-6-6"/><path d="m8 6-6 6 6 6"/>',
    sparkles: '<path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/>',
    layers: '<path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
    pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
    shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
    grid: '<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>',
    trash: '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>',
    zap: '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>',
    globe: '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
    settings: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
    target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
    award: '<circle cx="12" cy="8" r="6"/><path d="M15.48 12.89 17 22l-5-3-5 3 1.52-9.11"/>',
    alert: '<circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
    image: '<rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.09-3.09a2 2 0 0 0-2.82 0L6 21"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
    refresh: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
    rotate: '<path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/>',
    external: '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
    monitor: '<rect width="20" height="14" x="2" y="3" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/>',
    move: '<path d="m5 9-3 3 3 3"/><path d="m9 5 3-3 3 3"/><path d="m15 19-3 3-3-3"/><path d="m19 9 3 3-3 3"/><path d="M2 12h20"/><path d="M12 2v20"/>',
    camera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
    tag: '<path d="M12.59 2.59A2 2 0 0 0 11.17 2H4a2 2 0 0 0-2 2v7.17a2 2 0 0 0 .59 1.41l8.7 8.7a2.43 2.43 0 0 0 3.42 0l6.58-6.58a2.43 2.43 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5"/>',
    save: '<path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"/><path d="M7 3v4a1 1 0 0 0 1 1h7"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
    moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
    type: '<polyline points="4 7 4 4 20 4 20 7"/><line x1="9" x2="15" y1="20" y2="20"/><line x1="12" x2="12" y1="4" y2="20"/>',
  };
  const icon = (name, cls = '') => `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICONS[name] || ICONS.sparkles}</svg>`;
  function hydrateIcons(root = document) {
    $$('[data-icon]', root).forEach((el) => {
      el.outerHTML = icon(el.dataset.icon, el.className.replace(/\bi\b/, '') + (el.dataset.icon === 'arrow' ? ' i--arrow' : ''));
    });
  }

  const logoSVG = (id) => `<svg class="logo__mark" viewBox="0 0 40 40" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d8b4fe"/><stop offset=".5" stop-color="#8b5cf6"/><stop offset="1" stop-color="#e04fd8"/></linearGradient></defs><rect x="1" y="1" width="38" height="38" rx="12" fill="url(#${id})"/><path d="M12 12v10a8 8 0 0 0 16 0V12" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

  /* Strict 3-Page Navigation Structure */
  const getNav = () => [
    { href: 'index.html', label: t('nav_home') },
    { href: 'portfolio.html', label: t('nav_portfolio') },
    { href: 'services.html', label: t('nav_services') },
  ];
  const initials = (name = '') => name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('') || 'UG';

  /* ---------- Contact Strip ---------- */
  function contactStrip({ compact = false, label = '' } = {}) {
    const c = content().contact || {};
    return `<div class="contact-strip ${compact ? 'contact-strip--compact' : ''}">
      ${label ? `<p class="contact-strip__label">${esc(label)}</p>` : ''}
      <a class="cbtn cbtn--call" href="tel:${esc(c.phoneHref || '+998903537060')}" data-no-transition aria-label="${esc(t('call_now'))} ${esc(c.phoneDisplay)}">
        <span class="cbtn__icon">${icon('phone')}</span>
        <span class="cbtn__text"><small>${esc(t('call_now'))}</small><strong>${esc(c.phoneDisplay || '+998 90 353 70 60')}</strong></span>
      </a>
      <a class="cbtn cbtn--tg" href="${esc(c.telegram || 'https://t.me/+998903537060')}" target="_blank" rel="noopener" aria-label="${esc(t('message_tg'))}">
        <span class="cbtn__icon">${icon('tg', 'i--fill')}</span>
        <span class="cbtn__text"><small>${esc(t('message_tg'))}</small><strong>${esc(c.telegramLabel || 'Telegram')}</strong></span>
      </a>
    </div>`;
  }

  function bindContacts(root = document) {
    const c = content().contact || {};
    $$('[data-contact="phone"]', root).forEach((a) => {
      a.href = `tel:${c.phoneHref || '+998903537060'}`;
      a.dataset.noTransition = '';
      if (a.dataset.text !== 'keep') a.textContent = c.phoneDisplay || '+998 90 353 70 60';
    });
    $$('[data-contact="telegram"]', root).forEach((a) => {
      a.href = c.telegram || 'https://t.me/+998903537060';
      a.target = '_blank';
      a.rel = 'noopener';
    });
    $$('[data-contact-strip]', root).forEach((el) => {
      const lblKey = el.dataset.labelI18n;
      const lbl = lblKey ? t(lblKey) : (el.dataset.label || '');
      el.innerHTML = contactStrip({ compact: el.dataset.contactStrip === 'compact', label: lbl });
    });
  }

  /* ---------- Apply [data-i18n] Translations ---------- */
  function applyI18n(root = document) {
    $$('[data-i18n]', root).forEach((el) => {
      const key = el.dataset.i18n;
      const val = t(key);
      if (val !== undefined) el.textContent = val;
    });
    bindContacts(root);
  }

  /* ---------- Toasts ---------- */
  let toastBox;
  function toast(message, type = 'info') {
    if (!toastBox) return;
    const el = document.createElement('div');
    el.className = `toast toast--${type}`;
    el.setAttribute('role', type === 'error' ? 'alert' : 'status');
    const ic = { success: 'check', error: 'alert', info: 'sparkles' }[type] || 'info';
    el.innerHTML = `<span class="toast__icon">${icon(ic)}</span><span>${esc(message)}</span>`;
    toastBox.appendChild(el);
    setTimeout(() => { el.classList.add('is-leaving'); el.addEventListener('animationend', () => el.remove(), { once: true }); }, 3400);
  }

  /* ---------- Page Transitions ---------- */
  let curtain;
  function go(href) {
    if (isMotionReduced() || !curtain) { location.href = href; return; }
    curtain.classList.add('is-active');
    setTimeout(() => { location.href = href; }, 500);
  }
  function initTransitions() {
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href]');
      if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (a.target === '_blank' || a.hasAttribute('download') || a.dataset.noTransition !== undefined) return;
      const url = new URL(a.getAttribute('href'), location.href);
      if (url.protocol !== location.protocol || url.host !== location.host) return;
      const samePage = url.pathname === location.pathname;
      if (samePage && url.hash) return;
      if (samePage && !url.hash && url.search === location.search) { e.preventDefault(); scrollTo({ top: 0, behavior: 'smooth' }); return; }
      if (!/\.html$|\/$/.test(url.pathname)) return;
      e.preventDefault();
      go(url.href);
    });
    addEventListener('pageshow', (e) => { if (e.persisted) curtain?.classList.remove('is-active'); });
  }

  /* ---------- Decorative Layers ---------- */
  function injectDecor() {
    const bg = document.createElement('div');
    bg.className = 'bg';
    bg.setAttribute('aria-hidden', 'true');
    bg.innerHTML = '<div class="bg__aurora"><span></span><span></span><span></span><span></span></div><div class="bg__grid"></div><canvas class="bg__particles"></canvas><div class="bg__noise"></div><div class="bg__vignette"></div>';
    document.body.prepend(bg);

    curtain = document.createElement('div');
    curtain.className = 'curtain';
    curtain.setAttribute('aria-hidden', 'true');
    document.body.appendChild(curtain);

    toastBox = document.createElement('div');
    toastBox.className = 'toasts';
    toastBox.setAttribute('aria-live', 'polite');
    document.body.appendChild(toastBox);

    const progress = document.createElement('div');
    progress.className = 'scroll-progress';
    progress.setAttribute('aria-hidden', 'true');
    document.body.appendChild(progress);
  }

  /* ---------- Floating Contact Button ---------- */
  let fabEl;
  function renderFab() {
    const c = content().contact || {};
    if (!fabEl) {
      fabEl = document.createElement('div');
      fabEl.className = 'fab';
      document.body.appendChild(fabEl);
      fabEl.addEventListener('click', (e) => {
        const btn = e.target.closest('.fab__main');
        if (btn) {
          const open = !fabEl.classList.contains('is-open');
          fabEl.classList.toggle('is-open', open);
          btn.setAttribute('aria-expanded', String(open));
        }
      });
      document.addEventListener('click', (e) => {
        if (fabEl && !fabEl.contains(e.target)) {
          fabEl.classList.remove('is-open');
          fabEl.querySelector('.fab__main')?.setAttribute('aria-expanded', 'false');
        }
      });
      const toggle = () => fabEl.classList.toggle('is-visible', scrollY > innerHeight * 0.45);
      addEventListener('scroll', toggle, { passive: true });
      toggle();
    }
    fabEl.innerHTML = `
      <a class="fab__item fab__item--tg" href="${esc(c.telegram || 'https://t.me/+998903537060')}" target="_blank" rel="noopener" style="--i:1">${icon('tg', 'i--fill')}<span>Telegram</span></a>
      <a class="fab__item fab__item--call" href="tel:${esc(c.phoneHref || '+998903537060')}" data-no-transition style="--i:0">${icon('phone')}<span>${esc(c.phoneDisplay || '+998 90 353 70 60')}</span></a>
      <button class="fab__main" type="button" aria-expanded="false" aria-label="Contact">${icon('phone', 'fab__ic-open')}${icon('x', 'fab__ic-close')}</button>`;
  }

  /* ---------- Header (Custom Element: Strict 3-Page Nav + Settings Trigger) ---------- */
  class SiteHeader extends HTMLElement {
    connectedCallback() {
      this.render();
      window.Store.subscribePrefs(() => this.render());
      window.Store.subscribe(() => this.render());
    }
    render() {
      const c = content().contact || {};
      const NAV = getNav();
      this.innerHTML = `
        <header class="site-header">
          <nav class="nav" aria-label="Primary">
            <a class="logo" href="index.html" aria-label="universalgroup.uz">${logoSVG('lg-h')}<span>universalgroup.uz</span></a>
            <ul class="nav__links">
              ${NAV.map((n) => `<li><a class="nav__link ${page === n.href ? 'is-active' : ''}" href="${n.href}" ${page === n.href ? 'aria-current="page"' : ''}>${esc(n.label)}</a></li>`).join('')}
            </ul>
            <div class="nav__auth">
              <a class="nav-call" href="tel:${esc(c.phoneHref || '+998903537060')}" data-no-transition aria-label="${esc(c.phoneDisplay)}">
                <span class="nav-call__icon">${icon('phone')}</span>
                <span class="nav-call__num">${esc(c.phoneDisplay || '+998 90 353 70 60')}</span>
              </a>
              <button class="nav-settings-btn" type="button" data-open-settings aria-label="${esc(t('nav_settings'))}">
                ${icon('settings')}
                <span>${esc(t('nav_settings'))}</span>
              </button>
              <button class="nav__toggle" type="button" aria-label="Menu" aria-expanded="false" aria-controls="mobile-menu"><span></span><span></span></button>
            </div>
          </nav>
        </header>
        <div class="mobile-menu" id="mobile-menu" aria-label="Mobile navigation">
          ${NAV.map((n, i) => `<a class="m-link ${page === n.href ? 'is-active' : ''}" style="--i:${i}" href="${n.href}"><small>0${i + 1}</small>${esc(n.label)}</a>`).join('')}
          <div class="mobile-menu__auth">
            <button class="btn btn--ghost" type="button" data-open-settings>${icon('settings')} ${esc(t('nav_settings'))}</button>
            ${contactStrip()}
          </div>
        </div>`;
      this.bind();
    }
    bind() {
      const header = $('.site-header', this);
      const toggle = $('.nav__toggle', this);
      const menu = $('.mobile-menu', this);
      const setMenu = (open) => {
        toggle.setAttribute('aria-expanded', String(open));
        menu.classList.toggle('is-open', open);
        document.body.classList.toggle('is-locked', open);
        header.classList.remove('is-hidden');
      };
      toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });
      matchMedia('(min-width: 961px)').addEventListener('change', (m) => m.matches && setMenu(false));

      let lastY = scrollY, ticking = false;
      const progress = $('.scroll-progress');
      const onScroll = () => {
        const y = scrollY;
        header.classList.toggle('is-scrolled', y > 24);
        if (!menu.classList.contains('is-open')) header.classList.toggle('is-hidden', y > lastY && y > 320);
        lastY = y;
        const max = document.documentElement.scrollHeight - innerHeight;
        if (progress) progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
        ticking = false;
      };
      addEventListener('scroll', () => { if (!ticking) { requestAnimationFrame(onScroll); ticking = true; } }, { passive: true });
      onScroll();
    }
  }

  /* ---------- Footer (Custom Element) ---------- */
  class SiteFooter extends HTMLElement {
    connectedCallback() {
      this.render();
      window.Store.subscribePrefs(() => this.render());
      window.Store.subscribe(() => this.render());
    }
    render() {
      const year = new Date().getFullYear();
      const data = content();
      const c = data.contact || {};
      const NAV = getNav();
      const services = (data.services || []).filter((s) => s.visible !== false).slice(0, 5);
      this.innerHTML = `
      <footer class="site-footer">
        <div class="container">
          <div class="footer-cta">
            <span class="eyebrow">${esc(t('footer_tag'))}</span>
            <h2 class="display-sm">${esc(t('footer_title_1'))} <span class="gradient-text">${esc(t('footer_title_grad'))}</span></h2>
            ${contactStrip()}
          </div>
          <div class="footer-grid">
            <div class="footer-brand">
              <a class="logo" href="index.html" aria-label="universalgroup.uz">${logoSVG('lg-f')}<span>universalgroup.uz</span></a>
              <p>${esc(t('footer_desc'))}</p>
              <div class="socials">
                <a class="icon-btn" href="${esc(c.telegram || 'https://t.me/+998903537060')}" target="_blank" rel="noopener" aria-label="Telegram">${icon('tg', 'i--fill')}</a>
                <a class="icon-btn" href="tel:${esc(c.phoneHref || '+998903537060')}" data-no-transition aria-label="Phone">${icon('phone')}</a>
                <button class="icon-btn" type="button" data-open-settings aria-label="${esc(t('nav_settings'))}">${icon('settings')}</button>
              </div>
            </div>
            <div><h4>${esc(t('footer_nav'))}</h4><ul>${NAV.map((n) => `<li><a href="${n.href}">${esc(n.label)}</a></li>`).join('')}</ul></div>
            <div><h4>${esc(t('footer_services'))}</h4><ul>${services.map((s) => `<li><a href="services.html#${esc(s.id)}">${esc(loc(s.title))}</a></li>`).join('')}</ul></div>
            <div><h4>${esc(t('footer_contact'))}</h4><ul>
              <li><a href="tel:${esc(c.phoneHref || '+998903537060')}" data-no-transition>${esc(c.phoneDisplay || '+998 90 353 70 60')}</a></li>
              <li><a href="${esc(c.telegram || 'https://t.me/+998903537060')}" target="_blank" rel="noopener">Telegram</a></li>
              ${c.email ? `<li><a href="mailto:${esc(c.email)}" data-no-transition>${esc(c.email)}</a></li>` : ''}
              <li><span class="muted">${esc(loc(c.address))}</span></li>
            </ul></div>
          </div>
          <div class="footer-bottom">
            <span>© ${year} universalgroup.uz. ${esc(t('footer_rights'))}</span>
            <a href="#top" data-no-transition data-to-top>${esc(t('footer_top'))}</a>
          </div>
        </div>
        <div class="footer-mega" aria-hidden="true">universalgroup.uz</div>
      </footer>`;
      $('[data-to-top]', this)?.addEventListener('click', (e) => { e.preventDefault(); scrollTo({ top: 0, behavior: 'smooth' }); });
    }
  }

  /* ---------- Public Settings Modal (Theme, UZ/RU Language, 360° Motion, Text Size, Subtle "Admin Panel" Link) ---------- */
  let settingsDlg;

  function syncModalBodyState() {
    const anyOpen = $$('dialog[open]').length > 0;
    document.body.classList.toggle('is-locked', anyOpen);
    document.body.classList.toggle('has-open-modal', anyOpen);
  }

  function ensureSettingsModal() {
    if (settingsDlg) return settingsDlg;
    settingsDlg = document.createElement('dialog');
    settingsDlg.className = 'settings-modal';
    settingsDlg.setAttribute('aria-labelledby', 'settings-modal-title');
    document.body.appendChild(settingsDlg);

    settingsDlg.addEventListener('click', (e) => {
      if (e.target === settingsDlg || e.target.closest('[data-close-settings]')) {
        settingsDlg.close();
        return;
      }
      const prefBtn = e.target.closest('[data-set-pref]');
      if (prefBtn) {
        const [key, val] = prefBtn.dataset.setPref.split(':');
        window.Store.setPrefs({ [key]: val });
        renderSettingsModal();
        return;
      }
      if (e.target.closest('[data-open-passcode-modal]')) {
        settingsDlg.close();
        window.UGAdmin?.openPasscodeModal();
      }
    });

    settingsDlg.addEventListener('close', syncModalBodyState);
    return settingsDlg;
  }

  function renderSettingsModal() {
    if (!settingsDlg) return;
    const p = window.Store.getPrefs();
    const st = window.CloudDB?.status?.() || { mode: 'Cloud Sync' };

    settingsDlg.innerHTML = `
      <div class="settings-box">
        <div class="settings-box__head">
          <div>
            <span class="eyebrow">universalgroup.uz</span>
            <h2 class="h3" id="settings-modal-title" style="margin-top:10px">${esc(t('settings_title'))}</h2>
            <p class="muted" style="font-size:.88rem;margin-top:4px">${esc(t('settings_sub'))}</p>
          </div>
          <button class="icon-btn" type="button" data-close-settings aria-label="Close">${icon('x')}</button>
        </div>

        <div class="settings-grid">
          <!-- 1. Theme: Night (default) vs Day -->
          <div class="setting-row">
            <div class="setting-row__label">${icon(p.theme === 'day' ? 'sun' : 'moon')}<span>${esc(t('set_theme_label'))}</span></div>
            <div class="seg" role="group" aria-label="${esc(t('set_theme_label'))}">
              <button class="seg__btn ${p.theme === 'night' ? 'is-active' : ''}" type="button" data-set-pref="theme:night">
                ${icon('moon')} <span>${esc(t('set_theme_night'))}</span>
              </button>
              <button class="seg__btn ${p.theme === 'day' ? 'is-active' : ''}" type="button" data-set-pref="theme:day">
                ${icon('sun')} <span>${esc(t('set_theme_day'))}</span>
              </button>
            </div>
          </div>

          <!-- 2. Language: Strictly Uzbek (default) & Russian only -->
          <div class="setting-row">
            <div class="setting-row__label">${icon('globe')}<span>${esc(t('set_lang_label'))}</span></div>
            <div class="seg" role="group" aria-label="${esc(t('set_lang_label'))}">
              <button class="seg__btn ${p.lang === 'uz' ? 'is-active' : ''}" type="button" data-set-pref="lang:uz">
                <span>UZ · ${esc(t('set_lang_uz'))}</span>
              </button>
              <button class="seg__btn ${p.lang === 'ru' ? 'is-active' : ''}" type="button" data-set-pref="lang:ru">
                <span>RU · ${esc(t('set_lang_ru'))}</span>
              </button>
            </div>
          </div>

          <!-- 3. Heavy 360° & Background Animations Toggle -->
          <div class="setting-row">
            <div class="setting-row__label">${icon('rotate')}<span>${esc(t('set_motion_label'))}</span></div>
            <div class="seg" role="group" aria-label="${esc(t('set_motion_label'))}">
              <button class="seg__btn ${p.motion === 'full' ? 'is-active' : ''}" type="button" data-set-pref="motion:full">
                ${icon('zap')} <span>${esc(t('set_motion_on'))}</span>
              </button>
              <button class="seg__btn ${p.motion === 'reduced' ? 'is-active' : ''}" type="button" data-set-pref="motion:reduced">
                <span>${esc(t('set_motion_off'))}</span>
              </button>
            </div>
          </div>

          <!-- 4. Text Size: Standard vs Large -->
          <div class="setting-row">
            <div class="setting-row__label">${icon('type')}<span>${esc(t('set_font_label'))}</span></div>
            <div class="seg" role="group" aria-label="${esc(t('set_font_label'))}">
              <button class="seg__btn ${p.fontSize === 'standard' ? 'is-active' : ''}" type="button" data-set-pref="fontSize:standard">
                <span>A · ${esc(t('set_font_std'))}</span>
              </button>
              <button class="seg__btn ${p.fontSize === 'large' ? 'is-active' : ''}" type="button" data-set-pref="fontSize:large">
                <span style="font-size:1.05em">A+ · ${esc(t('set_font_lg'))}</span>
              </button>
            </div>
          </div>
        </div>

        <!-- 5. Subtle "Admin Panel" Button at the Very Bottom of Settings Menu -->
        <div class="owner-box">
          <span class="cloud-pill"><i></i><span>${esc(st.mode || 'Cloud Sync')}</span></span>
          <button class="owner-admin-link" type="button" data-open-passcode-modal>
            ${icon('lock')} <span>Admin Panel</span>
          </button>
        </div>
      </div>`;
  }

  function openSettingsModal() {
    const dlg = ensureSettingsModal();
    renderSettingsModal();
    if (!dlg.open) {
      dlg.showModal();
      syncModalBodyState();
    }
  }

  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-open-settings]')) {
      $('.mobile-menu')?.classList.remove('is-open');
      openSettingsModal(false);
    }
  });

  /* ---------- Particle Constellation (pauses when heavy motion is OFF) ---------- */
  function initParticles() {
    const canvas = $('.bg__particles');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w = 0, h = 0, pts = [], raf = 0;
    const mouse = { x: -9999, y: -9999 };
    const LINK = 130;

    function resize() {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.min(85, Math.floor((w * h) / 18000));
      pts = Array.from({ length: n }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.28, vy: (Math.random() - 0.5) * 0.28,
        r: Math.random() * 1.6 + 0.4, hue: 255 + Math.random() * 60, tw: Math.random() * 6.28
      }));
    }

    function frame() {
      if (document.hidden || isMotionReduced()) { raf = 0; return; }
      ctx.clearRect(0, 0, w, h);
      const isDay = window.Store.getPrefs().theme === 'day';
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        p.x += p.vx; p.y += p.vy; p.tw += 0.03;
        if (p.x < -10) p.x = w + 10; else if (p.x > w + 10) p.x = -10;
        if (p.y < -10) p.y = h + 10; else if (p.y > h + 10) p.y = -10;
        const dx = mouse.x - p.x, dy = mouse.y - p.y, d = Math.hypot(dx, dy);
        if (d < 180 && d > 0) { p.x -= (dx / d) * 0.6; p.y -= (dy / d) * 0.6; }
        for (let j = i + 1; j < pts.length; j++) {
          const q = pts[j], ex = p.x - q.x, ey = p.y - q.y, dd = ex * ex + ey * ey;
          if (dd < LINK * LINK) {
            ctx.strokeStyle = isDay
              ? `rgba(124,58,237,${(1 - Math.sqrt(dd) / LINK) * 0.18})`
              : `rgba(192,132,252,${(1 - Math.sqrt(dd) / LINK) * 0.22})`;
            ctx.lineWidth = 0.8;
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
          }
        }
        ctx.fillStyle = isDay
          ? `hsla(${p.hue},80%,45%,${0.4 + Math.sin(p.tw) * 0.25})`
          : `hsla(${p.hue},95%,78%,${0.55 + Math.sin(p.tw) * 0.35})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      }
      raf = requestAnimationFrame(frame);
    }

    function kick() {
      if (!raf && !document.hidden && !isMotionReduced()) raf = requestAnimationFrame(frame);
    }

    resize();
    kick();
    addEventListener('resize', resize);
    addEventListener('pointermove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
    document.addEventListener('visibilitychange', kick);
    window.Store.subscribePrefs(kick);
  }

  /* ---------- Custom Cursor ---------- */
  function initCursor() {
    if (!finePointer) return;
    const dot = document.createElement('div'); dot.className = 'cursor-dot';
    const ring = document.createElement('div'); ring.className = 'cursor-ring';
    const aura = document.createElement('div'); aura.className = 'cursor-aura';
    [dot, ring, aura].forEach((el) => { el.setAttribute('aria-hidden', 'true'); el.style.opacity = '0'; });
    document.body.append(aura, dot, ring);
    document.documentElement.classList.add('has-cursor');
    let x = innerWidth / 2, y = innerHeight / 2, rx = x, ry = y, ax = x, ay = y, visible = false;
    addEventListener('pointermove', (e) => {
      x = e.clientX; y = e.clientY;
      dot.style.transform = `translate3d(${x}px,${y}px,0)`;
      if (!visible) { visible = true; dot.style.opacity = ring.style.opacity = aura.style.opacity = '1'; }
      const target = e.target.closest?.('a, button, [data-cursor], input[type="checkbox"], summary, label, select');
      const label = e.target.closest?.('[data-cursor]')?.dataset.cursor;
      ring.classList.toggle('is-view', !!label);
      ring.textContent = label ? label.toUpperCase() : '';
      ring.classList.toggle('is-hover', !!target && !label);
    }, { passive: true });
    document.addEventListener('pointerleave', () => { visible = false; dot.style.opacity = ring.style.opacity = aura.style.opacity = '0'; });
    addEventListener('pointerdown', () => ring.classList.add('is-down'));
    addEventListener('pointerup', () => ring.classList.remove('is-down'));
    (function loop() {
      rx += (x - rx) * 0.18; ry += (y - ry) * 0.18;
      ax += (x - ax) * 0.06; ay += (y - ay) * 0.06;
      ring.style.transform = `translate3d(${rx}px,${ry}px,0)`;
      aura.style.transform = `translate3d(${ax}px,${ay}px,0)`;
      requestAnimationFrame(loop);
    })();
  }

  /* ---------- Reveal on Scroll & Counters ---------- */
  let io;
  function countUp(el) {
    const target = parseFloat(el.dataset.count);
    const decimals = (el.dataset.count.split('.')[1] || '').length;
    const suffix = el.dataset.suffix || '';
    const prefix = el.dataset.prefix || '';
    if (isMotionReduced()) { el.textContent = prefix + target.toFixed(decimals) + suffix; return; }
    const start = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - start) / 1800);
      const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
      el.textContent = prefix + (target * eased).toFixed(decimals) + suffix;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function observe(root = document) {
    $$('[data-stagger]', root).forEach((group) => {
      [...group.children].forEach((child, idx) => {
        if (!child.hasAttribute('data-reveal')) child.setAttribute('data-reveal', group.dataset.stagger || '');
        child.style.setProperty('--i', idx);
      });
    });
    const targets = $$('[data-reveal], [data-count]', root).filter((el) => !el.classList.contains('is-in'));
    if (!io || isMotionReduced()) {
      targets.forEach((el) => { el.classList.add('is-in'); if (el.dataset.count) countUp(el); });
      return;
    }
    targets.forEach((el) => io.observe(el));
  }

  function initReveal() {
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target;
          el.classList.add('is-in');
          if (el.dataset.count) countUp(el);
          io.unobserve(el);
        });
      }, { threshold: 0.1, rootMargin: '0px 0px -5% 0px' });
    }
    observe();
  }

  /* ---------- Pointer & Click Micro-Interactions ---------- */
  function initPointerFX() {
    if (!finePointer) return;
    document.addEventListener('pointermove', (e) => {
      const card = e.target.closest('.card, .site-card, .maket');
      if (card) {
        const r = card.getBoundingClientRect();
        card.style.setProperty('--mx', `${e.clientX - r.left}px`);
        card.style.setProperty('--my', `${e.clientY - r.top}px`);
      }
      if (isMotionReduced()) return;
      const tilt = e.target.closest('[data-tilt]');
      if (tilt) {
        const r = tilt.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        const max = parseFloat(tilt.dataset.tilt) || 6;
        tilt.style.transition = 'transform .15s ease-out, border-color .4s, box-shadow .5s';
        tilt.style.transform = `perspective(1000px) rotateX(${(-py * max).toFixed(2)}deg) rotateY(${(px * max).toFixed(2)}deg) translateY(-4px)`;
        tilt.style.setProperty('--gx', `${(px + 0.5) * 100}%`);
        tilt.style.setProperty('--gy', `${(py + 0.5) * 100}%`);
      }
      const mag = e.target.closest('[data-magnetic]');
      if (mag) {
        const r = mag.getBoundingClientRect();
        mag.style.transform = `translate(${(e.clientX - (r.left + r.width / 2)) * 0.22}px, ${(e.clientY - (r.top + r.height / 2)) * 0.3}px)`;
      }
    }, { passive: true });
    document.addEventListener('pointerout', (e) => {
      const tilt = e.target.closest('[data-tilt]');
      if (tilt && !tilt.contains(e.relatedTarget)) { tilt.style.transition = ''; tilt.style.transform = ''; }
      const mag = e.target.closest('[data-magnetic]');
      if (mag && !mag.contains(e.relatedTarget)) mag.style.transform = '';
    });
    $$('[data-parallax-scene]').forEach((scene) => {
      const layers = $$('[data-depth]', scene);
      addEventListener('pointermove', (e) => {
        if (isMotionReduced()) return;
        const cx = e.clientX / innerWidth - 0.5, cy = e.clientY / innerHeight - 0.5;
        layers.forEach((l) => {
          const d = parseFloat(l.dataset.depth);
          l.style.transform = `translate3d(${-cx * d * 36}px, ${-cy * d * 36}px, 0) rotateX(${cy * d * 5}deg) rotateY(${-cx * d * 5}deg)`;
        });
      }, { passive: true });
    });
  }

  function burst(x, y, n = 12) {
    if (isMotionReduced()) return;
    for (let i = 0; i < n; i++) {
      const s = document.createElement('span');
      s.className = 'spark';
      const a = (Math.PI * 2 * i) / n + Math.random() * 0.5;
      const dist = 36 + Math.random() * 48;
      s.style.left = x + 'px'; s.style.top = y + 'px';
      s.style.setProperty('--tx', `${Math.cos(a) * dist}px`);
      s.style.setProperty('--ty', `${Math.sin(a) * dist}px`);
      s.style.setProperty('--h', 260 + Math.random() * 70);
      document.body.appendChild(s);
      s.addEventListener('animationend', () => s.remove());
    }
  }

  function initClickFX() {
    document.addEventListener('pointerdown', (e) => {
      const btn = e.target.closest('.btn, .cbtn, .icon-btn, .fab__main, .seg__btn');
      if (!btn || isMotionReduced()) return;
      const r = btn.getBoundingClientRect();
      const size = Math.max(r.width, r.height) * 2.1;
      const rip = document.createElement('span');
      rip.className = 'ripple';
      rip.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - r.left - size / 2}px;top:${e.clientY - r.top - size / 2}px`;
      btn.appendChild(rip);
      rip.addEventListener('animationend', () => rip.remove());
    });
    document.addEventListener('click', (e) => {
      if (isMotionReduced()) return;
      const btn = e.target.closest('.btn--primary, .cbtn');
      if (btn && e.clientX) burst(e.clientX, e.clientY);
      const hv = e.target.closest('.hero-visual');
      if (hv) {
        const wave = document.createElement('span');
        wave.className = 'shockwave';
        hv.appendChild(wave);
        wave.addEventListener('animationend', () => wave.remove());
        burst(e.clientX, e.clientY, 18);
      }
    });
  }

  function initRotators() {
    $$('.rotator').forEach((rot) => {
      const items = [...rot.children];
      if (items.length < 2) return;
      let idx = 0;
      items[0].classList.add('is-current');
      setInterval(() => {
        if (isMotionReduced()) return;
        const prev = items[idx];
        idx = (idx + 1) % items.length;
        prev.classList.remove('is-current'); prev.classList.add('is-leaving');
        items[idx].classList.remove('is-leaving'); items[idx].classList.add('is-current');
        setTimeout(() => prev.classList.remove('is-leaving'), 800);
      }, 2600);
    });
  }

  function initMarquees() {
    $$('[data-marquee]').forEach((track) => {
      const clone = [...track.children].map((n) => { const c = n.cloneNode(true); c.setAttribute('aria-hidden', 'true'); return c; });
      track.append(...clone);
    });
  }

  /* ---------- Bootstrap ---------- */
  window.Vanta = {
    icon, hydrateIcons, observe, toast, go, esc, initials, $, $$,
    get reduceMotion() { return isMotionReduced(); },
    contactStrip, bindContacts, applyI18n, openSettingsModal, syncModalBodyState, burst, t, loc
  };
  window.toast = toast;

  injectDecor();
  customElements.define('site-header', SiteHeader);
  customElements.define('site-footer', SiteFooter);
  hydrateIcons();
  applyI18n();
  initTransitions();
  initReveal();
  initParticles();
  initCursor();
  initPointerFX();
  initClickFX();
  initRotators();
  initMarquees();
  renderFab();

  window.Store.subscribePrefs(() => {
    applyI18n();
    renderFab();
    if (settingsDlg?.open) renderSettingsModal();
  });
  window.Store.subscribe(() => {
    bindContacts();
    renderFab();
  });
})();
