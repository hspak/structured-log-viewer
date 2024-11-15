import { HEIGHT_OFFSET } from './constants.mjs';
import { container, fuzzyData, viewportRows, viewportOffset, updateViewportOffset, render } from './render.mjs';

const scrollAreaY = document.createElement("div");
scrollAreaY.classList.add("scroll-area");

const scrollThumbY = document.createElement("div");
scrollThumbY.classList.add("scroll-thumb");

let scrollOffset = 0;
let scrolling = false;
let scrollThumbHeight = 16;

export function resetScroll() {
  scrollOffset = 0;
  scrollBy(0);
}

export function setupScrollListeners() {
  scrollAreaY.addEventListener("mousemove", preventDefault);
  scrollAreaY.addEventListener("mousedown", preventDefault);

  scrollThumbY.addEventListener("mousedown", onThumbMouseDown);

  // https://github.com/WICG/EventListenerOptions/blob/gh-pages/explainer.md
  container.addEventListener("wheel", onContainerWheel);

  container.prepend(scrollThumbY);
  container.prepend(scrollAreaY);

  document.addEventListener('keydown', function(event) {
    switch(event.key) {
      case 'ArrowUp':
      case 'k':
        scrollBy(-20); // Scroll one row up
        break;
      case 'u':
        scrollBy(-200); // Scroll 10 rows up
        break;
      case 'ArrowDown':
      case 'j':
        scrollBy(20); // Scroll one row down
        break;
      case 'd':
        scrollBy(200); // Scroll 10 rows down
        break;
    }
  });
}

function preventDefault(e) {
  e.preventDefault();
}

export function updateScrollThumb() {
  const containerHeight = container.clientHeight;
  const contentHeight = fuzzyData.length * 20; // rowHeight = 20

  if (contentHeight <= containerHeight) {
    scrollThumbY.style.height = '100%';
    scrollThumbY.style.backgroundColor = '#cccccc';
    return;
  }

  // Calculate thumb height based on viewport to content ratio
  const ratio = containerHeight / contentHeight;
  const capped = Math.max(ratio, 0.05);
  scrollThumbHeight = containerHeight * capped;
  scrollThumbY.style.height = `${scrollThumbHeight}px`;
  scrollThumbY.style.backgroundColor = '#555555';

  // Update thumb position based on current scroll offset
  const maxScroll = contentHeight - containerHeight;
  if (maxScroll > 0) {
    const scrollRatio = scrollOffset / maxScroll;
    const thumbOffset = scrollRatio * (containerHeight - scrollThumbHeight);
    scrollThumbY.style.transform = `translateY(${thumbOffset}px)`;
  }
}

function scrollBy(offset) {
  if (scrollThumbY.style.height === '100%') {
    return;
  }

  const rowHeight = ROW_HEIGHT;
  const containerHeight = container.clientHeight;
  const contentHeight = fuzzyData.length * rowHeight;
  const maxScroll = Math.max(0, contentHeight - containerHeight);

  scrollOffset += offset;
  scrollOffset = Math.max(0, Math.min(scrollOffset, maxScroll));

  // Update scroll thumb position
  const scrollRatio = scrollOffset / maxScroll;
  const thumbOffset = scrollRatio * (containerHeight - scrollThumbHeight);
  scrollThumbY.style.transform = `translateY(${thumbOffset}px)`;

  // Update viewport offset for rendering
  updateViewportOffset(scrollOffset);
  render();
}

function onThumbDrag(e) {
  e.preventDefault();
  e.stopPropagation();

  const containerHeight = container.clientHeight;
  const contentHeight = fuzzyData.length * 20; // rowHeight = 20
  const dragRatio = contentHeight / containerHeight;
  
  // Scale the movement based on content/container ratio
  const scrollAmount = e.movementY * dragRatio;
  scrollBy(scrollAmount);
}

function onThumbMouseUp() {
  document.body.style.removeProperty("cursor");
  document.removeEventListener("mousemove", onThumbDrag);
  document.removeEventListener("mouseup", onThumbMouseUp);
}

function onThumbMouseDown(e) {
  e.preventDefault();
  e.stopPropagation();
  document.body.style.setProperty("cursor", "grabbing", "important");
  document.addEventListener("mousemove", onThumbDrag);
  document.addEventListener("mouseup", onThumbMouseUp);
}

function onContainerWheel(e) {
  e.preventDefault();
  e.stopPropagation();

  if (scrolling) {
    return;
  }

  scrolling = true;
  window.requestAnimationFrame(() => {
    // Scale the scroll amount for smoother scrolling
    const scrollAmount = e.deltaY * 2;
    scrollBy(scrollAmount);
    scrolling = false;
  });
}
