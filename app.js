const COLS = 32, ROWS = 16;
const SCALE = [0, 3, 5, 7, 10]; // минорная пентатоника: любой рисунок звучит красиво
const BASE = 50;                 // нижняя нота — D3

const $ = id => document.getElementById(id);
const gridEl = $('grid');
let grid = new Array(COLS * ROWS).fill(false);
const cells = [];

// ---------- сетка ----------

const rowColor = r => `hsl(${270 - r * 18}, 70%, 62%)`; // сверху фиолетовый, снизу красный

for (let r = 0; r < ROWS; r++) {
  for (let c = 0; c < COLS; c++) {
    const el = document.createElement('div');
    el.className = 'cell';
    el.dataset.i = r * COLS + c;
    el.style.setProperty('--c', rowColor(r));
    gridEl.appendChild(el);
    cells.push(el);
  }
}

function setCell(i, on) {
  grid[i] = on;
  cells[i].classList.toggle('on', on);
  if (on) { audio(); note(Math.floor(i / COLS), ctx.currentTime + 0.01, 0.8); }
}

function setGrid(g) {
  g.forEach((on, i) => { grid[i] = on; cells[i].classList.toggle('on', on); });
}

// рисование мышкой / пальцем: первая плитка решает — закрашиваем или стираем
let painting = null;
const cellAt = e => {
  const el = document.elementFromPoint(e.clientX, e.clientY);
  return el && el.classList.contains('cell') ? +el.dataset.i : -1;
};
gridEl.addEventListener('pointerdown', e => {
  const i = cellAt(e);
  if (i < 0) return;
  e.preventDefault();
  painting = !grid[i];
  setCell(i, painting);
});
window.addEventListener('pointermove', e => {
  if (painting === null) return;
  const i = cellAt(e);
  if (i >= 0 && grid[i] !== painting) setCell(i, painting);
});
window.addEventListener('pointerup', () => painting = null);
window.addEventListener('pointercancel', () => painting = null);

// ---------- звук ----------

let ctx, master;
function audio() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    const comp = ctx.createDynamicsCompressor();
    master = ctx.createGain();
    master.gain.value = 0.7;
    master.connect(comp).connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
}

function freq(r) {
  const i = ROWS - 1 - r; // верхний ряд — самая высокая нота
  const midi = BASE + 12 * Math.floor(i / 5) + SCALE[i % 5];
  return 440 * 2 ** ((midi - 69) / 12);
}

// обертоны: [множитель частоты, громкость, время затухания в секундах]
const SOUNDS = {
  handpan: { attack: 0.012, partials: [[1, 1, 2.2], [1.003, 0.4, 2], [2, 0.35, 1.2], [3, 0.1, 0.6]] },
  xylo:    { attack: 0.002, partials: [[1, 1, 0.6], [3, 0.25, 0.15], [6, 0.08, 0.05]] },
};

function note(r, t, vol = 1) {
  const s = SOUNDS[$('sound').value];
  const f = freq(r);
  for (const [mul, gain, decay] of s.partials) {
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.frequency.value = f * mul;
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(gain * vol * 0.3, t + s.attack);
    env.gain.exponentialRampToValueAtTime(0.0001, t + s.attack + decay);
    osc.connect(env).connect(master);
    osc.start(t);
    osc.stop(t + s.attack + decay + 0.05);
  }
}

// ---------- проигрывание ----------

let playing = false, runId = 0, step = 0, nextTime = 0, timer = null, headCol = -1;
const stepDur = () => 60 / +$('tempo').value / 2; // одна колонка = восьмая нота

function start() {
  audio();
  playing = true;
  step = 0;
  nextTime = ctx.currentTime + 0.05;
  $('play').textContent = '■ Стоп';
  timer = setInterval(schedule, 25);
  schedule();
}

function stop() {
  playing = false;
  runId++;
  clearInterval(timer);
  showHead(-1);
  $('play').textContent = '▶ Играть';
}

// ноты планируются чуть заранее — так ритм не «плывёт»
function schedule() {
  const id = runId;
  while (nextTime < ctx.currentTime + 0.1) {
    const c = step, t = nextTime;
    const rows = [];
    for (let r = 0; r < ROWS; r++) if (grid[r * COLS + c]) rows.push(r);
    rows.forEach(r => note(r, t, 1 / Math.sqrt(rows.length)));
    setTimeout(() => id === runId && showHead(c), (t - ctx.currentTime) * 1000);
    nextTime += stepDur();
    step = (step + 1) % COLS;
  }
}

function showHead(c) {
  for (let r = 0; r < ROWS; r++) {
    if (headCol >= 0) cells[r * COLS + headCol].classList.remove('head');
    if (c >= 0) cells[r * COLS + c].classList.add('head');
  }
  headCol = c;
}

// ---------- кнопки ----------

$('play').onclick = () => playing ? stop() : start();
$('clear').onclick = () => setGrid(grid.map(() => false));
$('tempo').oninput = e => $('bpm').textContent = e.target.value;
window.addEventListener('keydown', e => {
  if (e.code === 'Space' && !['INPUT', 'SELECT', 'BUTTON'].includes(e.target.tagName)) {
    e.preventDefault();
    playing ? stop() : start();
  }
});

// ---------- шаблоны и ссылки ----------

const STORE = 'paint-a-tune-templates';

