/* ==========================================================================
   universalgroup.uz — 8-Digit Passcode Auth, Progressive Exponential Lockout
   & Cloud-Backed Unified Admin Panel
   --------------------------------------------------------------------------
   1. 8-Digit Numeric Passcode Authentication Modal:
      - Opened by clicking the subtle "Admin Panel" button at the bottom of
        the Settings menu.
      - Requires an exact 8-digit numeric passcode (Default: "23071986" —
        client birth date 23.07.1986; customizable in Admin Panel).
   2. Exponential Brute-Force Lockout Protection (Persisted via CloudDB):
      - Allows up to 3 failed attempts per cycle.
      - On the 3rd failed attempt, locks access for 1 day (24 hours) and
        shows a live 1-second countdown timer.
      - If the user returns after the lockout expires and fails 3 times
        again, doubles the lockout duration: 2 days (then 4 days, 8 days,
        16 days, 32 days, 64 days, etc. — 2^(banLevel - 1) days).
      - Resets failedAttempts and banLevel ONLY upon a successful login.
   3. Real-Time Cloud Persistence:
      - Every Portfolio, Service, Price, Profile, and Photo edit is pushed
        to CloudDB (Firebase / Supabase / Cloud API) so all public visitors
        see updates in real time.
   ========================================================================== */
