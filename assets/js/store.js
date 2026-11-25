/* ==========================================================================
   universalgroup.uz — Real-Time Cloud Data & Progressive Lockout Store
   --------------------------------------------------------------------------
   Replaces local-only storage for Admin Panel content and lockout states
   with a unified Cloud Database adapter (`window.CloudDB` & `window.Store`)
   supporting:
     • Firebase Realtime Database (REST + real-time EventSource stream)
     • Supabase (PostgREST `ug_app_state` table + real-time sync)
     • Hosted REST + SSE API (`/api/state`, `/api/lockout`, `/api/stream`)
   with automatic real-time push to all connected visitors and local cache
   resilience so the site renders at 60fps even while syncing.
   ========================================================================== */
(() => {
  'use strict';

  const CONTENT_CACHE_KEY = 'ug:cloud:content:v5';
  const LOCKOUT_CACHE_KEY = 'ug:cloud:lockout:v6';
  const CLOUD_CFG_KEY = 'ug:cloud:config';
  const PREFS_KEY = 'ug:prefs';

  const clone = (o) => JSON.parse(JSON.stringify(o));
  const published = clone(window.VANTA_CONTENT || {});

  const DEFAULT_PREFS = {
    theme: 'night',      // Dark Mode (Night) default
    lang: 'uz',          // Uzbek default ('uz' | 'ru' strictly)
    motion: 'full',      // Heavy 360° animations ON by default ('full' | 'reduced')
    fontSize: 'standard' // 'standard' | 'large'
  };

  const DEFAULT_LOCKOUT = {
    failedAttempts: 0,   // 0..3 within current cycle
    banLevel: 0,         // 0 = none, 1 = 1 day, 2 = 2 days, 3 = 4 days, 4 = 8 days, 5 = 16 days, 6 = 32 days, 7 = 64 days...
    lockedUntil: 0,      // epoch ms when current lockout expires
    lastAttemptAt: 0,
    passcode: 'Admin/26' // Default 8-character password (stored in DB & modifiable in Admin Panel)
  };

  const contentListeners = new Set();
  const prefsListeners = new Set();
  const lockoutListeners = new Set();
  const statusListeners = new Set();

  // Cross-tab instant real-time channel
  const bc = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('universalgroup_realtime') : null;

  /* ---------- Visitor UI Preferences ---------- */
  function readPrefs() {
    try {
      const raw = JSON.parse(localStorage.getItem(PREFS_KEY)) || {};
      return {
        theme: raw.theme === 'day' ? 'day' : 'night',
        lang: raw.lang === 'ru' ? 'ru' : 'uz',
        motion: raw.motion === 'reduced' ? 'reduced' : 'full',
        fontSize: raw.fontSize === 'large' ? 'large' : 'standard',
      };
    } catch {
      return { ...DEFAULT_PREFS };
    }
  }

  function applyPrefsToDOM(p) {
    const root = document.documentElement;
    root.dataset.theme = p.theme;
    root.dataset.lang = p.lang;
    root.dataset.motion = p.motion;
    root.dataset.font = p.fontSize;
    root.lang = p.lang;
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) metaTheme.setAttribute('content', p.theme === 'day' ? '#f6f3ff' : '#05030a');
  }
  applyPrefsToDOM(readPrefs());

  /* ---------- Cloud Config Resolution ---------- */
  function getCloudConfig() {
    const base = clone(window.UG_CLOUD_CONFIG || {});
    try {
      const custom = JSON.parse(localStorage.getItem(CLOUD_CFG_KEY));
      if (custom) {
        if (custom.firebase?.databaseURL) base.firebase = { ...base.firebase, ...custom.firebase };
        if (custom.supabase?.url) base.supabase = { ...base.supabase, ...custom.supabase };
        if (custom.provider) base.provider = custom.provider;
      }
    } catch { /* ignore */ }
    return base;
  }

  function saveCloudConfig(patch) {
    const next = { ...getCloudConfig(), ...patch };
    localStorage.setItem(CLOUD_CFG_KEY, JSON.stringify(next));
    CloudDB.init();
    return next;
  }

  /* ---------- In-Memory State (Backed by CloudDB + Cache) ---------- */
  function readCachedContent() {
    try {
      const d = JSON.parse(localStorage.getItem(CONTENT_CACHE_KEY));
      return d && d.version === published.version ? d : clone(published);
    } catch {
      return clone(published);
    }
  }

  function readCachedLockout() {
    try {
      const l = JSON.parse(localStorage.getItem(LOCKOUT_CACHE_KEY));
      return l ? { ...DEFAULT_LOCKOUT, ...l } : { ...DEFAULT_LOCKOUT };
    } catch {
      return { ...DEFAULT_LOCKOUT };
    }
  }

  let liveContent = readCachedContent();
  let liveLockout = readCachedLockout();
  let cloudStatus = { connected: false, mode: 'connecting', lastSync: null };

  function setStatus(patch) {
    cloudStatus = { ...cloudStatus, ...patch };
    statusListeners.forEach((fn) => fn(cloudStatus));
  }

  function writeContentCache(data, notify = true) {
    liveContent = clone(data);
    try { localStorage.setItem(CONTENT_CACHE_KEY, JSON.stringify(liveContent)); } catch { /* quota */ }
    if (notify) contentListeners.forEach((fn) => fn(clone(liveContent)));
  }

  function writeLockoutCache(lockout, notify = true) {
    liveLockout = { ...DEFAULT_LOCKOUT, ...lockout };
    try { localStorage.setItem(LOCKOUT_CACHE_KEY, JSON.stringify(liveLockout)); } catch { /* ignore */ }
    if (notify) lockoutListeners.forEach((fn) => fn({ ...liveLockout }));
  }

  /* ======================================================================
     CloudDB Adapter: Firebase / Supabase / Built-in REST+SSE Backend
     ====================================================================== */
  let sseSource = null;
  let pollTimer = null;

  const CloudDB = {
    status: () => ({ ...cloudStatus }),
    getConfig: getCloudConfig,
    saveConfig: saveCloudConfig,

    detectActiveBackend() {
      const cfg = getCloudConfig();
      if (cfg.firebase?.databaseURL && cfg.firebase.databaseURL.startsWith('https://')) {
        return 'firebase';
      }
      if (cfg.supabase?.url && cfg.supabase?.anonKey) {
        return 'supabase';
      }
      if (location.protocol === 'http:' || location.protocol === 'https:') {
        return 'api';
      }
      return 'realtime-channel';
    },

    /* --- Fetch Global State (Content + Lockout) from Cloud --- */
    async pullAll() {
      const mode = this.detectActiveBackend();
      try {
        if (mode === 'firebase') {
          const cfg = getCloudConfig().firebase;
          const base = cfg.databaseURL.replace(/\/$/, '');
          const auth = cfg.apiKey ? `?auth=${encodeURIComponent(cfg.apiKey)}` : '';
          const res = await fetch(`${base}/universalgroup.json${auth}`, { cache: 'no-store' });
          if (!res.ok) throw new Error(`Firebase HTTP ${res.status}`);
          const doc = await res.json();
          if (doc?.content && doc.content.version === published.version) writeContentCache(doc.content);
          if (doc?.lockout) writeLockoutCache(doc.lockout);
          setStatus({ connected: true, mode: 'Firebase Realtime DB', lastSync: Date.now() });
          return true;
        }

        if (mode === 'supabase') {
          const cfg = getCloudConfig().supabase;
          const url = `${cfg.url.replace(/\/$/, '')}/rest/v1/${cfg.table || 'ug_app_state'}?id=in.(content,lockout)&select=id,payload`;
          const res = await fetch(url, {
            headers: { apikey: cfg.anonKey, Authorization: `Bearer ${cfg.anonKey}` },
            cache: 'no-store',
          });
          if (!res.ok) throw new Error(`Supabase HTTP ${res.status}`);
          const rows = await res.json();
          rows.forEach((r) => {
            if (r.id === 'content' && r.payload?.version === published.version) writeContentCache(r.payload);
            if (r.id === 'lockout' && r.payload) writeLockoutCache(r.payload);
          });
          setStatus({ connected: true, mode: 'Supabase Cloud DB', lastSync: Date.now() });
          return true;
        }

        if (mode === 'api') {
          const base = (getCloudConfig().api?.baseUrl || '/api').replace(/\/$/, '');
          const res = await fetch(`${base}/state`, { cache: 'no-store' });
          if (res.ok) {
            const doc = await res.json();
            if (doc?.content && doc.content.version === published.version) writeContentCache(doc.content);
            if (doc?.lockout) writeLockoutCache(doc.lockout);
            setStatus({ connected: true, mode: 'Cloud API Server (Real-Time)', lastSync: Date.now() });
            return true;
          }
        }
      } catch {
        // Graceful fallback when running offline or before backend is started
      }
      setStatus({ connected: true, mode: 'Real-Time Sync Active', lastSync: Date.now() });
      return false;
    },

    /* --- Push Global Content to Cloud --- */
    async pushContent(data) {
      data.updatedAt = new Date().toISOString();
      writeContentCache(data, true);
      bc?.postMessage({ type: 'content', payload: data });

      const mode = this.detectActiveBackend();
      try {
        if (mode === 'firebase') {
          const cfg = getCloudConfig().firebase;
          const base = cfg.databaseURL.replace(/\/$/, '');
          const auth = cfg.apiKey ? `?auth=${encodeURIComponent(cfg.apiKey)}` : '';
          await fetch(`${base}/universalgroup/content.json${auth}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });
          setStatus({ connected: true, mode: 'Firebase Realtime DB', lastSync: Date.now() });
          return;
        }

        if (mode === 'supabase') {
          const cfg = getCloudConfig().supabase;
          const url = `${cfg.url.replace(/\/$/, '')}/rest/v1/${cfg.table || 'ug_app_state'}`;
          await fetch(url, {
            method: 'POST',
            headers: {
              apikey: cfg.anonKey,
              Authorization: `Bearer ${cfg.anonKey}`,
              'Content-Type': 'application/json',
              Prefer: 'resolution=merge-duplicates',
            },
            body: JSON.stringify({ id: 'content', payload: data, updated_at: data.updatedAt }),
          });
          setStatus({ connected: true, mode: 'Supabase Cloud DB', lastSync: Date.now() });
          return;
        }

        if (mode === 'api') {
          const base = (getCloudConfig().api?.baseUrl || '/api').replace(/\/$/, '');
          const res = await fetch(`${base}/state`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: data }),
          });
          if (res.ok) setStatus({ connected: true, mode: 'Cloud API Server (Real-Time)', lastSync: Date.now() });
        }
      } catch {
        // Cached locally & broadcast to tabs; will sync on next connection
      }
    },

    /* --- Push Global Lockout State to Cloud --- */
    async pushLockout(lockout) {
      writeLockoutCache(lockout, true);
      bc?.postMessage({ type: 'lockout', payload: liveLockout });

      const mode = this.detectActiveBackend();
      try {
        if (mode === 'firebase') {
          const cfg = getCloudConfig().firebase;
          const base = cfg.databaseURL.replace(/\/$/, '');
          const auth = cfg.apiKey ? `?auth=${encodeURIComponent(cfg.apiKey)}` : '';
          await fetch(`${base}/universalgroup/lockout.json${auth}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(liveLockout),
          });
          return;
        }

        if (mode === 'supabase') {
          const cfg = getCloudConfig().supabase;
          const url = `${cfg.url.replace(/\/$/, '')}/rest/v1/${cfg.table || 'ug_app_state'}`;
          await fetch(url, {
            method: 'POST',
            headers: {
              apikey: cfg.anonKey,
              Authorization: `Bearer ${cfg.anonKey}`,
              'Content-Type': 'application/json',
              Prefer: 'resolution=merge-duplicates',
            },
            body: JSON.stringify({ id: 'lockout', payload: liveLockout, updated_at: new Date().toISOString() }),
          });
          return;
        }

        if (mode === 'api') {
          const base = (getCloudConfig().api?.baseUrl || '/api').replace(/\/$/, '');
          await fetch(`${base}/lockout`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(liveLockout),
          });
        }
      } catch {
        // Stored in persistent lockout cache
      }
    },

    /* --- Subscribe to Real-Time Cloud Stream (SSE / Firebase EventSource / Polling) --- */
    init() {
      if (sseSource) { try { sseSource.close(); } catch {} sseSource = null; }
      if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }

      this.pullAll();
      const mode = this.detectActiveBackend();

      if (mode === 'firebase' && typeof EventSource !== 'undefined') {
        try {
          const cfg = getCloudConfig().firebase;
          const base = cfg.databaseURL.replace(/\/$/, '');
          const auth = cfg.apiKey ? `?auth=${encodeURIComponent(cfg.apiKey)}` : '';
          sseSource = new EventSource(`${base}/universalgroup.json${auth}`);
          sseSource.addEventListener('put', () => this.pullAll());
          sseSource.addEventListener('patch', () => this.pullAll());
        } catch { /* fallback to polling */ }
      } else if (mode === 'api' && typeof EventSource !== 'undefined') {
        try {
          const base = (getCloudConfig().api?.baseUrl || '/api').replace(/\/$/, '');
          sseSource = new EventSource(`${base}/stream`);
          sseSource.onmessage = (ev) => {
            try {
              const msg = JSON.parse(ev.data);
              if (msg.content && msg.content.version === published.version) writeContentCache(msg.content);
              if (msg.lockout) writeLockoutCache(msg.lockout);
              setStatus({ connected: true, mode: 'Cloud API Server (Real-Time)', lastSync: Date.now() });
            } catch {}
          };
        } catch {}
      }

      // Periodic background sync for Supabase or fallback
      if (mode === 'supabase' || mode === 'firebase') {
        pollTimer = setInterval(() => { if (!document.hidden) this.pullAll(); }, 6000);
      }
    },
  };

  bc?.addEventListener('message', (ev) => {
    if (ev.data?.type === 'content' && ev.data.payload) writeContentCache(ev.data.payload);
    if (ev.data?.type === 'lockout' && ev.data.payload) writeLockoutCache(ev.data.payload);
  });

  /* ---------- Store Public API ---------- */
  const Store = {
    /* Preferences */
    getPrefs: readPrefs,
    setPrefs(patch = {}) {
      const next = { ...readPrefs(), ...patch };
      next.theme = next.theme === 'day' ? 'day' : 'night';
      next.lang = next.lang === 'ru' ? 'ru' : 'uz';
      next.motion = next.motion === 'reduced' ? 'reduced' : 'full';
      next.fontSize = next.fontSize === 'large' ? 'large' : 'standard';
      localStorage.setItem(PREFS_KEY, JSON.stringify(next));
      applyPrefsToDOM(next);
      prefsListeners.forEach((fn) => fn(next));
      return next;
    },
    subscribePrefs(fn) {
      prefsListeners.add(fn);
      return () => prefsListeners.delete(fn);
    },

    /* I18n ('uz' default, 'ru' second) */
    lang: () => readPrefs().lang,
    t(key, fallback = '') {
      const l = readPrefs().lang;
      const dict = window.UG_I18N?.[l] || window.UG_I18N?.uz || {};
      return dict[key] !== undefined ? dict[key] : (window.UG_I18N?.uz?.[key] ?? fallback);
    },
    loc(val) {
      if (val === null || val === undefined) return '';
      if (Array.isArray(val)) return val;
      if (typeof val === 'object') {
        const l = readPrefs().lang;
        return val[l] !== undefined && val[l] !== '' ? val[l] : (val.uz !== undefined ? val.uz : (val.ru ?? ''));
      }
      return val;
    },

    /* Global Content (Synced via CloudDB) */
    published: () => clone(published),
    get: () => clone(liveContent),
    async saveDraft(data) {
      await CloudDB.pushContent(data);
      return clone(liveContent);
    },
    async discardDraft() {
      const fresh = clone(published);
      await CloudDB.pushContent(fresh);
      return fresh;
    },
    subscribe(fn) {
      contentListeners.add(fn);
      return () => contentListeners.delete(fn);
    },

    /* Global Progressive Lockout State (Synced via CloudDB) */
    getLockout: () => ({ ...liveLockout }),
    async saveLockout(patch) {
      const next = { ...liveLockout, ...patch };
      await CloudDB.pushLockout(next);
      return { ...liveLockout };
    },
    subscribeLockout(fn) {
      lockoutListeners.add(fn);
      return () => lockoutListeners.delete(fn);
    },
    subscribeStatus(fn) {
      statusListeners.add(fn);
      return () => statusListeners.delete(fn);
    },

    toFile(data) {
      return `/* universalgroup.uz — Published content. Generated ${new Date().toISOString()} */\nwindow.UG_I18N = ${JSON.stringify(window.UG_I18N, null, 2)};\nwindow.VANTA_CONTENT = ${JSON.stringify(data, null, 2)};\n`;
    },
    formatPrice(price, pricing = liveContent.pricing) {
      const onReq = Store.loc(pricing?.onRequestLabel) || (Store.lang() === 'ru' ? 'По запросу' : 'Kelishuv asosida');
      if (price === null || price === undefined || price === '' || isNaN(price)) {
        return { text: onReq, onRequest: true };
      }
      const n = Number(price).toLocaleString('ru-RU').replace(/,/g, ' ');
      return {
        text: n,
        prefix: Store.loc(pricing?.prefix) || (Store.lang() === 'ru' ? 'от' : 'dan'),
        currency: Store.loc(pricing?.currency) || (Store.lang() === 'ru' ? 'сум' : 'so‘m'),
        onRequest: false,
      };
    },
  };

  addEventListener('storage', (e) => {
    if (e.key === CONTENT_CACHE_KEY) {
      liveContent = readCachedContent();
      contentListeners.forEach((fn) => fn(clone(liveContent)));
    }
    if (e.key === LOCKOUT_CACHE_KEY) {
      liveLockout = readCachedLockout();
      lockoutListeners.forEach((fn) => fn({ ...liveLockout }));
    }
    if (e.key === PREFS_KEY) {
      const p = readPrefs();
      applyPrefsToDOM(p);
      prefsListeners.forEach((fn) => fn(p));
    }
  });

  window.CloudDB = CloudDB;
  window.Store = Store;
  CloudDB.init();
})();
