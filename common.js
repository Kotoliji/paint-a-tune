// Общее для всех страниц: язык, «кто я», хранилище и верхнее меню
const App = (() => {
  const CFG = window.CONFIG || {};
  const read = k => { try { return localStorage.getItem(k); } catch { return null; } };
  const write = (k, v) => { try { localStorage.setItem(k, v); } catch {} };
  const clone = v => JSON.parse(JSON.stringify(v));

  // ---------- язык (китайский по умолчанию) ----------
  const LANG_KEY = 'paint-a-tune-lang';
  const lang = read(LANG_KEY) === 'en' ? 'en' : 'zh';
  const dict = {
    zh: {
      brand: '我们的小院', navNotes: '便签墙', navTier: '兴趣榜', navPaint: '画旋律',
      whoAmI: '你是谁？', whoHint: '选一次就好，这台设备会记住。',
      synced: '☁ 已同步', local: '💾 只存在这台设备',
    },
    en: {
      brand: 'Our Courtyard', navNotes: 'Notes', navTier: 'Tier list', navPaint: 'Paint a tune',
      whoAmI: 'Who are you?', whoHint: 'Pick once, this device will remember.',
      synced: '☁ Synced', local: '💾 This device only',
    },
  };
  const t = key => dict[lang][key] ?? key;
  const addText = d => { Object.assign(dict.zh, d.zh); Object.assign(dict.en, d.en); };
  function translate(root = document) {
    root.querySelectorAll('[data-i18n]').forEach(el => el.textContent = t(el.dataset.i18n));
    root.querySelectorAll('[data-i18n-ph]').forEach(el => el.placeholder = t(el.dataset.i18nPh));
  }

  // ---------- кто я: a или b ----------
  const ME_KEY = 'courtyard-me';
  const names = Object.assign({ a: 'A', b: 'B' }, CFG.names);
  let me = read(ME_KEY);
  if (me !== 'a' && me !== 'b') me = null;

  // ---------- хранилище: Firebase, если настроен, иначе браузер ----------
  let data = {}, loaded = false, synced = false;
  const subs = [];
  const emit = () => { loaded = true; subs.forEach(fn => fn(data)); };

  function localStore() {
    const KEY = 'courtyard-data';
    const load = () => { try { data = JSON.parse(read(KEY)) || {}; } catch { data = {}; } };
    const save = () => { write(KEY, JSON.stringify(data)); emit(); };
    const put = (path, value) => {
      const keys = path.split('/'), last = keys.pop();
      let o = data;
      for (const k of keys) {
        if (!o[k] || typeof o[k] !== 'object') {
          if (value === null) return;
          o[k] = {};
        }
        o = o[k];
      }
      if (value === null) delete o[last]; else o[last] = clone(value);
    };
    load();
    window.addEventListener('storage', e => { if (e.key === KEY) { load(); emit(); } }); // другие вкладки
    emit();
    return {
      set(path, value) { put(path, value); save(); },
      update(path, obj) { for (const [k, v] of Object.entries(obj)) put(path + '/' + k, v); save(); },
    };
  }

  const script = src => new Promise((ok, fail) => {
    const s = document.createElement('script');
    s.src = src; s.onload = ok; s.onerror = fail;
    document.head.append(s);
  });

  async function firebaseStore() {
    const base = 'https://www.gstatic.com/firebasejs/10.14.1/';
    await script(base + 'firebase-app-compat.js');
    await script(base + 'firebase-database-compat.js');
    firebase.initializeApp(CFG.firebase);
    const db = firebase.database();
    await Promise.race([
      new Promise((ok, fail) => db.ref('/').on('value', s => { data = s.val() || {}; ok(); emit(); }, fail)),
      new Promise((_, fail) => setTimeout(() => fail(new Error('timeout')), 10000)),
    ]);
    synced = true;
    return {
      set: (path, value) => db.ref(path).set(value),
      update: (path, obj) => db.ref(path).update(obj),
    };
  }

  const ready = CFG.firebase && CFG.firebase.databaseURL
    ? firebaseStore().catch(err => { console.warn('Firebase недоступен, работаем локально', err); return localStore(); })
    : Promise.resolve().then(localStore);

  const store = {
    on(fn) { subs.push(fn); if (loaded) fn(data); },
    set: (path, value) => ready.then(s => s.set(path, value)),
    update: (path, obj) => ready.then(s => s.update(path, obj)),
  };

  const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  // ---------- верхнее меню ----------
  function nav() {
    const page = document.body.dataset.page;
    const links = [['notes', 'index.html', 'navNotes'], ['tier', 'tier.html', 'navTier'], ['paint', 'paint.html', 'navPaint']];
    const el = document.createElement('nav');
    el.className = 'topnav';
    el.innerHTML = `
      <a class="brand" href="index.html">${t('brand')}</a>
      <div class="links">${links.map(([p, href, k]) =>
        `<a href="${href}"${p === page ? ' class="active"' : ''}>${t(k)}</a>`).join('')}</div>
      <div class="tools">
        <span class="sync" id="sync"></span>
        <button type="button" id="who"></button>
        <button type="button" id="langBtn">${lang === 'zh' ? 'EN' : '中文'}</button>
      </div>`;
    document.body.prepend(el);
    const who = el.querySelector('#who');
    who.textContent = me ? '🙂 ' + names[me] : t('whoAmI');
    who.onclick = pickMe;
    el.querySelector('#langBtn').onclick = () => { write(LANG_KEY, lang === 'zh' ? 'en' : 'zh'); location.reload(); };
    ready.then(() => { el.querySelector('#sync').textContent = synced ? t('synced') : t('local'); });
  }

  function pickMe() {
    const m = document.createElement('div');
    m.className = 'who-modal';
    m.innerHTML = `<div class="who-card"><h2>${t('whoAmI')}</h2><p>${t('whoHint')}</p><div class="who-btns"></div></div>`;
    for (const id of ['a', 'b']) {
      const b = document.createElement('button');
      b.textContent = names[id];
      b.className = id === me ? 'on' : '';
      b.onclick = () => { write(ME_KEY, id); location.reload(); };
      m.querySelector('.who-btns').append(b);
    }
    if (me) m.onclick = e => { if (e.target === m) m.remove(); };
    document.body.append(m);
  }

  document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
  nav();
  if (!me) pickMe();

  return {
    t, addText, translate, lang, names, store, newId,
    get me() { return me || 'a'; },
    get other() { return (me || 'a') === 'a' ? 'b' : 'a'; },
  };
})();
