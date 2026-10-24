// A self-contained SVG bouquet: each stem grows before its flower opens.
const bouquet = document.querySelector('#bouquet');
const replay = document.querySelector('#replayBloom');
const nightSky = document.querySelector('#nightSky');
const sky = nightSky.getContext('2d');
const svgNS = 'http://www.w3.org/2000/svg';
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

const blooms = [
  { kind:'rose', x:447, y:250, size:77, bend:0, delay:.18 },
  { kind:'rose', x:346, y:285, size:70, bend:-40, delay:.36 },
  { kind:'rose', x:550, y:285, size:71, bend:40, delay:.48 },
  { kind:'rose', x:411, y:166, size:58, bend:-16, delay:.66 },
  { kind:'rose', x:503, y:174, size:58, bend:16, delay:.72 },
  { kind:'rose', x:281, y:345, size:57, bend:-68, delay:.83 },
  { kind:'rose', x:619, y:346, size:59, bend:68, delay:.96 },
  { kind:'rose', x:394, y:365, size:61, bend:-20, delay:1.03 },
  { kind:'rose', x:511, y:370, size:62, bend:20, delay:1.14 },
  { kind:'plumeria', x:210, y:282, size:59, bend:-90, delay:.69 },
  { kind:'plumeria', x:690, y:278, size:61, bend:90, delay:.82 },
  { kind:'plumeria', x:171, y:385, size:55, bend:-108, delay:1.08 },
  { kind:'plumeria', x:729, y:386, size:56, bend:108, delay:1.19 },
  { kind:'plumeria', x:264, y:191, size:47, bend:-72, delay:1.32 },
  { kind:'plumeria', x:639, y:191, size:48, bend:72, delay:1.39 },
  { kind:'plumeria', x:270, y:472, size:46, bend:-62, delay:1.52 },
  { kind:'plumeria', x:634, y:472, size:47, bend:62, delay:1.57 }
];

function el(name, attrs = {}, parent = bouquet) {
  const node = document.createElementNS(svgNS, name);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  parent.append(node);
  return node;
}

function gradient(defs, id, stops) {
  const grad = el('radialGradient', { id, cx:'42%', cy:'36%', r:'72%' }, defs);
  stops.forEach(([offset, color]) => el('stop', { offset, 'stop-color':color }, grad));
}

function definitions() {
  const defs = el('defs');
  gradient(defs, 'roseOuter', [['0%','#ffe9ee'],['46%','#ef98ba'],['100%','#b94777']]);
  gradient(defs, 'roseMiddle', [['0%','#ffe1e8'],['48%','#f47aa8'],['100%','#bc3c72']]);
  gradient(defs, 'roseInner', [['0%','#ffe9ed'],['50%','#ed6d9c'],['100%','#aa315f']]);
  gradient(defs, 'plumeriaPetal', [['0%','#fff6d9'],['27%','#fffefa'],['78%','#f9f9ff'],['100%','#dcdbe7']]);
  const green = el('linearGradient', { id:'stemGradient', x1:'0', y1:'0', x2:'1', y2:'0' }, defs);
  [['0%','#2a6445'],['50%','#8bc493'],['100%','#25543b']].forEach(([offset,color]) => el('stop',{offset,'stop-color':color},green));
  gradient(defs, 'leafGradient', [['0%','#a9d19a'],['60%','#548e67'],['100%','#28583f']]);
  const filter = el('filter', { id:'softGlow', x:'-100%', y:'-100%', width:'300%', height:'300%' }, defs);
  el('feGaussianBlur', { stdDeviation:'3', result:'blur' }, filter);
  el('feMerge', {}, filter).innerHTML = '<feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/>';
}

function addLeaves(parent, f) {
  const left = f.x < 450 ? -1 : 1;
  const midX = 450 + (f.x - 450) * .51;
  const midY = 640 + (f.y - 640) * .55;
  const leaves = [
    { x:midX, y:midY, dir:left, tilt:-19 },
    { x:450+(f.x-450)*.73, y:640+(f.y-640)*.76, dir:-left, tilt:24 }
  ];
  leaves.forEach((leaf,j) => {
    const position = el('g', { transform:`translate(${leaf.x} ${leaf.y}) rotate(${leaf.tilt})` }, parent);
    const group = el('g', { class:'leaf-group' }, position);
    group.style.transformBox = 'fill-box';
    group.style.transformOrigin = '0 50%';
    if (!reducedMotion.matches) group.style.animation = `leafGrow .65s ${f.delay + .47 + j*.13}s both`;
    el('path', { class:'leaf', d:`M 0 0 Q ${leaf.dir*24} -28 ${leaf.dir*60} -10 Q ${leaf.dir*34} 17 0 0 Z` }, group);
    el('path', { d:`M 0 0 Q ${leaf.dir*29} -7 ${leaf.dir*60} -10`, fill:'none', stroke:'#c0dca6', 'stroke-width':'1.5', opacity:'.6' }, group);
  });
}

