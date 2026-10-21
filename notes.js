// Стена листочков: желания, ожидания и вопросы друг другу + ответы под ними
const { t, store } = App;

App.addText({
  zh: {
    pageTitle: '便签墙 · 我们的小院', wallTitle: '便签墙',
    wallSub: '写下对彼此的愿望、期待和问题，在便签下面就能回答。',
    newNote: '＋ 新便签', editNew: '新便签', editOld: '修改便签',
    titlePh: '标题', bodyPh: '想说的话……', noteColor: '便签颜色', textColor: '文字颜色',
    cancel: '取消', save: '贴上去', replyPh: '写回答，按回车……', answerColor: '回答颜色',
    edit: '修改', del: '删除', confirmDel: '确定要撕掉这张便签吗？', colon: '：',
    emptyWall: '墙上还空着，点「＋ 新便签」贴第一张吧。',
  },
  en: {
    pageTitle: 'Notes · Our Courtyard', wallTitle: 'Our notes',
    wallSub: 'Write wishes, expectations and questions for each other. Answer right under each note.',
    newNote: '＋ New note', editNew: 'New note', editOld: 'Edit note',
    titlePh: 'Title', bodyPh: 'What do you want to say…', noteColor: 'Note color', textColor: 'Text color',
    cancel: 'Cancel', save: 'Stick it', replyPh: 'Write an answer, press Enter…', answerColor: 'Answer color',
    edit: 'Edit', del: 'Delete', confirmDel: 'Tear this note off the wall?', colon: ': ',
    emptyWall: 'The wall is empty. Press "＋ New note" to stick the first one.',
  },
});
App.translate();
document.title = t('pageTitle');

const NOTE_COLORS = ['#fff3a8', '#ffd6dc', '#d4efd2', '#d3e7ff', '#e6dcff', '#fffaf0'];
const TEXT_COLORS = ['#2b2320', '#9e2a2b', '#1f4e9c', '#2e6b3f', '#6b3fa0'];
const ANSWER_COLORS = ['#c0392b', '#1f5fbf', '#2e8b57', '#8e44ad', '#c77700'];
const pick = (v, list) => list.includes(v) ? v : list[0]; // цвета из базы проверяем по палитре

const $ = id => document.getElementById(id);
const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};
const wall = $('notes');
const drafts = {}; // недописанные ответы не пропадают, когда приходят новые данные

let answerColor = ANSWER_COLORS[0];
try { answerColor = pick(localStorage.getItem('courtyard-answer-color'), ANSWER_COLORS); } catch {}

const fmtDate = ms => new Date(ms || Date.now())
  .toLocaleDateString(App.lang === 'zh' ? 'zh-CN' : 'en', { month: 'short', day: 'numeric' });

function tilt(id) { // у каждого листочка свой лёгкий наклон
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return ((Math.abs(h) % 5) - 2) * 0.7;
}

// ---------- стена ----------

function render(data) {
  const focused = document.activeElement?.dataset?.reply;
  const notes = Object.entries(data.notes || {})
    .map(([id, n]) => ({ id, ...n }))
    .sort((a, b) => (b.at || 0) - (a.at || 0));
  wall.replaceChildren(...notes.map(noteEl));
  $('empty').hidden = notes.length > 0;
  if (focused) {
    const inp = wall.querySelector(`[data-reply="${focused}"]`);
    if (inp) { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); }
  }
}

function noteEl(n) {
  const card = el('article', 'note');
  card.style.setProperty('--nc', pick(n.noteColor, NOTE_COLORS));
  card.style.setProperty('--tc', pick(n.textColor, TEXT_COLORS));
  card.style.setProperty('--tilt', tilt(n.id) + 'deg');

  const tools = el('div', 'n-tools');
  const edit = el('button', null, '✎');
  edit.type = 'button';
  edit.title = t('edit');
  edit.onclick = () => openEditor(n);
  const del = el('button', null, '✕');
  del.type = 'button';
  del.title = t('del');
  del.onclick = () => { if (confirm(t('confirmDel'))) store.set('notes/' + n.id, null); };
  tools.append(edit, del);
  card.append(tools);

  if (n.title) card.append(el('h3', 'n-title', String(n.title)));
  if (n.body) card.append(el('p', 'n-body', String(n.body)));
  card.append(el('div', 'n-meta', `${App.names[n.author] || ''} · ${fmtDate(n.at)}`));

  const answers = Object.entries(n.answers || {})
    .map(([id, a]) => ({ id, ...a }))
    .sort((a, b) => (a.at || 0) - (b.at || 0));
  if (answers.length) {
    const ul = el('ul', 'answers');
    for (const a of answers) {
      const li = el('li');
      li.style.color = pick(a.color, ANSWER_COLORS);
      li.append(el('b', null, (App.names[a.author] || '') + t('colon')), document.createTextNode(String(a.text)));
      const x = el('button', 'a-del', '✕');
      x.type = 'button';
      x.title = t('del');
      x.onclick = () => store.set(`notes/${n.id}/answers/${a.id}`, null);
      li.append(' ', x);
      ul.append(li);
    }
    card.append(ul);
  }
  card.append(replyForm(n.id));
  return card;
}

