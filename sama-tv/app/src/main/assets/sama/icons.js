// أيقونات خطية بسيطة (24×24) مع حركة هادئة عبر CSS
(function () {
  const SUN = '#ffcf7a', MOON = '#e9e4d4', CLOUD = '#e8edf3', DARK = '#aab4c2', RAIN = '#8fc7ff', BOLT = '#ffd84d', DUST = '#e0b27a';
  const A = 'fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"';

  const sun = (cx, cy, r, ray) => {
    let rays = '';
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4, c = Math.cos(a), s = Math.sin(a);
      rays += `<line x1="${(cx + c * (r + 2)).toFixed(1)}" y1="${(cy + s * (r + 2)).toFixed(1)}" x2="${(cx + c * (r + 2 + ray)).toFixed(1)}" y2="${(cy + s * (r + 2 + ray)).toFixed(1)}"/>`;
    }
    return `<g stroke="${SUN}" ${A}><circle cx="${cx}" cy="${cy}" r="${r}"/><g class="spin" style="transform-origin:${cx}px ${cy}px">${rays}</g></g>`;
  };
  const moon = (stroke) => `<path stroke="${stroke || MOON}" ${A} d="M15.5 4.2a8 8 0 1 0 4.3 12.3A6.6 6.6 0 0 1 15.5 4.2z"/>`;
  const cloudPath = 'M7 18.5h10.2a4.1 4.1 0 0 0 .5-8.2 5.6 5.6 0 0 0-10.8 1.2A3.6 3.6 0 0 0 7 18.5z';
  const cloud = (stroke, dy) => `<g class="drift" transform="translate(0 ${dy || 0})"><path stroke="${stroke || CLOUD}" ${A} d="${cloudPath}"/></g>`;
  const smallCloud = (stroke) => `<g class="drift" transform="translate(3 4) scale(.82)"><path stroke="${stroke || CLOUD}" fill="rgba(10,14,22,.55)" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" d="${cloudPath}"/></g>`;
  const drops = (n, len) => {
    const xs = n === 2 ? [10, 14.5] : [8.5, 12, 15.5];
    return `<g class="fall" stroke="${RAIN}" ${A}>` + xs.map(x => `<line x1="${x}" y1="19.5" x2="${x - 1}" y2="${19.5 + len}"/>`).join('') + '</g>';
  };

  const ICONS = {
    'clear-day': () => sun(12, 12, 4.2, 2.6),
    'clear-night': () => moon(),
    'partly-day': () => `<g transform="translate(-3 -3) scale(.8)">${sun(12, 12, 4, 2.4)}</g>` + smallCloud(),
    'partly-night': () => `<g transform="translate(-3 -3) scale(.75)">${moon()}</g>` + smallCloud(),
    'cloudy': () => `<g transform="translate(4 -3) scale(.7)" opacity=".6">${cloud(DARK)}</g>` + cloud(CLOUD, 1),
    'fog': () => `<g stroke="${CLOUD}" ${A} class="drift"><line x1="4" y1="9" x2="20" y2="9"/><line x1="6" y1="13" x2="18" y2="13" opacity=".7"/><line x1="3" y1="17" x2="17" y2="17" opacity=".5"/></g>`,
    'drizzle': () => cloud(CLOUD, -3) + drops(2, 1.6),
    'rain': () => cloud(CLOUD, -3) + drops(3, 2.8),
    'storm': () => cloud(DARK, -3) + `<path class="flash" stroke="${BOLT}" ${A} d="M12.5 15.5l-2 3.6h3l-2 3.6"/>`,
    'snow': () => cloud(CLOUD, -3) + `<g fill="${CLOUD}"><circle cx="8.5" cy="20.5" r=".9"/><circle cx="12" cy="22" r=".9"/><circle cx="15.5" cy="20.5" r=".9"/></g>`,
    'wind': () => `<g stroke="${CLOUD}" ${A} class="drift"><path d="M3 9h11a3 3 0 1 0-3-3"/><path d="M3 14h15a3 3 0 1 1-3 3"/><path d="M3 19h7" opacity=".6"/></g>`,
    'dust': () => `<g stroke="${DUST}" ${A} class="drift"><path d="M3 8h12a2.6 2.6 0 1 0-2.6-2.6"/><path d="M5 13h14"/><path d="M3 18h10a2.6 2.6 0 1 1-2.6 2.6"/></g><g fill="${DUST}"><circle cx="19" cy="8" r=".8"/><circle cx="21" cy="17" r=".8"/><circle cx="17" cy="20" r=".7"/></g>`,
    'heat': () => sun(12, 12, 4.6, 3) + `<circle cx="12" cy="12" r="2" fill="${SUN}"/>`,
    // أيقونات التفاصيل
    'drop': () => `<path stroke="currentColor" ${A} d="M12 3.5s-6 6.6-6 10.6a6 6 0 0 0 12 0c0-4-6-10.6-6-10.6z"/>`,
    'arrow': () => `<g stroke="currentColor" ${A}><line x1="12" y1="20" x2="12" y2="4"/><path d="M7 9l5-5 5 5"/></g>`,
    'uv': () => `<g stroke="currentColor" ${A}><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/></g>`,
    'air': () => `<g stroke="currentColor" ${A}><path d="M3 8h10a3 3 0 1 0-3-3"/><path d="M3 12h16"/><path d="M3 16h12a3 3 0 1 1-3 3"/></g>`,
    'info': () => `<g stroke="currentColor" ${A}><circle cx="12" cy="12" r="9"/><line x1="12" y1="11" x2="12" y2="16.5"/><circle cx="12" cy="7.8" r=".4" fill="currentColor"/></g>`,
  };

  window.icon = function (name) {
    const f = ICONS[name] || ICONS['clear-day'];
    return `<svg viewBox="0 0 24 24" aria-hidden="true">${f()}</svg>`;
  };

  // يملأ أي عنصر يحمل data-i
  window.fillIcons = function (root) {
    (root || document).querySelectorAll('[data-i]').forEach(el => { el.innerHTML = window.icon(el.dataset.i); });
  };
})();