function rose(group, size, i) {
  const turn = (i * 29) % 360;
  for (let p=0; p<8; p++) {
    el('path', { class:'rose-outer', d:'M 0 -9 C -27 -18 -43 -47 -29 -68 C -14 -86 18 -76 29 -52 C 35 -35 17 -12 0 -9 Z', transform:`rotate(${turn+p*45}) scale(${size/77})` }, group);
  }
  for (let p=0; p<6; p++) {
    el('path', { class:'rose-mid', d:'M 0 -4 C -19 -12 -30 -34 -20 -51 C -9 -66 15 -59 23 -41 C 28 -25 12 -8 0 -4 Z', transform:`rotate(${turn+19+p*60}) scale(${size/77})` }, group);
  }
  for (let p=0; p<5; p++) {
    el('path', { class:'rose-inner', d:'M 0 -2 C -13 -8 -18 -24 -12 -34 C -3 -44 12 -38 16 -26 C 17 -16 8 -5 0 -2 Z', transform:`rotate(${turn+12+p*72}) scale(${size/77})` }, group);
  }
  el('circle', { class:'rose-core', r:size*.095 }, group);
  el('path', { d:`M ${-size*.06} 0 Q 0 ${-size*.08} ${size*.06} ${size*.035}`, fill:'none', stroke:'#a63d68', 'stroke-width':'2', 'stroke-linecap':'round' }, group);
}

function plumeria(group, size, i) {
  for (let p=0; p<5; p++) {
    el('path', { class:'plumeria-petal', d:'M 0 2 C -13 -16 -27 -48 -10 -58 C 7 -68 31 -50 28 -33 C 26 -16 11 -3 0 2 Z', transform:`rotate(${i*17+p*72}) scale(${size/61})` }, group);
  }
  el('circle', { class:'plumeria-core', r:size*.15 }, group);
  el('circle', { fill:'#ffe6a9', r:size*.065 }, group);
}

function growBouquet() {
  bouquet.replaceChildren();
  definitions();
  const stems = el('g');
  blooms.forEach((f,i) => {
    const stem = el('path', { class:`stem ${f.kind === 'plumeria' ? 'fine' : ''}`, d:`M 450 640 Q ${450+f.bend} 478 ${f.x} ${f.y+9}` }, stems);
    const length = stem.getTotalLength();
    stem.style.strokeDasharray = length;
    stem.style.strokeDashoffset = reducedMotion.matches ? '0' : length;
    if (!reducedMotion.matches) stem.style.animation = `stemGrow 1.25s ${f.delay}s cubic-bezier(.2,.72,.18,1) forwards`;
    addLeaves(stems, f);
  });
  const flowers = el('g');
  blooms.forEach((f,i) => {
    const position = el('g', { transform:`translate(${f.x} ${f.y})` }, flowers);
    const group = el('g', { class:`flower ${f.kind}` }, position);
    if (f.kind === 'rose') rose(group, f.size, i); else plumeria(group, f.size, i);
    if (!reducedMotion.matches) group.style.animation = `flowerBloom .95s ${f.delay+1.05}s cubic-bezier(.17,.8,.24,1.3) both`;
  });
  const glints = el('g');
  [[118,245,2.5],[771,215,2],[93,393,1.8],[794,457,2.6],[346,103,2.1],[576,105,1.7]].forEach(([x,y,r])=>{
    el('circle', { class:'sparkle', cx:x, cy:y, r }, glints);
    el('path', { d:`M ${x-8} ${y} H ${x+8} M ${x} ${y-8} V ${y+8}`, stroke:'#ffe7be', 'stroke-width':'.7', opacity:'.8' }, glints);
  });
}

let stars = [];
let frame;
function resizeSky() {
  const ratio = Math.min(devicePixelRatio || 1, 2);
  nightSky.width = Math.round(innerWidth * ratio);
  nightSky.height = Math.round(innerHeight * ratio);
  sky.setTransform(ratio,0,0,ratio,0,0);
  stars = Array.from({length:Math.min(170,Math.round(innerWidth*innerHeight/8500))},(_,i)=>({
    x:Math.random()*innerWidth, y:Math.random()*innerHeight,
    r:i%13===0?1.7:Math.random()*.9+.25,
    phase:Math.random()*Math.PI*2, speed:.0005+Math.random()*.0011
  }));
  drawSky(0);
}
function drawSky(time) {
  sky.clearRect(0,0,innerWidth,innerHeight);
  stars.forEach(star=>{
    const alpha=reducedMotion.matches?.65:.26+.54*(.5+.5*Math.sin(time*star.speed+star.phase));
    sky.fillStyle=`rgba(255,241,222,${alpha})`;
    sky.beginPath(); sky.arc(star.x,star.y,star.r,0,Math.PI*2); sky.fill();
    if (star.r>1.5) {
      sky.strokeStyle=`rgba(255,216,230,${alpha*.55})`;
      sky.lineWidth=.7; sky.beginPath();
      sky.moveTo(star.x-5,star.y); sky.lineTo(star.x+5,star.y);
      sky.moveTo(star.x,star.y-5); sky.lineTo(star.x,star.y+5); sky.stroke();
    }
  });
  if (!reducedMotion.matches) frame=requestAnimationFrame(drawSky);
}

function setLanguage() {
  const key=App.lang === 'zh' ? 'flowerZh' : 'flowerEn';
  document.querySelectorAll('[data-flower-zh]').forEach(node=>{ node.textContent=node.dataset[key]; });
  document.title=App.lang === 'zh' ? '给我的小熊 · 刘晚晴' : 'For my little bear · 刘晚晴';
}

replay.addEventListener('click',()=>{growBouquet(); replay.blur();});
addEventListener('resize',()=>{cancelAnimationFrame(frame); resizeSky();});
reducedMotion.addEventListener('change',()=>{cancelAnimationFrame(frame); growBouquet(); resizeSky();});
setLanguage(); growBouquet(); resizeSky();
