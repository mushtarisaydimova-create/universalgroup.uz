/* ==========================================================================
   universalgroup.uz — Services & Client Profile Engine
   --------------------------------------------------------------------------
   - Renders the Client Profile for Saydimov Umirbek Yakubbayevich:
       • Real client portrait photo (with automatic fallback)
       • Descriptive biography, career & education timeline, personal
         achievements/patents, stats, skills & direct contact
   - Renders all Service cards in a high-end format with:
       • Uploaded service preview image (optional, managed via Admin Panel)
       • Dynamic, non-fixed pricing (managed via Admin Panel)
       • Direct contact details underneath every single service card:
           - Phone: +998 90 353 70 60 (tel:+998903537060)
           - Direct Telegram button
   - Automatically updates when language ('uz' / 'ru') or admin data changes.
   ========================================================================== */
(() => {
  'use strict';
  const { icon, esc, initials, observe, $$, t, loc } = window.Vanta;
  const UPLOADED_PHOTO_FALLBACK = 'file:///C:/Users/Umrbek/.gemini/antigravity/brain/fe28f5bb-9cd5-459e-95d5-90657dc8b897/.user_uploaded/media_1795364946614_26f9d9ab.jpg';

  function priceHTML(service, pricing) {
    const p = window.Store.formatPrice(service.price, pricing);
    const unit = loc(service.unit);
    if (p.onRequest) {
      return `
        <div class="svc-price svc-price--request">
          <span class="svc-price__label">${esc(t('price_investment'))}</span>
          <strong class="svc-price__val">${esc(p.text)}</strong>
          ${unit ? `<small class="svc-price__unit">${esc(unit)}</small>` : ''}
        </div>`;
    }
    return `
      <div class="svc-price">
        <span class="svc-price__label">${esc(p.prefix)}</span>
        <div class="svc-price__main">
          <strong class="svc-price__val gradient-text">${esc(p.text)}</strong>
          <span class="svc-price__cur">${esc(p.currency)}</span>
        </div>
        ${unit ? `<small class="svc-price__unit">${esc(unit)}</small>` : ''}
      </div>`;
  }

  function serviceCardHTML(s, idx, data) {
    const c = data.contact || {};
    const title = loc(s.title);
    const desc = loc(s.description);
    const rawFeat = loc(s.features);
    const features = Array.isArray(rawFeat)
      ? rawFeat.filter(Boolean)
      : String(rawFeat || '').split('\n').map((x) => x.trim()).filter(Boolean);

    const tgUrl = c.telegram || 'https://t.me/+998903537060';
    const phoneHref = c.phoneHref || '+998903537060';
    const phoneDisplay = c.phoneDisplay || '+998 90 353 70 60';

    return `
    <article class="card card--lift service-card ${s.image ? 'has-photo' : ''}" id="${esc(s.id)}" data-tilt="5" data-reveal style="--i:${idx % 3}">
      ${s.image ? `
        <div class="service-card__media">
          <img src="${esc(s.image)}" alt="${esc(title)}" loading="lazy">
          <span class="service-card__num">${String(idx + 1).padStart(2, '0')}</span>
        </div>` : ''}

      <div class="service-card__top">
        <span class="feature-icon">${icon(s.icon || 'sparkles')}</span>
        ${!s.image ? `<span class="service-card__num">${String(idx + 1).padStart(2, '0')}</span>` : ''}
      </div>

      <div class="service-card__head">
        <h3 class="h3">${esc(title)}</h3>
        <p>${esc(desc)}</p>
      </div>

      ${features.length ? `
        <ul class="service-card__list">
          ${features.map((f) => `<li>${icon('check')}<span>${esc(f)}</span></li>`).join('')}
        </ul>` : ''}

      <div class="service-card__footer">
        ${priceHTML(s, data.pricing)}

        <div class="service-card__contact" aria-label="${esc(title)}">
          <a class="svc-contact-btn svc-contact-btn--call" href="tel:${esc(phoneHref)}" data-no-transition aria-label="${esc(t('call_now'))} ${esc(phoneDisplay)}">
            ${icon('phone')}
            <span>${esc(phoneDisplay)}</span>
          </a>
          <a class="svc-contact-btn svc-contact-btn--tg" href="${esc(tgUrl)}" target="_blank" rel="noopener" aria-label="Telegram">
            ${icon('tg', 'i--fill')}
            <span>Telegram</span>
          </a>
        </div>
      </div>
    </article>`;
  }

  function renderProfileAndServices() {
    const data = window.Store.get();
    const p = data.profile || {};
    const visible = (data.services || []).filter((s) => s.visible !== false);

    // 1. Render Services
    $$('[data-services]').forEach((container) => {
      const limit = parseInt(container.dataset.limit || '0', 10);
      const list = limit > 0 ? visible.slice(0, limit) : visible;
      container.innerHTML = list.map((s, i) => serviceCardHTML(s, i, data)).join('');
      observe(container);
    });

    // 2. Render Client Profile Info
    $$('[data-profile="name"]').forEach((el) => { el.textContent = p.name || 'Saydimov Umirbek Yakubbayevich'; });
    $$('[data-profile="headline"]').forEach((el) => { el.textContent = loc(p.headline); });
    $$('[data-profile="location"]').forEach((el) => { el.textContent = loc(p.location); });

    $$('[data-profile-photo]').forEach((box) => {
      if (p.photo) {
        box.classList.add('has-photo');
        box.innerHTML = `
          <img class="portrait__img" src="${esc(p.photo)}" alt="${esc(p.name || 'Saydimov Umirbek Yakubbayevich')}" loading="eager" onerror="if(this.src!=='${UPLOADED_PHOTO_FALLBACK}')this.src='${UPLOADED_PHOTO_FALLBACK}'">
          <span class="portrait__sheen" aria-hidden="true"></span>`;
      } else {
        box.classList.remove('has-photo');
        box.innerHTML = `
          <div class="art art--orb" style="--a:#c084fc;--b:#4f46e5"></div>
          <div class="portrait__holo" aria-hidden="true">
            <span class="portrait__initials">${esc(initials(p.name || 'SU'))}</span>
            <span class="portrait__caption">${icon('camera')} ${esc(t('prof_photo_caption'))}</span>
          </div>
          <span class="portrait__sheen" aria-hidden="true"></span>`;
      }
    });

    $$('[data-profile-bio]').forEach((box) => {
      const rawBio = loc(p.bio);
      const paras = Array.isArray(rawBio) ? rawBio.filter(Boolean) : String(rawBio || '').split(/\n{2,}/).filter(Boolean);
      box.innerHTML = paras
        .map((para, idx) => `<p class="${idx === 0 ? 'lead' : 'muted'}">${esc(para)}</p>`)
        .join('');
    });

    $$('[data-profile-stats]').forEach((box) => {
      const stats = Array.isArray(p.stats) ? p.stats : [];
      box.innerHTML = stats
        .map(
          (st) => `
          <div class="card stat-card">
            <div class="stat">
              <strong data-count="${esc(st.value)}" data-suffix="${esc(st.suffix || '')}">${esc(st.value)}${esc(st.suffix || '')}</strong>
              <span>${esc(loc(st.label))}</span>
            </div>
          </div>`
        )
        .join('');
      observe(box);
    });

    $$('[data-profile-skills]').forEach((box) => {
      const skills = Array.isArray(p.skills) ? p.skills.filter(Boolean) : [];
      box.innerHTML = skills
        .map((sk, i) => `<span class="skill-pill" style="--i:${i}">${icon('sparkles')}<span>${esc(sk)}</span></span>`)
        .join('');
    });

    // 3. Render Career & Education Timeline
    $$('[data-profile-timeline]').forEach((box) => {
      const list = Array.isArray(p.timeline) ? p.timeline : [];
      box.innerHTML = list
        .map(
          (item, i) => `
          <article class="card card--lift timeline-card" data-reveal style="--i:${i % 2}">
            <div class="timeline-card__top">
              <span class="tag">${esc(loc(item.period))}</span>
            </div>
            <h3 class="h3" style="margin-top:10px">${esc(loc(item.role))}</h3>
            <p class="gradient-text" style="font-weight:700;font-size:.9rem;margin:4px 0 8px">${esc(loc(item.org))}</p>
            <p class="muted" style="font-size:.92rem">${esc(loc(item.desc))}</p>
          </article>`
        )
        .join('');
      observe(box);
    });

    // 4. Render Achievements, Awards & Patents
    $$('[data-profile-achievements]').forEach((box) => {
      const list = Array.isArray(p.achievements) ? p.achievements : [];
      box.innerHTML = list
        .map(
          (a, i) => `
          <article class="card card--lift" data-tilt="5" data-reveal style="--i:${i % 3}">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
              <span class="feature-icon" style="width:46px;height:46px;border-radius:14px">${icon('award')}</span>
              <span class="tag">${esc(a.year)}</span>
            </div>
            <h3 class="h3" style="margin-bottom:8px">${esc(loc(a.title))}</h3>
            <p class="muted" style="font-size:.92rem">${esc(loc(a.desc))}</p>
          </article>`
        )
        .join('');
      observe(box);
    });

    window.Vanta.bindContacts();
  }

  renderProfileAndServices();
  window.Store.subscribe(renderProfileAndServices);
  window.Store.subscribePrefs(renderProfileAndServices);
})();