(() => {
  'use strict';
  const { icon, esc, toast, $, $$, t, loc } = window.Vanta;

  const ADMIN_SESSION_KEY = 'ug:admin:verified:v5';
  const DAY_MS = 24 * 60 * 60 * 1000; // 86,400,000 ms (1 day)
  const MAX_ATTEMPTS = 3;

  const ICON_CHOICES = [
    ['globe', '360° Globe'],
    ['vr', 'VR / AR Headset'],
    ['code', 'Web / Code'],
    ['cube', '3D Cube / IoT'],
    ['target', 'Drone / Media'],
    ['shield', 'Security / Server'],
    ['sparkles', 'Creative / Sparkles'],
    ['layers', 'Design / Layers'],
    ['camera', 'Camera / Photo'],
    ['zap', 'Fast / Zap'],
  ];

  /* ---------- Image Compressor ---------- */
  function readImageFile(file, maxW = 1400, quality = 0.84) {
    return new Promise((resolve, reject) => {
      if (!file || !file.type.startsWith('image/')) {
        reject(new Error('Invalid image file.'));
        return;
      }
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Could not read image.'));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('Unsupported image format.'));
        img.onload = () => {
          const scale = Math.min(1, maxW / img.width);
          const w = Math.round(img.width * scale);
          const h = Math.round(img.height * scale);
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          const out = canvas.toDataURL('image/webp', quality);
          resolve(out.startsWith('data:image/webp') ? out : canvas.toDataURL('image/jpeg', quality));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function extractDomain(urlStr) {
    try {
      const u = new URL(urlStr.startsWith('http') ? urlStr : `https://${urlStr}`);
      return u.hostname.replace(/^www\./, '');
    } catch {
      return String(urlStr || '').replace(/^https?:\/\//, '').split('/')[0] || 'universalgroup.uz';
    }
  }

  /* ---------- Exponential Lockout Math & Countdown Formatting ---------- */
  function getEffectiveLockout() {
    const L = window.Store.getLockout();
    const now = Date.now();
    // If a previous lockout has expired, reset failedAttempts to 0 for the new 3-attempt cycle,
    // while keeping banLevel intact so the next 3-strike failure doubles the ban!
    if (L.lockedUntil > 0 && now >= L.lockedUntil) {
      L.lockedUntil = 0;
      L.failedAttempts = 0;
      window.Store.saveLockout({ lockedUntil: 0, failedAttempts: 0 });
    }
    return L;
  }

  function banDaysForLevel(level) {
    // level 1 -> 1 day, level 2 -> 2 days, level 3 -> 4 days, level 4 -> 8 days, level 5 -> 16 days, level 6 -> 32 days, level 7 -> 64 days...
    return Math.pow(2, Math.max(0, level - 1));
  }

  function formatCountdown(msRemaining) {
    const totalSec = Math.max(0, Math.ceil(msRemaining / 1000));
    const days = Math.floor(totalSec / 86400);
    const hours = Math.floor((totalSec % 86400) / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    const pad = (n) => String(n).padStart(2, '0');
    const isRu = window.Store.lang() === 'ru';
    return `${pad(days)}${isRu ? 'д' : 'k'} : ${pad(hours)}${isRu ? 'ч' : 's'} : ${pad(mins)}${isRu ? 'м' : 'd'} : ${pad(secs)}${isRu ? 'с' : 's'}`;
  }

  /* ======================================================================
     8-Character Unicode Password Authentication Modal
     (Supports Physical Desktop & Mobile On-Screen Keyboards, Full UTF-8:
      Uppercase, Lowercase, Numbers, Special Symbols, Cyrillic, Latin, etc.)
     ====================================================================== */
  let passDlg = null;
  let adminDlg = null;
  let pinBuffer = '';
  let pinError = '';
  let countdownInterval = null;
  let activeTab = 'services';
  let newProjImage = '';

  // Count and slice by Unicode code points so Cyrillic, Latin, symbols, etc. are exact
  const toChars = (str) => Array.from(String(str || ''));
  const charLen = (str) => toChars(str).length;
  const sliceChars = (str, max = 8) => toChars(str).slice(0, max).join('');

  function stopCountdown() {
    if (countdownInterval) {
      clearInterval(countdownInterval);
      countdownInterval = null;
    }
  }

  function startCountdown() {
    stopCountdown();
    countdownInterval = setInterval(() => {
      if (!passDlg?.open) { stopCountdown(); return; }
      const L = window.Store.getLockout();
      const rem = (L.lockedUntil || 0) - Date.now();
      const timerEl = $('[data-lockout-timer]', passDlg);
      if (rem <= 0) {
        stopCountdown();
        getEffectiveLockout();
        renderPasscodeModal(true);
      } else if (timerEl) {
        timerEl.textContent = formatCountdown(rem);
      }
    }, 1000);
  }

  function focusPasscodeInput() {
    const input = $('[data-passcode-input]', passDlg);
    if (!input || input.disabled) return;
    input.focus();
    try {
      const len = input.value.length;
      input.setSelectionRange(len, len);
    } catch { /* ignore */ }
  }

  // Updates the 8 visual slots in place WITHOUT replacing the <input>,
  // keeping the mobile on-screen keyboard open and focused while typing.
  function syncPinSlotsInPlace() {
    if (!passDlg) return;
    const chars = toChars(pinBuffer);
    const slots = $$('.pin-slot', passDlg);
    slots.forEach((slot, idx) => {
      const has = idx < chars.length;
      const active = idx === chars.length || (chars.length === 8 && idx === 7);
      slot.classList.toggle('is-filled', has);
      slot.classList.toggle('is-active', active);
      slot.classList.toggle('is-error', !!pinError);
      slot.textContent = has ? '●' : '';
    });
    const fieldWrap = $('.passcode-field', passDlg);
    if (fieldWrap) fieldWrap.classList.toggle('is-error', !!pinError);
    const countEl = $('[data-char-count]', passDlg);
    if (countEl) countEl.textContent = `${chars.length} / 8`;
    const errEl = $('[data-pin-error-box]', passDlg);
    if (errEl) {
      if (pinError) {
        errEl.hidden = false;
        const span = errEl.querySelector('span');
        if (span) span.textContent = pinError;
      } else {
        errEl.hidden = true;
      }
    }
  }

  function ensurePasscodeModal() {
    if (passDlg) return passDlg;
    passDlg = document.createElement('dialog');
    passDlg.className = 'passcode-modal';
    passDlg.setAttribute('aria-labelledby', 'passcode-modal-title');
    document.body.appendChild(passDlg);

    passDlg.addEventListener('close', () => {
      stopCountdown();
      pinBuffer = '';
      pinError = '';
      window.Vanta.syncModalBodyState?.();
    });

    passDlg.addEventListener('click', (e) => {
      if (e.target === passDlg || e.target.closest('[data-close-passcode]')) {
        passDlg.close();
        return;
      }
      if (e.target.closest('[data-pin-slots]')) {
        focusPasscodeInput();
      }
    });

    // Live input handler for both physical desktop and mobile on-screen keyboards
    passDlg.addEventListener('input', (e) => {
      const input = e.target.closest('[data-passcode-input]');
      if (!input) return;
      const L = getEffectiveLockout();
      if (L.lockedUntil > Date.now()) {
        input.value = '';
        return;
      }
      const trimmed = sliceChars(input.value, 8);
      if (input.value !== trimmed) input.value = trimmed;
      pinBuffer = trimmed;
      pinError = '';
      syncPinSlotsInPlace();

      // Grant instant login immediately when the exact 8-character password is entered
      const expected = String(L.passcode || window.UG_CLOUD_CONFIG?.defaultPasscode || 'Admin/26');
      if (charLen(pinBuffer) === 8 && pinBuffer === expected) {
        submitPasscode();
      }
    });

    // Form submission (Enter key on desktop and mobile keyboards or Submit button)
    passDlg.addEventListener('submit', async (e) => {
      const form = e.target.closest('[data-passcode-form]');
      if (!form) return;
      e.preventDefault();
      await submitPasscode();
    });

    return passDlg;
  }

  async function submitPasscode() {
    const isRu = window.Store.lang() === 'ru';
    const L = getEffectiveLockout();
    const now = Date.now();

    if (L.lockedUntil > now) {
      renderPasscodeModal(false);
      return;
    }

    const input = $('[data-passcode-input]', passDlg);
    if (input) pinBuffer = sliceChars(input.value, 8);

    if (charLen(pinBuffer) !== 8) {
      pinError = isRu
        ? 'Пароль должен содержать ровно 8 символов.'
        : 'Parol aynan 8 ta belgidan iborat bo‘lishi kerak.';
      syncPinSlotsInPlace();
      focusPasscodeInput();
      return;
    }

    const expected = String(L.passcode || window.UG_CLOUD_CONFIG?.defaultPasscode || 'Admin/26');
    const verified = pinBuffer === expected;

    if (verified) {
      // SUCCESS: Reset failedAttempts AND banLevel multiplier to 0
      await window.Store.saveLockout({
        failedAttempts: 0,
        banLevel: 0,
        lockedUntil: 0,
        lastAttemptAt: now,
      });
      sessionStorage.setItem(
        ADMIN_SESSION_KEY,
        JSON.stringify({ verifiedAt: now, exp: now + 8 * 3600 * 1000 })
      );
      pinBuffer = '';
      pinError = '';
      passDlg.close();
      toast(isRu ? 'Доступ разрешён. Админ-панель открыта.' : 'Parol tasdiqlandi. Admin panel ochildi.', 'success');
      UGAdmin.openModal();
      return;
    }

    // FAILED ATTEMPT
    const nextAttempts = (L.failedAttempts || 0) + 1;
    pinBuffer = '';
    if (input) input.value = '';

    if (nextAttempts >= MAX_ATTEMPTS) {
      // 3rd failed attempt -> Trigger exponential lockout: 1d, 2d, 4d, 8d, 16d, 32d, 64d...
      const nextBanLevel = (L.banLevel || 0) + 1;
      const banDays = banDaysForLevel(nextBanLevel);
      const lockedUntil = now + banDays * DAY_MS;

      await window.Store.saveLockout({
        failedAttempts: MAX_ATTEMPTS,
        banLevel: nextBanLevel,
        lockedUntil,
        lastAttemptAt: now,
      });

      pinError = isRu
        ? `Превышен лимит (3 ошибки). Доступ заблокирован на ${banDays} дн.`
        : `3 marta xato kiritildi. Kirish ${banDays} kunga bloklandi.`;
      renderPasscodeModal(false);
      startCountdown();
    } else {
      const rem = MAX_ATTEMPTS - nextAttempts;
      const nextBanDays = banDaysForLevel((L.banLevel || 0) + 1);
      await window.Store.saveLockout({
        failedAttempts: nextAttempts,
        lastAttemptAt: now,
      });
      pinError = isRu
        ? `Неверный 8-значный пароль. Осталось попыток: ${rem} (далее блокировка на ${nextBanDays} дн.)`
        : `8 belgili parol noto‘g‘ri. Qolgan urinishlar: ${rem} ta (keyin ${nextBanDays} kunlik blok)`;
      renderPasscodeModal(true);
    }
  }

  function renderPasscodeModal(autoFocus = true) {
    if (!passDlg) return;
    const isRu = window.Store.lang() === 'ru';
    const L = getEffectiveLockout();
    const now = Date.now();
    const isLocked = L.lockedUntil > now;
    const remMs = Math.max(0, (L.lockedUntil || 0) - now);
    const currentBanDays = banDaysForLevel(L.banLevel || 1);
    const nextBanDays = banDaysForLevel((L.banLevel || 0) + 1);
    const chars = toChars(pinBuffer);

    const slotsHTML = Array.from({ length: 8 }, (_, idx) => {
      const has = idx < chars.length;
      const active = !isLocked && idx === chars.length;
      return `<div class="pin-slot ${has ? 'is-filled' : ''} ${active ? 'is-active' : ''} ${pinError ? 'is-error' : ''}" aria-hidden="true">${has ? '●' : ''}</div>`;
    }).join('');

    const dotsHTML = Array.from({ length: MAX_ATTEMPTS }, (_, idx) => {
      const used = idx < (L.failedAttempts || 0);
      return `<span class="attempt-dot ${used ? 'is-used' : ''}"></span>`;
    }).join('');

    passDlg.innerHTML = `
      <div class="passcode-box">
        <div class="passcode-box__top">
          <span class="eyebrow">${icon('shield')} Admin Panel</span>
          <button class="icon-btn" type="button" data-close-passcode aria-label="Close">${icon('x')}</button>
        </div>

        <div>
          <h2 class="h3" id="passcode-modal-title">${isRu ? 'Введите 8-значный пароль администратора' : '8 belgili admin parolini kiriting'}</h2>
          <p class="muted" style="font-size:.86rem;margin-top:6px">
            ${isRu
              ? 'Поддерживаются буквы (латиница, кириллица, заглавные и строчные), цифры и спецсимволы. Нажмите Enter для входа.'
              : 'Harflar (lotin, kirill, katta va kichik), raqamlar hamda maxsus belgilar qo‘llab-quvvatlanadi. Tasdiqlash uchun Enter tugmasini bosing.'}
          </p>
        </div>

        ${isLocked
          ? `<div class="lockout-banner" role="alert">
               <div style="display:flex;align-items:center;justify-content:center;gap:8px;color:var(--danger);font-weight:800">
                 ${icon('lock')}
                 <span>${isRu ? `ДОСТУП ЗАБЛОКИРОВАН НА ${currentBanDays} ДН.` : `KIRISH ${currentBanDays} KUNGA BLOKLANDI`}</span>
               </div>
               <div class="lockout-banner__timer" data-lockout-timer>${formatCountdown(remMs)}</div>
               <p class="muted" style="font-size:.8rem">
                 ${isRu
                   ? `Лимит из 3 попыток исчерпан (уровень блокировки #${L.banLevel}). При повторных 3 ошибках после разблокировки срок удвоится до ${nextBanDays} дн.`
                   : `3 ta noto‘g‘ri urinish limiti tugadi (blok darajasi #${L.banLevel}). Blok muddati tugagach yana 3 marta xato qilinsa, muddat 2 barobar oshadi (${nextBanDays} kun).`}
               </p>
             </div>`
          : `<form class="passcode-input-wrap" data-passcode-form autocomplete="off">
               <div class="passcode-field ${pinError ? 'is-error' : ''}">
                 <input
                   type="password"
                   inputmode="text"
                   enterkeyhint="go"
                   autocomplete="off"
                   autocapitalize="none"
                   spellcheck="false"
                   data-passcode-input
                   value="${esc(pinBuffer)}"
                   placeholder="${isRu ? 'Введите 8 символов…' : '8 ta belgini kiriting…'}"
                   aria-label="${isRu ? '8-значный пароль администратора' : '8 belgili admin paroli'}"
                   required
                 >
               </div>

               <div class="pin-slots" data-pin-slots aria-hidden="true">${slotsHTML}</div>

               <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
                 <div class="attempt-dots">
                   ${dotsHTML}
                   <span>${isRu ? `Попыток: ${MAX_ATTEMPTS - (L.failedAttempts || 0)} из ${MAX_ATTEMPTS}` : `Urinishlar: ${MAX_ATTEMPTS - (L.failedAttempts || 0)} / ${MAX_ATTEMPTS}`}</span>
                 </div>
                 <small class="muted" style="font-size:.76rem">
                   <strong data-char-count>${chars.length} / 8</strong> · ${isRu ? `Блок за 3 ошибки: ${nextBanDays} дн.` : `3 xato uchun blok: ${nextBanDays} kun`}
                 </small>
               </div>

               <div class="form-alert" data-pin-error-box role="alert" style="justify-content:center" ${pinError ? '' : 'hidden'}>
                 ${icon('alert')}<span>${esc(pinError)}</span>
               </div>

               <button class="btn btn--primary" type="submit">
                 <span class="btn__label">${icon('shield')} ${isRu ? 'Войти в Админ-панель (Enter)' : 'Admin panelga kirish (Enter)'}</span>
               </button>
             </form>`}
      </div>`;

    if (isLocked) {
      startCountdown();
    } else {
      stopCountdown();
      if (autoFocus) {
        requestAnimationFrame(() => focusPasscodeInput());
      }
    }
  }

  /* ======================================================================
     UGAdmin Controller & Cloud-Backed Unified Admin Panel Modal
     ====================================================================== */
  const UGAdmin = {
    isVerified() {
      try {
        const L = getEffectiveLockout();
        if (L.lockedUntil > Date.now()) return false;
        const s = JSON.parse(sessionStorage.getItem(ADMIN_SESSION_KEY));
        return !!(s && s.exp > Date.now());
      } catch {
        return false;
      }
    },
    lock() {
      sessionStorage.removeItem(ADMIN_SESSION_KEY);
      if (adminDlg?.open) adminDlg.close();
    },
    openPasscodeModal() {
      if (this.isVerified()) {
        this.openModal();
        return;
      }
      pinBuffer = '';
      pinError = '';
      const dlg = ensurePasscodeModal();
      renderPasscodeModal();
      if (!dlg.open) {
        dlg.showModal();
        window.Vanta.syncModalBodyState?.();
      }
    },
    openModal() {
      if (!this.isVerified()) {
        this.openPasscodeModal();
        return;
      }
      const dlg = ensureAdminModal();
      renderAdminModal();
      if (!dlg.open) {
        dlg.showModal();
        window.Vanta.syncModalBodyState?.();
      }
    },
  };
  window.UGAdmin = UGAdmin;

  // Secret keyboard shortcut Ctrl+Shift+A opens 8-Digit Passcode Modal
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
      e.preventDefault();
      UGAdmin.openPasscodeModal();
    }
  });

  async function commit(state, msgUz = 'O‘zgarishlar bulutli bazaga saqlandi!', msgRu = 'Изменения сохранены в облачной БД!') {
    try {
      await window.Store.saveDraft(state);
      toast(window.Store.lang() === 'ru' ? msgRu : msgUz, 'success');
      if (adminDlg?.open) renderAdminModal();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  function ensureAdminModal() {
    if (adminDlg) return adminDlg;
    adminDlg = document.createElement('dialog');
    adminDlg.className = 'admin-modal';
    adminDlg.setAttribute('aria-label', 'Unified Admin Panel');
    document.body.appendChild(adminDlg);

    adminDlg.addEventListener('close', () => window.Vanta.syncModalBodyState?.());

    adminDlg.addEventListener('click', async (e) => {
      if (e.target === adminDlg || e.target.closest('[data-close-admin]')) {
        adminDlg.close();
        return;
      }
      const tabBtn = e.target.closest('[data-admin-tab]');
      if (tabBtn) {
        activeTab = tabBtn.dataset.adminTab;
        renderAdminModal();
        return;
      }
      if (e.target.closest('[data-admin-lock]')) {
        UGAdmin.lock();
        toast(window.Store.lang() === 'ru' ? 'Админ-панель заблокирована.' : 'Admin panel qulflandi.', 'info');
        return;
      }
      if (e.target.closest('[data-admin-reset]')) {
        await window.Store.discardDraft();
        renderAdminModal();
        toast(window.Store.lang() === 'ru' ? 'Восстановлены исходные данные.' : 'Boshlang‘ich ma’lumotlar tiklandi.', 'info');
        return;
      }
      if (e.target.closest('[data-admin-export]')) {
        const js = window.Store.toFile(window.Store.get());
        const blob = new Blob([js], { type: 'application/javascript;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'content.js';
        a.click();
        URL.revokeObjectURL(url);
        return;
      }

      const state = window.Store.get();

      const delSite = e.target.closest('[data-del-site]');
      if (delSite) {
        state.sites.splice(Number(delSite.dataset.delSite), 1);
        await commit(state, 'Loyiha o‘chirildi.', 'Проект удалён.');
        return;
      }
      const clrSite = e.target.closest('[data-clear-site]');
      if (clrSite) {
        state.sites[Number(clrSite.dataset.clearSite)].cover = '';
        await commit(state);
        return;
      }
      const delMaket = e.target.closest('[data-del-maket]');
      if (delMaket) {
        state.mockups.splice(Number(delMaket.dataset.delMaket), 1);
        await commit(state, 'Maket o‘chirildi.', 'Макет удалён.');
        return;
      }
      const clrMaket = e.target.closest('[data-clear-maket]');
      if (clrMaket) {
        state.mockups[Number(clrMaket.dataset.clearMaket)].image = '';
        await commit(state);
        return;
      }
      if (e.target.closest('[data-add-service]')) {
        state.services.push({
          id: 'svc-' + Date.now().toString(36),
          icon: 'sparkles',
          visible: true,
          image: '',
          title: window.Store.lang() === 'ru' ? 'Новая услуга' : 'Yangi xizmat',
          description: window.Store.lang() === 'ru' ? 'Описание новой услуги.' : 'Yangi xizmat tavsifi.',
          features: ['360° / VR / Web', 'Premium sifat', 'Texnik ko‘mak'],
          price: 3000000,
          unit: window.Store.lang() === 'ru' ? 'за проект' : 'loyiha uchun',
        });
        await commit(state, 'Yangi xizmat qo‘shildi.', 'Добавлена новая услуга.');
        return;
      }
      const delSvc = e.target.closest('[data-del-service]');
      if (delSvc) {
        state.services.splice(Number(delSvc.dataset.delService), 1);
        await commit(state, 'Xizmat o‘chirildi.', 'Услуга удалена.');
        return;
      }
      const clrSvc = e.target.closest('[data-clear-service-img]');
      if (clrSvc) {
        state.services[Number(clrSvc.dataset.clearServiceImg)].image = '';
        await commit(state);
        return;
      }
      if (e.target.closest('[data-clear-profile-photo]')) {
        state.profile.photo = '';
        await commit(state);
      }
    });

    adminDlg.addEventListener('change', async (e) => {
      const state = window.Store.get();

      if (e.target.matches('[data-new-proj-file]') && e.target.files?.[0]) {
        try {
          newProjImage = await readImageFile(e.target.files[0], 1500, 0.85);
          toast(window.Store.lang() === 'ru' ? 'Изображение готово.' : 'Rasm tayyor.', 'info');
        } catch (err) {
          toast(err.message, 'error');
        }
        return;
      }

      const siteCard = e.target.closest('[data-site-idx]');
      if (siteCard && e.target.dataset.siteField) {
        const idx = Number(siteCard.dataset.siteIdx);
        const s = state.sites[idx];
        const f = e.target.dataset.siteField;
        if (f === 'isPano') s.kind = e.target.checked ? 'pano' : 'site';
        else if (f === 'url') {
          const raw = e.target.value.trim();
          s.url = raw.startsWith('http') ? raw : `https://${raw}`;
          s.domain = extractDomain(s.url);
        } else s[f] = e.target.value;
        await commit(state);
        return;
      }

      if (e.target.matches('[data-upload-site]') && e.target.files?.[0]) {
        const idx = Number(e.target.dataset.uploadSite);
        try {
          state.sites[idx].cover = await readImageFile(e.target.files[0], 1600, 0.85);
          await commit(state);
        } catch (err) {
          toast(err.message, 'error');
        }
        return;
      }

      const maketCard = e.target.closest('[data-maket-idx]');
      if (maketCard && e.target.dataset.maketField) {
        const idx = Number(maketCard.dataset.maketIdx);
        const m = state.mockups[idx];
        const f = e.target.dataset.maketField;
        if (f === 'rot360') m.rot360 = e.target.checked;
        else m[f] = e.target.value;
        await commit(state);
        return;
      }

      if (e.target.matches('[data-upload-maket]') && e.target.files?.[0]) {
        const idx = Number(e.target.dataset.uploadMaket);
        try {
          state.mockups[idx].image = await readImageFile(e.target.files[0], 1400, 0.85);
          await commit(state);
        } catch (err) {
          toast(err.message, 'error');
        }
        return;
      }

      const svcCard = e.target.closest('[data-svc-idx]');
      if (svcCard && e.target.dataset.svcField) {
        const idx = Number(svcCard.dataset.svcIdx);
        const s = state.services[idx];
        const f = e.target.dataset.svcField;
        if (f === 'price') s.price = e.target.value.trim() === '' ? null : Number(e.target.value);
        else if (f === 'features') s.features = e.target.value.split('\n').map((x) => x.trim()).filter(Boolean);
        else s[f] = e.target.value;
        await commit(state);
        return;
      }

      if (e.target.matches('[data-upload-service]') && e.target.files?.[0]) {
        const idx = Number(e.target.dataset.uploadService);
        try {
          state.services[idx].image = await readImageFile(e.target.files[0], 1200, 0.85);
          await commit(state);
        } catch (err) {
          toast(err.message, 'error');
        }
        return;
      }

      if (e.target.matches('[data-upload-profile]') && e.target.files?.[0]) {
        try {
          state.profile.photo = await readImageFile(e.target.files[0], 1100, 0.86);
          await commit(state);
        } catch (err) {
          toast(err.message, 'error');
        }
      }
    });

    adminDlg.addEventListener('submit', async (e) => {
      e.preventDefault();
      const state = window.Store.get();

      const addProjForm = e.target.closest('[data-add-portfolio-form]');
      if (addProjForm) {
        const fd = new FormData(addProjForm);
        const type = fd.get('proj_type');
        const title = String(fd.get('title') || '').trim() || 'New Project';
        const category = String(fd.get('category') || '').trim() || '360° / Web';
        const rawUrl = String(fd.get('url') || '').trim();
        const rot360 = fd.get('rot360') === 'on';
        const desc = String(fd.get('description') || '').trim();

        if (type === 'maket') {
          state.mockups.push({
            id: 'maket-' + Date.now().toString(36),
            title,
            subtitle: category,
            image: newProjImage || '',
            rot360,
          });
        } else {
          const url = rawUrl ? (rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`) : 'https://universalgroup.uz';
          state.sites.push({
            id: 'site-' + Date.now().toString(36),
            title,
            url,
            domain: extractDomain(url),
            kind: rot360 ? 'pano' : 'site',
            scene: 'temurid',
            art: 'grid',
            cover: newProjImage || '',
            category,
            description: desc || category,
          });
        }
        newProjImage = '';
        addProjForm.reset();
        await commit(state, 'Yangi portfolio loyihasi qo‘shildi!', 'Новый проект добавлен в портфолио!');
        return;
      }

      const profForm = e.target.closest('[data-admin-profile-form]');
      if (profForm) {
        const fd = new FormData(profForm);
        state.profile.name = String(fd.get('name') || '').trim();
        state.profile.headline = String(fd.get('headline') || '').trim();
        state.profile.location = String(fd.get('location') || '').trim();
        state.profile.bio = String(fd.get('bio') || '').split(/\n{2,}/).map((x) => x.trim()).filter(Boolean);
        state.profile.skills = String(fd.get('skills') || '').split(',').map((x) => x.trim()).filter(Boolean);
        state.contact.phoneDisplay = String(fd.get('phoneDisplay') || '').trim() || '+998 90 353 70 60';
        state.contact.phoneHref = String(fd.get('phoneHref') || '').trim() || '+998903537060';
        state.contact.telegram = String(fd.get('telegram') || '').trim() || 'https://t.me/+998903537060';
        state.contact.email = String(fd.get('email') || '').trim();
        await commit(state);
        return;
      }

      // Change 8-Character Password Form inside Profile Tab
      const passForm = e.target.closest('[data-admin-password-form]');
      if (passForm) {
        const fd = new FormData(passForm);
        const newPin = String(fd.get('new_passcode') || '');
        if (charLen(newPin) !== 8) {
          toast(window.Store.lang() === 'ru' ? 'Пароль должен состоять ровно из 8 символов!' : 'Parol aynan 8 ta belgidan iborat bo‘lishi shart!', 'error');
          return;
        }
        await window.Store.saveLockout({ passcode: newPin });
        toast(window.Store.lang() === 'ru' ? 'Новый 8-значный пароль сохранён в базе данных!' : 'Yangi 8 belgili parol ma’lumotlar bazasiga saqlandi!', 'success');
        renderAdminModal();
        return;
      }

      // Optional Cloud Database Sync Config
      const cloudForm = e.target.closest('[data-admin-cloud-form]');
      if (cloudForm) {
        const fd = new FormData(cloudForm);
        window.CloudDB.saveConfig({
          firebase: {
            databaseURL: String(fd.get('fb_url') || '').trim(),
            apiKey: String(fd.get('fb_key') || '').trim(),
          },
          supabase: {
            url: String(fd.get('sb_url') || '').trim(),
            anonKey: String(fd.get('sb_key') || '').trim(),
            table: 'ug_app_state',
          },
        });
        await window.CloudDB.pushContent(window.Store.get());
        toast(window.Store.lang() === 'ru' ? 'Настройки облачной БД сохранены!' : 'Bulutli baza sozlamalari saqlandi!', 'success');
        renderAdminModal();
      }
    });

    return adminDlg;
  }

  function renderAdminModal() {
    if (!adminDlg) return;
    const state = window.Store.get();
    const isRu = window.Store.lang() === 'ru';
    const cloudCfg = window.CloudDB.getConfig();
    const cloudSt = window.CloudDB.status();
    const L = window.Store.getLockout();

    /* --- Tab 1: Portfolio Admin Panel --- */
    const portfolioPanelHTML = `
      <form class="card form" data-add-portfolio-form style="margin-bottom:28px">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px">
          <div>
            <span class="eyebrow">${isRu ? 'Добавить проект в портфолио' : 'Portfolioga yangi loyiha qo‘shish'}</span>
            <h3 class="h3" style="margin-top:8px">${isRu ? 'Новый живой сайт или дизайн-макет (Maket)' : 'Yangi jonli veb-sayt yoki Maket qo‘shish'}</h3>
          </div>
          <label class="check">
            <input type="checkbox" name="rot360" checked>
            <span>${icon('rotate')} ${isRu ? 'Включить непрерывное вращение 360°' : 'Uzluksiz 360° aylanish animatsiyasini yoqish'}</span>
          </label>
        </div>

        <div class="grid grid--4">
          <label class="field">
            <span class="field__label">${isRu ? 'Тип проекта' : 'Loyiha turi'}</span>
            <div class="field__control">
              <select name="proj_type">
                <option value="site">${isRu ? 'Живой веб-сайт (URL)' : 'Jonli veb-sayt (URL)'}</option>
                <option value="maket">${isRu ? 'Макет изображения (Maket)' : 'Rasm maketi (Maket)'}</option>
              </select>
            </div>
          </label>
          <label class="field">
            <span class="field__label">${isRu ? 'Название проекта' : 'Loyiha nomi'}</span>
            <div class="field__control"><input type="text" name="title" placeholder="Samarkand 360 / Maket 05" required></div>
          </label>
          <label class="field">
            <span class="field__label">${isRu ? 'URL сайта (если сайт)' : 'Veb-sayt URL manzili'}</span>
            <div class="field__control"><input type="text" name="url" placeholder="https://example.uz"></div>
          </label>
          <label class="field">
            <span class="field__label">${isRu ? 'Тег категории' : 'Kategoriya tegi'}</span>
            <div class="field__control"><input type="text" name="category" placeholder="360° Virtual Tour / Maket" required></div>
          </label>
        </div>

        <div class="form__row">
          <label class="field">
            <span class="field__label">${isRu ? 'Краткое описание' : 'Qisqacha tavsif'}</span>
            <div class="field__control"><input type="text" name="description" placeholder="${isRu ? 'Описание проекта...' : 'Loyiha haqida qisqacha...'}"></div>
          </label>
          <label class="field">
            <span class="field__label">${isRu ? 'Изображение макета / обложка 360°' : 'Maket rasmi yoki 360° muqova'}</span>
            <div class="field__control"><input type="file" accept="image/*" data-new-proj-file style="padding-top:10px"></div>
          </label>
        </div>

        <div>
          <button class="btn btn--primary btn--sm" type="submit">
            <span class="btn__label">${icon('plus')} ${isRu ? 'Опубликовать в Портфолио' : 'Portfolioga qo‘shish'}</span>
          </button>
        </div>
      </form>

      <h3 class="h3" style="margin-bottom:14px">${isRu ? 'Живые веб-сайты и 360° проекты' : 'Jonli veb-saytlar va 360° loyihalar'} (${(state.sites || []).length})</h3>
      <div class="grid grid--2" style="margin-bottom:34px">
        ${(state.sites || [])
          .map(
            (s, i) => `
          <div class="card admin-svc" data-site-idx="${i}">
            <div class="admin-svc__head">
              <div>
                <strong>${esc(loc(s.title))}</strong>
                <span class="muted" style="display:block;font-size:.8rem">${esc(s.domain || s.url)}</span>
              </div>
              <div class="admin-svc__controls">
                <label class="check">
                  <input type="checkbox" data-site-field="isPano" ${s.kind === 'pano' ? 'checked' : ''}>
                  <span>360°</span>
                </label>
                <button class="icon-btn icon-btn--danger" type="button" data-del-site="${i}" aria-label="Delete">${icon('trash')}</button>
              </div>
            </div>
            <div class="form__row">
              <label class="field">
                <span class="field__label">${isRu ? 'Название' : 'Nomi'}</span>
                <div class="field__control"><input type="text" data-site-field="title" value="${esc(loc(s.title))}"></div>
              </label>
              <label class="field">
                <span class="field__label">URL</span>
                <div class="field__control"><input type="text" data-site-field="url" value="${esc(s.url)}"></div>
              </label>
            </div>
            <div class="form__row">
              <label class="field">
                <span class="field__label">${isRu ? 'Категория' : 'Kategoriya'}</span>
                <div class="field__control"><input type="text" data-site-field="category" value="${esc(loc(s.category))}"></div>
              </label>
              <div class="upload-card__actions" style="align-self:end;padding-bottom:4px">
                <label class="btn btn--ghost btn--sm">
                  <input type="file" accept="image/*" hidden data-upload-site="${i}">
                  <span class="btn__label">${icon('upload')} ${s.cover ? (isRu ? 'Заменить фото' : 'Rasmni almashtirish') : (isRu ? 'Загрузить обложку' : 'Muqova yuklash')}</span>
                </label>
                ${s.cover ? `<button class="icon-btn icon-btn--danger" type="button" data-clear-site="${i}">${icon('x')}</button>` : ''}
              </div>
            </div>
          </div>`
          )
          .join('')}
      </div>

      <h3 class="h3" style="margin-bottom:14px">${isRu ? 'Макеты изображений (Maket)' : 'Maket namunalari (Maket)'} (${(state.mockups || []).length})</h3>
      <div class="grid grid--4">
        ${(state.mockups || [])
          .map(
            (m, i) => `
          <div class="card upload-slot" data-maket-idx="${i}">
            <div class="admin-svc__head" style="padding-bottom:8px">
              <strong>${esc(loc(m.title))}</strong>
              <div class="admin-svc__controls">
                <label class="check" title="360°">
                  <input type="checkbox" data-maket-field="rot360" ${m.rot360 ? 'checked' : ''}>
                  <span>360°</span>
                </label>
                <button class="icon-btn icon-btn--danger" type="button" data-del-maket="${i}">${icon('trash')}</button>
              </div>
            </div>
            <div class="upload-slot__media">
              ${m.image
                ? `<img src="${esc(m.image)}" alt="${esc(loc(m.title))}">`
                : `<div class="upload-card__empty">${icon('image')}<span>${esc(loc(m.title))}</span></div>`}
            </div>
            <label class="field">
              <span class="field__label">${isRu ? 'Название' : 'Sarlavha'}</span>
              <div class="field__control"><input type="text" data-maket-field="title" value="${esc(loc(m.title))}"></div>
            </label>
            <div class="upload-card__actions">
              <label class="btn btn--primary btn--sm" style="flex:1">
                <input type="file" accept="image/*" hidden data-upload-maket="${i}">
                <span class="btn__label">${icon('upload')} ${m.image ? (isRu ? 'Заменить' : 'Almashtirish') : (isRu ? 'Загрузить фото' : 'Rasm yuklash')}</span>
              </label>
              ${m.image ? `<button class="icon-btn icon-btn--danger" type="button" data-clear-maket="${i}">${icon('x')}</button>` : ''}
            </div>
          </div>`
          )
          .join('')}
      </div>`;

    /* --- Tab 2: Services, Dynamic Pricing & Service Photos --- */
    const servicesPanelHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:20px">
        <div>
          <h3 class="h3">${isRu ? 'Управление услугами, динамическими ценами и фото услуг' : 'Xizmatlar, dinamik narxlar va xizmat rasmlarini boshqarish'}</h3>
          <p class="muted" style="font-size:.88rem">${isRu ? 'Изменения цен и загруженные фото мгновенно синхронизируются для всех посетителей.' : 'Narxlar va yuklangan rasmlar barcha foydalanuvchilar uchun real vaqtda yangilanadi.'}</p>
        </div>
        <button class="btn btn--primary btn--sm" type="button" data-add-service>
          <span class="btn__label">${icon('plus')} ${isRu ? 'Добавить услугу' : 'Yangi xizmat qo‘shish'}</span>
        </button>
      </div>

      <div class="grid grid--2">
        ${(state.services || [])
          .map((s, i) => {
            const feats = Array.isArray(loc(s.features)) ? loc(s.features).join('\n') : String(loc(s.features) || '');
            return `
            <div class="card admin-svc" data-svc-idx="${i}">
              <div class="admin-svc__head">
                <div style="display:flex;align-items:center;gap:10px">
                  <span class="feature-icon" style="width:40px;height:40px;border-radius:12px">${icon(s.icon || 'sparkles')}</span>
                  <strong>#${String(i + 1).padStart(2, '0')} · ${esc(loc(s.title))}</strong>
                </div>
                <button class="icon-btn icon-btn--danger" type="button" data-del-service="${i}" aria-label="Delete">${icon('trash')}</button>
              </div>

              <div class="upload-slot__media" style="max-height:140px">
                ${s.image
                  ? `<img src="${esc(s.image)}" alt="${esc(loc(s.title))}">`
                  : `<div class="upload-card__empty">${icon('camera')}<span>${isRu ? 'Фото превью услуги (необязательно)' : 'Xizmat uchun rasm (ixtiyoriy)'}</span></div>`}
              </div>
              <div class="upload-card__actions">
                <label class="btn btn--ghost btn--sm">
                  <input type="file" accept="image/*" hidden data-upload-service="${i}">
                  <span class="btn__label">${icon('upload')} ${s.image ? (isRu ? 'Заменить фото услуги' : 'Xizmat rasmini almashtirish') : (isRu ? 'Загрузить фото услуги' : 'Xizmat rasmini yuklash')}</span>
                </label>
                ${s.image ? `<button class="btn btn--ghost btn--sm" type="button" data-clear-service-img="${i}">${icon('trash')}</button>` : ''}
              </div>

              <div class="form__row">
                <label class="field">
                  <span class="field__label">${isRu ? 'Название услуги' : 'Xizmat nomi'}</span>
                  <div class="field__control"><input type="text" data-svc-field="title" value="${esc(loc(s.title))}"></div>
                </label>
                <label class="field">
                  <span class="field__label">${isRu ? 'Динамическая цена (UZS)' : 'Dinamik narxi (so‘m)'}</span>
                  <div class="field__control"><input type="number" step="1000" min="0" data-svc-field="price" value="${s.price !== null && s.price !== undefined ? esc(s.price) : ''}" placeholder="${isRu ? 'По запросу' : 'Kelishuv asosida'}"></div>
                </label>
              </div>

              <div class="form__row">
                <label class="field">
                  <span class="field__label">${isRu ? 'Иконка' : 'Belgi (Icon)'}</span>
                  <div class="field__control">
                    <select data-svc-field="icon">
                      ${ICON_CHOICES.map(([val, lbl]) => `<option value="${val}" ${s.icon === val ? 'selected' : ''}>${lbl}</option>`).join('')}
                    </select>
                  </div>
                </label>
                <label class="field">
                  <span class="field__label">${isRu ? 'Единица расчёта' : 'Hisob birligi'}</span>
                  <div class="field__control"><input type="text" data-svc-field="unit" value="${esc(loc(s.unit))}"></div>
                </label>
              </div>

              <label class="field">
                <span class="field__label">${isRu ? 'Описание' : 'Tavsif'}</span>
                <div class="field__control"><textarea rows="2" data-svc-field="description">${esc(loc(s.description))}</textarea></div>
              </label>

              <label class="field">
                <span class="field__label">${isRu ? 'Пункты (каждый с новой строки)' : 'Afzalliklar (har qatorda bittadan)'}</span>
                <div class="field__control"><textarea rows="3" data-svc-field="features">${esc(feats)}</textarea></div>
              </label>
            </div>`;
          })
          .join('')}
      </div>`;

    /* --- Tab 3: Profile ("Профиль" — Avatar, Bio, Contacts, Social Links & Change 8-Character Admin Password) --- */
    const p = state.profile || {};
    const c = state.contact || {};
    const bioStr = Array.isArray(loc(p.bio)) ? loc(p.bio).join('\n\n') : String(loc(p.bio) || '');
    const profilePanelHTML = `
      <!-- 1. Change 8-Character Admin Password (Saved Directly to Database) -->
      <form class="card form" data-admin-password-form style="margin-bottom:24px">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px">
          <div>
            <span class="eyebrow">${icon('lock')} ${isRu ? 'Безопасность Админ-панели' : 'Admin panel xavfsizligi'}</span>
            <h3 class="h3" style="margin-top:8px">${isRu ? 'Изменить 8-значный пароль администратора' : '8 belgili admin parolini o‘zgartirish'}</h3>
            <p class="muted" style="font-size:.86rem;margin-top:4px">
              ${isRu
                ? 'Пароль должен состоять ровно из 8 символов (заглавные/строчные буквы, цифры, спецсимволы, кириллица, латиница) и сохраняется напрямую в БД.'
                : 'Parol aynan 8 ta belgidan iborat bo‘lishi kerak (katta/kichik harflar, raqamlar, maxsus belgilar, kirill, lotin) va to‘g‘ridan-to‘g‘ri bazaga saqlanadi.'}
            </p>
          </div>
        </div>
        <div class="form__row" style="align-items:end">
          <label class="field">
            <span class="field__label">${isRu ? 'Новый 8-значный пароль (по умолчанию: Admin/26)' : 'Yangi 8 belgili parol (standart: Admin/26)'}</span>
            <div class="field__control">
              ${icon('lock')}
              <input type="text" name="new_passcode" inputmode="text" value="${esc(L.passcode || 'Admin/26')}" placeholder="Admin/26" required>
            </div>
          </label>
          <div>
            <button class="btn btn--primary" type="submit" style="width:100%">
              <span class="btn__label">${icon('save')} ${isRu ? 'Сохранить новый пароль в БД' : 'Yangi parolni bazaga saqlash'}</span>
            </button>
          </div>
        </div>
      </form>

      <!-- 2. Avatar / Profile Photo -->
      <div class="card" style="margin-bottom:24px">
        <div class="upload-card">
          <div class="upload-card__preview">
            ${p.photo
              ? `<img src="${esc(p.photo)}" alt="Client profile photo">`
              : `<div class="upload-card__empty">${icon('user')}<span>${isRu ? 'Фото клиента' : 'Mijoz rasmi'}</span></div>`}
          </div>
          <div class="upload-card__body">
            <strong>${isRu ? 'Аватар / Фотография профиля' : 'Avatar / Mijoz profil rasmi'}</strong>
            <p class="muted" style="font-size:.88rem">${isRu ? 'Отображается на странице «Услуги и Профиль» и на Главной.' : '«Xizmatlar va Profil» hamda Bosh sahifada ko‘rsatiladi.'}</p>
            <div class="upload-card__actions">
              <label class="btn btn--primary btn--sm">
                <input type="file" accept="image/*" hidden data-upload-profile>
                <span class="btn__label">${icon('upload')} ${p.photo ? (isRu ? 'Заменить фото профиля' : 'Profil rasmini almashtirish') : (isRu ? 'Загрузить фото профиля' : 'Profil rasmini yuklash')}</span>
              </label>
              ${p.photo ? `<button class="btn btn--ghost btn--sm" type="button" data-clear-profile-photo>${icon('trash')}</button>` : ''}
            </div>
          </div>
        </div>
      </div>

      <!-- 3. Profile Information, Bio, Contacts & Social Links -->
      <form class="card form" data-admin-profile-form>
        <h3 class="h3">${isRu ? 'Информация профиля, биография, контакты и соцсети' : 'Profil ma’lumotlari, tarjimai hol, aloqa va ijtimoiy tarmoqlar'}</h3>
        <div class="form__row">
          <label class="field">
            <span class="field__label">${isRu ? 'Имя / ФИО' : 'F.I.Sh.'}</span>
            <div class="field__control"><input type="text" name="name" value="${esc(p.name)}" required></div>
          </label>
          <label class="field">
            <span class="field__label">${isRu ? 'Должность / Специализация' : 'Lavozim va mutaxassislik'}</span>
            <div class="field__control"><input type="text" name="headline" value="${esc(loc(p.headline))}" required></div>
          </label>
        </div>
        <div class="form__row">
          <label class="field">
            <span class="field__label">${isRu ? 'Телефон (под каждой услугой)' : 'Telefon raqami (har bir xizmat ostida)'}</span>
            <div class="field__control"><input type="text" name="phoneDisplay" value="${esc(c.phoneDisplay || '+998 90 353 70 60')}" required></div>
          </label>
          <label class="field">
            <span class="field__label">tel: link</span>
            <div class="field__control"><input type="text" name="phoneHref" value="${esc(c.phoneHref || '+998903537060')}" required></div>
          </label>
        </div>
        <div class="form__row">
          <label class="field">
            <span class="field__label">Telegram / Соцсети (URL)</span>
            <div class="field__control"><input type="url" name="telegram" value="${esc(c.telegram || 'https://t.me/+998903537060')}" required></div>
          </label>
          <label class="field">
            <span class="field__label">Email</span>
            <div class="field__control"><input type="email" name="email" value="${esc(c.email || 'u.saydimov@gmail.com')}"></div>
          </label>
        </div>
        <label class="field">
          <span class="field__label">${isRu ? 'Город / Локация' : 'Shahar / Manzil'}</span>
          <div class="field__control"><input type="text" name="location" value="${esc(loc(p.location))}"></div>
        </label>
        <label class="field">
          <span class="field__label">${isRu ? 'Биография / О клиенте (абзацы через пустую строку)' : 'Tarjimai hol / Mijoz haqida ma’lumot'}</span>
          <div class="field__control"><textarea name="bio" rows="4">${esc(bioStr)}</textarea></div>
        </label>
        <label class="field">
          <span class="field__label">${isRu ? 'Навыки и технологии (через запятую)' : 'Ko‘nikmalar va texnologiyalar (vergul bilan)'}</span>
          <div class="field__control"><input type="text" name="skills" value="${esc((p.skills || []).join(', '))}"></div>
        </label>
        <div>
          <button class="btn btn--primary btn--sm" type="submit">
            <span class="btn__label">${icon('save')} ${isRu ? 'Сохранить профиль и контакты' : 'Profil va aloqani saqlash'}</span>
          </button>
        </div>
      </form>`;

    adminDlg.innerHTML = `
      <div class="admin-modal__inner">
        <div class="admin-bar">
          <div>
            <span class="eyebrow">${esc(t('admin_badge'))} · ${esc(cloudSt.mode)}</span>
            <h2 class="h3" style="margin-top:8px">${esc(t('admin_title'))}</h2>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="btn btn--primary btn--sm" type="button" data-admin-export>
              <span class="btn__label">${icon('download')} ${esc(t('admin_export'))}</span>
            </button>
            <button class="btn btn--ghost btn--sm" type="button" data-admin-reset>
              <span class="btn__label">${icon('refresh')} ${esc(t('admin_reset'))}</span>
            </button>
            <button class="btn btn--danger btn--sm" type="button" data-admin-lock>
              <span class="btn__label">${icon('lock')} ${esc(t('owner_logout_btn'))}</span>
            </button>
            <button class="icon-btn" type="button" data-close-admin aria-label="${esc(t('admin_close'))}">${icon('x')}</button>
          </div>
        </div>

        <!-- Strictly Three Admin Panel Sections: 1. Services ("Услуги"), 2. Portfolio ("Портфолио"), 3. Profile ("Профиль") -->
        <div class="admin-tabs" role="tablist">
          <button class="admin-tab ${activeTab === 'services' ? 'is-active' : ''}" type="button" data-admin-tab="services">
            ${icon('tag')} ${isRu ? 'Услуги' : 'Xizmatlar (Услуги)'}
          </button>
          <button class="admin-tab ${activeTab === 'portfolio' ? 'is-active' : ''}" type="button" data-admin-tab="portfolio">
            ${icon('globe')} ${isRu ? 'Портфолио' : 'Portfolio (Портфолио)'}
          </button>
          <button class="admin-tab ${activeTab === 'profile' ? 'is-active' : ''}" type="button" data-admin-tab="profile">
            ${icon('user')} ${isRu ? 'Профиль' : 'Profil (Профиль)'}
          </button>
        </div>

        ${activeTab === 'services' ? servicesPanelHTML : ''}
        ${activeTab === 'portfolio' ? portfolioPanelHTML : ''}
        ${activeTab === 'profile' ? profilePanelHTML : ''}
      </div>`;
  }
})();
