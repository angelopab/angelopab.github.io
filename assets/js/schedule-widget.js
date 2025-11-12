/* AngeloPab – Weekly schedule (robust + "4 Mondays" fallback) */

(function () {
  const ICS_URL = 'https://api.angelopab.com/twitch-ics';

  const panel = document.querySelector('#ap-schedule');
  if (!panel) return;

  const nextEl    = panel.querySelector('[data-next]');
  const listWrap  = panel.querySelector('[data-list]');
  const toggleBtn = panel.querySelector('[data-toggle]');

  let expanded = false;
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      expanded = !expanded;
      listWrap.hidden = !expanded;
      toggleBtn.textContent = expanded ? 'Hide next streams' : 'Show next streams';
    });
  }

  init().catch(err => {
    console.error('[schedule-widget] fatal:', err);
    safeText(nextEl, 'Unable to load schedule.');
    if (toggleBtn) toggleBtn.disabled = true;
  });

  async function init() {
    const res = await fetch(ICS_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error('ICS fetch ' + res.status);
    const text = await res.text();
    const events = parseWeeklyEvents(text); // {tz, hour, minute, second, bydays[], title, game}

    if (!events.length) {
      safeText(nextEl, 'No upcoming streams found.');
      if (toggleBtn) toggleBtn.disabled = true;
      return;
    }

    const upcoming = computeUpcoming(events);

    if (!upcoming.length) {
      safeText(nextEl, 'No upcoming streams found.');
      if (toggleBtn) toggleBtn.disabled = true;
      return;
    }

    // next stream
    const first = upcoming[0];
    nextEl.innerHTML =
      `Next stream: <strong>${fmtDate(first.date)}</strong> — ${escapeHtml(first.game || first.title || 'TBA')} <span class="ap-all">(all platforms)</span>`;

    // rest
    listWrap.innerHTML = upcoming.slice(1).map(ev => `
      <li class="ap-item">
        <span class="ap-item-date">${fmtDate(ev.date)}</span>
        <span class="ap-item-title">— ${escapeHtml(ev.game || ev.title || 'TBA')}</span>
      </li>
    `).join('');

    if (toggleBtn) toggleBtn.disabled = upcoming.length <= 1;
  }

  // ============== logic ==============

  function computeUpcoming(events) {
    const now = new Date();

    // collect unique weekdays
    const weekdaySet = new Set();
    for (const ev of events) (ev.bydays || []).forEach(d => weekdaySet.add(d));
    const uniqueWeekdays = [...weekdaySet];

    // if only one weekday -> show next 4
    if (uniqueWeekdays.length === 1) {
      const wd = uniqueWeekdays[0];
      const src = events.find(e => e.bydays.includes(wd));
      const hh = src?.hour ?? 0, mm = src?.minute ?? 0, ss = src?.second ?? 0, tz = src?.tz || 'UTC';
      const title = src?.title, game = src?.game;

      let cursor = nextWeekdayAtTime(now, wd, hh, mm, ss, tz);
      const out = [];
      for (let i = 0; i < 4; i++) {
        out.push({ date: cursor, title, game });
        cursor = new Date(cursor.getTime() + 7 * 864e5);
      }
      return out;
    }

    // else: show all scheduled days within next 7 days (one per weekday)
    const windowEnd = new Date(now.getTime() + 7 * 864e5);
    const out = [];
    for (const ev of events) {
      const hh = ev?.hour ?? 0, mm = ev?.minute ?? 0, ss = ev?.second ?? 0, tz = ev?.tz || 'UTC';
      for (const wd of ev.bydays || []) {
        const next = nextWeekdayAtTime(now, wd, hh, mm, ss, tz);
        if (next >= now && next <= windowEnd) {
          out.push({ date: next, title: ev.title, game: ev.game });
        }
      }
    }
    out.sort((a, b) => a.date - b.date);
    return out;
  }

  // ============== ICS parsing (weekly only) ==============

  function parseWeeklyEvents(text) {
    const lines = unfold(text).filter(Boolean);
    const out = [];
    let cur = null;
    let calendarTZID = null;

    for (const raw of lines) {
      const line = raw.trim();

      if (line === 'BEGIN:VEVENT') { cur = { bydays: [] }; continue; }
      if (line === 'END:VEVENT') {
        if (cur && cur.bydays.length && cur.hour != null) {
          cur.tz = cur.tz || calendarTZID || 'UTC';
          out.push(cur);
        }
        cur = null; continue;
      }
      if (!cur) continue;

      if (line.startsWith('DTSTART')) {
        const dt = parseDT(line);
        if (dt) {
          cur.hour = dt.hh; cur.minute = dt.mi; cur.second = dt.ss;
          if (dt.tz) { cur.tz = dt.tz; calendarTZID = dt.tz; }
        }
      } else if (line.startsWith('SUMMARY:')) {
        cur.title = line.slice(8);
      } else if (line.startsWith('CATEGORIES:')) {
        cur.game = line.slice(11);
      } else if (line.startsWith('RRULE:')) {
        const rule = parseRRule(line.slice(6));
        if (rule.FREQ === 'WEEKLY' && rule.BYDAY) {
          cur.bydays = rule.BYDAY.split(',').map(code => BYDAY_TO_INDEX[code]).filter(v => v != null);
        }
      }
    }
    return out;
  }

  function unfold(text) {
    return text.replace(/\r/g, '').split('\n').reduce((arr, line) => {
      if (line.startsWith(' ') && arr.length) arr[arr.length - 1] += line.slice(1);
      else arr.push(line);
      return arr;
    }, []);
  }

  function parseDT(line) {
    // Handle: DTSTART;TZID=/Europe/Bucharest:20251107T210000  or  DTSTART:20251107T210000Z
    const m = line.match(/^DTSTART\s*(?:;TZID=([^:]+))?\s*:(\d{8}T\d{6}Z?)/i);
    if (!m) return null;
    const tzRaw = m[1];
    const tz = tzRaw ? tzRaw.replace(/^\/+/, '') : null;
    const v = m[2];
    return { hh:+v.slice(9,11), mi:+v.slice(11,13), ss:+v.slice(13,15), tz };
  }

  function parseRRule(s) {
    return s.split(';').reduce((acc, kv) => {
      const i = kv.indexOf('=');
      if (i > -1) acc[kv.slice(0,i).toUpperCase()] = kv.slice(i+1);
      return acc;
    }, {});
  }

  const BYDAY_TO_INDEX = { SU:0, MO:1, TU:2, WE:3, TH:4, FR:5, SA:6 };

  // ============== date helpers ==============

  function nextWeekdayAtTime(afterDate, weekday, hh, mm, ss, timeZone) {
    const d = new Date(afterDate.getTime());
    const todayWd = d.getDay();
    const nowSecs = d.getHours()*3600 + d.getMinutes()*60 + d.getSeconds();
    const targetSecs = hh*3600 + mm*60 + ss;

    let addDays = (weekday - todayWd + 7) % 7;
    if (addDays === 0 && nowSecs > targetSecs) addDays = 7;

    d.setDate(d.getDate() + addDays);
    return zonedCivilToDate(d.getFullYear(), d.getMonth()+1, d.getDate(), hh, mm, ss, timeZone);
  }

  function zonedCivilToDate(y, M, d, hh, mm, ss, timeZone) {
    const asUTC = Date.UTC(y, M-1, d, hh, mm, ss);
    const off = tzOffsetMs(new Date(asUTC), timeZone);
    return new Date(asUTC - off);
  }

  function tzOffsetMs(date, timeZone) {
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone, hour12: false,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
    const p = Object.fromEntries(fmt.formatToParts(date).map(x => [x.type, x.value]));
    const asIfUTC = Date.UTC(+p.year, +p.month-1, +p.day, +p.hour, +p.minute, +p.second);
    return asIfUTC - date.getTime();
  }

  // ============== view helpers ==============

  function fmtDate(date) {
    return date.toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function safeText(el, s) {
    if (!el) return;
    el.textContent = s;
  }

  function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, m => (
      { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[m]
    ));
  }
})();
