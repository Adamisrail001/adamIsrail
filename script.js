// ---------- State ----------
const CIRCUMFERENCE = 2 * Math.PI * 104; // r=104

const state = {
  status: 'idle',   // idle | running | paused | done
  total: 0,
  remaining: 0,
  interval: null,
};

// ---------- DOM ----------
const scene       = document.getElementById('scene');
const glow        = document.getElementById('glow');
const setup       = document.getElementById('setup');
const inputMin    = document.getElementById('inputMin');
const inputSec    = document.getElementById('inputSec');
const ringFg      = document.getElementById('ringFg');
const ringWrap    = document.querySelector('.ring-wrap');
const timeDisplay = document.getElementById('timeDisplay');
const phaseLabel  = document.getElementById('phaseLabel');
const doneOverlay = document.getElementById('doneOverlay');
const mainBtn     = document.getElementById('mainBtn');
const resetBtn    = document.getElementById('resetBtn');
const lapBtn      = document.getElementById('lapBtn');
const particles   = document.getElementById('particles');

// ---------- Phases ----------
// Each phase: [hue, saturation%, lightness% for --color], label, threshold (fraction remaining)
const PHASES = [
  { min: 0.5,  hue: 250, label: 'Focused',   sat: 80, lit: 65 },
  { min: 0.25, hue: 185, label: 'Cruising',  sat: 75, lit: 58 },
  { min: 0.10, hue: 38,  label: 'Getting close…', sat: 85, lit: 60 },
  { min: 0.03, hue: 18,  label: 'Almost!',   sat: 90, lit: 60 },
  { min: 0,    hue: 0,   label: 'Hurry!',    sat: 90, lit: 58 },
];

function getPhase(fraction) {
  for (const p of PHASES) {
    if (fraction >= p.min) return p;
  }
  return PHASES[PHASES.length - 1];
}

function applyPhase(fraction) {
  const p = getPhase(fraction);
  document.documentElement.style.setProperty('--hue', p.hue);
  document.documentElement.style.setProperty('--color',
    `hsl(${p.hue}, ${p.sat}%, ${p.lit}%)`);
  document.documentElement.style.setProperty('--color-dim',
    `hsl(${p.hue}, ${p.sat - 20}%, 30%)`);
  document.documentElement.style.setProperty('--bg',
    `hsl(${p.hue}, 25%, 8%)`);
  phaseLabel.textContent = state.status === 'paused' ? 'Paused' : p.label;

  ringWrap.classList.toggle('urgent', fraction < 0.10 && fraction > 0);
}

// ---------- Ring ----------
function setRing(fraction) {
  const offset = CIRCUMFERENCE * (1 - Math.max(0, fraction));
  ringFg.style.strokeDashoffset = offset;
}

