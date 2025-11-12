document.addEventListener('DOMContentLoaded', () => {
  const API = 'https://api.angelopab.com/schedule';

  const root      = document.querySelector('#ap-schedule, #schedule-widget');
  if (!root) return;

  const nextEl    = root.querySelector('[data-next], .ap-next');
  const listEl    = root.querySelector('[data-list], .ap-list');
  const toggleBtn = root.querySelector('[data-toggle], .ap-toggle');

  if (!nextEl || !listEl || !toggleBtn) return;

  let expanded = false;
  toggleBtn.addEventListener('click', () => {
    expanded = !expanded;
    listEl.hidden = !expanded;
    toggleBtn.textContent = expanded ? 'Hide next streams' : 'Show next streams';
  });

  nextEl.textContent = 'Loading next stream...';

  fetch(API, { cache: 'no-store' })
    .then(r => r.json())
    .then(({ next, items }) => {
      if (!next) {
        nextEl.textContent = 'No upcoming streams found.';
        toggleBtn.disabled = true;
        return;
      }
      nextEl.innerHTML = `Next stream: <strong>${fmtLocal(next.iso)}</strong> — ${esc(next.game || next.title || 'TBA')} <span class="ap-all">(all platforms)</span>`;

      listEl.innerHTML = (items || []).map(ev => `
        <li class="ap-item">
          <span class="ap-item-date">${fmtLocal(ev.iso)}</span>
          <span class="ap-item-title">— ${esc(ev.game || ev.title || 'TBA')}</span>
        </li>
      `).join('');

      toggleBtn.disabled = (items || []).length === 0;
    })
    .catch(() => {
      nextEl.textContent = 'Unable to load schedule.';
      toggleBtn.disabled = true;
    });

  function fmtLocal(iso) {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      weekday: 'short', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }
  function esc(s){return String(s||'').replace(/[&<>"']/g,m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));}
});
