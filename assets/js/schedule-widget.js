// assets/js/schedule-widget.js
// Lightweight client for https://api.angelopab.com/schedule
// - Auto-creates its own DOM (no required HTML)
// - Never throws if pieces are missing
// - Shows all weekdays in the next 7 days, or 4 weeks if only a single weekday

document.addEventListener('DOMContentLoaded', () => {
  const API = 'https://api.angelopab.com/schedule';

  // 1) Find or create a container
  let root = document.querySelector('#schedule-widget, #ap-schedule');
  if (!root) {
    root = document.createElement('div');
    root.id = 'schedule-widget';
    root.className = 'ap-schedule';
    // Insert above the footer if present, else at the end of body
    const footer = document.querySelector('footer');
    (footer?.parentNode || document.body).insertBefore(root, footer || null);
  }

  // 2) Ensure the widget’s inner structure exists
  if (!root.querySelector('[data-next]')) {
    root.innerHTML = `
      <div class="ap-card">
        <div class="ap-platforms">Live on Twitch · YouTube · Kick · TikTok</div>
        <div class="ap-next" data-next>Loading next stream...</div>
        <button type="button" class="ap-toggle btn-accent" data-toggle>Show next streams</button>
        <ul class="ap-list" data-list hidden></ul>
        <div class="ap-tz-note">🌐 Times are shown in your local timezone</div>
      </div>
    `;
  }

  const nextEl    = root.querySelector('[data-next]');
  const listEl    = root.querySelector('[data-list]');
  const toggleBtn = root.querySelector('[data-toggle]');

  // 3) Toggle logic
  let expanded = false;
  toggleBtn.addEventListener('click', () => {
    expanded = !expanded;
    listEl.hidden = !expanded;
    toggleBtn.textContent = expanded ? 'Hide next streams' : 'Show next streams';
  });

  // 4) Fetch schedule JSON and render
  fetch(API, { cache: 'no-store' })
    .then(r => r.json())
    .then(({ next, items }) => {
      if (!next) {
        nextEl.textContent = 'No upcoming streams found.';
        toggleBtn.disabled = true;
        return;
      }

      nextEl.innerHTML = `Next stream: <strong>${fmtLocal(next.iso)}</strong> — ${esc(next.game || next.title || 'TBA')} <span class="ap-all">(all platforms)</span>`;

      const list = (items || []).map(ev => `
        <li class="ap-item">
          <span class="ap-item-date">${fmtLocal(ev.iso)}</span>
          <span class="ap-item-title">— ${esc(ev.game || ev.title || 'TBA')}</span>
        </li>
      `).join('');

      listEl.innerHTML = list;
      toggleBtn.disabled = (items || []).length === 0;
    })
    .catch(err => {
      console.error('[schedule-widget] error:', err);
      nextEl.textContent = 'Unable to load schedule.';
      toggleBtn.disabled = true;
    });

  // Helpers
  function fmtLocal(iso) {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      weekday: 'short', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }
  function esc(s){return String(s||'').replace(/[&<>"']/g,m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));}
});