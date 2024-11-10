import { HEIGHT_OFFSET } from './constants.js';
import { container, fuzzyData, viewportRows, viewportOffset, updateViewportOffset, render } from './render.js';

const scrollAreaY = document.createElement("div");
scrollAreaY.classList.add("scroll-area");

const scrollThumbY = document.createElement("div");
scrollThumbY.classList.add("scroll-thumb");

let scrollOffset = 0;
let scrolling = false;

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
        if (viewportOffset > 0 ) {
          viewportOffset -= 1;
        }
        break;
      case 'ArrowDown':
        if (viewportOffset < (fuzzyData.length - 1 - viewportRows.length)) {
          viewportOffset += 1;
        }
        break;
    }
    render(true);
  });
}  

function preventDefault(e) {
  e.preventDefault();
}

function scrollBy(offset) {
  scrollOffset += offset;

  const min = Math.min(scrollOffset, container.clientHeight - HEIGHT_OFFSET);
  scrollOffset = Math.max(0, min);
  scrollThumbY.style.transform = `translateY(${scrollOffset}px)`;

  const ratio = scrollOffset / (container.clientHeight - HEIGHT_OFFSET);

  updateViewportOffset(scrollOffset > 0
    ? Math.max(0, Math.floor(ratio * fuzzyData.length) - 1 - viewportRows.length)
    : 0);
  console.log('raw scroll', scrollOffset, 'ratio', Math.floor(ratio * 100), 'offset', viewportOffset)

  render(true);
}

function onThumbDrag(e) {
  e.preventDefault();
  e.stopPropagation();
  scrollOffset += e.movementY;
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
    scrollBy(e.deltaY);
    scrolling = false;
  });
}
