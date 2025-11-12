// assets/js/schedule-widget.js
document.addEventListener('DOMContentLoaded', () => {
  const API = 'https://api.angelopab.com/schedule';

  // ---- locale & preferences ----
  const navLang = (navigator.language || 'en-US').toLowerCase();
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  const region = getRegionFromLocale(navLang);
  const isUS = region === 'US';                       // 12h for US viewers
  const isRO = navLang.startsWith('ro') || /Bucharest/i.test(tz);

  const t = makeI18n(isRO ? 'ro' : 'en');

  // ---- build/find container ----
  let root = document.querySelector('#schedule-widget, #ap-schedule');
  if (!root) {
    root = document.createElement('div');
    root.id = 'schedule-widget';
    root.className = 'ap-schedule';
    document.body.appendChild(root);
  }

  // inner markup (self-healing)
  if (!root.querySelector('[data-next]')) {
    root.innerHTML = `
      <div class="ap-card">
        <div class="ap-platforms" id="ap-platforms">
          ${PLATFORMS_HTML()}
        </div>
        <div class="ap-next" data-next>${t.loading}</div>
        <button type="button" class="ap-toggle btn-accent" data-toggle>${t.show}</button>
        <ul class="ap-list" data-list hidden></ul>
        <div class="ap-tz-note">🌐 ${t.tzNote}</div>
      </div>
    `;
  }

  const nextEl    = root.querySelector('[data-next]');
  const listEl    = root.querySelector('[data-list]');
  const toggleBtn = root.querySelector('[data-toggle]');
  const plats     = root.querySelector('#ap-platforms');

  // collapsed by default on mobile, expanded on desktop
  const isMobile = window.matchMedia('(max-width: 560px)').matches;
  let expanded = !isMobile;
  listEl.hidden = !expanded;
  plats.classList.toggle('ap-show', expanded);
  toggleBtn.textContent = expanded ? t.hide : t.show;

  toggleBtn.addEventListener('click', () => {
    expanded = !expanded;
    listEl.hidden = !expanded;
    plats.classList.toggle('ap-show', expanded);
    toggleBtn.textContent = expanded ? t.hide : t.show;
  });

  // fetch & render
  fetch(API, { cache: 'no-store' })
    .then(r => r.json())
    .then(({ next, items }) => {
      if (!next) {
        nextEl.textContent = t.none;
        toggleBtn.disabled = true;
        return;
      }

      const nextDate = new Date(next.iso);
      nextEl.innerHTML =
        `${t.next}: <strong>${fmtLocal(nextDate, !isUS)}</strong>` +
        ` — ${escapeHtml(next.game || next.title || 'TBA')}` +
        ` <span class="ap-all">(all platforms)</span>` +
        ` <span class="ap-countdown">(${countdown(nextDate, t)})</span>`;

      listEl.innerHTML = (items || []).map(ev => {
        const d = new Date(ev.iso);
        return `
          <li class="ap-item">
            <span class="ap-item-date">${fmtLocal(d, !isUS)}</span>
            <span class="ap-countdown">(${countdown(d, t)})</span>
            <span class="ap-item-title">— ${escapeHtml(ev.game || ev.title || 'TBA')}</span>
          </li>
        `;
      }).join('');

      toggleBtn.disabled = (items || []).length === 0 && !expanded;
    })
    .catch(err => {
      console.error('[schedule-widget] error:', err);
      nextEl.textContent = t.error;
      toggleBtn.disabled = true;
    });

  // ------- helpers -------
  function fmtLocal(d, use24h) {
    return d.toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: !use24h
    });
  }

  function countdown(date, t) {
    const now = new Date();
    let diff = Math.max(0, date - now);
    const mins = Math.floor(diff / 60000);
    const hrs  = Math.floor(mins / 60);
    const days = Math.floor(hrs / 24);

    if (days >= 1)   return t.inDays(days);
    if (hrs >= 1)    return t.inHours(hrs);
    if (mins >= 1)   return t.inMins(mins);
    return t.soon;
  }

  function getRegionFromLocale(locale) {
    // ex: en-US, en_US, ro-RO, ro
    const m = locale.match(/[-_](\w{2})$/);
    return m ? m[1].toUpperCase() : '';
  }

  function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, m => (
      { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[m]
    ));
  }

  function makeI18n(lang) {
    if (lang === 'ro') {
      return {
        loading: 'Se încarcă următorul stream…',
        show: 'Arată următoarele streamuri',
        hide: 'Ascunde următoarele streamuri',
        tzNote: 'Orele sunt afișate în fusul tău orar',
        none: 'Nu există streamuri planificate.',
        next: 'Următorul stream',
        error: 'Nu s-a putut încărca programul.',
        soon: 'în curând',
        inDays: n => `în ${n} ${n===1?'zi':'zile'}`,
        inHours: n => `în ${n} ${n===1?'oră':'ore'}`,
        inMins: n => `în ${n} ${n===1?'minut':'minute'}`
      };
    }
    // default English
    return {
      loading: 'Loading next stream…',
      show: 'Show next streams',
      hide: 'Hide next streams',
      tzNote: 'Times are shown in your local timezone',
      none: 'No upcoming streams found.',
      next: 'Next stream',
      error: 'Unable to load schedule.',
      soon: 'soon',
      inDays: n => `in ${n} day${n===1?'':'s'}`,
      inHours: n => `in ${n} hour${n===1?'':'s'}`,
      inMins: n => `in ${n} minute${n===1?'':'s'}`
    };
  }

  function PLATFORMS_HTML() {
    // adjust paths if your icons are elsewhere
    const chip = (img, label, href) =>
      `<span class="ap-chip"><img src="${img}" alt="" loading="lazy">` +
      (href ? `<a href="${href}" target="_blank" rel="noopener">${label}</a>` : label) +
      `</span>`;
    return [
      chip('./twitch.png','Twitch','https://twitch.tv/AngeloPab'),
      chip('./youtube.png','YouTube','https://youtube.com/@AngeloPab'),
      chip('./kick.png','Kick','https://kick.com/AngeloPab'),
      chip('./tiktok.png','TikTok','https://tiktok.com/@AngeloPab')
    ].join('<span>·</span>');
  }
});
