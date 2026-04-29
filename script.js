// ---------- Color Math ----------

function hexToHsl(hex) {
  let r = parseInt(hex.slice(1,3),16)/255;
  let g = parseInt(hex.slice(3,5),16)/255;
  let b = parseInt(hex.slice(5,7),16)/255;
  const max = Math.max(r,g,b), min = Math.min(r,g,b);
  let h, s, l = (max+min)/2;
  if (max === min) { h = s = 0; }
  else {
    const d = max - min;
    s = l > 0.5 ? d/(2-max-min) : d/(max+min);
    switch(max){
      case r: h = ((g-b)/d + (g<b?6:0))/6; break;
      case g: h = ((b-r)/d + 2)/6; break;
      case b: h = ((r-g)/d + 4)/6; break;
    }
  }
  return [h*360, s*100, l*100];
}

function hslToHex(h, s, l) {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(100, s));
  l = Math.max(0, Math.min(100, l));
  s /= 100; l /= 100;
  const c = (1 - Math.abs(2*l-1)) * s;
  const x = c * (1 - Math.abs((h/60)%2-1));
  const m = l - c/2;
  let r=0,g=0,b=0;
  if      (h<60)  { r=c; g=x; b=0; }
  else if (h<120) { r=x; g=c; b=0; }
  else if (h<180) { r=0; g=c; b=x; }
  else if (h<240) { r=0; g=x; b=c; }
  else if (h<300) { r=x; g=0; b=c; }
  else            { r=c; g=0; b=x; }
  const toHex = v => Math.round((v+m)*255).toString(16).padStart(2,'0');
  return '#' + toHex(r) + toHex(g) + toHex(b);
}

function jitter(val, amount) {
  return val + (Math.random() - 0.5) * amount;
}

// ---------- Palette Generators ----------

function generateComplementary(hex) {
  const [h,s,l] = hexToHsl(hex);
  return [
    hex,
    hslToHex(h, jitter(s,8), jitter(l+15,5)),
    hslToHex(h, jitter(s-10,6), jitter(l-15,5)),
    hslToHex(h+180, jitter(s,8), jitter(l,8)),
    hslToHex(h+180, jitter(s-8,6), jitter(l+15,5)),
    hslToHex(h+180, jitter(s,6), jitter(l-15,5)),
    hslToHex(h, jitter(s-20,6), jitter(l+25,5)),
  ];
}

function generateAnalogous(hex) {
  const [h,s,l] = hexToHsl(hex);
  return [
    hslToHex(h-60, jitter(s,8), jitter(l,6)),
    hslToHex(h-30, jitter(s,6), jitter(l,5)),
    hex,
    hslToHex(h+30, jitter(s,6), jitter(l,5)),
    hslToHex(h+60, jitter(s,8), jitter(l,6)),
    hslToHex(h+90, jitter(s-5,6), jitter(l+5,5)),
    hslToHex(h-90, jitter(s-5,6), jitter(l+5,5)),
  ];
}

function generateTriadic(hex) {
  const [h,s,l] = hexToHsl(hex);
  return [
    hex,
    hslToHex(h, jitter(s-10,6), jitter(l+20,5)),
    hslToHex(h+120, jitter(s,8), jitter(l,6)),
    hslToHex(h+120, jitter(s-8,6), jitter(l+18,5)),
    hslToHex(h+240, jitter(s,8), jitter(l,6)),
    hslToHex(h+240, jitter(s-8,6), jitter(l+18,5)),
    hslToHex(h, jitter(s-20,8), jitter(l-20,5)),
  ];
}

function generateShades(hex) {
  const [h,s] = hexToHsl(hex);
  return [
    hslToHex(h, s*0.4, 92),
    hslToHex(h, s*0.6, 78),
    hslToHex(h, s*0.8, 60),
    hex,
    hslToHex(h, s*0.9, 38),
    hslToHex(h, s*0.95, 24),
    hslToHex(h, s, 12),
  ];
}

const generators = {
  complementary: generateComplementary,
  analogous:     generateAnalogous,
  triadic:       generateTriadic,
  shades:        generateShades,
};

// ---------- State ----------

let currentHex = '#FF6B6B';
let currentMode = 'complementary';
let palette = [];       // array of { hex, locked }
let initialized = false;

