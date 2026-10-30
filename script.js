
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
