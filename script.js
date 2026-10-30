
'use strict';

/* ===================================
   ELEMENTS
=================================== */

const viewer = document.getElementById('viewer');
const scene = document.getElementById('viewerWrap');

const rotateBtn = document.getElementById('rotateBtn');
const animationBtn = document.getElementById('animationBtn');

const zoomInBtn = document.getElementById('zoomInBtn');
const zoomOutBtn = document.getElementById('zoomOutBtn');
const resetBtn = document.getElementById('resetBtn');

const pixelBtn = document.getElementById('pixelBtn');
const glitchBtn = document.getElementById('glitchBtn');

const canvas = document.getElementById('fxCanvas');
const ctx = canvas.getContext('2d');

const statusText = document.getElementById('modelStatus');
const loadMessage = document.getElementById('loadMessage');

const progressBar = document.querySelector('.progress-bar');
const updateBar = document.querySelector('.update-bar');

/* ===================================
   INITIAL SETTINGS
=================================== */

const initialOrbit = '3.728deg 79.56deg 370.7m';
const initialFov = '30deg';

let rotating = true;
let animating = true;

let ready = false;
let hasAnimations = false;

let effect = 'none';

let effectTimer = null;
let rendering = false;
let effectGeneration = 0;

/* ===================================
   MODEL CONTROLS
=================================== */

function updateButtons() {
  rotateBtn.textContent = rotating
    ? '⏸ Остановить вращение'
    : '▶ Включить вращение';

  animationBtn.textContent = animating
    ? '⏸ Остановить анимацию'
    : '▶ Запустить анимацию';

  rotateBtn.setAttribute('aria-pressed', String(rotating));
  animationBtn.setAttribute('aria-pressed', String(animating));
}

rotateBtn.addEventListener('click', () => {
  rotating = !rotating;
  viewer.autoRotate = rotating;
  updateButtons();
});

animationBtn.addEventListener('click', () => {
  if (!ready || !hasAnimations) return;

  animating = !animating;

  if (animating) {
    viewer.play();
  } else {
    viewer.pause();
  }

  updateButtons();
});

/* ===================================
   ZOOM
=================================== */

function zoom(multiplier) {
  const current = parseFloat(
    viewer.getAttribute('field-of-view') || initialFov
  );

  const next = Math.min(
    60,
    Math.max(12, current * multiplier)
  );

  viewer.setAttribute(
    'field-of-view',
    `${next.toFixed(2)}deg`
  );
}

zoomInBtn.addEventListener('click', () => zoom(0.8));
zoomOutBtn.addEventListener('click', () => zoom(1.25));

resetBtn.addEventListener('click', () => {
  viewer.setAttribute('camera-orbit', initialOrbit);
  viewer.setAttribute('field-of-view', initialFov);
  viewer.jumpCameraToGoal();
});

/* ===================================
   CANVAS SIZE
=================================== */

function resizeCanvas() {
  const rect = viewer.getBoundingClientRect();

  // Ограничиваем разрешение для мобильных
  const scale = Math.min(
    window.devicePixelRatio || 1,
    1.5
  );

  canvas.width = Math.max(
    1,
    Math.round(rect.width * scale)
  );

  canvas.height = Math.max(
    1,
    Math.round(rect.height * scale)
  );
}

/* ===================================
   FRAME CAPTURE
=================================== */

async function captureFrame() {
  const url = viewer.toDataURL('image/png');

  if (!url || url === 'data:,') {
    throw new Error('Пустой кадр');
  }

  const image = new Image();
  image.src = url;

  await image.decode();

  return image;
}

/* ===================================
   PIXELATE
=================================== */

const smallCanvas = document.createElement('canvas');
const smallCtx = smallCanvas.getContext('2d');

function drawPixelate(image) {
  const w = canvas.width;
  const h = canvas.height;

  // Размер пикселей
  const pixelSize = 14;

  smallCanvas.width = Math.max(
    1,
    Math.ceil(w / pixelSize)
  );

  smallCanvas.height = Math.max(
    1,
    Math.ceil(h / pixelSize)
  );

  smallCtx.imageSmoothingEnabled = true;

  smallCtx.clearRect(
    0, 0,
    smallCanvas.width,
    smallCanvas.height
  );

  smallCtx.drawImage(
    image,
    0, 0,
    smallCanvas.width,
    smallCanvas.height
  );

  ctx.imageSmoothingEnabled = false;

  ctx.clearRect(0, 0, w, h);

  ctx.drawImage(
    smallCanvas,
    0, 0,
    smallCanvas.width,
    smallCanvas.height,
    0, 0,
    w, h
  );
}

/* ===================================
   GLITCH
=================================== */

const tempCanvas = document.createElement('canvas');
const tempCtx = tempCanvas.getContext('2d');

