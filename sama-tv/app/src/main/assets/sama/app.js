// سما: ساعة وطقس — الزعفرانية، بغداد
(function () {
  const CONFIG = {
    place: 'الزعفرانية، بغداد',
    lat: 33.2590,
    lon: 44.4980,
    refreshMin: 15,
  };

  const $ = id => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const APP_MODE = params.get('mode') === 'app';

  // ===== أدوات عربية =====
  const AR = '٠١٢٣٤٥٦٧٨٩';
  const ar = v => String(v).replace(/\d/g, d => AR[d]).replace(/-/g, '−');
  const deg = v => '\u2066' + ar(Math.round(v)) + '°\u2069';
  const MONTHS = ['كانون الثاني', 'شباط', 'آذار', 'نيسان', 'أيار', 'حزيران', 'تموز', 'آب', 'أيلول', 'تشرين الأول', 'تشرين الثاني', 'كانون الأول'];
  const DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const HOUR = 3600e3, MIN = 60e3;

  // وقت بغداد (UTC+3 طول السنة) مخزون كأنه UTC حتى ما نعتمد على توقيت الشاشة
  const bNow = () => Date.now() + 3 * HOUR;
  const parseLocal = s => { const [d, t = '00:00'] = s.split('T'); const [y, m, dd] = d.split('-').map(Number); const [h, mi] = t.split(':').map(Number); return Date.UTC(y, m - 1, dd, h, mi); };
  const LTR = s => '\u2066' + s + '\u2069'; // الأرقام والوقت دائماً من اليسار لليمين
  const hm = ms => { const d = new Date(ms); const h = d.getUTCHours(); return `${LTR(ar(h % 12 || 12) + ':' + ar(String(d.getUTCMinutes()).padStart(2, '0')))} ${h < 12 ? 'ص' : 'م'}`; };
  const hLabel = ms => { const h = new Date(ms).getUTCHours(); return `${ar(h % 12 || 12)} ${h < 12 ? 'ص' : 'م'}`; };

  let hijriFmt = null;
  try { hijriFmt = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura-nu-arab', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }); } catch (e) { /* بعض المتصفحات القديمة */ }

  // ===== رموز الطقس (WMO) =====
  const COND = {
    0: ['صحو', 'clear'], 1: ['صحو غالباً', 'clear'], 2: ['غيوم متفرقة', 'partly'], 3: ['غائم', 'cloudy'],
    45: ['ضباب', 'fog'], 48: ['ضباب متجمّد', 'fog'],
    51: ['رذاذ خفيف', 'drizzle'], 53: ['رذاذ', 'drizzle'], 55: ['رذاذ كثيف', 'drizzle'], 56: ['رذاذ متجمّد', 'drizzle'], 57: ['رذاذ متجمّد', 'drizzle'],
    61: ['مطر خفيف', 'rain'], 63: ['مطر', 'rain'], 65: ['مطر غزير', 'rain'], 66: ['مطر متجمّد', 'rain'], 67: ['مطر متجمّد غزير', 'rain'],
    71: ['ثلج خفيف', 'snow'], 73: ['ثلج', 'snow'], 75: ['ثلج كثيف', 'snow'], 77: ['حبيبات ثلج', 'snow'],
    80: ['زخات مطر', 'rain'], 81: ['زخات مطر', 'rain'], 82: ['زخات مطر عنيفة', 'rain'], 85: ['زخات ثلج', 'snow'], 86: ['زخات ثلج', 'snow'],
    95: ['عاصفة رعدية', 'storm'], 96: ['عاصفة رعدية وبَرَد', 'storm'], 99: ['عاصفة رعدية وبَرَد', 'storm'],
  };
  const cond = c => COND[c] || COND[c < 50 ? 3 : 63];
  const iconFor = (code, isDay) => {
    const k = cond(code)[1];
    return k === 'clear' ? (isDay ? 'clear-day' : 'clear-night') : k === 'partly' ? (isDay ? 'partly-day' : 'partly-night') : k;
  };
  const WIND_DIRS = ['شمالية', 'شمالية شرقية', 'شرقية', 'جنوبية شرقية', 'جنوبية', 'جنوبية غربية', 'غربية', 'شمالية غربية'];
  const windName = d => WIND_DIRS[Math.round(((d % 360) + 360) % 360 / 45) % 8];
  const uvName = u => u < 3 ? 'منخفض' : u < 6 ? 'متوسط' : u < 8 ? 'مرتفع' : u < 11 ? 'مرتفع جداً' : 'شديد';
  const aqiName = a => a <= 50 ? 'جيد' : a <= 100 ? 'مقبول' : a <= 150 ? 'متوسط' : a <= 200 ? 'غير صحي' : a <= 300 ? 'سيئ جداً' : 'خطِر';

  // ===== جلب البيانات =====
  async function fetchWeather() {
    const q = `latitude=${CONFIG.lat}&longitude=${CONFIG.lon}&timezone=Asia%2FBaghdad`;
    const wxUrl = `https://api.open-meteo.com/v1/forecast?${q}&forecast_days=6` +
      '&current=temperature_2m,apparent_temperature,relative_humidity_2m,is_day,precipitation,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m,wind_gusts_10m' +
      '&hourly=temperature_2m,weather_code,precipitation_probability,is_day,uv_index' +
      '&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max,uv_index_max';
    const aqUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?${q}&current=us_aqi,pm10,dust`;
    const wx = await (await fetch(wxUrl)).json();
    let aq = null;
    try { aq = await (await fetch(aqUrl)).json(); } catch (e) { /* جودة الهواء اختيارية */ }
    if (!wx || !wx.current) throw new Error('bad data');
    return normalize(wx, aq);
  }

  function normalize(wx, aq) {
    const c = wx.current, h = wx.hourly, d = wx.daily;
    return {
      at: Date.now(),
      now: {
        temp: c.temperature_2m, feels: c.apparent_temperature, hum: c.relative_humidity_2m, code: c.weather_code,
        cloud: c.cloud_cover, precip: c.precipitation, wind: c.wind_speed_10m, windDir: c.wind_direction_10m, gust: c.wind_gusts_10m,
      },
      hours: h.time.map((t, i) => ({ t: parseLocal(t), temp: h.temperature_2m[i], code: h.weather_code[i], pop: h.precipitation_probability[i], isDay: h.is_day[i], uv: h.uv_index ? h.uv_index[i] : null })),
      days: d.time.map((t, i) => ({ t: parseLocal(t), code: d.weather_code[i], max: d.temperature_2m_max[i], min: d.temperature_2m_min[i], pop: d.precipitation_probability_max[i], sr: parseLocal(d.sunrise[i]), ss: parseLocal(d.sunset[i]), uv: d.uv_index_max[i] })),
      aqi: aq && aq.current ? aq.current.us_aqi : null,
      dust: aq && aq.current ? aq.current.dust : null,
      pm10: aq && aq.current ? aq.current.pm10 : null,
    };
  }

  // ===== حالات تجريبية =====
  const DEMOS = [
    ['صحو', { code: 0, temp: 27, cloud: 5, wind: 9, windDir: 315, hum: 30 }],
    ['ليل صافٍ', { code: 0, temp: 18, cloud: 0, wind: 6, windDir: 315, hum: 40, night: true }],
    ['غروب', { code: 1, temp: 24, cloud: 15, wind: 8, windDir: 300, hum: 35, dusk: true }],
    ['غيوم متفرقة', { code: 2, temp: 22, cloud: 45, wind: 12, windDir: 290, hum: 45 }],
    ['غائم', { code: 3, temp: 17, cloud: 95, wind: 14, windDir: 280, hum: 60 }],
    ['مطر', { code: 63, temp: 14, cloud: 100, precip: 3, wind: 16, windDir: 250, hum: 88 }],
    ['عاصفة رعدية', { code: 95, temp: 15, cloud: 100, precip: 8, wind: 30, windDir: 230, hum: 90 }],
    ['رياح قوية', { code: 1, temp: 21, cloud: 20, wind: 44, gust: 62, windDir: 300, hum: 25 }],
    ['عاصفة ترابية', { code: 3, temp: 33, cloud: 30, wind: 38, gust: 55, windDir: 300, hum: 15, dust: 900, aqi: 260 }],
    ['ضباب', { code: 45, temp: 9, cloud: 100, wind: 3, windDir: 90, hum: 98, morning: true }],
    ['حر شديد', { code: 0, temp: 49, cloud: 0, wind: 14, windDir: 315, hum: 9, aqi: 95 }],
    ['ليل ممطر', { code: 61, temp: 12, cloud: 100, precip: 1.2, wind: 10, windDir: 140, hum: 92, night: true }],
    ['ثلج', { code: 73, temp: -1, cloud: 100, wind: 8, windDir: 330, hum: 85 }],
  ];

  function demoData(i) {
    const [name, o] = DEMOS[i];
    const now = bNow();
    const day0 = Math.floor(now / (24 * HOUR)) * 24 * HOUR;
    // نرتب الشروق والغروب حتى يطلع المشهد نهار أو ليل أو غروب
    let sr = now - 5 * HOUR, ss = now + 5 * HOUR;
    if (o.night) { sr = now + 4 * HOUR; ss = now + 15 * HOUR; }
    if (o.dusk) { sr = now - 11 * HOUR; ss = now + 15 * MIN; }
    if (o.morning) { sr = now - 50 * MIN; ss = now + 10 * HOUR; }
    const isDay = now > sr && now < ss;
    const hours = [];
    const h0 = Math.floor(now / HOUR) * HOUR;
    for (let k = 0; k < 24; k++) {
      const t = h0 + k * HOUR;
      hours.push({ t, temp: o.temp + Math.sin(k / 4) * 2 - k * .2, code: k < 3 ? o.code : [o.code, 2, 1, 3][k % 4], pop: [61, 63, 95, 73].includes(o.code) ? 80 - k * 6 : k > 6 && k < 10 ? 30 : 0, isDay: (((t - sr) % (24 * HOUR)) + 24 * HOUR) % (24 * HOUR) < ss - sr ? 1 : 0, uv: isDay ? 6 : 0 });
    }
    const days = [];
    for (let k = 0; k < 6; k++) days.push({ t: day0 + k * 24 * HOUR, code: k ? [1, 2, 61, 0, 3][k - 1] : o.code, max: o.temp + 3 - k, min: o.temp - 8 + (k % 2), pop: k === 3 ? 60 : k ? 5 : 30, sr: sr + k * 24 * HOUR, ss: ss + k * 24 * HOUR, uv: 6 });
    return {
      demo: name, at: Date.now(),
      now: { temp: o.temp, feels: o.temp + (o.hum > 70 ? -2 : 2), hum: o.hum, code: o.code, cloud: o.cloud, precip: o.precip || 0, wind: o.wind, windDir: o.windDir, gust: o.gust || o.wind * 1.4 },
      hours, days, aqi: o.aqi || 48, dust: o.dust || 8, pm10: o.dust ? 1200 : 30,
    };
  }

  // ===== المشهد =====
  function sceneFrom(m, now) {
    const today = m.days.find(d => now >= d.t && now < d.t + 24 * HOUR) || m.days[0];
    const ti = m.days.indexOf(today);
    const sr = today.sr, ss = today.ss;
    const isDay = now >= sr && now < ss;
    let sunFrac, phase;
    if (isDay) sunFrac = (now - sr) / (ss - sr);
    else if (now >= ss) { const nsr = m.days[ti + 1] ? m.days[ti + 1].sr : sr + 24 * HOUR; sunFrac = (now - ss) / (nsr - ss); }
    else { const pss = ss - 24 * HOUR; sunFrac = (now - pss) / (sr - pss); }
    if (now > sr - 40 * MIN && now < sr + 35 * MIN) phase = 'dawn';
    else if (now > ss - 35 * MIN && now < ss + 40 * MIN) phase = 'dusk';
    else phase = isDay ? 'day' : 'night';

    const n = m.now, kind = cond(n.code)[1];
    let rain = 0;
    if (kind === 'drizzle') rain = .22;
    if (kind === 'rain') rain = Math.min(1, Math.max(.35, (n.precip || 0) / 6, [65, 67, 82].includes(n.code) ? .95 : 0));
    if (kind === 'storm') rain = Math.min(1, Math.max(.7, (n.precip || 0) / 6));
    const dustV = n.dust != null ? n.dust : m.dust;
    let dust = 0;
    if (dustV != null) dust = Math.max(0, Math.min(1, (dustV - 120) / 500));
    if (m.pm10 != null) dust = Math.max(dust, Math.min(1, (m.pm10 - 250) / 600));
    return {
      isDay, phase, sunFrac: Math.max(0, Math.min(1, sunFrac)), kind,
      cloud: Math.max(kind === 'cloudy' || rain ? .85 : 0, (n.cloud || 0) / 100),
      rain, wind: n.wind || 0, windDir: n.windDir || 300, dust,
      heat: Math.max(0, Math.min(1, (n.temp - 41) / 7)) * (isDay ? 1 : .3),
      moonPhase: moonPhase(Date.now()), sr, ss,
    };
  }

  function moonPhase(ms) {
    const ref = Date.UTC(2000, 0, 6, 18, 14);
    const syn = 29.530588853 * 24 * HOUR;
    return (((ms - ref) % syn) + syn) % syn / syn;
  }

  // ===== جملة ذكية =====
  function noteFor(m, s, now) {
    const n = m.now, k = s.kind;
    const upcoming = m.hours.filter(h => h.t > now && h.t <= now + 12 * HOUR);
    if (k === 'storm') return ['storm', 'عاصفة رعدية فوق المنطقة الآن'];
    if (k === 'rain' || k === 'drizzle') {
      const stop = upcoming.find(h => h.pop < 30);
      return ['rain', stop ? `المطر مستمر، ويخف تقريباً الساعة ${hLabel(stop.t)}` : 'المطر مستمر لساعات'];
    }
    if (s.dust > .25) return ['dust', 'غبار في الجو، الأفضل تسدّ الشبابيك'];
    if (n.temp >= 45) return ['heat', 'حر شديد، اشرب ماي هواية وتجنّب شمس الظهر'];
    const rainSoon = upcoming.find(h => h.pop >= 50);
    if (rainSoon) return ['rain', `احتمال مطر ${ar(rainSoon.pop)}٪ الساعة ${hLabel(rainSoon.t)}`];
    if ((n.gust || 0) >= 45 || n.wind >= 35) return ['wind', `رياح قوية تصل إلى ${ar(Math.round(Math.max(n.gust || 0, n.wind)))} كم/س`];
    if (k === 'fog') return ['fog', 'ضباب، الرؤية قليلة بالطرق'];
    const dir = ((n.windDir % 360) + 360) % 360;
    if (dir > 100 && dir < 170 && n.hum >= 50 && n.temp >= 24) return ['wind', 'هوا شرجي رطب'];
    const t0 = m.days.find(d => now >= d.t && now < d.t + 24 * HOUR), t1 = t0 && m.days[m.days.indexOf(t0) + 1];
    if (t0 && t1 && Math.abs(t1.max - t0.max) >= 3) {
      const dd = Math.round(Math.abs(t1.max - t0.max));
      return [t1.max < t0.max ? 'cloudy' : 'clear-day', `باچر ${t1.max < t0.max ? 'أبرد' : 'أدفأ'} بـ ${ar(dd)} درجات`];
    }
    if (s.isDay && s.ss - now < 2 * HOUR) return ['clear-day', `الشمس تغيب الساعة ${hm(s.ss)}`];
    if (!s.isDay && t1 && now > s.ss) return ['clear-night', `الشمس تشرق الساعة ${hm(t1.sr)}`];
    return null;
  }

  // ===== العرض =====
  let model = null, demoIdx = -1, lastOk = 0, failing = false;

  function renderWeather() {
    if (!model) return;
    const m = model, now = bNow(), n = m.now;
    const s = sceneFrom(m, now);
    Sky.set(s);

    $('temp').textContent = deg(n.temp);
    $('cond').textContent = s.dust > .25 ? 'غبار' : cond(n.code)[0];
    const today = m.days.find(d => now >= d.t && now < d.t + 24 * HOUR) || m.days[0];
    $('feels').textContent = `الإحساس ${deg(n.feels)} · العظمى ${deg(today.max)} · الصغرى ${deg(today.min)}`;
    let ic = iconFor(n.code, s.isDay);
    if (s.dust > .25) ic = 'dust';
    else if (s.heat > .4 && s.kind === 'clear') ic = 'heat';
    else if (n.wind >= 35 && (s.kind === 'clear' || s.kind === 'partly')) ic = 'wind';
    $('nowIcon').innerHTML = icon(ic);

    // الساعات القادمة
    const hi = Math.max(0, m.hours.findIndex(h => h.t > now - HOUR && h.t <= now));
    $('hours').innerHTML = m.hours.slice(hi, hi + 7).map((h, i) =>
      `<div><small>${i ? hLabel(h.t) : 'الآن'}</small><span class="ico">${icon(iconFor(h.code, h.isDay))}</span><b>${deg(i ? h.temp : n.temp)}</b><span class="p">${h.pop >= 20 ? ar(h.pop) + '٪' : ''}</span></div>`).join('');

    // الشروق والغروب
    $('sunrise').textContent = hm(s.sr);
    $('sunset').textContent = hm(s.ss);
    const len = Math.round((s.ss - s.sr) / MIN);
    $('daylen').textContent = `${ar(Math.floor(len / 60))} س ${ar(len % 60)} د`;
    const th = Math.PI * s.sunFrac, px = 150 + 130 * Math.cos(th), py = 108 - 96 * Math.sin(th);
    const sun = $('arcSun');
    sun.setAttribute('cx', px.toFixed(1)); sun.setAttribute('cy', py.toFixed(1));
    sun.setAttribute('fill', s.isDay ? '#ffcf7a' : '#e9e4d4');
    sun.setAttribute('r', s.isDay ? 7 : 5.5);
    $('arcDone').setAttribute('d', s.isDay ? `M280 108 A130 96 0 0 0 ${px.toFixed(1)} ${py.toFixed(1)} L${px.toFixed(1)} 108 Z` : '');

    // الأيام
    const di = Math.max(0, m.days.indexOf(today));
    const ds = m.days.slice(di, di + 4);
    const lo = Math.min(...ds.map(d => d.min)), hiT = Math.max(...ds.map(d => d.max)), span = Math.max(1, hiT - lo);
    $('days').innerHTML = ds.map((d, i) => {
      const name = i === 0 ? 'اليوم' : i === 1 ? 'باچر' : DAYS[new Date(d.t).getUTCDay()];
      const r = ((d.min - lo) / span * 100).toFixed(1), l = ((hiT - d.max) / span * 100).toFixed(1);
      return `<div class="day"><span class="n">${name}</span><span class="ico">${icon(iconFor(d.code, 1))}</span><span class="lo">${deg(d.min)}</span><span class="range"><i style="right:${r}%;left:${l}%"></i></span><span class="hi">${deg(d.max)}</span><span class="p">${d.pop >= 20 ? ar(d.pop) + '٪' : ''}</span></div>`;
    }).join('');

    // التفاصيل
    $('hum').textContent = ar(Math.round(n.hum)) + '٪';
    $('wind').textContent = `${ar(Math.round(n.wind))} كم/س`;
    $('windIco').innerHTML = icon('arrow');
    $('windIco').firstChild.style.transform = `rotate(${(n.windDir + 180) % 360}deg)`;
    $('windIco').title = windName(n.windDir);
    $('windIco').parentNode.querySelector('small').textContent = 'رياح ' + windName(n.windDir);
    const uvNow = m.hours[hi] && m.hours[hi].uv != null ? m.hours[hi].uv : (s.isDay ? today.uv : 0);
    $('uv').textContent = `${ar(Math.round(uvNow))} ${uvName(uvNow)}`;
    $('aqi').textContent = m.aqi != null ? `${ar(Math.round(m.aqi))} ${aqiName(m.aqi)}` : '—';

    // الملاحظة
    const note = noteFor(m, s, now);
    $('note').classList.toggle('empty', !note);
    if (note) { $('noteIcon').innerHTML = icon(note[0]); $('noteText').textContent = note[1]; }

    // الحالة
    if (m.demo) $('status').textContent = `تجربة: ${m.demo}`;
    else {
      const ago = Math.round((Date.now() - m.at) / MIN);
      const when = ago < 1 ? 'هسه' : `قبل ${ar(ago)} د`;
      $('status').textContent = failing ? `بدون إنترنت · آخر تحديث ${when}` : `آخر تحديث ${when} · Open-Meteo`;
    }
  }

  function tick() {
    const now = new Date(bNow());
    const h = now.getUTCHours(), mi = now.getUTCMinutes(), se = now.getUTCSeconds();
    $('clock').textContent = `${ar(h % 12 || 12)}:${ar(String(mi).padStart(2, '0'))}`;
    $('ampm').textContent = h < 12 ? 'صباحاً' : 'مساءً';
    $('secBar').style.width = ((se + 1) / 60 * 100).toFixed(2) + '%';
    $('date').textContent = `${DAYS[now.getUTCDay()]} ${ar(now.getUTCDate())} ${MONTHS[now.getUTCMonth()]} ${ar(now.getUTCFullYear())}`;
    if (hijriFmt) { try { $('hijri').textContent = hijriFmt.format(now); } catch (e) { /* تجاهل */ } }
    $('stage').classList.toggle('late', h >= 0 && h < 6);
    if (se === 0) renderWeather();
  }

  // ===== التحديث =====
  function loadCache() {
    try { const c = JSON.parse(localStorage.getItem('sama.v1')); if (c && Date.now() - c.at < 12 * HOUR) return c; } catch (e) { /* لا يوجد */ }
    return null;
  }
  function saveCache(m) { try { localStorage.setItem('sama.v1', JSON.stringify(m)); } catch (e) { /* لا يهم */ } }

  async function refresh() {
    if (demoIdx >= 0) return;
    try {
      const m = await fetchWeather();
      failing = false; lastOk = Date.now();
      if (demoIdx < 0) { model = m; saveCache(m); renderWeather(); }
      setTimeout(refresh, CONFIG.refreshMin * MIN);
    } catch (e) {
      failing = true;
      if (model) renderWeather();
      else $('status').textContent = 'جاري جلب الطقس…';
      setTimeout(refresh, 2 * MIN);
    }
  }

  function setDemo(i) {
    demoIdx = i;
    if (i < 0) { model = loadCache(); renderWeather(); refresh(); showHint('الطقس الحقيقي'); return; }
    model = demoData(i);
    renderWeather();
    showHint('تجربة: ' + DEMOS[i][0]);
  }

  let hintTimer = 0;
  function showHint(extra) {
    if (!APP_MODE) return;
    const h = $('hint');
    h.hidden = false;
    h.innerHTML = (extra ? `<b>${extra}</b> · ` : '') + '◀ ▶ لتجربة حالات الطقس · زر الوسط للطقس الحقيقي';
    clearTimeout(hintTimer);
    hintTimer = setTimeout(() => { h.hidden = true; }, 6000);
  }

  // حماية الشاشة من الاحتراق: تحريك بسيط كل دقيقة ونص
  function drift() {
    const x = (Math.random() * 2 - 1) * 1.1, y = (Math.random() * 2 - 1) * .9;
    $('ui').style.transform = `translate(${x.toFixed(2)}rem, ${y.toFixed(2)}rem)`;
  }
  $('ui').style.transition = 'transform 8s ease-in-out';

  // ===== البداية =====
  $('place').textContent = CONFIG.place;
  fillIcons();
  drawSkyline();

  const demoParam = params.get('demo');
  if (demoParam != null) {
    const i = isNaN(+demoParam) ? DEMOS.findIndex(d => d[0] === demoParam) : +demoParam;
    setDemo(Math.max(0, Math.min(DEMOS.length - 1, i)));
  } else {
    model = loadCache();
    if (model) renderWeather();
    refresh();
  }

  tick();
  setInterval(tick, 1000);
  setInterval(drift, 90e3);

  if (APP_MODE) {
    showHint();
    document.addEventListener('keydown', e => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') setDemo((demoIdx + 1) % DEMOS.length);
      else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') setDemo(demoIdx <= 0 ? DEMOS.length - 1 : demoIdx - 1);
      else if (e.key === 'Enter' || e.key === ' ') setDemo(-1);
      else return;
      e.preventDefault();
    });
  }

  window.Sama = { setDemo, DEMOS };
})();
