// Письмо мишке: стих из защищённой базы на 3D-листе + летящие объёмные фонарики
const { t, store } = App;

App.addText({
  zh: { pageTitle: '给小熊的信 · 小小紫禁城', eyebrow: '一封写给你的信', noLetter: '信还在路上……', sign: '—— 永远爱你的 {name}' },
  en: { pageTitle: 'A letter for my little bear · Our Little Palace', eyebrow: 'A letter written for you', noLetter: 'The letter is still on its way…', sign: '— Forever yours, {name}' },
});
App.translate();
document.title = t('pageTitle');

const $ = id => document.getElementById(id);
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- письмо: текст хранится в базе под паролем, не в коде ----------

let shown = '';
store.on(data => {
  const letter = Object.values(data.letters || {}).sort((a, b) => (b.at || 0) - (a.at || 0))[0];
  const key = letter ? (letter.at || 0) + ':' + String(letter.text || '').length : '';
  if (key === shown) return;
  shown = key;
  $('lEmpty').hidden = !!letter;
  $('lTitle').textContent = letter ? String(letter.title || '') : '';
  $('lSign').textContent = letter ? t('sign').replace('{name}', App.names[letter.from] || App.names.a) : '';
  const lines = letter ? String(letter.text || '').split('\n').map(s => s.trim()).filter(Boolean) : [];
  const body = $('lBody');
  body.replaceChildren();
  for (let i = 0; i < lines.length; i += 2) { // строки стиха идут парами
    const stanza = document.createElement('p');
    stanza.className = 'stanza';
    lines.slice(i, i + 2).forEach((text, j) => {
      const line = document.createElement('span');
      line.className = 'line';
      line.style.setProperty('--i', i + j);
      line.textContent = text;
      stanza.append(line);
    });
    body.append(stanza);
  }
});

// лист чуть поворачивается за курсором — так видна глубина
if (!reduce) {
  addEventListener('pointermove', e => {
    const x = e.clientX / innerWidth - 0.5, y = e.clientY / innerHeight - 0.5;
    $('letter').style.setProperty('--ry', (x * 10).toFixed(2) + 'deg');
    $('letter').style.setProperty('--rx', (-y * 8).toFixed(2) + 'deg');
  }, { passive: true });
}

// ---------- фонарики: дальние маленькие и тусклые, ближние большие и яркие, каждый вращается ----------

const cv = $('lanterns'), cx = cv.getContext('2d');
let W = 0, H = 0, lanterns = [], stars = [];

function spawn(anywhere) {
  const z = Math.random() ** 1.4;
  return {
    x: Math.random() * W,
    y: anywhere ? Math.random() * H : H + 120,
    z,
    s: 16 + z * z * 70, // размер
    vy: 5 + z * 18, // пикселей в секунду — плывут медленно
    phase: Math.random() * Math.PI * 2, // поворот вокруг своей оси
    spin: (0.25 + Math.random() * 0.35) * (Math.random() < 0.5 ? -1 : 1),
    sway: Math.random() * Math.PI * 2,
  };
}

function resize() {
  const dpr = Math.min(2, devicePixelRatio || 1);
  W = innerWidth;
  H = innerHeight;
  cv.width = W * dpr;
  cv.height = H * dpr;
  cx.setTransform(dpr, 0, 0, dpr, 0, 0);
  lanterns = Array.from({ length: Math.round(Math.min(24, Math.max(10, W / 70))) }, () => spawn(true));
  stars = Array.from({ length: Math.round(W * H / 9000) }, () => ({
    x: Math.random() * W, y: Math.random() * H * 0.8, r: Math.random() * 1.3 + 0.3, p: Math.random() * 6,
  }));
}

