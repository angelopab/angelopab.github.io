// assets/js/schedule-widget.js
// Renders the schedule card using https://api.angelopab.com/schedule-json
(function () {
  const root = document.getElementById("ap-schedule");
  if (!root) return;

  const nextEl = root.querySelector("#ap-next");
  const listEl = root.querySelector("#ap-list");
  const btnEl  = root.querySelector("#ap-toggle");
  const noteEl = root.querySelector(".ap-note");
  const platBar = root.querySelector("#ap-platforms");
  const errEl = root.querySelector("#ap-error");

  // Always show icons + text
  function renderPlatforms(prefixText) {
    platBar.innerHTML = "";
    const prefix = document.createElement("span");
    prefix.className = "ap-prefix";
    prefix.textContent = prefixText + ":";
    platBar.appendChild(prefix);

    const platforms = [
      { name: "Twitch",  url: "https://www.twitch.tv/AngeloPab",      img: "twitch.png"  },
      { name: "YouTube", url: "https://www.youtube.com/@angelopabtv", img: "youtube.png" },
      { name: "Kick",    url: "https://kick.com/AngeloPab",           img: "kick.png"    },
      { name: "TikTok",  url: "https://www.tiktok.com/@angelopabtv",  img: "tiktok.png"  },
    ];

    platforms.forEach((p, i) => {
      const sep = document.createElement("span");
      sep.className = "ap-sep";
      sep.textContent = i === 0 ? " " : " · ";
      platBar.appendChild(sep);

      const a = document.createElement("a");
      a.className = "ap-chip";
      a.href = p.url; a.target = "_blank"; a.rel = "noopener";

      const img = document.createElement("img");
      img.loading = "lazy"; img.alt = "";
      img.src = `https://api.angelopab.com/img/${p.img}?w=20&h=20`;

      a.appendChild(img);
      a.append(p.name);
      platBar.appendChild(a);
    });
  }

  fetch("https://api.angelopab.com/schedule-json")
    .then(r => r.json())
    .then(data => {
      renderPlatforms(data.phrases.alsoLive);
      noteEl.textContent = data.phrases.tzNote;

      // NEXT line (show game; fallback to title)
      if (data.next) {
        const label = data.next.game || data.next.title || "";
        nextEl.innerHTML =
          `<strong>${escapeHtml(data.phrases.headline)}:</strong> ` +
          `<span class="ap-when">${escapeHtml(capitalizeFirst(data.next.dateText))}, ${escapeHtml(data.next.timeText)}</span> ` +
          `<span class="ap-in">${escapeHtml(data.next.inText)}</span> ` +
          (label ? `<div class="ap-game">— ${escapeHtml(label)}</div>` : "");
      } else {
        nextEl.textContent = "—";
      }

      // Expanded list (do NOT duplicate first; show next 3 items)
      listEl.innerHTML = "";
      const more = (data.items || []).slice(1, 4); // exactly 3 after the first
      more.forEach((it) => {
        const label = it.game || it.title || "";
        const li = document.createElement("li");
        li.className = "ap-li";
        li.innerHTML =
          `<div class="ap-li-row">` +
          `<span class="ap-li-when">${escapeHtml(capitalizeFirst(it.dateText))}, ${escapeHtml(it.timeText)}</span>` +
          `<span class="ap-li-in">${escapeHtml(it.inText)}</span>` +
          `</div>` +
          (label ? `<div class="ap-li-title">— ${escapeHtml(label)}</div>` : "");
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
