import { HEIGHT_OFFSET, ROW_HEIGHT, SPILL_COUNT } from './constants.mjs';
import {
  container,
  fuzzyData,
  viewportRows,
  viewportOffset,
  updateViewportOffset,
  render,
  scrollOffset,
  updateScrollOffset,
} from './render.mjs';

const scrollAreaY = document.createElement("div");
scrollAreaY.classList.add("scroll-area");

const scrollThumbY = document.createElement("div");
scrollThumbY.classList.add("scroll-thumb");

let scrolling = false;
let scrollThumbHeight = 16;

export function resetScroll() {
  updateScrollOffset(0);
  scrollBy(0);
  updateScrollThumb();
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
          scrollBy(-1 * ROW_HEIGHT);
          render();
        }
        break;
      case 'u':
        if (viewportOffset > 0 ) {
          scrollBy(-10 * ROW_HEIGHT);
          render();
        }
        break;
      case 'ArrowDown':
      case 'j':
        if (viewportOffset <= (fuzzyData.length - viewportRows.length + SPILL_COUNT)) {
          scrollBy(1 * ROW_HEIGHT);
          render();
        }
        break;
      case 'd':
        if (viewportOffset <= (fuzzyData.length - viewportRows.length + SPILL_COUNT)) {
          scrollBy(10 * ROW_HEIGHT);
          render();
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
  }

  const shrinkRatio = viewportRows.length / fuzzyData.length;
  const capped = Math.max(shrinkRatio, 0.03);
  scrollThumbHeight = (window.innerHeight - HEIGHT_OFFSET) * capped;
  scrollThumbY.style.height = `${scrollThumbHeight}px`;
  scrollThumbY.style.backgroundColor = '#555555';

  let ratio = viewportOffset / fuzzyData.length;
  const thumbOffset = (window.innerHeight - HEIGHT_OFFSET) * ratio;

  // Prevent the scroll thumb from scrolling any further when scrolling past the last row.
  if (thumbOffset + (scrollThumbHeight*2) < window.innerHeight - HEIGHT_OFFSET) {
    scrollThumbY.style.transform = `translateY(${thumbOffset}px)`;
  }
}

function scrollBy(offset) {
  // No scroll thumb = no scroll.
  if (scrollThumbY.style.height === '100%') {
    return;
  };

  // TODO: Something is dynamically off here.
  if (offset > 0 && (scrollOffset + offset) > (fuzzyData.length * ROW_HEIGHT) + HEIGHT_OFFSET + (5 * ROW_HEIGHT)- window.innerHeight) {
    updateScrollOffset((fuzzyData.length * ROW_HEIGHT) + HEIGHT_OFFSET + (5 * ROW_HEIGHT) - window.innerHeight);
    updateViewportOffset(Math.floor(scrollOffset/ROW_HEIGHT));
    updateScrollThumb();
    render();
    return;
  }
  // console.log(scrollOffset + offset, (fuzzyData.length * ROW_HEIGHT) - HEIGHT_OFFSET)

  // Ensure scrolling up to top always snaps to correct position.
  if (offset < 0 && viewportOffset === 0) {
    updateScrollOffset(0);
    updateViewportOffset(0);
    render();
    return;
  }

  updateViewportOffset(Math.floor(scrollOffset/ROW_HEIGHT));
  updateScrollOffset(scrollOffset + offset);
  updateScrollThumb();
  render();
}

function onThumbDrag(e) {
  e.preventDefault();
  e.stopPropagation();

  const reverseRatio = fuzzyData.length / (window.innerHeight - HEIGHT_OFFSET) * ROW_HEIGHT;
  scrollBy(reverseRatio * e.movementY);
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
    // const capped = e.deltaY > 0 ? Math.min(e.deltaY, 3) : Math.max(e.deltaY, -3);
    scrollBy(e.deltaY);
    scrolling = false;
  });
}