// ---------- DOM ----------

const hexInput     = document.getElementById('hexInput');
const inputPreview = document.getElementById('inputPreview');
const paletteEl    = document.getElementById('palette');
const regenBtn     = document.getElementById('regenerateBtn');
const toast        = document.getElementById('toast');
const tabs         = document.querySelectorAll('.tab');

// ---------- Rendering ----------

function isValidHex(h) { return /^#[0-9A-Fa-f]{6}$/.test(h); }

function luminance(hex) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return (0.299*r + 0.587*g + 0.114*b) / 255;
}

function colorName(hex) {
  const [h,s,l] = hexToHsl(hex);
  if (s < 8) return l > 70 ? 'Light Gray' : l < 30 ? 'Dark Gray' : 'Gray';
  const hNames = ['Red','Orange','Yellow','Lime','Green','Teal','Cyan','Sky','Blue','Indigo','Violet','Purple','Pink','Rose'];
  const idx = Math.round(h / (360/hNames.length)) % hNames.length;
  const prefix = l > 70 ? 'Light ' : l < 35 ? 'Dark ' : '';
  return prefix + hNames[idx];
}

function buildPalette(hex) {
  const colors = generators[currentMode](hex);
  if (!initialized || palette.length !== colors.length) {
    palette = colors.map(c => ({ hex: c, locked: false }));
    initialized = true;
  } else {
    palette = palette.map((p, i) => p.locked ? p : { hex: colors[i], locked: false });
  }
}

function renderPalette() {
  paletteEl.innerHTML = '';
  palette.forEach((item, i) => {
    const lum = luminance(item.hex);
    const textColor = lum > 0.5 ? '#111' : '#fff';

    const swatch = document.createElement('div');
    swatch.className = 'swatch' + (item.locked ? ' locked' : '');
    swatch.style.setProperty('--delay', i * 0.04 + 's');
    swatch.style.animationDelay = i * 0.04 + 's';

    swatch.innerHTML = `
      <div class="swatch-color" style="background:${item.hex}"></div>
      <div class="swatch-info">
        <div class="swatch-hex">${item.hex.toUpperCase()}</div>
        <div class="swatch-name">${colorName(item.hex)}</div>
        <div class="swatch-actions">
          <button class="lock-btn" title="${item.locked ? 'Unlock' : 'Lock'}">
            ${item.locked
              ? '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> Locked'
              : '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg> Lock'}
          </button>
          <span class="copy-hint">click to copy</span>
        </div>
      </div>`;

    swatch.querySelector('.lock-btn').addEventListener('click', e => {
      e.stopPropagation();
      palette[i].locked = !palette[i].locked;
      renderPalette();
    });

    swatch.addEventListener('click', () => copyHex(item.hex));

    paletteEl.appendChild(swatch);
  });
}

function update(hex) {
  if (!isValidHex(hex)) return;
  currentHex = hex;
  inputPreview.style.background = hex;
  buildPalette(hex);
  renderPalette();
}

// ---------- Toast ----------

let toastTimer;
function copyHex(hex) {
  navigator.clipboard.writeText(hex).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = hex; document.body.appendChild(ta);
    ta.select(); document.execCommand('copy');
    document.body.removeChild(ta);
  });
  toast.textContent = `Copied ${hex.toUpperCase()}`;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 1800);
}

// ---------- Events ----------

hexInput.addEventListener('input', () => {
  const val = '#' + hexInput.value.replace(/[^0-9a-fA-F]/g,'').slice(0,6);
  inputPreview.style.background = val.length === 7 ? val : '#555';
  if (val.length === 7) {
    initialized = false; // allow fresh palette on new valid input
    update(val);
  }
});

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    tabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentMode = tab.dataset.mode;
    initialized = false;
    if (isValidHex(currentHex)) update(currentHex);
  });
});

regenBtn.addEventListener('click', () => {
  if (isValidHex(currentHex)) {
    const colors = generators[currentMode](currentHex);
    palette = palette.map((p, i) => p.locked ? p : { hex: colors[i], locked: false });
    renderPalette();
  }
});

// ---------- Init ----------

hexInput.value = 'FF6B6B';
inputPreview.style.background = currentHex;
buildPalette(currentHex);
renderPalette();
