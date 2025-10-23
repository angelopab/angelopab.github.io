(function() {
  const PROXY_URL = 'https://api.angelopab.com/twitch-ics';
  const EXPANDED_COUNT = 3;

  function extractGame(fields) {
    const cat = (fields.CATEGORIES || '').trim();
    if (cat) return cat;
    const desc = fields.DESCRIPTION || '';
    const m = desc.match(/(?:Game|Category)\s*:\s*([^\n\r]+)/i);
    if (m) return m[1].trim();
    const sum = fields.SUMMARY || '';
    const dash = sum.split('—')[1] || sum.split('-')[1];
    if (dash) return dash.trim();
    const bracket = sum.match(/\[([^\]]+)\]/);
    if (bracket) return bracket[1].trim();
    return sum.trim();
  }

  function parseICS(icsText) {
    const lines = icsText.replace(/\r/g,'').split('\n');
    const unfolded = [];
    for (const ln of lines) {
      if ((ln.startsWith(' ') || ln.startsWith('\t')) && unfolded.length) {
        unfolded[unfolded.length - 1] += ln.slice(1);
      } else {
        unfolded.push(ln);
      }
    }
    const events = [];
    let cur = null;
    for (const line of unfolded) {
      if (line.startsWith('BEGIN:VEVENT')) cur = {};
      else if (line.startsWith('END:VEVENT')) { if (cur) events.push(cur); cur = null; }
      else if (cur && line.includes(':')) {
        const idx = line.indexOf(':');
        const rawKey = line.slice(0, idx);
        const val = line.slice(idx + 1);
        const key = rawKey.split(';')[0].toUpperCase();
        cur[key] = val;
      }
    }
    const now = Date.now();
    return events.map(e => {
      const dt = e.DTSTART || e['DTSTART;TZID'] || '';
      const start = toDate(dt);
      return {
        start,
        fields: {
          SUMMARY: e.SUMMARY || '',
          DESCRIPTION: e.DESCRIPTION || '',
          CATEGORIES: e.CATEGORIES || ''
        }
      };
    }).filter(x => x.start && x.start.getTime() > now)
      .sort((a,b) => a.start - b.start);

    function toDate(s) {
      const m = s.match(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)/);
      if (!m) return null;
      const [_,Y,Mo,D,h,mi,se,z] = m;
      return z==='Z' ? new Date(Date.UTC(+Y,+Mo-1,+D,+h,+mi,+se))
                     : new Date(+Y,+Mo-1,+D,+h,+mi,+se);
    }
  }

  function fmtDate(dt) {
    return new Intl.DateTimeFormat(undefined, {
      weekday:'short', day:'2-digit', month:'short',
      hour:'2-digit', minute:'2-digit'
    }).format(dt).replace(',', '');
  }

  function escapeHtml(s) {
    return (s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  async function load() {
    const elNext = document.getElementById('ap-next');
    const elList = document.getElementById('ap-list');
    const elErr  = document.getElementById('ap-error');
    const btn    = document.getElementById('ap-toggle');

    try {
      const res = await fetch(PROXY_URL, { cache: 'no-store' });
      if (!res.ok) throw new Error('Proxy returned ' + res.status);
      const text = await res.text();
      const items = parseICS(text);

      if (!items.length) { elNext.textContent = 'No upcoming streams found.'; return; }

      const first = items[0];
      const game = extractGame(first.fields) || 'Stream';
      elNext.innerHTML = `Next stream: <time datetime="${first.start.toISOString()}">${fmtDate(first.start)}</time> — <span class="ap-game">${escapeHtml(game)}</span> <span>(all platforms)</span>`;

      const more = items.slice(1, 1 + EXPANDED_COUNT);
      elList.innerHTML = more.map(ev => {
        const gm = extractGame(ev.fields) || 'Stream';
        return `<li><time datetime="${ev.start.toISOString()}">${fmtDate(ev.start)}</time> — <span class="ap-game">${escapeHtml(gm)}</span></li>`;
      }).join('');

      btn.onclick = () => {
        const open = !elList.hasAttribute('hidden');
        if (open) {
          elList.setAttribute('hidden','');
          btn.setAttribute('aria-expanded','false');
          btn.textContent = 'Show next streams';
        } else {
          elList.removeAttribute('hidden');
          btn.setAttribute('aria-expanded','true');
          btn.textContent = 'Hide next streams';
        }
      };
    } catch (e) {
      elErr.hidden = false;
      elErr.textContent = 'Failed to load schedule. ' + e.message;
      console.error(e);
    }
  }
  load();
})();
