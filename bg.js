// Фон страниц body.palace: частицы с глубиной, наши фото парами и окно «наши фото»
(() => {
  if (!document.body.classList.contains('palace')) return;
  const { t, store } = App;

  App.addText({
    zh: {
      mgrTitle: '我们的照片', mgrHint: '照片两张一组排在一起：1+2、3+4……用 ◀ 调整顺序，想放多少都可以。',
      addPhotos: '＋ 添加照片', done: '完成', busy: '上传中……', delPhoto: '删除这张照片？',
      noPhotos: '还没有照片，点「＋ 添加照片」。', moveLeft: '往前移', delete: '删除',
    },
    en: {
      mgrTitle: 'Our photos', mgrHint: 'Photos stand in pairs: 1+2, 3+4… Use ◀ to change the order. Add as many as you like.',
      addPhotos: '＋ Add photos', done: 'Done', busy: 'Uploading…', delPhoto: 'Delete this photo?',
      noPhotos: 'No photos yet. Press "＋ Add photos".', moveLeft: 'Move earlier', delete: 'Delete',
    },
  });

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let W = innerWidth, H = innerHeight;

  // ---------- частицы: дальние мелкие и чёткие, ближние крупные и мягкие ----------
  const cv = document.createElement('canvas');
  cv.className = 'bg-particles';
  cv.setAttribute('aria-hidden', 'true');
  document.body.prepend(cv);
  const cx = cv.getContext('2d');
  const TINTS = ['255,255,255', '255,228,242', '228,216,255', '214,240,255'];
  let parts = [];

  function spawn(anywhere) {
    const z = Math.random() ** 1.7; // 0 — далеко, 1 — близко; дальних больше
    return {
      x: Math.random() * W,
      y: anywhere ? Math.random() * H : H + 40,
      z,
      r: 1.5 + z * z * 18,
      a: 0.6 - z * 0.42,
      vy: 3 + z * 12, // пикселей в секунду — очень медленно
      sway: Math.random() * Math.PI * 2,
      c: TINTS[Math.floor(Math.random() * TINTS.length)],
    };
  }

  function resizeCanvas() {
    const dpr = Math.min(2, devicePixelRatio || 1);
    cv.width = W * dpr;
    cv.height = H * dpr;
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    parts = Array.from({ length: Math.round(Math.min(90, W * H / 15000)) }, () => spawn(true));
  }

  let mx = 0, my = 0, tx = 0, ty = 0, last = performance.now(), raf = 0;
  addEventListener('pointermove', e => { tx = e.clientX / W - 0.5; ty = e.clientY / H - 0.5; }, { passive: true });

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    mx += (tx - mx) * 0.03; // мышь чуть сдвигает слои — ближние сильнее
    my += (ty - my) * 0.03;
    cx.clearRect(0, 0, W, H);
    for (const p of parts) {
      p.y -= p.vy * dt;
      p.sway += dt * 0.35;
      if (p.y < -40) Object.assign(p, spawn(false));
      const x = p.x + Math.sin(p.sway) * 14 * p.z - mx * 40 * p.z;
      const y = p.y - my * 26 * p.z;
      const g = cx.createRadialGradient(x, y, 0, x, y, p.r);
      g.addColorStop(0, `rgba(${p.c},${p.a})`);
      g.addColorStop(1, `rgba(${p.c},0)`);
      cx.fillStyle = g;
      cx.beginPath();
      cx.arc(x, y, p.r, 0, Math.PI * 2);
      cx.fill();
    }
    if (!reduce && !document.hidden) raf = requestAnimationFrame(frame);
  }
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && !reduce) { cancelAnimationFrame(raf); last = performance.now(); raf = requestAnimationFrame(frame); }
  });

  // ---------- фото: парами 1+2, 3+4…, сначала по краям экрана ----------
  const box = document.createElement('div');
  box.className = 'bg-collage';
  box.setAttribute('aria-hidden', 'true');
  cv.after(box);

  let list = [], figs = [], sig = '', mgr = null; // mgr — открытое окно «наши фото»
  const num = k => parseInt(String(k).slice(1), 10) || 0;
  const rnd = i => { const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); };

  App.onPhotos(p => {
    list = Object.entries(p || {})
      .filter(([, v]) => typeof v === 'string' && v.startsWith('data:image/'))
      .sort((a, b) => num(a[0]) - num(b[0]))
      .map(([key, src]) => ({ key, src }));
    const s = list.map(x => x.key + ':' + x.src.length).join('|');
    if (s !== sig) {
      sig = s;
      figs = list.map(x => {
        const f = document.createElement('figure');
        const img = new Image();
        img.src = x.src;
        img.alt = '';
        f.append(img);
        return f;
      });
      box.replaceChildren(...figs);
      layout();
    }
    if (mgr) renderMgr();
  });

  function layout() {
    const pairs = Math.ceil(figs.length / 2);
    if (!pairs) return;
    const top = 70, h = H - top;
    const n = Math.max(pairs, 6);
    const cols = Math.max(1, Math.round(Math.sqrt(n * W / h)));
    const rows = Math.ceil(n / cols);
    const cw = W / cols, ch = h / rows;
    const w = Math.max(80, Math.min(250, cw * 0.5, (ch * 0.92) / 1.32)); // высота полароида ≈ 1.32 ширины

    const slots = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = (c + 0.5) / cols, y = (r + 0.5) / rows;
        let score = Math.abs(x - 0.5) * 2 + Math.abs(y - 0.5) * 0.8; // края — первыми
        if (y < 0.34 && (x < 0.5 || W < 700)) score -= 0.7; // сверху заголовок (на телефоне — во всю ширину)
        slots.push({ x: x * W, y: top + y * h, score });
      }
    }
    slots.sort((a, b) => b.score - a.score);

    figs.forEach((f, i) => {
      const pi = i >> 1, second = i & 1, slot = slots[pi % slots.length];
      const alone = !second && i === figs.length - 1;
      const jx = (rnd(pi) - 0.5) * cw * 0.18, jy = (rnd(pi + 50) - 0.5) * ch * 0.18;
      const dx = alone ? 0 : (second ? 0.4 : -0.4) * w;
      const dy = second ? w * 0.12 : -w * 0.06;
      f.style.width = w + 'px';
      f.style.padding = `${w * 0.04}px ${w * 0.04}px ${w * 0.13}px`;
      f.style.left = (slot.x + jx + dx - w / 2) + 'px';
      f.style.top = (slot.y + jy + dy - w * 0.66) + 'px';
      f.style.zIndex = second ? 2 : 1;
      f.style.setProperty('--r', ((second ? 5 : -6) + (rnd(i + 9) - 0.5) * 6).toFixed(1) + 'deg');
      f.style.animationDelay = (-rnd(i + 3) * 12).toFixed(1) + 's';
    });
  }

  let resizeTimer;
  addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { W = innerWidth; H = innerHeight; resizeCanvas(); layout(); if (reduce) frame(performance.now()); }, 150);
  });

  resizeCanvas();
  raf = requestAnimationFrame(frame);

  // ---------- окно «наши фото»: добавить, удалить, поменять порядок ----------
  const shrink = file => new Promise((ok, fail) => { // на фоне фото маленькие — 700px хватает
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, 700 / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k);
      c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      ok(c.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = fail;
    img.src = URL.createObjectURL(file);
  });

  const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  };

  function renderMgr() {
    const grid = mgr.querySelector('.thumbs');
    grid.replaceChildren();
    if (!list.length) grid.append(el('p', 'mgr-empty', t('noPhotos')));
    for (let i = 0; i < list.length; i += 2) {
      const pair = el('div', 'pair');
      list.slice(i, i + 2).forEach((p, j) => {
        const idx = i + j;
        const th = el('div', 'thumb');
        const img = new Image();
        img.src = p.src;
        img.alt = '';
        th.append(img, el('span', 'n', String(idx + 1)));
        const tools = el('div', 'thumb-tools');
        if (idx > 0) {
          const left = el('button', null, '◀');
          left.type = 'button';
          left.title = t('moveLeft');
          left.onclick = () => { // меняем местами с соседом слева
            const a = list[idx - 1], b = list[idx];
            store.update('photos', { [a.key]: b.src, [b.key]: a.src });
          };
          tools.append(left);
        }
        const del = el('button', null, '✕');
        del.type = 'button';
        del.title = t('delete');
        del.onclick = () => { if (confirm(t('delPhoto'))) store.set('photos/' + p.key, null); };
        tools.append(del);
        th.append(tools);
        pair.append(th);
      });
      grid.append(pair);
    }
  }

  function open() {
    if (!App.unlocked) return;
    mgr = el('div', 'modal photo-mgr');
    mgr.innerHTML = `<div class="mgr-card">
      <h2></h2><p class="mgr-hint"></p><div class="thumbs"></div>
      <p class="mgr-busy" hidden></p>
      <div class="mgr-actions">
        <label class="btn-soft mgr-add"><span></span><input type="file" accept="image/*" multiple hidden></label>
        <button type="button" class="btn-red mgr-done"></button>
      </div></div>`;
    mgr.querySelector('h2').textContent = t('mgrTitle');
    mgr.querySelector('.mgr-hint').textContent = t('mgrHint');
    mgr.querySelector('.mgr-add span').textContent = t('addPhotos');
    mgr.querySelector('.mgr-done').textContent = t('done');
    const busy = mgr.querySelector('.mgr-busy');
    busy.textContent = t('busy');
    mgr.querySelector('input').onchange = async e => {
      const files = [...e.target.files];
      e.target.value = '';
      if (!files.length) return;
      busy.hidden = false;
      let next = list.reduce((m, p) => Math.max(m, num(p.key)), 0) + 1;
      for (const f of files) { // по одной, чтобы не отправлять в базу всё разом
        try { await store.set('photos/p' + next++, await shrink(f)); } catch (err) { console.warn(err); }
      }
      busy.hidden = true;
    };
    const close = () => { mgr.remove(); mgr = null; };
    mgr.querySelector('.mgr-done').onclick = close;
    mgr.onclick = e => { if (e.target === mgr) close(); };
    document.body.append(mgr);
    renderMgr();
  }

  window.Photos = { open };
})();
