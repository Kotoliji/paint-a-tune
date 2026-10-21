// Тир-лист интересов: каждый раскладывает карточки по 5 уровням и жмёт «配对»
const { t, store } = App;

// [id, эмодзи, 中文, English]
const ACTS = [
  ['camping', '⛺', '露营', 'Camping'], ['travel', '✈️', '旅行', 'Travel'],
  ['tea', '🍵', '茶道', 'Tea ceremony'], ['pottery', '🏺', '陶艺', 'Pottery'],
  ['hiking', '🥾', '徒步', 'Hiking'], ['cooking', '🍳', '一起做饭', 'Cooking together'],
  ['movies', '🎬', '电影之夜', 'Movie night'], ['karaoke', '🎤', 'KTV', 'Karaoke'],
  ['museum', '🏛️', '博物馆', 'Museums'], ['beach', '🏖️', '海边', 'Beach'],
  ['boardgames', '🎲', '桌游', 'Board games'], ['videogames', '🎮', '电子游戏', 'Video games'],
  ['photo', '📷', '摄影', 'Photography'], ['picnic', '🧺', '野餐', 'Picnic'],
  ['cycling', '🚲', '骑行', 'Cycling'], ['swimming', '🏊', '游泳', 'Swimming'],
  ['dancing', '💃', '跳舞', 'Dancing'], ['concerts', '🎶', '演唱会', 'Concerts'],
  ['painting', '🎨', '画画', 'Painting'], ['reading', '📚', '一起看书', 'Reading together'],
  ['calligraphy', '🖌️', '书法', 'Calligraphy'], ['spa', '💆', '按摩 SPA', 'Spa & massage'],
  ['themepark', '🎢', '游乐园', 'Theme park'], ['skiing', '⛷️', '滑雪', 'Skiing'],
  ['stars', '🌌', '看星星', 'Stargazing'], ['baking', '🧁', '烘焙', 'Baking'],
  ['yoga', '🧘', '瑜伽', 'Yoga'], ['nightmarket', '🍢', '夜市小吃', 'Night market food'],
  ['shopping', '🛍️', '逛街', 'Shopping'], ['roadtrip', '🚗', '自驾游', 'Road trip'],
];
const TIERS = [ // фон, цвет текста
  ['#e0474c', '#fff'], ['#f0884a', '#fff'], ['#f2c94c', '#2b2320'], ['#7bc47f', '#fff'], ['#8a94a6', '#fff'],
];

App.addText({
  zh: {
    pageTitle: '兴趣榜 · 小小紫禁城', tierTitle: '兴趣榜',
    rules: '规则：把所有卡片拖到对应的等级里，然后点「配对」。',
    t0: '超爱！', t1: '喜欢', t2: '无所谓', t3: '你想的话', t4: '不要！',
    match: '💞 配对', showOther: '👀 看 {name} 的', hideOther: '收起 {name} 的',
    listOf: '{name} 的榜单', pool: '待选卡片：{n}', addPh: '添加自己的卡片',
    left: '还有 {n} 张卡片没放好哦', notStarted: '{name} 还没开始排～', theirPool: '{name} 还有 {n} 张没放',
    matchSub: '完美！你们简直是天生一对 💕', yay: '好耶！', del: '删除',
  },
  en: {
    pageTitle: 'Tier list · Our Little Palace', tierTitle: 'Interest tier list',
    rules: 'Rules: drag every card into a tier, then press Match.',
    t0: 'LOVE IT!', t1: 'Like it', t2: "Don't mind", t3: 'If you want', t4: 'NO!',
    match: '💞 Match', showOther: "👀 See {name}'s", hideOther: "Hide {name}'s",
    listOf: "{name}'s list", pool: 'Cards to place: {n}', addPh: 'Add your own card',
    left: '{n} cards left to place', notStarted: "{name} hasn't started yet", theirPool: '{name} has {n} cards left',
    matchSub: 'Perfect! You two are made for each other 💕', yay: 'Yay!', del: 'Delete',
  },
});
App.translate();
document.title = t('pageTitle');

const $ = id => document.getElementById(id);
const fill = (key, vars) => t(key).replace(/\{(\w+)\}/g, (_, k) => vars[k]);
const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};
const me = App.me, other = App.other;
let data = {};

// ---------- карточки человека ----------

function cardsOf(p) {
  const mine = data.tiers?.[p] || {};
  const builtin = ACTS.map(([id, emoji, zh, en]) => ({ id, emoji, name: App.lang === 'zh' ? zh : en }));
  const custom = Object.entries(mine.custom || {})
    .sort((a, b) => (a[1].at || 0) - (b[1].at || 0))
    .map(([id, c]) => ({ id, emoji: '⭐', name: String(c.name || '').slice(0, 24), custom: true }));
  const placed = mine.placed || {};
  return [...builtin, ...custom].map(c => {
    const pl = placed[c.id];
    const tier = pl && Number.isInteger(pl.t) && pl.t >= 0 && pl.t < 5 ? pl.t : null;
    return { ...c, tier, at: pl?.at || 0 };
  });
}

function cardEl(c, editable) {
  const e = el('div', 'card');
  e.dataset.id = c.id;
  e.append(el('span', null, c.emoji), el('span', null, c.name));
  if (editable && c.custom) {
    const x = el('button', 'x', '✕');
    x.type = 'button';
    x.title = t('del');
    x.onclick = () => {
      store.set(`tiers/${me}/custom/${c.id}`, null);
      store.set(`tiers/${me}/placed/${c.id}`, null);
    };
    e.append(x);
  }
  return e;
}

