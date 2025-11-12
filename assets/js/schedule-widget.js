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
      { name: "Twitch",  url: "https://www.twitch.tv/AngeloPab",  img: "twitch.png"  },
      { name: "YouTube", url: "https://www.youtube.com/@angelopabtv", img: "youtube.png" },
      { name: "Kick",    url: "https://kick.com/AngeloPab",      img: "kick.png"    },
      { name: "TikTok",  url: "https://www.tiktok.com/@angelopabtv", img: "tiktok.png"  },
    ];

    platforms.forEach((p, i) => {
      const sep = document.createElement("span");
      sep.className = "ap-sep";
      sep.textContent = i === 0 ? " " : " · ";
      platBar.appendChild(sep);

      const a = document.createElement("a");
      a.className = "ap-chip";
      a.href = p.url;
      a.target = "_blank";
      a.rel = "noopener";

      const img = document.createElement("img");
      img.loading = "lazy";
      img.alt = "";
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

      // NEXT line
      if (data.next) {
        nextEl.innerHTML =
          `<strong>${escapeHtml(data.phrases.headline)}:</strong> ` +
          `<span class="ap-when">${escapeHtml(data.next.dateText)}, ${escapeHtml(data.next.timeText)}</span> ` +
          `<span class="ap-in">${escapeHtml(data.next.inText)}</span> ` +
          `<div class="ap-game">— ${escapeHtml(data.next.title)}</div>`;
      } else {
        nextEl.textContent = "—";
      }

      // Full list (includes the first item; we’ll hide duplication visually)
      listEl.innerHTML = "";
      data.items.forEach((it, idx) => {
        const li = document.createElement("li");
        li.className = "ap-li" + (idx === 0 ? " ap-li--first" : "");
        li.innerHTML =
          `<div class="ap-li-row">` +
          `<span class="ap-li-when">${escapeHtml(it.dateText)}, ${escapeHtml(it.timeText)}</span>` +
          `<span class="ap-li-in">${escapeHtml(it.inText)}</span>` +
          `</div>` +
          `<div class="ap-li-title">— ${escapeHtml(it.title)}</div>`;
        listEl.appendChild(li);
      });

      // Button behavior
      btnEl.textContent = data.phrases.btnShow;
      btnEl.setAttribute("aria-expanded", "false");
      btnEl.addEventListener("click", () => {
        const open = listEl.hasAttribute("hidden");
        if (open) {
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
})();
