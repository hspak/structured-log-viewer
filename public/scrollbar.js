import { HEIGHT_OFFSET } from './constants.js';
import { container, fuzzyData, viewportRows, viewportOffset, updateViewportOffset, render } from './render.js';

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
        if (viewportOffset > 0 ) {
          scrollBy(-1);
          updateScrollThumb();
          render(true);
        }
        break;
      case 'u':
        if (viewportOffset > 0 ) {
          scrollBy(-10);
          updateScrollThumb();
          render(true);
        }
        break;
      case 'ArrowDown':
      case 'j':
        if (viewportOffset < (fuzzyData.length - viewportRows.length)) {
          scrollBy(1);
          updateScrollThumb();
          render(true);
        }
        break;
      case 'd':
        if (viewportOffset < (fuzzyData.length - viewportRows.length)) {
          scrollBy(10);
          updateScrollThumb();
          render(true);
        }
        break;
    }
  });
}

function preventDefault(e) {
  e.preventDefault();
}

export function updateScrollThumb() {
  if (fuzzyData.length <= viewportRows.length) {
    scrollThumbY.style.height = '100%';
    scrollThumbY.style.backgroundColor = '#cccccc';
    return;
  } else {
    const ratio = viewportRows.length / fuzzyData.length;
    const capped = Math.max(ratio, 0.05);
    scrollThumbHeight = (container.clientHeight - HEIGHT_OFFSET) * capped;
    scrollThumbY.style.height = `${scrollThumbHeight}px`;
    scrollThumbY.style.backgroundColor = '#555555';
  }

  // Ensure that the scrollbar stays above the browser when resizing.
  const windowHeight = container.clientHeight + HEIGHT_OFFSET;
  if (windowHeight < scrollThumbY.getBoundingClientRect().bottom) {
    scrollBy(windowHeight - scrollThumbY.getBoundingClientRect().bottom);
  }
}

function scrollBy(offset) {
  if (scrollThumbY.style.height === '100%') {
    return;
  }

  scrollOffset += offset;

  const windowHeight = container.clientHeight + HEIGHT_OFFSET;
  const min = Math.min(scrollOffset, windowHeight);
  scrollOffset = Math.max(0, min);
  scrollThumbY.style.transform = `translateY(${scrollOffset}px)`;

  let ratio = Math.min(1, (scrollOffset + scrollThumbHeight + HEIGHT_OFFSET) / (windowHeight));

  updateViewportOffset(scrollOffset > 0
    ? Math.max(0, Math.floor(ratio * fuzzyData.length) - viewportRows.length)
    : 0);

  render(true);
}

function onThumbDrag(e) {
  e.preventDefault();
  e.stopPropagation();
  scrollOffset += e.movementY;

  // TODO math is VERY off.
  scrollBy(e.movementY);
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
    // TODO: Probably not sufficient
    const capped = e.deltaY > 0 ? Math.min(e.deltaY, 3) : Math.max(e.deltaY, -3);
    scrollBy(capped);
    scrolling = false;
  });
}
