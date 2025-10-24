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

  function normalizeTZID(tz) {
    if (!tz) return null;
    tz = String(tz).trim().replace(/^[\\/]+/, '');
    if (!/^[A-Za-z]+\/[A-Za-z0-9_+-]+$/.test(tz)) return null;
    return tz;
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

    let defaultTZ = null;
    for (const ln of unfolded) {
      if (ln.startsWith('X-WR-TIMEZONE:')) {
        defaultTZ = normalizeTZID(ln.split(':')[1]);
        break;
      }
    }

    const events = [];
    let cur = null;
    for (const line of unfolded) {
      if (line.startsWith('BEGIN:VEVENT')) cur = { _params: {} };
      else if (line.startsWith('END:VEVENT')) { if (cur) events.push(cur); cur = null; }
      else if (cur && line.includes(':')) {
        const idx = line.indexOf(':');
        const rawKey = line.slice(0, idx);
        const val = line.slice(idx + 1);
        const [key, ...params] = rawKey.split(';');
        const upKey = key.toUpperCase();
        cur[upKey] = val;
        for (const p of params) {
          const [pKey, pVal] = p.split('=');
          if (pKey && pKey.toUpperCase() === 'TZID') cur._params[upKey + ':TZID'] = pVal;
        }
      }
    }

    const now = Date.now();
    return events.map(e => {
      const tzid = normalizeTZID(e._params['DTSTART:TZID']) || defaultTZ || 'UTC';
      const dt = e.DTSTART || '';
      const start = toDate(dt, tzid);
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

    function toDate(s, tzid) {
      const m = s.match(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)/);
      if (!m) return null;
      const [_,Y,Mo,D,h,mi,se,z] = m;
      const asUTC = Date.UTC(+Y,+Mo-1,+D,+h,+mi,+se);
      if (z === 'Z') return new Date(asUTC);
      const epoch = wallTimeToUTC({Y:+Y,Mo:+Mo,D:+D,h:+h,mi:+mi,se:+se}, tzid);
      return new Date(epoch);
    }

    function wallTimeToUTC(c, tz) {
      const guess = Date.UTC(c.Y, c.Mo - 1, c.D, c.h, c.mi, c.se);
      const offset = tzOffsetMillis(tz, guess);
      return guess - offset;
    }

    function tzOffsetMillis(tz, epochMs) {
      try {
        const dtf = new Intl.DateTimeFormat('en-US', {
          timeZone: tz, hour12: false,
          year:'numeric', month:'2-digit', day:'2-digit',
          hour:'2-digit', minute:'2-digit', second:'2-digit'
        });
        const parts = dtf.formatToParts(new Date(epochMs));
        const map = {};
        for (const p of parts) map[p.type] = p.value;
        const asLocal = Date.UTC(+map.year, +map.month-1, +map.day, +map.hour, +map.minute, +map.second);
        return asLocal - epochMs;
      } catch (e) {
        return 0;
      }
    }
  }

  function fmtDate(dt) {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    const use12h = tz.startsWith('America/') || tz.startsWith('Canada/');
    return new Intl.DateTimeFormat(undefined, {
      weekday:'short', day:'2-digit', month:'short',
      hour:'2-digit', minute:'2-digit',
      hour12: use12h ? true : false,
      hourCycle: use12h ? 'h12' : 'h23'
    }).format(dt).replace(',', '');
  }

  function escapeHtml(s) {
    return (s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
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
