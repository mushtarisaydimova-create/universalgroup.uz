/* ==========================================================================
   VANTA — Profile / Client Info Renderer
   --------------------------------------------------------------------------
   Renders the client's photo, name, headline, location, bio paragraphs,
   key statistics, and skills dynamically from Store.
   ========================================================================== */
(() => {
  'use strict';
  const { icon, esc, initials, observe, $$ } = window.Vanta;

  function renderProfile() {
    const data = window.Store.get();
    const p = data.profile || {};
    const c = data.contact || {};

    $$('[data-profile="name"]').forEach((el) => { el.textContent = p.name || 'Timur Sadikov'; });
    $$('[data-profile="headline"]').forEach((el) => { el.textContent = p.headline || ''; });
    $$('[data-profile="location"]').forEach((el) => { el.textContent = p.location || ''; });

    // Client portrait frame (photo if uploaded, or sleek holographic monogram + avatar)
    $$('[data-profile-photo]').forEach((box) => {
      if (p.photo) {
        box.classList.add('has-photo');
        box.innerHTML = `
          <img class="portrait__img" src="${esc(p.photo)}" alt="${esc(p.name || 'Client photo')}" loading="eager">
          <span class="portrait__sheen" aria-hidden="true"></span>`;
      } else {
        box.classList.remove('has-photo');
        box.innerHTML = `
          <div class="art art--orb" style="--a:#c084fc;--b:#4f46e5"></div>
          <div class="portrait__holo" aria-hidden="true">
            <span class="portrait__initials">${esc(initials(p.name || 'Timur Sadikov'))}</span>
            <span class="portrait__caption">${icon('camera')} Client portrait (upload in Admin Panel)</span>
          </div>
          <span class="portrait__sheen" aria-hidden="true"></span>`;
      }
    });

    // Bio paragraphs
    $$('[data-profile-bio]').forEach((box) => {
      const paras = Array.isArray(p.bio) ? p.bio.filter(Boolean) : [String(p.bio || '')];
      box.innerHTML = paras
        .map((para, idx) => `<p class="${idx === 0 ? 'lead' : 'muted'}">${esc(para)}</p>`)
        .join('');
    });

    // Stats
    $$('[data-profile-stats]').forEach((box) => {
      const stats = Array.isArray(p.stats) ? p.stats : [];
      box.innerHTML = stats
        .map(
          (st) => `
          <div class="card stat-card">
            <div class="stat">
              <strong data-count="${esc(st.value)}" data-suffix="${esc(st.suffix || '')}">${esc(st.value)}${esc(st.suffix || '')}</strong>
              <span>${esc(st.label)}</span>
            </div>
          </div>`
        )
        .join('');
      observe(box);
    });

    // Skills tags
    $$('[data-profile-skills]').forEach((box) => {
      const skills = Array.isArray(p.skills) ? p.skills.filter(Boolean) : [];
      box.innerHTML = skills
        .map((sk, i) => `<span class="skill-pill" style="--i:${i}">${icon('sparkles')}<span>${esc(sk)}</span></span>`)
        .join('');
    });

    // Direct contact binds
    window.Vanta.bindContacts();
  }

  renderProfile();
  window.Store.subscribe(renderProfile);
})();
