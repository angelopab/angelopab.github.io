// assets/js/schedule-widget.js
document.addEventListener('DOMContentLoaded', () => {
  const API = 'https://api.angelopab.com/schedule';

  // locale / region
  const lang = (navigator.language || 'en-US').toLowerCase();
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  const region = (lang.match(/[-_](\w{2})$/) || [,''])[1].toUpperCase();
  const isUS = region === 'US';
  const isRO = lang.startsWith('ro') || /Bucharest/i.test(tz);
  const t = i18n(isRO ? 'ro' : 'en');

  // anchors
  let root = document.querySelector('#ap-schedule, #schedule-widget');
  if (!root) {
    root = document.createElement('section');
    root.id = 'ap-schedule';
    root.className = 'ap-schedule';
    root.innerHTML = `<div class="ap-card">
      <div class="ap-platforms" id="ap-platforms"></div>
      <div id="ap-next" class="ap-next">${t.loading}</div>
      <button id="ap-toggle" class="ap-btn" type="button" aria-expanded="false">${t.show}</button>
      <ul id="ap-list" class="ap-list" hidden></ul>
      <p class="ap-note">🌐 ${t.tzNote}</p>
    </div>`;
    document.body.appendChild(root);
  }
  const plats   = root.querySelector('#ap-platforms') || buildPlatforms(root, t);
  const nextEl  = root.querySelector('#ap-next');
  const listEl  = root.querySelector('#ap-list');
  const toggle  = root.querySelector('#ap-toggle');

  // ensure platforms row exists & localized
  function buildPlatforms(ctx, t) {
    const el = ctx.querySelector('.ap-platforms') || document.createElement('div');
    el.className = 'ap-platforms';
    el.id = 'ap-platforms';
    el.innerHTML = platformsHTML(t.prefix);
    const header = ctx.querySelector('.ap-card');
    header?.insertBefore(el, header.firstChild);
    return el;
  }

  // localize prefix if the HTML already existed
  const prefix = plats.querySelector('.ap-prefix');
  if (prefix) prefix.textContent = t.prefix;

  // start collapsed on mobile
  const isMobile = window.matchMedia('(max-width: 560px)').matches;
  listEl.hidden = isMobile;
  toggle.textContent = isMobile ? t.show : t.hide;
  toggle.setAttribute('aria-expanded', String(!isMobile));
  toggle.addEventListener('click', () => {
    const expanded = listEl.hidden;
    listEl.hidden = !expanded;
    toggle.textContent = expanded ? t.hide : t.show;
    toggle.setAttribute('aria-expanded', String(expanded));
  });

  // fetch schedule
  nextEl.textContent = t.loading;
  fetch(API, { cache: 'no-store' })
    .then(r => r.json())
    .then(({ next, items }) => {
      if (!next) {
        nextEl.textContent = t.none;
        toggle.disabled = true;
        return;
      }
      const n = new Date(next.iso);
      nextEl.innerHTML =
        `${t.next}: <strong>${fmt(n, !isUS)}</strong> — ${esc(next.game || next.title || 'TBA')}` +
        ` <span class="ap-countdown">(${countdown(n, t)})</span>`;

      listEl.innerHTML = (items || []).map(ev => {
        const d = new Date(ev.iso);
        return `
          <li class="ap-item">
            <span class="ap-item-date">${fmt(d, !isUS)}</span>
            <span class="ap-countdown">(${countdown(d, t)})</span>
            <span class="ap-item-title">— ${esc(ev.game || ev.title || 'TBA')}</span>
          </li>
        `;
      }).join('');

      toggle.disabled = (items || []).length === 0 && listEl.hidden;
    })
    .catch(() => {
      nextEl.textContent = t.error;
      toggle.disabled = true;
    });

  // helpers
  function fmt(d, use24h) {
    return d.toLocaleString(undefined, {
      weekday: 'short', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: !use24h
    });
  }
  function countdown(date, t) {
    const now = new Date();
    let mins = Math.floor(Math.max(0, (date - now)) / 60000);
    const hrs = Math.floor(mins / 60); mins %= 60;
    const days = Math.floor(hrs / 24); const rh = hrs % 24;

    if (days >= 1)   return t.inDays(days);
    if (hrs >= 1)    return t.inHours(hrs);
    if (mins >= 1)   return t.inMins(mins);
    return t.soon;
  }
  function esc(s){return String(s||'').replace(/[&<>"']/g,m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));}

  function platformsHTML(prefixText) {
    // Correct paths to your icons
    return `
      <span class="ap-prefix">${esc(prefixText)}</span>
      <a class="ap-chip" href="https://www.twitch.tv/AngeloPab" target="_blank" rel="noopener">
        <img src="assets/img/twitch.png" alt="" loading="lazy"> Twitch
      </a>
      <span class="ap-sep">·</span>
      <a class="ap-chip" href="https://www.youtube.com/@angelopabtv" target="_blank" rel="noopener">
        <img src="assets/img/youtube.png" alt="" loading="lazy"> YouTube
      </a>
      <span class="ap-sep">·</span>
      <a class="ap-chip" href="https://kick.com/AngeloPab" target="_blank" rel="noopener">
        <img src="assets/img/kick.png" alt="" loading="lazy"> Kick
      </a>
      <span class="ap-sep">·</span>
      <a class="ap-chip" href="https://www.tiktok.com/@angelopabtv" target="_blank" rel="noopener">
        <img src="assets/img/tiktok.png" alt="" loading="lazy"> TikTok
      </a>
    `;
  }

  function i18n(lang) {
    if (lang === 'ro') {
      return {
        prefix: 'Sunt LIVE și pe:',
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
    return {
      prefix: 'Also live on:',
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
});
