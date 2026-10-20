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
