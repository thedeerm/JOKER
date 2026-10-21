// محرك السماء: الألوان، الشمس والقمر والنجوم، الغيوم، المطر، البرق، الثلج، الضباب، الغبار، الرياح، والحر
(function () {
  const back = document.getElementById('back');
  const front = document.getElementById('front');
  const bx = back.getContext('2d');
  const fx = front.getContext('2d');
  const root = document.documentElement;

  let W = 0, H = 0, Q = 1;
  let scene = null;
  let stars = [], clouds = [], sprites = [], drops = [], ripples = [], flakes = [], motes = [], wisps = [], fogs = [], glass = [], heat = [];
  let bolt = null, flash = 0, nextBolt = 0;
  let last = 0, t0 = performance.now();

  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // ===== الألوان =====
  const PAL = {
    night:        ['#040914', '#0a1530', '#1a2a4c', '#06080d'],
    dawn:         ['#1c2a58', '#7d679b', '#ffb47e', '#120f1a'],
    day:          ['#1b5ea6', '#3d8bd0', '#9ccbea', '#101c2c'],
    dusk:         ['#232c5c', '#b25c78', '#ffaa62', '#150e18'],
    cloudyDay:    ['#4d5864', '#76818c', '#a3acb4', '#1b2129'],
    cloudyNight:  ['#0b0f15', '#161c25', '#232b37', '#06080b'],
    rainDay:      ['#323e4b', '#4d5966', '#727e89', '#121820'],
    rainNight:    ['#06090d', '#0e141b', '#19212b', '#040608'],
    stormDay:     ['#151b24', '#28323f', '#414c5a', '#090c10'],
    stormNight:   ['#040507', '#0a0e13', '#131921', '#020304'],
    dustDay:      ['#6e4b2c', '#a8763f', '#d8a46a', '#36230f'],
    dustNight:    ['#24180e', '#3f2a19', '#5c4027', '#140d07'],
    fogDay:       ['#4d555d', '#6c737a', '#8d9399', '#3f454b'],
    fogNight:     ['#16191d', '#24282e', '#343a41', '#0f1114'],
    heatDay:      ['#2f72b4', '#8dbbe0', '#f1ddb0', '#1b1a20'],
  };

  function palette(s) {
    const night = !s.isDay;
    if (s.dust > .25) return PAL[night ? 'dustNight' : 'dustDay'];
    if (s.kind === 'storm') return PAL[night ? 'stormNight' : 'stormDay'];
    if (s.kind === 'rain' || s.kind === 'drizzle' || s.kind === 'snow') return PAL[night ? 'rainNight' : 'rainDay'];
    if (s.kind === 'fog') return PAL[night ? 'fogNight' : 'fogDay'];
    if (s.cloud > .8) return PAL[night ? 'cloudyNight' : 'cloudyDay'];
    if (s.phase === 'dawn') return PAL.dawn;
    if (s.phase === 'dusk') return PAL.dusk;
    if (night) return PAL.night;
    if (s.heat > .3) return PAL.heatDay;
    return PAL.day;
  }

  let skyOn = 'A', skyNow = '';
  function paintSky(s) {
    const p = palette(s);
    const g = `linear-gradient(to bottom, ${p[0]} 0%, ${p[1]} 48%, ${p[2]} 80%, ${p[2]} 100%)`;
    root.style.setProperty('--city', p[3]);
    document.body.classList.toggle('night', !s.isDay || s.phase === 'dusk');
    if (g === skyNow) return;
    skyNow = g;
    const next = skyOn === 'A' ? 'B' : 'A';
    const nEl = document.getElementById('sky' + next), oEl = document.getElementById('sky' + skyOn);
    nEl.style.background = g;
    nEl.style.opacity = 1; oEl.style.opacity = 0;
    skyOn = next;
  }

  // ===== المقاسات =====
  function resize() {
    Q = Math.min(1, 1280 / window.innerWidth);
    W = Math.round(window.innerWidth * Q);
    H = Math.round(window.innerHeight * Q);
    back.width = front.width = W;
    back.height = front.height = H;
    if (scene) build(scene);
  }
  // قمة البيوت وسطح دجلة بنفس مقاسات CSS
  const riverY = () => H - window.innerHeight * .055 * Q;
  const horizonY = () => riverY() - window.innerWidth * .115 * Q * .38;

  // ===== نقش الغيوم =====
  function makeSprites(tint) {
    sprites = [];
    for (let k = 0; k < 6; k++) {
      const c = document.createElement('canvas');
      const w = 360, h = 150;
      c.width = w; c.height = h;
      const g = c.getContext('2d');
      const n = 10 + (k % 3) * 3;
      for (let i = 0; i < n; i++) {
        const cx = rand(w * .18, w * .82), cy = rand(h * .45, h * .7), r = rand(26, 58) * (1 - Math.abs(cx - w / 2) / w);
        const gr = g.createRadialGradient(cx, cy - r * .2, r * .1, cx, cy, r);
        gr.addColorStop(0, `rgba(${tint},.9)`);
        gr.addColorStop(.6, `rgba(${tint},.45)`);
        gr.addColorStop(1, `rgba(${tint},0)`);
        g.fillStyle = gr;
        g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();
      }
      sprites.push(c);
    }
  }

  function cloudTint(s) {
    if (s.dust > .25) return '214,168,118';
    if (s.kind === 'storm') return s.isDay ? '92,100,112' : '40,46,56';
    if (s.kind === 'rain' || s.kind === 'drizzle' || s.kind === 'snow') return s.isDay ? '150,158,168' : '52,60,72';
    if (!s.isDay) return s.phase === 'dusk' ? '120,92,120' : '62,72,94';
    if (s.phase === 'dawn' || s.phase === 'dusk') return '255,206,190';
    if (s.cloud > .8) return '205,211,218';
    return '255,255,255';
  }

  // الريح: كم الشرقية تدفع لليمين على الشاشة
  const windPx = s => -Math.sin((s.windDir || 300) * Math.PI / 180) * (s.wind || 8);

  // ===== بناء المشهد =====
  function build(s) {
    const hy = horizonY();
    makeSprites(cloudTint(s));

    stars = [];
    for (let i = 0; i < 160; i++) stars.push({ x: rand(0, W), y: rand(0, hy * .9), r: rand(.4, 1.5), p: rand(0, 6.3), s: rand(.6, 1.8) });

    clouds = [];
    const n = Math.round(1 + s.cloud * 15);
    for (let i = 0; i < n; i++) {
      const depth = rand(.45, 1);
      clouds.push({ img: i % sprites.length, x: rand(-W * .2, W * 1.1), y: rand(H * .02, H * .55) * (1.2 - depth * .4), sc: depth * rand(1, 1.9) * (W / 1280), a: rand(.45, .95) * (.45 + .55 * s.cloud), d: depth });
    }
    clouds.sort((a, b) => a.d - b.d);

    const rainAmt = s.kind === 'storm' ? Math.max(.75, s.rain) : s.rain;
    drops = [];
    const nd = Math.round(rainAmt * 650);
    for (let i = 0; i < nd; i++) drops.push(newDrop(true));
    ripples = [];

    flakes = [];
    if (s.kind === 'snow') for (let i = 0; i < 260; i++) flakes.push({ x: rand(0, W), y: rand(0, H), r: rand(.8, 2.6), v: rand(25, 70), p: rand(0, 6.3) });

    motes = [];
    const nm = Math.round(s.dust * 420);
    for (let i = 0; i < nm; i++) motes.push({ x: rand(0, W), y: rand(H * .1, H), r: rand(.5, 1.8), v: rand(.6, 1.4), p: rand(0, 6.3), a: rand(.25, .7) });

    wisps = [];
    const nw = s.wind >= 20 ? Math.min(18, Math.round((s.wind - 12) / 2.2)) : 0;
    for (let i = 0; i < nw; i++) wisps.push(newWisp(true));

    fogs = [];
    if (s.kind === 'fog') for (let i = 0; i < 6; i++) fogs.push({ x: rand(-W * .5, W), y: rand(H * .45, H * .98), w: rand(W * .8, W * 1.5), h: rand(H * .12, H * .26), v: rand(4, 10) * (i % 2 ? 1 : -1), a: rand(.16, .28) });

    glass = [];
    if (rainAmt > .3) for (let i = 0; i < 34; i++) glass.push(newGlass());

    heat = [];
    if (s.heat > .2) for (let i = 0; i < 26; i++) heat.push({ x: rand(0, W), y: rand(hy - H * .12, hy + H * .05), w: rand(W * .08, W * .2), v: rand(6, 14), p: rand(0, 6.3) });

    nextBolt = performance.now() + rand(1500, 4000);
    bolt = null; flash = 0;
  }

  function newDrop(anywhere) {
    const near = Math.random() < .35;
    return {
      x: rand(-W * .1, W * 1.1), y: anywhere ? rand(-H, H) : rand(-H * .3, -10),
      len: near ? rand(18, 30) : rand(9, 16), v: near ? rand(900, 1150) : rand(620, 820),
      w: near ? 1.3 : .8, a: near ? .42 : .24, end: rand(H * .74, H),
    };
  }
  function newWisp(anywhere) {
    return { x: anywhere ? rand(-W * .3, W) : -W * .35, y: rand(H * .08, H * .85), len: rand(W * .1, W * .24), amp: rand(4, 14), f: rand(1.5, 3), p: rand(0, 6.3), v: rand(.8, 1.3), a: rand(.18, .4) };
  }
  function newGlass() {
    return { x: rand(0, W), y: rand(0, H * .85), r: rand(1.6, 4.6), v: 0, slide: Math.random() < .25 };
  }

  // ===== الشمس والقمر =====
  function arcPos(f) {
    const hy = horizonY();
    return { x: W * (.9 - .8 * f), y: hy - (hy - H * .12) * Math.sin(Math.PI * clamp(f, 0, 1)) + H * .02 };
  }

  function drawSun(s, t) {
    const { x, y } = arcPos(s.sunFrac);
    const veil = clamp(1 - s.cloud * .85 - s.dust * .5, .08, 1) * (s.rain > 0 ? .3 : 1);
    const R = H * (s.heat > .3 ? .5 : .36) * (1 + .03 * Math.sin(t / 2400));
    const warm = s.phase === 'day' ? '255,236,190' : '255,170,110';
    let g = bx.createRadialGradient(x, y, 0, x, y, R);
    g.addColorStop(0, `rgba(${warm},${.55 * veil})`);
    g.addColorStop(.25, `rgba(${warm},${.16 * veil})`);
    g.addColorStop(1, `rgba(${warm},0)`);
    bx.fillStyle = g; bx.fillRect(x - R, y - R, R * 2, R * 2);
    bx.fillStyle = s.dust > .25 ? `rgba(255,226,180,${.55 * veil + .15})` : `rgba(255,248,228,${.95 * veil})`;
    bx.beginPath(); bx.arc(x, y, H * .028, 0, Math.PI * 2); bx.fill();
  }

  const moonCan = document.createElement('canvas');
  function drawMoon(s) {
    const { x, y } = arcPos(s.sunFrac);
    const r = H * .03, veil = clamp(1 - s.cloud * .9, .05, 1);
    const g = bx.createRadialGradient(x, y, 0, x, y, r * 7);
    g.addColorStop(0, `rgba(220,230,255,${.18 * veil})`);
    g.addColorStop(1, 'rgba(220,230,255,0)');
    bx.fillStyle = g; bx.fillRect(x - r * 7, y - r * 7, r * 14, r * 14);
    const S = Math.ceil(r * 2 + 4);
    moonCan.width = moonCan.height = S;
    const m = moonCan.getContext('2d');
    m.fillStyle = '#f1ead7';
    m.beginPath(); m.arc(S / 2, S / 2, r, 0, Math.PI * 2); m.fill();
    // الظل حسب طور القمر (هلال، تربيع، بدر)
    const p = s.moonPhase == null ? .3 : s.moonPhase;
    const lit = (1 - Math.cos(2 * Math.PI * p)) / 2;
    const off = 2 * r * lit;
    m.globalCompositeOperation = 'destination-out';
    m.beginPath(); m.arc(S / 2 + (p < .5 ? -off : off), S / 2, r * 1.02, 0, Math.PI * 2); m.fill();
    bx.globalAlpha = .25 + .75 * veil;
    bx.drawImage(moonCan, x - S / 2, y - S / 2);
    bx.globalAlpha = 1;
  }

  // ===== الرسم الخلفي =====
  function drawBack(t, dt) {
    const s = scene;
    bx.clearRect(0, 0, W, H);

    // النجوم
    const starA = (!s.isDay ? 1 : s.phase === 'dawn' || s.phase === 'dusk' ? .3 : 0) * clamp(1 - s.cloud * 1.1, 0, 1) * (1 - s.dust);
    if (starA > .02) {
      bx.fillStyle = '#fff';
      for (const st of stars) {
        bx.globalAlpha = starA * (.45 + .55 * Math.sin(st.p + t / 1000 * st.s)) ;
        bx.fillRect(st.x, st.y, st.r, st.r);
      }
      bx.globalAlpha = 1;
    }

    if (s.isDay) drawSun(s, t); else drawMoon(s);

    // الغيوم
    const wp = windPx(s);
    for (const c of clouds) {
      c.x += (wp * .9 + 3) * c.d * dt * (W / 1280);
      const img = sprites[c.img], w = img.width * c.sc, h = img.height * c.sc;
      if (c.x > W + w * .1) c.x = -w;
      if (c.x < -w * 1.1) c.x = W;
      bx.globalAlpha = c.a;
      bx.drawImage(img, c.x, c.y, w, h);
    }
    bx.globalAlpha = 1;
  }

  // ===== الرسم الأمامي =====
  function drawFront(t, dt) {
    const s = scene;
    fx.clearRect(0, 0, W, H);
    const wp = windPx(s);
    const slant = clamp(wp / 60, -.5, .5);

    // الضباب
    if (fogs.length) {
      fx.fillStyle = s.isDay ? 'rgba(220,224,228,.06)' : 'rgba(120,128,138,.08)';
      fx.fillRect(0, 0, W, H);
      for (const f of fogs) {
        f.x += f.v * dt;
        if (f.x > W) f.x = -f.w; if (f.x < -f.w) f.x = W;
        const g = fx.createRadialGradient(f.x + f.w / 2, f.y, 0, f.x + f.w / 2, f.y, f.w / 2);
        const c = s.isDay ? '232,235,238' : '140,148,158';
        g.addColorStop(0, `rgba(${c},${f.a})`); g.addColorStop(1, `rgba(${c},0)`);
        fx.save(); fx.translate(0, f.y); fx.scale(1, f.h / f.w * 2); fx.translate(0, -f.y);
        fx.fillStyle = g; fx.fillRect(f.x, f.y - f.w / 2, f.w, f.w); fx.restore();
      }
    }

    // الحر: تموجات فوق الأفق
    if (heat.length) {
      const g = fx.createLinearGradient(0, horizonY() - H * .2, 0, horizonY() + H * .05);
      g.addColorStop(0, 'rgba(255,190,110,0)'); g.addColorStop(1, `rgba(255,180,100,${.18 * s.heat * (0.8 + .2 * Math.sin(t / 1800))})`);
      fx.fillStyle = g; fx.fillRect(0, horizonY() - H * .2, W, H * .25);
      fx.strokeStyle = 'rgba(255,240,220,.07)'; fx.lineWidth = 1.2;
      for (const h of heat) {
        h.y -= h.v * dt; h.p += dt * 2;
        if (h.y < horizonY() - H * .22) { h.y = horizonY() + H * .04; h.x = rand(0, W); }
        fx.beginPath();
        for (let i = 0; i <= 12; i++) { const xx = h.x + h.w * i / 12; const yy = h.y + Math.sin(h.p + i * .9) * 2.5; i ? fx.lineTo(xx, yy) : fx.moveTo(xx, yy); }
        fx.stroke();
      }
    }

    // الغبار
    if (s.dust > .05) {
      const g = fx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, `rgba(176,120,64,${.12 * s.dust})`);
      g.addColorStop(.7, `rgba(196,138,78,${.42 * s.dust})`);
      g.addColorStop(1, `rgba(150,100,56,${.5 * s.dust})`);
      fx.fillStyle = g; fx.fillRect(0, 0, W, H);
      const v = Math.max(40, Math.abs(wp) * 9) * Math.sign(wp || 1);
      fx.fillStyle = 'rgb(236,196,146)';
      for (const m of motes) {
        m.x += v * m.v * dt; m.p += dt * 1.3;
        m.y += Math.sin(m.p) * 12 * dt;
        if (m.x > W + 5) m.x = -5; if (m.x < -5) m.x = W + 5;
        fx.globalAlpha = m.a * s.dust;
        fx.fillRect(m.x, m.y, m.r, m.r);
      }
      fx.globalAlpha = 1;
    }

    // الرياح
    if (wisps.length) {
      const dir = Math.sign(wp || 1);
      for (let i = 0; i < wisps.length; i++) {
        const w = wisps[i];
        w.x += s.wind * 7 * w.v * dt * (W / 1280);
        w.p += dt * 2.2;
        if (w.x > W * 1.05) wisps[i] = newWisp(false);
        const x0 = dir > 0 ? w.x : W - w.x;
        const g = fx.createLinearGradient(x0 - w.len * dir, 0, x0, 0);
        g.addColorStop(0, 'rgba(255,255,255,0)');
        g.addColorStop(.7, `rgba(255,255,255,${w.a})`);
        g.addColorStop(1, 'rgba(255,255,255,0)');
        fx.strokeStyle = g; fx.lineWidth = 1.4;
        fx.beginPath();
        for (let k = 0; k <= 20; k++) {
          const xx = x0 - w.len * dir * (1 - k / 20);
          const yy = w.y + Math.sin(w.p + k / 20 * w.f * Math.PI) * w.amp;
          k ? fx.lineTo(xx, yy) : fx.moveTo(xx, yy);
        }
        fx.stroke();
      }
    }

    // المطر
    if (drops.length) {
      for (const pass of [0, 1]) {
        fx.beginPath();
        let a = 0, lw = 1;
        for (let i = 0; i < drops.length; i++) {
          const d = drops[i];
          if ((d.w > 1) !== (pass === 1)) continue;
          a = d.a; lw = d.w;
          d.y += d.v * dt * (H / 720); d.x += d.v * slant * dt * (H / 720);
          if (d.y > d.end) {
            if (d.end > riverY() && ripples.length < 60 && Math.random() < .5) ripples.push({ x: d.x, y: d.end, r: 0 });
            drops[i] = newDrop(false); continue;
          }
          fx.moveTo(d.x, d.y); fx.lineTo(d.x - d.len * slant, d.y - d.len);
        }
        fx.strokeStyle = `rgba(200,218,240,${a})`; fx.lineWidth = lw; fx.stroke();
      }
      // دوائر على سطح دجلة
      fx.strokeStyle = 'rgba(200,220,240,.35)'; fx.lineWidth = .8;
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i]; r.r += 18 * dt;
        if (r.r > 9) { ripples.splice(i, 1); continue; }
        fx.globalAlpha = 1 - r.r / 9;
        fx.beginPath(); fx.ellipse(r.x, r.y, r.r * 1.8, r.r * .45, 0, 0, Math.PI * 2); fx.stroke();
      }
      fx.globalAlpha = 1;
    }

    // قطرات على الزجاج
    if (glass.length) {
      for (let i = 0; i < glass.length; i++) {
        const g = glass[i];
        if (g.slide) { g.v = Math.min(g.v + dt * 14, 60); g.y += g.v * dt; if (g.y > H) glass[i] = newGlass(); }
        const gr = fx.createRadialGradient(g.x - g.r * .35, g.y - g.r * .4, 0, g.x, g.y, g.r);
        gr.addColorStop(0, 'rgba(255,255,255,.55)');
        gr.addColorStop(.5, 'rgba(210,225,240,.12)');
        gr.addColorStop(.9, 'rgba(10,16,24,.22)');
        gr.addColorStop(1, 'rgba(10,16,24,0)');
        fx.fillStyle = gr;
        fx.beginPath(); fx.arc(g.x, g.y, g.r, 0, Math.PI * 2); fx.fill();
      }
    }

    // الثلج
    if (flakes.length) {
      fx.fillStyle = 'rgba(255,255,255,.85)';
      for (const f of flakes) {
        f.y += f.v * dt; f.p += dt; f.x += (Math.sin(f.p) * 14 + wp * .8) * dt;
        if (f.y > H) { f.y = -5; f.x = rand(0, W); }
        if (f.x > W) f.x = 0; if (f.x < 0) f.x = W;
        fx.beginPath(); fx.arc(f.x, f.y, f.r, 0, Math.PI * 2); fx.fill();
      }
    }

    // البرق
    if (scene.kind === 'storm') {
      const now = performance.now();
      if (now > nextBolt) {
        bolt = makeBolt(); bolt.at = now;
        nextBolt = now + rand(3500, 9000);
      }
      if (bolt) {
        const age = now - bolt.at;
        const seq = age < 70 ? 1 : age < 140 ? .25 : age < 230 ? .85 : age < 600 ? .85 * (1 - (age - 230) / 370) : 0;
        if (seq <= 0) bolt = null;
        else {
          fx.fillStyle = `rgba(210,220,255,${.32 * seq})`; fx.fillRect(0, 0, W, H);
          fx.strokeStyle = `rgba(190,200,255,${.35 * seq})`; fx.lineWidth = 6; strokeBolt(bolt);
          fx.strokeStyle = `rgba(255,255,255,${seq})`; fx.lineWidth = 1.6; strokeBolt(bolt);
        }
      }
    }
  }

  function makeBolt() {
    const segs = [];
    let x = rand(W * .15, W * .85), y = 0;
    const end = horizonY() + rand(-10, 20);
    const main = [[x, y]];
    while (y < end) { x += rand(-W * .03, W * .03); y += rand(H * .03, H * .07); main.push([x, Math.min(y, end)]); }
    segs.push(main);
    for (let b = 0; b < 2; b++) {
      const i = Math.floor(rand(2, main.length - 2));
      if (!main[i]) continue;
      let [bxx, byy] = main[i]; const br = [[bxx, byy]]; const dir = Math.random() < .5 ? -1 : 1;
      for (let k = 0; k < 4; k++) { bxx += dir * rand(W * .01, W * .03); byy += rand(H * .02, H * .05); br.push([bxx, byy]); }
      segs.push(br);
    }
    return { segs };
  }
  function strokeBolt(b) {
    fx.beginPath();
    for (const s of b.segs) s.forEach(([x, y], i) => i ? fx.lineTo(x, y) : fx.moveTo(x, y));
    fx.stroke();
  }

  // ===== الحلقة =====
  function frame(now) {
    requestAnimationFrame(frame);
    if (!scene || document.hidden) { last = now; return; }
    if (now - last < 32) return; // حوالي 30 إطار بالثانية، أخف على الشاشة
    const dt = Math.min(.1, (now - last) / 1000);
    last = now;
    drawBack(now - t0, dt);
    drawFront(now - t0, dt);
  }

  window.Sky = {
    set(s) {
      const rebuild = !scene || s.kind !== scene.kind || Math.abs(s.cloud - scene.cloud) > .08 || Math.abs(s.rain - scene.rain) > .08 ||
        Math.abs(s.dust - scene.dust) > .08 || Math.abs((s.wind || 0) - (scene.wind || 0)) > 4 || s.isDay !== scene.isDay ||
        s.phase !== scene.phase || Math.abs(s.heat - scene.heat) > .1;
      scene = s;
      paintSky(s);
      if (rebuild) build(s);
    },
  };

  window.addEventListener('resize', resize);
  resize();
  requestAnimationFrame(frame);
})();
