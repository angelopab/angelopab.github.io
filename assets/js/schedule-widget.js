// assets/js/schedule-widget.js
(function () {
  const root = document.getElementById("ap-schedule");
  if (!root) return;

  const nextEl = root.querySelector("#ap-next");
  const listEl = root.querySelector("#ap-list");
  const btnEl = root.querySelector("#ap-toggle");
  const noteEl = root.querySelector(".ap-note");
  const platBar = root.querySelector("#ap-platforms");
  const errEl = root.querySelector("#ap-error");

  // Fallback phrases shown before we have server phrases
  const isRO = (navigator.language || "").toLowerCase().startsWith("ro");
  const FALLBACK = isRO ? {
    headline: "Următorul live",
    alsoLive: "Sunt LIVE și pe",
    btnShow: "Arată următoarele live-uri",
    btnHide: "Ascunde lista",
    tzNote: "🌐 Orele sunt afișate în fusul tău orar",
  } : {
    headline: "Next stream",
    alsoLive: "Also live on",
    btnShow: "Show next streams",
    btnHide: "Hide list",
    tzNote: "🌐 Times are shown in your local timezone",
  };

  // Render platform row immediately (fallback text) — ensure container is empty first
  platBar.innerHTML = "";
  renderPlatforms(FALLBACK.alsoLive);
  noteEl.textContent = FALLBACK.tzNote;
  btnEl.textContent = FALLBACK.btnShow;

  fetch("https://api.angelopab.com/schedule-json")
    .then(async r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then(data => {
      // Re-render platforms with server phrases (clear first to avoid duplication)
      if (data && data.phrases) {
        platBar.innerHTML = "";
        renderPlatforms(data.phrases.alsoLive);
        noteEl.textContent = data.phrases.tzNote;
        btnEl.textContent = data.phrases.btnShow;
      }

      // NEXT line
      if (data.next) {
        const label = data.next.game || data.next.title || "";
        const niceDate = prettifyRoDate(data.next.dateText);
        nextEl.innerHTML =
          `<strong>${escapeHtml((data.phrases?.headline) || FALLBACK.headline)}:</strong> ` +
          `<span class="ap-when">${escapeHtml(capitalizeFirst(niceDate))} ${escapeHtml(data.next.timeText)}</span>` +
          (label ? `<div class="ap-game"> ${escapeHtml(label)}</div>` : "") +
          `<div class="ap-in">${escapeHtml(data.next.inText)}</div>`;
      } else {
        nextEl.textContent = isRO ? "Nu există următorul live." : "No upcoming streams.";
      }

      // Expanded list: next 3, no duplicate
      listEl.innerHTML = "";
      const more = (data.items || []).slice(1, 4);
      more.forEach((it) => {
        const label = it.game || it.title || "";
        const niceDate = prettifyRoDate(it.dateText);
        const li = document.createElement("li");
        li.className = "ap-li";
        li.innerHTML =
          `<div class="ap-li-row">` +
          `<div class="ap-li-left">` +
          `<span class="ap-li-when">${escapeHtml(capitalizeFirst(niceDate))} ${escapeHtml(it.timeText)}</span>` +
          (label ? `<span class="ap-li-title"> — ${escapeHtml(label)}</span>` : "") +
          `</div>` +
          `<span class="ap-li-in">${escapeHtml(it.inText)}</span>` +
          `</div>`;
        listEl.appendChild(li);
      });

      // Toggle
      btnEl.setAttribute("aria-expanded", "false");
      btnEl.onclick = () => {
        const isHidden = listEl.hasAttribute("hidden");
        if (isHidden) {
          listEl.removeAttribute("hidden");
          btnEl.textContent = (data.phrases?.btnHide) || FALLBACK.btnHide;
          btnEl.setAttribute("aria-expanded", "true");
        } else {
          listEl.setAttribute("hidden", "");
          btnEl.textContent = (data.phrases?.btnShow) || FALLBACK.btnShow;
          btnEl.setAttribute("aria-expanded", "false");
        }
      };

      if (data.error) {
        errEl.removeAttribute("hidden");
        errEl.textContent = (isRO ? "A apărut o problemă: " : "Schedule load issue: ") + data.error;
      }
    })
    .catch(() => {
      errEl.removeAttribute("hidden");
      errEl.textContent = isRO ? "Nu s-a putut încărca programul." : "Failed to load schedule.";
    });

  // ---- helpers ----
  function renderPlatforms(prefixText) {
    const prefix = document.createElement("span");
    prefix.className = "ap-prefix";
    prefix.textContent = prefixText + ":";
    platBar.appendChild(prefix);

    const row = document.createElement("div");
    row.className = "ap-plat-row";
    platBar.appendChild(row);

    [
      { name: "Twitch", url: "https://www.twitch.tv/AngeloPab", img: "twitch.png" },
      { name: "YouTube", url: "https://www.youtube.com/@angelopabtv", img: "youtube.png" },
      { name: "Kick", url: "https://kick.com/AngeloPab", img: "kick.png" },
      { name: "TikTok", url: "https://www.tiktok.com/@angelopabtv", img: "tiktok.png" },
    ].forEach((p) => {
      const a = document.createElement("a");
      a.className = "ap-chip";
      a.href = p.url; a.target = "_blank"; a.rel = "noopener";

      const img = document.createElement("img");
      img.loading = "lazy"; img.alt = "";
      img.src = `https://api.angelopab.com/img/${p.img}?w=20&h=20`;

      a.appendChild(img);
      a.append(p.name);
      row.appendChild(a);
    });
  }

  function prettifyRoDate(s) {
    let out = String(s || "").replace(/([A-Za-zĂÂÎȘȚăâîșț]+)\.\s*,/g, "$1,");
    const roMonths = {
      "ian": "Ian", "feb": "Feb", "mar": "Mar", "apr": "Apr", "mai": "Mai",
      "iun": "Iun", "iul": "Iul", "aug": "Aug", "sept": "Sept",
      "oct": "Oct", "nov": "Nov", "dec": "Dec"
    };
    out = out.replace(/\b(ian|feb|mar|apr|mai|iun|iul|aug|sept|oct|nov|dec)\b/gi,
      (m) => roMonths[m.toLowerCase()] || m);
    return out;
  }
  function escapeHtml(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
  function capitalizeFirst(s) {
    if (!s) return s;
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
})();
