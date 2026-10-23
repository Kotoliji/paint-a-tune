// Стена листочков: желания, ожидания и вопросы друг другу + ответы под ними
const { t, store } = App;

// старые ссылки «поделиться мелодией» вели на главную — отправляем их на paint.html
if (/[#&]g=/.test(location.hash)) location.replace('paint.html' + location.hash);

App.addText({
  zh: {
    pageTitle: '便签墙 · 小小紫禁城', wallTitle: '便签墙',
    wallSub: '写下对彼此的愿望、期待和问题。点一下便签就能展开，在里面回答。',
    newNote: '＋ 新便签', editNew: '新便签', editOld: '修改便签',
    titlePh: '标题', bodyPh: '想说的话……', noteColor: '便签颜色', textColor: '文字颜色',
    cancel: '取消', save: '贴上去', replyPh: '写回答……（Ctrl+Enter 发送）', answerColor: '回答颜色', send: '回答', open: '展开 ⤢', close: '关闭', noAnswers: '还没有回答',
    edit: '修改', del: '删除', confirmDel: '确定要撕掉这张便签吗？', colon: '：',
    emptyWall: '墙上还空着，点「＋ 新便签」贴第一张吧。',
  },
  en: {
    pageTitle: 'Notes · Our Little Palace', wallTitle: 'Our notes',
    wallSub: 'Write wishes, expectations and questions for each other. Tap a note to open it and answer inside.',
    newNote: '＋ New note', editNew: 'New note', editOld: 'Edit note',
    titlePh: 'Title', bodyPh: 'What do you want to say…', noteColor: 'Note color', textColor: 'Text color',
    cancel: 'Cancel', save: 'Stick it', replyPh: 'Write an answer… (Ctrl+Enter to send)', answerColor: 'Answer color', send: 'Answer', open: 'Open ⤢', close: 'Close', noAnswers: 'No answers yet',
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

// ---------- стена: листочки одного размера, по нажатию раскрываются ----------

const LIMIT = 10000; // символов — с запасом, столько вы не напишете
let notesById = {}, openId = null;

const answersOf = n => Object.entries(n.answers || {})
  .map(([id, a]) => ({ id, ...a }))
  .sort((a, b) => (a.at || 0) - (b.at || 0));

function colorize(box, n) {
  box.style.setProperty('--nc', pick(n.noteColor, NOTE_COLORS));
  box.style.setProperty('--tc', pick(n.textColor, TEXT_COLORS));
}

function render(data) {
  const notes = Object.entries(data.notes || {})
    .map(([id, n]) => ({ id, ...n }))
    .sort((a, b) => (b.at || 0) - (a.at || 0));
  notesById = Object.fromEntries(notes.map(n => [n.id, n]));
  wall.replaceChildren(...notes.map(noteEl));
  $('empty').hidden = notes.length > 0;
  if (openId) { if (notesById[openId]) renderViewer(); else closeViewer(); }
}

function noteTools(n) {
  const tools = el('div', 'n-tools');
  const edit = el('button', null, '✎');
  edit.type = 'button';
  edit.title = t('edit');
  edit.onclick = () => openEditor(n);
  const del = el('button', null, '🗑'); // не ✕ — чтобы не путать с «закрыть»
  del.type = 'button';
  del.title = t('del');
  del.onclick = () => {
    if (!confirm(t('confirmDel'))) return;
    if (openId === n.id) closeViewer();
    store.set('notes/' + n.id, null);
  };
  tools.append(edit, del);
  return tools;
}

function answerLine(a, tag, cls) {
  const line = el(tag, cls);
  line.style.color = pick(a.color, ANSWER_COLORS);
  line.append(el('b', null, (App.names[a.author] || '') + t('colon')), document.createTextNode(String(a.text)));
  return line;
}

function noteEl(n) {
  const card = el('article', 'note');
  colorize(card, n);
  card.style.setProperty('--tilt', tilt(n.id) + 'deg');
  card.tabIndex = 0;
  card.title = t('open');
  card.onclick = e => { if (!e.target.closest('button')) openViewer(n.id); };
  card.onkeydown = e => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target === card) { e.preventDefault(); openViewer(n.id); }
  };
  card.append(noteTools(n));
  if (n.title) card.append(el('h3', 'n-title', String(n.title)));
  if (n.body) card.append(el('p', 'n-body', String(n.body)));
  card.append(el('div', 'n-meta', `${App.names[n.author] || ''} · ${fmtDate(n.at)}`));
  const answers = answersOf(n);
  if (answers.length) card.append(answerLine(answers[answers.length - 1], 'p', 'n-last'));
  const foot = el('div', 'n-foot');
  foot.append(el('span', null, answers.length ? '💬 ' + answers.length : t('noAnswers')), el('span', 'n-open', t('open')));
  card.append(foot);
  return card;
}

// ---------- раскрытый листочек: весь текст, все ответы, большое поле ответа ----------

const viewer = el('div', 'modal viewer');
viewer.hidden = true;
viewer.onclick = e => { if (e.target === viewer) closeViewer(); };
document.body.append(viewer);

function openViewer(id) {
  openId = id;
  viewer.hidden = false;
  document.body.classList.add('no-scroll');
  renderViewer();
  viewer.scrollTop = 0;
}

function closeViewer() {
  openId = null;
  viewer.hidden = true;
  viewer.replaceChildren();
  document.body.classList.remove('no-scroll');
}

function renderViewer() { // вызывается и при новых данных: черновик, фокус и прокрутку сохраняем
  const n = notesById[openId];
  const old = viewer.querySelector('textarea');
  const hadFocus = old && document.activeElement === old;
  const scroll = viewer.scrollTop;

  const sheet = el('article', 'note big');
  colorize(sheet, n);
  const bar = el('div', 'v-bar');
  const close = el('button', 'v-close', '✕');
  close.type = 'button';
  close.title = t('close');
  close.onclick = closeViewer;
  bar.append(noteTools(n), close);
  sheet.append(bar);
  if (n.title) sheet.append(el('h2', 'n-title', String(n.title)));
  if (n.body) sheet.append(el('p', 'n-body', String(n.body)));
  sheet.append(el('div', 'n-meta', `${App.names[n.author] || ''} · ${fmtDate(n.at)}`));

  const answers = answersOf(n);
  if (answers.length) {
    const ul = el('ul', 'answers');
    for (const a of answers) {
      const li = answerLine(a, 'li');
      const x = el('button', 'a-del', '✕');
      x.type = 'button';
      x.title = t('del');
      x.onclick = () => store.set(`notes/${n.id}/answers/${a.id}`, null);
      li.append(' ', x);
      ul.append(li);
    }
    sheet.append(ul);
  }
  sheet.append(replyForm(n.id));
  viewer.replaceChildren(sheet);
  viewer.scrollTop = scroll;

  const ta = viewer.querySelector('textarea');
  grow(ta);
  if (hadFocus) { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }
}

const grow = ta => { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; };

function replyForm(id) {
  const form = el('form', 'reply');
  const ta = el('textarea');
  ta.dataset.reply = id;
  ta.rows = 3;
  ta.placeholder = t('replyPh');
  ta.maxLength = LIMIT;
  ta.value = drafts[id] || '';
  ta.style.color = answerColor;
  ta.oninput = () => { drafts[id] = ta.value; grow(ta); };
  ta.onkeydown = e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); form.requestSubmit(); } };

  const row = el('div', 'reply-row');
  const dots = el('div', 'dots'); // выбор цвета ответа
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
  const send = el('button', 'btn-red', t('send'));
  send.type = 'submit';
  row.append(dots, send);
  form.append(ta, row);
  form.onsubmit = e => {
    e.preventDefault();
    const text = ta.value.trim();
    if (!text) return ta.focus();
    delete drafts[id];
    ta.value = '';
    grow(ta);
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
window.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (!$('editor').hidden) closeEditor();
  else if (openId) closeViewer();
});

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
      title: '欢迎来到小小紫禁城 ✿',
      body: '在这里写下愿望、期待和问题，下面就能回答。\nWrite wishes, expectations and questions here, and answer right below.',
      noteColor: NOTE_COLORS[1], textColor: TEXT_COLORS[1], author: 'a', at: Date.now(),
    });
  }
  render(data);
});