function replyForm(id) {
  const form = el('form', 'reply');
  const inp = el('input');
  inp.dataset.reply = id;
  inp.placeholder = t('replyPh');
  inp.maxLength = 500;
  inp.value = drafts[id] || '';
  inp.style.color = answerColor;
  inp.oninput = () => { drafts[id] = inp.value; };

  const dots = el('div', 'dots'); // выбор цвета ответа — в углу листочка
  dots.title = t('answerColor');
  for (const c of ANSWER_COLORS) {
    const d = el('button', 'dot' + (c === answerColor ? ' on' : ''));
    d.type = 'button';
    d.dataset.c = c;
    d.style.background = c;
    d.setAttribute('aria-label', t('answerColor'));
    d.onclick = () => setAnswerColor(c);
    dots.append(d);
  }
  form.append(inp, dots);
  form.onsubmit = e => {
    e.preventDefault();
    const text = inp.value.trim();
    if (!text) return;
    delete drafts[id];
    inp.value = '';
    store.set(`notes/${id}/answers/${App.newId()}`, { text, color: answerColor, author: App.me, at: Date.now() });
  };
  return form;
}

function setAnswerColor(c) {
  answerColor = c;
  try { localStorage.setItem('courtyard-answer-color', c); } catch {}
  document.querySelectorAll('.dot').forEach(d => d.classList.toggle('on', d.dataset.c === c));
  document.querySelectorAll('[data-reply]').forEach(i => { i.style.color = c; });
}

// ---------- окно создания / правки ----------

let editing = null, noteColor = NOTE_COLORS[0], textColor = TEXT_COLORS[0];

function swatches(box, list, onPick) {
  for (const c of list) {
    const b = el('button', 'swatch');
    b.type = 'button';
    b.dataset.c = c;
    b.style.background = c;
    b.onclick = () => { onPick(c); paintPreview(); };
    box.append(b);
  }
}
swatches($('noteColors'), NOTE_COLORS, c => { noteColor = c; });
swatches($('textColors'), TEXT_COLORS, c => { textColor = c; });

function paintPreview() {
  $('pv').style.setProperty('--nc', noteColor);
  $('pv').style.setProperty('--tc', textColor);
  $('noteColors').querySelectorAll('.swatch').forEach(b => b.classList.toggle('on', b.dataset.c === noteColor));
  $('textColors').querySelectorAll('.swatch').forEach(b => b.classList.toggle('on', b.dataset.c === textColor));
}

function openEditor(n) {
  editing = n || null;
  $('editHead').textContent = t(n ? 'editOld' : 'editNew');
  $('fTitle').value = n?.title || '';
  $('fBody').value = n?.body || '';
  noteColor = pick(n?.noteColor, NOTE_COLORS);
  textColor = pick(n?.textColor, TEXT_COLORS);
  paintPreview();
  $('editor').hidden = false;
  $('fTitle').focus();
}
const closeEditor = () => { $('editor').hidden = true; };

$('add').onclick = () => openEditor();
$('cancel').onclick = closeEditor;
$('editor').onclick = e => { if (e.target === $('editor')) closeEditor(); };
window.addEventListener('keydown', e => { if (e.key === 'Escape') closeEditor(); });

$('form').onsubmit = e => {
  e.preventDefault();
  const title = $('fTitle').value.trim(), body = $('fBody').value.trim();
  if (!title && !body) return $('fTitle').focus();
  const fields = { title, body, noteColor, textColor };
  if (editing) store.update('notes/' + editing.id, fields); // ответы под листочком не трогаем
  else store.set('notes/' + App.newId(), { ...fields, author: App.me, at: Date.now() });
  closeEditor();
};

// ---------- старт ----------

let seeding = false;
store.on(data => {
  if (!data.seeded && !seeding) { // первый листочек-пример, один раз на всю базу
    seeding = true;
    store.set('seeded', true);
    store.set('notes/welcome', {
      title: '欢迎来到我们的小院 ✿',
      body: '在这里写下愿望、期待和问题，下面就能回答。\nWrite wishes, expectations and questions here, and answer right below.',
      noteColor: NOTE_COLORS[1], textColor: TEXT_COLORS[1], author: 'a', at: Date.now(),
    });
  }
  render(data);
});
