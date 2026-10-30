
'use strict';

const viewer = document.getElementById('viewer');

const rotateBtn = document.getElementById('rotateBtn');
const animationBtn = document.getElementById('animationBtn');

const zoomInBtn = document.getElementById('zoomInBtn');
const zoomOutBtn = document.getElementById('zoomOutBtn');
const resetBtn = document.getElementById('resetBtn');

const statusText = document.getElementById('modelStatus');
const loadMessage = document.getElementById('loadMessage');

const progressBar = document.querySelector('.progress-bar');
const updateBar = document.querySelector('.update-bar');

// Исходные параметры камеры

const initialOrbit = '3.728deg 79.56deg 370.7m';
const initialFov = '30deg';

// Состояния

let rotating = true;
let animating = true;
let hasAnimations = false;
let ready = false;

// Обновление надписей на кнопках

function updateButtons() {

  rotateBtn.textContent = rotating
    ? '⏸ Остановить вращение'
    : '▶ Включить вращение';

  rotateBtn.setAttribute('aria-pressed', String(rotating));

  animationBtn.textContent = animating
    ? '⏸ Остановить анимацию'
    : '▶ Запустить анимацию';

  animationBtn.setAttribute('aria-pressed', String(animating));
}

// Вращение

rotateBtn.addEventListener('click', () => {

  rotating = !rotating;

  viewer.autoRotate = rotating;

  updateButtons();

});

// Управление анимацией

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

// Масштабирование

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

zoomInBtn.addEventListener('click', () => {
  zoom(0.8);
});

zoomOutBtn.addEventListener('click', () => {
  zoom(1.25);
});

// Сброс положения камеры

resetBtn.addEventListener('click', () => {

  viewer.setAttribute('camera-orbit', initialOrbit);
  viewer.setAttribute('field-of-view', initialFov);

  viewer.jumpCameraToGoal();

});

// Прогресс загрузки модели

viewer.addEventListener('progress', event => {

  const progress = event.detail?.totalProgress ?? 0;

  updateBar.style.width =
    `${Math.round(progress * 100)}%`;

  if (progress >= 1) {
    progressBar.classList.add('hide');
  }

});

// После загрузки модели

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
      `Модель загружена · Анимаций: ${animations.length} · Управляйте сценой мышью`;

  } else {

    animating = false;

    statusText.textContent =
      'Модель загружена · В файле нет встроенных анимаций';

  }

  updateButtons();

});

// Ошибка загрузки

viewer.addEventListener('error', event => {

  loadMessage.hidden = false;

  loadMessage.textContent =
    'Не удалось загрузить модель. Проверьте GLB-файл.';

  statusText.textContent =
    'Ошибка загрузки 3D-модели';

  console.error('Ошибка model-viewer:', event);

});

// Начальное состояние

animationBtn.disabled = true;

updateButtons();

/* ===== ДОПОЛНИТЕЛЬНЫЕ ЭФФЕКТЫ 3D-СЦЕНЫ ===== */

(function () {
  const scene = document.querySelector('.viewer-wrap');
  const model = document.querySelector('model-viewer');

  if (!scene || !model) {
    console.warn('Область 3D-сцены не найдена');
    return;
  }

  // Добавляем стили эффектов, не меняя styles.css
  const styles = document.createElement('style');

  styles.textContent = `
    .viewer-wrap {
      position: relative;
      isolation: isolate;
    }

    .fx-button {
      position: absolute;
      top: 50%;
      z-index: 20;
      transform: translateY(-50%);
      width: 86px;
      min-height: 86px;
      padding: 12px 6px;
      border: 1px solid #e8e1d8;
      border-radius: 14px;
      background: rgba(255,255,255,.94);
      color: #25344a;
      font-family: inherit;
      font-size: 10px;
      font-weight: 800;
      cursor: pointer;
      box-shadow: 0 8px 25px rgba(37,52,74,.09);
      transition: background .2s, color .2s;
    }

    .fx-button:hover {
      background: #f7e7e9;
    }

    .fx-button.active {
      background: #25344a;
      color: white;
    }

    .fx-left { left: 15px; }
    .fx-right { right: 15px; }

    .fx-button span {
      display: block;
      font-size: 25px;
      margin-bottom: 7px;
    }

    .viewer-wrap.fx-pixel model-viewer {
      filter: contrast(1.6) saturate(1.8);
    }

    .fx-pixel-overlay {
      position: absolute;
      inset: 0;
      z-index: 4;
      pointer-events: none;
      display: none;
      background:
        repeating-linear-gradient(
          90deg,
          rgba(37,52,74,.12) 0 3px,
          transparent 3px 12px
        ),
        repeating-linear-gradient(
          0deg,
          rgba(37,52,74,.12) 0 3px,
          transparent 3px 12px
        );
      background-blend-mode: multiply;
    }

    .viewer-wrap.fx-pixel .fx-pixel-overlay {
      display: block;
    }

    .viewer-wrap.fx-glitch model-viewer {
      filter:
        contrast(1.4)
        saturate(1.9)
        drop-shadow(5px 0 rgba(255,0,90,.5))
        drop-shadow(-5px 0 rgba(0,220,255,.5));
      animation: fx-glitch-shake .16s steps(2) infinite;
    }

    @keyframes fx-glitch-shake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(2px); }
      50% { transform: translateX(-2px); }
      75% { transform: translateX(1px); }
    }

    @media(max-width:650px) {
      .fx-button {
        width: 60px;
        min-height: 68px;
        font-size: 8px;
      }

      .fx-button span {
        font-size: 20px;
      }

      .fx-left { left: 7px; }
      .fx-right { right: 7px; }
    }
  `;

  document.head.appendChild(styles);

  // Создаём кнопки
  const pixelButton = document.createElement('button');
  pixelButton.className = 'fx-button fx-left';
  pixelButton.innerHTML = '<span>▦</span>PIXELATE';
  pixelButton.type = 'button';

  const glitchButton = document.createElement('button');
  glitchButton.className = 'fx-button fx-right';
  glitchButton.innerHTML = '<span>⚡</span>GLITCH';
  glitchButton.type = 'button';

  const pixelOverlay = document.createElement('div');
  pixelOverlay.className = 'fx-pixel-overlay';

  scene.appendChild(pixelOverlay);
  scene.appendChild(pixelButton);
  scene.appendChild(glitchButton);

  let current = 'normal';

  function activate(effect) {
    current = current === effect ? 'normal' : effect;

    scene.classList.toggle('fx-pixel', current === 'pixel');
    scene.classList.toggle('fx-glitch', current === 'glitch');

    pixelButton.classList.toggle('active', current === 'pixel');
    glitchButton.classList.toggle('active', current === 'glitch');

    pixelButton.setAttribute(
      'aria-pressed',
      String(current === 'pixel')
    );

    glitchButton.setAttribute(
      'aria-pressed',
      String(current === 'glitch')
    );
  }

  pixelButton.addEventListener('click', () => activate('pixel'));
  glitchButton.addEventListener('click', () => activate('glitch'));
})();