function drawLantern(L, x, y) {
  const s = L.s, rx = s * 0.5, ry = s * 0.42, a = 0.35 + 0.65 * L.z;
  cx.globalAlpha = a;

  const glow = cx.createRadialGradient(x, y, 0, x, y, s * 1.6); // свет вокруг
  glow.addColorStop(0, 'rgba(255,150,70,.45)');
  glow.addColorStop(1, 'rgba(255,120,50,0)');
  cx.fillStyle = glow;
  cx.beginPath();
  cx.arc(x, y, s * 1.6, 0, Math.PI * 2);
  cx.fill();

  cx.strokeStyle = 'rgba(230,180,80,.7)'; // шнурок
  cx.lineWidth = Math.max(1, s * 0.02);
  cx.beginPath();
  cx.moveTo(x, y - ry - s * 0.1);
  cx.lineTo(x, y - ry - s * 0.4);
  cx.stroke();

  const body = cx.createRadialGradient(x - rx * 0.3, y - ry * 0.35, s * 0.05, x, y, rx * 1.1);
  body.addColorStop(0, '#ffd08a');
  body.addColorStop(0.35, '#f0463a');
  body.addColorStop(0.8, '#c41f2c');
  body.addColorStop(1, '#7d0e1b');
  cx.fillStyle = body;
  cx.beginPath();
  cx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  cx.fill();

  // рёбра каркаса: видимые спереди, сдвигаются по кругу — так фонарик «вращается»
  cx.lineWidth = Math.max(0.8, s * 0.022);
  for (let k = 0; k < 8; k++) {
    const ang = L.phase + (k * Math.PI) / 4;
    if (Math.sin(ang) <= 0) continue;
    const c = Math.cos(ang);
    cx.strokeStyle = `rgba(110,10,20,${0.25 + 0.35 * Math.sin(ang)})`;
    cx.beginPath();
    cx.ellipse(x, y, Math.abs(c) * rx + 0.01, ry, 0, -Math.PI / 2, Math.PI / 2, c < 0);
    cx.stroke();
  }

  cx.fillStyle = '#e7b54a'; // золотые крышки
  cx.fillRect(x - rx * 0.42, y - ry - s * 0.09, rx * 0.84, s * 0.11);
  cx.fillRect(x - rx * 0.42, y + ry - s * 0.02, rx * 0.84, s * 0.11);

  const swing = Math.sin(L.sway * 1.3) * s * 0.06; // кисточка
  cx.strokeStyle = '#d8323a';
  cx.lineWidth = Math.max(1, s * 0.035);
  cx.beginPath();
  cx.moveTo(x, y + ry + s * 0.09);
  cx.quadraticCurveTo(x + swing * 0.5, y + ry + s * 0.3, x + swing, y + ry + s * 0.52);
  cx.stroke();
  cx.globalAlpha = 1;
}

let mx = 0, my = 0, tx = 0, ty = 0, last = performance.now(), raf = 0, clock = 0;
addEventListener('pointermove', e => { tx = e.clientX / W - 0.5; ty = e.clientY / H - 0.5; }, { passive: true });

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  clock += dt;
  mx += (tx - mx) * 0.03;
  my += (ty - my) * 0.03;
  cx.clearRect(0, 0, W, H);

  for (const st of stars) { // тихо мерцающие звёзды
    cx.globalAlpha = 0.35 + 0.35 * Math.sin(clock * 1.2 + st.p);
    cx.fillStyle = '#fff4dc';
    cx.beginPath();
    cx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
    cx.fill();
  }
  cx.globalAlpha = 1;

  lanterns.sort((a, b) => a.z - b.z); // сначала дальние
  for (const L of lanterns) {
    L.y -= L.vy * dt;
    L.phase += L.spin * dt;
    L.sway += dt * 0.5;
    if (L.y < -L.s * 1.5) Object.assign(L, spawn(false));
    const x = L.x + Math.sin(L.sway) * 18 * (0.3 + L.z) - mx * 60 * L.z;
    const y = L.y - my * 30 * L.z;
    drawLantern(L, x, y);
  }
  if (!reduce && !document.hidden) raf = requestAnimationFrame(frame);
}

document.addEventListener('visibilitychange', () => {
  if (!document.hidden && !reduce) { cancelAnimationFrame(raf); last = performance.now(); raf = requestAnimationFrame(frame); }
});
let resizeTimer;
addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => { resize(); if (reduce) frame(performance.now()); }, 150);
});

resize();
raf = requestAnimationFrame(frame);