// рисунок → короткая строка для ссылки (1 бит на плитку)
function encode(g) {
  let s = '';
  for (let i = 0; i < g.length; i += 8) {
    let b = 0;
    for (let j = 0; j < 8; j++) if (g[i + j]) b |= 1 << j;
    s += String.fromCharCode(b);
  }
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decode(code) {
  try {
    const s = atob(code.replace(/-/g, '+').replace(/_/g, '/'));
    if (s.length !== COLS * ROWS / 8) return null;
    return grid.map((_, i) => (s.charCodeAt(i >> 3) >> (i & 7) & 1) === 1);
  } catch { return null; }
}

function fromArt(lines) { // рисунок из строк, по центру сетки
  const g = new Array(COLS * ROWS).fill(false);
  const ox = (COLS - lines[0].length) >> 1, oy = (ROWS - lines.length) >> 1;
  lines.forEach((line, r) => [...line].forEach((ch, c) => {
    if (ch === '#') g[(r + oy) * COLS + c + ox] = true;
  }));
  return g;
}

function fromLine(rowOf) { // по одной ноте в каждой колонке
  const g = new Array(COLS * ROWS).fill(false);
  for (let c = 0; c < COLS; c++) g[rowOf(c) * COLS + c] = true;
  return g;
}

const EXAMPLES = [
  ['UR CUTE', fromArt([
    '....#.#.##.....',
    '....#.#.#.#....',
    '....#.#.##.....',
    '....#.#.#.#....',
    '....###.#.#....',
    '...............',
    '...............',
    '###.#.#.###.###',
    '#...#.#..#..#..',
    '#...#.#..#..##.',
    '#...#.#..#..#..',
    '###.###..#..###',
  ])],
  ['Сердечко', fromArt([
    '..###.....###..',
    '.#...#...#...#.',
    '#.....#.#.....#',
    '#......#......#',
    '#.............#',
    '.#...........#.',
    '..#.........#..',
    '...#.......#...',
    '....#.....#....',
    '.....#...#.....',
    '......#.#......',
    '.......#.......',
  ])],
  ['Смайлик', fromArt([
    '...#####...',
    '.##.....##.',
    '.#.......#.',
    '#..#...#..#',
    '#..#...#..#',
    '#.........#',
    '#.#.....#.#',
    '#..#####..#',
    '.#.......#.',
    '.##.....##.',
    '...#####...',
  ])],
  ['Волна', fromLine(c => Math.round(7.5 - 6.5 * Math.sin(c / COLS * Math.PI * 4)))],
  ['Лесенка', fromLine(c => 15 - c % 16)],
].map(([name, g]) => ({ name, code: encode(g) }));

let mine = [];
try { mine = JSON.parse(localStorage.getItem(STORE)) || []; } catch {}
const persist = () => { try { localStorage.setItem(STORE, JSON.stringify(mine)); } catch {} };

let msgTimer;
function say(text) {
  $('msg').textContent = text;
  clearTimeout(msgTimer);
  msgTimer = setTimeout(() => $('msg').textContent = '', 3500);
}

function preview(g) {
  const cv = document.createElement('canvas');
  cv.width = COLS;
  cv.height = ROWS;
  const pc = cv.getContext('2d');
  g.forEach((on, i) => {
    if (!on) return;
    const r = Math.floor(i / COLS);
    pc.fillStyle = rowColor(r);
    pc.fillRect(i % COLS, r, 1, 1);
  });
  return cv;
}

function renderList() {
  const list = $('list');
  list.innerHTML = '';
  const add = (t, idx) => {
    const g = decode(t.code);
    if (!g) return;
    const li = document.createElement('li');
    li.className = 'item';
    const name = document.createElement('span');
    name.textContent = t.name;
    li.append(preview(g), name);
    li.onclick = () => { setGrid(g); $('name').value = t.name.replace(/^💌 /, ''); };
    if (idx !== undefined) { // свои шаблоны можно удалять, примеры — нет
      const del = document.createElement('button');
      del.className = 'del';
      del.textContent = '✕';
      del.title = 'Удалить';
      del.onclick = e => { e.stopPropagation(); mine.splice(idx, 1); persist(); renderList(); };
      li.append(del);
    }
    list.append(li);
  };
  mine.forEach(add);
  const title = document.createElement('li');
  title.className = 'title';
  title.textContent = 'Примеры';
  list.append(title);
  EXAMPLES.forEach(t => add(t));
}

const isEmpty = () => !grid.some(Boolean);

$('save').onclick = () => {
  if (isEmpty()) return say('Сначала нарисуй что-нибудь 🙂');
  const name = $('name').value.trim() || 'Без названия';
  mine = mine.filter(t => t.name !== name);
  mine.unshift({ name, code: encode(grid) });
  persist();
  renderList();
  say('Сохранено ✓');
};

$('share').onclick = () => {
  if (isEmpty()) return say('Сначала нарисуй что-нибудь 🙂');
  const name = $('name').value.trim() || 'Без названия';
  const url = location.href.split('#')[0] + '#n=' + encodeURIComponent(name) + '&g=' + encode(grid);
  const copied = navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject();
  copied.then(() => say('Ссылка скопирована — отправь её 💌'), () => prompt('Скопируй ссылку:', url));
};

// открыли ссылку от друга → показываем рисунок и кладём его в «Шаблоны»
function openShared() {
  const p = new URLSearchParams(location.hash.slice(1));
  const g = p.get('g') && decode(p.get('g'));
  if (!g) return;
  const code = encode(g);
  if (!mine.some(t => t.code === code)) {
    mine.unshift({ name: '💌 ' + (p.get('n') || 'Без названия').slice(0, 30), code });
    persist();
  }
  setGrid(g);
  renderList();
  history.replaceState(null, '', location.pathname + location.search);
  say('Тебе прислали мелодию — жми ▶');
}
window.addEventListener('hashchange', openShared);

renderList();
openShared();
if (isEmpty()) setGrid(decode(EXAMPLES[0].code));
