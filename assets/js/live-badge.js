(function () {
  const ENDPOINT = 'https://api.angelopab.com/live-status';
  const el = document.querySelector('.live-avatar');
  const statusLine = document.querySelector('.live-status-line');
  let lastState = el.getAttribute('data-live') === 'on';
  if (!el) return;

  async function check() {
    try {
      const r = await fetch(ENDPOINT, { cache: 'no-store' });
      if (!r.ok) throw new Error('status ' + r.status);
      const j = await r.json();
      const isLive = !!(j && j.live);
      const wasLive = lastState;

      el.setAttribute('data-live', isLive ? 'on' : 'off');
      if (isLive && !lastState) {
        el.classList.add('live-avatar--bounce');
        setTimeout(() => el.classList.remove('live-avatar--bounce'), 900);
      }

      lastState = isLive;

      if (statusLine) {
        if (isLive) {
          let platforms = [];
          if (j && j.platforms) {
            for (const [key, val] of Object.entries(j.platforms)) {
              if (val) platforms.push(key.toUpperCase());
            }
          }
          const txt = platforms.length ?
            'LIVE now on ' + platforms.join(' · ') :
            'LIVE now';
          statusLine.textContent = txt;
          statusLine.classList.add('live-status-line--visible');
        } else {
          statusLine.textContent = '';
          statusLine.classList.remove('live-status-line--visible');
        }
      }

      if (j && j.platforms) {
        const on = Object.entries(j.platforms)
          .filter(([k, v]) => v)
          .map(([k]) => k);

        el.title = isLive
          ? 'Live now on ' + on.join(', ')
          : 'Currently offline';
      }
    } catch (e) {
      el.setAttribute('data-live', 'off');
    }
  }

  // Initial load check
  check();

  // Poll every 10 seconds instead of 60
  setInterval(check, 10000);

  // Re-check instantly when the tab becomes visible
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) check();
  });
})();