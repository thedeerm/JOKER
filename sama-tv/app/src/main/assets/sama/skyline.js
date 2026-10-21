// أفق بغداد: برج بغداد، نصب الشهيد، قباب ومنائر، ونخيل، وبيوت بشبابيك تضوي بالليل
(function () {
  const W = 1920, G = 260; // العرض وخط الأرض
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const r = (a, b) => a + rnd() * (b - a);

  const shapes = [];
  const fronds = [];
  const lights = [];

  function windows(x, y, w, h) {
    for (let wy = y + 8; wy < G - 10; wy += 11) {
      for (let wx = x + 5; wx < x + w - 6; wx += 9) {
        if (rnd() < 0.16) lights.push(`<rect ${rnd() < .35 ? 'class="tw" ' : ''}x="${wx.toFixed(0)}" y="${wy.toFixed(0)}" width="3.2" height="4.2"/>`);
      }
    }
  }

  function building(x, w, h) {
    const y = G - h;
    shapes.push(`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}"/>`);
    // سطوح بيوت بغدادية: سياج صغير أو خزان ماء
    if (rnd() < .45) shapes.push(`<rect x="${(x + r(4, w - 18)).toFixed(1)}" y="${(y - 9).toFixed(1)}" width="12" height="9"/>`);
    if (rnd() < .3) shapes.push(`<rect x="${(x + 2).toFixed(1)}" y="${(y - 4).toFixed(1)}" width="${(w - 4).toFixed(1)}" height="4"/>`);
    windows(x, y, w, h);
  }

  function palm(x, h, lean) {
    const top = G - h, tx = x + lean;
    shapes.push(`<path d="M${x - 3} ${G} Q${x + lean * .3} ${G - h * .5} ${tx - 1.5} ${top} L${tx + 1.5} ${top} Q${x + lean * .3 + 3} ${G - h * .5} ${x + 3} ${G} Z"/>`);
    const n = 9;
    for (let i = 0; i < n; i++) {
      const a = Math.PI + (i / (n - 1)) * Math.PI + r(-.12, .12);
      const len = r(30, 44);
      const ex = tx + Math.cos(a) * len, ey = top + Math.sin(a) * len * .55 + len * .45;
      const cx = tx + Math.cos(a) * len * .5, cy = top + Math.sin(a) * len * .5 - 6;
      fronds.push(`<path d="M${tx.toFixed(1)} ${top.toFixed(1)} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}"/>`);
    }
    shapes.push(`<circle cx="${tx}" cy="${top + 3}" r="5"/>`);
  }

  function minaret(x, h, w) {
    const top = G - h;
    shapes.push(`<rect x="${x - w / 2}" y="${top + 18}" width="${w}" height="${h - 18}"/>`);
    shapes.push(`<rect x="${x - w / 2 - 4}" y="${top + 40}" width="${w + 8}" height="5"/>`); // الشرفة
    shapes.push(`<rect x="${x - w / 2 - 3}" y="${top + 80}" width="${w + 6}" height="4"/>`);
    shapes.push(`<path d="M${x - w / 2} ${top + 18} Q${x - w / 2} ${top + 6} ${x} ${top} Q${x + w / 2} ${top + 6} ${x + w / 2} ${top + 18} Z"/>`);
    shapes.push(`<rect x="${x - .8}" y="${top - 10}" width="1.6" height="10"/>`);
  }

  function dome(x, w, h, base) {
    const y = G - base;
    shapes.push(`<rect x="${x - w / 2 - 20}" y="${y}" width="${w + 40}" height="${base}"/>`);
    shapes.push(`<rect x="${x - w / 2 + 4}" y="${y - 14}" width="${w - 8}" height="14"/>`); // الرقبة
    // قبة بصلية
    shapes.push(`<path d="M${x - w / 2} ${y - 14} C${x - w / 2 - 4} ${y - 14 - h * .55} ${x - 6} ${y - 14 - h * .8} ${x} ${y - 14 - h} C${x + 6} ${y - 14 - h * .8} ${x + w / 2 + 4} ${y - 14 - h * .55} ${x + w / 2} ${y - 14} Z"/>`);
    shapes.push(`<rect x="${x - .9}" y="${y - 14 - h - 12}" width="1.8" height="12"/>`);
    windows(x - w / 2 - 20, y, w + 40, base);
  }

  // برج بغداد (برج المأمون)
  function tower(x) {
    shapes.push(`<path d="M${x - 16} ${G} L${x - 9} 92 L${x + 9} 92 L${x + 16} ${G} Z"/>`);
    shapes.push(`<path d="M${x - 9} 92 L${x - 30} 78 L${x - 34} 62 L${x + 34} 62 L${x + 30} 78 L${x + 9} 92 Z"/>`);
    shapes.push(`<rect x="${x - 24}" y="50" width="48" height="12" rx="3"/>`);
    shapes.push(`<rect x="${x - 7}" y="28" width="14" height="22"/>`);
    shapes.push(`<rect x="${x - 1.5}" y="2" width="3" height="28"/>`);
    lights.push(`<rect x="${x - 26}" y="66" width="52" height="2.2" opacity=".9"/>`);
    window.__beacon = `<circle class="beacon" cx="${x}" cy="3" r="3.2"/>`;
  }

  // نصب الشهيد: قبة مشطورة لنصفين
  function shaheed(x) {
    shapes.push(`<rect x="${x - 120}" y="${G - 22}" width="240" height="22"/>`);
    shapes.push(`<path d="M${x - 92} ${G - 22} C${x - 92} ${G - 92} ${x - 52} ${G - 128} ${x - 8} ${G - 132} L${x - 8} ${G - 22} Z"/>`);
    shapes.push(`<path d="M${x + 16} ${G - 116} C${x + 58} ${G - 112} ${x + 96} ${G - 80} ${x + 98} ${G - 22} L${x + 16} ${G - 22} Z"/>`);
    shapes.push(`<rect x="${x + 3}" y="${G - 78}" width="2" height="56"/>`);
  }

  // تعبئة البيوت على طول الأفق
  let x = -10;
  while (x < W + 10) {
    const w = r(34, 96);
    const h = r(36, 104);
    building(x, w, h);
    x += w + (rnd() < .2 ? r(10, 40) : r(0, 4));
  }

  shaheed(330);
  for (const [px, ph, pl] of [[120, 150, -8], [168, 128, 6], [560, 160, 10], [612, 136, -6], [700, 118, 4], [1030, 146, -9], [1330, 138, 8], [1378, 164, -4], [1690, 150, 7], [1750, 124, -10], [1860, 142, 5]]) palm(px, ph, pl);
  dome(880, 74, 70, 60);
  minaret(808, 196, 11);
  minaret(952, 196, 11);
  dome(1200, 50, 46, 48);
  minaret(1250, 150, 9);
  tower(1540);

  const city = `<g class="city">${shapes.join('')}<g class="fronds">${fronds.join('')}</g></g>`;
  const lit = `<g class="lights">${lights.join('')}</g>`;

  window.drawSkyline = function () {
    document.getElementById('skyline').innerHTML = city + lit + (window.__beacon || '');
    document.getElementById('reflection').innerHTML = city + lit;
  };
})();
