/* AngeloPab – Weekly schedule (simple + "4 Mondays" fallback)
   - Reads ICS from your Worker
   - If only 1 BYDAY across all events => show next 4 occurrences (4 weeks)
   - If 2–7 BYDAYs => show all days occurring in the next 7 days (one per weekday)
*/

(function () {
  const ICS_URL = 'https://api.angelopab.com/twitch-ics';

  const panel = document.querySelector('#ap-schedule');
  if (!panel) return;

  const nextEl   = panel.querySelector('[data-next]');
  const listWrap = panel.querySelector('[data-list]');
  const toggleBtn = panel.querySelector('[data-toggle]');

  let expanded = false;
  toggleBtn?.addEventListener('click', () => {
    expanded = !expanded;
    listWrap.hidden = !expanded;
    toggleBtn.textContent = expanded ? 'Hide next streams' : 'Show next streams';
  });

  fetch(ICS_URL, { cache: 'no-store' })
    .then(r => r.text())
    .then(text => {
      const evs = parseWeeklyEvents(text); // {tz, hour, minute, second, bydays[], title, game}
      if (!evs.length) {
        nextEl.textContent = 'No upcoming streams found.';
        toggleBtn.disabled = true;
        return;
      }

      const result = computeUpcoming(evs);

      if (!result.length) {
        nextEl.textContent = 'No upcoming streams found.';
        toggleBtn.disabled = true;
        return;
      }

      // Show the very next one
      const first = result[0];
      nextEl.innerHTML = `Next stream: <strong>${fmtDate(first.date)}</strong> — ${escapeHtml(first.game || first.title || 'TBA')} <span class="ap-all">(all platforms)</span>`;

      // Show the rest
      listWrap.innerHTML = result.slice(1).map(ev => `
        <li class="ap-item">
          <span class="ap-item-date">${fmtDate(ev.date)}</span>
          <span class="ap-item-title">— ${escapeHtml(ev.game || ev.title || 'TBA')}</span>
        </li>
      `).join('');

      toggleBtn.disabled = result.length <= 1;
    })
    .catch(() => {
      nextEl.textContent = 'Unable to load schedule.';
      toggleBtn.disabled = true;
    });

  // ---------- core logic ----------
  function computeUpcoming(events) {
    const now = new Date();

    // Gather all distinct weekdays across events
    const weekdaySet = new Set();
    for (const ev of events) (ev.bydays || []).forEach(d => weekdaySet.add(d));
    const uniqueWeekdays = [...weekdaySet];

    // If only ONE weekday total -> show NEXT 4 occurrences of that weekday
    if (uniqueWeekdays.length === 1) {
      const wd = uniqueWeekdays[0];

      // Pick the first event that defines time & tz for that weekday
      const source = events.find(e => e.bydays.includes(wd));
      const hh = source.hour, mm = source.minute || 0, ss = source.second || 0, tz = source.tz || 'UTC';
      const title = source.title, game = source.game;

      // First next date (>= now)
      let cursor = nextWeekdayAtTime(now, wd, hh, mm, ss, tz);
      const out = [];
      for (let i = 0; i < 4; i++) {
        out.push({ date: cursor, title, game });
        cursor = new Date(cursor.getTime() + 7 * 864e5); // +1 week
      }
      return out;
    }

    // Otherwise: generate the next occurrence for EACH weekday within the next 7 days
    const windowEnd = new Date(now.getTime() + 7 * 864e5);
    const out = [];

    for (const ev of events) {
      const { hour, minute = 0, second = 0, tz = 'UTC', title, game } = ev;
      for (const wd of ev.bydays || []) {
        const next = nextWeekdayAtTime(now, wd, hour, minute, second, tz);
        if (next >= now && next <= windowEnd) {
          out.push({ date: next, title, game });
        }
      }
    }

    out.sort((a, b) => a.date - b.date);
    return out;
  }

  // ---------- ICS parsing (weekly only) ----------
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
        const { hh, mi, ss, tz } = parseDT(line);
        cur.hour = hh; cur.minute = mi; cur.second = ss;
        if (tz) calendarTZID = tz, cur.tz = tz;
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
    // DTSTART;TZID=/Europe/Bucharest:20251107T210000  or  DTSTART:20251107T210000Z
    const m = line.match(/^DTSTART(?:;TZID=([^:]+))?:(\d{8}T\d{6}Z?)/i);
    if (!m) return {};
    const tzRaw = m[1];
    const tz = tzRaw ? tzRaw.replace(/^\/+/, '') : null;
    const v = m[2];
    const hh = +v.slice(9,11), mi = +v.slice(11,13), ss = +v.slice(13,15);
    return { hh, mi, ss, tz };
  }

  function parseRRule(s) {
    return s.split(';').reduce((acc, kv) => {
      const [k, v] = kv.split('=');
      acc[k.toUpperCase()] = v;
      return acc;
    }, {});
  }

  const BYDAY_TO_INDEX = { SU:0, MO:1, TU:2, WE:3, TH:4, FR:5, SA:6 };

  // ---------- date helpers ----------
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
    // Convert a civil time in `timeZone` to a real UTC Date
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

  // ---------- formatting ----------
  function fmtDate(date) {
    return date.toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, m => (
      { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[m]
    ));
  }
})();
