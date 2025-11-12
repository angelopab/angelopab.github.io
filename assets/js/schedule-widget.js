// assets/js/schedule-widget.js
// - One-row platforms
// - No duplicate first stream
// - Countdown moved to RIGHT on expanded rows
// - RO month: remove trailing dot; capitalize month; capitalize weekday

(function () {
  const root = document.getElementById("ap-schedule");
  if (!root) return;

  const nextEl = root.querySelector("#ap-next");
  const listEl = root.querySelector("#ap-list");
  const btnEl  = root.querySelector("#ap-toggle");
  const noteEl = root.querySelector(".ap-note");
  const platBar = root.querySelector("#ap-platforms");
  const errEl = root.querySelector("#ap-error");

  function renderPlatforms(prefixText) {
    platBar.innerHTML = "";
    const prefix = document.createElement("span");
    prefix.className = "ap-prefix";
    prefix.textContent = prefixText + ":";
    platBar.appendChild(prefix);

    const row = document.createElement("div");
    row.className = "ap-plat-row";
    platBar.appendChild(row);

    const platforms = [
      { name: "Twitch",  url: "https://www.twitch.tv/AngeloPab",      img: "twitch.png"  },
      { name: "YouTube", url: "https://www.youtube.com/@angelopabtv", img: "youtube.png" },
      { name: "Kick",    url: "https://kick.com/AngeloPab",           img: "kick.png"    },
      { name: "TikTok",  url: "https://www.tiktok.com/@angelopabtv",  img: "tiktok.png"  },
    ];

    platforms.forEach((p) => {
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

  fetch("https://api.angelopab.com/schedule-json")
    .then(r => r.json())
    .then(data => {
      renderPlatforms(data.phrases.alsoLive);
      noteEl.textContent = data.phrases.tzNote;

      // NEXT line (weekday capitalized, month without dot + capitalized; countdown last line)
      if (data.next) {
        const label = data.next.game || data.next.title || "";
        const niceDate = prettifyRoDate(data.next.dateText);
        nextEl.innerHTML =
          `<strong>${escapeHtml(data.phrases.headline)}:</strong> ` +
          `<span class="ap-when">${escapeHtml(capitalizeFirst(niceDate))}, ${escapeHtml(data.next.timeText)}</span>` +
          (label ? `<div class="ap-game">— ${escapeHtml(label)}</div>` : "") +
          `<div class="ap-in">${escapeHtml(data.next.inText)}</div>`;
      } else {
        nextEl.textContent = "—";
      }

      // Expanded list: show exactly next 3 (no duplication of the first)
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
              `<span class="ap-li-when">${escapeHtml(capitalizeFirst(niceDate))}, ${escapeHtml(it.timeText)}</span>` +
              (label ? `<span class="ap-li-title"> — ${escapeHtml(label)}</span>` : "") +
            `</div>` +
            `<span class="ap-li-in">${escapeHtml(it.inText)}</span>` + // ➜ RIGHT SIDE
          `</div>`;
        listEl.appendChild(li);
      });

      // Button behavior
      btnEl.textContent = data.phrases.btnShow;
      btnEl.setAttribute("aria-expanded", "false");
      btnEl.addEventListener("click", () => {
        const isHidden = listEl.hasAttribute("hidden");
        if (isHidden) {
          listEl.removeAttribute("hidden");
          btnEl.textContent = data.phrases.btnHide;
          btnEl.setAttribute("aria-expanded", "true");
        } else {
          listEl.setAttribute("hidden", "");
          btnEl.textContent = data.phrases.btnShow;
          btnEl.setAttribute("aria-expanded", "false");
        }
      });
    })
    .catch(err => {
      errEl.removeAttribute("hidden");
      errEl.textContent = "Failed to load schedule.";
      console.error(err);
    });

  // ---- helpers ----
  function prettifyRoDate(s) {
    // 1) Remove trailing dot before comma on month: "nov.," -> "nov,"
    let out = String(s || "").replace(/([A-Za-zĂÂÎȘȚăâîșț]+)\.\s*,/g, "$1,");
    // 2) Capitalize month (ro short names)
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