// ---------- Display ----------
function fmt(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function render() {
  const fraction = state.total > 0 ? state.remaining / state.total : 1;
  timeDisplay.textContent = fmt(state.remaining);
  setRing(fraction);
  applyPhase(fraction);
}

// ---------- Particles ----------
function spawnParticles() {
  const cx = window.innerWidth / 2;
  const cy = window.innerHeight / 2;
  const hue = getComputedStyle(document.documentElement).getPropertyValue('--hue').trim();

  for (let i = 0; i < 48; i++) {
    const el = document.createElement('div');
    el.className = 'particle';
    const size = 6 + Math.random() * 10;
    const angle = Math.random() * 2 * Math.PI;
    const dist  = 80 + Math.random() * 220;
    const h = parseInt(hue) + (Math.random() - 0.5) * 60;
    el.style.cssText = `
      width:${size}px; height:${size}px;
      left:${cx}px; top:${cy}px;
      background: hsl(${h}, 85%, 65%);
      --tx: ${Math.cos(angle)*dist}px;
      --ty: ${Math.sin(angle)*dist}px;
      animation-delay: ${Math.random()*0.2}s;
      animation-duration: ${0.8 + Math.random()*0.6}s;
    `;
    particles.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
  }
}

// ---------- Timer logic ----------
function tick() {
  if (state.remaining <= 0) {
    finish();
    return;
  }
  state.remaining--;
  render();

  // subtle body shake at last 3 seconds
  if (state.remaining <= 3 && state.remaining > 0) {
    scene.classList.remove('shake');
    void scene.offsetWidth; // reflow
    scene.classList.add('shake');
  }
}

function start() {
  if (state.status === 'idle') {
    const mins = Math.max(0, parseInt(inputMin.value) || 0);
    const secs = Math.max(0, Math.min(59, parseInt(inputSec.value) || 0));
    const total = mins * 60 + secs;
    if (total <= 0) return;
    state.total     = total;
    state.remaining = total;
    setup.classList.add('hidden');
  }

  state.status = 'running';
  mainBtn.textContent = 'Pause';
  doneOverlay.classList.remove('show');
  state.interval = setInterval(tick, 1000);
  render();
}

function pause() {
  state.status = 'paused';
  clearInterval(state.interval);
  mainBtn.textContent = 'Resume';
  phaseLabel.textContent = 'Paused';
}

function reset() {
  clearInterval(state.interval);
  state.status    = 'idle';
  state.total     = 0;
  state.remaining = 0;
  mainBtn.textContent = 'Start';
  doneOverlay.classList.remove('show');
  ringWrap.classList.remove('urgent');
  setup.classList.remove('hidden');

  // reset visuals
  const mins = Math.max(0, parseInt(inputMin.value) || 0);
  const secs = Math.max(0, Math.min(59, parseInt(inputSec.value) || 0));
  timeDisplay.textContent = fmt(mins * 60 + secs);
  phaseLabel.textContent  = 'Ready';
  setRing(1);
  applyPhase(1);
}

function finish() {
  clearInterval(state.interval);
  state.status    = 'done';
  state.remaining = 0;
  mainBtn.textContent = 'Restart';

  setRing(0);
  ringWrap.classList.remove('urgent');

  // hue → green for done
  document.documentElement.style.setProperty('--hue', '140');
  document.documentElement.style.setProperty('--color', 'hsl(140, 75%, 58%)');
  document.documentElement.style.setProperty('--bg', 'hsl(140, 25%, 8%)');

  doneOverlay.classList.add('show');
  spawnParticles();

  // extra wave of particles
  setTimeout(spawnParticles, 400);
  setTimeout(spawnParticles, 800);
}

// ---------- Button handlers ----------
mainBtn.addEventListener('click', () => {
  if (state.status === 'idle')    { start(); return; }
  if (state.status === 'running') { pause(); return; }
  if (state.status === 'paused')  { start(); return; }
  if (state.status === 'done')    { reset(); }
});

resetBtn.addEventListener('click', reset);

lapBtn.addEventListener('click', () => {
  if (state.status === 'done') return;
  state.total     += 60;
  state.remaining += 60;
  if (state.status === 'idle') {
    // also update input
    const total = (parseInt(inputMin.value)||0)*60 + (parseInt(inputSec.value)||0) + 60;
    inputMin.value = Math.floor(total / 60);
    inputSec.value = total % 60;
    timeDisplay.textContent = fmt(total);
  } else {
    render();
  }
});

// Sync time display with inputs while idle
function syncDisplay() {
  if (state.status !== 'idle') return;
  const mins = Math.max(0, parseInt(inputMin.value) || 0);
  const secs = Math.max(0, Math.min(59, parseInt(inputSec.value) || 0));
  timeDisplay.textContent = fmt(mins * 60 + secs);
}

inputMin.addEventListener('input', syncDisplay);
inputSec.addEventListener('input', syncDisplay);

// Clamp seconds on blur
inputSec.addEventListener('blur', () => {
  let v = parseInt(inputSec.value) || 0;
  if (v > 59) { v = 59; inputSec.value = 59; }
  if (v < 0)  { v = 0;  inputSec.value = 0; }
  syncDisplay();
});

// ---------- Init ----------
syncDisplay();
applyPhase(1);
ringFg.style.strokeDasharray = CIRCUMFERENCE;
ringFg.style.strokeDashoffset = 0;
