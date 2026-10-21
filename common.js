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
      brand: '小小紫禁城', navNotes: '便签墙', navTier: '兴趣榜', navPaint: '画旋律',
      whoAmI: '你是谁？', whoHint: '选一次就好，这台设备会记住。',
      synced: '☁ 已同步', local: '💾 只存在这台设备',
      gateTitle: '请输入密码', gateHint: '这是一个私密的小院，只有知道密码的人才能进来。',
      gatePh: '密码', gateBtn: '进入', gateWrong: '密码不对，再试一次', gateError: '连不上服务器，请检查网络',
      logout: '退出这台设备', photos: '🖼 换背景照片（最多 4 张）', photosBusy: '上传中……',
    },
    en: {
      brand: 'Our Little Palace', navNotes: 'Notes', navTier: 'Tier list', navPaint: 'Paint a tune',
      whoAmI: 'Who are you?', whoHint: 'Pick once, this device will remember.',
      synced: '☁ Synced', local: '💾 This device only',
      gateTitle: 'Enter the password', gateHint: 'This is a private courtyard. Only people with the password can come in.',
      gatePh: 'Password', gateBtn: 'Enter', gateWrong: 'Wrong password, try again', gateError: "Can't reach the server, check your connection",
      logout: 'Log out on this device', photos: '🖼 Change background photos (up to 4)', photosBusy: 'Uploading…',
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

  // Пароль нигде не хранится: из него считается SHA-256, и это имя раздела в базе.
  // Правила базы запрещают смотреть список разделов, так что без пароля данные не найти.
  const KEY_KEY = 'courtyard-key';
  const spaceOf = async pw => {
    const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('our-little-palace:' + pw));
    return [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, '0')).join('');
  };
  const spaceExists = async space => {
    const r = await fetch(`${CFG.firebase.databaseURL}/spaces/${space}/meta.json`);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return (await r.json()) !== null;
  };

  async function firebaseStore(space) {
    const base = 'https://www.gstatic.com/firebasejs/10.14.1/';
    await script(base + 'firebase-app-compat.js');
    await script(base + 'firebase-database-compat.js');
    firebase.initializeApp(CFG.firebase);
    const root = firebase.database().ref('spaces/' + space);
    await Promise.race([
      new Promise((ok, fail) => root.on('value', s => {
        data = s.val() || {};
        showPhotos(data.photos); // фото фона лежат в той же защищённой паролем базе
        delete data.photos;
        delete data.meta;
        ok();
        emit();
      }, fail)),
      new Promise((_, fail) => setTimeout(() => fail(new Error('timeout')), 15000)),
    ]);
    synced = true;
    return {
      set: (path, value) => root.child(path).set(value),
      update: (path, obj) => root.child(path).update(obj),
    };
  }

  const space = read(KEY_KEY);
  const locked = !!(CFG.firebase && CFG.firebase.databaseURL) && !space;
  const ready = !CFG.firebase || !CFG.firebase.databaseURL
    ? Promise.resolve().then(localStore)
    : locked
      ? new Promise(() => {}) // ждём пароль — без него данных нет
      : firebaseStore(space).catch(err => { console.warn('Firebase недоступен, работаем локально', err); return localStore(); });

  function gate() {
    const m = document.createElement('div');
    m.className = 'who-modal gate';
    m.innerHTML = `<form class="who-card"><h2>🔒 ${t('gateTitle')}</h2><p>${t('gateHint')}</p>
      <input type="password" class="gate-input" autocomplete="current-password" placeholder="${t('gatePh')}" required>
      <p class="gate-msg" hidden></p>
      <button type="submit" class="gate-btn">${t('gateBtn')}</button></form>`;
    const form = m.querySelector('form'), input = m.querySelector('input'), msg = m.querySelector('.gate-msg');
    form.onsubmit = async e => {
      e.preventDefault();
      msg.hidden = true;
      try {
        const s = await spaceOf(input.value.trim());
        if (!(await spaceExists(s))) throw new Error('wrong');
        write(KEY_KEY, s);
        location.reload();
      } catch (err) {
        msg.textContent = t(err.message === 'wrong' ? 'gateWrong' : 'gateError');
        msg.hidden = false;
        input.select();
      }
    };
    document.body.append(m);
    input.focus();
  }

  const store = {
    on(fn) { subs.push(fn); if (loaded) fn(data); },
    set: (path, value) => ready.then(s => s.set(path, value)),
    update: (path, obj) => ready.then(s => s.update(path, obj)),
  };

  const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  // ---------- фон из наших фото (только после входа по паролю) ----------
  let shownPhotos = '';
  function showPhotos(photos) {
    if (!document.body.classList.contains('palace')) return;
    const urls = Object.keys(photos || {}).sort().map(k => photos[k])
      .filter(u => typeof u === 'string' && u.startsWith('data:image/'));
    const sig = urls.map(u => u.length + u.slice(-16)).join('|');
    if (sig === shownPhotos) return;
    shownPhotos = sig;
    let bg = document.querySelector('.bg-collage');
    if (!bg) {
      bg = document.createElement('div');
      bg.className = 'bg-collage';
      bg.setAttribute('aria-hidden', 'true');
      document.body.prepend(bg);
    }
    bg.replaceChildren(...urls.map(u => {
      const fig = document.createElement('figure');
      const img = new Image();
      img.src = u;
      img.alt = '';
      fig.append(img);
      return fig;
    }));
  }

  // фото уменьшаем в браузере до ~1000px, чтобы база не разрасталась
  const shrink = file => new Promise((ok, fail) => {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, 1000 / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k);
      c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      ok(c.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = fail;
    img.src = URL.createObjectURL(file);
  });

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
    if (space) {
      const pick = document.createElement('label');
      pick.className = 'photos-btn';
      pick.innerHTML = `<span>${t('photos')}</span><input type="file" accept="image/*" multiple hidden>`;
      pick.querySelector('input').onchange = async e => {
        const files = [...e.target.files].slice(0, 4);
        if (!files.length) return;
        pick.querySelector('span').textContent = t('photosBusy');
        const urls = await Promise.all(files.map(shrink));
        await store.set('photos', Object.fromEntries(urls.map((u, i) => ['p' + (i + 1), u])));
        m.remove();
      };
      m.querySelector('.who-card').append(pick);
      const out = document.createElement('button');
      out.className = 'logout';
      out.textContent = t('logout');
      out.onclick = () => { try { localStorage.removeItem(KEY_KEY); } catch {} location.reload(); };
      m.querySelector('.who-card').append(out);
    }
    if (me) m.onclick = e => { if (e.target === m) m.remove(); };
    document.body.append(m);
  }

  document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
  nav();
  if (locked) gate();
  else if (!me) pickMe();

  return {
    t, addText, translate, lang, names, store, newId,
    get me() { return me || 'a'; },
    get other() { return (me || 'a') === 'a' ? 'b' : 'a'; },
  };
})();