function tiersEl(cards, editable) {
  const wrap = document.createDocumentFragment();
  TIERS.forEach(([bg, fg], i) => {
    const row = el('div', 'tier');
    const label = el('div', 'tier-label', t('t' + i));
    label.style.setProperty('--tc', bg);
    label.style.setProperty('--tt', fg);
    const drop = el('div', 'drop');
    drop.dataset.tier = i;
    cards.filter(c => c.tier === i).sort((a, b) => a.at - b.at).forEach(c => drop.append(cardEl(c, editable)));
    row.append(label, drop);
    wrap.append(row);
  });
  return wrap;
}

// ---------- отрисовка ----------

let showOther = false;
try { showOther = localStorage.getItem('courtyard-show-other') === '1'; } catch {}

function render() {
  const mine = cardsOf(me);
  $('mineTitle').textContent = fill('listOf', { name: App.names[me] });
  $('mineTiers').replaceChildren(tiersEl(mine, true));
  const pool = mine.filter(c => c.tier === null);
  $('pool').replaceChildren(...pool.map(c => cardEl(c, true)));
  $('poolTitle').textContent = fill('pool', { n: pool.length });

  $('toggle').textContent = fill(showOther ? 'hideOther' : 'showOther', { name: App.names[other] });
  $('theirs').hidden = !showOther;
  $('boards').classList.toggle('two', showOther);
  if (showOther) {
    const theirs = cardsOf(other);
    const left = theirs.filter(c => c.tier === null).length;
    $('theirTitle').textContent = fill('listOf', { name: App.names[other] });
    $('theirTiers').replaceChildren(tiersEl(theirs, false));
    $('theirNote').textContent = left === theirs.length
      ? fill('notStarted', { name: App.names[other] })
      : left ? fill('theirPool', { name: App.names[other], n: left }) : '';
  }
}

$('toggle').onclick = () => {
  showOther = !showOther;
  try { localStorage.setItem('courtyard-show-other', showOther ? '1' : '0'); } catch {}
  render();
};

// ---------- перетаскивание (мышь и палец) ----------

let drag = null, pending = false;

$('mine').addEventListener('pointerdown', e => {
  const card = e.target.closest('.card');
  if (!card || e.target.closest('button') || e.button > 0) return;
  e.preventDefault();
  const r = card.getBoundingClientRect();
  const ghost = card.cloneNode(true);
  ghost.classList.add('ghost');
  ghost.style.width = r.width + 'px';
  document.body.append(ghost);
  card.classList.add('dragging');
  drag = { id: card.dataset.id, card, ghost, dx: e.clientX - r.left, dy: e.clientY - r.top, over: null };
  moveDrag(e);
});

function zoneAt(x, y) {
  return document.elementFromPoint(x, y)?.closest('#mine .drop') || null;
}

function moveDrag(e) {
  drag.ghost.style.transform = `translate(${e.clientX - drag.dx}px, ${e.clientY - drag.dy}px)`;
  const zone = zoneAt(e.clientX, e.clientY);
  if (zone !== drag.over) {
    drag.over?.classList.remove('over');
    zone?.classList.add('over');
    drag.over = zone;
  }
}

window.addEventListener('pointermove', e => { if (drag) moveDrag(e); });

function endDrag(e, cancel) {
  if (!drag) return;
  const { id, card, ghost, over } = drag;
  ghost.remove();
  card.classList.remove('dragging');
  over?.classList.remove('over');
  drag = null;
  const zone = cancel ? null : zoneAt(e.clientX, e.clientY);
  if (zone) {
    const tier = zone.dataset.tier === '' ? null : +zone.dataset.tier;
    store.set(`tiers/${me}/placed/${id}`, tier === null ? null : { t: tier, at: Date.now() });
  }
  if (pending) { pending = false; render(); }
}
window.addEventListener('pointerup', e => endDrag(e, false));
window.addEventListener('pointercancel', e => endDrag(e, true));

// ---------- свои карточки ----------

$('addForm').onsubmit = e => {
  e.preventDefault();
  const name = $('newCard').value.trim();
  if (!name) return;
  $('newCard').value = '';
  store.set(`tiers/${me}/custom/c${App.newId()}`, { name, at: Date.now() });
};

// ---------- MATCH ----------

let toastTimer;
function toast(text) {
  $('toast').textContent = text;
  $('toast').hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { $('toast').hidden = true; }, 2600);
}

$('match').onclick = () => {
  const left = cardsOf(me).filter(c => c.tier === null).length;
  if (left) return toast(fill('left', { n: left }));
  $('matchModal').hidden = false; // результат всегда идеальный 💞
  store.set(`tiers/${me}/matchedAt`, Date.now());
};
const closeMatch = () => { $('matchModal').hidden = true; };
$('yay').onclick = closeMatch;
$('matchModal').onclick = e => { if (e.target === $('matchModal')) closeMatch(); };
window.addEventListener('keydown', e => { if (e.key === 'Escape') closeMatch(); });

// ---------- старт ----------

store.on(d => {
  data = d;
  if (drag) pending = true; // не ломаем карточку под пальцем — дорисуем после
  else render();
});
