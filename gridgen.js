const state = {
  image: null,
  imageName: '',
  gridMode: 'cells',
  cols: 10,
  rows: 10,
  cellSize: 50,
  color: '#000000',
  thickness: 2,
  opacity: 1.0,
  showLabels: true,
  labelStyle: 'chess',
  labelPosition: 'outside',
  origin: 'top-left'
};

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// ---------- File upload ----------
const fileInput = document.getElementById('fileInput');
const uploadEmpty = document.getElementById('uploadEmpty');
const uploadFilled = document.getElementById('uploadFilled');
const fileNameEl = document.getElementById('fileName');

fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) loadImage(file);
});

function loadImage(file) {
  if (!file.type.startsWith('image/')) {
    alert('Please upload an image file (PNG, JPG, WEBP).');
    return;
  }
  state.imageName = file.name;
  const reader = new FileReader();
  reader.onload = (ev) => {
    const img = new Image();
    img.onload = () => {
      state.image = img;
      uploadEmpty.style.display = 'none';
      uploadFilled.style.display = 'block';
      fileNameEl.textContent = file.name;
      document.getElementById('previewEmpty').style.display = 'none';
      document.getElementById('previewContainer').style.display = 'flex';
      document.getElementById('exportBtn').disabled = false;
      render();
      loadJsPDF(); // warm up the PDF library in the background once an image is ready
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
}

// Drag & drop on preview
const preview = document.getElementById('preview');
['dragenter', 'dragover'].forEach(evt => {
  preview.addEventListener(evt, (e) => {
    e.preventDefault();
    preview.classList.add('dragging');
  });
});
['dragleave', 'drop'].forEach(evt => {
  preview.addEventListener(evt, (e) => {
    e.preventDefault();
    preview.classList.remove('dragging');
  });
});
preview.addEventListener('drop', (e) => {
  const file = e.dataTransfer.files[0];
  if (file) loadImage(file);
});

// ---------- Grid mode tabs ----------
document.querySelectorAll('.tabs button').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tabs button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.gridMode = btn.dataset.mode;
    document.getElementById('cellsControls').style.display = state.gridMode === 'cells' ? 'block' : 'none';
    document.getElementById('sizeControls').style.display = state.gridMode === 'size' ? 'block' : 'none';
    render();
  });
});

// ---------- Number inputs ----------
document.getElementById('cols').addEventListener('input', (e) => {
  const v = parseInt(e.target.value);
  if (isNaN(v)) return;
  state.cols = Math.max(1, Math.min(100, v));
  render();
});
document.getElementById('rows').addEventListener('input', (e) => {
  const v = parseInt(e.target.value);
  if (isNaN(v)) return;
  state.rows = Math.max(1, Math.min(100, v));
  render();
});
document.getElementById('cellSize').addEventListener('input', (e) => {
  const v = parseInt(e.target.value);
  if (isNaN(v)) return;
  state.cellSize = Math.max(5, Math.min(500, v));
  document.getElementById('cellSizeVal').textContent = state.cellSize;
  render();
});

// ---------- Color ----------
function setActiveSwatch(swatch) {
  document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
  swatch.classList.add('active');
}
document.querySelectorAll('.color-swatch[data-color]').forEach(sw => {
  sw.addEventListener('click', () => {
    setActiveSwatch(sw);
    state.color = sw.dataset.color;
    render();
  });
});
document.getElementById('customColorInput').addEventListener('input', (e) => {
  setActiveSwatch(document.getElementById('customColor'));
  state.color = e.target.value;
  render();
});

// ---------- Thickness, opacity ----------
document.getElementById('thickness').addEventListener('input', (e) => {
  state.thickness = parseInt(e.target.value);
  document.getElementById('thicknessVal').textContent = state.thickness;
  render();
});
document.getElementById('opacity').addEventListener('input', (e) => {
  state.opacity = parseInt(e.target.value) / 100;
  document.getElementById('opacityVal').textContent = parseInt(e.target.value);
  render();
});

// ---------- Labels toggle ----------
const labelsToggle = document.getElementById('labelsToggle');
const labelControls = document.getElementById('labelControls');
labelsToggle.addEventListener('click', () => {
  state.showLabels = !state.showLabels;
  labelsToggle.classList.toggle('on', state.showLabels);
  labelControls.classList.toggle('disabled', !state.showLabels);
  render();
});

// ---------- Segmented controls ----------
document.querySelectorAll('.segmented').forEach(seg => {
  const name = seg.dataset.name;
  seg.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      seg.querySelectorAll('button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const value = btn.dataset.value;
      if (name === 'style') state.labelStyle = value;
      else if (name === 'position') state.labelPosition = value;
      else if (name === 'origin') state.origin = value;
      render();
    });
  });
});

// ---------- Export ----------
document.getElementById('exportBtn').addEventListener('click', exportPDF);

// ---------- Helpers ----------
function getColumnLabel(i) {
  if (state.labelStyle === 'numeric') return String(i + 1);
  // Chess style: A, B, ..., Z, AA, AB, ...
  let label = '';
  let n = i;
  while (n >= 0) {
    label = String.fromCharCode(65 + (n % 26)) + label;
    n = Math.floor(n / 26) - 1;
  }
  return label;
}

function hexToRgb(hex) {
  const m = hex.replace('#', '');
  const full = m.length === 3 ? m.split('').map(c => c + c).join('') : m;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16)
  };
}
function isLight(hex) {
  const { r, g, b } = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) > 186;
}

