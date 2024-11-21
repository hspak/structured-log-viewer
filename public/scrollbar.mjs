import { HEIGHT_OFFSET, ROW_HEIGHT } from './constants.mjs';
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
        if (viewportOffset < (fuzzyData.length - viewportRows.length)) {
          scrollBy(1 * ROW_HEIGHT);
          render();
        }
        break;
      case 'd':
        if (viewportOffset < (fuzzyData.length - viewportRows.length)) {
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
  } else {
    const ratio = viewportRows.length / fuzzyData.length;
    const capped = Math.max(ratio, 0.03);
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
  };

  // Ensure scrolling up to top always snaps to correct position.
  if (offset < 0 && viewportOffset === 0) {
    updateScrollOffset(0);
    render();
    return;
  }
  if (viewportOffset + viewportRows.length >= fuzzyData.length && offset > 0) {
    updateViewportOffset(fuzzyData.length - viewportOffset);
    updateScrollOffset(scrollOffset + offset);
    return;
  }

  let ratio = viewportOffset / fuzzyData.length;
  const thumbOffset = (container.clientHeight - 90) * ratio;
  scrollThumbY.style.transform = `translateY(${thumbOffset}px)`;

  updateScrollOffset(scrollOffset + offset);
  updateViewportOffset(Math.floor(scrollOffset/ROW_HEIGHT));
  updateScrollThumb();
  render(true);

  console.log('scroll', scrollOffset, 'viewport', viewportOffset, 'thumb', thumbOffset);
}

function onThumbDrag(e) {
  e.preventDefault();
  e.stopPropagation();
  updateScrollOffset(scrollOffset + e.movementY);
  console.log(e.movementY)

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
    // const capped = e.deltaY > 0 ? Math.min(e.deltaY, 3) : Math.max(e.deltaY, -3);
    scrollBy(e.deltaY);
    scrolling = false;
  });
}