function drawGlitch(image) {
  const w = canvas.width;
  const h = canvas.height;

  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(image, 0, 0, w, h);

  // Копия кадра
  tempCanvas.width = w;
  tempCanvas.height = h;

  tempCtx.drawImage(canvas, 0, 0);

  // Разделение цветовых каналов
  const source = tempCtx.getImageData(0, 0, w, h);
  const output = ctx.createImageData(w, h);

  const src = source.data;
  const dst = output.data;

  const shift = Math.max(
    2,
    Math.round(w * 0.007)
  );

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;

      const rx = Math.min(w - 1, x + shift);
      const bx = Math.max(0, x - shift);

      const ri = (y * w + rx) * 4;
      const bi = (y * w + bx) * 4;

      dst[i] = src[ri];
      dst[i + 1] = src[i + 1];
      dst[i + 2] = src[bi + 2];
      dst[i + 3] = 255;
    }
  }

  ctx.putImageData(output, 0, 0);

  // Случайные горизонтальные сдвиги
  tempCtx.clearRect(0, 0, w, h);
  tempCtx.drawImage(canvas, 0, 0);

  const strips = 4 + Math.floor(Math.random() * 5);

  for (let i = 0; i < strips; i++) {
    const y = Math.floor(Math.random() * h);

    const stripHeight = Math.max(
      2,
      Math.floor(Math.random() * h * 0.04)
    );

    const height = Math.min(
      stripHeight,
      h - y
    );

    const offset = Math.round(
      (Math.random() - 0.5) * w * 0.1
    );

    ctx.drawImage(
      tempCanvas,
      0, y, w, height,
      offset, y, w, height
    );
  }

  // Линии сканирования
  ctx.fillStyle = 'rgba(0,0,0,0.08)';

  for (let y = 0; y < h; y += 5) {
    ctx.fillRect(0, y, w, 1);
  }
}

/* ===================================
   EFFECT RENDERING
=================================== */

async function renderEffect(token) {
  if (!ready || effect === 'none' || rendering) {
    return;
  }

  rendering = true;

  try {
    const image = await captureFrame();

    if (
      token !== effectGeneration ||
      effect === 'none'
    ) {
      return;
    }

    resizeCanvas();

    if (effect === 'pixel') {
      drawPixelate(image);
    }

    if (effect === 'glitch') {
      drawGlitch(image);
    }

    canvas.classList.add('visible');

  } catch (error) {
    console.error('Ошибка эффекта:', error);

    if (token === effectGeneration) {
      stopEffect();

      statusText.textContent =
        'Не удалось обработать кадр модели в этом браузере.';
    }

  } finally {
    rendering = false;
  }
}

/* ===================================
   EFFECT SWITCHING
=================================== */

function updateEffectButtons() {
  pixelBtn.classList.toggle(
    'active',
    effect === 'pixel'
  );

  glitchBtn.classList.toggle(
    'active',
    effect === 'glitch'
  );

  pixelBtn.setAttribute(
    'aria-pressed',
    String(effect === 'pixel')
  );

  glitchBtn.setAttribute(
    'aria-pressed',
    String(effect === 'glitch')
  );
}

function stopEffect() {
  effectGeneration++;

  if (effectTimer !== null) {
    clearInterval(effectTimer);
    effectTimer = null;
  }

  effect = 'none';

  canvas.classList.remove('visible');

  updateEffectButtons();
}

function startEffect(next) {
  if (!ready) {
    statusText.textContent =
      'Дождитесь загрузки модели.';
    return;
  }

  if (effect === next) {
    stopEffect();
    return;
  }

  stopEffect();

  effect = next;

  updateEffectButtons();

  const token = effectGeneration;

  // Сразу рисуем первый кадр
  renderEffect(token);

  // Далее обновляем до 10 раз в секунду
  effectTimer = setInterval(() => {
    renderEffect(token);
  }, 100);
}

pixelBtn.addEventListener('click', () => {
  startEffect('pixel');
});

glitchBtn.addEventListener('click', () => {
  startEffect('glitch');
});

/* ===================================
   MODEL LOADING
=================================== */

viewer.addEventListener('progress', event => {
  const progress = event.detail?.totalProgress ?? 0;

  updateBar.style.width =
    `${Math.round(progress * 100)}%`;

  if (progress >= 1) {
    progressBar.classList.add('hide');
  }
});

viewer.addEventListener('load', () => {
  ready = true;

  loadMessage.hidden = true;
  progressBar.classList.add('hide');

  const animations = viewer.availableAnimations || [];

  hasAnimations = animations.length > 0;

  animationBtn.disabled = !hasAnimations;

  if (hasAnimations) {
    if (!viewer.animationName) {
      viewer.animationName = animations[0];
    }

    if (animating) {
      viewer.play();
    }

    statusText.textContent =
      `Модель загружена · Анимаций: ${animations.length}`;
  } else {
    animating = false;

    statusText.textContent =
      'Модель загружена · Встроенных анимаций нет';
  }

  updateButtons();
});

viewer.addEventListener('error', event => {
  loadMessage.hidden = false;

  loadMessage.textContent =
    'Не удалось загрузить 3D-модель.';

  statusText.textContent =
    'Ошибка загрузки модели';

  console.error(event);
});

/* ===================================
   AR AND PAGE EVENTS
=================================== */

viewer.addEventListener('ar-status', event => {
  if (event.detail.status === 'session-started') {
    stopEffect();
  }
});

window.addEventListener('pagehide', stopEffect);

window.addEventListener('resize', () => {
  if (effect !== 'none') {
    resizeCanvas();
  }
});

/* ===================================
   INITIAL STATE
=================================== */

animationBtn.disabled = true;

updateButtons();
updateEffectButtons();