// ---------- Render ----------
function render() {
  if (!state.image) return;
  const img = state.image;

  let cellW, cellH, cols, rows;
  if (state.gridMode === 'cells') {
    cols = state.cols;
    rows = state.rows;
    cellW = img.width / cols;
    cellH = img.height / rows;
  } else {
    cellW = state.cellSize;
    cellH = state.cellSize;
    cols = Math.ceil(img.width / cellW);
    rows = Math.ceil(img.height / cellH);
  }

  const baseMargin = Math.max(36, Math.min(img.width, img.height) * 0.045);
  const useOutside = state.showLabels && state.labelPosition === 'outside';
  const labelMargin = useOutside ? baseMargin : 0;

  canvas.width = img.width + labelMargin;
  canvas.height = img.height + labelMargin;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.drawImage(img, labelMargin, labelMargin);

  ctx.strokeStyle = state.color;
  ctx.globalAlpha = state.opacity;
  ctx.lineWidth = state.thickness;
  ctx.lineCap = 'square';

  for (let i = 0; i <= cols; i++) {
    const x = labelMargin + Math.min(i * cellW, img.width);
    ctx.beginPath();
    ctx.moveTo(x, labelMargin);
    ctx.lineTo(x, labelMargin + img.height);
    ctx.stroke();
  }
  for (let i = 0; i <= rows; i++) {
    const y = labelMargin + Math.min(i * cellH, img.height);
    ctx.beginPath();
    ctx.moveTo(labelMargin, y);
    ctx.lineTo(labelMargin + img.width, y);
    ctx.stroke();
  }

  ctx.globalAlpha = 1;

  if (state.showLabels) {
    if (state.labelPosition === 'outside') {
      const labelColor = isLight(state.color) ? '#171717' : state.color;
      ctx.fillStyle = labelColor;
      const fontSize = Math.max(11, baseMargin * 0.42);
      ctx.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, 'Inter', sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      for (let i = 0; i < cols; i++) {
        const cellLeft = i * cellW;
        const cellRight = Math.min((i + 1) * cellW, img.width);
        const cx = labelMargin + (cellLeft + cellRight) / 2;
        ctx.fillText(getColumnLabel(i), cx, labelMargin / 2);
      }
      for (let i = 0; i < rows; i++) {
        const cellTop = i * cellH;
        const cellBottom = Math.min((i + 1) * cellH, img.height);
        const cy = labelMargin + (cellTop + cellBottom) / 2;
        const rowIdx = state.origin === 'top-left' ? i : rows - 1 - i;
        ctx.fillText(String(rowIdx + 1), labelMargin / 2, cy);
      }
    } else {
      const fontSize = Math.max(10, Math.min(cellW, cellH) * 0.22);
      ctx.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, 'Inter', sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      const pad = Math.max(2, fontSize * 0.25);
      const haloColor = isLight(state.color) ? '#000000' : '#ffffff';

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const rowIdx = state.origin === 'top-left' ? r : rows - 1 - r;
          const label = state.labelStyle === 'chess'
            ? getColumnLabel(c) + (rowIdx + 1)
            : `${c + 1},${rowIdx + 1}`;
          const x = labelMargin + c * cellW + pad;
          const y = labelMargin + r * cellH + pad;
          ctx.lineWidth = Math.max(2, fontSize * 0.18);
          ctx.strokeStyle = haloColor;
          ctx.globalAlpha = 0.7;
          ctx.strokeText(label, x, y);
          ctx.globalAlpha = 1;
          ctx.fillStyle = state.color;
          ctx.fillText(label, x, y);
        }
      }
    }
  }

  const info = document.getElementById('infoBar');
  info.innerHTML = `
    <span>${cols} × ${rows} cells</span>
    <span>${Math.round(cellW)} × ${Math.round(cellH)} px each</span>
    <span>${img.width} × ${img.height} px image</span>
  `;
}

// ---------- PDF export ----------
// jsPDF is loaded on demand (on image upload or first export) rather than up
// front, so visitors who never export don't pay for the ~360KB library.
const JSPDF_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
let jspdfPromise = null;
function loadJsPDF() {
  if (window.jspdf) return Promise.resolve();
  if (!jspdfPromise) {
    jspdfPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = JSPDF_SRC;
      s.onload = resolve;
      s.onerror = () => { jspdfPromise = null; reject(new Error('Failed to load jsPDF')); };
      document.head.appendChild(s);
    });
  }
  return jspdfPromise;
}

async function exportPDF() {
  if (!state.image) return;
  const btn = document.getElementById('exportBtn');
  btn.disabled = true;
  try {
    await loadJsPDF();
    const { jsPDF } = window.jspdf;

    const w = canvas.width;
    const h = canvas.height;
    const orientation = w > h ? 'landscape' : 'portrait';

    const pdf = new jsPDF({
      orientation,
      unit: 'pt',
      format: 'a4',
      compress: true
    });

    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 24;
    const availW = pageW - 2 * margin;
    const availH = pageH - 2 * margin;

    const scale = Math.min(availW / w, availH / h);
    const drawW = w * scale;
    const drawH = h * scale;
    const x = (pageW - drawW) / 2;
    const y = (pageH - drawH) / 2;

    const imgData = canvas.toDataURL('image/png');
    pdf.addImage(imgData, 'PNG', x, y, drawW, drawH);

    const baseName = (state.imageName.replace(/\.[^.]+$/, '') || 'grid-map').trim();
    pdf.save(`${baseName || 'grid-map'}-grid.pdf`);
  } catch (err) {
    alert('Could not generate the PDF — please check your connection and try again.');
  } finally {
    btn.disabled = false;
  }
}